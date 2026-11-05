// Ajudantes só da visão geral: número que pode chegar como texto do PostgREST
// (count() é bigint) e o dia da série, que a RPC já devolve no dia de São Paulo
// ('YYYY-MM-DD'), sem hora: formatar sem passar por fuso nenhum.

export function n(valor: unknown): number {
  const v = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(v) ? v : 0;
}

export function soma<T>(lista: T[] | null | undefined, campo: keyof T): number {
  return (lista ?? []).reduce((acc, item) => acc + n(item?.[campo]), 0);
}

/** 'YYYY-MM-DD' -> Date ao meio-dia UTC: nenhum fuso muda o dia. */
function dataDoDia(dia: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dia ?? ''));
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
}

const CURTO = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' });
const COM_ANO = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' });
const EXTENSO = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
const HOJE = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });

/** '2026-10-29' -> '29/10'. */
export function diaCurto(dia: string | null | undefined): string {
  const d = dataDoDia(dia);
  return d ? CURTO.format(d) : '—';
}

/** '2026-10-29' -> '29/10/2026'. */
export function diaComAno(dia: string | null | undefined): string {
  const d = dataDoDia(dia);
  return d ? COM_ANO.format(d) : '—';
}

/** '2026-10-29' -> 'quarta-feira, 29 de outubro'. */
export function diaPorExtenso(dia: string | null | undefined): string {
  const d = dataDoDia(dia);
  return d ? EXTENSO.format(d) : '—';
}

/** O dia de hoje em São Paulo, no mesmo formato da série ('YYYY-MM-DD'), pelas partes e não pelo padrão do locale. */
export function hojeEmSaoPaulo(agora: Date = new Date()): string {
  const p = Object.fromEntries(HOJE.formatToParts(agora).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

const RELOGIO_SP = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Sao_Paulo', hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
});

/** Quantos minutos o relógio de São Paulo está do UTC naquele instante (−180 sem horário de verão). */
function deslocamentoDeSaoPaulo(instante: number): number {
  const p: Record<string, number> = {};
  for (const { type, value } of RELOGIO_SP.formatToParts(new Date(instante))) p[type] = Number(value);
  return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second) - instante) / 60_000);
}

/**
 * O instante da meia-noite de São Paulo no dia 'YYYY-MM-DD' mais `somar` dias,
 * pelo banco de fusos (o mesmo que o Postgres usa em `at time zone
 * 'America/Sao_Paulo'`), e não por um −03:00 fixo. Se um horário de verão
 * voltar e a meia-noite não existir, vale o primeiro instante do dia.
 */
export function meiaNoiteEmSaoPaulo(dia: string, somar = 0): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia);
  if (!m) throw new RangeError(`dia fora do formato AAAA-MM-DD: ${dia}`);
  const parede = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + somar);
  const antes = deslocamentoDeSaoPaulo(parede);
  const t1 = parede - antes * 60_000;
  const depois = deslocamentoDeSaoPaulo(t1);
  if (depois === antes) return new Date(t1);
  const t2 = parede - depois * 60_000;
  return new Date(deslocamentoDeSaoPaulo(t2) === depois ? t2 : Math.max(t1, t2));
}

/** 'horario_sem_tool' -> 'horario sem tool'. */
export function humanizar(chave: string | null | undefined): string {
  return String(chave ?? '').replace(/_/g, ' ').trim() || '—';
}

/** Link interno do Croqui: sublinhado em cinza de construção que vira tinta no hover. */
export const LINK = 'underline decoration-croqui-rule underline-offset-4 transition-colors hover:decoration-foreground';
