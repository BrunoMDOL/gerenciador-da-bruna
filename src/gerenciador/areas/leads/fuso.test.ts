/**
 * A vigência da orientação é digitada num datetime-local, que vem sem fuso.
 * Tem de ser lida em Brasília, seja qual for o fuso do computador do gestor.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { deBrasilia, paraCampoDeBrasilia } from './fuso';

const fusoOriginal = process.env.TZ;
afterEach(() => {
  if (fusoOriginal === undefined) delete process.env.TZ; else process.env.TZ = fusoOriginal;
});

describe('hora de Brasília no datetime-local', () => {
  it('18:00 em Brasília é 21:00 UTC', () => {
    expect(deBrasilia('2026-11-20T18:00')?.toISOString()).toBe('2026-11-20T21:00:00.000Z');
    expect(deBrasilia('2026-11-20T18:00:30')?.toISOString()).toBe('2026-11-20T21:00:30.000Z');
    expect(deBrasilia('2026-12-31T23:30')?.toISOString()).toBe('2027-01-01T02:30:00.000Z');
  });

  it('dá o mesmo instante com o computador em outro fuso (o new Date do campo não dava)', () => {
    for (const fuso of ['Asia/Tokyo', 'America/New_York', 'Europe/Lisbon', 'UTC']) {
      process.env.TZ = fuso;
      expect(deBrasilia('2026-11-20T18:00')?.toISOString()).toBe('2026-11-20T21:00:00.000Z');
    }
    process.env.TZ = 'Asia/Tokyo';
    expect(new Date('2026-11-20T18:00').toISOString()).not.toBe('2026-11-20T21:00:00.000Z');
  });

  it('recusa o que não é data e hora', () => {
    expect(deBrasilia('')).toBeNull();
    expect(deBrasilia('20/11/2026 18:00')).toBeNull();
    expect(deBrasilia('2026-02-30T10:00')).toBeNull();
    expect(deBrasilia('2026-11-20T25:00')).toBeNull();
  });

  it('escreve o agora de Brasília no formato do campo (para o min)', () => {
    expect(paraCampoDeBrasilia(new Date('2026-11-20T21:05:00Z'))).toBe('2026-11-20T18:05');
    expect(paraCampoDeBrasilia(new Date('2026-11-21T02:59:00Z'))).toBe('2026-11-20T23:59');
    expect(paraCampoDeBrasilia(new Date('2026-11-21T03:00:00Z'))).toBe('2026-11-21T00:00');
    process.env.TZ = 'Asia/Tokyo';
    expect(paraCampoDeBrasilia(new Date('2026-11-20T21:05:00Z'))).toBe('2026-11-20T18:05');
  });

  it('ida e volta dão o mesmo valor', () => {
    const d = deBrasilia('2026-11-20T18:05');
    expect(d && paraCampoDeBrasilia(d)).toBe('2026-11-20T18:05');
  });
});
