import { useQuery } from '@tanstack/react-query';
import { db, ErroDoBanco } from '@/gerenciador/lib/db';
import type { RegiaoDaBruna } from '@/gerenciador/lib/tipos';
import { CHAVES } from '../chaves';

/** Uma linha de bruna_regioes (leitura liberada para todo autenticado). */
export type Regiao = RegiaoDaBruna;

export async function listarRegioes(): Promise<Regiao[]> {
  const { data, error } = await db
    .from('bruna_regioes')
    .select('region, nome, oferece_consultoria, duracao_min, grade, horizonte_dias, calendario, consultor, atualizado_em')
    .order('region');
  if (error) throw new ErroDoBanco(error.message, error);
  return (data ?? []) as Regiao[];
}

export function useRegioes() {
  return useQuery({ queryKey: CHAVES.regioes, queryFn: listarRegioes, staleTime: 5 * 60_000 });
}

const ORDEM = ['sp', 'rj', 'goiania', 'brasil', 'brasil2', 'arquitetos'];

/** Praças primeiro (na ordem do painel), depois o resto em ordem alfabética. */
export function ordenarRegioes<T extends { region: string }>(lista: T[]): T[] {
  const pos = (r: string) => {
    const i = ORDEM.indexOf(r);
    return i < 0 ? ORDEM.length : i;
  };
  return [...lista].sort((a, b) => pos(a.region) - pos(b.region) || a.region.localeCompare(b.region));
}
