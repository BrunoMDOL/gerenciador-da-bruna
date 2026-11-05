// Custo de uma rodada da análise, a partir do `usage` que a API da Anthropic
// devolve. Módulo puro (sem Deno, sem npm:) para o vitest cobrir.
//
// Preços de claude-opus-5-5, em US$ por milhão de tokens: entrada 4, escrita
// de cache 5 (1,25x), leitura de cache 0,20 (0,05x), saída 20. O custo é
// arredondado em 4 casas, que é o que a coluna bruna_analises.custo_usd
// (numeric(10,4)) guarda.

export const PRECOS_USD_POR_MILHAO = {
  entrada: 4,
  escrita_de_cache: 5,
  leitura_de_cache: 0.2,
  saida: 20,
} as const;

/** O que interessa do `usage` do SDK (os outros campos ficam de fora). */
export interface UsoDoModelo {
  input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  output_tokens?: number | null;
}

export interface UsoResumido {
  input_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  output_tokens: number;
}

const inteiro = (v: number | null | undefined): number =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : 0;

/** Só os quatro contadores, sempre como número (null e ausente viram 0). */
export function resumirUso(uso: UsoDoModelo | null | undefined): UsoResumido {
  return {
    input_tokens: inteiro(uso?.input_tokens),
    cache_creation_input_tokens: inteiro(uso?.cache_creation_input_tokens),
    cache_read_input_tokens: inteiro(uso?.cache_read_input_tokens),
    output_tokens: inteiro(uso?.output_tokens),
  };
}

/** Tudo o que entrou no prompt: o que foi cobrado inteiro, o que escreveu e o que leu do cache. */
export function tokensDeEntrada(uso: UsoDoModelo | null | undefined): number {
  const u = resumirUso(uso);
  return u.input_tokens + u.cache_creation_input_tokens + u.cache_read_input_tokens;
}

export function tokensDeSaida(uso: UsoDoModelo | null | undefined): number {
  return resumirUso(uso).output_tokens;
}

/** custo_usd = input*4/1e6 + cache_creation*5/1e6 + cache_read*0,2/1e6 + output*20/1e6, em 4 casas. */
export function calcularCustoUsd(uso: UsoDoModelo | null | undefined): number {
  const u = resumirUso(uso);
  const total =
    u.input_tokens * PRECOS_USD_POR_MILHAO.entrada +
    u.cache_creation_input_tokens * PRECOS_USD_POR_MILHAO.escrita_de_cache +
    u.cache_read_input_tokens * PRECOS_USD_POR_MILHAO.leitura_de_cache +
    u.output_tokens * PRECOS_USD_POR_MILHAO.saida;
  return Math.round((total / 1_000_000) * 10_000) / 10_000;
}
