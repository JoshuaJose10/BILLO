import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { entradaTrasCierre, navegadorRaiz } from './flujoInicio.js';

describe('navegadorRaiz (HU-93)', () => {
  it('primera vez sin sesión: Onboarding', () => {
    assert.equal(
      navegadorRaiz({ token: null, visitante: false, onboardingVisto: false }),
      'Onboarding',
    );
  });
  it('ya visto u omitido: Auth (abre en Entrada)', () => {
    assert.equal(navegadorRaiz({ token: null, visitante: false, onboardingVisto: true }), 'Auth');
  });
  it('con token: Sesion, aunque no haya visto el onboarding', () => {
    assert.equal(
      navegadorRaiz({ token: 'jwt', visitante: false, onboardingVisto: false }),
      'Sesion',
    );
  });
  it('cuenta recién creada (HU-89): ElegirCategorias hasta configurarlas', () => {
    const base = { token: 'jwt', visitante: false, onboardingVisto: true };
    const nueva = { categorias_configuradas: false };
    assert.equal(navegadorRaiz({ ...base, usuario: nueva }), 'ElegirCategorias');
    assert.equal(navegadorRaiz({ ...base, usuario: { categorias_configuradas: true } }), 'Sesion');
    // Sesión guardada antes de HU-89 (sin el campo) o sin usuario: entra directo.
    assert.equal(navegadorRaiz({ ...base, usuario: {} }), 'Sesion');
    assert.equal(navegadorRaiz({ ...base, usuario: null }), 'Sesion');
    // El modo exploración nunca la muestra.
    assert.equal(
      navegadorRaiz({ token: null, usuario: nueva, visitante: true, onboardingVisto: true }),
      'Visitante',
    );
  });
  it('modo exploración desde Entrada: Visitante', () => {
    assert.equal(
      navegadorRaiz({ token: null, visitante: true, onboardingVisto: true }),
      'Visitante',
    );
  });
});

describe('entradaTrasCierre (HU-93)', () => {
  it('cerrar sesión lleva a Entrada', () => {
    assert.equal(entradaTrasCierre(false), 'Entrada');
  });
  it('sesión vencida lleva a Login para mostrar el aviso', () => {
    assert.equal(entradaTrasCierre(true), 'Login');
  });
});
