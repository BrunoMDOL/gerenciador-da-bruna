// bruna_gestor_config: uma linha por assunto (copiloto, analise, regua,
// pendencias). Toda gravação parte do valor que está no banco agora (não do
// que a tela leu antes) e troca só o que mudou.
import { useQuery } from '@tanstack/react-query';
import { db, ErroDoBanco } from '@/gerenciador/lib/db';
import { auditarGestor } from '@/gerenciador/lib/auditoria';
import type { ConfigDoGerenciador } from '@/gerenciador/lib/tipos';
import { CHAVES } from '../chaves';
import { exigirLinha } from '../comum/util';

export type LinhaDeConfig = ConfigDoGerenciador<unknown>;

export interface Pendencia {
  codigo: string;
  titulo: string;
  texto?: string | null;
  desde?: string | null;
  resolvida?: boolean;
  [outro: string]: unknown;
}

// IDs e ordem de preço conferidos na skill claude-api (tabela de modelos, cache
// de 06/10/2026): Opus 5.5 custa mais que o Sonnet 5.5, que custa mais que o
// Haiku 5.5. A nota não leva número de preço: ele muda e a tela ficaria velha.
export const MODELOS = [
  { id: 'claude-opus-5-5', nome: 'Claude Opus 5.5', nota: 'padrão' },
  { id: 'claude-sonnet-5-5', nome: 'Claude Sonnet 5.5', nota: 'mais barato que o Opus' },
  { id: 'claude-haiku-5-5', nome: 'Claude Haiku 5.5', nota: 'o mais barato; para perguntas simples' },
] as const;
export const MODELO_PADRAO = 'claude-opus-5-5';
export const MAX_TOKENS_MINIMO = 1024;
export const MAX_TOKENS_MAXIMO = 32000;

export async function lerConfigs(): Promise<Record<string, LinhaDeConfig>> {
  const { data, error } = await db.from('bruna_gestor_config').select('chave, valor, descricao, atualizado_em, atualizado_por');
  if (error) throw new ErroDoBanco(error.message, error);
  const mapa: Record<string, LinhaDeConfig> = {};
  for (const linha of (data ?? []) as LinhaDeConfig[]) mapa[linha.chave] = linha;
  return mapa;
}

export function useConfigs() {
  return useQuery({ queryKey: CHAVES.config, queryFn: lerConfigs });
}

export function objeto(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === 'object' && !Array.isArray(valor) ? (valor as Record<string, unknown>) : {};
}

/** O valor de um assunto com a mudança por cima: as chaves que a tela não conhece ficam. */
export function mesclarValor(atual: unknown, mudanca: Record<string, unknown>): Record<string, unknown> {
  return { ...objeto(atual), ...mudanca };
}

export function lerPendencias(valor: unknown): Pendencia[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((p): p is Pendencia => Boolean(p) && typeof p === 'object' && typeof (p as Pendencia).codigo === 'string');
}

/** A lista inteira de volta, com só o item `codigo` trocado; os outros saem como estavam. */
export function trocarPendencia(lista: unknown, codigo: string, resolvida: boolean): unknown[] {
  if (!Array.isArray(lista)) throw new Error('a chave pendencias não é uma lista');
  let achou = false;
  const nova = lista.map((p) => {
    if (p && typeof p === 'object' && (p as Pendencia).codigo === codigo) {
      achou = true;
      return { ...(p as Pendencia), resolvida };
    }
    return p;
  });
  if (!achou) throw new Error(`a pendência "${codigo}" não está mais na lista`);
  return nova;
}

/** A pendência do nó do n8n, enquanto não estiver resolvida. */
export function pendenciaDoNo(configs: Record<string, LinhaDeConfig> | undefined): Pendencia | null {
  const p = lerPendencias(configs?.pendencias?.valor).find((x) => x.codigo === 'n8n_montar_contexto');
  return p && !p.resolvida ? p : null;
}

async function lerValorAgora(chave: string): Promise<unknown> {
  const { data, error } = await db.from('bruna_gestor_config').select('valor').eq('chave', chave).maybeSingle();
  if (error) throw new ErroDoBanco(error.message, error);
  if (!data) throw new Error(`a chave "${chave}" não existe em bruna_gestor_config`);
  return (data as { valor: unknown }).valor;
}

/**
 * Grava a chave `chave` com `calcular(valorDoBanco)` e audita
 * gestor_config_alterada com o antes e o depois.
 */
export async function salvarConfig(
  chave: string,
  calcular: (atual: unknown) => unknown,
  email: string | null,
  detalhes: Record<string, unknown> = {},
): Promise<unknown> {
  const antes = await lerValorAgora(chave);
  const depois = calcular(antes);
  const { data, error } = await db
    .from('bruna_gestor_config')
    .update({ valor: depois, atualizado_em: new Date().toISOString(), atualizado_por: email })
    .eq('chave', chave)
    .select('chave');
  if (error) throw new ErroDoBanco(error.message, error);
  exigirLinha(data);
  await auditarGestor({ acao: 'gestor_config_alterada', entidade: 'bruna_gestor_config', detalhes: { chave, antes, depois, ...detalhes } });
  return depois;
}
