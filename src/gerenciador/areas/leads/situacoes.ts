// Situação de uma revisão e de um retorno (viva, expirada, cancelada, vencido…)
// e o rótulo de dia da conversa. Fica fora dos componentes para o fast refresh.
import type { TomDaPilula } from '@/gerenciador/componentes';
import { data, diaSemanaCurto, instante } from '@/gerenciador/lib/formatos';
import type { Retorno, Revisao } from '@/gerenciador/lib/tipos';

export interface Situacao { rotulo: string; tom: TomDaPilula }

/** Viva = não cancelada e dentro do prazo; sem conferência, a Bruna ainda não lê. */
export function situacaoDaRevisao(r: Revisao, agora = Date.now()): Situacao & { viva: boolean } {
  if (r.cancelada_em) return { rotulo: `cancelada ${data(r.cancelada_em)}`, tom: 'suave', viva: false };
  const expira = instante(r.expira_em)?.getTime() ?? 0;
  if (expira <= agora) return { rotulo: `expirou ${data(r.expira_em)}`, tom: 'suave', viva: false };
  if (!r.verificada_em) return { rotulo: 'à espera de conferência', tom: 'alerta', viva: true };
  return { rotulo: 'viva', tom: 'ok', viva: true };
}

/** Pendente = não cumprido e não cancelado; vencido quando a hora já passou. */
export function situacaoDoRetorno(f: Retorno, agora = Date.now()): Situacao & { pendente: boolean } {
  if (f.cancelado_em) return { rotulo: `cancelado ${data(f.cancelado_em)}`, tom: 'suave', pendente: false };
  if (f.cumprido) return { rotulo: f.enviado_em ? `enviado ${data(f.enviado_em)}` : 'cumprido', tom: 'ok', pendente: false };
  const quando = instante(f.quando)?.getTime() ?? 0;
  if (quando < agora) return { rotulo: 'vencido, ainda não enviado', tom: 'alerta', pendente: true };
  return { rotulo: 'pendente', tom: 'tinta', pendente: true };
}

/** "Hoje", "Ontem" ou "ter 13/10/2026", sempre no dia de Brasília. */
export function rotuloDoDia(quando: string, agora: Date = new Date()): string {
  const d = instante(quando);
  if (!d) return '';
  const dia = data(d, true);
  if (dia === data(agora, true)) return 'Hoje';
  if (dia === data(new Date(agora.getTime() - 86_400_000), true)) return 'Ontem';
  return `${diaSemanaCurto(d)} ${dia}`;
}
