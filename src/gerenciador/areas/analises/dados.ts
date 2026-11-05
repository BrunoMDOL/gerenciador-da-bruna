// Acesso ao banco e à edge function da área de Análises, mais os helpers puros
// que as telas e os testes compartilham.
import { db, ErroDoBanco } from '@/gerenciador/lib/db';
import { auditarGestor } from '@/gerenciador/lib/auditoria';
import { lerAcao } from '@/gerenciador/lib/acoes';
import { data, duracao, instante, numero, relativo } from '@/gerenciador/lib/formatos';
import { cabecalhosDaFuncao, enderecoDaFuncao } from '@/gerenciador/lib/funcoes';
import { supabase } from '@/integrations/supabase/client';
import type { Analise, Sugestao, TipoSugestao } from '@/gerenciador/lib/tipos';
import type {
  AnaliseDaLista, AnaliseNaTela, ConfigAnalise, ContagemDeSugestoes, LinhaDeConfigAnalise, PedidoDeAnalise, RespostaDaAnalise, StatusDaAnalise,
} from './tipos';

// ----------------------------------------------------------------------------
// Chaves do react-query
// ----------------------------------------------------------------------------
export const CHAVE = {
  tudo: ['gerenciador', 'analises'],
  lista: ['gerenciador', 'analises', 'lista'],
  contagem: ['gerenciador', 'analises', 'contagem-sugestoes'],
  detalhe: (id: number) => ['gerenciador', 'analises', 'detalhe', id],
  sugestoesDaAnalise: (id: number) => ['gerenciador', 'analises', 'sugestoes', 'da-analise', id],
  sugestoesPendentes: ['gerenciador', 'analises', 'sugestoes', 'pendentes'],
  sugestoesDecididas: ['gerenciador', 'analises', 'sugestoes', 'decididas'],
  config: ['gerenciador', 'analises', 'config'],
};

// ----------------------------------------------------------------------------
// Leitura
// ----------------------------------------------------------------------------
const COLUNAS_DA_LISTA =
  'id, tipo, periodo_inicio, periodo_fim, status, achados, modelo, tokens_entrada, tokens_saida, custo_usd, erro, solicitada_por_email, criado_em, iniciada_em, concluida_em';

export async function listarAnalises(): Promise<AnaliseDaLista[]> {
  const { data, error } = await db.from('bruna_analises').select(COLUNAS_DA_LISTA).order('criado_em', { ascending: false }).limit(100);
  if (error) throw new ErroDoBanco(error.message, error);
  return (data ?? []) as AnaliseDaLista[];
}

export async function lerAnalise(id: number): Promise<Analise | null> {
  const { data, error } = await db.from('bruna_analises').select('*').eq('id', id).maybeSingle();
  if (error) throw new ErroDoBanco(error.message, error);
  return (data as Analise | null) ?? null;
}

/** Uma só query: quantas sugestões cada análise listada tem, por status (só as das rodadas que estão na tela). */
export async function contarSugestoesPorAnalise(ids: number[]): Promise<Record<number, ContagemDeSugestoes>> {
  if (!ids.length) return {};
  const { data, error } = await db.from('bruna_sugestoes').select('analise_id, status').in('analise_id', ids);
  if (error) throw new ErroDoBanco(error.message, error);
  return contarPorAnalise((data ?? []) as Array<{ analise_id: number | null; status: Sugestao['status'] }>);
}

export async function lerSugestoesDaAnalise(id: number): Promise<Sugestao[]> {
  const { data, error } = await db.from('bruna_sugestoes').select('*').eq('analise_id', id).order('criado_em', { ascending: false });
  if (error) throw new ErroDoBanco(error.message, error);
  return ordenarSugestoes((data ?? []) as Sugestao[]);
}

/** Pendentes de qualquer origem: prioridade alta → baixa e, dentro dela, as mais novas primeiro. */
export async function lerSugestoesPendentes(): Promise<Sugestao[]> {
  const { data, error } = await db.from('bruna_sugestoes').select('*').eq('status', 'pendente').order('criado_em', { ascending: false }).limit(200);
  if (error) throw new ErroDoBanco(error.message, error);
  return ordenarSugestoes((data ?? []) as Sugestao[]);
}

/** As últimas 50 decididas (aprovadas, aplicadas, rejeitadas e descartadas). */
export async function lerSugestoesDecididas(): Promise<Sugestao[]> {
  const { data, error } = await db
    .from('bruna_sugestoes')
    .select('*')
    .in('status', ['aprovada', 'aplicada', 'rejeitada', 'descartada'])
    .order('decidida_em', { ascending: false, nullsFirst: false })
    .limit(50);
  if (error) throw new ErroDoBanco(error.message, error);
  return (data ?? []) as Sugestao[];
}

export async function lerConfigAnalise(): Promise<LinhaDeConfigAnalise | null> {
  const { data, error } = await db.from('bruna_gestor_config').select('*').eq('chave', 'analise').maybeSingle();
  if (error) throw new ErroDoBanco(error.message, error);
  return (data as LinhaDeConfigAnalise | null) ?? null;
}

// ----------------------------------------------------------------------------
// Escrita
// ----------------------------------------------------------------------------

/**
 * Salva a chave 'analise' inteira, mesclada: o que estava no banco mais a
 * mudança. 'modelo' fica como está (muda em Configurações › Geral).
 */
export async function salvarConfigAnalise(atual: ConfigAnalise, mudanca: Partial<ConfigAnalise>, email: string | null): Promise<ConfigAnalise> {
  const valor = { ...atual, ...mudanca };
  const { error } = await db
    .from('bruna_gestor_config')
    .update({ valor, atualizado_em: new Date().toISOString(), atualizado_por: email })
    .eq('chave', 'analise');
  if (error) throw new ErroDoBanco(error.message, error);
  await auditarGestor({ acao: 'gestor_config_alterada', entidade: 'bruna_gestor_config', detalhes: { chave: 'analise', antes: atual, depois: valor } });
  return valor;
}

// ----------------------------------------------------------------------------
// A edge function bruna-analise (chamador A: a interface, com o JWT do gestor)
// ----------------------------------------------------------------------------
export class ErroDaAnalise extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ErroDaAnalise';
  }
}

/** 503 { erro: "ANTHROPIC_API_KEY ausente" }: a pendência é do dono, não da tela. */
export class ChaveAusente extends ErroDaAnalise {
  constructor() {
    super('ANTHROPIC_API_KEY ausente', 503);
    this.name = 'ChaveAusente';
  }
}

/**
 * POST na edge function. Devolve o 202 { ok, analise_id, status }; lança
 * ChaveAusente no 503 sem a chave e ErroDaAnalise (com a mensagem da função)
 * nos outros erros.
 */
export async function pedirAnalise(pedido: PedidoDeAnalise): Promise<RespostaDaAnalise> {
  const { data: sessao } = await supabase.auth.getSession();
  const token = sessao?.session?.access_token;
  if (!token) throw new ErroDaAnalise('A sessão expirou. Entre de novo para pedir a análise.', 401);

  let resposta: Response;
  try {
    resposta = await fetch(enderecoDaFuncao('bruna-analise'), {
      method: 'POST',
      headers: cabecalhosDaFuncao(token),
      body: JSON.stringify(pedido),
    });
  } catch (e) {
    throw new ErroDaAnalise(`Não deu para falar com a função bruna-analise: ${e instanceof Error ? e.message : 'sem rede'}`, 0);
  }

  const corpo = (await resposta.json().catch(() => null)) as { erro?: unknown; analise_id?: unknown; status?: unknown } | null;
  if (resposta.status === 503 && corpo?.erro === 'ANTHROPIC_API_KEY ausente') throw new ChaveAusente();
  if (!resposta.ok) {
    const erro = typeof corpo?.erro === 'string' && corpo.erro ? corpo.erro : `A função bruna-analise respondeu ${resposta.status}.`;
    throw new ErroDaAnalise(erro, resposta.status);
  }
  if (!corpo || typeof corpo.analise_id !== 'number') {
    throw new ErroDaAnalise('A função bruna-analise respondeu sem o número da análise.', resposta.status);
  }
  return { ok: true, analise_id: corpo.analise_id, status: typeof corpo.status === 'string' ? corpo.status : 'analisando' };
}

// ----------------------------------------------------------------------------
// Helpers puros
// ----------------------------------------------------------------------------
export const EM_ANDAMENTO: ReadonlyArray<StatusDaAnalise> = ['pendente', 'coletando', 'analisando'];

export function emAndamento(status: string | null | undefined): boolean {
  return Boolean(status) && (EM_ANDAMENTO as readonly string[]).includes(status as string);
}

/** refetchInterval do react-query: a cada 5 s enquanto roda; para depois. */
export function intervaloDeAtualizacao(status: string | null | undefined): number | false {
  return emAndamento(status) ? 5000 : false;
}

/** Quanto tempo a tela espera a função trocar a falha antiga por 'coletando' depois do 202 de um "Tentar de novo". */
export const ESPERA_DA_REPETICAO_MS = 60_000;

/**
 * A linha como rodar() da edge function grava ao começar de novo (resultado
 * zerado), mas ainda na fila: a tela mostra isso logo depois do 202 do
 * "Tentar de novo", para o acompanhamento de 5 s começar.
 */
export function comecarRepeticao(a: Analise, pedidaEm: number = Date.now()): AnaliseNaTela {
  return {
    ...a,
    status: 'pendente',
    iniciada_em: null, concluida_em: null, erro: null,
    resumo: null, achados: null, dados: null, modelo: null, tokens_entrada: null, tokens_saida: null, custo_usd: null,
    repeticao: { pedidaEm, falhaAntiga: a.concluida_em },
  };
}

/**
 * A releitura do detalhe depois de um "Tentar de novo". A função responde 202
 * antes de trocar 'falhou' por 'coletando': enquanto o banco ainda traz a
 * mesma falha (mesmo concluida_em) e não passou ESPERA_DA_REPETICAO_MS, a tela
 * segura a rodada na fila, e o acompanhamento não para. Qualquer mudança no
 * banco (coletando, analisando, concluída ou uma falha nova) vale na hora.
 */
export function segurarRepeticao(naTela: AnaliseNaTela | null | undefined, doBanco: Analise | null, agora: number = Date.now()): AnaliseNaTela | null {
  const r = naTela?.repeticao;
  if (!r || !doBanco) return doBanco;
  const aindaAFalhaAntiga = doBanco.status === 'falhou' && doBanco.concluida_em === r.falhaAntiga;
  return aindaAFalhaAntiga && agora - r.pedidaEm < ESPERA_DA_REPETICAO_MS ? { ...comecarRepeticao(doBanco, r.pedidaEm), repeticao: r } : doBanco;
}

export const NOME_DO_TIPO: Record<Analise['tipo'], string> = { semanal: 'semanal', manual: 'sob demanda', lead: 'de um lead' };

export const NOME_DO_TIPO_DE_SUGESTAO: Record<TipoSugestao, string> = {
  nucleo: 'Núcleo', instrucao: 'Orientação', base: 'Base', regua: 'Régua', template: 'Template', config: 'Config', lead: 'Lead', outro: 'Outro',
};

export const NOME_DA_ORIGEM: Record<Sugestao['origem'], string> = { analise: 'da análise', copiloto: 'do copiloto', gestor: 'do gestor' };

export const DIAS_DA_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

export function horaCheia(h: number): string {
  return `${String(Math.max(0, Math.min(23, Math.trunc(h)))).padStart(2, '0')}:00`;
}

export function plural(n: number, um: string, varios: string): string {
  return `${numero(n)} ${n === 1 ? um : varios}`;
}

export function diasDoPeriodo(de: string, ate: string): number {
  const a = instante(de), b = instante(ate);
  if (!a || !b) return 0;
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000));
}

/** "29/10 a 05/11 · 7 dias". */
export function periodoLegivel(de: string, ate: string): string {
  const dias = diasDoPeriodo(de, ate);
  return `${data(de)} a ${data(ate)}${dias ? ` · ${plural(dias, 'dia', 'dias')}` : ''}`;
}

const USD = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "US$ 0,26"; null quando o custo não existe (a tela não mostra). */
export function custoLegivel(valor: number | string | null | undefined): string | null {
  if (valor == null || valor === '') return null;
  const n = Number(valor);
  // O Intl separa "US$" do número com um espaço que não quebra (U+00A0 ou U+202F); a tela usa o comum.
  return Number.isFinite(n) ? USD.format(n).replace(/\s/g, ' ') : null;
}

export function duracaoLegivel(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(Number(ms))) return '—';
  return duracao(Number(ms) / 1000);
}

/**
 * "agora", "há 3 min": há quanto tempo algo do servidor aconteceu. Se o relógio
 * do servidor está uns segundos à frente do navegador, é "agora" (o relativo()
 * da fundação escreveria "em agora").
 */
export function desde(valor: string | null | undefined, agora: Date = new Date()): string {
  const d = instante(valor);
  if (!d) return '—';
  return relativo(d.getTime() > agora.getTime() ? agora : d, agora);
}

/** A rodada semanal nasce em bruna_analise_disparar() com solicitada_por_email = 'cron'. */
const PEDIDA_PELO_CRON = 'cron';
export const AGENDA_SEMANAL = 'agenda semanal';

/** Quem pediu a rodada: o e-mail do gestor, "agenda semanal" quando foi o pg_cron, ou null quando não se sabe. */
export function quemPediu(a: Pick<Analise, 'solicitada_por_email' | 'tipo'>): string | null {
  const email = a.solicitada_por_email?.trim();
  if (email === PEDIDA_PELO_CRON || (!email && a.tipo === 'semanal')) return AGENDA_SEMANAL;
  return email || null;
}

/** "por bruno@…" ou "pela agenda semanal", para a lista; null quando não se sabe quem pediu. */
export function porQuem(a: Pick<Analise, 'solicitada_por_email' | 'tipo'>): string | null {
  const q = quemPediu(a);
  if (!q) return null;
  return q === AGENDA_SEMANAL ? `pela ${AGENDA_SEMANAL}` : `por ${q}`;
}

export function contarAchados(a: Pick<Analise, 'achados'>): number {
  return Array.isArray(a.achados) ? a.achados.length : 0;
}

export function contarSugestoes(lista: Array<Pick<Sugestao, 'status'>>): ContagemDeSugestoes {
  const c: ContagemDeSugestoes = { pendentes: 0, aprovadas: 0, aplicadas: 0, rejeitadas: 0, descartadas: 0, total: 0 };
  for (const s of lista) {
    c.total++;
    if (s.status === 'pendente') c.pendentes++;
    else if (s.status === 'aprovada') c.aprovadas++;
    else if (s.status === 'aplicada') c.aplicadas++;
    else if (s.status === 'rejeitada') c.rejeitadas++;
    else if (s.status === 'descartada') c.descartadas++;
  }
  return c;
}

export function contarPorAnalise(linhas: Array<{ analise_id: number | null; status: Sugestao['status'] }>): Record<number, ContagemDeSugestoes> {
  const grupos = new Map<number, Array<Pick<Sugestao, 'status'>>>();
  for (const l of linhas) {
    if (l.analise_id == null) continue;
    const g = grupos.get(l.analise_id) ?? [];
    g.push(l);
    grupos.set(l.analise_id, g);
  }
  const saida: Record<number, ContagemDeSugestoes> = {};
  for (const [id, g] of grupos) saida[id] = contarSugestoes(g);
  return saida;
}

/** "2 pendentes · 1 aplicada", ou "3 decididas", ou "—" quando não há nenhuma. */
export function resumoDasSugestoes(c: ContagemDeSugestoes | undefined): string {
  if (!c || !c.total) return '—';
  const partes: string[] = [];
  if (c.pendentes) partes.push(plural(c.pendentes, 'pendente', 'pendentes'));
  if (c.aplicadas) partes.push(plural(c.aplicadas, 'aplicada', 'aplicadas'));
  if (!partes.length) partes.push(plural(c.total, 'decidida', 'decididas'));
  return partes.join(' · ');
}

const ORDEM_DO_STATUS: Record<Sugestao['status'], number> = { pendente: 0, aprovada: 1, aplicada: 2, rejeitada: 3, descartada: 4 };
const ORDEM_DA_PRIORIDADE: Record<Sugestao['prioridade'], number> = { alta: 0, media: 1, baixa: 2 };

/** Pendentes primeiro (alta → baixa), depois aprovadas, aplicadas e rejeitadas; dentro de cada grupo, as mais novas primeiro. */
export function ordenarSugestoes(lista: Sugestao[]): Sugestao[] {
  return [...lista].sort((a, b) =>
    (ORDEM_DO_STATUS[a.status] ?? 9) - (ORDEM_DO_STATUS[b.status] ?? 9)
    || (ORDEM_DA_PRIORIDADE[a.prioridade] ?? 9) - (ORDEM_DA_PRIORIDADE[b.prioridade] ?? 9)
    || String(b.criado_em).localeCompare(String(a.criado_em)));
}

/** Tem ação que o gerenciador aplica sozinho (qualquer AcaoSugerida que não seja 'manual'). */
export function temAcaoAutomatica(s: Pick<Sugestao, 'acao'>): boolean {
  const a = lerAcao(s.acao);
  return Boolean(a) && a!.tipo !== 'manual';
}

/** O motivo de uma conversa entrar na amostra, em palavras. */
export function motivoLegivel(motivo: string): string {
  const [tipo, resto] = String(motivo ?? '').split(':');
  switch (tipo) {
    case 'agendou': return 'agendou a consultoria';
    case 'convite_sem_agenda': return 'convite sem agendamento';
    case 'chamado': return `chamou o atendimento${resto ? ` (${resto})` : ''}`;
    case 'objecao': return `objeção${resto ? `: ${resto}` : ''}`;
    default:
      if (tipo.startsWith('revisao_')) return `revisão ${tipo.slice('revisao_'.length)}${resto ? `: ${resto}` : ''}`;
      return motivo;
  }
}

// ----------------------------------------------------------------------------
// A próxima rodada automática, em Brasília
// ----------------------------------------------------------------------------
const FUSO = 'America/Sao_Paulo';
const PARTES_EM_BRASILIA = new Intl.DateTimeFormat('en-US', {
  timeZone: FUSO, hourCycle: 'h23', weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
});
const DIA_CURTO: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function paredeEmBrasilia(d: Date) {
  const p: Record<string, string> = {};
  for (const { type, value } of PARTES_EM_BRASILIA.formatToParts(d)) p[type] = value;
  return {
    diaSemana: DIA_CURTO[p.weekday] ?? 0,
    ano: Number(p.year), mes: Number(p.month), dia: Number(p.day),
    hora: Number(p.hour) % 24, minuto: Number(p.minute), segundo: Number(p.second),
  };
}

/**
 * Quando a próxima rodada automática cai, dado { dia_semana, hora } em
 * Brasília. Se hoje é o dia e a hora já passou, é na semana que vem.
 */
export function proximaRodada(config: Pick<ConfigAnalise, 'dia_semana' | 'hora'>, agora: Date = new Date()): Date {
  const dia = ((Math.trunc(Number(config.dia_semana) || 0) % 7) + 7) % 7;
  const hora = Math.max(0, Math.min(23, Math.trunc(Number(config.hora) || 0)));
  const p = paredeEmBrasilia(agora);
  let avanco = (dia - p.diaSemana + 7) % 7;
  if (avanco === 0 && p.hora >= hora) avanco = 7;
  // A parede local escrita como se fosse UTC, menos o deslocamento do fuso
  // naquele instante, dá o instante real (o Brasil não tem horário de verão).
  const paredeAgora = Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo);
  const deslocamento = paredeAgora - Math.floor(agora.getTime() / 1000) * 1000;
  const alvo = Date.UTC(p.ano, p.mes - 1, p.dia + avanco, hora, 0, 0);
  return new Date(alvo - deslocamento);
}

/**
 * Quanto falta para a próxima rodada, contado no calendário de Brasília:
 * "em menos de 1 h", "em 5 h" (hoje), "amanhã", "em 4 dias". O relativo() da
 * fundação não serve para o futuro: entre 24 h e 36 h escreve "em ontem".
 */
export function quantoFalta(alvo: Date, agora: Date = new Date()): string {
  const ms = alvo.getTime() - agora.getTime();
  if (ms <= 0) return 'agora';
  if (ms < 3_600_000) return 'em menos de 1 h';
  const a = paredeEmBrasilia(agora), b = paredeEmBrasilia(alvo);
  const dias = Math.round((Date.UTC(b.ano, b.mes - 1, b.dia) - Date.UTC(a.ano, a.mes - 1, a.dia)) / 86_400_000);
  if (dias <= 0) return `em ${Math.round(ms / 3_600_000)} h`;
  if (dias === 1) return 'amanhã';
  return `em ${dias} dias`;
}
