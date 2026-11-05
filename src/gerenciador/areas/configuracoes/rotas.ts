import type { LucideIcon } from 'lucide-react';
import { BookOpen, FileText, History, Map as MapaIcone, MessageSquareText, SlidersHorizontal } from 'lucide-react';
import { rota } from '@/gerenciador/lib/rotas';

const RAIZ = rota('/configuracoes');

export const ROTAS = {
  raiz: RAIZ,
  nucleo: `${RAIZ}/nucleo`,
  instrucoes: `${RAIZ}/instrucoes`,
  base: `${RAIZ}/base`,
  regioes: `${RAIZ}/regioes`,
  geral: `${RAIZ}/geral`,
  auditoria: `${RAIZ}/auditoria`,
  analises: rota('/analises'),
  regua: rota('/regua'),
  bairros: rota('/bairros'),
  copiloto: rota('/copiloto'),
  leads: rota('/leads'),
} as const;

export interface AbaDasConfiguracoes {
  caminho: 'nucleo' | 'instrucoes' | 'base' | 'regioes' | 'geral' | 'auditoria';
  rotulo: string;
  Icone: LucideIcon;
  /** Uma frase sobre o que a aba guarda, para o título da aba. */
  descricao: string;
}

export const ABAS: AbaDasConfiguracoes[] = [
  { caminho: 'nucleo', rotulo: 'Núcleo', Icone: FileText, descricao: 'O prompt principal da Bruna, versão por versão.' },
  { caminho: 'instrucoes', rotulo: 'Orientações', Icone: MessageSquareText, descricao: 'Orientações do gestor para todas as conversas ou para uma região.' },
  { caminho: 'base', rotulo: 'Base', Icone: BookOpen, descricao: 'A base de conhecimento que a Bruna consulta.' },
  { caminho: 'regioes', rotulo: 'Regiões', Icone: MapaIcone, descricao: 'Praças, funis de qualificação e a agenda de cada uma.' },
  { caminho: 'geral', rotulo: 'Geral', Icone: SlidersHorizontal, descricao: 'Copiloto, análise semanal, régua e o que depende do dono.' },
  { caminho: 'auditoria', rotulo: 'Auditoria', Icone: History, descricao: 'Tudo o que foi mudado pelo gerenciador, por quem e quando.' },
];

export function rotaDoLead(contatoId: number): string {
  return `${ROTAS.leads}/${contatoId}`;
}

export function rotaDaVersao(id: number): string {
  return `${ROTAS.nucleo}?versao=${id}`;
}

/** A tela de bairros foco já aberta na praça (Bairros lê ?praca=). */
export function rotaDosBairros(region: string): string {
  return `${ROTAS.bairros}?praca=${encodeURIComponent(region)}`;
}
