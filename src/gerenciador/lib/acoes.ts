import { db, rpc, ErroDoBanco } from './db';
import { auditarGestor } from './auditoria';
import type { Sugestao, PromptVersao } from './tipos';
import { nomeDaCategoria, nomeDaRegiao } from './formatos';
import { rota } from '@/gerenciador/lib/rotas';

/**
 * O contrato das sugestões: o que a análise semanal e o copiloto propõem (em
 * bruna_sugestoes.acao) e o que o gerenciador aplica quando o gestor aprova.
 *
 * Quem produz uma sugestão (edge functions bruna-analise e bruna-copiloto)
 * escreve `acao` num destes formatos. Quem aplica (Análises, Copiloto,
 * Configurações) chama `aplicarSugestao`. Nada é aplicado sem o gestor clicar.
 *
 * Toda aplicação é auditada (audit_logs, action gestor_sugestao_aplicada) e
 * marca a sugestão como `aplicada` com a referência do que foi criado.
 */
export type AcaoSugerida =
  /** Orientação durável para a Bruna (linha ORIENTAÇÕES DO GESTOR). */
  | { tipo: 'instrucao_criar'; escopo: 'global' | 'region' | 'contato'; region?: string | null; contato_id?: number | null;
      titulo: string; texto: string; aplica_em?: Array<'conversa' | 'toque' | 'retorno'>; prioridade?: number; vigencia_fim?: string | null }
  | { tipo: 'instrucao_desativar'; id: number; motivo?: string }
  /** Entrada nova na base de conhecimento (tool consultar_base). */
  | { tipo: 'base_criar'; chave?: string; titulo: string; conteudo: string; categoria: string; region?: string | null;
      palavras_chave?: string[]; prioridade?: number; fonte?: string | null; confianca?: 'alta' | 'media' | null }
  | { tipo: 'base_atualizar'; id: number; campos: Partial<Pick<EntradaDaBaseEditavel, 'titulo' | 'conteudo' | 'categoria' | 'region' | 'palavras_chave' | 'prioridade' | 'ativo' | 'fonte' | 'confianca'>> }
  /** Revisão pontual para o próximo turno (só SP, RJ e Goiânia). */
  | { tipo: 'revisao_criar'; contato_id: number; tipo_revisao: string; gravidade: 'grave' | 'media' | 'leve'; erro: string; na_proxima: string; horas?: number }
  /** Pausa (ou volta) da escada de 24 h e dos retornos prometidos. */
  | { tipo: 'regua_pausar'; escada: boolean; retornos: boolean; motivo?: string | null }
  /** Ajuste numa etapa da campanha FUP90 (fup_campanha_etapas). */
  | { tipo: 'fup90_etapa_atualizar'; id: number; campos: Record<string, unknown> }
  /** Ajuste na campanha FUP90 (fup_campanhas): ativa, janelas, limites. */
  | { tipo: 'fup90_campanha_atualizar'; id: number; campos: Record<string, unknown> }
  /** Troca de um trecho do núcleo: vira uma versão nova em rascunho, nunca publica sozinha. */
  | { tipo: 'nucleo_trecho'; trecho_atual: string; trecho_novo: string; nota: string }
  /** Mescla campos numa chave de bruna_gestor_config. */
  | { tipo: 'config_atualizar'; chave: string; valor: Record<string, unknown> }
  /** Liga ou desliga a Bruna num lead (contatos.status via toggle_agent). */
  | { tipo: 'lead_bruna'; contato_id: number; ligada: boolean }
  /**
   * Acrescenta um item aos bairros foco de uma praça (sem nome_original) ou
   * altera um que já está lá (nome_original é o nome exato de hoje; tipo_original,
   * o tipo de hoje, quando muda). Na alteração, so_se, nao_se e observacao que
   * não vierem ficam como estão (lidos na hora de aplicar); vindo, substituem
   * (lista vazia apaga a regra; observacao null ou vazia apaga a nota).
   * Vai por bruna_gestor_bairro_foco_salvar, que valida, grava o histórico e audita.
   */
  | { tipo: 'bairro_foco_salvar'; region: string; tipo_item: TipoDoItemDoFoco; nome: string; so_se?: string[]; nao_se?: string[];
      observacao?: string | null; nome_original?: string | null; tipo_original?: TipoDoItemDoFoco | null; motivo?: string | null }
  /** Tira um item dos bairros foco de uma praça (bruna_gestor_bairro_foco_remover; o banco recusa o último). */
  | { tipo: 'bairro_foco_remover'; region: string; tipo_item: TipoDoItemDoFoco; nome: string; motivo?: string | null }
  /** Nada a aplicar sozinho: o gestor faz à mão seguindo as instruções. */
  | { tipo: 'manual'; instrucoes: string };

/** O tipo de um item dos bairros foco (bruna_bairros_foco.tipo): um bairro ou a cidade inteira. */
export type TipoDoItemDoFoco = 'bairro' | 'cidade';

export type TipoDeAcao = AcaoSugerida['tipo'];

interface EntradaDaBaseEditavel {
  titulo: string; conteudo: string; categoria: string; region: string | null; palavras_chave: string[];
  prioridade: number; ativo: boolean; fonte: string | null; confianca: 'alta' | 'media' | null;
}

export const NOME_DA_ACAO: Record<TipoDeAcao, string> = {
  instrucao_criar: 'Criar orientação para a Bruna',
  instrucao_desativar: 'Desativar orientação',
  base_criar: 'Adicionar à base de conhecimento',
  base_atualizar: 'Corrigir a base de conhecimento',
  revisao_criar: 'Revisão para o próximo turno',
  regua_pausar: 'Pausar ou retomar a régua',
  fup90_etapa_atualizar: 'Ajustar etapa da campanha FUP90',
  fup90_campanha_atualizar: 'Ajustar campanha FUP90',
  nucleo_trecho: 'Nova versão do núcleo (rascunho)',
  config_atualizar: 'Mudar configuração do gerenciador',
  lead_bruna: 'Ligar ou desligar a Bruna no lead',
  bairro_foco_salvar: 'Adicionar ou alterar bairro foco',
  bairro_foco_remover: 'Tirar dos bairros foco',
  manual: 'Aplicar à mão',
};

/** As ações que mexem nos bairros foco (o cartão as marca como "Bairros foco"). */
export function ehAcaoDeBairroFoco(acao: AcaoSugerida | null | undefined): acao is Extract<AcaoSugerida, { tipo: 'bairro_foco_salvar' | 'bairro_foco_remover' }> {
  return acao?.tipo === 'bairro_foco_salvar' || acao?.tipo === 'bairro_foco_remover';
}

/** Para onde levar o gestor depois de mexer nos bairros foco de uma praça. */
export function rotaDosBairrosFoco(region: string): string {
  return rota(`/bairros?praca=${encodeURIComponent(region)}`);
}

const PRACA_COM_PREPOSICAO: Record<string, string> = { sp: 'de São Paulo', rj: 'do Rio de Janeiro', goiania: 'de Goiânia' };

/** "do Rio de Janeiro", "de São Paulo", "de Goiânia". */
function daPraca(region: string | null | undefined): string {
  return PRACA_COM_PREPOSICAO[region ?? ''] ?? `de ${nomeDaRegiao(region)}`;
}

/** "Recreio" ou "Barueri (cidade inteira)". */
function rotuloDoItem(nome: string | null | undefined, tipo: TipoDoItemDoFoco | null | undefined): string {
  const n = String(nome ?? '').trim();
  return tipo === 'cidade' ? `${n} (cidade inteira)` : n;
}

/** ["a", "b", "c"] -> "a, b ou c". */
function juntarComOu(partes: string[]): string {
  return partes.length <= 1 ? partes[0] ?? '' : `${partes.slice(0, -1).join(', ')} ou ${partes[partes.length - 1]}`;
}

/**
 * As exceções em texto claro. Lista vazia só diz algo na alteração, quando
 * ela apaga o que havia ("em qualquer cidade", "sem termos que barram").
 */
function excecoesLegiveis(soSe: string[] | undefined, naoSe: string[] | undefined, alteracao: boolean): string {
  const partes: string[] = [];
  if (soSe?.length) partes.push(`só se a cidade for ${juntarComOu(soSe)}`);
  else if (alteracao && soSe) partes.push('em qualquer cidade');
  if (naoSe?.length) partes.push(`não vale para: ${naoSe.join(', ')}`);
  else if (alteracao && naoSe) partes.push('sem termos que barram');
  return partes.join('; ');
}

export interface Aplicador {
  email: string | null;
  userId: string | null;
}

export interface ResultadoDaAplicacao {
  /** Referência gravada em bruna_sugestoes.aplicada_ref, ex.: "bruna_instrucoes:12". */
  ref: string;
  /** Frase para o toast e para o histórico. */
  mensagem: string;
  /** Para onde a interface pode levar o gestor depois (rota dentro do gerenciador). */
  rota?: string;
}

export class AcaoInvalida extends Error {
  constructor(message: string) { super(message); this.name = 'AcaoInvalida'; }
}

/** Lê e valida bruna_sugestoes.acao. Devolve null quando não há ação automática. */
export function lerAcao(acao: unknown): AcaoSugerida | null {
  if (!acao || typeof acao !== 'object') return null;
  const a = acao as Record<string, unknown>;
  if (typeof a.tipo !== 'string' || !(a.tipo in NOME_DA_ACAO)) return null;
  return a as unknown as AcaoSugerida;
}

const texto = (v: unknown, nome: string, max = 5000): string => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) throw new AcaoInvalida(`a ação não trouxe "${nome}"`);
  if (s.length > max) throw new AcaoInvalida(`"${nome}" passa de ${max} caracteres`);
  return s;
};

const numero = (v: unknown, nome: string): number => {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) throw new AcaoInvalida(`a ação não trouxe "${nome}"`);
  return n;
};

const tipoDoItem = (v: unknown, nome: string): TipoDoItemDoFoco => {
  if (v === 'bairro' || v === 'cidade') return v;
  throw new AcaoInvalida(`"${nome}" precisa ser bairro ou cidade`);
};

/** Lista de termos (so_se, nao_se): undefined quando não veio; espaços colapsados, sem vazios. Quem valida tamanho e repetição é o banco. */
const termosDaAcao = (v: unknown, nome: string): string[] | undefined => {
  if (v === undefined || v === null) return undefined;
  if (!Array.isArray(v)) throw new AcaoInvalida(`"${nome}" precisa ser uma lista`);
  return v.map((t) => String(t ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean);
};

/** Texto opcional: null quando não veio ou veio vazio. */
const textoOuNulo = (v: unknown, nome: string, max: number): string | null => {
  if (v === undefined || v === null) return null;
  if (typeof v !== 'string') throw new AcaoInvalida(`"${nome}" precisa ser texto`);
  const s = v.trim();
  if (s.length > max) throw new AcaoInvalida(`"${nome}" passa de ${max} caracteres`);
  return s || null;
};

const MOTIVO_MAXIMO_DO_FOCO = 300;

/**
 * O motivo que vai para o histórico dos bairros foco: o da sugestão e de onde
 * ela veio ("Recreio pedido por 6 leads (sugestão nº 41, do copiloto)").
 */
function motivoDoFoco(motivo: unknown, s: Sugestao): string {
  const origem = s.origem === 'copiloto' ? 'do copiloto' : s.origem === 'analise' ? `da análise${s.analise_id ? ` nº ${s.analise_id}` : ''}` : 'do gestor';
  const ref = `sugestão nº ${s.id}, ${origem}`;
  const m = typeof motivo === 'string' ? motivo.replace(/\s+/g, ' ').trim() : '';
  if (!m) return ref;
  const cabe = MOTIVO_MAXIMO_DO_FOCO - ref.length - 3;
  return `${m.length > cabe ? `${m.slice(0, cabe - 1).trimEnd()}…` : m} (${ref})`;
}

/** O que bruna_gestor_bairro_foco_salvar devolve (o tipo completo está em areas/bairros/tipos.ts). */
interface ResultadoDoSalvarNoFoco {
  ok: boolean;
  acao: 'criado' | 'alterado';
  historico_id?: number | null;
  item: { tipo: TipoDoItemDoFoco; nome: string } | null;
  avisos: string[] | null;
}

/** Chave da base a partir do título: "Garantia da Orion" -> "garantia_da_orion". */
export function chaveDaBase(titulo: string): string {
  return titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'entrada';
}

async function origemDaInstrucao(s: Sugestao): Promise<'gestor' | 'copiloto' | 'analise'> {
  return s.origem === 'gestor' ? 'gestor' : s.origem;
}

/**
 * Aplica a ação de uma sugestão aprovada. Lança AcaoInvalida (ação malformada
 * ou impossível) ou ErroDoBanco. Em caso de sucesso, marca a sugestão como
 * aplicada e audita.
 */
export async function aplicarSugestao(s: Sugestao, quem: Aplicador): Promise<ResultadoDaAplicacao> {
  const acao = lerAcao(s.acao);
  if (!acao) throw new AcaoInvalida('esta sugestão não tem ação automática; aplique à mão e marque como aplicada');
  if (s.status === 'aplicada') throw new AcaoInvalida('esta sugestão já foi aplicada');
  if (s.status === 'rejeitada' || s.status === 'descartada') throw new AcaoInvalida('esta sugestão foi rejeitada; reabra antes de aplicar');

  const resultado = await executar(acao, s, quem);

  const agora = new Date().toISOString();
  const { error } = await db.from('bruna_sugestoes').update({
    status: 'aplicada',
    aplicada_em: agora,
    aplicada_ref: resultado.ref,
    decidida_por_email: s.decidida_por_email ?? quem.email,
    decidida_em: s.decidida_em ?? agora,
  }).eq('id', s.id);
  if (error) throw new ErroDoBanco(error.message, error);

  await auditarGestor({
    acao: 'gestor_sugestao_aplicada',
    entidade: 'bruna_sugestoes',
    entidadeId: s.id,
    contatoId: 'contato_id' in acao && typeof acao.contato_id === 'number' ? acao.contato_id : null,
    detalhes: { tipo: acao.tipo, ref: resultado.ref, titulo: s.titulo, origem: s.origem },
  });
  return resultado;
}

/** Aprova, rejeita ou descarta sem aplicar. */
export async function decidirSugestao(s: Sugestao, status: 'aprovada' | 'rejeitada' | 'descartada' | 'pendente', quem: Aplicador, motivo?: string): Promise<void> {
  const agora = new Date().toISOString();
  const { error } = await db.from('bruna_sugestoes').update({
    status,
    decidida_por_email: status === 'pendente' ? null : quem.email,
    decidida_em: status === 'pendente' ? null : agora,
    motivo_decisao: motivo ?? null,
  }).eq('id', s.id);
  if (error) throw new ErroDoBanco(error.message, error);
  await auditarGestor({ acao: `gestor_sugestao_${status}`, entidade: 'bruna_sugestoes', entidadeId: s.id, detalhes: { titulo: s.titulo, motivo: motivo ?? null } });
}

async function executar(acao: AcaoSugerida, s: Sugestao, quem: Aplicador): Promise<ResultadoDaAplicacao> {
  switch (acao.tipo) {
    case 'instrucao_criar': {
      const escopo = acao.escopo;
      if (!['global', 'region', 'contato'].includes(escopo)) throw new AcaoInvalida('escopo da orientação inválido');
      if (escopo === 'region' && !acao.region) throw new AcaoInvalida('orientação por praça sem a praça');
      if (escopo === 'contato' && !acao.contato_id) throw new AcaoInvalida('orientação por lead sem o lead');
      const linha = {
        escopo,
        region: escopo === 'region' ? acao.region : null,
        contato_id: escopo === 'contato' ? numero(acao.contato_id, 'contato_id') : null,
        titulo: texto(acao.titulo, 'titulo', 120),
        texto: texto(acao.texto, 'texto', 1500),
        aplica_em: Array.isArray(acao.aplica_em) && acao.aplica_em.length ? acao.aplica_em : ['conversa', 'toque', 'retorno'],
        prioridade: typeof acao.prioridade === 'number' ? acao.prioridade : 100,
        vigencia_fim: acao.vigencia_fim ?? null,
        origem: await origemDaInstrucao(s),
        sugestao_id: s.id,
        criado_por: quem.userId,
        criado_por_email: quem.email,
      };
      const { data, error } = await db.from('bruna_instrucoes').insert(linha).select('id').single();
      if (error) throw new ErroDoBanco(error.message, error);
      return { ref: `bruna_instrucoes:${data.id}`, mensagem: 'Orientação criada. A Bruna passa a ler no próximo turno.',
               rota: escopo === 'contato' ? rota(`/leads/${linha.contato_id}`) : rota('/configuracoes/instrucoes') };
    }
    case 'instrucao_desativar': {
      const id = numero(acao.id, 'id');
      const { error } = await db.from('bruna_instrucoes').update({ ativa: false }).eq('id', id);
      if (error) throw new ErroDoBanco(error.message, error);
      return { ref: `bruna_instrucoes:${id}`, mensagem: 'Orientação desativada.', rota: rota('/configuracoes/instrucoes') };
    }
    case 'base_criar': {
      const titulo = texto(acao.titulo, 'titulo', 200);
      const base = {
        chave: acao.chave ? chaveDaBase(acao.chave) : chaveDaBase(titulo),
        titulo,
        conteudo: texto(acao.conteudo, 'conteudo', 6000),
        categoria: texto(acao.categoria, 'categoria', 40),
        region: acao.region ?? null,
        palavras_chave: Array.isArray(acao.palavras_chave) ? acao.palavras_chave.map(String) : [],
        prioridade: typeof acao.prioridade === 'number' ? acao.prioridade : 100,
        fonte: acao.fonte ?? `sugestão ${s.id} (${s.origem})`,
        confianca: acao.confianca ?? 'media',
        ativo: true,
      };
      let tentativa = 0;
      // chave é única: em conflito, numera.
      for (;;) {
        const chave = tentativa ? `${base.chave}_${tentativa + 1}` : base.chave;
        const { data, error } = await db.from('bruna_conhecimento').insert({ ...base, chave }).select('id').single();
        if (!error) return { ref: `bruna_conhecimento:${data.id}`, mensagem: 'Entrada criada na base de conhecimento.', rota: rota('/configuracoes/base') };
        if (error.code === '23505' && tentativa < 5) { tentativa++; continue; }
        throw new ErroDoBanco(error.message, error);
      }
    }
    case 'base_atualizar': {
      const id = numero(acao.id, 'id');
      const campos = acao.campos && typeof acao.campos === 'object' ? acao.campos : null;
      if (!campos || !Object.keys(campos).length) throw new AcaoInvalida('a correção da base não trouxe campos');
      const permitidos = ['titulo', 'conteudo', 'categoria', 'region', 'palavras_chave', 'prioridade', 'ativo', 'fonte', 'confianca'];
      const atualizacao = Object.fromEntries(Object.entries(campos).filter(([k]) => permitidos.includes(k)));
      if (!Object.keys(atualizacao).length) throw new AcaoInvalida('nenhum campo válido para a base');
      const { error } = await db.from('bruna_conhecimento').update(atualizacao).eq('id', id);
      if (error) throw new ErroDoBanco(error.message, error);
      return { ref: `bruna_conhecimento:${id}`, mensagem: 'Base de conhecimento corrigida (a versão anterior fica no histórico).', rota: rota('/configuracoes/base') };
    }
    case 'revisao_criar': {
      const contatoId = numero(acao.contato_id, 'contato_id');
      const r = await rpc<{ ok: boolean; id: number }>('bruna_gestor_revisao_criar', {
        p_contato_id: contatoId,
        p_tipo: texto(acao.tipo_revisao ?? 'outro', 'tipo_revisao', 60),
        p_gravidade: ['grave', 'media', 'leve'].includes(acao.gravidade) ? acao.gravidade : 'media',
        p_erro: texto(acao.erro, 'erro', 400),
        p_na_proxima: texto(acao.na_proxima, 'na_proxima', 400),
        p_horas: typeof acao.horas === 'number' ? acao.horas : 72,
      });
      return { ref: `bruna_revisoes:${r.id}`, mensagem: 'Revisão gravada. A Bruna lê na próxima mensagem deste lead.', rota: rota(`/leads/${contatoId}`) };
    }
    case 'regua_pausar': {
      await rpc('bruna_gestor_pausar_regua', { p_escada: Boolean(acao.escada), p_retornos: Boolean(acao.retornos), p_motivo: acao.motivo ?? null });
      const estado = `${acao.escada ? 'escada pausada' : 'escada ligada'}, ${acao.retornos ? 'retornos pausados' : 'retornos ligados'}`;
      return { ref: 'bruna_gestor_config:regua', mensagem: `Régua: ${estado}.`, rota: rota('/regua') };
    }
    case 'fup90_etapa_atualizar': {
      const id = numero(acao.id, 'id');
      const permitidos = ['offset_dias', 'temperatura', 'objetivo', 'template_name', 'template_lang', 'variaveis', 'condicional', 'min_leituras', 'ativo', 'template_body'];
      const campos = Object.fromEntries(Object.entries(acao.campos ?? {}).filter(([k]) => permitidos.includes(k)));
      if (!Object.keys(campos).length) throw new AcaoInvalida('nenhum campo válido para a etapa');
      const { error } = await db.from('fup_campanha_etapas').update(campos).eq('id', id);
      if (error) throw new ErroDoBanco(error.message, error);
      return { ref: `fup_campanha_etapas:${id}`, mensagem: 'Etapa da campanha FUP90 ajustada.', rota: rota('/regua/fup90') };
    }
    case 'fup90_campanha_atualizar': {
      const id = numero(acao.id, 'id');
      const permitidos = ['nome', 'ativa', 'regioes', 'tags_bloqueantes', 'tags_pausantes', 'hora_inicio', 'hora_fim', 'hora_overflow', 'jitter_min',
        'jitter_janela_min', 'envia_fim_semana', 'janela_min_horas', 'janela_max_dias', 'intervalo_min_horas', 'limite_inscricao_dia', 'limite_envio_dia', 'teto_toques_total'];
      const campos = Object.fromEntries(Object.entries(acao.campos ?? {}).filter(([k]) => permitidos.includes(k)));
      if (!Object.keys(campos).length) throw new AcaoInvalida('nenhum campo válido para a campanha');
      const { error } = await db.from('fup_campanhas').update(campos).eq('id', id);
      if (error) throw new ErroDoBanco(error.message, error);
      return { ref: `fup_campanhas:${id}`, mensagem: 'Campanha FUP90 ajustada.', rota: rota('/regua/fup90') };
    }
    case 'nucleo_trecho': {
      const de = texto(acao.trecho_atual, 'trecho_atual', 20000);
      const para = typeof acao.trecho_novo === 'string' ? acao.trecho_novo : '';
      const { data: atual, error } = await db.from('bruna_prompt_atual').select('*').maybeSingle();
      if (error) throw new ErroDoBanco(error.message, error);
      const versao = atual as PromptVersao | null;
      if (!versao) throw new AcaoInvalida('não há versão publicada do núcleo no banco');
      const vezes = versao.conteudo.split(de).length - 1;
      if (vezes === 0) throw new AcaoInvalida('o trecho atual não está no núcleo publicado (pode ter mudado desde a sugestão)');
      if (vezes > 1) throw new AcaoInvalida(`o trecho atual aparece ${vezes} vezes no núcleo; a sugestão precisa de um trecho único`);
      const conteudo = versao.conteudo.replace(de, para);
      const id = await rpc<number>('bruna_prompt_versao_nova', {
        p_conteudo: conteudo,
        p_nota: texto(acao.nota ?? s.titulo, 'nota', 500),
        p_origem: s.origem === 'copiloto' ? 'copiloto' : 'analise',
        p_base_versao_id: versao.id,
        p_status: 'rascunho',
      });
      return { ref: `bruna_prompt_versoes:${id}`, mensagem: 'Versão nova do núcleo criada como rascunho. Revise e publique em Configurações › Núcleo.', rota: rota(`/configuracoes/nucleo?versao=${id}`) };
    }
    case 'config_atualizar': {
      const chave = texto(acao.chave, 'chave', 40);
      if (!acao.valor || typeof acao.valor !== 'object') throw new AcaoInvalida('a configuração não trouxe o valor');
      const { data: linha, error: e1 } = await db.from('bruna_gestor_config').select('valor').eq('chave', chave).maybeSingle();
      if (e1) throw new ErroDoBanco(e1.message, e1);
      if (!linha) throw new AcaoInvalida(`a chave de configuração "${chave}" não existe`);
      const valor = { ...(linha.valor as Record<string, unknown>), ...acao.valor };
      const { error } = await db.from('bruna_gestor_config').update({ valor, atualizado_em: new Date().toISOString(), atualizado_por: quem.email }).eq('chave', chave);
      if (error) throw new ErroDoBanco(error.message, error);
      return { ref: `bruna_gestor_config:${chave}`, mensagem: `Configuração "${chave}" atualizada.`, rota: rota('/configuracoes/geral') };
    }
    case 'lead_bruna': {
      const contatoId = numero(acao.contato_id, 'contato_id');
      const { data: c, error: e1 } = await db.from('contatos').select('user_number').eq('id', contatoId).maybeSingle();
      if (e1) throw new ErroDoBanco(e1.message, e1);
      if (!c?.user_number) throw new AcaoInvalida(`contato ${contatoId} não existe`);
      await rpc('toggle_agent', { phone: c.user_number, new_status: acao.ligada ? 'on' : 'off' });
      return { ref: `contatos:${contatoId}`, mensagem: acao.ligada ? 'Bruna ligada neste lead.' : 'Bruna desligada neste lead.', rota: rota(`/leads/${contatoId}`) };
    }
    // Bairros foco: as RPCs conferem a permissão, validam, gravam o histórico
    // (origem gestor, com o motivo) e auditam (gestor_bairro_foco_*). Aqui não
    // se audita de novo a mudança; a aplicação da sugestão é auditada no fim.
    case 'bairro_foco_salvar': {
      const region = texto(acao.region, 'region', 40);
      const tipoItem = tipoDoItem(acao.tipo_item, 'tipo_item');
      const nome = texto(acao.nome, 'nome', 80);
      const nomeOriginal = textoOuNulo(acao.nome_original, 'nome_original', 80);
      const tipoOriginal = nomeOriginal ? (acao.tipo_original ? tipoDoItem(acao.tipo_original, 'tipo_original') : tipoItem) : null;
      let soSe = termosDaAcao(acao.so_se, 'so_se');
      let naoSe = termosDaAcao(acao.nao_se, 'nao_se');
      let observacao = acao.observacao === undefined ? undefined : textoOuNulo(acao.observacao, 'observacao', 300);
      if (nomeOriginal) {
        // A RPC substitui as exceções e a observação: o que a sugestão não
        // trouxe sai do que está gravado agora, para não apagar sem querer.
        const { data: atual, error } = await db.from('bruna_bairros_foco').select('so_se, nao_se, observacao')
          .eq('region', region).eq('tipo', tipoOriginal).eq('nome', nomeOriginal).maybeSingle();
        if (error) throw new ErroDoBanco(error.message, error);
        if (!atual) throw new AcaoInvalida(`"${nomeOriginal}" não está mais nos bairros foco ${daPraca(region)}: a lista mudou depois da sugestão. Abra Bairros foco e confira.`);
        const gravado = atual as { so_se: string[] | null; nao_se: string[] | null; observacao: string | null };
        soSe ??= gravado.so_se ?? [];
        naoSe ??= gravado.nao_se ?? [];
        if (observacao === undefined) observacao = gravado.observacao ?? null;
      }
      const r = await rpc<ResultadoDoSalvarNoFoco>('bruna_gestor_bairro_foco_salvar', {
        p_region: region,
        p_tipo: tipoItem,
        p_nome: nome,
        p_so_se: soSe ?? [],
        p_nao_se: naoSe ?? [],
        p_observacao: observacao ?? null,
        p_nome_original: nomeOriginal,
        p_tipo_original: tipoOriginal,
        p_depois_de: null,
        p_motivo: motivoDoFoco(acao.motivo, s),
      });
      const final = r?.item?.nome ?? nome;
      const avisos = (r?.avisos ?? []).filter((a) => typeof a === 'string' && a.trim());
      const nadaMudou = r?.acao === 'alterado' && r.historico_id == null;
      const frase = nadaMudou
        ? `Nada mudou: ${final} já estava assim nos bairros foco ${daPraca(region)}.`
        : r?.acao === 'criado'
          ? `${final} entrou nos bairros foco ${daPraca(region)}.`
          : `${final} mudou nos bairros foco ${daPraca(region)}.`;
      return {
        ref: r?.historico_id ? `bruna_bairros_foco_historico:${r.historico_id}` : `bruna_bairros_foco:${region}/${r?.item?.tipo ?? tipoItem}/${final}`,
        // O aviso "Nada mudou" do banco já está na frase.
        mensagem: [frase, ...(nadaMudou ? [] : avisos)].join(' '),
        rota: rotaDosBairrosFoco(region),
      };
    }
    case 'bairro_foco_remover': {
      const region = texto(acao.region, 'region', 40);
      const tipoItem = tipoDoItem(acao.tipo_item, 'tipo_item');
      const nome = texto(acao.nome, 'nome', 80);
      let r: { ok: boolean; historico_id: number | null } | null;
      try {
        r = await rpc<{ ok: boolean; historico_id: number | null }>('bruna_gestor_bairro_foco_remover', {
          p_region: region,
          p_tipo: tipoItem,
          p_nome: nome,
          p_motivo: motivoDoFoco(acao.motivo, s),
        });
      } catch (e) {
        // PGRST202: a função não está no banco (a migration 20261105040200 ainda não entrou).
        if (e instanceof ErroDoBanco && (e.detalhe as { code?: string } | undefined)?.code === 'PGRST202') {
          throw new AcaoInvalida('tirar um item dos bairros foco ainda não funciona: falta aplicar no banco a migration de remover e desfazer (20261105040200). A sugestão continua pendente até lá.');
        }
        throw e;
      }
      return {
        ref: r?.historico_id ? `bruna_bairros_foco_historico:${r.historico_id}` : `bruna_bairros_foco:${region}/${tipoItem}/${nome}`,
        mensagem: `${nome} saiu dos bairros foco ${daPraca(region)}.`,
        rota: rotaDosBairrosFoco(region),
      };
    }
    case 'manual':
      throw new AcaoInvalida('esta sugestão é para aplicar à mão: siga as instruções e marque como aplicada');
    default:
      throw new AcaoInvalida('tipo de ação desconhecido');
  }
}

/** Marca como aplicada uma sugestão que o gestor aplicou à mão (tipo manual ou sem ação). */
export async function marcarAplicadaAMao(s: Sugestao, quem: Aplicador, nota?: string): Promise<void> {
  const agora = new Date().toISOString();
  const { error } = await db.from('bruna_sugestoes').update({
    status: 'aplicada', aplicada_em: agora, aplicada_ref: 'manual',
    decidida_por_email: s.decidida_por_email ?? quem.email, decidida_em: s.decidida_em ?? agora,
    motivo_decisao: nota ?? s.motivo_decisao ?? null,
  }).eq('id', s.id);
  if (error) throw new ErroDoBanco(error.message, error);
  await auditarGestor({ acao: 'gestor_sugestao_aplicada', entidade: 'bruna_sugestoes', entidadeId: s.id, detalhes: { tipo: 'manual', titulo: s.titulo, nota: nota ?? null } });
}

/** Descreve em uma frase o que a ação vai fazer, a partir de bruna_sugestoes.acao. */
export function descreverAcao(acao: unknown): string | null {
  const a = lerAcao(acao);
  if (!a) return null;
  switch (a.tipo) {
    case 'instrucao_criar':
      return `${NOME_DA_ACAO[a.tipo]} (${a.escopo === 'global' ? 'todas as conversas' : a.escopo === 'region' ? `praça ${nomeDaRegiao(a.region ?? '')}` : `lead ${a.contato_id}`}): “${a.titulo}”`;
    case 'instrucao_desativar': return `${NOME_DA_ACAO[a.tipo]} nº ${a.id}`;
    case 'base_criar': return `${NOME_DA_ACAO[a.tipo]}: “${a.titulo}” (${nomeDaCategoria(String(a.categoria ?? ''))})`;
    case 'base_atualizar': return `${NOME_DA_ACAO[a.tipo]} nº ${a.id}: ${Object.keys(a.campos ?? {}).join(', ')}`;
    case 'revisao_criar': return `${NOME_DA_ACAO[a.tipo]} no lead ${a.contato_id} (${a.gravidade})`;
    case 'regua_pausar': return `${NOME_DA_ACAO[a.tipo]}: escada ${a.escada ? 'pausada' : 'ligada'}, retornos ${a.retornos ? 'pausados' : 'ligados'}`;
    case 'fup90_etapa_atualizar': return `${NOME_DA_ACAO[a.tipo]} nº ${a.id}: ${Object.keys(a.campos ?? {}).join(', ')}`;
    case 'fup90_campanha_atualizar': return `${NOME_DA_ACAO[a.tipo]}: ${Object.keys(a.campos ?? {}).join(', ')}`;
    case 'nucleo_trecho': return `${NOME_DA_ACAO[a.tipo]}: troca um trecho de ${a.trecho_atual?.length ?? 0} caracteres`;
    case 'config_atualizar': return `${NOME_DA_ACAO[a.tipo]} “${a.chave}”`;
    case 'lead_bruna': return `${a.ligada ? 'Ligar' : 'Desligar'} a Bruna no lead ${a.contato_id}`;
    case 'bairro_foco_salvar': {
      const onde = `bairros foco ${daPraca(a.region)}`;
      const novo = rotuloDoItem(a.nome, a.tipo_item);
      const alteracao = Boolean(a.nome_original);
      const excecoes = excecoesLegiveis(Array.isArray(a.so_se) ? a.so_se : undefined, Array.isArray(a.nao_se) ? a.nao_se : undefined, alteracao);
      const cauda = excecoes ? ` (${excecoes})` : '';
      if (!alteracao) return `Adicionar ${novo} aos ${onde}${cauda}`;
      const tipoAntes = a.tipo_original ?? a.tipo_item;
      if (a.nome_original !== a.nome || tipoAntes !== a.tipo_item) return `Trocar ${rotuloDoItem(a.nome_original, tipoAntes)} por ${novo} nos ${onde}${cauda}`;
      const mudaExcecoes = a.so_se !== undefined || a.nao_se !== undefined;
      // observacao null (ou vazia) apaga a nota: o cartão diz isso com todas as letras.
      const apagaNota = a.observacao !== undefined && !(typeof a.observacao === 'string' && a.observacao.trim());
      if (apagaNota) return `${mudaExcecoes ? 'Mudar as exceções e apagar a observação' : 'Apagar a observação'} de ${novo} nos ${onde}${cauda}`;
      const oQue = [mudaExcecoes ? 'as exceções' : null, a.observacao !== undefined ? 'a observação' : null].filter(Boolean).join(' e ');
      return `Mudar ${oQue ? `${oQue} de ` : ''}${novo} nos ${onde}${cauda}`;
    }
    case 'bairro_foco_remover': return `Tirar ${rotuloDoItem(a.nome, a.tipo_item)} dos bairros foco ${daPraca(a.region)}`;
    case 'manual': return 'Aplicar à mão (o gerenciador não faz sozinho)';
    default: return null;
  }
}
