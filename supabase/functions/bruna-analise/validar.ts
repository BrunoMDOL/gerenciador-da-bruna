// Validação da saída do modelo e das ações sugeridas. Módulo puro (sem Deno,
// sem npm:, sem zod) para o vitest cobrir.
//
// Os formatos de ação espelham src/gerenciador/lib/acoes.ts (AcaoSugerida) e
// os limites que `aplicarSugestao` impõe lá. Onde o banco tem valor fechado
// (praça, categoria da base, tipo de revisão, chave de configuração, colunas
// integer e timestamptz), a conferência é contra o banco: o que passa aqui é o
// que o gerenciador consegue aplicar quando o gestor aprova. Ação que não
// passa não derruba a sugestão: vira { tipo: 'manual', instrucoes } com o porquê.
//
// O modelo escreve a ação como texto JSON (o campo acao do schema é string,
// prompt.ts): a validação de cada formato é toda daqui. As ações dos bairros
// foco também são conferidas contra a lista de hoje que veio no digest
// (bairros_fora_do_foco[].foco): nome exato para tirar ou alterar, sem repetir.

export type Gravidade = "grave" | "media" | "leve";
export type Prioridade = "alta" | "media" | "baixa";
export type TipoDeSugestao = "nucleo" | "instrucao" | "base" | "regua" | "template" | "config" | "lead" | "outro";

export const GRAVIDADES: Gravidade[] = ["grave", "media", "leve"];
export const PRIORIDADES: Prioridade[] = ["alta", "media", "baixa"];
export const TIPOS_DE_SUGESTAO: TipoDeSugestao[] = ["nucleo", "instrucao", "base", "regua", "template", "config", "lead", "outro"];
export const MAXIMO_DE_SUGESTOES = 12;
export const TITULO_DA_SUGESTAO_MAX = 160;

// Listas fechadas, conferidas no banco em 05/11/2026. Valor fora delas
// passaria como sugestão e só quebraria quando o gestor clicasse em Aplicar.

/** Praças e funis (bruna_regioes.region; bruna_conhecimento.region tem FK para lá). */
export const REGIOES: readonly string[] = ["sp", "rj", "goiania", "brasil", "brasil2", "arquitetos"];
/** Categorias da base de conhecimento (as 12 em uso em bruna_conhecimento.categoria). */
export const CATEGORIAS_DA_BASE: readonly string[] = [
  "produto", "tecnico", "atendimento", "empresa", "processo", "visita", "aplicacao", "fachada", "garantia", "pagamento", "manutencao", "escopo",
];
/** Tipos de revisão (os 13 em uso em bruna_revisoes.tipo). */
export const TIPOS_DE_REVISAO: readonly string[] = [
  "pergunta_sem_resposta", "insistiu", "pergunta_repetida", "bairro_errado", "info_errada", "retorno_sem_agenda", "encaminhou_sem_tool",
  "resposta_automatica", "agendamento_falso", "chamou_sem_tool", "ignorou_parada", "contradisse", "outro",
];
/**
 * O que config_atualizar pode mexer, por chave de bruna_gestor_config. A
 * régua fica de fora: pausar ou retomar é regua_pausar, que grava quem e
 * quando (pausado_em, pausado_por) e audita.
 */
export const CAMPOS_DA_CONFIG: Readonly<Record<string, readonly string[]>> = {
  analise: ["ativa", "modelo", "dia_semana", "hora"],
  copiloto: ["ativo", "modelo", "max_tokens"],
};
export const CHAVES_DE_CONFIG: readonly string[] = Object.keys(CAMPOS_DA_CONFIG);
/** Só as praças com consultoria têm bairros foco (bruna_regioes.oferece_consultoria). */
export const PRACAS_COM_CONSULTORIA: readonly string[] = ["sp", "rj", "goiania"];
/** bruna_bairros_foco.tipo: um bairro, ou a cidade inteira. */
export const TIPOS_DO_ITEM_DO_FOCO: readonly string[] = ["bairro", "cidade"];

export type TipoDoItemDoFoco = "bairro" | "cidade";

export type AcaoSugerida =
  | { tipo: "instrucao_criar"; escopo: "global" | "region" | "contato"; region?: string | null; contato_id?: number | null;
      titulo: string; texto: string; aplica_em?: Array<"conversa" | "toque" | "retorno">; prioridade?: number; vigencia_fim?: string | null }
  | { tipo: "instrucao_desativar"; id: number; motivo?: string }
  | { tipo: "base_criar"; chave?: string; titulo: string; conteudo: string; categoria: string; region?: string | null;
      palavras_chave?: string[]; prioridade?: number; fonte?: string | null; confianca?: "alta" | "media" | null }
  | { tipo: "base_atualizar"; id: number; campos: Record<string, unknown> }
  | { tipo: "revisao_criar"; contato_id: number; tipo_revisao: string; gravidade: Gravidade; erro: string; na_proxima: string; horas?: number }
  | { tipo: "regua_pausar"; escada: boolean; retornos: boolean; motivo?: string | null }
  | { tipo: "fup90_etapa_atualizar"; id: number; campos: Record<string, unknown> }
  | { tipo: "fup90_campanha_atualizar"; id: number; campos: Record<string, unknown> }
  | { tipo: "nucleo_trecho"; trecho_atual: string; trecho_novo: string; nota: string }
  | { tipo: "config_atualizar"; chave: string; valor: Record<string, unknown> }
  | { tipo: "lead_bruna"; contato_id: number; ligada: boolean }
  | { tipo: "bairro_foco_salvar"; region: string; tipo_item: TipoDoItemDoFoco; nome: string; so_se?: string[]; nao_se?: string[];
      observacao?: string | null; nome_original?: string; tipo_original?: TipoDoItemDoFoco; motivo?: string }
  | { tipo: "bairro_foco_remover"; region: string; tipo_item: TipoDoItemDoFoco; nome: string; motivo?: string }
  | { tipo: "manual"; instrucoes: string };

export type TipoDeAcao = AcaoSugerida["tipo"];

export const TIPOS_DE_ACAO: TipoDeAcao[] = [
  "instrucao_criar", "instrucao_desativar", "base_criar", "base_atualizar", "revisao_criar", "regua_pausar",
  "fup90_etapa_atualizar", "fup90_campanha_atualizar", "nucleo_trecho", "config_atualizar", "lead_bruna",
  "bairro_foco_salvar", "bairro_foco_remover", "manual",
];

/** Campos que base_atualizar pode mexer (os mesmos de acoes.ts). */
export const CAMPOS_DA_BASE = ["titulo", "conteudo", "categoria", "region", "palavras_chave", "prioridade", "ativo", "fonte", "confianca"];
/** Campos que fup90_etapa_atualizar pode mexer. */
export const CAMPOS_DA_ETAPA = ["offset_dias", "temperatura", "objetivo", "template_name", "template_lang", "variaveis", "condicional", "min_leituras", "ativo", "template_body"];
/** Campos que fup90_campanha_atualizar pode mexer. */
export const CAMPOS_DA_CAMPANHA = ["nome", "ativa", "regioes", "tags_bloqueantes", "tags_pausantes", "hora_inicio", "hora_fim", "hora_overflow", "jitter_min",
  "jitter_janela_min", "envia_fim_semana", "janela_min_horas", "janela_max_dias", "intervalo_min_horas", "limite_inscricao_dia", "limite_envio_dia", "teto_toques_total"];

/** Tipo da sugestão que cada ação sugere, quando o modelo manda um tipo inválido. */
const TIPO_PELA_ACAO: Record<TipoDeAcao, TipoDeSugestao> = {
  instrucao_criar: "instrucao", instrucao_desativar: "instrucao", base_criar: "base", base_atualizar: "base",
  revisao_criar: "lead", regua_pausar: "regua", fup90_etapa_atualizar: "regua", fup90_campanha_atualizar: "regua",
  nucleo_trecho: "nucleo", config_atualizar: "config", lead_bruna: "lead",
  // bruna_sugestoes.tipo não tem um tipo para os bairros foco: vão como config (o cartão mostra "Bairros foco").
  bairro_foco_salvar: "config", bairro_foco_remover: "config", manual: "outro",
};

export class SaidaInvalida extends Error {
  constructor(message: string) { super(message); this.name = "SaidaInvalida"; }
}

export class AcaoInvalida extends Error {
  constructor(message: string) { super(message); this.name = "AcaoInvalida"; }
}

export interface EvidenciaDoAchado { contato_id: number; trecho: string }
export interface Achado { titulo: string; gravidade: Gravidade; descricao: string; evidencias: EvidenciaDoAchado[] }
export interface EvidenciaDaSugestao { contato_id?: number; trecho?: string; nota?: string }
export interface SugestaoValidada {
  tipo: TipoDeSugestao;
  titulo: string;
  descricao: string;
  impacto: string | null;
  prioridade: Prioridade;
  evidencias: EvidenciaDaSugestao[];
  acao: AcaoSugerida | null;
}
export interface SaidaValidada { resumo: string; achados: Achado[]; sugestoes: SugestaoValidada[] }

// ---------------------------------------------------------------------------
// Ajudantes
// ---------------------------------------------------------------------------

const ehObjeto = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);

const textoOpcional = (v: unknown, max = 5000): string | undefined => {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s ? s.slice(0, max) : undefined;
};

const texto = (v: unknown, nome: string, max = 5000): string => {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) throw new AcaoInvalida(`a ação não trouxe "${nome}"`);
  if (s.length > max) throw new AcaoInvalida(`"${nome}" passa de ${max} caracteres`);
  return s;
};

const numero = (v: unknown, nome: string): number => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  if (!Number.isFinite(n)) throw new AcaoInvalida(`a ação não trouxe "${nome}"`);
  return n;
};

const inteiroPositivo = (v: unknown, nome: string): number => {
  const n = numero(v, nome);
  if (!Number.isInteger(n) || n <= 0) throw new AcaoInvalida(`"${nome}" precisa ser um inteiro positivo`);
  return n;
};

const numeroOpcional = (v: unknown): number | undefined => {
  if (v === null || v === undefined) return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const booleano = (v: unknown, nome: string): boolean => {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "false") return v === "true";
  throw new AcaoInvalida(`"${nome}" precisa ser verdadeiro ou falso`);
};

const listaDeTextos = (v: unknown): string[] | undefined =>
  Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : undefined;

/** Só as chaves permitidas, sem null/undefined; lança quando não sobra nada. */
const camposPermitidos = (v: unknown, permitidos: string[], nome: string): Record<string, unknown> => {
  if (!ehObjeto(v)) throw new AcaoInvalida(`a ação não trouxe "${nome}"`);
  const campos = Object.fromEntries(Object.entries(v).filter(([k, val]) => permitidos.includes(k) && val !== null && val !== undefined));
  if (!Object.keys(campos).length) throw new AcaoInvalida(`nenhum campo válido em "${nome}" (aceitos: ${permitidos.join(", ")})`);
  return campos;
};

/** Para colunas integer (prioridade, p_horas): 2.7 vira 2; um número quebrado o banco recusaria. */
const inteiroOpcional = (v: unknown): number | undefined => {
  const n = numeroOpcional(v);
  return n === undefined ? undefined : Math.trunc(n);
};

/** Minúsculas e sem acento: "Técnico" → "tecnico", "SP" → "sp". */
const normalizar = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/** Praça da lista ou null quando não veio; praça fora da lista lança. */
const regiaoOpcional = (v: unknown): string | null => {
  const s = textoOpcional(v, 40);
  if (!s) return null;
  const r = normalizar(s);
  if (!REGIOES.includes(r)) throw new AcaoInvalida(`praça "${s}" não existe (aceitas: ${REGIOES.join(", ")})`);
  return r;
};

const categoriaDaBase = (v: unknown): string => {
  const s = texto(v, "categoria", 40);
  const c = normalizar(s);
  if (!CATEGORIAS_DA_BASE.includes(c)) throw new AcaoInvalida(`categoria "${s}" não existe na base (aceitas: ${CATEGORIAS_DA_BASE.join(", ")})`);
  return c;
};

/** Data que o banco aceita em timestamptz, em ISO; ausente devolve undefined, inválida lança. */
const dataOpcional = (v: unknown, nome: string): string | undefined => {
  const s = textoOpcional(v, 60);
  if (!s) return undefined;
  const ms = Date.parse(s);
  if (Number.isNaN(ms)) throw new AcaoInvalida(`"${nome}" não é uma data (${s})`);
  return new Date(ms).toISOString();
};

const inteiroEntre = (v: unknown, nome: string, min: number, max: number): number => {
  const n = numero(v, nome);
  if (!Number.isInteger(n) || n < min || n > max) throw new AcaoInvalida(`"${nome}" precisa ser um inteiro de ${min} a ${max}`);
  return n;
};

/** Os campos de base_atualizar, com as mesmas conferências de base_criar. */
const camposDaBase = (v: unknown): Record<string, unknown> => {
  const campos = camposPermitidos(v, CAMPOS_DA_BASE, "campos");
  if ("titulo" in campos) campos.titulo = texto(campos.titulo, "titulo", 200);
  if ("conteudo" in campos) campos.conteudo = texto(campos.conteudo, "conteudo", 6000);
  if ("categoria" in campos) campos.categoria = categoriaDaBase(campos.categoria);
  if ("region" in campos) campos.region = regiaoOpcional(campos.region);
  if ("prioridade" in campos) {
    const p = inteiroOpcional(campos.prioridade);
    if (p === undefined) throw new AcaoInvalida('"prioridade" precisa ser um número');
    campos.prioridade = p;
  }
  if ("ativo" in campos) campos.ativo = booleano(campos.ativo, "ativo");
  if ("palavras_chave" in campos) {
    const palavras = listaDeTextos(campos.palavras_chave);
    if (!palavras) throw new AcaoInvalida('"palavras_chave" precisa ser uma lista');
    campos.palavras_chave = palavras;
  }
  if ("confianca" in campos && campos.confianca !== "alta" && campos.confianca !== "media") {
    throw new AcaoInvalida('"confianca" precisa ser alta ou media');
  }
  return campos;
};

/** Um campo de config_atualizar, com o tipo e a faixa que a tela de configurações usa. */
const valorDaConfig = (campo: string, v: unknown): unknown => {
  switch (campo) {
    case "ativa":
    case "ativo":
      return booleano(v, campo);
    case "modelo": {
      const m = texto(v, "modelo", 100);
      if (!/^claude-[a-z0-9.-]+$/i.test(m)) throw new AcaoInvalida(`modelo "${m}" não parece um id de modelo (claude-...)`);
      return m;
    }
    case "dia_semana":
      return inteiroEntre(v, "dia_semana", 0, 6);
    case "hora":
      return inteiroEntre(v, "hora", 0, 23);
    case "max_tokens":
      return inteiroEntre(v, "max_tokens", 1, 128000);
    default:
      throw new AcaoInvalida(`campo "${campo}" não é aceito`);
  }
};

// ---------------------------------------------------------------------------
// Bairros foco
// ---------------------------------------------------------------------------

const COM_ACENTO = "áàâãäéèêëíìîïóòôõöúùûüçñ";
const SEM_ACENTO = "aaaaaeeeeiiiiooooouuuucn";

/** O mesmo que public.bruna_normaliza_texto: minúsculas, o translate de acentos do banco e tudo que não é letra ou número vira espaço. */
export function normalizarComoOBanco(texto: unknown): string {
  let s = "";
  for (const ch of String(texto ?? "").toLowerCase()) {
    const i = COM_ACENTO.indexOf(ch);
    s += i >= 0 ? SEM_ACENTO[i] : ch;
  }
  return s.replace(/[^a-z0-9]+/g, " ").trim();
}

const pracaComConsultoria = (v: unknown): string => {
  const s = textoOpcional(v, 40) ?? "";
  const r = normalizar(s);
  if (!PRACAS_COM_CONSULTORIA.includes(r)) throw new AcaoInvalida(`a praça "${s}" não tem bairros foco (só ${PRACAS_COM_CONSULTORIA.join(", ")})`);
  return r;
};

const tipoDoItem = (v: unknown, nome: string): TipoDoItemDoFoco => {
  const s = typeof v === "string" ? normalizar(v) : "";
  if (s === "bairro" || s === "cidade") return s;
  throw new AcaoInvalida(`"${nome}" precisa ser bairro ou cidade`);
};

/** O nome como bruna_bairros_foco_validar aceita: espaços colapsados, de 2 a 80 caracteres, com letra ou número. */
const nomeDoItem = (v: unknown, nome: string): string => {
  const s = typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
  if (!s) throw new AcaoInvalida(`a ação não trouxe "${nome}"`);
  if (s.length < 2 || s.length > 80) throw new AcaoInvalida(`"${nome}" precisa ter de 2 a 80 caracteres`);
  if (!normalizarComoOBanco(s)) throw new AcaoInvalida(`"${nome}" precisa ter letras ou números`);
  return s;
};

/**
 * so_se e nao_se, como bruna_bairros_foco_termos aceita: limpos, sem repetir,
 * até 20 termos de até 60 caracteres. Lista vazia não vai: na alteração, o
 * gerenciador mantém o que está gravado, e a análise nunca apaga uma regra
 * (apagar é ação manual).
 */
const termosDoFoco = (v: unknown, nome: string): string[] | undefined => {
  if (v === null || v === undefined) return undefined;
  if (!Array.isArray(v)) throw new AcaoInvalida(`"${nome}" precisa ser uma lista`);
  const vistos = new Set<string>();
  const saida: string[] = [];
  for (const x of v) {
    const t = String(x ?? "").replace(/\s+/g, " ").trim();
    const chave = normalizarComoOBanco(t);
    if (!chave || vistos.has(chave)) continue;
    if (t.length > 60) throw new AcaoInvalida(`o termo "${t.slice(0, 40)}" de "${nome}" passa de 60 caracteres`);
    vistos.add(chave);
    saida.push(t);
  }
  if (saida.length > 20) throw new AcaoInvalida(`"${nome}" aceita no máximo 20 termos`);
  return saida.length ? saida : undefined;
};

export interface ItemDaLista {
  tipo: string;
  nome: string;
}

/** A lista de hoje de cada praça, como veio no digest (bairros_fora_do_foco[].foco). */
export function listasDoFoco(digest: unknown): Record<string, ItemDaLista[]> {
  const secao = ehObjeto(digest) && Array.isArray(digest.bairros_fora_do_foco) ? digest.bairros_fora_do_foco : [];
  const listas: Record<string, ItemDaLista[]> = {};
  for (const p of secao) {
    if (!ehObjeto(p) || typeof p.region !== "string" || !ehObjeto(p.foco)) continue;
    const nomes = (v: unknown) => (Array.isArray(v) ? v.filter((n): n is string => typeof n === "string") : []);
    listas[p.region] = [
      ...nomes(p.foco.bairros).map((nome) => ({ tipo: "bairro", nome })),
      ...nomes(p.foco.cidades).map((nome) => ({ tipo: "cidade", nome })),
    ];
  }
  return listas;
}

/**
 * Confere uma ação de bairros foco contra a lista de hoje da praça (a regra
 * de bruna_bairros_foco_validar e do remover): o item a alterar ou tirar tem
 * de estar lá com o nome exato; o nome novo não repete outro do mesmo tipo
 * (sem acento e sem caixa); e o último item não sai. Devolve o problema, ou
 * null quando está certo.
 */
export function problemaNaListaDoFoco(acao: AcaoSugerida, lista: ItemDaLista[]): string | null {
  if (acao.tipo !== "bairro_foco_salvar" && acao.tipo !== "bairro_foco_remover") return null;
  const existe = (tipo: string, nome: string) => lista.some((i) => i.tipo === tipo && i.nome === nome);
  const parecido = (tipo: string, nome: string) => {
    const alvo = normalizarComoOBanco(nome);
    const achado = lista.find((i) => i.tipo === tipo && normalizarComoOBanco(i.nome) === alvo);
    return achado ? ` (na lista está "${achado.nome}")` : "";
  };
  if (acao.tipo === "bairro_foco_remover") {
    if (!existe(acao.tipo_item, acao.nome)) return `"${acao.nome}" (${acao.tipo_item}) não está nos bairros foco de ${acao.region}${parecido(acao.tipo_item, acao.nome)}`;
    if (lista.length <= 1) return `"${acao.nome}" é o último item de ${acao.region}: sem nenhum, a praça deixa de ter consultoria`;
    return null;
  }
  const original = acao.nome_original ?? null;
  const tipoOriginal = acao.tipo_original ?? acao.tipo_item;
  if (original && !existe(tipoOriginal, original)) {
    return `"${original}" (${tipoOriginal}) não está nos bairros foco de ${acao.region}${parecido(tipoOriginal, original)}`;
  }
  const alvo = normalizarComoOBanco(acao.nome);
  const repetido = lista.find((i) => i.tipo === acao.tipo_item && normalizarComoOBanco(i.nome) === alvo && !(original && i.tipo === tipoOriginal && i.nome === original));
  if (repetido) return `já existe "${repetido.nome}" (${acao.tipo_item}) nos bairros foco de ${acao.region}`;
  return null;
}

/** O que a validação da saída sabe além dela: a lista de hoje de cada praça (do digest). */
export interface ContextoDaValidacao {
  listasDoFoco?: Record<string, ItemDaLista[]>;
}

// ---------------------------------------------------------------------------
// Ações
// ---------------------------------------------------------------------------

/** Valida e limpa uma ação; lança AcaoInvalida com o motivo. */
export function validarAcaoEstrita(entrada: unknown): AcaoSugerida {
  if (!ehObjeto(entrada)) throw new AcaoInvalida("a ação não é um objeto");
  const a = entrada;
  const tipo = typeof a.tipo === "string" ? a.tipo : "";
  switch (tipo) {
    case "instrucao_criar": {
      const escopo = a.escopo;
      if (escopo !== "global" && escopo !== "region" && escopo !== "contato") throw new AcaoInvalida("escopo da orientação inválido (global, region ou contato)");
      // A praça só conta (e só é conferida) no escopo region.
      const region = escopo === "region" ? regiaoOpcional(a.region) : null;
      const contatoId = escopo === "contato" ? inteiroPositivo(a.contato_id, "contato_id") : null;
      if (escopo === "region" && !region) throw new AcaoInvalida("orientação por praça sem a praça");
      const aplicaEm = Array.isArray(a.aplica_em)
        ? (a.aplica_em.filter((x) => x === "conversa" || x === "toque" || x === "retorno") as Array<"conversa" | "toque" | "retorno">)
        : [];
      const prioridade = inteiroOpcional(a.prioridade);
      const vigenciaFim = dataOpcional(a.vigencia_fim, "vigencia_fim");
      return {
        tipo: "instrucao_criar",
        escopo,
        region,
        contato_id: contatoId,
        titulo: texto(a.titulo, "titulo", 120),
        texto: texto(a.texto, "texto", 1500),
        ...(aplicaEm.length ? { aplica_em: aplicaEm } : {}),
        ...(prioridade !== undefined ? { prioridade } : {}),
        ...(vigenciaFim ? { vigencia_fim: vigenciaFim } : {}),
      };
    }
    case "instrucao_desativar": {
      const motivo = textoOpcional(a.motivo, 500);
      return { tipo: "instrucao_desativar", id: inteiroPositivo(a.id, "id"), ...(motivo ? { motivo } : {}) };
    }
    case "base_criar": {
      const confianca = a.confianca === "alta" || a.confianca === "media" ? a.confianca : null;
      const chave = textoOpcional(a.chave, 60);
      const region = regiaoOpcional(a.region);
      const palavras = listaDeTextos(a.palavras_chave);
      const prioridade = inteiroOpcional(a.prioridade);
      const fonte = textoOpcional(a.fonte, 200) ?? null;
      return {
        tipo: "base_criar",
        ...(chave ? { chave } : {}),
        titulo: texto(a.titulo, "titulo", 200),
        conteudo: texto(a.conteudo, "conteudo", 6000),
        categoria: categoriaDaBase(a.categoria),
        region,
        ...(palavras && palavras.length ? { palavras_chave: palavras } : {}),
        ...(prioridade !== undefined ? { prioridade } : {}),
        fonte,
        confianca,
      };
    }
    case "base_atualizar":
      return { tipo: "base_atualizar", id: inteiroPositivo(a.id, "id"), campos: camposDaBase(a.campos) };
    case "revisao_criar": {
      const gravidade = GRAVIDADES.includes(a.gravidade as Gravidade) ? (a.gravidade as Gravidade) : "media";
      // O banco não restringe o tipo, mas as métricas contam por tipo: fora da lista vira "outro".
      const tipoBruto = textoOpcional(a.tipo_revisao, 60);
      const tipoRevisao = tipoBruto && TIPOS_DE_REVISAO.includes(normalizar(tipoBruto)) ? normalizar(tipoBruto) : "outro";
      // p_horas é integer; menos de 1 h não faz sentido e cai no padrão de 72 h.
      const horas = inteiroOpcional(a.horas);
      return {
        tipo: "revisao_criar",
        contato_id: inteiroPositivo(a.contato_id, "contato_id"),
        tipo_revisao: tipoRevisao,
        gravidade,
        erro: texto(a.erro, "erro", 400),
        na_proxima: texto(a.na_proxima, "na_proxima", 400),
        ...(horas !== undefined && horas >= 1 ? { horas } : {}),
      };
    }
    case "regua_pausar":
      return {
        tipo: "regua_pausar",
        escada: booleano(a.escada, "escada"),
        retornos: booleano(a.retornos, "retornos"),
        motivo: textoOpcional(a.motivo, 500) ?? null,
      };
    case "fup90_etapa_atualizar":
      return { tipo: "fup90_etapa_atualizar", id: inteiroPositivo(a.id, "id"), campos: camposPermitidos(a.campos, CAMPOS_DA_ETAPA, "campos") };
    case "fup90_campanha_atualizar":
      return { tipo: "fup90_campanha_atualizar", id: inteiroPositivo(a.id, "id"), campos: camposPermitidos(a.campos, CAMPOS_DA_CAMPANHA, "campos") };
    case "nucleo_trecho":
      return {
        tipo: "nucleo_trecho",
        trecho_atual: texto(a.trecho_atual, "trecho_atual", 20000),
        trecho_novo: typeof a.trecho_novo === "string" ? a.trecho_novo : "",
        nota: texto(a.nota, "nota", 500),
      };
    case "config_atualizar": {
      const chave = texto(a.chave, "chave", 40);
      if (chave === "regua") throw new AcaoInvalida("a régua não muda por config_atualizar: para pausar ou retomar, use regua_pausar");
      if (!CHAVES_DE_CONFIG.includes(chave)) throw new AcaoInvalida(`chave de configuração "${chave}" não aceita (aceitas: ${CHAVES_DE_CONFIG.join(", ")})`);
      const permitidos = CAMPOS_DA_CONFIG[chave];
      const valor: Record<string, unknown> = {};
      if (ehObjeto(a.valor)) {
        for (const [campo, v] of Object.entries(a.valor)) {
          if (v === null || v === undefined || !permitidos.includes(campo)) continue;
          valor[campo] = valorDaConfig(campo, v);
        }
      }
      if (!Object.keys(valor).length) throw new AcaoInvalida("a configuração não trouxe o valor");
      return { tipo: "config_atualizar", chave, valor };
    }
    case "lead_bruna":
      return { tipo: "lead_bruna", contato_id: inteiroPositivo(a.contato_id, "contato_id"), ligada: booleano(a.ligada, "ligada") };
    case "bairro_foco_salvar": {
      const tipoItem = tipoDoItem(a.tipo_item, "tipo_item");
      const soSe = termosDoFoco(a.so_se, "so_se");
      const naoSe = termosDoFoco(a.nao_se, "nao_se");
      const nomeOriginal = textoOpcional(a.nome_original, 80);
      // observacao, o mesmo contrato de lib/acoes.ts e do copiloto: ausente
      // mantém a nota de hoje; null ou vazia apaga a nota. Só na alteração: no
      // item novo, nota vazia é o mesmo que nenhuma.
      const observacao = a.observacao === undefined ? undefined : (textoOpcional(a.observacao, 300) ?? null);
      // tipo_original só conta na alteração, e só quando muda.
      const tipoOriginal = nomeOriginal && a.tipo_original !== null && a.tipo_original !== undefined ? tipoDoItem(a.tipo_original, "tipo_original") : undefined;
      const motivo = textoOpcional(a.motivo, 300);
      return {
        tipo: "bairro_foco_salvar",
        region: pracaComConsultoria(a.region),
        tipo_item: tipoItem,
        nome: nomeDoItem(a.nome, "nome"),
        ...(soSe ? { so_se: soSe } : {}),
        ...(naoSe ? { nao_se: naoSe } : {}),
        ...(observacao !== undefined && (observacao !== null || nomeOriginal) ? { observacao } : {}),
        ...(nomeOriginal ? { nome_original: nomeOriginal } : {}),
        ...(tipoOriginal && tipoOriginal !== tipoItem ? { tipo_original: tipoOriginal } : {}),
        ...(motivo ? { motivo } : {}),
      };
    }
    case "bairro_foco_remover": {
      const motivo = textoOpcional(a.motivo, 300);
      return {
        tipo: "bairro_foco_remover",
        region: pracaComConsultoria(a.region),
        tipo_item: tipoDoItem(a.tipo_item, "tipo_item"),
        // O nome exato da lista: só sem os espaços das pontas.
        nome: texto(a.nome, "nome", 80),
        ...(motivo ? { motivo } : {}),
      };
    }
    case "manual":
      return { tipo: "manual", instrucoes: texto(a.instrucoes, "instrucoes", 5000) };
    default:
      throw new AcaoInvalida(tipo ? `tipo de ação desconhecido: "${tipo}"` : "a ação não trouxe o tipo");
  }
}

/**
 * Valida sem derrubar: ação inválida vira manual com a descrição da sugestão
 * e o motivo; null/undefined e texto vazio ficam null (sugestão sem ação
 * automática). O modelo manda a ação como texto JSON (o schema da saída tem
 * acao como string); objeto também é aceito.
 */
export function validarAcao(entrada: unknown, descricao: string, contexto?: ContextoDaValidacao): AcaoSugerida | null {
  const manual = (motivo: string): AcaoSugerida => {
    const base = descricao.trim() || "Siga a descrição da sugestão.";
    return { tipo: "manual", instrucoes: `${base}\n\nA ação automática proposta não passou na validação (${motivo}); aplique à mão.` };
  };
  let bruta: unknown = entrada;
  if (typeof bruta === "string") {
    const t = bruta.trim();
    if (!t || t === "null") return null;
    try {
      bruta = JSON.parse(t);
    } catch {
      return manual("o texto da ação não é um JSON válido");
    }
  }
  if (bruta === null || bruta === undefined) return null;
  try {
    const acao = validarAcaoEstrita(bruta);
    const lista = acao.tipo === "bairro_foco_salvar" || acao.tipo === "bairro_foco_remover" ? contexto?.listasDoFoco?.[acao.region] : undefined;
    const problema = lista ? problemaNaListaDoFoco(acao, lista) : null;
    if (problema) throw new AcaoInvalida(problema);
    return acao;
  } catch (e) {
    return manual(e instanceof Error ? e.message : String(e));
  }
}

// ---------------------------------------------------------------------------
// Saída inteira
// ---------------------------------------------------------------------------

const evidenciasDoAchado = (v: unknown): EvidenciaDoAchado[] => {
  if (!Array.isArray(v)) return [];
  const saida: EvidenciaDoAchado[] = [];
  for (const item of v) {
    if (!ehObjeto(item)) continue;
    const contatoId = numeroOpcional(item.contato_id);
    const trecho = textoOpcional(item.trecho, 1000);
    if (contatoId === undefined || !Number.isInteger(contatoId) || contatoId <= 0 || !trecho) continue;
    saida.push({ contato_id: contatoId, trecho });
  }
  return saida;
};

const evidenciasDaSugestao = (v: unknown): EvidenciaDaSugestao[] => {
  if (!Array.isArray(v)) return [];
  const saida: EvidenciaDaSugestao[] = [];
  for (const item of v) {
    if (!ehObjeto(item)) continue;
    const contatoId = numeroOpcional(item.contato_id);
    const trecho = textoOpcional(item.trecho, 1000);
    const nota = textoOpcional(item.nota, 1000);
    const ev: EvidenciaDaSugestao = {};
    if (contatoId !== undefined && Number.isInteger(contatoId) && contatoId > 0) ev.contato_id = contatoId;
    if (trecho) ev.trecho = trecho;
    if (nota) ev.nota = nota;
    if (Object.keys(ev).length) saida.push(ev);
  }
  return saida;
};

export function validarAchado(entrada: unknown, posicao: number): Achado {
  if (!ehObjeto(entrada)) throw new SaidaInvalida(`achado ${posicao + 1} não é um objeto`);
  const titulo = textoOpcional(entrada.titulo, 200);
  const descricao = textoOpcional(entrada.descricao, 4000);
  if (!titulo) throw new SaidaInvalida(`achado ${posicao + 1} sem título`);
  if (!descricao) throw new SaidaInvalida(`achado ${posicao + 1} ("${titulo}") sem descrição`);
  const gravidade = GRAVIDADES.includes(entrada.gravidade as Gravidade) ? (entrada.gravidade as Gravidade) : "media";
  return { titulo, gravidade, descricao, evidencias: evidenciasDoAchado(entrada.evidencias) };
}

export function validarSugestao(entrada: unknown, posicao: number, contexto?: ContextoDaValidacao): SugestaoValidada {
  if (!ehObjeto(entrada)) throw new SaidaInvalida(`sugestão ${posicao + 1} não é um objeto`);
  const tituloBruto = textoOpcional(entrada.titulo, 1000);
  const descricao = textoOpcional(entrada.descricao, 6000);
  if (!tituloBruto) throw new SaidaInvalida(`sugestão ${posicao + 1} sem título`);
  if (!descricao) throw new SaidaInvalida(`sugestão ${posicao + 1} ("${tituloBruto}") sem descrição`);
  const titulo = tituloBruto.length > TITULO_DA_SUGESTAO_MAX ? tituloBruto.slice(0, TITULO_DA_SUGESTAO_MAX - 1).trimEnd() + "…" : tituloBruto;
  const acao = validarAcao(entrada.acao, descricao, contexto);
  let tipo = TIPOS_DE_SUGESTAO.includes(entrada.tipo as TipoDeSugestao) ? (entrada.tipo as TipoDeSugestao) : null;
  if (!tipo) tipo = acao ? TIPO_PELA_ACAO[acao.tipo] : "outro";
  const prioridade = PRIORIDADES.includes(entrada.prioridade as Prioridade) ? (entrada.prioridade as Prioridade) : "media";
  return {
    tipo,
    titulo,
    descricao,
    impacto: textoOpcional(entrada.impacto, 2000) ?? null,
    prioridade,
    evidencias: evidenciasDaSugestao(entrada.evidencias),
    acao,
  };
}

/**
 * Lê o JSON que o modelo devolveu; lança SaidaInvalida com o que está errado.
 * O contexto (as listas de bairros foco do digest) só serve para conferir as
 * ações dos bairros foco; sem ele, elas passam só pela forma.
 */
export function validarSaidaDoModelo(entrada: unknown, contexto?: ContextoDaValidacao): SaidaValidada {
  if (!ehObjeto(entrada)) throw new SaidaInvalida("a resposta do modelo não é um objeto JSON");
  const resumo = textoOpcional(entrada.resumo, 20000);
  if (!resumo) throw new SaidaInvalida("a resposta do modelo veio sem resumo");
  if (!Array.isArray(entrada.achados)) throw new SaidaInvalida("a resposta do modelo veio sem a lista de achados");
  if (!Array.isArray(entrada.sugestoes)) throw new SaidaInvalida("a resposta do modelo veio sem a lista de sugestões");
  const achados = entrada.achados.map(validarAchado);
  const sugestoes = entrada.sugestoes.slice(0, MAXIMO_DE_SUGESTOES).map((s, i) => validarSugestao(s, i, contexto));
  return { resumo, achados, sugestoes };
}
