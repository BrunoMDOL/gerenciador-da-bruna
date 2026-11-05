import { describe, it, expect } from 'vitest';
import { hojeEmSaoPaulo, meiaNoiteEmSaoPaulo } from './util';

describe('hojeEmSaoPaulo', () => {
  it('dá o dia de São Paulo, não o de UTC', () => {
    expect(hojeEmSaoPaulo(new Date('2026-11-05T04:18:07.482Z'))).toBe('2026-11-05');
    // 23h30 de 04/11 em São Paulo já é 05/11 em UTC.
    expect(hojeEmSaoPaulo(new Date('2026-11-05T02:30:00.000Z'))).toBe('2026-11-04');
  });
});

describe('meiaNoiteEmSaoPaulo', () => {
  // Os instantes esperados são os que o banco devolve para
  // 'AAAA-MM-DD'::date::timestamp at time zone 'America/Sao_Paulo'.
  it('dá o instante da meia-noite do dia em São Paulo', () => {
    expect(meiaNoiteEmSaoPaulo('2026-10-30').toISOString()).toBe('2026-10-30T03:00:00.000Z');
    expect(meiaNoiteEmSaoPaulo('2026-10-07').toISOString()).toBe('2026-10-07T03:00:00.000Z');
  });

  it('anda no calendário, atravessando o mês', () => {
    expect(meiaNoiteEmSaoPaulo('2026-11-05', -6).toISOString()).toBe('2026-10-30T03:00:00.000Z');
    expect(meiaNoiteEmSaoPaulo('2026-11-05', -29).toISOString()).toBe('2026-10-07T03:00:00.000Z');
    expect(meiaNoiteEmSaoPaulo('2026-12-31', 1).toISOString()).toBe('2027-01-01T03:00:00.000Z');
  });

  it('segue o fuso do banco de dados de fusos, como o Postgres, inclusive no horário de verão', () => {
    expect(meiaNoiteEmSaoPaulo('2018-11-03').toISOString()).toBe('2018-11-03T03:00:00.000Z');
    // Em 04/11/2018 o relógio pulou de 00:00 para 01:00: vale o primeiro instante do dia.
    expect(meiaNoiteEmSaoPaulo('2018-11-04').toISOString()).toBe('2018-11-04T03:00:00.000Z');
    expect(meiaNoiteEmSaoPaulo('2018-11-05').toISOString()).toBe('2018-11-05T02:00:00.000Z');
    // Em 17/02/2019 o relógio voltou de 00:00 para 23:00 do dia 16: a meia-noite do 17 é a de −03:00.
    expect(meiaNoiteEmSaoPaulo('2019-02-17').toISOString()).toBe('2019-02-17T03:00:00.000Z');
  });

  it('recusa o que não é um dia AAAA-MM-DD', () => {
    expect(() => meiaNoiteEmSaoPaulo('05/11/2026')).toThrow(RangeError);
  });
});
