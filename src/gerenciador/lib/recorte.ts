// O recorte de Bairros foco na lista de Leads. /bairros monta o endereço
// (rotaDoRecorte) e /leads o lê (lerRecorte) e o manda para
// bruna_gestor_buscar_leads no p_filtro (filtroDoRecorte), que a migration
// 20261105151000 ensinou a ler: os leads saem de bruna_gestor_bairro_foco_leads,
// com a mesma conta do painel de bairros foco. O número que o gestor clica é o
// número de leads que a lista traz.

import { rota } from '@/gerenciador/lib/rotas';

/** bairro ou cidade: um item da lista da praça; fora: um pedido fora do foco (o bairro como o lead escreveu). */
export type TipoDoRecorte = 'bairro' | 'cidade' | 'fora';

export interface RecorteDoFoco {
  tipo: TipoDoRecorte;
  nome: string;
  /** A janela do painel: leads criados nos últimos N dias. */
  dias: number;
}

/** O mesmo período do painel de bairros foco (DIAS_DO_PAINEL). */
export const DIAS_DO_RECORTE = 90;
const DIAS_MAXIMOS = 730;
const NA_URL = /^(bairro|cidade|fora):(.+)$/;

/** /leads da praça só com os leads do recorte (e só os agendados, quando pedido). */
export function rotaDoRecorte(region: string, recorte: Pick<RecorteDoFoco, 'tipo' | 'nome'> & { dias?: number }, filtro?: 'agendados'): string {
  const p = new URLSearchParams();
  p.set('region', region);
  p.set('foco', `${recorte.tipo}:${recorte.nome}`);
  p.set('dias', String(recorte.dias ?? DIAS_DO_RECORTE));
  if (filtro) p.set('filtro', filtro);
  return rota(`/leads?${p.toString()}`);
}

/** Lê ?foco=<tipo>:<nome> e ?dias=<n>. null quando não há recorte ou ele não vale. */
export function lerRecorte(foco: string | null, dias: string | null): RecorteDoFoco | null {
  if (!foco) return null;
  const m = NA_URL.exec(foco);
  const nome = m?.[2].trim() ?? '';
  if (!m || !nome) return null;
  const n = dias === null || dias === '' ? DIAS_DO_RECORTE : Number(dias);
  if (!Number.isInteger(n) || n < 1 || n > DIAS_MAXIMOS) return null;
  return { tipo: m[1] as TipoDoRecorte, nome, dias: n };
}

/** O p_filtro de bruna_gestor_buscar_leads: 'foco:<tipo>:<dias>:<nome>', ou 'foco_agendados:…' para só os agendados. */
export function filtroDoRecorte(recorte: RecorteDoFoco, soAgendados: boolean): string {
  return `${soAgendados ? 'foco_agendados' : 'foco'}:${recorte.tipo}:${recorte.dias}:${recorte.nome}`;
}

/** A frase do recorte, no aviso da lista de leads. */
export function descreverRecorte(recorte: RecorteDoFoco): string {
  const periodo = `nos últimos ${recorte.dias} dias`;
  if (recorte.tipo === 'fora') return `Leads que informaram o bairro ${recorte.nome} ${periodo}, fora do foco`;
  if (recorte.tipo === 'cidade') return `Leads da cidade inteira ${recorte.nome} ${periodo}`;
  return `Leads de ${recorte.nome} ${periodo}`;
}
