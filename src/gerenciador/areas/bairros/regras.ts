// Regras puras da área Bairros foco: a normalização igual à do banco, as
// exceções em texto claro, a frase do teste, a ordem da lista, o histórico
// legível e o formato do docs/bruna/regioes.json para exportar.
import { PRACAS } from '@/gerenciador/lib/formatos';
import { rotaDoRecorte } from '@/gerenciador/lib/recorte';
import type { Bloqueio, EstadoDoItem, MudancaNoHistorico, Praca, ResultadoDoSalvar, ResultadoDoTeste, TipoDoFoco } from './tipos';
import { rota } from '@/gerenciador/lib/rotas';

export const NOME_MINIMO = 2;
export const NOME_MAXIMO = 80;
export const TERMO_MAXIMO = 60;
export const TERMOS_MAXIMOS = 20;
export const OBSERVACAO_MAXIMA = 300;
export const MOTIVO_MAXIMO = 300;

// ---------------------------------------------------------------------------
// Texto
// ---------------------------------------------------------------------------

const COM_ACENTO = 'áàâãäéèêëíìîïóòôõöúùûüçñ';
const SEM_ACENTO = 'aaaaaeeeeiiiiooooouuuucn';

/**
 * O mesmo que public.bruna_normaliza_texto: minúsculas, o translate de
 * acentos do banco e tudo que não é letra ou número vira um espaço.
 */
export function normalizar(texto: string | null | undefined): string {
  let s = '';
  for (const ch of String(texto ?? '').toLowerCase()) {
    const i = COM_ACENTO.indexOf(ch);
    s += i >= 0 ? SEM_ACENTO[i] : ch;
  }
  return s.replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Espaços colapsados, como o banco grava o nome. */
export function colapsar(texto: string | null | undefined): string {
  return String(texto ?? '').replace(/\s+/g, ' ').trim();
}

/** ["a", "b", "c"] -> "a, b ou c". */
export function juntar(partes: string[], conjuncao: 'e' | 'ou' = 'e'): string {
  if (partes.length <= 1) return partes[0] ?? '';
  return `${partes.slice(0, -1).join(', ')} ${conjuncao} ${partes[partes.length - 1]}`;
}

const CONECTIVOS = new Set(['da', 'das', 'de', 'do', 'dos', 'e', 'd']);

/**
 * "valinhos" -> "Valinhos", "sao jose dos campos" -> "Sao Jose dos Campos".
 * Os termos chegam como o gestor ou o repositório gravou (em geral sem
 * acento); termo que já tem maiúscula fica como está. Nenhum acento é inventado.
 */
export function nomeProprio(termo: string): string {
  const t = colapsar(termo);
  if (/[A-ZÀ-Þ]/.test(t)) return t;
  return t
    .split(' ')
    .map((p, i) => (i > 0 && CONECTIVOS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ');
}

export function nomeDoTipo(tipo: TipoDoFoco | null | undefined): string {
  return tipo === 'cidade' ? 'cidade inteira' : 'bairro';
}

/** As exceções do item em texto claro, uma frase por regra. */
export function descreverExcecoes(item: Pick<EstadoDoItem, 'so_se' | 'nao_se'>): string[] {
  const partes: string[] = [];
  const soSe = item.so_se ?? [];
  const naoSe = item.nao_se ?? [];
  if (soSe.length) partes.push(`só se a cidade for ${juntar(soSe.map(nomeProprio), 'ou')}`);
  if (naoSe.length) partes.push(`não vale para: ${naoSe.join(', ')}`);
  return partes;
}

// ---------------------------------------------------------------------------
// Teste de um bairro
// ---------------------------------------------------------------------------

/** A explicação do resultado de bruna_gestor_bairro_foco_testar em uma frase. */
export function fraseDoTeste(r: ResultadoDoTeste): string {
  if (!r.oferece_consultoria) {
    return 'Não é foco: a praça está sem lista, e sem lista a Bruna não oferece consultoria nela.';
  }
  if (r.foco) {
    const com = r.tipo === 'cidade' ? `a cidade ${r.nome}` : r.nome ?? 'um item da lista';
    if (r.como === 'nucleo') return `É foco: casou com ${com} pelo núcleo '${r.nucleo}'.`;
    if (r.como === 'nome_completo') return `É foco: casou com ${com} pelo nome completo.`;
    return `É foco: casou com ${com}.`;
  }
  const primeiro = (r.bloqueados ?? [])[0];
  if (primeiro?.motivo === 'nao_se') return `Não é foco: '${primeiro.nome}' não vale quando o texto tem '${primeiro.termo}'.`;
  if (primeiro?.motivo === 'so_se') return `Não é foco: '${primeiro.nome}' só vale se a cidade for ${juntar((primeiro.exige ?? []).map(nomeProprio), 'ou')}.`;
  return 'Não é foco: nenhum bairro da lista casou.';
}

export function descreverBloqueio(b: Bloqueio): string {
  if (b.motivo === 'nao_se') return `não vale quando o texto tem '${b.termo}'`;
  return `só vale se a cidade for ${juntar((b.exige ?? []).map(nomeProprio), 'ou')}`;
}

// ---------------------------------------------------------------------------
// Validação (espelha bruna_gestor_bairro_foco_salvar; quem decide é o banco)
// ---------------------------------------------------------------------------

/** Por que o termo não entra na lista de exceções, ou null quando entra. */
export function problemaDoTermo(termo: string, atuais: string[]): string | null {
  const t = colapsar(termo);
  if (!t) return 'Escreva o termo antes de adicionar.';
  if (!normalizar(t)) return 'O termo precisa ter letras ou números.';
  if (t.length > TERMO_MAXIMO) return `Cada termo tem até ${TERMO_MAXIMO} caracteres.`;
  if (atuais.some((a) => normalizar(a) === normalizar(t))) return 'Esse termo já está na lista.';
  if (atuais.length >= TERMOS_MAXIMOS) return `No máximo ${TERMOS_MAXIMOS} termos.`;
  return null;
}

/**
 * O banco comparou o item com o que já estava gravado e não gravou nada
 * (devolve historico_id nulo e o aviso "Nada mudou"). Acontece quando a tela
 * estava com a lista velha: outra pessoa já tinha feito a mesma mudança.
 */
export function nadaMudouNoBanco(r: Pick<ResultadoDoSalvar, 'acao' | 'historico_id'> | null | undefined): boolean {
  return r?.acao === 'alterado' && r.historico_id === null;
}

/** O que decide quem é foco: se mudou, a simulação anterior não vale mais. */
export function assinaturaDoCasamento(v: { tipo: TipoDoFoco; nome: string; so_se: string[]; nao_se: string[] }): string {
  return JSON.stringify([v.tipo, colapsar(v.nome), v.so_se ?? [], v.nao_se ?? []]);
}

// ---------------------------------------------------------------------------
// Ordem da lista
// ---------------------------------------------------------------------------

export function doTipo<T extends { tipo: TipoDoFoco }>(itens: T[], tipo: TipoDoFoco): T[] {
  return itens.filter((i) => i.tipo === tipo);
}

/**
 * O p_depois_de para subir uma posição: o nome que fica logo antes, ou null
 * quando o item vira o primeiro. undefined quando já é o primeiro.
 */
export function depoisDeAoSubir(nomes: string[], nome: string): string | null | undefined {
  const i = nomes.indexOf(nome);
  if (i <= 0) return undefined;
  return i >= 2 ? nomes[i - 2] : null;
}

/** O p_depois_de para descer uma posição. undefined quando já é o último. */
export function depoisDeAoDescer(nomes: string[], nome: string): string | undefined {
  const i = nomes.indexOf(nome);
  if (i < 0 || i >= nomes.length - 1) return undefined;
  return nomes[i + 1];
}

/** A ordem depois de mover `nome` para logo depois de `depoisDe` (null = primeiro). */
export function reordenar(nomes: string[], nome: string, depoisDe: string | null): string[] {
  const sem = nomes.filter((n) => n !== nome);
  if (depoisDe === null) return [nome, ...sem];
  const j = sem.indexOf(depoisDe);
  if (j < 0) return [...sem, nome];
  return [...sem.slice(0, j + 1), nome, ...sem.slice(j + 1)];
}

/** Aplica o movimento numa lista de itens (bairros antes das cidades), renumerando a ordem. */
export function moverNaLista<T extends { tipo: TipoDoFoco; nome: string; ordem: number | null }>(
  itens: T[], tipo: TipoDoFoco, nome: string, depoisDe: string | null,
): T[] {
  const doMesmoTipo = doTipo(itens, tipo);
  const porNome = new Map(doMesmoTipo.map((i) => [i.nome, i]));
  const movidos = reordenar(doMesmoTipo.map((i) => i.nome), nome, depoisDe)
    .map((n, k) => ({ ...(porNome.get(n) as T), ordem: k + 1 }));
  const bairros = tipo === 'bairro' ? movidos : doTipo(itens, 'bairro');
  const cidades = tipo === 'cidade' ? movidos : doTipo(itens, 'cidade');
  return [...bairros, ...cidades];
}

// ---------------------------------------------------------------------------
// Exportar e copiar
// ---------------------------------------------------------------------------

export type ItemDoRegioesJson = string | { nome: string; so_se?: string[]; nao_se?: string[] };

/** Como docs/bruna/regioes.json escreve um item: o nome puro, ou o objeto só com as chaves que têm algo. */
export function paraORegioesJson(item: Pick<EstadoDoItem, 'nome' | 'so_se' | 'nao_se'>): ItemDoRegioesJson {
  const soSe = item.so_se ?? [];
  const naoSe = item.nao_se ?? [];
  if (!soSe.length && !naoSe.length) return item.nome;
  return { nome: item.nome, ...(soSe.length ? { so_se: soSe } : {}), ...(naoSe.length ? { nao_se: naoSe } : {}) };
}

/**
 * {"bairros_foco": [...], "cidades_foco": [...]} da praça, na ordem da lista,
 * com a mesma formatação do regioes.json (JSON.stringify com 2 espaços e
 * quebra de linha no fim).
 */
export function exportarParaORegioesJson(itens: Array<Pick<EstadoDoItem, 'tipo' | 'nome' | 'so_se' | 'nao_se'>>): string {
  const corpo = {
    bairros_foco: doTipo(itens, 'bairro').map(paraORegioesJson),
    cidades_foco: doTipo(itens, 'cidade').map(paraORegioesJson),
  };
  return `${JSON.stringify(corpo, null, 2)}\n`;
}

/** Os nomes da lista separados por "; " (bairros e depois cidades, sem repetir o mesmo nome). */
export function listaParaCopiar(itens: Array<Pick<EstadoDoItem, 'tipo' | 'nome'>>): string {
  const nomes: string[] = [];
  for (const i of [...doTipo(itens, 'bairro'), ...doTipo(itens, 'cidade')]) {
    if (!nomes.includes(i.nome)) nomes.push(i.nome);
  }
  return nomes.join('; ');
}

const DIA_EM_SAO_PAULO = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });

export function nomeDoArquivo(praca: string, agora: Date = new Date()): string {
  return `bairros-foco-${praca}-${DIA_EM_SAO_PAULO.format(agora)}.json`;
}

// ---------------------------------------------------------------------------
// Histórico
// ---------------------------------------------------------------------------

export const ACAO_NO_HISTORICO: Record<MudancaNoHistorico['acao'], string> = {
  criado: 'entrou',
  alterado: 'mudou',
  removido: 'saiu',
};

export interface CampoMudado {
  campo: string;
  antes: string;
  depois: string;
}

const SEM_VALOR = '—';
const lista = (v: string[] | null | undefined) => ((v ?? []).length ? (v ?? []).join(', ') : SEM_VALOR);

/** O que mudou entre antes e depois, campo a campo (a posição na lista fica de fora). */
export function camposMudados(antes: EstadoDoItem | null, depois: EstadoDoItem | null): CampoMudado[] {
  if (!antes || !depois) return [];
  const campos: Array<[string, string, string]> = [
    ['tipo', nomeDoTipo(antes.tipo), nomeDoTipo(depois.tipo)],
    ['nome', antes.nome, depois.nome],
    ['só vale se a cidade for', lista(antes.so_se), lista(depois.so_se)],
    ['não vale para', lista(antes.nao_se), lista(depois.nao_se)],
    ['observação', antes.observacao || SEM_VALOR, depois.observacao || SEM_VALOR],
  ];
  return campos.filter(([, a, d]) => a !== d).map(([campo, a, d]) => ({ campo, antes: a, depois: d }));
}

/** As regras de um item que entrou ou saiu, em texto claro. */
export function retratoDoItem(e: EstadoDoItem | null): string[] {
  if (!e) return [];
  const partes = descreverExcecoes(e);
  if (e.observacao) partes.push(`observação: ${e.observacao}`);
  return partes;
}

export function quemFez(h: Pick<MudancaNoHistorico, 'origem' | 'feito_por_email'>): string {
  if (h.feito_por_email) return h.feito_por_email;
  return h.origem === 'sistema' ? 'sincronização do repositório' : 'gerenciador';
}

export function podeDesfazer(h: Pick<MudancaNoHistorico, 'origem' | 'desfeito_em'>): boolean {
  return h.origem === 'gestor' && !h.desfeito_em;
}

export function nomeDaMudanca(h: MudancaNoHistorico): string {
  return h.nome ?? h.depois?.nome ?? h.antes?.nome ?? 'item';
}

/** O que o desfazer vai fazer, para a confirmação. */
export function oQueODesfazerFaz(h: MudancaNoHistorico, nomeDaPraca: string): string {
  const nome = nomeDaMudanca(h);
  if (h.acao === 'criado') return `${nome} sai da lista ${daPraca(nomeDaPraca)}.`;
  if (h.acao === 'removido') return `${nome} volta para a lista ${daPraca(nomeDaPraca)}, como era antes de sair.`;
  return `${nome} volta a ser como era antes desta mudança.`;
}

export function avisoDoDesfeito(acao: string, nome: string): string {
  if (acao === 'removido') return `${nome} saiu da lista.`;
  if (acao === 'recriado') return `${nome} voltou para a lista.`;
  return `${nome} voltou ao que era.`;
}

// ---------------------------------------------------------------------------
// Praças
// ---------------------------------------------------------------------------

const SIGLA: Record<string, string> = { sp: 'SP', rj: 'RJ', goiania: 'GYN' };

/** O nome que pede artigo: "o Rio de Janeiro" (e qualquer outro "Rio …"); São Paulo e Goiânia não pedem. */
const pedeArtigo = (nome: string) => /^rio\s/i.test(nome.trim());

/** "de São Paulo", "de Goiânia", "do Rio de Janeiro": a praça dentro da frase ("a lista do Rio de Janeiro"). */
export function daPraca(nome: string): string {
  return `${pedeArtigo(nome) ? 'do' : 'de'} ${nome}`;
}

/** "em São Paulo", "no Rio de Janeiro". */
export function naPraca(nome: string): string {
  return `${pedeArtigo(nome) ? 'no' : 'em'} ${nome}`;
}

export function siglaDaPraca(region: string): string {
  return SIGLA[region] ?? region.toUpperCase().slice(0, 3);
}

/** SP, RJ e Goiânia na ordem de sempre; outra praça que ganhar consultoria vem depois, por nome. */
export function ordenarPracas(pracas: Praca[]): Praca[] {
  const posicao = (r: string) => {
    const i = (PRACAS as readonly string[]).indexOf(r);
    return i < 0 ? PRACAS.length : i;
  };
  return [...pracas].sort((a, b) => posicao(a.region) - posicao(b.region) || a.nome.localeCompare(b.nome, 'pt-BR'));
}

/**
 * /leads da praça. Com um item da lista (ou um pedido fora do foco), o
 * recorte de Bairros foco: a lista traz os mesmos leads que o painel contou
 * (e só os agendados, quando pedido). Sem item, todos os leads da praça.
 */
export function rotaDosLeads(praca: string, recorte?: { tipo: TipoDoFoco | 'fora'; nome: string; dias: number }, filtro?: 'agendados'): string {
  if (!recorte) return rota(`/leads?${new URLSearchParams({ region: praca }).toString()}`);
  return rotaDoRecorte(praca, recorte, filtro);
}
