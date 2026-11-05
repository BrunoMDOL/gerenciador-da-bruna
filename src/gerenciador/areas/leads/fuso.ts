// O que se digita num <input type="datetime-local"> vem sem fuso, e o navegador
// leria na hora do computador. O gerenciador mostra tudo no horário de Brasília
// (lib/formatos.ts), então o que o gestor digita também é lido em Brasília:
// quem estiver com o computador em outro fuso grava a hora que viu na tela.

const FUSO = 'America/Sao_Paulo';
const PARTES = new Intl.DateTimeFormat('en-US', {
  timeZone: FUSO, hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
});

interface Partes { ano: number; mes: number; dia: number; hora: number; minuto: number; segundo: number }

/** O relógio de Brasília no instante dado. */
function relogioDeBrasilia(ms: number): Partes {
  const p: Record<string, string> = {};
  for (const x of PARTES.formatToParts(new Date(ms))) p[x.type] = x.value;
  return { ano: Number(p.year), mes: Number(p.month), dia: Number(p.day), hora: Number(p.hour) % 24, minuto: Number(p.minute), segundo: Number(p.second) };
}

const comoUtc = (p: Partes) => Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo);

/** Quanto Brasília está à frente do UTC no instante dado, em ms (hoje, −3 h). */
function deslocamento(ms: number): number {
  const segundoCheio = Math.floor(ms / 1000) * 1000;
  return comoUtc(relogioDeBrasilia(segundoCheio)) - segundoCheio;
}

/**
 * "2026-11-20T18:00" lido como hora de Brasília → o instante certo
 * (2026-11-20T21:00Z), seja qual for o fuso do computador. Nulo quando o texto
 * não é uma data e hora que exista em Brasília.
 */
export function deBrasilia(local: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(local.trim());
  if (!m) return null;
  const pedido: Partes = { ano: +m[1], mes: +m[2], dia: +m[3], hora: +m[4], minuto: +m[5], segundo: +(m[6] ?? 0) };
  const base = comoUtc(pedido);
  // Duas passadas: a segunda acerta o deslocamento se a hora cair perto de uma troca de horário.
  let ms = base - deslocamento(base);
  ms = base - deslocamento(ms);
  const volta = relogioDeBrasilia(ms);
  const confere = (Object.keys(pedido) as Array<keyof Partes>).every((k) => volta[k] === pedido[k]);
  return confere ? new Date(ms) : null;
}

const dois = (n: number) => String(n).padStart(2, '0');

/** O instante no formato do datetime-local, no relógio de Brasília ("2026-11-20T18:00"). */
export function paraCampoDeBrasilia(d: Date = new Date()): string {
  const p = relogioDeBrasilia(d.getTime());
  return `${p.ano}-${dois(p.mes)}-${dois(p.dia)}T${dois(p.hora)}:${dois(p.minuto)}`;
}
