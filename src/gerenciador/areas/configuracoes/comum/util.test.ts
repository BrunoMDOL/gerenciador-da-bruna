import { afterEach, describe, expect, it } from 'vitest';
import { deInputLocal, exigirLinha, NadaGravado, paraInputLocal } from './util';

const fusoOriginal = process.env.TZ;
afterEach(() => { process.env.TZ = fusoOriginal; });

describe('"Vale até" em horário de Brasília', () => {
  it('mostra no campo a hora de Brasília, seja qual for o fuso do navegador', () => {
    // 12/11 21:00 UTC é 18:00 em Brasília (o cartão mostra "até 12/11 18:00").
    for (const fuso of ['America/Sao_Paulo', 'Europe/Lisbon', 'Asia/Tokyo', 'UTC']) {
      process.env.TZ = fuso;
      expect(paraInputLocal('2026-11-12T21:00:00+00:00')).toBe('2026-11-12T18:00');
    }
    // Meia-noite sai 00, não 24.
    expect(paraInputLocal('2026-11-13T03:00:00Z')).toBe('2026-11-13T00:00');
    expect(paraInputLocal(null)).toBe('');
    expect(paraInputLocal('não é data')).toBe('');
  });

  it('grava o que foi digitado como hora de Brasília', () => {
    process.env.TZ = 'Asia/Tokyo';
    expect(deInputLocal('2026-11-12T18:00')).toBe('2026-11-12T21:00:00.000Z');
    expect(deInputLocal('2026-11-12T18:00:30')).toBe('2026-11-12T21:00:30.000Z');
    expect(deInputLocal('  ')).toBeNull();
    expect(() => deInputLocal('12/11/2026 18:00')).toThrow('data inválida');
    expect(() => deInputLocal('2026-13-40T18:00')).toThrow('data inválida');
    // Ida e volta dão o mesmo instante.
    expect(deInputLocal(paraInputLocal('2026-11-12T21:00:00+00:00'))).toBe('2026-11-12T21:00:00.000Z');
  });
});

describe('exigirLinha', () => {
  it('passa com linha devolvida e lança NadaGravado sem nenhuma', () => {
    expect(() => exigirLinha([{ id: 3 }])).not.toThrow();
    expect(() => exigirLinha([])).toThrow(NadaGravado);
    expect(() => exigirLinha(null)).toThrow('Nada foi gravado: a linha não existe mais ou você não tem permissão. Recarregue e confira.');
  });
});
