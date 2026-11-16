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
