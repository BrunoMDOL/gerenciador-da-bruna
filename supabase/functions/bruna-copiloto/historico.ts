// Reconstrução do histórico de uma sessão do copiloto a partir das linhas de
// bruna_copiloto_mensagens, no formato que a API da Anthropic recebe.
//
// A função grava TODAS as mensagens da API (a do gestor, as do assistente com
// tool_use, as de tool_result). Aqui elas voltam como messages[], com quatro
// cuidados:
//   1. blocos de pensamento (thinking/redacted_thinking): voltam iguais
//      enquanto o histórico está inteiro, porque no Opus 5.5 o pensamento dos
//      turnos anteriores fica no contexto e tirá-lo muda o prefixo, e o cache
//      das mensagens se perde a cada turno. A assinatura deles fica presa ao
//      prefixo em que nasceram (system, tools e mensagens anteriores): quando o
//      histórico é cortado (ou a leitura não pegou o começo da sessão), todos
//      saem; e se a API recusar mesmo assim (system ou tools mudaram num
//      deploy), o index.ts repete o pedido uma vez sem eles;
//   2. todo tool_use ganha o seu tool_result: se um turno morreu no meio (a
//      função caiu antes de gravar os resultados), entra um resultado
//      sintético com is_error, para a API não rejeitar o histórico;
//   3. o corte: as últimas ~40 mensagens, sempre começando numa mensagem do
//      gestor com texto, para nunca partir um par tool_use/tool_result nem
//      começar num tool_result órfão;
//   4. mensagens do gestor seguidas (um turno que acabou em tool_result
//      sintético, ou caiu antes da resposta, e a pergunta nova) viram uma só,
//      com os tool_result na frente: os papéis sempre se alternam.
//
// Módulo puro: sem Deno, sem npm.

export type Papel = 'user' | 'assistant';

/** Uma linha de bruna_copiloto_mensagens (só o que o histórico usa). */
export interface LinhaDeMensagem {
  id: number;
  papel: Papel;
  conteudo: unknown;
  texto?: string | null;
}

export interface Bloco {
  type: string;
  [campo: string]: unknown;
}

export interface MensagemDaApi {
  role: Papel;
  content: Bloco[];
}

export interface OpcoesDoCorte {
  /** Teto de mensagens (padrão 40). */
  maxMensagens?: number;
  /** Teto de caracteres do JSON das mensagens, sem os blocos de pensamento (padrão 400 000, ~100 mil tokens). */
  maxCaracteres?: number;
}

export interface OpcoesDoHistorico extends OpcoesDoCorte {
  /** As linhas lidas não começam no início da sessão (a consulta bateu no teto de linhas): conta como corte. */
  incompleto?: boolean;
  /** false tira os blocos de pensamento mesmo com o histórico inteiro (padrão: mantém). */
  manterPensamento?: boolean;
}

const BLOCOS_DE_PENSAMENTO = new Set(['thinking', 'redacted_thinking']);
const ehPensamento = (b: Bloco) => BLOCOS_DE_PENSAMENTO.has(b.type);

/** Cópia exata de um bloco de pensamento do assistente, ou null quando falta a assinatura. */
function blocoDePensamento(b: Bloco): Bloco | null {
  if (b.type === 'thinking' && typeof b.signature === 'string' && b.signature) {
    return { type: 'thinking', thinking: typeof b.thinking === 'string' ? b.thinking : '', signature: b.signature };
  }
  if (b.type === 'redacted_thinking' && typeof b.data === 'string' && b.data) return { type: 'redacted_thinking', data: b.data };
  return null;
}

export const TEXTO_DO_RESULTADO_SINTETICO =
  'Sem resultado: o turno foi interrompido antes de a ferramenta responder. Chame de novo se precisar.';

/** O texto concatenado dos blocos text, ou null quando não há texto (só tool_use, por exemplo). */
export function textoDosBlocos(content: unknown): string | null {
  if (!Array.isArray(content)) return null;
  const partes: string[] = [];
  for (const b of content) {
    if (b && typeof b === 'object' && (b as Bloco).type === 'text' && typeof (b as Bloco).text === 'string') {
      const t = String((b as Bloco).text).trim();
      if (t) partes.push(t);
    }
  }
  const texto = partes.join('\n\n');
  return texto ? texto : null;
}

function normalizarBlocos(papel: Papel, conteudo: unknown): Bloco[] {
  const lista: unknown[] = Array.isArray(conteudo)
    ? conteudo
    : typeof conteudo === 'string'
      ? [{ type: 'text', text: conteudo }]
      : [];
  const saida: Bloco[] = [];
  for (const item of lista) {
    if (!item || typeof item !== 'object') continue;
    const b = item as Bloco;
    if (typeof b.type !== 'string') continue;
    if (ehPensamento(b)) {
      const pensamento = papel === 'assistant' ? blocoDePensamento(b) : null;
      if (pensamento) saida.push(pensamento);
      continue;
    }
    if (b.type === 'text') {
      if (typeof b.text !== 'string' || !b.text.trim()) continue;
      saida.push({ type: 'text', text: b.text });
      continue;
    }
    if (b.type === 'tool_use') {
      if (papel !== 'assistant' || typeof b.id !== 'string' || typeof b.name !== 'string') continue;
      saida.push({ type: 'tool_use', id: b.id, name: b.name, input: b.input && typeof b.input === 'object' ? b.input : {} });
      continue;
    }
    if (b.type === 'tool_result') {
      if (papel !== 'user' || typeof b.tool_use_id !== 'string') continue;
      const r: Bloco = { type: 'tool_result', tool_use_id: b.tool_use_id };
      if (typeof b.content === 'string' || Array.isArray(b.content)) r.content = b.content;
      if (b.is_error === true) r.is_error = true;
      saida.push(r);
      continue;
    }
    // Outros blocos de entrada (imagem, documento) só fazem sentido no lado do gestor.
    if (papel === 'user') saida.push(b);
  }
  // Resposta só com pensamento (cortada em max_tokens antes de escrever) não entra.
  if (!saida.some((b) => !ehPensamento(b))) return [];
  return saida;
}

/** Tira os blocos de pensamento (e as mensagens que ficarem vazias). */
export function semPensamento(mensagens: MensagemDaApi[]): MensagemDaApi[] {
  const saida: MensagemDaApi[] = [];
  for (const m of mensagens) {
    if (!m.content.some(ehPensamento)) {
      saida.push(m);
      continue;
    }
    const content = m.content.filter((b) => !ehPensamento(b));
    if (content.length) saida.push({ role: m.role, content });
  }
  return saida;
}

export function temPensamento(mensagens: MensagemDaApi[]): boolean {
  return mensagens.some((m) => m.content.some(ehPensamento));
}

/** Junta mensagens do gestor seguidas numa só, com os tool_result na frente (os papéis passam a se alternar). */
export function juntarMensagensSeguidas(mensagens: MensagemDaApi[]): MensagemDaApi[] {
  const saida: MensagemDaApi[] = [];
  for (const m of mensagens) {
    const anterior = saida[saida.length - 1];
    if (anterior && anterior.role === 'user' && m.role === 'user') {
      const blocos = [...anterior.content, ...m.content];
      saida[saida.length - 1] = {
        role: 'user',
        content: [...blocos.filter((b) => b.type === 'tool_result'), ...blocos.filter((b) => b.type !== 'tool_result')],
      };
      continue;
    }
    saida.push(m);
  }
  return saida;
}

function resultadoSintetico(toolUseId: string): Bloco {
  return { type: 'tool_result', tool_use_id: toolUseId, is_error: true, content: TEXTO_DO_RESULTADO_SINTETICO };
}

/** Garante que todo tool_use do assistente tem o seu tool_result na mensagem user seguinte. */
export function repararParesDeTool(mensagens: MensagemDaApi[]): MensagemDaApi[] {
  const saida: MensagemDaApi[] = [];
  let pendentes: string[] = [];
  const fecharPendentes = () => {
    if (pendentes.length) saida.push({ role: 'user', content: pendentes.map(resultadoSintetico) });
    pendentes = [];
  };
  for (const m of mensagens) {
    if (m.role === 'assistant') {
      fecharPendentes();
      saida.push(m);
      pendentes = m.content.filter((b) => b.type === 'tool_use').map((b) => String(b.id));
      continue;
    }
    const resultados = m.content.filter((b) => b.type === 'tool_result');
    const outros = m.content.filter((b) => b.type !== 'tool_result');
    if (resultados.length) {
      const validos = resultados.filter((r) => pendentes.includes(String(r.tool_use_id)));
      const respondidos = new Set(validos.map((r) => String(r.tool_use_id)));
      const faltando = pendentes.filter((id) => !respondidos.has(id));
      pendentes = [];
      const content = [...validos, ...faltando.map(resultadoSintetico), ...outros];
      if (content.length) saida.push({ role: 'user', content });
      continue;
    }
    fecharPendentes();
    if (outros.length) saida.push({ role: 'user', content: outros });
  }
  fecharPendentes();
  return saida;
}

/** Mensagem do gestor: user com texto e sem tool_result. */
export function ehMensagemDoGestor(m: MensagemDaApi): boolean {
  return m.role === 'user' && m.content.some((b) => b.type === 'text') && !m.content.some((b) => b.type === 'tool_result');
}

/** O tamanho que conta para o corte: o JSON da mensagem sem os blocos de pensamento (a assinatura é longa e não é texto da conversa). */
function tamanhoParaOCorte(m: MensagemDaApi): number {
  return JSON.stringify(m.content.some(ehPensamento) ? { role: m.role, content: m.content.filter((b) => !ehPensamento(b)) } : m).length;
}

function tamanhoDesde(mensagens: MensagemDaApi[], inicio: number): number {
  let n = 0;
  for (let i = inicio; i < mensagens.length; i++) n += tamanhoParaOCorte(mensagens[i]);
  return n;
}

export function cortarHistorico(mensagens: MensagemDaApi[], opcoes: OpcoesDoCorte = {}): MensagemDaApi[] {
  const maxMensagens = Math.max(1, opcoes.maxMensagens ?? 40);
  const maxCaracteres = Math.max(1000, opcoes.maxCaracteres ?? 400_000);
  const n = mensagens.length;
  if (!n) return [];
  const janela = Math.max(0, n - maxMensagens);
  let inicio = -1;
  for (let i = janela; i < n; i++) {
    if (ehMensagemDoGestor(mensagens[i])) {
      inicio = i;
      break;
    }
  }
  if (inicio < 0) {
    for (let i = janela - 1; i >= 0; i--) {
      if (ehMensagemDoGestor(mensagens[i])) {
        inicio = i;
        break;
      }
    }
  }
  if (inicio < 0) return [];
  let tamanho = tamanhoDesde(mensagens, inicio);
  while (tamanho > maxCaracteres) {
    let proximo = -1;
    for (let i = inicio + 1; i < n; i++) {
      if (ehMensagemDoGestor(mensagens[i])) {
        proximo = i;
        break;
      }
    }
    if (proximo < 0) break;
    inicio = proximo;
    tamanho = tamanhoDesde(mensagens, inicio);
  }
  return mensagens.slice(inicio);
}

/**
 * As linhas do banco (em qualquer ordem) viram o messages[] que vai à API, já
 * reparado, cortado e com as mensagens do gestor seguidas juntas. Os blocos de
 * pensamento só ficam quando nada foi cortado (nem pela leitura, nem pelo
 * corte) e manterPensamento não é false.
 */
export function reconstruirHistorico(linhas: LinhaDeMensagem[], opcoes: OpcoesDoHistorico = {}): MensagemDaApi[] {
  const ordenadas = [...linhas].sort((a, b) => a.id - b.id);
  const mensagens: MensagemDaApi[] = [];
  for (const l of ordenadas) {
    if (l.papel !== 'user' && l.papel !== 'assistant') continue;
    const content = normalizarBlocos(l.papel, l.conteudo);
    if (!content.length) continue;
    mensagens.push({ role: l.papel, content });
  }
  const reparadas = repararParesDeTool(mensagens);
  const cortadas = cortarHistorico(reparadas, opcoes);
  const inteiro = !opcoes.incompleto && cortadas.length === reparadas.length;
  const final = opcoes.manterPensamento !== false && inteiro ? cortadas : semPensamento(cortadas);
  return juntarMensagensSeguidas(final);
}

const FUSO = 'America/Sao_Paulo';
const CARIMBO = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO,
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** "qui 05/11/2026 00:20" em Brasília. */
export function carimboDeDataHora(instante: Date): string {
  const p: Record<string, string> = {};
  for (const parte of CARIMBO.formatToParts(instante)) p[parte.type] = parte.value;
  const semana = (p.weekday ?? '').replace('.', '');
  return `${semana} ${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

/** Primeiros 60 caracteres do texto, numa linha, sem espaço sobrando no fim. */
export function tituloDaSessao(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim().slice(0, 60).trimEnd();
}

/**
 * O texto do gestor como vai para a API: com a data e a hora do envio (e o
 * lead da sessão), para o modelo saber o "agora" sem o system prompt mudar
 * (o cache do prefixo exige system estável). A coluna `texto` guarda o texto
 * original; `conteudo` guarda este.
 */
export function carimbarMensagemDoGestor(texto: string, agora: Date, contatoId: number | null): string {
  const foco = contatoId ? `; sessão sobre o lead ${contatoId}` : '';
  return `[Mensagem do gestor enviada em ${carimboDeDataHora(agora)}, horário de Brasília${foco}]\n${texto}`;
}
