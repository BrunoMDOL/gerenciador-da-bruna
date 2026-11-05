// As versões do núcleo (bruna_prompt_versoes). A lista vem sem o conteúdo
// (cada versão tem ~140 mil caracteres); o conteúdo vem por versão, quando a
// tela precisa dele. Versão nova só nasce pela RPC bruna_prompt_versao_nova.
import { db, rpc, ErroDoBanco } from '@/gerenciador/lib/db';
import { auditarGestor } from '@/gerenciador/lib/auditoria';
import type { PromptVersao } from '@/gerenciador/lib/tipos';

export type VersaoDaLista = Omit<PromptVersao, 'conteudo'>;

const COLUNAS_DA_LISTA =
  'id, numero, hash, nota, origem, commit_sha, status, base_versao_id, criado_por, criado_por_email, criado_em, aprovada_em, aprovada_por_email, publicada_em, publicada_por_email, publicacao_detalhe';

export async function listarVersoes(): Promise<VersaoDaLista[]> {
  const { data, error } = await db.from('bruna_prompt_versoes').select(COLUNAS_DA_LISTA).order('numero', { ascending: false }).limit(200);
  if (error) throw new ErroDoBanco(error.message, error);
  return (data ?? []) as VersaoDaLista[];
}

/** A publicada, segundo o banco (a view bruna_prompt_atual pega a última publicada). */
export async function lerVersaoAtual(): Promise<{ id: number; numero: number } | null> {
  const { data, error } = await db.from('bruna_prompt_atual').select('id, numero').maybeSingle();
  if (error) throw new ErroDoBanco(error.message, error);
  return (data as { id: number; numero: number } | null) ?? null;
}

export async function lerConteudo(id: number): Promise<{ id: number; numero: number; conteudo: string; hash: string } | null> {
  const { data, error } = await db.from('bruna_prompt_versoes').select('id, numero, conteudo, hash').eq('id', id).maybeSingle();
  if (error) throw new ErroDoBanco(error.message, error);
  return (data as { id: number; numero: number; conteudo: string; hash: string } | null) ?? null;
}

interface NovaVersao {
  conteudo: string;
  nota: string;
  baseVersaoId: number | null;
}

/** Versão nova em rascunho, a partir de uma seção editada. Devolve o id. */
export async function criarVersaoEditada(nova: NovaVersao & { secao: string; baseNumero: number }): Promise<number> {
  const id = Number(await rpc<number>('bruna_prompt_versao_nova', {
    p_conteudo: nova.conteudo,
    p_nota: nova.nota,
    p_origem: 'gestor',
    p_base_versao_id: nova.baseVersaoId,
    p_status: 'rascunho',
  }));
  await auditarGestor({
    acao: 'gestor_nucleo_versao_criada',
    entidade: 'bruna_prompt_versoes',
    entidadeId: id,
    detalhes: { base_versao_id: nova.baseVersaoId, base_numero: nova.baseNumero, secao: nova.secao, nota: nova.nota, caracteres: nova.conteudo.length },
  });
  return id;
}

export function notaDaReversao(numero: number): string {
  return `reversão para a versão ${numero}`;
}

/**
 * "Reverter para esta": uma versão nova, em rascunho, com o conteúdo da
 * antiga. A base é a publicada (o que a reversão desfaz), para o diff mostrar
 * o que volta.
 */
export async function reverterPara(antiga: { id: number; numero: number; conteudo: string }, atual: { id: number; numero: number } | null): Promise<number> {
  const nota = notaDaReversao(antiga.numero);
  const id = Number(await rpc<number>('bruna_prompt_versao_nova', {
    p_conteudo: antiga.conteudo,
    p_nota: nota,
    p_origem: 'reversao',
    p_base_versao_id: atual?.id ?? antiga.id,
    p_status: 'rascunho',
  }));
  await auditarGestor({
    acao: 'gestor_nucleo_versao_revertida',
    entidade: 'bruna_prompt_versoes',
    entidadeId: id,
    detalhes: { para_versao_id: antiga.id, para_numero: antiga.numero, publicada_id: atual?.id ?? null, publicada_numero: atual?.numero ?? null, nota },
  });
  return id;
}

function semLinha(acao: string): Error {
  return new Error(`A versão mudou de estado antes de ${acao}. Recarregue a lista e confira.`);
}

export async function aprovarVersao(v: VersaoDaLista, email: string | null): Promise<void> {
  const agora = new Date().toISOString();
  const { data, error } = await db
    .from('bruna_prompt_versoes')
    .update({ status: 'aprovada', aprovada_em: agora, aprovada_por_email: email })
    .eq('id', v.id)
    .eq('status', 'rascunho')
    .select('id');
  if (error) throw new ErroDoBanco(error.message, error);
  if (!Array.isArray(data) || !data.length) throw semLinha('aprovar');
  await auditarGestor({ acao: 'gestor_nucleo_versao_aprovada', entidade: 'bruna_prompt_versoes', entidadeId: v.id, detalhes: { numero: v.numero, hash: v.hash } });
}

export async function descartarVersao(v: VersaoDaLista): Promise<void> {
  const { data, error } = await db
    .from('bruna_prompt_versoes')
    .update({ status: 'descartada' })
    .eq('id', v.id)
    .in('status', ['rascunho', 'aprovada'])
    .select('id');
  if (error) throw new ErroDoBanco(error.message, error);
  if (!Array.isArray(data) || !data.length) throw semLinha('descartar');
  await auditarGestor({ acao: 'gestor_nucleo_versao_descartada', entidade: 'bruna_prompt_versoes', entidadeId: v.id, detalhes: { numero: v.numero, status_anterior: v.status } });
}

/**
 * "Já subi: marcar como publicada". Primeiro marca a nova (a view passa a
 * apontar para ela pela data); depois a anterior volta a 'aprovada'. Se o
 * segundo passo falhar, a view continua certa e o erro avisa.
 */
export async function marcarPublicada(v: VersaoDaLista, anterior: { id: number; numero: number } | null, email: string | null): Promise<void> {
  const agora = new Date().toISOString();
  const mudanca: Record<string, unknown> = {
    status: 'publicada',
    publicada_em: agora,
    publicada_por_email: email,
    publicacao_detalhe: { como: 'manual', hash: v.hash, anterior: anterior ? { id: anterior.id, numero: anterior.numero } : null },
  };
  if (!v.aprovada_em) {
    mudanca.aprovada_em = agora;
    mudanca.aprovada_por_email = email;
  }
  const { data, error } = await db
    .from('bruna_prompt_versoes')
    .update(mudanca)
    .eq('id', v.id)
    .in('status', ['rascunho', 'aprovada'])
    .select('id');
  if (error) throw new ErroDoBanco(error.message, error);
  if (!Array.isArray(data) || !data.length) throw semLinha('publicar');

  let erroDaAnterior: string | null = null;
  const { data: devolvidas, error: e2 } = await db
    .from('bruna_prompt_versoes')
    .update({ status: 'aprovada' })
    .eq('status', 'publicada')
    .neq('id', v.id)
    .select('id');
  if (e2) erroDaAnterior = e2.message;
  else if (anterior && anterior.id !== v.id && !(Array.isArray(devolvidas) && devolvidas.length)) {
    // Nenhuma voltou: ou ninguém mais estava publicada (tudo certo), ou a
    // RLS recusou em silêncio. Só a releitura diz qual.
    const { data: ainda, error: e3 } = await db.from('bruna_prompt_versoes').select('id, numero').eq('status', 'publicada').neq('id', v.id);
    if (e3) erroDaAnterior = e3.message;
    else if (Array.isArray(ainda) && ainda.length) {
      erroDaAnterior = `nada foi gravado na nº ${(ainda as Array<{ numero: number }>).map((x) => x.numero).join(', ')} (sem permissão?)`;
    }
  }

  await auditarGestor({
    acao: 'gestor_nucleo_versao_publicada',
    entidade: 'bruna_prompt_versoes',
    entidadeId: v.id,
    detalhes: { numero: v.numero, hash: v.hash, como: 'manual', anterior_id: anterior?.id ?? null, anterior_numero: anterior?.numero ?? null, erro_na_anterior: erroDaAnterior },
  });
  if (erroDaAnterior) {
    throw new ErroDoBanco(`A versão nº ${v.numero} foi marcada como publicada, mas a anterior não voltou para aprovada: ${erroDaAnterior}`);
  }
}
