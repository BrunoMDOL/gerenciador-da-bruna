// Dados de teste copiados da forma real do banco (projeto tcluzvtubvctkrnychwy,
// lidos em 05/11/2026). Onde a tabela ainda está vazia (bruna_instrucoes,
// histórico, audit_logs gestor_*), as linhas seguem as colunas e os checks da
// migration da fundação.
import type { EntradaDaBase, Instrucao } from '@/gerenciador/lib/tipos';
import type { LinhaDeConfig } from '../geral/dados';
import type { VersaoDaLista } from '../nucleo/dados';
import type { Regiao } from '../comum/regioes';
import type { HistoricoDaBase, Duvida } from '../base/dados';
import type { HistoricoDaInstrucao } from '../instrucoes/dados';
import type { LinhaDaAuditoria } from '../auditoria/dados';
import { NUCLEO_V1 } from './nucleo';

export { NUCLEO_V1 };

export const GESTOR = { id: 'e5c6a1d2-0b4f-4f1e-9c3a-7d8e9f0a1b2c', email: 'bruno@besserhome.com.br' };

// ---------------------------------------------------------------------------
// Núcleo
// ---------------------------------------------------------------------------
export const VERSAO_1: VersaoDaLista = {
  id: 1,
  numero: 1,
  hash: '1c7754c796fb805171002837e2a719a4fa51a4b388c10199fbef4a4f5193109b',
  nota: 'Núcleo que está no ar em 04/11/2026: docs/bruna/prompt-nucleo-v3.md no commit 65de036 (main). Registrado pelo gerenciador.',
  origem: 'repo',
  commit_sha: '65de036cf07e798678447738a92e4d2e6d2823ee',
  status: 'publicada',
  base_versao_id: null,
  criado_por: null,
  criado_por_email: 'ia.besser@besserhome.com.br',
  criado_em: '2026-11-05T02:38:54.58434+00:00',
  aprovada_em: null,
  aprovada_por_email: null,
  publicada_em: '2026-11-05T02:38:54.58434+00:00',
  publicada_por_email: 'ia.besser@besserhome.com.br',
  publicacao_detalhe: null,
};

/** Um rascunho do gestor que troca uma linha de "### Mensagens e bolhas". */
export const CONTEUDO_V2 = NUCLEO_V1.replace(
  '- Um turno tem de uma a três mensagens. Uma basta na maioria das vezes.',
  '- Um turno tem de uma a duas mensagens. Uma basta na maioria das vezes.',
);

export const VERSAO_2: VersaoDaLista = {
  id: 2,
  numero: 2,
  hash: '9b1f0c37d6a2e4f8a0c5b7d9e1f3a5c7b9d1e3f5a7c9b1d3e5f7a9c1b3d5e7f9',
  nota: 'turno com até duas mensagens, não três',
  origem: 'gestor',
  commit_sha: null,
  status: 'rascunho',
  base_versao_id: 1,
  criado_por: GESTOR.id,
  criado_por_email: GESTOR.email,
  criado_em: '2026-11-05T13:02:11.204118+00:00',
  aprovada_em: null,
  aprovada_por_email: null,
  publicada_em: null,
  publicada_por_email: null,
  publicacao_detalhe: null,
};

// ---------------------------------------------------------------------------
// bruna_gestor_config (valores reais de 05/11)
// ---------------------------------------------------------------------------
export const PENDENCIAS = [
  {
    desde: '2026-11-05',
    texto: 'Duas coisas já saem do banco e só chegam inteiras à Bruna depois que o nó subir: a linha ORIENTAÇÕES DO GESTOR (bruna_instrucoes) e a lista de bairros foco no prompt e na leitura da conversa (bruna_bairros_foco; o estado do bairro gravado, a tool salvar_contato e a escada já seguem o banco na hora). Para subir: node docs/bruna/build-contexto.mjs, node docs/bruna/testar-contexto.mjs e node docs/bruna/subir-contexto-nos-tres.mjs --base <o Montar contexto v3 que está no ar> --gravar (precisa de N8N_API_KEY).',
    codigo: 'n8n_montar_contexto',
    titulo: 'Subir o nó "Montar contexto v3" ao n8n',
    resolvida: false,
  },
  {
    desde: '2026-11-05',
    texto: 'O copiloto (bruna-copiloto) e a análise semanal (bruna-analise) chamam a API da Anthropic com esse segredo. Sem ele, as duas respondem 503.',
    codigo: 'anthropic_api_key',
    titulo: 'Configurar ANTHROPIC_API_KEY nos segredos do projeto Supabase',
    resolvida: false,
  },
];

export const CONFIGS: LinhaDeConfig[] = [
  {
    chave: 'analise',
    valor: { hora: 6, ativa: true, modelo: 'claude-opus-5-5', dia_semana: 1 },
    descricao: 'Análise semanal (edge function bruna-analise): modelo, se roda sozinha e quando.',
    atualizado_em: '2026-11-04T22:41:58.585669+00:00',
    atualizado_por: null,
  },
  {
    chave: 'copiloto',
    valor: { ativo: true, modelo: 'claude-opus-5-5', max_tokens: 8192 },
    descricao: 'Modelo e teto do copiloto do gerenciador (edge function bruna-copiloto).',
    atualizado_em: '2026-11-05T03:00:36.04063+00:00',
    atualizado_por: null,
  },
  {
    chave: 'pendencias',
    valor: PENDENCIAS,
    descricao: 'Pendências do gerenciador que dependem do dono. A interface mostra as não resolvidas.',
    atualizado_em: '2026-11-05T11:15:41.725272+00:00',
    atualizado_por: null,
  },
  {
    chave: 'regua',
    valor: { motivo: null, pausado_em: null, pausado_por: null, escada_pausada: false, retornos_pausados: false },
    descricao: 'Pausa geral da escada de 24 h e dos retornos prometidos. A campanha FUP90 se pausa em fup_campanhas.ativa.',
    atualizado_em: '2026-11-04T22:41:58.585669+00:00',
    atualizado_por: null,
  },
];

// ---------------------------------------------------------------------------
// bruna_regioes (as seis linhas reais)
// ---------------------------------------------------------------------------
export const REGIOES: Regiao[] = [
  { region: 'arquitetos', nome: 'Arquitetos', oferece_consultoria: false, duracao_min: null, grade: null, horizonte_dias: 0, calendario: null, consultor: null, atualizado_em: '2026-08-26T19:13:33.558881+00:00' },
  { region: 'brasil', nome: 'Brasil', oferece_consultoria: false, duracao_min: null, grade: null, horizonte_dias: 0, calendario: null, consultor: null, atualizado_em: '2026-08-26T19:13:33.558881+00:00' },
  { region: 'brasil2', nome: 'Brasil', oferece_consultoria: false, duracao_min: null, grade: null, horizonte_dias: 0, calendario: null, consultor: null, atualizado_em: '2026-08-26T19:13:33.558881+00:00' },
  { region: 'goiania', nome: 'Goiânia', oferece_consultoria: true, duracao_min: 60, grade: ['08:00:00', '09:00:00', '10:00:00', '11:00:00', '14:00:00', '15:00:00', '16:00:00', '17:00:00'], horizonte_dias: 14, calendario: 'lucasbizinoto@besserhome.com.br', consultor: 'Lucas Bizinoto', atualizado_em: '2026-08-26T19:13:33.558881+00:00' },
  { region: 'rj', nome: 'Rio de Janeiro', oferece_consultoria: true, duracao_min: 60, grade: ['08:30:00', '09:30:00', '10:30:00', '11:30:00', '14:00:00', '15:00:00', '16:00:00', '17:00:00'], horizonte_dias: 10, calendario: 'guilherme.rj@besserhome.com.br', consultor: 'Guilherme', atualizado_em: '2026-08-26T19:13:33.558881+00:00' },
  { region: 'sp', nome: 'São Paulo', oferece_consultoria: true, duracao_min: 90, grade: ['08:30:00', '10:00:00', '11:30:00', '14:00:00', '15:30:00', '17:00:00'], horizonte_dias: 10, calendario: 'agendamento.sp@besserhome.com.br', consultor: 'Aisten ou Leandro Faria', atualizado_em: '2026-09-29T18:32:07.306768+00:00' },
];

// ---------------------------------------------------------------------------
// bruna_conhecimento (linhas reais)
// ---------------------------------------------------------------------------
export const ENTRADAS: EntradaDaBase[] = [
  {
    id: 14,
    chave: 'limpeza_e_manutencao',
    titulo: 'Limpeza e manutenção',
    conteudo: 'A película só pode ser limpa depois de 30 dias da aplicação: é o tempo de cura da cola. Antes disso, não mexa nela.\n\nDepois dos 30 dias, a limpeza é com pano úmido, macio ou flanela, só com água. Álcool NÃO pode, nem produto químico, esponja ou material abrasivo, que riscam e danificam a película. Ela não pede manutenção além dessa limpeza do vidro. A limpeza do vidro antes da aplicação é feita pela nossa equipe no dia; a gente não indica empresa de limpeza.',
    categoria: 'manutencao',
    region: null,
    palavras_chave: ['pano umido', 'limpar', 'alcool', 'limpar a pelicula', 'quando posso limpar', '30 dias', 'flanela', 'como limpar', 'precisa de manutencao', 'pode passar alcool', 'lavar', 'limpeza', 'risca', 'manutencao', 'produto de limpeza'],
    prioridade: 40,
    ativo: true,
    atualizado_em: '2026-10-14T19:24:35.38338+00:00',
    fonte: 'contatos 6016 08/05, 14534 17/06, 16189 16/07, 14942 18/08',
    confianca: 'alta',
  },
  {
    id: 30,
    chave: 'portaria_dados_do_consultor',
    titulo: 'Pré-cadastro na portaria',
    conteudo: 'Quando o cliente disser que a portaria ou o condomínio precisa do nome e do documento de quem vai para liberar a entrada, chame dados_do_consultor e passe o nome completo e o CPF exatamente como a tool devolver.',
    categoria: 'atendimento',
    region: null,
    palavras_chave: ['portaria', 'pre cadastro', 'cadastro na portaria', 'documento do tecnico', 'rg', 'cpf', 'placa', 'liberar entrada'],
    prioridade: 72,
    ativo: true,
    atualizado_em: '2026-10-23T16:42:35.253992+00:00',
    fonte: 'contatos 4158 17/04, 19251 03/08 e 04/08; bruna_chamados 04/09; contatos 27491 20/10 e 24016 21/10 (decisão do dono em 22/10)',
    confianca: 'alta',
  },
  {
    id: 46,
    chave: 'condominios_goiania',
    titulo: 'Onde a Besser já aplicou em Goiânia (para a explicação de preço x valor)',
    conteudo: "Em Goiânia a Besser já aplicou nos condomínios Plateau d'Or, Alphaville Flamboyant, Aldeia do Vale, Jardins Itália, Jardins França, Jardins Munique e Jardins Parma. Cite no máximo dois, os que fazem mais sentido para ele.",
    categoria: 'atendimento',
    region: 'goiania',
    palavras_chave: [],
    prioridade: 70,
    ativo: false,
    atualizado_em: '2026-10-08T19:58:34.586263+00:00',
    fonte: 'CRM, vendas ganhas e aplicadas desde fev/2026, levantamento de 07/10/2026; aprovado pelo dono em 08/10/2026. ativo = false de propósito: só entra pelo campo condominios_da_praca do bruna_v4_contexto.',
    confianca: 'alta',
  },
];

/** Uma alteração do conteúdo da entrada 14, como o trigger grava (to_jsonb(row) - 'busca'). */
export const HISTORICO_DA_ENTRADA_14: HistoricoDaBase[] = [
  {
    id: 7,
    conhecimento_id: 14,
    chave: 'limpeza_e_manutencao',
    acao: 'alterada',
    antes: { ...ENTRADAS[0], conteudo: 'A película só pode ser limpa depois de 30 dias da aplicação. Depois, pano úmido e só água.', prioridade: 50 },
    depois: { ...ENTRADAS[0] },
    por_email: GESTOR.email,
    em: '2026-11-05T14:10:02.118+00:00',
  },
];

export const DUVIDAS: Duvida[] = [
  {
    id: 1101, contato_id: 27938, region: 'sp',
    pergunta: 'Quais são as vantagens e desvantagens das películas para vidro em relação a pássaros, incluindo risco de colisão e efeitos no vidro?',
    pergunta_norm: 'quais sao as vantagens e desvantagens das peliculas para vidro em relacao a passaros incluindo risco de colisao e efeitos no vidro',
    criado_at: '2026-10-27T12:36:32.220243+00:00',
  },
  {
    id: 1025, contato_id: 27647, region: 'sp',
    pergunta: 'Qual é a largura do material da película para aplicar em uma porta de 2,90 m por 1,70 m?',
    pergunta_norm: 'qual e a largura do material da pelicula para aplicar em uma porta de 2 90 m por 1 70 m',
    criado_at: '2026-10-23T10:36:10.680847+00:00',
  },
];

// ---------------------------------------------------------------------------
// bruna_instrucoes (a tabela está vazia em 05/11: linhas no formato da migration)
// ---------------------------------------------------------------------------
export const INSTRUCOES: Instrucao[] = [
  {
    id: 3,
    escopo: 'region',
    region: 'sp',
    contato_id: null,
    titulo: 'Vila Andrade é bairro foco em SP',
    texto: 'Quem disser só "Vila Andrade" mora num bairro com consultoria: ofereça a visita, não o fluxo da foto.',
    ativa: true,
    prioridade: 50,
    aplica_em: ['conversa', 'toque', 'retorno'],
    vigencia_inicio: '2026-11-05T13:20:00+00:00',
    vigencia_fim: null,
    origem: 'gestor',
    sugestao_id: null,
    criado_por: GESTOR.id,
    criado_por_email: GESTOR.email,
    criado_em: '2026-11-05T13:20:00+00:00',
    atualizado_em: '2026-11-05T13:20:00+00:00',
  },
  {
    id: 4,
    escopo: 'contato',
    region: null,
    contato_id: 26634,
    titulo: 'Não oferecer consultoria até ele mandar a foto',
    texto: 'Ele pediu para mandar a foto da fachada antes de marcar. Espere a foto.',
    ativa: true,
    prioridade: 100,
    aplica_em: ['conversa'],
    vigencia_inicio: '2026-11-05T13:25:00+00:00',
    vigencia_fim: '2026-11-12T21:00:00+00:00',
    origem: 'gestor',
    sugestao_id: null,
    criado_por: GESTOR.id,
    criado_por_email: GESTOR.email,
    criado_em: '2026-11-05T13:25:00+00:00',
    atualizado_em: '2026-11-05T13:25:00+00:00',
  },
  {
    id: 2,
    escopo: 'global',
    region: null,
    contato_id: null,
    titulo: 'Sem emoji no primeiro contato',
    texto: 'Na primeira mensagem, nada de emoji, mesmo que o cliente use.',
    ativa: false,
    prioridade: 100,
    aplica_em: ['conversa'],
    vigencia_inicio: '2026-11-05T12:00:00+00:00',
    vigencia_fim: null,
    origem: 'copiloto',
    sugestao_id: 11,
    criado_por: GESTOR.id,
    criado_por_email: GESTOR.email,
    criado_em: '2026-11-05T12:00:00+00:00',
    atualizado_em: '2026-11-05T12:40:00+00:00',
  },
];

export const CONTATO_26634 = { id: 26634, user_name: 'Reinaldo Staliano-DTAADV', user_number: '5511941161447@s.whatsapp.net', region: 'sp' };

export const HISTORICO_DA_INSTRUCAO_2: HistoricoDaInstrucao[] = [
  {
    id: 9, instrucao_id: 2, acao: 'alterada',
    antes: { ...INSTRUCOES[2], ativa: true }, depois: { ...INSTRUCOES[2] },
    por_email: GESTOR.email, em: '2026-11-05T12:40:00+00:00',
  },
  {
    id: 8, instrucao_id: 2, acao: 'criada', antes: null, depois: { ...INSTRUCOES[2], ativa: true },
    por_email: GESTOR.email, em: '2026-11-05T12:00:00+00:00',
  },
];

// ---------------------------------------------------------------------------
// audit_logs (colunas reais; ações gestor_* como o gerenciador grava)
// ---------------------------------------------------------------------------
export const AUDITORIA: LinhaDaAuditoria[] = [
  {
    id: 840612,
    created_at: '2026-11-05T13:25:04.512+00:00',
    actor_email: GESTOR.email,
    action: 'gestor_instrucao_criada',
    entity_type: 'bruna_instrucoes',
    entity_id: 4,
    contato_id: 26634,
    region: 'sp',
    details: { titulo: 'Não oferecer consultoria até ele mandar a foto', aplica_em: ['conversa'], vigencia_fim: '2026-11-12T21:00:00+00:00' },
  },
  {
    id: 840598,
    created_at: '2026-11-05T13:02:12.004+00:00',
    actor_email: GESTOR.email,
    action: 'gestor_nucleo_versao_criada',
    entity_type: 'bruna_prompt_versoes',
    entity_id: 2,
    contato_id: null,
    region: null,
    details: { secao: 'Mensagens e bolhas', nota: 'turno com até duas mensagens, não três', base_numero: 1, base_versao_id: 1, caracteres: 5935 },
  },
  {
    id: 840570,
    created_at: '2026-11-05T12:41:40.77+00:00',
    actor_email: GESTOR.email,
    action: 'gestor_fup90_etapa_ajustada',
    entity_type: 'fup_campanha_etapas',
    entity_id: 3,
    contato_id: null,
    region: null,
    details: { campos: ['offset_dias'] },
  },
];
