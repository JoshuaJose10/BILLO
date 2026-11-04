// Pruebas de utils/avisos.js con el runner de Node: npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { contenidoAviso, nombreCategoriaPorId, normalizarAlerta } from './avisos.js';

describe('normalizarAlerta', () => {
  it('sin alerta da null', () => {
    assert.equal(normalizarAlerta(undefined), null);
    assert.equal(normalizarAlerta(null), null);
  });

  it('convierte el porcentaje que llega como texto', () => {
    assert.deepEqual(normalizarAlerta({ categoria_id: 3, porcentaje: '84.5', estado: 'alerta' }), {
      categoria_id: 3,
      porcentaje: 84.5,
      estado: 'alerta',
    });
  });

  it('un estado sin aviso o un porcentaje inválido da null', () => {
    assert.equal(normalizarAlerta({ categoria_id: 3, porcentaje: 40, estado: 'ok' }), null);
    assert.equal(normalizarAlerta({ categoria_id: 3, porcentaje: 90, estado: 'raro' }), null);
    assert.equal(normalizarAlerta({ categoria_id: 3, porcentaje: 'abc', estado: 'alerta' }), null);
    assert.equal(normalizarAlerta({ categoria_id: 3, estado: 'alerta' }), null);
  });
});

describe('contenidoAviso', () => {
  it('alerta: se acerca al presupuesto', () => {
    assert.deepEqual(
      contenidoAviso({ categoria_id: 1, porcentaje: 85, estado: 'alerta' }, 'Comida'),
      {
        estado: 'alerta',
        titulo: 'Comida al 85%',
        mensaje: 'Te estás acercando a tu presupuesto',
        texto: 'Comida al 85%. Te estás acercando a tu presupuesto',
      },
    );
  });

  it('excedido: se pasó del presupuesto', () => {
    const aviso = contenidoAviso(
      { categoria_id: 1, porcentaje: 110, estado: 'excedido' },
      'Comida',
    );
    assert.equal(aviso.estado, 'excedido');
    assert.equal(aviso.titulo, 'Comida al 110%');
    assert.equal(aviso.mensaje, 'Te pasaste de tu presupuesto');
  });

  it('redondea el porcentaje', () => {
    const alerta = (porcentaje) => ({ categoria_id: 1, porcentaje, estado: 'alerta' });
    assert.equal(contenidoAviso(alerta(84.4), 'Comida').titulo, 'Comida al 84%');
    assert.equal(contenidoAviso(alerta(84.5), 'Comida').titulo, 'Comida al 85%');
    assert.equal(contenidoAviso(alerta('99.96'), 'Comida').titulo, 'Comida al 100%');
  });

  it('categoría desconocida o vacía: "Presupuesto al N%"', () => {
    const alerta = { categoria_id: 99, porcentaje: 90, estado: 'alerta' };
    assert.equal(contenidoAviso(alerta, undefined).titulo, 'Presupuesto al 90%');
    assert.equal(contenidoAviso(alerta, '   ').titulo, 'Presupuesto al 90%');
  });

  it('quita espacios del nombre', () => {
    const alerta = { categoria_id: 1, porcentaje: 90, estado: 'alerta' };
    assert.equal(contenidoAviso(alerta, '  Salud ').titulo, 'Salud al 90%');
  });

  it('sin alerta válida da null', () => {
    assert.equal(contenidoAviso(null, 'Comida'), null);
    assert.equal(contenidoAviso({ categoria_id: 1, porcentaje: 50, estado: 'ok' }, 'Comida'), null);
  });
});

describe('nombreCategoriaPorId', () => {
  const categorias = [
    { id: 1, nombre: 'Comida' },
    { id: 2, nombre: 'Transporte' },
  ];

  it('busca por id aunque llegue como texto', () => {
    assert.equal(nombreCategoriaPorId(categorias, 2), 'Transporte');
    assert.equal(nombreCategoriaPorId(categorias, '1'), 'Comida');
  });

  it('id desconocido, null o lista vacía dan undefined', () => {
    assert.equal(nombreCategoriaPorId(categorias, 9), undefined);
    assert.equal(nombreCategoriaPorId(categorias, null), undefined);
    assert.equal(nombreCategoriaPorId(null, 1), undefined);
  });
});
