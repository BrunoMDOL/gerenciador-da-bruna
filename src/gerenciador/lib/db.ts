import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// As tabelas e RPCs do gerenciador (bruna_instrucoes, bruna_gestor_*, ...) não
// estão no types.ts gerado pelo Lovable, que anda atrás do banco. O cliente sem
// tipos é o mesmo padrão de usePlaybook.ts e useFollowupsProgramados.ts.
export const db = supabase as unknown as SupabaseClient;

export class ErroDoBanco extends Error {
  constructor(message: string, public readonly detalhe?: unknown) {
    super(message);
    this.name = 'ErroDoBanco';
  }
}

/** Chama uma RPC do banco e devolve o resultado tipado; erro vira exceção com a mensagem do Postgres. */
export async function rpc<T>(nome: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await db.rpc(nome, args);
  if (error) throw new ErroDoBanco(error.message, error);
  return data as T;
}

export interface Periodo {
  /** ISO em UTC, inclusivo. */
  de: string;
  /** ISO em UTC, exclusivo. */
  ate: string;
  dias: number;
}

/** Os últimos `dias` dias até agora (ou até `ate`), para passar às RPCs de período. */
export function periodoDosUltimos(dias: number, ate: Date = new Date()): Periodo {
  const de = new Date(ate.getTime() - dias * 86_400_000);
  return { de: de.toISOString(), ate: ate.toISOString(), dias };
}

/** O período de mesmo tamanho imediatamente anterior, para comparação. */
export function periodoAnterior(p: Periodo): Periodo {
  const ate = new Date(p.de);
  const de = new Date(ate.getTime() - p.dias * 86_400_000);
  return { de: de.toISOString(), ate: ate.toISOString(), dias: p.dias };
}
