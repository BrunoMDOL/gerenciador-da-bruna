import { describe, it, expect } from 'vitest';
import type { CopilotoMensagem } from '@/gerenciador/lib/tipos';
import {
  acrescentarErro, acrescentarFerramenta, acrescentarSugestao, acrescentarTexto, ancorasDasPropostas, cartoesDoTurno, encerrarTurno,
  itemDoGestor, itensDoHistorico, montarItens, TURNO_VAZIO, type TurnoAoVivo,
} from './lib/conversa';
import { ErroDoCopiloto } from './lib/protocolo';

// A forma gravada pela edge function em bruna_copiloto_mensagens: a pergunta do
// gestor, o assistente com texto e tool_use, o tool_result (papel user, texto
// null), um assistente só com tool_use e a resposta final com tokens e modelo.
const HISTORICO: CopilotoMensagem[] = [
  { id: 101, sessao_id: 7, papel: 'user', conteudo: [{ type: 'text', text: 'O que a Bruna errou nesta conversa?' }], texto: 'O que a Bruna errou nesta conversa?', modelo: null, tokens_entrada: null, tokens_saida: null, criado_em: '2026-11-05T12:10:02+00:00' },
  { id: 102, sessao_id: 7, papel: 'assistant', conteudo: [{ type: 'text', text: 'Vou ler o estado do lead.' }, { type: 'tool_use', id: 'toolu_01', name: 'lead_estado', input: { contato_id: 26634 } }], texto: 'Vou ler o estado do lead.', modelo: null, tokens_entrada: null, tokens_saida: null, criado_em: '2026-11-05T12:10:05+00:00' },
  { id: 103, sessao_id: 7, papel: 'user', conteudo: [{ type: 'tool_result', tool_use_id: 'toolu_01', content: '{"contato":{"id":26634}}' }], texto: null, modelo: null, tokens_entrada: null, tokens_saida: null, criado_em: '2026-11-05T12:10:06+00:00' },
  { id: 104, sessao_id: 7, papel: 'assistant', conteudo: [{ type: 'tool_use', id: 'toolu_02', name: 'conversa', input: { contato_id: 26634, limite: 40 } }], texto: null, modelo: null, tokens_entrada: null, tokens_saida: null, criado_em: '2026-11-05T12:10:08+00:00' },
  { id: 105, sessao_id: 7, papel: 'user', conteudo: [{ type: 'tool_result', tool_use_id: 'toolu_02', content: '[]' }], texto: null, modelo: null, tokens_entrada: null, tokens_saida: null, criado_em: '2026-11-05T12:10:09+00:00' },
  { id: 106, sessao_id: 7, papel: 'assistant', conteudo: [{ type: 'text', text: 'A Bruna **ofereceu horários** antes de confirmar o bairro.' }], texto: 'A Bruna **ofereceu horários** antes de confirmar o bairro.', modelo: 'claude-opus-5-5', tokens_entrada: 8412, tokens_saida: 356, criado_em: '2026-11-05T12:14:30+00:00' },
];

// Um turno com propostas: a primeira chamada a propor_acao foi recusada pela
// validação (tool_result com is_error), a segunda criou a sugestão 42 (o
// tool_result é o que a tool devolve: {"id":42,"status":"pendente"}).
const TURNO_COM_PROPOSTA: CopilotoMensagem[] = [
  { id: 201, sessao_id: 9, papel: 'user', conteudo: [{ type: 'text', text: 'Por que este lead não agendou?' }], texto: 'Por que este lead não agendou?', modelo: null, tokens_entrada: null, tokens_saida: null, criado_em: '2026-11-05T13:00:01+00:00' },
  { id: 202, sessao_id: 9, papel: 'assistant', conteudo: [{ type: 'tool_use', id: 'toolu_09', name: 'propor_acao', input: { tipo: 'instrucao' } }], texto: null, modelo: null, tokens_entrada: null, tokens_saida: null, criado_em: '2026-11-05T13:00:04+00:00' },
  { id: 203, sessao_id: 9, papel: 'user', conteudo: [{ type: 'tool_result', tool_use_id: 'toolu_09', is_error: true, content: 'proposta inválida: falta o título' }], texto: null, modelo: null, tokens_entrada: null, tokens_saida: null, criado_em: '2026-11-05T13:00:05+00:00' },
  { id: 204, sessao_id: 9, papel: 'assistant', conteudo: [{ type: 'text', text: 'Vou propor uma orientação para este lead.' }, { type: 'tool_use', id: 'toolu_10', name: 'propor_acao', input: { tipo: 'instrucao', titulo: 'Oferecer dois horários logo depois do bairro' } }], texto: 'Vou propor uma orientação para este lead.', modelo: null, tokens_entrada: null, tokens_saida: null, criado_em: '2026-11-05T13:00:09+00:00' },
  { id: 205, sessao_id: 9, papel: 'user', conteudo: [{ type: 'tool_result', tool_use_id: 'toolu_10', content: '{"id":42,"status":"pendente"}' }], texto: null, modelo: null, tokens_entrada: null, tokens_saida: null, criado_em: '2026-11-05T13:00:10+00:00' },
  { id: 206, sessao_id: 9, papel: 'assistant', conteudo: [{ type: 'text', text: 'Deixei a sugestão nº 42 para você aprovar.' }], texto: 'Deixei a sugestão nº 42 para você aprovar.', modelo: 'claude-opus-5-5', tokens_entrada: 9120, tokens_saida: 410, criado_em: '2026-11-05T13:00:14+00:00' },
];

const ultimo = <T,>(lista: T[]): T | undefined => lista[lista.length - 1];

const SUGESTAO = { id: 42, tipo: 'instrucao', titulo: 'Oferecer dois horários logo depois do bairro', descricao: 'd', prioridade: 'alta', acao: null };

describe('itensDoHistorico', () => {
  it('vira balões só as linhas com texto, junta as consultas e guarda os tokens da final', () => {
    const itens = itensDoHistorico(HISTORICO);
    expect(itens.map((i) => i.tipo)).toEqual(['gestor', 'copiloto', 'ferramentas', 'copiloto']);
    expect(itens[0]).toMatchObject({ texto: 'O que a Bruna errou nesta conversa?', mensagemId: 101 });
    expect(itens[2]).toMatchObject({ ferramentas: [{ nome: 'lead_estado', resumo: null }, { nome: 'conversa', resumo: null }] });
    expect(itens[3]).toMatchObject({ mensagemId: 106, modelo: 'claude-opus-5-5', tokensEntrada: 8412, tokensSaida: 356, emAndamento: false });
  });
});

describe('turno ao vivo', () => {
  it('cresce o balão com os deltas, fecha ao chamar ferramenta e abre outro depois', () => {
    let itens = [itemDoGestor('Por que este lead não agendou?', '2026-11-05T13:00:00.000Z')];
    itens = acrescentarTexto(itens, 'Olhei a conversa');
    itens = acrescentarTexto(itens, ' e o estado do lead.');
    itens = acrescentarFerramenta(itens, { nome: 'lead_estado', entrada: { contato_id: 26634 }, resumo: 'Li o estado do lead 26634' });
    itens = acrescentarFerramenta(itens, { nome: 'conversa', entrada: { contato_id: 26634 }, resumo: 'Li 40 mensagens' });
    itens = acrescentarTexto(itens, 'Ele não agendou porque faltou horário.');
    itens = acrescentarSugestao(itens, SUGESTAO);
    itens = encerrarTurno(itens, { mensagem_id: 204, tokens_entrada: 9120, tokens_saida: 410, modelo: 'claude-opus-5-5' });
    expect(itens.map((i) => i.tipo)).toEqual(['gestor', 'copiloto', 'ferramentas', 'copiloto', 'sugestao']);
    expect(itens[1]).toMatchObject({ texto: 'Olhei a conversa e o estado do lead.', emAndamento: false, modelo: null });
    expect(itens[2]).toMatchObject({ ferramentas: [{ nome: 'lead_estado', resumo: 'Li o estado do lead 26634' }, { nome: 'conversa', resumo: 'Li 40 mensagens' }] });
    expect(itens[3]).toMatchObject({ texto: 'Ele não agendou porque faltou horário.', emAndamento: false, mensagemId: 204, modelo: 'claude-opus-5-5', tokensEntrada: 9120, tokensSaida: 410 });
  });

  it('esconde o que a função gravou durante o turno e, quando o histórico traz o fim, usa só o histórico com o cartão no lugar', () => {
    const base = HISTORICO.slice(0, 1);
    let itens = [itemDoGestor('E agora?', '2026-11-05T13:00:00.000Z')];
    itens = acrescentarTexto(itens, 'Resposta ao vivo.');
    itens = acrescentarSugestao(itens, SUGESTAO);
    const turno: TurnoAoVivo = { ...TURNO_VAZIO, sessaoId: 7, corte: 101, itens, emAndamento: false, fimId: 106, ultimaPergunta: 'E agora?' };

    // O banco já tem o turno inteiro, mas ainda sem a mensagem final: só o que veio antes do corte aparece.
    const parcial = montarItens(HISTORICO.slice(0, 5), turno, 7, 26634, []);
    expect(parcial.map((i) => i.tipo)).toEqual(['gestor', 'gestor', 'copiloto', 'sugestao']);
    expect(parcial[1]).toMatchObject({ texto: 'E agora?' });

    // Chegou a mensagem final (id 106): o histórico vale sozinho e o cartão fica depois dela.
    const completo = montarItens(HISTORICO, turno, 7, 26634, []);
    expect(completo.map((i) => i.tipo)).toEqual(['gestor', 'copiloto', 'ferramentas', 'copiloto', 'sugestao']);
    expect(completo[4]).toMatchObject({ sugestaoId: 42 });

    // Em outra sessão, os itens ao vivo não aparecem.
    expect(montarItens(base, turno, 5, null, []).map((i) => i.tipo)).toEqual(['gestor']);
  });

  it('o turno de uma conversa nova é do lead em que nasceu: não aparece com outro lead nem sem lead', () => {
    const erro = new ErroDoCopiloto('sem_chave', 'ANTHROPIC_API_KEY ausente', 503);
    const itens = acrescentarErro([itemDoGestor('Por que este lead não agendou?', '2026-11-05T13:00:00.000Z')], erro);
    const turno: TurnoAoVivo = { ...TURNO_VAZIO, contatoId: 26634, corte: 0, itens, ultimaPergunta: 'Por que este lead não agendou?' };
    expect(montarItens([], turno, null, 26634, []).map((i) => i.tipo)).toEqual(['gestor', 'erro']);
    expect(montarItens([], turno, null, 28916, [])).toEqual([]);
    expect(montarItens([], turno, null, null, [])).toEqual([]);
    // Numa sessão, o lead não muda de quem é o turno.
    const daSessao: TurnoAoVivo = { ...turno, sessaoId: 7, contatoId: null, corte: 106 };
    expect(montarItens(HISTORICO, daSessao, 7, 26634, []).slice(-2).map((i) => i.tipo)).toEqual(['gestor', 'erro']);
  });

  it('sem o corte (o histórico ainda carregava no envio), mostra o histórico inteiro antes do turno', () => {
    const turno: TurnoAoVivo = {
      ...TURNO_VAZIO, sessaoId: 7, corte: null, itens: [itemDoGestor('E o convite?', '2026-11-05T13:00:00.000Z')], emAndamento: true, ultimaPergunta: 'E o convite?',
    };
    expect(montarItens(HISTORICO, turno, 7, 26634, []).map((i) => i.tipo)).toEqual(['gestor', 'copiloto', 'ferramentas', 'copiloto', 'gestor']);
  });

  it('marca o aviso do turno enquanto a tela confere se a função terminou de gravar', () => {
    const itens = acrescentarErro([itemDoGestor('E o convite?', '2026-11-05T13:00:00.000Z')], new ErroDoCopiloto('cancelado', 'resposta cancelada'));
    const turno: TurnoAoVivo = { ...TURNO_VAZIO, sessaoId: 7, corte: 106, itens, aguardaGravacaoAte: Date.now() + 60_000, ultimaPergunta: 'E o convite?' };
    expect(ultimo(montarItens(HISTORICO, turno, 7, null, []))).toMatchObject({ tipo: 'erro', aguardandoGravacao: true });
    expect(ultimo(montarItens(HISTORICO, { ...turno, aguardaGravacaoAte: null }, 7, null, []))).not.toHaveProperty('aguardandoGravacao');
  });
});

describe('cartões do turno no histórico', () => {
  it('ancora cada cartão na mensagem que chamou propor_acao com sucesso', () => {
    expect(ancorasDasPropostas(TURNO_COM_PROPOSTA, 200)).toEqual([204]);
    // O que é de antes do corte não conta.
    expect(ancorasDasPropostas(TURNO_COM_PROPOSTA, 204)).toEqual([]);
  });

  it('na reconciliação o cartão fica logo depois do balão que o propôs, e não no fim', () => {
    let itens = [itemDoGestor('Por que este lead não agendou?', '2026-11-05T13:00:00.000Z')];
    itens = acrescentarFerramenta(itens, { nome: 'propor_acao', entrada: { tipo: 'instrucao' }, resumo: 'Proposta recusada: falta o título' });
    itens = acrescentarTexto(itens, 'Vou propor uma orientação para este lead.');
    itens = acrescentarSugestao(itens, SUGESTAO);
    itens = acrescentarFerramenta(itens, { nome: 'propor_acao', entrada: { tipo: 'instrucao' }, resumo: 'Propus a sugestão nº 42' });
    itens = acrescentarTexto(itens, 'Deixei a sugestão nº 42 para você aprovar.');
    itens = encerrarTurno(itens, { mensagem_id: 206, tokens_entrada: 9120, tokens_saida: 410, modelo: 'claude-opus-5-5' });
    const turno: TurnoAoVivo = { ...TURNO_VAZIO, sessaoId: 9, contatoId: 26634, corte: 200, itens, fimId: 206, ultimaPergunta: 'Por que este lead não agendou?' };

    expect(cartoesDoTurno(turno, TURNO_COM_PROPOSTA)).toEqual([{ sessaoId: 9, aposMensagemId: 204, corte: 200, ordem: 0, previa: SUGESTAO }]);
    const final = montarItens(TURNO_COM_PROPOSTA, turno, 9, 26634, []);
    expect(final.map((i) => i.tipo)).toEqual(['gestor', 'ferramentas', 'copiloto', 'sugestao', 'ferramentas', 'copiloto']);
    expect(final[2]).toMatchObject({ mensagemId: 204 });
    expect(final[3]).toMatchObject({ sugestaoId: 42 });
    expect(final[5]).toMatchObject({ mensagemId: 206 });
    // A mesma chave ao vivo e no histórico: o cartão não remonta (nem perde o que o gestor digitava nele).
    expect(final[3].chave).toBe(itens.find((i) => i.tipo === 'sugestao')?.chave);
  });

  it('sem a mensagem que o propôs no histórico, o cartão vai para depois da final ou para o fim', () => {
    const turno: TurnoAoVivo = { ...TURNO_VAZIO, sessaoId: 9, corte: 200, itens: acrescentarSugestao([], SUGESTAO), fimId: 206 };
    expect(cartoesDoTurno(turno, [])).toEqual([{ sessaoId: 9, aposMensagemId: 206, corte: 200, ordem: 0, previa: SUGESTAO }]);
    expect(cartoesDoTurno({ ...turno, fimId: null }, [])).toEqual([{ sessaoId: 9, aposMensagemId: null, corte: 200, ordem: 0, previa: SUGESTAO }]);
    const itens = itensDoHistorico(TURNO_COM_PROPOSTA.slice(0, 1), [{ sessaoId: 9, aposMensagemId: null, corte: 200, ordem: 0, previa: SUGESTAO }]);
    expect(itens.map((i) => i.tipo)).toEqual(['gestor', 'sugestao']);
  });

  it('o cartão que foi para a visita antes de o histórico trazer o turno acha o lugar certo quando ele chega', () => {
    // O turno saiu da tela logo depois do "fim", com o cache ainda sem o turno: a reserva é a mensagem final.
    const turno: TurnoAoVivo = { ...TURNO_VAZIO, sessaoId: 9, corte: 200, itens: acrescentarSugestao([], SUGESTAO), fimId: 206 };
    const [daVisita] = cartoesDoTurno(turno, TURNO_COM_PROPOSTA.slice(0, 1));
    expect(daVisita).toMatchObject({ aposMensagemId: 206, corte: 200, ordem: 0 });
    // O histórico recarregado traz a mensagem que o propôs (204): o cartão vai para depois dela.
    const itens = montarItens(TURNO_COM_PROPOSTA, TURNO_VAZIO, 9, null, [daVisita]);
    expect(itens.map((i) => i.tipo)).toEqual(['gestor', 'ferramentas', 'copiloto', 'sugestao', 'ferramentas', 'copiloto']);
    expect(itens[3]).toMatchObject({ sugestaoId: 42 });
    expect(itens[2]).toMatchObject({ mensagemId: 204 });
  });
});
