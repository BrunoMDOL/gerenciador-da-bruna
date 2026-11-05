/** Os helpers puros da área: próxima rodada em Brasília, período, custo, contagens e ordem das sugestões. */
import { describe, it, expect, vi } from 'vitest';
import type { Sugestao } from '@/gerenciador/lib/tipos';
import { relativo } from '@/gerenciador/lib/formatos';
import { ANALISE_CONCLUIDA, ANALISE_FALHOU, ANALISE_RODANDO, SUGESTOES } from './fixtures.test-data';
import {
  comecarRepeticao, contarPorAnalise, contarSugestoesPorAnalise, custoLegivel, desde, diasDoPeriodo, duracaoLegivel, ESPERA_DA_REPETICAO_MS, horaCheia,
  intervaloDeAtualizacao, motivoLegivel, ordenarSugestoes, periodoLegivel, porQuem, proximaRodada, quantoFalta, quemPediu, resumoDasSugestoes,
  segurarRepeticao, temAcaoAutomatica,
} from './dados';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: null } }) } } }));

describe('proximaRodada (horário de Brasília, sem horário de verão)', () => {
  // 05/11/2026 é quinta-feira; 15:00 UTC = 12:00 em Brasília.
  const agora = new Date('2026-11-05T15:00:00Z');

  it('segunda às 6 cai na segunda seguinte, 06:00 de Brasília = 09:00 UTC', () => {
    expect(proximaRodada({ dia_semana: 1, hora: 6 }, agora).toISOString()).toBe('2026-11-09T09:00:00.000Z');
  });
  it('hoje mais tarde ainda é hoje', () => {
    expect(proximaRodada({ dia_semana: 4, hora: 15 }, agora).toISOString()).toBe('2026-11-05T18:00:00.000Z');
  });
  it('hoje na hora que já passou (ou na hora atual) vai para a semana que vem', () => {
    expect(proximaRodada({ dia_semana: 4, hora: 12 }, agora).toISOString()).toBe('2026-11-12T15:00:00.000Z');
    expect(proximaRodada({ dia_semana: 4, hora: 11 }, agora).toISOString()).toBe('2026-11-12T14:00:00.000Z');
  });
  it('domingo é 0 e a virada de mês funciona', () => {
    // 29/11/2026 é domingo? 05/11 é quinta, então 08/11 é domingo: o próximo domingo às 0h.
    expect(proximaRodada({ dia_semana: 0, hora: 0 }, agora).toISOString()).toBe('2026-11-08T03:00:00.000Z');
    const fimDeMes = new Date('2026-11-28T20:00:00Z'); // sábado 17:00 em Brasília
    expect(proximaRodada({ dia_semana: 2, hora: 8 }, fimDeMes).toISOString()).toBe('2026-12-01T11:00:00.000Z');
  });
});

describe('formatação', () => {
  it('período com os dias contados', () => {
    expect(periodoLegivel('2026-10-29T03:00:00+00:00', '2026-11-05T03:00:00+00:00')).toBe('29/10 a 05/11 · 7 dias');
    expect(diasDoPeriodo('2026-10-22T18:00:00+00:00', '2026-11-05T18:00:00+00:00')).toBe(14);
  });
  it('custo em US$ com 2 casas; nulo não vira zero', () => {
    expect(custoLegivel(0.2553)).toBe('US$ 0,26');
    expect(custoLegivel('1.5')).toBe('US$ 1,50');
    expect(custoLegivel(null)).toBeNull();
    expect(custoLegivel(undefined)).toBeNull();
    expect(custoLegivel('abc')).toBeNull();
  });
  it('duração e hora cheia', () => {
    expect(duracaoLegivel(84211)).toBe('1 min');
    expect(duracaoLegivel(42000)).toBe('42 s');
    expect(duracaoLegivel(null)).toBe('—');
    expect(horaCheia(6)).toBe('06:00');
    expect(horaCheia(23)).toBe('23:00');
  });
  it('motivo da amostra em palavras', () => {
    expect(motivoLegivel('agendou')).toBe('agendou a consultoria');
    expect(motivoLegivel('convite_sem_agenda')).toBe('convite sem agendamento');
    expect(motivoLegivel('chamado:geral')).toBe('chamou o atendimento (geral)');
    expect(motivoLegivel('objecao:preco')).toBe('objeção: preco');
    expect(motivoLegivel('revisao_grave:horario')).toBe('revisão grave: horario');
  });
});

describe('sugestões', () => {
  it('conta por análise em uma passada e resume para a lista', () => {
    const contagem = contarPorAnalise(SUGESTOES.map((s) => ({ analise_id: s.analise_id, status: s.status })));
    expect(contagem[12]).toEqual({ pendentes: 2, aprovadas: 0, aplicadas: 1, rejeitadas: 1, descartadas: 0, total: 4 });
    expect(Object.keys(contagem)).toEqual(['12']);
    expect(resumoDasSugestoes(contagem[12])).toBe('2 pendentes · 1 aplicada');
    expect(resumoDasSugestoes({ pendentes: 0, aprovadas: 0, aplicadas: 0, rejeitadas: 2, descartadas: 0, total: 2 })).toBe('2 decididas');
    expect(resumoDasSugestoes(undefined)).toBe('—');
  });
  it('ordena pendentes primeiro, por prioridade, e depois as decididas', () => {
    const embaralhadas: Sugestao[] = [SUGESTOES[3], SUGESTOES[4], SUGESTOES[2], SUGESTOES[1], SUGESTOES[0]];
    expect(ordenarSugestoes(embaralhadas).map((s) => s.id)).toEqual([101, 102, 105, 103, 104]);
  });
  it('sabe o que tem ação automática', () => {
    expect(temAcaoAutomatica(SUGESTOES[0])).toBe(true);
    expect(temAcaoAutomatica(SUGESTOES[1])).toBe(false);
    expect(temAcaoAutomatica({ acao: null })).toBe(false);
    expect(temAcaoAutomatica({ acao: { tipo: 'inventada' } })).toBe(false);
  });
});

describe('acompanhamento', () => {
  it('consulta a cada 5 s enquanto roda e para depois', () => {
    expect(intervaloDeAtualizacao('pendente')).toBe(5000);
    expect(intervaloDeAtualizacao('coletando')).toBe(5000);
    expect(intervaloDeAtualizacao('analisando')).toBe(5000);
    expect(intervaloDeAtualizacao('concluida')).toBe(false);
    expect(intervaloDeAtualizacao('falhou')).toBe(false);
    expect(intervaloDeAtualizacao(undefined)).toBe(false);
  });
});

describe('"Tentar de novo": a falha antiga não para o acompanhamento', () => {
  const pedidaEm = Date.parse('2026-11-05T18:00:00Z');
  const naFila = comecarRepeticao(ANALISE_FALHOU, pedidaEm);

  it('a rodada aceita fica na fila, com o resultado zerado como rodar() grava', () => {
    expect(naFila).toEqual(expect.objectContaining({
      id: 11, status: 'pendente', erro: null, concluida_em: null, iniciada_em: null, dados: null, custo_usd: null,
      repeticao: { pedidaEm, falhaAntiga: '2026-11-02T14:06:40+00:00' },
    }));
    expect(intervaloDeAtualizacao(naFila.status)).toBe(5000);
  });
  it('segura enquanto o banco traz a mesma falha, até 1 min', () => {
    expect(segurarRepeticao(naFila, ANALISE_FALHOU, pedidaEm + 300)?.status).toBe('pendente');
    expect(segurarRepeticao(naFila, ANALISE_FALHOU, pedidaEm + ESPERA_DA_REPETICAO_MS - 1)?.repeticao).toEqual(naFila.repeticao);
    // Passou 1 min e a função não começou: a tela volta a mostrar o que o banco diz.
    expect(segurarRepeticao(naFila, ANALISE_FALHOU, pedidaEm + ESPERA_DA_REPETICAO_MS)).toBe(ANALISE_FALHOU);
  });
  it('solta assim que o banco muda: coletando, concluída ou uma falha nova', () => {
    const coletando = { ...ANALISE_FALHOU, status: 'coletando' as const, erro: null, concluida_em: null };
    expect(segurarRepeticao(naFila, coletando, pedidaEm + 300)).toBe(coletando);
    const falhaNova = { ...ANALISE_FALHOU, erro: 'a coleta falhou', concluida_em: '2026-11-05T18:00:02+00:00' };
    expect(segurarRepeticao(naFila, falhaNova, pedidaEm + 2000)).toBe(falhaNova);
    expect(segurarRepeticao(naFila, null, pedidaEm + 300)).toBeNull();
  });
  it('sem repetição pedida, a leitura é a do banco', () => {
    expect(segurarRepeticao(ANALISE_FALHOU, ANALISE_FALHOU)).toBe(ANALISE_FALHOU);
    expect(segurarRepeticao(undefined, ANALISE_RODANDO)).toBe(ANALISE_RODANDO);
  });
});

describe('quanto falta para a próxima rodada (calendário de Brasília)', () => {
  // Quinta, 05/11, 12:00 em Brasília.
  const agora = new Date('2026-11-05T15:00:00Z');

  it('hoje em horas, amanhã, depois em dias', () => {
    expect(quantoFalta(new Date('2026-11-05T15:40:00Z'), agora)).toBe('em menos de 1 h');
    expect(quantoFalta(new Date('2026-11-05T18:00:00Z'), agora)).toBe('em 3 h');
    expect(quantoFalta(new Date('2026-11-06T09:00:00Z'), agora)).toBe('amanhã');
    expect(quantoFalta(new Date('2026-11-09T09:00:00Z'), agora)).toBe('em 4 dias');
    expect(quantoFalta(new Date('2026-11-05T14:00:00Z'), agora)).toBe('agora');
  });
  it('entre 24 h e 36 h é "amanhã" ou "em 2 dias", nunca "em ontem"', () => {
    // Sexta 21:00 em Brasília: 33 h. O relativo() da fundação escrevia "em
    // ontem" até 05/11; agora conta só horas ("amanhã" por volta de 24 h), e
    // quantoFalta continua sendo o que olha o calendário.
    const sexta21h = new Date('2026-11-07T00:00:00Z');
    expect(relativo(sexta21h, agora)).not.toBe('em ontem');
    expect(quantoFalta(sexta21h, agora)).toBe('amanhã');
    // Quinta 23:00 → sábado 05:00 (30 h) é depois de amanhã.
    expect(quantoFalta(new Date('2026-11-07T08:00:00Z'), new Date('2026-11-06T02:00:00Z'))).toBe('em 2 dias');
  });
});

describe('quem pediu e há quanto tempo', () => {
  it("'cron' é a agenda semanal; e-mail é a pessoa", () => {
    expect(quemPediu(ANALISE_CONCLUIDA)).toBe('agenda semanal');
    expect(porQuem(ANALISE_CONCLUIDA)).toBe('pela agenda semanal');
    expect(quemPediu(ANALISE_FALHOU)).toBe('bruno@besserhome.com.br');
    expect(porQuem(ANALISE_FALHOU)).toBe('por bruno@besserhome.com.br');
    expect(quemPediu({ tipo: 'semanal', solicitada_por_email: null })).toBe('agenda semanal');
    expect(quemPediu({ tipo: 'manual', solicitada_por_email: null })).toBeNull();
    expect(porQuem({ tipo: 'manual', solicitada_por_email: null })).toBeNull();
  });
  it('relógio do servidor uns segundos à frente vira "agora", não "em agora"', () => {
    const agora = new Date('2026-11-05T18:00:00Z');
    expect(relativo('2026-11-05T18:00:04+00:00', agora)).toBe('agora');
    expect(desde('2026-11-05T18:00:04+00:00', agora)).toBe('agora');
    expect(desde('2026-11-05T17:57:00+00:00', agora)).toBe('há 3 min');
    expect(desde(null, agora)).toBe('—');
  });
});

describe('contagem das sugestões da lista', () => {
  it('sem rodada listada não vai ao banco', async () => {
    await expect(contarSugestoesPorAnalise([])).resolves.toEqual({});
  });
});
