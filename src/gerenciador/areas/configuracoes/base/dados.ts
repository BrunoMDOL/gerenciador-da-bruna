// A base de conhecimento (bruna_conhecimento), que a tool consultar_base lê
// a cada pergunta: mudar aqui vale na próxima consulta, sem subir nada. O
// histórico nasce sozinho (trigger bruna_conhecimento_historico_trg).
import { db, ErroDoBanco } from '@/gerenciador/lib/db';
import { auditarGestor } from '@/gerenciador/lib/auditoria';
import { chaveDaBase } from '@/gerenciador/lib/acoes';
import type { EntradaDaBase } from '@/gerenciador/lib/tipos';
import { normalizar } from '../comum/texto';
import { exigirLinha } from '../comum/util';

export const TITULO_MAXIMO = 200;
export const CONTEUDO_MAXIMO = 6000;
/** Sem limite no banco; a maior fonte gravada em 05/11 tinha 571 caracteres. */
export const FONTE_MAXIMA = 1000;
export const CATEGORIA_MAXIMA = 40;
export const PALAVRAS_MAXIMAS = 40;

const COLUNAS = 'id, chave, titulo, conteudo, categoria, region, palavras_chave, prioridade, ativo, atualizado_em, fonte, confianca';

// Os nomes das categorias moram em lib/formatos (o cartão de sugestão também usa).
export { NOME_DA_CATEGORIA, nomeDaCategoria } from '@/gerenciador/lib/formatos';

export async function listarBase(): Promise<EntradaDaBase[]> {
  const { data, error } = await db.from('bruna_conhecimento').select(COLUNAS).order('categoria').order('prioridade').order('titulo').limit(1000);
  if (error) throw new ErroDoBanco(error.message, error);
  return (data ?? []) as EntradaDaBase[];
}

/** Os ids que a busca de texto do banco acha (tsvector em português, sintaxe de busca da web). */
export async function buscarNaBase(termo: string): Promise<number[]> {
  const t = termo.trim();
  if (!t) return [];
  const { data, error } = await db.from('bruna_conhecimento').select('id').textSearch('busca', t, { config: 'portuguese', type: 'websearch' }).limit(500);
  if (error) throw new ErroDoBanco(error.message, error);
  return ((data ?? []) as Array<{ id: number }>).map((r) => r.id);
}

/** Acha o termo no título, na chave, nas palavras-chave ou no conteúdo, sem ligar para acento. */
export function casaComTermo(e: EntradaDaBase, termo: string): boolean {
  const t = normalizar(termo.trim());
  if (!t) return true;
  return [e.titulo, e.chave, e.conteudo, e.categoria, ...(e.palavras_chave ?? [])].some((x) => normalizar(String(x ?? '')).includes(t));
}

/** Palavra-chave do jeito das que já estão na base: minúscula, sem acento, sem espaço sobrando. */
export function normalizarPalavra(p: string): string {
  return normalizar(p).replace(/\s+/g, ' ').trim().slice(0, 60);
}

export function normalizarCategoria(c: string): string {
  return chaveDaBase(c).slice(0, CATEGORIA_MAXIMA);
}

export interface FormularioDaBase {
  titulo: string;
  conteudo: string;
  categoria: string;
  region: string | null;
  palavras_chave: string[];
  prioridade: number;
  ativo: boolean;
  fonte: string | null;
  confianca: 'alta' | 'media' | null;
}

function validar(f: FormularioDaBase): void {
  if (!f.titulo.trim() || f.titulo.trim().length > TITULO_MAXIMO) throw new Error(`O título vai de 1 a ${TITULO_MAXIMO} caracteres.`);
  if (!f.conteudo.trim() || f.conteudo.trim().length > CONTEUDO_MAXIMO) throw new Error(`O conteúdo vai de 1 a ${CONTEUDO_MAXIMO} caracteres.`);
  if (!f.categoria.trim()) throw new Error('Escolha a categoria.');
}

function linhaDoFormulario(f: FormularioDaBase) {
  return {
    titulo: f.titulo.trim(),
    conteudo: f.conteudo.trim(),
    categoria: normalizarCategoria(f.categoria),
    region: f.region || null,
    // As novas já chegam normalizadas pelo campo de etiquetas; as que já estavam ficam como estão.
    palavras_chave: [...new Set(f.palavras_chave.map((p) => p.trim()).filter(Boolean))].slice(0, PALAVRAS_MAXIMAS),
    prioridade: f.prioridade,
    ativo: f.ativo,
    fonte: f.fonte?.trim() ? f.fonte.trim().slice(0, FONTE_MAXIMA) : null,
    confianca: f.confianca,
  };
}

export class ChaveRepetida extends Error {
  constructor(public readonly chave: string) {
    super(`Já existe uma entrada com a chave "${chave}". Mude o título ou edite a entrada que já existe.`);
    this.name = 'ChaveRepetida';
  }
}

export async function criarEntrada(f: FormularioDaBase, extra: Record<string, unknown> = {}): Promise<{ id: number; chave: string }> {
  validar(f);
  const linha = { ...linhaDoFormulario(f), chave: chaveDaBase(f.titulo) };
  const { data, error } = await db.from('bruna_conhecimento').insert(linha).select('id, chave').single();
  if (error) {
    if (error.code === '23505') throw new ChaveRepetida(linha.chave);
    throw new ErroDoBanco(error.message, error);
  }
  const criada = data as { id: number; chave: string };
  await auditarGestor({
    acao: 'gestor_base_criada',
    entidade: 'bruna_conhecimento',
    entidadeId: criada.id,
    detalhes: { chave: criada.chave, titulo: linha.titulo, categoria: linha.categoria, region: linha.region, ...extra },
  });
  return criada;
}

/** Só os campos que mudaram. */
export function camposAlterados(antes: EntradaDaBase, f: FormularioDaBase): Record<string, unknown> {
  const depois = linhaDoFormulario(f);
  const mudou: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(depois)) {
    const velho = (antes as unknown as Record<string, unknown>)[k];
    if (JSON.stringify(velho ?? null) !== JSON.stringify(v ?? null)) mudou[k] = v;
  }
  return mudou;
}

export async function alterarEntrada(antes: EntradaDaBase, f: FormularioDaBase): Promise<boolean> {
  validar(f);
  const mudanca = camposAlterados(antes, f);
  if (!Object.keys(mudanca).length) return false;
  const { data, error } = await db.from('bruna_conhecimento').update(mudanca).eq('id', antes.id).select('id');
  if (error) throw new ErroDoBanco(error.message, error);
  exigirLinha(data);
  const soAtivo = Object.keys(mudanca).length === 1 && 'ativo' in mudanca;
  await auditarGestor({
    acao: soAtivo ? (mudanca.ativo ? 'gestor_base_reativada' : 'gestor_base_desativada') : 'gestor_base_alterada',
    entidade: 'bruna_conhecimento',
    entidadeId: antes.id,
    detalhes: { chave: antes.chave, titulo: String(mudanca.titulo ?? antes.titulo), campos: Object.keys(mudanca) },
  });
  return true;
}

export async function mudarAtivo(e: EntradaDaBase, ativo: boolean): Promise<void> {
  const { data, error } = await db.from('bruna_conhecimento').update({ ativo }).eq('id', e.id).select('id');
  if (error) throw new ErroDoBanco(error.message, error);
  exigirLinha(data);
  await auditarGestor({
    acao: ativo ? 'gestor_base_reativada' : 'gestor_base_desativada',
    entidade: 'bruna_conhecimento',
    entidadeId: e.id,
    detalhes: { chave: e.chave, titulo: e.titulo },
  });
}

// ---------------------------------------------------------------------------
// Histórico e restauração
// ---------------------------------------------------------------------------
export interface HistoricoDaBase {
  id: number;
  conhecimento_id: number;
  chave: string | null;
  acao: 'criada' | 'alterada' | 'apagada';
  antes: Partial<EntradaDaBase> | null;
  depois: Partial<EntradaDaBase> | null;
  por_email: string | null;
  em: string;
}

export async function lerHistoricoDaBase(id: number): Promise<HistoricoDaBase[]> {
  const { data, error } = await db
    .from('bruna_conhecimento_historico')
    .select('id, conhecimento_id, chave, acao, antes, depois, por_email, em')
    .eq('conhecimento_id', id)
    .order('em', { ascending: false })
    .limit(100);
  if (error) throw new ErroDoBanco(error.message, error);
  return (data ?? []) as HistoricoDaBase[];
}

export const CAMPOS_RESTAURAVEIS = ['titulo', 'conteudo', 'categoria', 'region', 'palavras_chave', 'prioridade', 'ativo', 'fonte', 'confianca'] as const;
type CampoRestauravel = (typeof CAMPOS_RESTAURAVEIS)[number];

export interface VersaoDaEntrada {
  /** A linha do histórico de onde a versão sai. */
  historicoId: number;
  /** De que lado da linha: o depois da mudança, ou o antes (a versão de antes do histórico começar). */
  lado: 'depois' | 'antes';
  em: string;
  por: string | null;
  acao: HistoricoDaBase['acao'];
  campos: Partial<Pick<EntradaDaBase, CampoRestauravel>>;
}

function camposDe(s: Partial<EntradaDaBase> | null): Partial<Pick<EntradaDaBase, CampoRestauravel>> {
  const out: Record<string, unknown> = {};
  if (!s) return out;
  for (const c of CAMPOS_RESTAURAVEIS) if (c in s) out[c] = (s as Record<string, unknown>)[c];
  return out as Partial<Pick<EntradaDaBase, CampoRestauravel>>;
}

/**
 * As versões da entrada, da mais nova para a mais velha: o "depois" de cada
 * mudança e, quando a primeira linha do histórico é uma alteração, o "antes"
 * dela (a entrada como era antes de o histórico existir).
 */
export function versoesDaEntrada(historico: HistoricoDaBase[]): VersaoDaEntrada[] {
  const versoes: VersaoDaEntrada[] = [];
  for (const h of historico) {
    if (h.depois) versoes.push({ historicoId: h.id, lado: 'depois', em: h.em, por: h.por_email, acao: h.acao, campos: camposDe(h.depois) });
  }
  const maisVelha = historico[historico.length - 1];
  if (maisVelha && maisVelha.acao === 'alterada' && maisVelha.antes) {
    versoes.push({ historicoId: maisVelha.id, lado: 'antes', em: maisVelha.em, por: null, acao: maisVelha.acao, campos: camposDe(maisVelha.antes) });
  }
  return versoes;
}

/** Os campos da versão que diferem da entrada como está agora. */
export function diferencaDaAtual(entrada: EntradaDaBase, versao: VersaoDaEntrada): CampoRestauravel[] {
  return CAMPOS_RESTAURAVEIS.filter((c) => c in versao.campos
    && JSON.stringify((versao.campos as Record<string, unknown>)[c] ?? null) !== JSON.stringify((entrada as unknown as Record<string, unknown>)[c] ?? null));
}

export async function restaurarVersao(entrada: EntradaDaBase, versao: VersaoDaEntrada): Promise<void> {
  const campos = diferencaDaAtual(entrada, versao);
  if (!campos.length) throw new Error('Essa versão é igual à entrada como está agora.');
  const mudanca = Object.fromEntries(campos.map((c) => [c, (versao.campos as Record<string, unknown>)[c] ?? null]));
  const { data, error } = await db.from('bruna_conhecimento').update(mudanca).eq('id', entrada.id).select('id');
  if (error) throw new ErroDoBanco(error.message, error);
  exigirLinha(data);
  await auditarGestor({
    acao: 'gestor_base_restaurada',
    entidade: 'bruna_conhecimento',
    entidadeId: entrada.id,
    detalhes: { chave: entrada.chave, historico_id: versao.historicoId, lado: versao.lado, de_quando: versao.em, campos },
  });
}

// ---------------------------------------------------------------------------
// Perguntas que a base não respondeu (bruna_duvidas)
// ---------------------------------------------------------------------------
export interface Duvida {
  id: number;
  contato_id: number | null;
  region: string | null;
  pergunta: string;
  pergunta_norm: string | null;
  criado_at: string;
}

export interface GrupoDeDuvidas {
  chave: string;
  region: string | null;
  /** A formulação mais recente. */
  pergunta: string;
  exemplos: string[];
  ids: number[];
  contatos: number[];
  vezes: number;
  ultima: string;
}

export const DIAS_DAS_DUVIDAS = 14;

export async function listarDuvidas(agora: Date = new Date()): Promise<Duvida[]> {
  const desde = new Date(agora.getTime() - DIAS_DAS_DUVIDAS * 86_400_000).toISOString();
  const { data, error } = await db
    .from('bruna_duvidas')
    .select('id, contato_id, region, pergunta, pergunta_norm, criado_at')
    .eq('encontrou', false)
    .is('resolvida_em', null)
    .gte('criado_at', desde)
    .order('criado_at', { ascending: false })
    .limit(300);
  if (error) throw new ErroDoBanco(error.message, error);
  return (data ?? []) as Duvida[];
}

/** Agrupa como a view bruna_duvidas_pendentes: região + os 80 primeiros caracteres da pergunta normalizada. */
export function agruparDuvidas(duvidas: Duvida[]): GrupoDeDuvidas[] {
  const grupos = new Map<string, GrupoDeDuvidas>();
  for (const d of duvidas) {
    const norm = (d.pergunta_norm ?? normalizar(d.pergunta)).slice(0, 80);
    const chave = `${d.region ?? ''}|${norm}`;
    const g = grupos.get(chave);
    if (!g) {
      grupos.set(chave, {
        chave, region: d.region, pergunta: d.pergunta, exemplos: [d.pergunta], ids: [d.id],
        contatos: d.contato_id != null ? [d.contato_id] : [], vezes: 1, ultima: d.criado_at,
      });
      continue;
    }
    g.ids.push(d.id);
    g.vezes += 1;
    if (g.exemplos.length < 3 && !g.exemplos.includes(d.pergunta)) g.exemplos.push(d.pergunta);
    if (d.contato_id != null && !g.contatos.includes(d.contato_id)) g.contatos.push(d.contato_id);
    if (d.criado_at > g.ultima) { g.ultima = d.criado_at; g.pergunta = d.pergunta; }
  }
  return [...grupos.values()].sort((a, b) => b.vezes - a.vezes || b.ultima.localeCompare(a.ultima));
}

/** Marca a fila: a pergunta virou a entrada `chave`. */
export async function resolverDuvidas(ids: number[], chave: string, resposta: string): Promise<void> {
  const { data, error } = await db
    .from('bruna_duvidas')
    .update({ resolvida_em: new Date().toISOString(), resposta_dono: resposta.slice(0, 2000), virou_chave: chave })
    .in('id', ids)
    .select('id');
  if (error) throw new ErroDoBanco(error.message, error);
  exigirLinha(data);
}

export const RESPOSTA_DO_DESCARTE = 'descartada no gerenciador: não é assunto da base';

export async function descartarDuvidas(grupo: GrupoDeDuvidas): Promise<void> {
  const { data, error } = await db
    .from('bruna_duvidas')
    .update({ resolvida_em: new Date().toISOString(), resposta_dono: RESPOSTA_DO_DESCARTE })
    .in('id', grupo.ids)
    .select('id');
  if (error) throw new ErroDoBanco(error.message, error);
  exigirLinha(data);
  await auditarGestor({
    acao: 'gestor_base_duvida_descartada',
    entidade: 'bruna_duvidas',
    entidadeId: grupo.ids[0] ?? null,
    contatoId: grupo.contatos[0] ?? null,
    detalhes: { pergunta: grupo.pergunta.slice(0, 300), ids: grupo.ids, vezes: grupo.vezes },
  });
}
