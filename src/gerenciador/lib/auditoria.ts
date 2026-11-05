import { rpc } from './db';

/**
 * Toda ação do gestor vira uma linha em audit_logs (action gestor_*), que a
 * tela de Auditoria do painel já lista. Falha de auditoria nunca derruba a
 * ação: fica no console.
 */
export async function auditarGestor(input: {
  acao: string;
  entidade?: string | null;
  entidadeId?: number | null;
  contatoId?: number | null;
  detalhes?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await rpc('bruna_gestor_auditar', {
      p_acao: input.acao,
      p_entidade: input.entidade ?? null,
      p_entidade_id: input.entidadeId ?? null,
      p_contato_id: input.contatoId ?? null,
      p_detalhes: input.detalhes ?? null,
    });
  } catch (e) {
    console.warn('[gerenciador] auditoria falhou', e);
  }
}
