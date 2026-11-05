import { describe, expect, it } from 'vitest';
import { data, relativo } from './formatos';

// 05/11/2026 12:00 em Brasília.
const AGORA = new Date('2026-11-05T15:00:00Z');
const depois = (s: number) => new Date(AGORA.getTime() + s * 1000);

describe('relativo', () => {
  it('passado: agora, minutos, horas, ontem, dias e data', () => {
    expect(relativo(depois(-20), AGORA)).toBe('agora');
    expect(relativo(depois(-5 * 60), AGORA)).toBe('há 5 min');
    expect(relativo(depois(-3 * 3600), AGORA)).toBe('há 3 h');
    expect(relativo(depois(-26 * 3600), AGORA)).toBe('ontem');
    expect(relativo(depois(-4 * 86400), AGORA)).toBe('há 4 dias');
    expect(relativo(depois(-20 * 86400), AGORA)).toBe(data(depois(-20 * 86400)));
  });

  it('futuro: nunca "em ontem" nem "em agora", e a data certa de 14 dias em diante', () => {
    expect(relativo(depois(5), AGORA)).toBe('agora');
    expect(relativo(depois(5 * 60), AGORA)).toBe('em 5 min');
    expect(relativo(depois(3 * 3600), AGORA)).toBe('em 3 h');
    expect(relativo(depois(30 * 3600), AGORA)).toBe('amanhã');
    expect(relativo(depois(4 * 86400), AGORA)).toBe('em 4 dias');
    expect(relativo(depois(20 * 86400), AGORA)).toBe(data(depois(20 * 86400)));
    expect(relativo(depois(20 * 86400), AGORA)).not.toBe(data(AGORA));
  });

  it('valor vazio vira travessão', () => {
    expect(relativo(null, AGORA)).toBe('—');
  });
});
