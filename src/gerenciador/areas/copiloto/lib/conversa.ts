import type { CopilotoMensagem } from '@/gerenciador/lib/tipos';
import type { ErroDoCopiloto, FerramentaDoEvento, FimDoEvento, SugestaoDoEvento } from './protocolo';

/**
 * O que a tela desenha: a conversa como uma lista de itens. Os itens vêm de
 * duas fontes que precisam se encaixar sem duplicar nada: o histórico gravado
 * em bruna_copiloto_mensagens (quem escreve é a edge function) e o turno ao
 * vivo, que chega pelo fluxo SSE enquanto a função ainda está gravando.
 */
export interface FerramentaChamada {
  nome: string;
  /** Uma frase do fluxo ("Li o estado do lead 26634"); o histórico não guarda. */
  resumo: string | null;
}

export type ItemDaConversa =
  | { chave: string; tipo: 'gestor'; texto: string; em: string | null; mensagemId: number | null }
  | {
      chave: string;
      tipo: 'copiloto';
      texto: string;
      em: string | null;
      mensagemId: number | null;
      modelo: string | null;
      tokensEntrada: number | null;
      tokensSaida: number | null;
      /** Ainda crescendo com os deltas do fluxo. */
      emAndamento: boolean;
    }
  | { chave: string; tipo: 'ferramentas'; ferramentas: FerramentaChamada[] }
  | { chave: string; tipo: 'sugestao'; sugestaoId: number; previa: SugestaoDoEvento }
  | {
      chave: string;
      tipo: 'erro';
      erro: ErroDoCopiloto;
      /** O fluxo parou antes do fim, mas a função pode terminar de gravar o turno: a tela está conferindo. */
      aguardandoGravacao?: boolean;
    };

export type ItemCopiloto = Extract<ItemDaConversa, { tipo: 'copiloto' }>;
export type ItemSugestao = Extract<ItemDaConversa, { tipo: 'sugestao' }>;

/** O turno em andamento (ou recém-terminado) desta visita. */
export interface TurnoAoVivo {
  /** A sessão a que os itens pertencem; null enquanto a função ainda não devolveu o id da sessão nova. */
  sessaoId: number | null;
  /** O lead da conversa nova em que o turno nasceu (de ?contato=): sem sessão, é ele que diz de onde o turno é. */
  contatoId: number | null;
  /**
   * O maior id do histórico que é de antes do turno: o que vier depois dele no
   * banco é deste turno. Nasce do cache (null se o histórico ainda não tinha
   * carregado) e fica exato no evento "usuario" (o id da pergunta menos 1).
   */
  corte: number | null;
  itens: ItemDaConversa[];
  emAndamento: boolean;
  /** mensagem_id do evento "fim": quando o histórico já o traz, o turno vira histórico. */
  fimId: number | null;
  /** A última pergunta, para o "tentar de novo". */
  ultimaPergunta: string | null;
  /**
   * O fluxo parou sem "fim" nem "erro" (cancelado, cortado) depois de a função
   * gravar a pergunta: ela pode seguir o turno e gravar a resposta. Até este
   * instante (ms) a tela confere se a mensagem final apareceu no banco.
   */
  aguardaGravacaoAte: number | null;
}

export const TURNO_VAZIO: TurnoAoVivo = {
  sessaoId: null, contatoId: null, corte: null, itens: [], emAndamento: false, fimId: null, ultimaPergunta: null, aguardaGravacaoAte: null,
};

/**
 * O turno é desta tela? Numa sessão, pela sessão; numa conversa nova (sem
 * sessão ainda), também pelo lead da URL, para o turno de ?contato=A não
 * aparecer em ?contato=B nem numa conversa nova sem lead.
 */
export function turnoDoEndereco(turno: TurnoAoVivo, sessaoId: number | null, contatoId: number | null): boolean {
  return turno.sessaoId === sessaoId && (sessaoId != null || turno.contatoId === contatoId);
}

/** Um cartão que chegou pelo fluxo nesta visita; o banco não liga sugestão a sessão, então fica só na memória da tela. */
export interface SugestaoDaVisita {
  sessaoId: number;
  /** O lugar de reserva (a mensagem final do turno, se veio): o cartão aparece depois dela; null = no fim do histórico. */
  aposMensagemId: number | null;
  /**
   * Para achar, no histórico mais novo, a mensagem que propôs o cartão: o
   * corte do turno em que ele chegou e a ordem dele entre as propostas do turno.
   */
  corte: number | null;
  ordem: number;
  previa: SugestaoDoEvento;
}

/** A tool com que o copiloto propõe uma ação (cada chamada bem-sucedida vira um evento "sugestao"). */
export const NOME_DA_PROPOSTA = 'propor_acao';

interface BlocoDaApi {
  type?: string;
  id?: string;
  name?: string;
  text?: string;
  tool_use_id?: string;
  is_error?: boolean;
}

function blocos(m: CopilotoMensagem): BlocoDaApi[] {
  if (!Array.isArray(m.conteudo)) return [];
  return (m.conteudo as BlocoDaApi[]).filter((b) => b != null && typeof b === 'object');
}

/** Os nomes das ferramentas chamadas numa mensagem do assistente (blocos tool_use). */
export function ferramentasDaMensagem(m: CopilotoMensagem): string[] {
  return blocos(m)
    .filter((b) => b.type === 'tool_use' && typeof b.name === 'string')
    .map((b) => b.name as string);
}

/** O maior id de uma lista de mensagens (0 quando não há nenhuma). */
export function maiorId(mensagens: CopilotoMensagem[]): number {
  return mensagens.reduce((maior, m) => (m.id > maior ? m.id : maior), 0);
}

/**
 * Onde cada cartão do turno mora no histórico: a mensagem do assistente que
 * chamou propor_acao, uma entrada por chamada bem-sucedida (o tool_result sem
 * is_error), na ordem em que o fluxo as entregou. A função grava a mensagem
 * com o tool_use antes de rodar a tool, e a tool é que emite a sugestão.
 */
export function ancorasDasPropostas(historico: CopilotoMensagem[], depoisDe: number): number[] {
  const recusadas = new Set<string>();
  for (const m of historico) {
    if (m.id <= depoisDe || m.papel !== 'user') continue;
    for (const b of blocos(m)) {
      if (b.type === 'tool_result' && b.is_error === true && typeof b.tool_use_id === 'string') recusadas.add(b.tool_use_id);
    }
  }
  const ancoras: number[] = [];
  for (const m of historico) {
    if (m.id <= depoisDe || m.papel !== 'assistant') continue;
    for (const b of blocos(m)) {
      if (b.type === 'tool_use' && b.name === NOME_DA_PROPOSTA && !(typeof b.id === 'string' && recusadas.has(b.id))) ancoras.push(m.id);
    }
  }
  return ancoras;
}

const chaveDoCartao = (id: number) => `sugestao-${id}`;

/**
 * Do histórico gravado para os itens da tela: só as linhas com texto viram
 * balão; as de tool_use viram a linha discreta "consultou ..."; as de
 * tool_result (papel user, texto null) não aparecem. Os cartões da visita
 * entram logo depois do balão da mensagem a que pertencem (antes da linha de
 * consulta dela, como chegaram no fluxo); os sem lugar conhecido, no fim.
 */
export function itensDoHistorico(mensagens: CopilotoMensagem[], cartoes: SugestaoDaVisita[] = []): ItemDaConversa[] {
  const itens: ItemDaConversa[] = [];
  const postos = new Set<number>();
  const cartao = (c: SugestaoDaVisita): ItemDaConversa => ({ chave: chaveDoCartao(c.previa.id), tipo: 'sugestao', sugestaoId: c.previa.id, previa: c.previa });
  // O lugar de cada cartão sai do histórico que está na tela (a mensagem que
  // o propôs já estava gravada quando o evento chegou); sem ela, a reserva.
  const ancorasPorCorte = new Map<number, number[]>();
  const lugar = new Map<number, number | null>();
  for (const c of cartoes) {
    let ancora = c.aposMensagemId;
    if (c.corte != null) {
      let ancoras = ancorasPorCorte.get(c.corte);
      if (!ancoras) {
        ancoras = ancorasDasPropostas(mensagens, c.corte);
        ancorasPorCorte.set(c.corte, ancoras);
      }
      ancora = ancoras[c.ordem] ?? c.aposMensagemId;
    }
    if (!lugar.has(c.previa.id)) lugar.set(c.previa.id, ancora);
  }
  for (const m of mensagens) {
    if (m.papel === 'user') {
      if (m.texto != null) itens.push({ chave: `h-${m.id}`, tipo: 'gestor', texto: m.texto, em: m.criado_em, mensagemId: m.id });
      continue;
    }
    if (m.texto != null && m.texto.trim() !== '') {
      itens.push({
        chave: `h-${m.id}`, tipo: 'copiloto', texto: m.texto, em: m.criado_em, mensagemId: m.id,
        modelo: m.modelo ?? null, tokensEntrada: m.tokens_entrada ?? null, tokensSaida: m.tokens_saida ?? null, emAndamento: false,
      });
    }
    for (const c of cartoes) {
      if (lugar.get(c.previa.id) === m.id && !postos.has(c.previa.id)) {
        postos.add(c.previa.id);
        itens.push(cartao(c));
      }
    }
    const nomes = ferramentasDaMensagem(m);
    if (nomes.length === 0) continue;
    const novas: FerramentaChamada[] = nomes.map((nome) => ({ nome, resumo: null }));
    const ultimo = itens[itens.length - 1];
    if (ultimo && ultimo.tipo === 'ferramentas') {
      itens[itens.length - 1] = { ...ultimo, ferramentas: [...ultimo.ferramentas, ...novas] };
    } else {
      itens.push({ chave: `f-${m.id}`, tipo: 'ferramentas', ferramentas: novas });
    }
  }
  for (const c of cartoes) {
    if (!postos.has(c.previa.id)) {
      postos.add(c.previa.id);
      itens.push(cartao(c));
    }
  }
  return itens;
}

let contador = 0;
const chaveNova = (prefixo: string) => `${prefixo}-${++contador}`;

export function itemDoGestor(texto: string, em: string): ItemDaConversa {
  return { chave: chaveNova('g'), tipo: 'gestor', texto, em, mensagemId: null };
}

/** Fecha o balão que estava crescendo (e descarta um balão vazio). */
function fecharBalao(itens: ItemDaConversa[]): ItemDaConversa[] {
  const ultimo = itens[itens.length - 1];
  if (!ultimo || ultimo.tipo !== 'copiloto' || !ultimo.emAndamento) return itens;
  if (ultimo.texto.trim() === '') return itens.slice(0, -1);
  return [...itens.slice(0, -1), { ...ultimo, emAndamento: false }];
}

export function acrescentarTexto(itens: ItemDaConversa[], delta: string): ItemDaConversa[] {
  const ultimo = itens[itens.length - 1];
  if (ultimo && ultimo.tipo === 'copiloto' && ultimo.emAndamento) {
    return [...itens.slice(0, -1), { ...ultimo, texto: ultimo.texto + delta }];
  }
  // A função separa as rodadas com "\n\n"; um balão novo já separa sozinho.
  if (delta.trim() === '') return itens;
  return [...itens, {
    chave: chaveNova('c'), tipo: 'copiloto', texto: delta, em: new Date().toISOString(), mensagemId: null,
    modelo: null, tokensEntrada: null, tokensSaida: null, emAndamento: true,
  }];
}

export function acrescentarFerramenta(itens: ItemDaConversa[], f: FerramentaDoEvento): ItemDaConversa[] {
  const fechados = fecharBalao(itens);
  const chamada: FerramentaChamada = { nome: f.nome, resumo: f.resumo || null };
  const ultimo = fechados[fechados.length - 1];
  if (ultimo && ultimo.tipo === 'ferramentas') {
    return [...fechados.slice(0, -1), { ...ultimo, ferramentas: [...ultimo.ferramentas, chamada] }];
  }
  return [...fechados, { chave: chaveNova('f'), tipo: 'ferramentas', ferramentas: [chamada] }];
}

export function acrescentarSugestao(itens: ItemDaConversa[], s: SugestaoDoEvento): ItemDaConversa[] {
  if (itens.some((i) => i.tipo === 'sugestao' && i.sugestaoId === s.id)) return fecharBalao(itens);
  return [...fecharBalao(itens), { chave: chaveDoCartao(s.id), tipo: 'sugestao', sugestaoId: s.id, previa: s }];
}

export function acrescentarErro(itens: ItemDaConversa[], erro: ErroDoCopiloto): ItemDaConversa[] {
  return [...fecharBalao(itens), { chave: chaveNova('e'), tipo: 'erro', erro }];
}

export function marcarMensagemDoGestor(itens: ItemDaConversa[], mensagemId: number): ItemDaConversa[] {
  return itens.map((i) => (i.tipo === 'gestor' && i.mensagemId == null ? { ...i, mensagemId } : i));
}

/** No "fim": fecha o balão e grava modelo, tokens e o id da mensagem final no último balão do copiloto. */
export function encerrarTurno(itens: ItemDaConversa[], fim: FimDoEvento): ItemDaConversa[] {
  const fechados = fecharBalao(itens);
  let idx = -1;
  for (let k = fechados.length - 1; k >= 0; k--) {
    if (fechados[k].tipo === 'copiloto') { idx = k; break; }
  }
  if (idx === -1) return fechados;
  const balao = fechados[idx] as ItemCopiloto;
  const atualizado: ItemCopiloto = {
    ...balao, mensagemId: fim.mensagem_id, modelo: fim.modelo ?? null,
    tokensEntrada: fim.tokens_entrada ?? null, tokensSaida: fim.tokens_saida ?? null,
  };
  return fechados.map((i, k) => (k === idx ? atualizado : i));
}

export function turnoConcluidoNoHistorico(turno: TurnoAoVivo, historico: CopilotoMensagem[]): boolean {
  return turno.fimId != null && historico.some((m) => m.id === turno.fimId);
}

/**
 * Os cartões de um turno, prontos para a lista da visita, cada um ancorado na
 * mensagem do histórico que o propôs. Sem a âncora (o histórico ainda não
 * trouxe a mensagem), o cartão fica depois da mensagem final, ou no fim, até
 * um histórico mais novo trazê-la (itensDoHistorico refaz a conta).
 */
export function cartoesDoTurno(turno: TurnoAoVivo, historico: CopilotoMensagem[]): SugestaoDaVisita[] {
  if (turno.sessaoId == null) return [];
  const sessaoId = turno.sessaoId;
  const ancoras = turno.corte == null ? [] : ancorasDasPropostas(historico, turno.corte);
  return turno.itens
    .filter((i): i is ItemSugestao => i.tipo === 'sugestao')
    .map((i, k) => ({ sessaoId, aposMensagemId: ancoras[k] ?? turno.fimId ?? null, corte: turno.corte, ordem: k, previa: i.previa }));
}

/**
 * Monta a lista final para uma sessão (ou para a conversa nova). Enquanto o
 * turno ao vivo não aparece no histórico, o histórico entra só até o corte (o
 * que a função gravou durante o turno fica escondido) e os itens ao vivo vêm
 * depois. Quando o histórico já traz a mensagem final do turno, ele passa a
 * valer sozinho, e os cartões do turno continuam pela lista da visita.
 */
export function montarItens(
  historico: CopilotoMensagem[],
  turno: TurnoAoVivo,
  sessaoId: number | null,
  contatoId: number | null,
  sugestoesDaVisita: SugestaoDaVisita[],
): ItemDaConversa[] {
  const turnoDaqui = turno.itens.length > 0 && turnoDoEndereco(turno, sessaoId, contatoId);
  const concluido = turnoDaqui && turnoConcluidoNoHistorico(turno, historico);
  const aoVivo = turnoDaqui && !concluido;
  const corte = turno.corte;
  const base = aoVivo && corte != null ? historico.filter((m) => m.id <= corte) : historico;
  const cartoes = [
    ...sugestoesDaVisita.filter((c) => c.sessaoId === sessaoId),
    ...(concluido ? cartoesDoTurno(turno, historico) : []),
  ];
  const itens = itensDoHistorico(base, cartoes);
  if (!aoVivo) return itens;
  const vistos = new Set(itens.filter((i): i is ItemSugestao => i.tipo === 'sugestao').map((i) => i.sugestaoId));
  const aoVivoSemRepetir = turno.itens.filter((i) => i.tipo !== 'sugestao' || !vistos.has(i.sugestaoId));
  const aguardando = turno.aguardaGravacaoAte != null;
  return [...itens, ...aoVivoSemRepetir.map((i) => (i.tipo === 'erro' && aguardando ? { ...i, aguardandoGravacao: true } : i))];
}
