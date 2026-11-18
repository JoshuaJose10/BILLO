import { transformSync } from '@babel/core';
import modulosCommonJS from '@babel/plugin-transform-modules-commonjs';
import transformarJSX from '@babel/plugin-transform-react-jsx';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

process.env.EXPO_PUBLIC_API_URL = 'http://127.0.0.1:3000';

// Ejecuta el servicio y los formularios reales, sustituyendo solo sus dependencias nativas.
// El render de servidor representa el formulario antes de que termine de cargar las tarjetas.
function cargarModulo(ruta, dependencia) {
  const archivo = new URL(ruta, import.meta.url);
  const require = createRequire(archivo);
  const { code } = transformSync(readFileSync(archivo, 'utf8'), {
    filename: fileURLToPath(archivo),
    babelrc: false,
    configFile: false,
    plugins: [[transformarJSX, { runtime: 'automatic' }], modulosCommonJS],
  });
  const module = { exports: {} };
  runInNewContext(code, {
    module,
    exports: module.exports,
    require: (nombre) => dependencia(nombre) ?? require(nombre),
  });
  return module.exports;
}

describe('regresión de tarjetas al guardar', () => {
  for (const pantalla of ['NuevoGastoScreen', 'MembresiaScreen']) {
    it(`${pantalla} conserva la tarjeta antes de cargar el listado`, async () => {
      const botones = [];
      const guardados = [];
      const componente = (props) => React.createElement(React.Fragment, null, props.children);
      const guardar = async (id, datos) => guardados.push({ id, datos });
      const servicios = {
        listarMembresias: async () => [],
        actualizarMembresia: guardar,
        actualizarGasto: async (id, datos) => {
          guardar(id, datos);
          return { alerta: null };
        },
      };
      const { default: Pantalla } = cargarModulo(`../screens/${pantalla}.js`, (nombre) => {
        if (nombre === 'react') return React;
        if (nombre === 'react-native') {
          return {
            View: componente,
            Text: componente,
            ScrollView: componente,
            ActivityIndicator: componente,
            Pressable: componente,
            TextInput: componente,
            StyleSheet: { create: (estilos) => estilos },
          };
        }
        if (nombre === '@expo/vector-icons') return { MaterialCommunityIcons: componente };
        if (nombre === '@react-native-community/datetimepicker') return { default: componente };
        if (nombre === 'expo-haptics') return {};
        if (nombre.endsWith('/TemaContext')) {
          return {
            useEstilos: () => ({}),
            useTema: () => ({ colors: {}, monedaPreferida: 'MXN' }),
          };
        }
        if (nombre.endsWith('/CategoriasContext')) {
          return {
            useCategorias: () => ({ categorias: [{ id: 1 }], estado: 'listo' }),
            useReintentarCategoriasAlEnfocar: () => {},
          };
        }
        if (nombre.endsWith('/AvisosContext')) return { useAvisos: () => ({}) };
        if (nombre.endsWith('/services/gastos')) {
          return { useGastosService: () => servicios, METODOS_PAGO: [{ valor: 'tarjeta' }] };
        }
        if (nombre.endsWith('/services/membresias')) {
          return { useMembresiasService: () => servicios };
        }
        if (nombre.endsWith('/services/ingresos')) return { useIngresosService: () => ({}) };
        if (nombre.endsWith('/services/tarjetas')) return { useTarjetasService: () => ({}) };
        if (nombre.endsWith('/services/divisas')) return { useDivisasService: () => ({}) };
        if (nombre.endsWith('/reconocimientoVoz')) {
          return { useDictado: () => ({ estado: 'inactivo' }) };
        }
        if (nombre.endsWith('/useActualizarWidget')) return { useActualizarWidget: () => () => {} };
        if (nombre.startsWith('../components/')) {
          return nombre.endsWith('/Boton')
            ? (props) => {
                botones.push(props);
                return null;
              }
            : componente;
        }
      });
      const original = {
        id: 7,
        tarjeta_id: 3,
        monto: 250,
        costo: 250,
        categoria_id: 1,
        metodo_pago: 'tarjeta',
        nombre: 'Servicio',
        fecha: '2026-11-18',
        fecha_cobro: '2026-12-18',
        frecuencia: 'mensual',
      };
      renderToStaticMarkup(
        React.createElement(Pantalla, {
          navigation: {},
          route: {
            params: pantalla === 'NuevoGastoScreen' ? { gasto: original } : { membresia: original },
          },
        }),
      );
      await botones.find((boton) => boton.titulo === 'Guardar cambios').onPress();
      assert.equal(guardados.length, 1);
      assert.equal(guardados[0].datos.tarjeta_id, 3);
    });
  }
});

describe('errores de resumen de tarjetas', () => {
  function servicio(api) {
    return cargarModulo('../services/tarjetas.js', (nombre) => {
      if (nombre === 'react') return { useMemo: (crear) => crear() };
      if (nombre.endsWith('/AuthContext')) return { useApi: () => api };
    }).useTarjetasService();
  }

  it('propaga el fallo de un resumen en lugar de mostrar ceros', async () => {
    const error = { code: 'SIN_CONEXION', status: 500 };
    const tarjetas = servicio(async (ruta) => {
      if (ruta === '/tarjetas') return [{ id: 3 }, { id: 4 }];
      if (ruta.includes('/3/resumen')) return { total: 250, gasto_variable: 250, gasto_fijo: 0 };
      throw error;
    });
    await assert.rejects(tarjetas.listarTarjetasConResumen('2026-11'), error);
  });

  it('acepta un resumen real sin gastos y permite reintentar tras un error', async () => {
    let falla = true;
    const tarjetas = servicio(async (ruta) => {
      if (ruta === '/tarjetas') return [{ id: 3 }];
      if (falla) throw { code: 'SIN_CONEXION' };
      return { tarjeta_id: 3, mes: '2026-11', gasto_variable: 0, gasto_fijo: 0, total: 0 };
    });
    await assert.rejects(tarjetas.listarTarjetasConResumen('2026-11'), { code: 'SIN_CONEXION' });
    falla = false;
    const lista = await tarjetas.listarTarjetasConResumen('2026-11');
    assert.equal(lista[0].total_mes, 0);
  });
});
