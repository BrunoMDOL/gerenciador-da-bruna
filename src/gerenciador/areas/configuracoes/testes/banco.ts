// Um banco falso para os testes desta área: db.from(tabela) devolve um
// construtor que anota cada passo (select, eq, update...) e responde pelo
// que o teste mandar. Assim o teste confere a tabela, o método e os
// argumentos de cada escrita.
import { vi } from 'vitest';

export interface Passo { metodo: string; args: unknown[] }
export interface Chamada { tabela: string; passos: Passo[] }
export interface Resposta { data: unknown; error: { message: string; code?: string } | null; count?: number | null }
export type Responder = (c: Chamada) => Resposta;

const METODOS = [
  'select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq', 'in', 'is', 'gte', 'lte', 'gt', 'lt', 'like', 'ilike', 'or', 'not',
  'order', 'limit', 'range', 'textSearch', 'maybeSingle', 'single', 'match', 'filter', 'contains',
];

export function criarBancoFalso(respostas: Record<string, Responder>) {
  const chamadas: Chamada[] = [];
  const from = vi.fn((tabela: string) => {
    const chamada: Chamada = { tabela, passos: [] };
    chamadas.push(chamada);
    const construtor: Record<string, unknown> = {};
    for (const m of METODOS) {
      construtor[m] = vi.fn((...args: unknown[]) => {
        chamada.passos.push({ metodo: m, args });
        return construtor;
      });
    }
    construtor.then = (ok: (v: Resposta) => unknown, falha?: (e: unknown) => unknown) =>
      Promise.resolve()
        .then(() => (respostas[tabela] ? respostas[tabela](chamada) : { data: [], error: null }))
        .then(ok, falha);
    return construtor;
  });
  /** As chamadas a `tabela` que tiveram o passo `metodo`. */
  const de = (tabela: string, metodo?: string) =>
    chamadas.filter((c) => c.tabela === tabela && (!metodo || c.passos.some((p) => p.metodo === metodo)));
  return { from, chamadas, de };
}

export function tem(c: Chamada, metodo: string): boolean {
  return c.passos.some((p) => p.metodo === metodo);
}

/** Os argumentos do primeiro passo `metodo` da chamada. */
export function args(c: Chamada, metodo: string): unknown[] | undefined {
  return c.passos.find((p) => p.metodo === metodo)?.args;
}

/** Todos os passos `metodo` da chamada (um filtro pode aparecer duas vezes). */
export function todos(c: Chamada, metodo: string): unknown[][] {
  return c.passos.filter((p) => p.metodo === metodo).map((p) => p.args);
}

export const ok = (data: unknown, count?: number | null): Resposta => ({ data, error: null, count });
export const falha = (message: string, code?: string): Resposta => ({ data: null, error: { message, code } });
