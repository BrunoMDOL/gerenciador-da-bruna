import type { QueryClient } from '@tanstack/react-query';

/** As chaves do react-query desta área: tudo sob ['gerenciador', 'configuracoes']. */
export const CHAVES = {
  tudo: ['gerenciador', 'configuracoes'] as const,
  config: ['gerenciador', 'configuracoes', 'config'] as const,
  regioes: ['gerenciador', 'configuracoes', 'regioes'] as const,
  versoes: ['gerenciador', 'configuracoes', 'nucleo', 'versoes'] as const,
  atual: ['gerenciador', 'configuracoes', 'nucleo', 'atual'] as const,
  conteudo: (id: number) => ['gerenciador', 'configuracoes', 'nucleo', 'conteudo', id] as const,
  instrucoes: ['gerenciador', 'configuracoes', 'instrucoes'] as const,
  historicoDaInstrucao: (id: number) => ['gerenciador', 'configuracoes', 'instrucoes', 'historico', id] as const,
  contatos: (ids: number[]) => ['gerenciador', 'configuracoes', 'contatos', ids.join(',')] as const,
  base: ['gerenciador', 'configuracoes', 'base'] as const,
  buscaNaBase: (termo: string) => ['gerenciador', 'configuracoes', 'base', 'busca', termo] as const,
  historicoDaBase: (id: number) => ['gerenciador', 'configuracoes', 'base', 'historico', id] as const,
  duvidas: ['gerenciador', 'configuracoes', 'base', 'duvidas'] as const,
  sugestoes: (tipo: string) => ['gerenciador', 'configuracoes', 'sugestoes', tipo] as const,
  auditoria: (filtro: string, dias: number | null) => ['gerenciador', 'configuracoes', 'auditoria', filtro, dias] as const,
};

/**
 * O que outras áreas mostram a partir do que muda aqui. Invalidar chave que
 * não existe não custa nada; esquecer uma deixa a outra tela velha.
 */
const OUTRAS_AREAS = {
  instrucoes: [['gerenciador', 'leads'], ['gerenciador', 'visao-geral']],
  base: [['gerenciador', 'visao-geral'], ['gerenciador', 'leads']],
  nucleo: [['gerenciador', 'visao-geral']],
  config: [['gerenciador', 'analises', 'config'], ['gerenciador', 'visao-geral'], ['gerenciador', 'leads', 'pendencias-do-gerenciador'], ['gerenciador', 'copiloto']],
  sugestoes: [['gerenciador', 'analises'], ['gerenciador', 'copiloto'], ['gerenciador', 'visao-geral']],
} as const;

export function invalidarOutrasAreas(qc: QueryClient, assunto: keyof typeof OUTRAS_AREAS): void {
  for (const chave of OUTRAS_AREAS[assunto]) void qc.invalidateQueries({ queryKey: [...chave] });
}
