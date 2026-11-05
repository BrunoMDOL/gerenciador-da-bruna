import type { LucideIcon } from 'lucide-react';
import { Activity, CalendarClock, FileText, Workflow } from 'lucide-react';
import type { FiltroDeLeads } from '@/gerenciador/lib/tipos';
import { rota } from '@/gerenciador/lib/rotas';

export const ROTAS = {
  regua: rota('/regua'),
  fup90: rota('/regua/fup90'),
  retornos: rota('/regua/retornos'),
  templates: rota('/regua/templates'),
  leads: rota('/leads'),
} as const;

export interface AbaDaRegua {
  para: string;
  rotulo: string;
  Icone: LucideIcon;
  /** Só a rota exata (a visão mora em /regua). */
  exato?: boolean;
}

export const ABAS: AbaDaRegua[] = [
  { para: ROTAS.regua, rotulo: 'Visão', Icone: Activity, exato: true },
  { para: ROTAS.fup90, rotulo: 'FUP90', Icone: Workflow },
  { para: ROTAS.retornos, rotulo: 'Retornos', Icone: CalendarClock },
  { para: ROTAS.templates, rotulo: 'Templates', Icone: FileText },
];

export function rotaDoLead(contatoId: number): string {
  return `${ROTAS.leads}/${contatoId}`;
}

/** A lista de Leads com um filtro de bruna_gestor_buscar_leads (os mesmos que a área Leads lê da URL). */
export function rotaDeLeads(filtro?: FiltroDeLeads, region?: string): string {
  const p = new URLSearchParams();
  if (filtro) p.set('filtro', filtro);
  if (region) p.set('region', region);
  const q = p.toString();
  return q ? `${ROTAS.leads}?${q}` : ROTAS.leads;
}
