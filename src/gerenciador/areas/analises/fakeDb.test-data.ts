// Um cliente de banco falso para os testes da área: grava cada chamada
// (tabela e passos encadeados) e responde o que o teste mandar.
import { vi } from 'vitest';

export interface Chamada {
  tabela: string;
  passos: Array<[string, unknown[]]>;
}

export interface Resposta {
  data?: unknown;
  error?: { message: string; code?: string } | null;
}

const METODOS = [
  'select', 'eq', 'neq', 'in', 'is', 'not', 'order', 'limit', 'range', 'gte', 'lte', 'gt', 'lt', 'or', 'filter',
  'update', 'insert', 'upsert', 'delete', 'maybeSingle', 'single',
];

const chamadas: Chamada[] = [];
let responder: (c: Chamada) => Resposta = () => ({ data: null, error: null });

function from(tabela: string) {
  const c: Chamada = { tabela, passos: [] };
  chamadas.push(c);
  const b: Record<string, unknown> = {};
  for (const m of METODOS) b[m] = (...args: unknown[]) => { c.passos.push([m, args]); return b; };
  // Thenable: `await db.from(...).select(...)` resolve com a resposta do teste.
  b.then = (res: (v: Resposta) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve().then(() => responder(c)).then(res, rej);
  return b;
}

export const fake = {
  chamadas,
  db: { from },
  rpc: vi.fn(async (_nome: string, _args?: Record<string, unknown>): Promise<unknown> => undefined),
  getSession: vi.fn(async () => ({ data: { session: { access_token: 'jwt-de-teste' } }, error: null })),
  responder(f: (c: Chamada) => Resposta) { responder = f; },
  reiniciar() {
    chamadas.length = 0;
    responder = () => ({ data: null, error: null });
    fake.rpc.mockClear();
    fake.getSession.mockClear();
  },
  passo(c: Chamada, nome: string) { return c.passos.find((p) => p[0] === nome); },
  chamada(tabela: string, metodo: string) { return chamadas.find((c) => c.tabela === tabela && c.passos.some((p) => p[0] === metodo)); },
  chamadasDe(tabela: string, metodo: string) { return chamadas.filter((c) => c.tabela === tabela && c.passos.some((p) => p[0] === metodo)); },
};
