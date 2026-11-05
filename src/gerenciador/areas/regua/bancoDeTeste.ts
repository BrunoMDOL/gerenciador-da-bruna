// Um db.from() falso para os testes da Régua: guarda cada chamada (tabela,
// operação, valores, filtros) e responde o que o teste mandar. Só usado em
// arquivos *.test.tsx.
import { vi } from 'vitest';

export interface ChamadaAoBanco {
  tabela: string;
  operacao: 'select' | 'update' | 'insert' | 'delete';
  colunas?: string;
  opcoes?: { count?: string; head?: boolean };
  valores?: unknown;
  filtros: Array<[string, ...unknown[]]>;
}

export interface RespostaDoBanco {
  data?: unknown;
  error?: { message: string; code?: string } | null;
  count?: number | null;
}

type Construtor = Record<string, (...args: unknown[]) => Construtor> & PromiseLike<RespostaDoBanco>;

const FILTROS = ['eq', 'neq', 'in', 'is', 'not', 'lt', 'lte', 'gt', 'gte', 'order', 'limit', 'range', 'ilike', 'or', 'match', 'single', 'maybeSingle'];

export function criarBanco(responder: (c: ChamadaAoBanco) => RespostaDoBanco | Promise<RespostaDoBanco>) {
  const chamadas: ChamadaAoBanco[] = [];
  const from = vi.fn((tabela: string) => {
    const c: ChamadaAoBanco = { tabela, operacao: 'select', filtros: [] };
    chamadas.push(c);
    const b = {} as Construtor;
    b.select = (colunas?: unknown, opcoes?: unknown) => {
      if (c.operacao === 'select') {
        c.colunas = colunas as string;
        c.opcoes = opcoes as ChamadaAoBanco['opcoes'];
      }
      return b;
    };
    b.update = (v: unknown) => { c.operacao = 'update'; c.valores = v; return b; };
    b.insert = (v: unknown) => { c.operacao = 'insert'; c.valores = v; return b; };
    b.delete = () => { c.operacao = 'delete'; return b; };
    for (const m of FILTROS) b[m] = (...args: unknown[]) => { c.filtros.push([m, ...args]); return b; };
    (b as { then: PromiseLike<RespostaDoBanco>['then'] }).then = (ok, falha) =>
      Promise.resolve()
        .then(() => responder(c))
        .then((r) => ({ data: null, error: null, count: null, ...r }))
        .then(ok, falha);
    return b;
  });
  /** O valor de um filtro .eq(coluna, valor) da chamada. */
  const filtro = (c: ChamadaAoBanco, metodo: string, coluna: string) => c.filtros.find((f) => f[0] === metodo && f[1] === coluna)?.[2];
  const doTipo = (tabela: string, operacao: ChamadaAoBanco['operacao']) => chamadas.filter((c) => c.tabela === tabela && c.operacao === operacao);
  return { from, chamadas, filtro, doTipo };
}
