// As ações do gerenciador (audit_logs.action gestor_*), em português.
import { dataHora } from '@/gerenciador/lib/formatos';
import { ROTAS, rotaDaVersao } from '../rotas';

export interface GrupoDeAcoes {
  id: string;
  rotulo: string;
  /** Prefixos de action que caem no grupo. */
  prefixos: string[];
}

export const GRUPOS_DE_ACOES: GrupoDeAcoes[] = [
  { id: 'nucleo', rotulo: 'Núcleo', prefixos: ['gestor_nucleo_'] },
  { id: 'instrucao', rotulo: 'Orientações', prefixos: ['gestor_instrucao_'] },
  { id: 'base', rotulo: 'Base de conhecimento', prefixos: ['gestor_base_'] },
  { id: 'config', rotulo: 'Configuração', prefixos: ['gestor_config_'] },
  { id: 'lead', rotulo: 'Leads (revisão, retorno, Bruna)', prefixos: ['gestor_revisao_', 'gestor_retorno_', 'gestor_bruna_'] },
  { id: 'regua', rotulo: 'Régua', prefixos: ['gestor_regua_', 'gestor_fup90_', 'gestor_escada_', 'gestor_template_'] },
  { id: 'sugestao', rotulo: 'Sugestões', prefixos: ['gestor_sugestao_'] },
  { id: 'analise', rotulo: 'Análises', prefixos: ['gestor_analise_'] },
  { id: 'copiloto', rotulo: 'Copiloto', prefixos: ['gestor_copiloto_'] },
  { id: 'bairros', rotulo: 'Bairros foco', prefixos: ['gestor_bairro', 'gestor_bairros_'] },
];

export const FRASE_DA_ACAO: Record<string, string> = {
  gestor_nucleo_versao_criada: 'criou uma versão do núcleo',
  gestor_nucleo_versao_aprovada: 'aprovou uma versão do núcleo',
  gestor_nucleo_versao_descartada: 'descartou uma versão do núcleo',
  gestor_nucleo_versao_revertida: 'reverteu o núcleo para uma versão anterior',
  gestor_nucleo_versao_publicada: 'marcou uma versão do núcleo como publicada',
  gestor_instrucao_criada: 'criou uma orientação',
  gestor_instrucao_alterada: 'alterou uma orientação',
  gestor_instrucao_desativada: 'desativou uma orientação',
  gestor_instrucao_reativada: 'reativou uma orientação',
  gestor_base_criada: 'criou uma entrada na base',
  gestor_base_alterada: 'alterou uma entrada da base',
  gestor_base_restaurada: 'restaurou uma versão de uma entrada da base',
  gestor_base_desativada: 'desativou uma entrada da base',
  gestor_base_reativada: 'reativou uma entrada da base',
  gestor_base_duvida_descartada: 'tirou uma pergunta da fila da base',
  gestor_config_alterada: 'mudou a configuração do gerenciador',
  gestor_revisao_criada: 'escreveu uma revisão para o próximo turno',
  gestor_revisao_cancelada: 'cancelou uma revisão',
  gestor_revisao_verificada: 'liberou uma revisão da autochecagem',
  gestor_retorno_cancelado: 'cancelou um retorno prometido',
  gestor_bruna_ligada: 'ligou a Bruna num lead',
  gestor_bruna_desligada: 'desligou a Bruna num lead',
  gestor_regua_pausa: 'pausou ou retomou a régua',
  gestor_sugestao_aplicada: 'aplicou uma sugestão',
  gestor_sugestao_aprovada: 'aprovou uma sugestão',
  gestor_sugestao_rejeitada: 'rejeitou uma sugestão',
  gestor_sugestao_descartada: 'descartou uma sugestão',
  gestor_sugestao_pendente: 'reabriu uma sugestão',
  gestor_analise_pedida: 'pediu uma análise',
  gestor_analise_concluida: 'análise concluída',
  gestor_analise_falhou: 'análise falhou',
  gestor_copiloto_pergunta: 'perguntou ao copiloto',
  gestor_copiloto_sessao_criada: 'abriu uma conversa com o copiloto',
  gestor_copiloto_sugestao_proposta: 'o copiloto propôs uma sugestão',
  gestor_fup90_campanha_alterada: 'alterou a campanha FUP90',
  gestor_fup90_etapa_alterada: 'alterou uma etapa da campanha FUP90',
  gestor_template_criado: 'criou um template',
  gestor_bairro_foco_criado: 'pôs um bairro foco',
  gestor_bairro_foco_alterado: 'alterou um bairro foco',
  gestor_bairro_foco_movido: 'mudou a ordem dos bairros foco',
};

/** A frase da ação; a que este mapa não conhece sai do próprio nome ("gestor_fup90_etapa" -> "fup90 etapa"). */
export function fraseDaAcao(action: string): string {
  return FRASE_DA_ACAO[action] ?? action.replace(/^gestor_/, '').replace(/_/g, ' ');
}

export function grupoDaAcao(action: string): GrupoDeAcoes | null {
  return GRUPOS_DE_ACOES.find((g) => g.prefixos.some((p) => action.startsWith(p))) ?? null;
}

/** As ações conhecidas de um grupo, para o filtro fino. */
export function acoesDoGrupo(g: GrupoDeAcoes): string[] {
  return Object.keys(FRASE_DA_ACAO).filter((a) => g.prefixos.some((p) => a.startsWith(p)));
}

const NOME_DA_ENTIDADE: Record<string, string> = {
  bruna_prompt_versoes: 'versão do núcleo',
  bruna_instrucoes: 'orientação',
  bruna_conhecimento: 'entrada da base',
  bruna_duvidas: 'pergunta sem resposta',
  bruna_gestor_config: 'configuração',
  bruna_revisao: 'revisão',
  bruna_revisoes: 'revisão',
  bruna_followup: 'retorno',
  bruna_followups: 'retorno',
  bruna_sugestoes: 'sugestão',
  bruna_analises: 'análise',
  bruna_copiloto_sessoes: 'conversa do copiloto',
  bruna_bairros_foco: 'bairros foco',
  fup_campanhas: 'campanha FUP90',
  fup_campanha_etapas: 'etapa da FUP90',
  templates: 'template',
  contatos: 'lead',
};

export function nomeDaEntidade(entidade: string | null): string | null {
  if (!entidade) return null;
  return NOME_DA_ENTIDADE[entidade] ?? entidade.replace(/_/g, ' ');
}

/** Para onde a linha leva, quando a coisa tem tela no gerenciador. */
export function rotaDaEntidade(entidade: string | null, id: number | null): string | null {
  switch (entidade) {
    case 'bruna_prompt_versoes': return id ? rotaDaVersao(id) : ROTAS.nucleo;
    case 'bruna_instrucoes': return ROTAS.instrucoes;
    case 'bruna_conhecimento':
    case 'bruna_duvidas': return ROTAS.base;
    case 'bruna_gestor_config': return ROTAS.geral;
    case 'bruna_sugestoes': return ROTAS.analises;
    case 'bruna_analises': return id ? `${ROTAS.analises}/${id}` : ROTAS.analises;
    case 'bruna_copiloto_sessoes': return id ? `${ROTAS.copiloto}/${id}` : ROTAS.copiloto;
    case 'bruna_bairros_foco': return ROTAS.bairros;
    case 'fup_campanhas':
    case 'fup_campanha_etapas': return `${ROTAS.regua}/fup90`;
    case 'templates': return `${ROTAS.regua}/templates`;
    default: return null;
  }
}

const RX_INSTANTE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;

/** Um valor dos detalhes em uma linha legível (instante em horário de Brasília). */
export function valorLegivel(v: unknown, maximo = 400): string {
  if (v == null) return '—';
  if (typeof v === 'boolean') return v ? 'sim' : 'não';
  if (typeof v === 'string' && RX_INSTANTE.test(v)) return dataHora(v);
  if (typeof v === 'string') return v.length > maximo ? `${v.slice(0, maximo)}…` : v;
  if (typeof v === 'number') return v.toLocaleString('pt-BR');
  if (Array.isArray(v) && v.every((x) => typeof x !== 'object' || x == null)) return v.map((x) => String(x)).join(', ');
  const s = JSON.stringify(v);
  return s.length > maximo ? `${s.slice(0, maximo)}…` : s;
}
