// As orientações do gestor (bruna_instrucoes). O histórico nasce sozinho
// (trigger bruna_instrucoes_historico_trg); a auditoria é feita aqui, porque
// escrita direta em tabela não audita.
import { db, ErroDoBanco } from '@/gerenciador/lib/db';
import { auditarGestor } from '@/gerenciador/lib/auditoria';
import type { EscopoInstrucao, Instrucao, TurnoInstrucao } from '@/gerenciador/lib/tipos';
import { exigirLinha } from '../comum/util';

export const TITULO_MAXIMO = 120;
export const TEXTO_MAXIMO = 1500;
export const TODOS_OS_TURNOS: TurnoInstrucao[] = ['conversa', 'toque', 'retorno'];

export const TURNOS: Array<{ valor: TurnoInstrucao; rotulo: string; descricao: string }> = [
  { valor: 'conversa', rotulo: 'Conversa', descricao: 'quando responde ao cliente' },
  { valor: 'toque', rotulo: 'Toque', descricao: 'na escada de 24 h' },
  { valor: 'retorno', rotulo: 'Retorno', descricao: 'no retorno prometido' },
];

export function nomeDosTurnos(turnos: string[] | null | undefined): string {
  const nomes = (turnos ?? []).map((t) => TURNOS.find((x) => x.valor === t)?.rotulo.toLowerCase() ?? t);
  if (!nomes.length) return 'em nenhum turno';
  if (nomes.length === TURNOS.length) return 'em todos os turnos';
  return `só ${nomes.length === 1 ? 'na' : 'em'} ${nomes.join(' e ')}`;
}

export interface HistoricoDaInstrucao {
  id: number;
  instrucao_id: number;
  acao: 'criada' | 'alterada' | 'apagada';
  antes: Partial<Instrucao> | null;
  depois: Partial<Instrucao> | null;
  por_email: string | null;
  em: string;
}

/** O que o formulário grava (o escopo 'contato' só se edita; nasce na tela do lead). */
export interface FormularioDeInstrucao {
  escopo: EscopoInstrucao;
  region: string | null;
  titulo: string;
  texto: string;
  aplica_em: TurnoInstrucao[];
  prioridade: number;
  vigencia_fim: string | null;
}

export type EstadoDaInstrucao = 'viva' | 'inativa' | 'vencida' | 'agendada';

/** Viva = ativa e dentro da vigência: é a que a Bruna lê. */
export function estadoDaInstrucao(i: Instrucao, agora: Date = new Date()): EstadoDaInstrucao {
  if (!i.ativa) return 'inativa';
  if (i.vigencia_fim && new Date(i.vigencia_fim).getTime() <= agora.getTime()) return 'vencida';
  if (i.vigencia_inicio && new Date(i.vigencia_inicio).getTime() > agora.getTime()) return 'agendada';
  return 'viva';
}

const ORDEM_DO_ESCOPO: Record<EscopoInstrucao, number> = { global: 0, region: 1, contato: 2 };

/** Global, depois região, depois lead; dentro de cada, as ativas, a prioridade e a mais nova. */
export function ordenarInstrucoes(lista: Instrucao[]): Instrucao[] {
  return [...lista].sort((a, b) =>
    ORDEM_DO_ESCOPO[a.escopo] - ORDEM_DO_ESCOPO[b.escopo]
    || Number(b.ativa) - Number(a.ativa)
    || (a.region ?? '').localeCompare(b.region ?? '')
    || a.prioridade - b.prioridade
    || b.criado_em.localeCompare(a.criado_em));
}

export async function listarInstrucoes(): Promise<Instrucao[]> {
  const { data, error } = await db.from('bruna_instrucoes').select('*').order('criado_em', { ascending: false }).limit(500);
  if (error) throw new ErroDoBanco(error.message, error);
  return ordenarInstrucoes((data ?? []) as Instrucao[]);
}

export interface ContatoCurto { id: number; user_name: string | null; user_number: string | null; region: string | null }

export async function lerContatos(ids: number[]): Promise<ContatoCurto[]> {
  if (!ids.length) return [];
  const { data, error } = await db.from('contatos').select('id, user_name, user_number, region').in('id', ids);
  if (error) throw new ErroDoBanco(error.message, error);
  return (data ?? []) as ContatoCurto[];
}

export async function lerHistoricoDaInstrucao(id: number): Promise<HistoricoDaInstrucao[]> {
  const { data, error } = await db
    .from('bruna_instrucoes_historico')
    .select('id, instrucao_id, acao, antes, depois, por_email, em')
    .eq('instrucao_id', id)
    .order('em', { ascending: false })
    .limit(100);
  if (error) throw new ErroDoBanco(error.message, error);
  return (data ?? []) as HistoricoDaInstrucao[];
}

function validar(f: FormularioDeInstrucao): void {
  if (f.escopo === 'region' && !f.region) throw new Error('Escolha a região da orientação.');
  if (!f.titulo.trim() || f.titulo.trim().length > TITULO_MAXIMO) throw new Error(`O título vai de 1 a ${TITULO_MAXIMO} caracteres.`);
  if (!f.texto.trim() || f.texto.trim().length > TEXTO_MAXIMO) throw new Error(`O texto vai de 1 a ${TEXTO_MAXIMO} caracteres.`);
  if (!f.aplica_em.length) throw new Error('Marque pelo menos um turno em que a orientação vale.');
}

export async function criarInstrucao(f: FormularioDeInstrucao, quem: { userId: string | null; email: string | null }): Promise<number> {
  validar(f);
  if (f.escopo === 'contato') throw new Error('Orientação de um lead só se cria na tela do lead, em Leads.');
  const linha = {
    escopo: f.escopo,
    region: f.escopo === 'region' ? f.region : null,
    contato_id: null,
    titulo: f.titulo.trim(),
    texto: f.texto.trim(),
    aplica_em: f.aplica_em,
    prioridade: f.prioridade,
    vigencia_fim: f.vigencia_fim,
    origem: 'gestor',
    criado_por: quem.userId,
    criado_por_email: quem.email,
  };
  const { data, error } = await db.from('bruna_instrucoes').insert(linha).select('id').single();
  if (error) throw new ErroDoBanco(error.message, error);
  const id = Number((data as { id: number }).id);
  await auditarGestor({
    acao: 'gestor_instrucao_criada',
    entidade: 'bruna_instrucoes',
    entidadeId: id,
    detalhes: { escopo: linha.escopo, region: linha.region, titulo: linha.titulo, aplica_em: linha.aplica_em, prioridade: linha.prioridade, vigencia_fim: linha.vigencia_fim },
  });
  return id;
}

/** Só os campos que mudaram, para o update e para a auditoria. */
export function camposAlterados(antes: Instrucao, f: FormularioDeInstrucao): Record<string, unknown> {
  const depois: Record<string, unknown> = {
    titulo: f.titulo.trim(),
    texto: f.texto.trim(),
    aplica_em: f.aplica_em,
    prioridade: f.prioridade,
    vigencia_fim: f.vigencia_fim,
  };
  if (antes.escopo !== 'contato') {
    depois.escopo = f.escopo;
    depois.region = f.escopo === 'region' ? f.region : null;
  }
  const mudou: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(depois)) {
    const velho = (antes as unknown as Record<string, unknown>)[k];
    const igual = k === 'vigencia_fim'
      ? (velho ? new Date(String(velho)).getTime() : null) === (v ? new Date(String(v)).getTime() : null)
      : JSON.stringify(velho ?? null) === JSON.stringify(v ?? null);
    if (!igual) mudou[k] = v;
  }
  return mudou;
}

export async function alterarInstrucao(antes: Instrucao, f: FormularioDeInstrucao): Promise<boolean> {
  validar(f);
  const mudanca = camposAlterados(antes, f);
  if (!Object.keys(mudanca).length) return false;
  const { data, error } = await db.from('bruna_instrucoes').update(mudanca).eq('id', antes.id).select('id');
  if (error) throw new ErroDoBanco(error.message, error);
  exigirLinha(data);
  await auditarGestor({
    acao: 'gestor_instrucao_alterada',
    entidade: 'bruna_instrucoes',
    entidadeId: antes.id,
    contatoId: antes.contato_id,
    detalhes: { titulo: f.titulo.trim(), campos: Object.keys(mudanca), depois: mudanca },
  });
  return true;
}

export async function mudarAtiva(i: Instrucao, ativa: boolean): Promise<void> {
  const { data, error } = await db.from('bruna_instrucoes').update({ ativa }).eq('id', i.id).select('id');
  if (error) throw new ErroDoBanco(error.message, error);
  exigirLinha(data);
  await auditarGestor({
    acao: ativa ? 'gestor_instrucao_reativada' : 'gestor_instrucao_desativada',
    entidade: 'bruna_instrucoes',
    entidadeId: i.id,
    contatoId: i.contato_id,
    detalhes: { titulo: i.titulo, escopo: i.escopo, region: i.region },
  });
}
