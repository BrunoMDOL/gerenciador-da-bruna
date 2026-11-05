import type { Alerta, FiltroDeLeads } from '@/gerenciador/lib/tipos';
import { rota } from '@/gerenciador/lib/rotas';

/**
 * Para onde a visão geral leva. As sub-rotas de Configurações e Régua são as
 * mesmas que lib/acoes.ts já usa ao aplicar sugestões (base, núcleo,
 * instruções, geral, fup90); os filtros de Leads são os de bruna_gestor_buscar_leads.
 */
export const ROTAS = {
  leads: rota('/leads'),
  regua: rota('/regua'),
  reguaFup90: rota('/regua/fup90'),
  configuracoes: rota('/configuracoes'),
  configGeral: rota('/configuracoes/geral'),
  configBase: rota('/configuracoes/base'),
  configNucleo: rota('/configuracoes/nucleo'),
  configInstrucoes: rota('/configuracoes/instrucoes'),
  configRegioes: rota('/configuracoes/regioes'),
  analises: rota('/analises'),
  copiloto: rota('/copiloto'),
} as const;

export function rotaDeLeads(opcoes: { filtro?: FiltroDeLeads; region?: string } = {}): string {
  const p = new URLSearchParams();
  if (opcoes.filtro) p.set('filtro', opcoes.filtro);
  if (opcoes.region) p.set('region', opcoes.region);
  const q = p.toString();
  return q ? `${ROTAS.leads}?${q}` : ROTAS.leads;
}

export function rotaDoLead(contatoId: number): string {
  return `${ROTAS.leads}/${contatoId}`;
}

export function rotaDoCopiloto(pergunta: string): string {
  return `${ROTAS.copiloto}?${new URLSearchParams({ pergunta }).toString()}`;
}

/** O destino de cada alerta de bruna_gestor_alertas, pela chave. */
export function rotaDoAlerta(alerta: Pick<Alerta, 'chave'>): string {
  const chave = String(alerta?.chave ?? '');
  const lead = /^lead_(\d+)$/.exec(chave);
  if (lead) return rotaDoLead(Number(lead[1]));
  // A agenda da praça (e-mail do calendário, bloqueio) está em Configurações › Regiões.
  if (chave.startsWith('agenda_')) return ROTAS.configRegioes;
  switch (chave) {
    case 'fila_fup90':
    case 'fup90_inativa':
      return ROTAS.reguaFup90;
    case 'regua_pausada':
    case 'templates_reprovados':
      return ROTAS.regua;
    case 'revisoes_pendentes':
      return rotaDeLeads({ filtro: 'com_revisao' });
    case 'chamados_com_erro':
      return rotaDeLeads({ filtro: 'com_chamado' });
    case 'retornos_falhando':
      return rotaDeLeads({ filtro: 'retorno_pendente' });
    case 'duvidas_sem_resposta':
      return ROTAS.configBase;
    case 'sugestoes_pendentes':
      return ROTAS.analises;
    case 'encaminhamentos_com_erro':
    default:
      return ROTAS.leads;
  }
}
