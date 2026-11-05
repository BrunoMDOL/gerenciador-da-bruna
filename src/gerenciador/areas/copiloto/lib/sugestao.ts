import type { Sugestao } from '@/gerenciador/lib/tipos';
import type { SugestaoDoEvento } from './protocolo';

const TIPOS: ReadonlyArray<Sugestao['tipo']> = ['nucleo', 'instrucao', 'base', 'regua', 'template', 'config', 'lead', 'outro'];
const PRIORIDADES: ReadonlyArray<Sugestao['prioridade']> = ['alta', 'media', 'baixa'];

/**
 * Quando a linha inteira de bruna_sugestoes ainda não veio (ou não deu para
 * ler), o cartão nasce do que o fluxo trouxe. O id é o mesmo, então aprovar,
 * aplicar e rejeitar escrevem na linha certa do mesmo jeito.
 */
export function sugestaoDaPrevia(p: SugestaoDoEvento): Sugestao {
  return {
    id: p.id,
    analise_id: null,
    origem: 'copiloto',
    tipo: (TIPOS as readonly string[]).includes(p.tipo) ? (p.tipo as Sugestao['tipo']) : 'outro',
    titulo: p.titulo,
    descricao: p.descricao,
    impacto: null,
    prioridade: (PRIORIDADES as readonly string[]).includes(p.prioridade) ? (p.prioridade as Sugestao['prioridade']) : 'media',
    evidencias: null,
    acao: p.acao,
    status: 'pendente',
    decidida_por_email: null,
    decidida_em: null,
    motivo_decisao: null,
    aplicada_em: null,
    aplicada_ref: null,
    criado_em: new Date().toISOString(),
  };
}
