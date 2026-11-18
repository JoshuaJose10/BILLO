import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { crearAlmacenWidget } from './almacenWidget.js';

function promesaPendiente() {
  let resolver;
  const promesa = new Promise((resolve) => {
    resolver = resolve;
  });
  return { promesa, resolver };
}

function preparar(opciones = {}) {
  const estado = { sesion: 'A', dato: null };
  const almacen = crearAlmacenWidget({
    leer: async () => estado.dato,
    guardar: async (dato) => {
      estado.dato = dato;
    },
    borrar: async () => {
      estado.dato = null;
    },
    leerSesion: async () => estado.sesion,
    ...opciones,
  });
  return { almacen, estado };
}

describe('almacén de widgets y cierre de sesión', () => {
  it('descarta una consulta que responde después de cerrar sesión', async () => {
    const { almacen, estado } = preparar();
    almacen.establecerSesion('A');
    const respuesta = promesaPendiente();
    const actualizar = respuesta.promesa.then((dato) => almacen.guardar(dato, 'A'));
    await almacen.limpiar();
    respuesta.resolver({ ingresos: 1000 });
    assert.equal(await actualizar, null);
    assert.equal(estado.dato, null);
  });

  it('borra después de una escritura que ya estaba dentro de SecureStore', async () => {
    const inicio = promesaPendiente();
    const terminar = promesaPendiente();
    const { almacen, estado } = preparar({
      guardar: async (dato) => {
        inicio.resolver();
        await terminar.promesa;
        estado.dato = dato;
      },
    });
    almacen.establecerSesion('A');
    const escritura = almacen.guardar({ ingresos: 1000 }, 'A');
    await inicio.promesa;
    const cierre = almacen.limpiar();
    assert.equal(await almacen.leer(), null);
    terminar.resolver();
    assert.equal(await escritura, null);
    await cierre;
    assert.equal(estado.dato, null);
  });

  it('descarta escrituras en cola y admite las de la nueva cuenta después del borrado', async () => {
    const { almacen, estado } = preparar();
    almacen.establecerSesion('A');
    const antigua = almacen.guardar({ ingresos: 1000 }, 'A');
    const cierre = almacen.limpiar();
    almacen.establecerSesion('B');
    estado.sesion = 'B';
    const nueva = almacen.guardar({ ingresos: 20 }, 'B');
    assert.equal(await antigua, null);
    await cierre;
    await nueva;
    assert.equal(await almacen.guardar({ ingresos: 9999 }, 'A'), null);
    assert.deepEqual(await almacen.leer(), { ingresos: 20, sesion: 'B' });
  });

  it('no guarda sin sesión, incluido el modo visitante', async () => {
    const { almacen, estado } = preparar();
    assert.equal(await almacen.guardar({ ingresos: 1000 }, null), null);
    assert.equal(estado.dato, null);
  });

  it('lee en segundo plano tras reiniciar solamente con la sesión propietaria', async () => {
    const { almacen, estado } = preparar();
    estado.dato = { ingresos: 1000, sesion: 'A' };
    assert.equal((await almacen.leer()).ingresos, 1000);
    estado.sesion = 'B';
    assert.equal(await almacen.leer(), null);
    estado.sesion = null;
    assert.equal(await almacen.leer(), null);
  });

  it('invalida una lectura iniciada antes del cierre', async () => {
    const respuesta = promesaPendiente();
    const { almacen } = preparar({ leer: () => respuesta.promesa });
    almacen.establecerSesion('A');
    const lectura = almacen.leer();
    await almacen.limpiar();
    respuesta.resolver({ ingresos: 1000, sesion: 'A' });
    assert.equal(await lectura, null);
  });

  it('un fallo al guardar no impide borrar después', async () => {
    const { almacen, estado } = preparar({
      guardar: async () => {
        throw new Error('fallo de almacenamiento');
      },
    });
    estado.dato = { sesion: 'A', ingresos: 1000 };
    almacen.establecerSesion('A');
    await assert.rejects(almacen.guardar({ ingresos: 20 }, 'A'));
    await almacen.limpiar();
    assert.equal(estado.dato, null);
  });
});
