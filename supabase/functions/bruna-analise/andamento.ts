// Como uma linha de bruna_analises anda de status do lado da edge function:
// quem pode começar qual análise, a reserva antes do 202, a falta da chave
// da Anthropic, a falha e a liberação das que ficaram presas. Sem Deno e sem
// npm: (o cliente do banco chega por parâmetro), para o vitest cobrir com um
// banco falso.
//
//   pendente ─reserva─▶ coletando ─▶ analisando ─▶ concluida
//      │                    │             │
//      └────────────────────┴─────────────┴─▶ falhou ─reserva (gestor)─▶ coletando
//
// A reserva é um UPDATE condicional (status de onde pode começar → coletando)
// feito antes de responder 202. De dois pedidos com o mesmo analise_id (duplo
// clique em "Tentar de novo", o gestor e o cron ao mesmo tempo), o banco deixa
// um só passar; o outro recebe 409 e não chama o modelo.

export interface ErroDoBanco {
  message: string;
}

export interface Resposta<T = unknown> {
  data: T | null;
  error: ErroDoBanco | null;
}

/** O pedaço do query builder do supabase-js que este módulo usa. */
export interface Consulta extends PromiseLike<Resposta> {
  eq(coluna: string, valor: unknown): Consulta;
  neq(coluna: string, valor: unknown): Consulta;
  lt(coluna: string, valor: unknown): Consulta;
  in(coluna: string, valores: readonly unknown[]): Consulta;
  select(colunas: string): Consulta;
  maybeSingle(): PromiseLike<Resposta>;
  single(): PromiseLike<Resposta>;
}

export interface Tabela {
  select(colunas: string): Consulta;
  insert(linha: Record<string, unknown>): Consulta;
  update(campos: Record<string, unknown>): Consulta;
}

export interface Banco {
  from(tabela: string): Tabela;
}

export type Via = "cron" | "gestor";
export type StatusDaAnalise = "pendente" | "coletando" | "analisando" | "concluida" | "falhou";

/**
 * De onde cada chamador começa uma análise pelo id: o cron, só a linha
 * 'pendente' que bruna_analise_disparar() acabou de criar; o gestor, só uma
 * que falhou ("Tentar de novo" na interface). Uma análise nova (de/ate) nasce
 * 'pendente' e é reservada na hora por quem a criou.
 */
export const STATUS_QUE_COMECAM: Readonly<Record<Via, readonly StatusDaAnalise[]>> = {
  cron: ["pendente"],
  gestor: ["falhou"],
};

/** Análise parada há mais que isso é dada como perdida (a mesma regra está em bruna_analise_disparar). */
export const TRAVADA_HA_MINUTOS = 30;
export const ERRO_DA_TRAVADA = `a função não terminou (parada há mais de ${TRAVADA_HA_MINUTOS} min)`;
export const ERRO_DA_FILA = `não começou: ficou mais de ${TRAVADA_HA_MINUTOS} min na fila (o disparo não chegou à função)`;
export const ERRO_SEM_CHAVE = "ANTHROPIC_API_KEY ausente";

const NOME_DO_STATUS: Record<string, string> = {
  pendente: "na fila",
  coletando: "coletando",
  analisando: "analisando",
  concluida: "concluída",
  falhou: "com falha",
};

/** O 409 em palavras, conforme o status em que a análise está. */
export function motivoDoConflito(id: number, status: string, aceitos: readonly string[]): string {
  if (status === "pendente" || status === "coletando" || status === "analisando") {
    return `a análise ${id} já está em andamento (${NOME_DO_STATUS[status]})`;
  }
  if (status === "concluida") {
    return `a análise ${id} já foi concluída; para olhar o mesmo período de novo, peça uma análise nova`;
  }
  const regra = aceitos.includes("falhou") ? "só dá para repetir uma que falhou" : "o disparo só começa uma análise que está na fila";
  return `a análise ${id} está ${NOME_DO_STATUS[status] ?? status}; ${regra}`;
}

/** O que a reserva grava: status 'coletando', o começo e a rodada anterior zerada. */
export function camposDoComeco(agoraIso: string, email: string | null): Record<string, unknown> {
  return {
    status: "coletando",
    iniciada_em: agoraIso,
    concluida_em: null,
    erro: null,
    resumo: null,
    achados: null,
    dados: null,
    modelo: null,
    tokens_entrada: null,
    tokens_saida: null,
    custo_usd: null,
    // Na repetição pelo gestor, fica o e-mail de quem repetiu; no cron, o 'cron' de bruna_analise_disparar.
    ...(email ? { solicitada_por_email: email } : {}),
  };
}

export type Reserva = { ok: true; id: number } | { ok: false; status: 404 | 409 | 500; erro: string };

/**
 * Passa a análise para 'coletando' se ela estiver num dos status `aceitos`,
 * num único UPDATE condicional. Quem não consegue descobre o porquê: 404 se a
 * linha não existe, 409 se está em outro status.
 */
export async function reservarAnalise(
  banco: Banco,
  id: number,
  aceitos: readonly string[],
  campos: Record<string, unknown>,
): Promise<Reserva> {
  const { data, error } = await banco.from("bruna_analises").update(campos).eq("id", id).in("status", aceitos).select("id");
  if (error) return { ok: false, status: 500, erro: `não deu para começar a análise ${id}: ${error.message}` };
  if (Array.isArray(data) && data.length > 0) return { ok: true, id };

  const { data: linha, error: erroLeitura } = await banco.from("bruna_analises").select("id, status").eq("id", id).maybeSingle();
  if (erroLeitura) return { ok: false, status: 500, erro: `não deu para ler a análise ${id}: ${erroLeitura.message}` };
  if (!linha) return { ok: false, status: 404, erro: `a análise ${id} não existe` };
  const status = String((linha as { status?: unknown }).status ?? "");
  return { ok: false, status: 409, erro: motivoDoConflito(id, status, aceitos) };
}

export type Criacao = { ok: true; id: number } | { ok: false; erro: string };

/** Uma análise pedida à mão nasce 'pendente' (e quem a criou reserva logo em seguida). */
export async function criarAnalise(banco: Banco, p: { de: string; ate: string; email: string | null }): Promise<Criacao> {
  const { data, error } = await banco
    .from("bruna_analises")
    .insert({ tipo: "manual", periodo_inicio: p.de, periodo_fim: p.ate, status: "pendente", solicitada_por_email: p.email })
    .select("id")
    .single();
  const id = Number((data as { id?: unknown } | null)?.id);
  if (error || !Number.isInteger(id) || id <= 0) return { ok: false, erro: error?.message ?? "não deu para criar a análise" };
  return { ok: true, id };
}

/**
 * Sem a chave da Anthropic. Só o cron marca, e só a linha que ainda está
 * 'pendente' (a que ele acabou de criar): um pedido do gestor não mexe em
 * nada, e uma análise concluída ou em andamento nunca vira 'falhou' por isso.
 */
export async function marcarSemChave(banco: Banco, via: Via, id: number | null, agoraIso: string): Promise<void> {
  if (via !== "cron" || id === null) return;
  const { error } = await banco
    .from("bruna_analises")
    .update({ status: "falhou", erro: ERRO_SEM_CHAVE, concluida_em: agoraIso })
    .eq("id", id)
    .eq("status", "pendente");
  if (error) console.error("bruna-analise: não deu para marcar a análise", id, "sem a chave:", error.message);
}

/** Marca como falhou, com o que já se sabe da rodada (dados parciais, duração). */
export async function marcarFalha(
  banco: Banco,
  id: number,
  erro: string,
  agoraIso: string,
  extras: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await banco
    .from("bruna_analises")
    .update({ ...extras, status: "falhou", erro: erro.slice(0, 2000), concluida_em: agoraIso })
    .eq("id", id);
  if (error) console.error("bruna-analise: não deu para marcar a análise", id, "como falhou:", error.message);
}

/**
 * Análises de rodadas anteriores que ficaram presas viram 'falhou', para a
 * interface parar de esperar e o gestor poder tentar de novo:
 * - coletando/analisando há mais de 30 min: a função morreu no meio (limite
 *   de tempo do runtime) sem gravar o fim;
 * - pendente há mais de 30 min: o disparo do cron (net.http_post) não chegou.
 * bruna_analise_disparar() faz o mesmo de hora em hora.
 */
export async function liberarTravadas(banco: Banco, exceto: number, agoraMs: number): Promise<void> {
  const limite = new Date(agoraMs - TRAVADA_HA_MINUTOS * 60_000).toISOString();
  const agora = new Date(agoraMs).toISOString();
  const presas = await banco
    .from("bruna_analises")
    .update({ status: "falhou", erro: ERRO_DA_TRAVADA, concluida_em: agora })
    .in("status", ["coletando", "analisando"])
    .lt("iniciada_em", limite)
    .neq("id", exceto);
  if (presas.error) console.warn("bruna-analise: não deu para liberar análises travadas:", presas.error.message);
  const naFila = await banco
    .from("bruna_analises")
    .update({ status: "falhou", erro: ERRO_DA_FILA, concluida_em: agora })
    .eq("status", "pendente")
    .lt("criado_em", limite)
    .neq("id", exceto);
  if (naFila.error) console.warn("bruna-analise: não deu para liberar análises paradas na fila:", naFila.error.message);
}
