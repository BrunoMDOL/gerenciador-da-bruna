import { db, ErroDoBanco } from '@/gerenciador/lib/db';
import type { CopilotoMensagem, CopilotoSessao, Sugestao } from '@/gerenciador/lib/tipos';

/** As chaves do react-query desta área, todas sob ['gerenciador', 'copiloto']. */
export const CHAVES = {
  tudo: ['gerenciador', 'copiloto'] as const,
  sessoes: (userId: string | null) => ['gerenciador', 'copiloto', 'sessoes', userId] as const,
  sessao: (id: number | null) => ['gerenciador', 'copiloto', 'sessao', id] as const,
  mensagens: (sessaoId: number | null) => ['gerenciador', 'copiloto', 'mensagens', sessaoId] as const,
  contatos: (ids: number[]) => ['gerenciador', 'copiloto', 'contatos', ids] as const,
  contato: (id: number | null) => ['gerenciador', 'copiloto', 'contato', id] as const,
  sugestao: (id: number) => ['gerenciador', 'copiloto', 'sugestao', id] as const,
  pendentes: ['gerenciador', 'copiloto', 'sugestoes-pendentes'] as const,
  finalDoTurno: (sessaoId: number | null, depoisDe: number | null) => ['gerenciador', 'copiloto', 'final-do-turno', sessaoId, depoisDe] as const,
};

export interface ContatoCurto {
  id: number;
  user_name: string | null;
  user_number: string;
  region: string;
}

/** As conversas do gestor logado, da mais recente para a mais antiga. A RLS deixa todo gestor ler; a lista é só a dele. */
export async function listarSessoes(userId: string): Promise<CopilotoSessao[]> {
  const { data, error } = await db
    .from('bruna_copiloto_sessoes')
    .select('*')
    .eq('criado_por', userId)
    .order('atualizado_em', { ascending: false })
    .limit(200);
  if (error) throw new ErroDoBanco(error.message, error);
  return (data ?? []) as CopilotoSessao[];
}

export async function lerSessao(id: number): Promise<CopilotoSessao | null> {
  const { data, error } = await db.from('bruna_copiloto_sessoes').select('*').eq('id', id).maybeSingle();
  if (error) throw new ErroDoBanco(error.message, error);
  return (data as CopilotoSessao | null) ?? null;
}

/** Todas as linhas da sessão, na ordem da API (inclusive tool_use e tool_result; quem filtra é a conversa). */
export async function listarMensagens(sessaoId: number): Promise<CopilotoMensagem[]> {
  const { data, error } = await db
    .from('bruna_copiloto_mensagens')
    .select('*')
    .eq('sessao_id', sessaoId)
    .order('id', { ascending: true });
  if (error) throw new ErroDoBanco(error.message, error);
  return (data ?? []) as CopilotoMensagem[];
}

/**
 * A mensagem final de um turno que o fluxo não viu terminar (cancelado,
 * cortado): a última do assistente leva o modelo e os tokens. Devolve o id,
 * ou null enquanto a função ainda não gravou. Consulta leve (só o id), para
 * repetir de tempos em tempos.
 */
export async function buscarFinalDoTurno(sessaoId: number, depoisDe: number): Promise<number | null> {
  const { data, error } = await db
    .from('bruna_copiloto_mensagens')
    .select('id')
    .eq('sessao_id', sessaoId)
    .eq('papel', 'assistant')
    .gt('id', depoisDe)
    .not('modelo', 'is', null)
    .order('id', { ascending: false })
    .limit(1);
  if (error) throw new ErroDoBanco(error.message, error);
  const linha = ((data ?? []) as Array<{ id: number }>)[0];
  return linha ? Number(linha.id) : null;
}

/** Os leads vinculados às sessões, buscados de uma vez. */
export async function lerContatos(ids: number[]): Promise<Record<number, ContatoCurto>> {
  if (ids.length === 0) return {};
  const { data, error } = await db.from('contatos').select('id, user_name, user_number, region').in('id', ids);
  if (error) throw new ErroDoBanco(error.message, error);
  const mapa: Record<number, ContatoCurto> = {};
  for (const c of (data ?? []) as ContatoCurto[]) mapa[c.id] = c;
  return mapa;
}

export async function lerContato(id: number): Promise<ContatoCurto | null> {
  const { data, error } = await db.from('contatos').select('id, user_name, user_number, region').eq('id', id).maybeSingle();
  if (error) throw new ErroDoBanco(error.message, error);
  return (data as ContatoCurto | null) ?? null;
}

/** A linha inteira de uma sugestão que chegou pelo fluxo (o evento traz só um resumo). */
export async function lerSugestao(id: number): Promise<Sugestao | null> {
  const { data, error } = await db.from('bruna_sugestoes').select('*').eq('id', id).maybeSingle();
  if (error) throw new ErroDoBanco(error.message, error);
  return (data as Sugestao | null) ?? null;
}

/** Quantas sugestões do copiloto ainda esperam decisão (em qualquer sessão). */
export async function contarSugestoesPendentes(): Promise<number> {
  const { count, error } = await db
    .from('bruna_sugestoes')
    .select('id', { count: 'exact', head: true })
    .eq('origem', 'copiloto')
    .eq('status', 'pendente');
  if (error) throw new ErroDoBanco(error.message, error);
  return count ?? 0;
}
