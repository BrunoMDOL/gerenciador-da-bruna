// A auditoria do gerenciador: as linhas de audit_logs com action gestor_*,
// do mesmo jeito que a tela de Auditoria do painel lê (useAuditLogs).
import { db, ErroDoBanco } from '@/gerenciador/lib/db';
import { GRUPOS_DE_ACOES } from './acoes';

export const POR_PAGINA = 50;

export interface LinhaDaAuditoria {
  id: number;
  created_at: string;
  actor_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  contato_id: number | null;
  region: string | null;
  details: Record<string, unknown> | null;
}

export interface PaginaDaAuditoria {
  linhas: LinhaDaAuditoria[];
  /** Quantas linhas o filtro tem ao todo (só na primeira página). */
  total: number | null;
}

/** '' = todas; 'grupo:<id>' = um grupo de ações; 'acao:<action>' = uma ação. */
export type FiltroDaAuditoria = string;

export async function listarAuditoria(filtro: FiltroDaAuditoria, dias: number | null, pagina: number, agora: Date = new Date()): Promise<PaginaDaAuditoria> {
  let q = db
    .from('audit_logs')
    .select('id, created_at, actor_email, action, entity_type, entity_id, contato_id, region, details', { count: pagina === 0 ? 'exact' : undefined })
    .like('action', 'gestor_%');
  if (filtro.startsWith('acao:')) {
    q = q.eq('action', filtro.slice('acao:'.length));
  } else if (filtro.startsWith('grupo:')) {
    const grupo = GRUPOS_DE_ACOES.find((g) => g.id === filtro.slice('grupo:'.length));
    if (grupo) q = q.or(grupo.prefixos.map((p) => `action.like.${p}*`).join(','));
  }
  if (dias) q = q.gte('created_at', new Date(agora.getTime() - dias * 86_400_000).toISOString());
  const de = pagina * POR_PAGINA;
  const { data, error, count } = await q.order('created_at', { ascending: false }).order('id', { ascending: false }).range(de, de + POR_PAGINA - 1);
  if (error) throw new ErroDoBanco(error.message, error);
  return { linhas: (data ?? []) as LinhaDaAuditoria[], total: typeof count === 'number' ? count : null };
}

/** Quem lê audit_logs pela RLS de hoje: admin, diretoria e o e-mail do dono (is_global_admin). */
export function podeLerAuditoria(papeis: string[], email: string | null): boolean {
  return papeis.includes('admin') || papeis.includes('diretoria') || email === 'bruno@besserhome.com.br';
}
