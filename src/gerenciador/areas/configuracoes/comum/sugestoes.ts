import { db, ErroDoBanco } from '@/gerenciador/lib/db';
import type { Sugestao, TipoSugestao } from '@/gerenciador/lib/tipos';

/** As sugestões ainda abertas (pendentes ou aprovadas sem aplicar) de um tipo. */
export async function listarSugestoesAbertas(tipo: TipoSugestao): Promise<Sugestao[]> {
  const { data, error } = await db
    .from('bruna_sugestoes')
    .select('*')
    .eq('tipo', tipo)
    .in('status', ['pendente', 'aprovada'])
    .order('criado_em', { ascending: false })
    .limit(30);
  if (error) throw new ErroDoBanco(error.message, error);
  return (data ?? []) as Sugestao[];
}
