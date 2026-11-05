// As regras da campanha FUP90 que o formulário precisa saber. Vêm das
// constraints de fup_campanhas / fup_campanha_etapas e das funções fup_* lidas
// do banco em 05/11/2026 (fup_inscrever_elegiveis, fup_reservar_lote,
// fup_confirmar_envio, fup_proximo_horario, fup_proxima_etapa).
import { z } from 'zod';
import type { CampanhaFup90, EtapaFup90 } from '@/gerenciador/lib/tipos';

/** check (followup_num between 1 and 12) em fup_campanha_etapas. */
export const MAX_ETAPAS = 12;
/** A linha do tempo da campanha vai até aqui; etapas além ficam marcadas como fora da linha. */
export const DIAS_DA_LINHA = 90;

export const TEMPERATURAS = ['quente', 'morno', 'frio'] as const;
export type Temperatura = (typeof TEMPERATURAS)[number];

/** Campos de fup_campanhas que o gestor edita (a RLS deixa o update; id, slug e versao ficam). */
export const CAMPOS_DA_CAMPANHA = [
  'nome', 'ativa', 'regioes', 'hora_inicio', 'hora_fim', 'hora_overflow', 'jitter_min', 'jitter_janela_min', 'envia_fim_semana',
  'janela_min_horas', 'janela_max_dias', 'intervalo_min_horas', 'limite_inscricao_dia', 'limite_envio_dia', 'teto_toques_total',
  'tags_bloqueantes', 'tags_pausantes',
] as const;

/** Campos de fup_campanha_etapas que o gestor edita. */
export const CAMPOS_DA_ETAPA = [
  'offset_dias', 'temperatura', 'objetivo', 'template_name', 'template_lang', 'template_body', 'variaveis', 'condicional', 'min_leituras', 'ativo',
] as const;

/** O que cada campo faz, segundo as funções do banco. Texto curto, para a ajuda do formulário. */
export const AJUDA_DA_CAMPANHA: Record<string, string> = {
  nome: 'Só para quem lê o gerenciador; o motor usa o id.',
  regioes: 'Praças cujos leads entram na campanha (fup_inscrever_elegiveis).',
  hora_inicio: 'Começo da janela de envio, em Brasília. Envio que cairia antes vai para a hora de transbordo do mesmo dia.',
  hora_fim: 'Fim da janela de envio. Envio que cairia depois vai para a hora de transbordo do dia seguinte.',
  hora_overflow: 'Hora de transbordo: para onde vai o envio que caiu fora da janela, mais um atraso aleatório de até "atraso fora da janela". Os dois juntos têm de caber na janela.',
  jitter_min: 'Atraso aleatório, em minutos, somado ao envio que caiu fora da janela.',
  jitter_janela_min: 'Atraso aleatório, em minutos, somado ao envio que já cai dentro da janela.',
  envia_fim_semana: 'Guardado na campanha; nenhuma função do banco lê este campo hoje.',
  janela_min_horas: 'O lead só entra depois de ficar este tanto de horas sem escrever.',
  janela_max_dias: 'Lead cuja última mensagem é mais antiga que isto não entra.',
  intervalo_min_horas: 'Intervalo mínimo entre um toque e o seguinte, mesmo que a diferença de dias entre as etapas seja menor.',
  limite_inscricao_dia: 'Quantos leads entram na campanha por rodada de inscrição.',
  limite_envio_dia: 'Quantos envios a campanha faz por dia.',
  teto_toques_total: 'Máximo de toques por lead somando a escada antiga (fup_toques_legado) e os envios desta campanha.',
  tags_bloqueantes: 'Lead com uma destas tags não entra na campanha e não recebe envio.',
  tags_pausantes: 'Lead com uma destas tags fica pausado: a inscrição espera, e a escada de 24 h também não cobra.',
};

export const AJUDA_DA_ETAPA: Record<string, string> = {
  offset_dias: 'Dia da etapa contado da entrada na campanha. O motor agenda o toque seguinte pela diferença de dias entre a etapa enviada e a próxima ativa (mínimo 1 dia).',
  temperatura: 'Só descreve a fase do lead; o motor não a lê.',
  objetivo: 'O que a mensagem desta etapa tenta conseguir.',
  template_name: 'Só template aprovado na Meta sai. O texto dele fica guardado na etapa (template_body), e é esse texto que a conversa do lead mostra.',
  template_lang: 'O idioma com que o template foi aprovado na Meta.',
  variaveis: 'JSON (lista ou objeto) com as variáveis que o envio passa ao template. Hoje todas as etapas usam [] e o {{1}} vira o primeiro nome.',
  condicional: 'Guardado na etapa; nenhuma função do banco lê este campo hoje.',
  min_leituras: 'Guardado na etapa; nenhuma função do banco lê este campo hoje.',
  ativo: 'Etapa inativa é pulada pelo motor (fup_proxima_etapa).',
};

export function ordenarEtapas<T extends { followup_num: number }>(etapas: T[]): T[] {
  return [...etapas].sort((a, b) => a.followup_num - b.followup_num);
}

/** Avisos quando os dias não crescem com as etapas: o motor passa a usar 1 dia de intervalo. */
export function avisosDeOrdem(etapas: Pick<EtapaFup90, 'followup_num' | 'offset_dias' | 'ativo'>[]): string[] {
  const ativas = ordenarEtapas(etapas).filter((e) => e.ativo);
  const avisos: string[] = [];
  for (let i = 1; i < ativas.length; i++) {
    const antes = ativas[i - 1];
    const esta = ativas[i];
    if (esta.offset_dias <= antes.offset_dias) {
      avisos.push(`FUP ${esta.followup_num} (dia ${esta.offset_dias}) não vem depois do FUP ${antes.followup_num} (dia ${antes.offset_dias}): o motor usa 1 dia de intervalo entre eles.`);
    }
  }
  return avisos;
}

/** O followup_num da etapa nova: o seguinte ao maior, ou o primeiro buraco quando já se chegou a 12. */
export function proximoNumeroLivre(etapas: Pick<EtapaFup90, 'followup_num'>[]): number | null {
  const usados = new Set(etapas.map((e) => e.followup_num));
  const maior = etapas.reduce((m, e) => Math.max(m, e.followup_num), 0);
  if (maior < MAX_ETAPAS) return maior + 1;
  for (let n = 1; n <= MAX_ETAPAS; n++) if (!usados.has(n)) return n;
  return null;
}

/** Sugestão de dia para a etapa nova: um dia depois da anterior a ela na ordem. */
export function offsetSugerido(etapas: Pick<EtapaFup90, 'followup_num' | 'offset_dias'>[], numero: number): number {
  const anteriores = etapas.filter((e) => e.followup_num < numero);
  if (!anteriores.length) return 1;
  return Math.max(...anteriores.map((e) => e.offset_dias)) + 1;
}

/** As etapas fora da linha de 90 dias. */
export function etapasForaDaLinha<T extends { offset_dias: number }>(etapas: T[]): T[] {
  return etapas.filter((e) => e.offset_dias > DIAS_DA_LINHA);
}

/**
 * Posição (0 a 100) de um dia na linha: escala por raiz quadrada, para os
 * primeiros dias (1, 2, 3, 7) não ficarem em cima uns dos outros.
 */
export function posicaoNaLinha(dia: number): number {
  const d = Math.max(0, Math.min(dia, DIAS_DA_LINHA));
  return Math.sqrt(d / DIAS_DA_LINHA) * 100;
}

/** "08:00:00" do banco vira "08:00" no campo; o contrário na gravação. */
export function horaDoFormulario(valor: string | null | undefined): string {
  return String(valor ?? '').slice(0, 5);
}
export function horaDoBanco(valor: string): string {
  return /^\d{2}:\d{2}$/.test(valor) ? `${valor}:00` : valor;
}

const igual = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Listas que valem como conjunto: a ordem não importa (praças e tags da campanha). */
export const CAMPOS_DE_CONJUNTO = ['regioes', 'tags_bloqueantes', 'tags_pausantes'] as const;

const comoConjunto = (v: unknown) =>
  Array.isArray(v) ? [...v].map((x) => (typeof x === 'number' ? x : String(x))).sort((a, b) => String(a).localeCompare(String(b), 'en', { numeric: true })) : v;

/**
 * Só os campos de `depois` que diferem de `antes`. Listas comparam pelo
 * conteúdo; as de `conjuntos` ignoram a ordem (o banco devolve
 * ['sp','rj','goiania'] e o formulário grava em ordem alfabética: não é mudança).
 */
export function camposAlterados<T extends Record<string, unknown>>(
  antes: T,
  depois: Partial<T>,
  conjuntos: readonly string[] = CAMPOS_DE_CONJUNTO,
): Partial<T> {
  const saida: Partial<T> = {};
  for (const chave of Object.keys(depois) as Array<keyof T>) {
    const deConjunto = conjuntos.includes(String(chave));
    const a = deConjunto ? comoConjunto(antes[chave]) : antes[chave];
    const b = deConjunto ? comoConjunto(depois[chave]) : depois[chave];
    if (!igual(a, b)) saida[chave] = depois[chave];
  }
  return saida;
}

/** Para a auditoria: cada campo mudado com o antes e o depois. */
export function diffParaAuditoria<T extends Record<string, unknown>>(antes: T, campos: Partial<T>): Record<string, { de: unknown; para: unknown }> {
  const saida: Record<string, { de: unknown; para: unknown }> = {};
  for (const chave of Object.keys(campos)) saida[chave] = { de: antes[chave] ?? null, para: campos[chave] ?? null };
  return saida;
}

export type VariaveisLidas = { ok: true; valor: unknown } | { ok: false; erro: string };

/** O campo de variáveis é JSON: aceita lista ou objeto; vazio vale []. */
export function lerVariaveis(texto: string): VariaveisLidas {
  const t = texto.trim();
  if (!t) return { ok: true, valor: [] };
  try {
    const valor = JSON.parse(t);
    if (valor === null || typeof valor !== 'object') return { ok: false, erro: 'As variáveis têm de ser uma lista ([]) ou um objeto ({})' };
    return { ok: true, valor };
  } catch {
    return { ok: false, erro: 'JSON inválido' };
  }
}

export function variaveisParaTexto(valor: unknown): string {
  if (valor == null) return '[]';
  return JSON.stringify(valor);
}

const hora = z.string().regex(/^\d{2}:\d{2}$/, 'Hora no formato HH:MM');

/** "12:20" -> 740. */
export function minutosDoDia(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
const inteiro = (minimo: number, mensagem?: string) => z.coerce.number({ invalid_type_error: 'Só número' }).int('Só número inteiro').min(minimo, mensagem ?? `No mínimo ${minimo}`);

export const esquemaDaCampanha = z
  .object({
    nome: z.string().trim().min(1, 'Dê um nome à campanha').max(120, 'No máximo 120 caracteres'),
    hora_inicio: hora,
    hora_fim: hora,
    hora_overflow: hora,
    jitter_min: inteiro(0),
    jitter_janela_min: inteiro(0),
    envia_fim_semana: z.boolean(),
    janela_min_horas: inteiro(0),
    janela_max_dias: inteiro(1),
    intervalo_min_horas: inteiro(0),
    limite_inscricao_dia: inteiro(0),
    limite_envio_dia: inteiro(0),
    teto_toques_total: inteiro(1, 'O banco exige pelo menos 1 toque'),
    regioes: z.array(z.string()).min(1, 'Escolha pelo menos uma praça'),
    tags_bloqueantes: z.array(z.number()),
    tags_pausantes: z.array(z.number()),
  })
  .refine((v) => v.hora_fim > v.hora_inicio, { message: 'A hora final tem de vir depois da inicial', path: ['hora_fim'] })
  // fup_proximo_horario manda o envio que caiu fora da janela para a hora de
  // transbordo mais um atraso aleatório, sem conferir o fim da janela: as duas
  // coisas juntas têm de caber nela.
  .refine((v) => v.hora_overflow >= v.hora_inicio && v.hora_overflow < v.hora_fim, {
    message: 'O transbordo tem de cair dentro da janela de envio (entre o começo e o fim)',
    path: ['hora_overflow'],
  })
  .refine(
    (v) => !(v.hora_overflow >= v.hora_inicio && v.hora_overflow < v.hora_fim) || minutosDoDia(v.hora_overflow) + v.jitter_min <= minutosDoDia(v.hora_fim),
    (v) => ({
      message: `Com o transbordo às ${v.hora_overflow}, um atraso de até ${v.jitter_min} min passa das ${v.hora_fim}, fora da janela`,
      path: ['jitter_min'],
    }),
  );

export type ValoresDaCampanha = z.infer<typeof esquemaDaCampanha>;

export function valoresDaCampanha(c: CampanhaFup90): ValoresDaCampanha {
  return {
    nome: c.nome ?? '',
    hora_inicio: horaDoFormulario(c.hora_inicio),
    hora_fim: horaDoFormulario(c.hora_fim),
    hora_overflow: horaDoFormulario(c.hora_overflow),
    jitter_min: Number(c.jitter_min ?? 0),
    jitter_janela_min: Number(c.jitter_janela_min ?? 0),
    envia_fim_semana: Boolean(c.envia_fim_semana),
    janela_min_horas: Number(c.janela_min_horas ?? 0),
    janela_max_dias: Number(c.janela_max_dias ?? 1),
    intervalo_min_horas: Number(c.intervalo_min_horas ?? 0),
    limite_inscricao_dia: Number(c.limite_inscricao_dia ?? 0),
    limite_envio_dia: Number(c.limite_envio_dia ?? 0),
    teto_toques_total: Number(c.teto_toques_total ?? 1),
    regioes: Array.isArray(c.regioes) ? [...c.regioes] : [],
    tags_bloqueantes: Array.isArray(c.tags_bloqueantes) ? c.tags_bloqueantes.map(Number) : [],
    tags_pausantes: Array.isArray(c.tags_pausantes) ? c.tags_pausantes.map(Number) : [],
  };
}

/** Os valores do formulário no formato que fup_campanhas guarda. */
export function campanhaParaOBanco(v: ValoresDaCampanha): Partial<CampanhaFup90> {
  return {
    nome: v.nome.trim(),
    hora_inicio: horaDoBanco(v.hora_inicio),
    hora_fim: horaDoBanco(v.hora_fim),
    hora_overflow: horaDoBanco(v.hora_overflow),
    jitter_min: v.jitter_min,
    jitter_janela_min: v.jitter_janela_min,
    envia_fim_semana: v.envia_fim_semana,
    janela_min_horas: v.janela_min_horas,
    janela_max_dias: v.janela_max_dias,
    intervalo_min_horas: v.intervalo_min_horas,
    limite_inscricao_dia: v.limite_inscricao_dia,
    limite_envio_dia: v.limite_envio_dia,
    teto_toques_total: v.teto_toques_total,
    regioes: [...v.regioes].sort(),
    tags_bloqueantes: [...v.tags_bloqueantes].sort((a, b) => a - b),
    tags_pausantes: [...v.tags_pausantes].sort((a, b) => a - b),
  };
}

export const esquemaDaEtapa = z.object({
  offset_dias: inteiro(1, 'O dia tem de ser 1 ou mais (o banco exige offset_dias > 0)'),
  temperatura: z.enum(TEMPERATURAS),
  objetivo: z.string().trim().min(1, 'Diga o objetivo da etapa').max(200, 'No máximo 200 caracteres'),
  /** Vazio vale null no banco: a validação da campanha acusa "etapa sem template". */
  template_name: z.string(),
  template_lang: z.string().trim().min(2, 'Informe o idioma (ex.: pt_BR)').max(10),
  variaveis: z.string().refine((t) => lerVariaveis(t).ok, (t) => ({ message: (lerVariaveis(t) as { erro?: string }).erro ?? 'JSON inválido' })),
  condicional: z.boolean(),
  min_leituras: inteiro(0),
  ativo: z.boolean(),
});

export type ValoresDaEtapa = z.infer<typeof esquemaDaEtapa>;

export function valoresDaEtapa(e: EtapaFup90 | null, offsetPadrao = 1): ValoresDaEtapa {
  return {
    offset_dias: e ? Number(e.offset_dias) : offsetPadrao,
    temperatura: e && (TEMPERATURAS as readonly string[]).includes(e.temperatura) ? (e.temperatura as Temperatura) : 'morno',
    objetivo: e?.objetivo ?? '',
    template_name: e?.template_name ?? '',
    template_lang: e?.template_lang ?? 'pt_BR',
    variaveis: variaveisParaTexto(e?.variaveis),
    condicional: Boolean(e?.condicional),
    min_leituras: e ? Number(e.min_leituras) : 2,
    ativo: e ? Boolean(e.ativo) : true,
  };
}

/** Os valores do formulário no formato de fup_campanha_etapas; template_body vem do template escolhido. */
export function etapaParaOBanco(v: ValoresDaEtapa, corpoDoTemplate: string | null): Partial<EtapaFup90> {
  const lidas = lerVariaveis(v.variaveis);
  return {
    offset_dias: v.offset_dias,
    temperatura: v.temperatura,
    objetivo: v.objetivo.trim(),
    template_name: v.template_name || null,
    template_lang: v.template_lang.trim(),
    template_body: v.template_name ? corpoDoTemplate : null,
    variaveis: lidas.ok ? lidas.valor : [],
    condicional: v.condicional,
    min_leituras: v.min_leituras,
    ativo: v.ativo,
  };
}

/** Os campos que viajam com a mensagem quando uma etapa sobe ou desce de posição (o dia fica com a posição). */
export const CAMPOS_QUE_SE_MOVEM = ['temperatura', 'objetivo', 'template_name', 'template_lang', 'template_body', 'variaveis', 'condicional', 'min_leituras', 'ativo'] as const;

export function conteudoDaEtapa(e: EtapaFup90): Partial<EtapaFup90> {
  const saida: Partial<EtapaFup90> = {};
  for (const campo of CAMPOS_QUE_SE_MOVEM) (saida as Record<string, unknown>)[campo] = e[campo];
  return saida;
}
