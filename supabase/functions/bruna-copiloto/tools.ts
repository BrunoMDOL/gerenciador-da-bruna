// As ferramentas do copiloto: a definição que vai à API da Anthropic e o
// executor de cada uma. Cada executor devolve texto compacto (JSON enxuto ou
// linhas) para o modelo e um `resumo` de uma frase para o evento `ferramenta`.
//
// Módulo puro: sem Deno, sem npm. O banco entra por injeção (ContextoDasTools):
// é o cliente supabase-js DO USUÁRIO, com o JWT dele, então a RLS e o
// auth.uid() valem em toda leitura e escrita. As RPCs de escrita
// bruna_gestor_* conferem bruna_gestor_pode e auditam por dentro, e as dos
// bairros foco (painel e testar) também conferem; as outras de leitura
// (buscar_leads, lead_estado, lead_timeline, metricas, erros, alertas,
// regua_resumo, bruna_instrucoes_vivas) só passam a conferir com a migration
// 20261105120000: quem garante o acesso aqui é o index.ts, que recusa (403)
// quem não passa em bruna_gestor_pode antes de qualquer ferramenta rodar.

/* ----------------------------------------------------------------------------
 * O banco, só o que os executores usam (o supabase-js é estruturalmente igual).
 * ------------------------------------------------------------------------- */

export interface RespostaDoBanco<T = unknown> {
  data: T;
  error: { message: string; code?: string } | null;
}

export interface Consulta extends PromiseLike<RespostaDoBanco> {
  select(colunas?: string): Consulta;
  insert(valores: unknown): Consulta;
  eq(coluna: string, valor: unknown): Consulta;
  neq(coluna: string, valor: unknown): Consulta;
  lt(coluna: string, valor: unknown): Consulta;
  or(filtros: string): Consulta;
  textSearch(coluna: string, termo: string, opcoes?: { config?: string; type?: 'plain' | 'phrase' | 'websearch' }): Consulta;
  order(coluna: string, opcoes?: { ascending?: boolean }): Consulta;
  limit(n: number): Consulta;
  maybeSingle(): PromiseLike<RespostaDoBanco>;
  single(): PromiseLike<RespostaDoBanco>;
}

export interface Banco {
  from(tabela: string): Consulta;
  rpc(funcao: string, args?: Record<string, unknown>): PromiseLike<RespostaDoBanco>;
}

export interface ContextoDasTools {
  banco: Banco;
  /** Emite um evento SSE (a propor_acao emite `sugestao`). */
  emitir(nome: 'sugestao', dados: unknown): void;
  sessaoId: number;
  /** Relógio injetável (os testes fixam o "agora"). */
  agora?: () => Date;
}

export interface ResultadoDaTool {
  /** O que volta para o modelo no tool_result. */
  resultado: string;
  /** Uma frase para a interface ("Li o estado do lead 26634"). */
  resumo: string;
  isError?: boolean;
}

/* ----------------------------------------------------------------------------
 * Vocabulário fixo
 * ------------------------------------------------------------------------- */

export const REGIOES = ['sp', 'rj', 'goiania', 'brasil', 'brasil2', 'pos_venda'] as const;
export const REGIOES_DA_ORIENTACAO = ['sp', 'rj', 'goiania', 'brasil', 'brasil2', 'pos_venda', 'arquitetos'] as const;
export const FILTROS_DE_LEADS = ['agendados', 'bruna_off', 'com_revisao', 'com_instrucao', 'retorno_pendente', 'com_chamado', 'sem_resposta_24h'] as const;
export const TIPOS_DE_SUGESTAO = ['nucleo', 'instrucao', 'base', 'regua', 'template', 'config', 'lead', 'outro'] as const;
export const PRIORIDADES = ['alta', 'media', 'baixa'] as const;
export const TIPOS_DE_ACAO = [
  'instrucao_criar', 'instrucao_desativar', 'base_criar', 'base_atualizar', 'revisao_criar', 'regua_pausar',
  'fup90_etapa_atualizar', 'fup90_campanha_atualizar', 'nucleo_trecho', 'config_atualizar', 'lead_bruna',
  'bairro_foco_salvar', 'bairro_foco_remover', 'manual',
] as const;
/** Só as praças com consultoria têm bairros foco (bruna_regioes.oferece_consultoria, conferido em 05/11/2026). */
export const PRACAS_COM_CONSULTORIA = ['sp', 'rj', 'goiania'] as const;
/** bruna_bairros_foco.tipo: um bairro, ou a cidade inteira. */
export const TIPOS_DO_ITEM_DO_FOCO = ['bairro', 'cidade'] as const;
/** O período da tool bairros_foco: o mesmo da tela Bairros foco. */
export const DIAS_DO_PAINEL_DO_FOCO = 90;
/** Os limites de bruna_bairros_foco_validar e bruna_bairros_foco_termos. */
const NOME_DO_ITEM_MAXIMO = 80;
const TERMO_MAXIMO = 60;
const TERMOS_MAXIMOS = 20;
const OBSERVACAO_MAXIMA = 300;
const MOTIVO_MAXIMO = 300;
export const CAMPOS_DA_BASE = ['titulo', 'conteudo', 'categoria', 'region', 'palavras_chave', 'prioridade', 'ativo', 'fonte', 'confianca'] as const;
export const CAMPOS_DA_ETAPA_FUP90 = ['offset_dias', 'temperatura', 'objetivo', 'template_name', 'template_lang', 'variaveis', 'condicional', 'min_leituras', 'ativo', 'template_body'] as const;
export const CAMPOS_DA_CAMPANHA_FUP90 = [
  'nome', 'ativa', 'regioes', 'tags_bloqueantes', 'tags_pausantes', 'hora_inicio', 'hora_fim', 'hora_overflow', 'jitter_min', 'jitter_janela_min',
  'envia_fim_semana', 'janela_min_horas', 'janela_max_dias', 'intervalo_min_horas', 'limite_inscricao_dia', 'limite_envio_dia', 'teto_toques_total',
] as const;

const LIMITE_PADRAO_DA_CONVERSA = 80;
const LIMITE_MAXIMO_DA_CONVERSA = 300;
const CORTE_DA_MENSAGEM = 600;
const CORTE_DO_CONTEUDO_DA_BASE = 1500;
export const TAMANHO_MAXIMO_DO_TRECHO = 12_000;

/* ----------------------------------------------------------------------------
 * Definições (ordem fixa: a lista é parte do prefixo que a API guarda em cache)
 * ------------------------------------------------------------------------- */

export interface EsquemaDeEntrada {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface DefinicaoDeTool {
  name: string;
  description: string;
  input_schema: EsquemaDeEntrada;
  strict?: boolean;
}

const estrita = (name: string, description: string, properties: Record<string, unknown>, required: string[] = []): DefinicaoDeTool => ({
  name,
  description,
  strict: true,
  input_schema: { type: 'object', properties, required, additionalProperties: false },
});

const DESCRICAO_DA_PROPOSTA = [
  'Registra UMA sugestão de ajuste para o gestor decidir (vira uma linha em bruna_sugestoes, status pendente, origem copiloto; a interface mostra um cartão e só o gestor aplica).',
  'Chame quando tiver evidência (conversa lida, métrica, trecho) de que algo deve mudar. Uma chamada por ponto; nunca descreva a mudança só em texto. Nunca diga que aplicou: quem aplica é o gestor ao aprovar.',
  'Campos: tipo (nucleo|instrucao|base|regua|template|config|lead|outro; mudança nos bairros foco vai como config), titulo (até 160), descricao (o que mudar e por quê, com os fatos), impacto (o que melhora), prioridade (alta|media|baixa), evidencias (lista de {contato_id?, mensagem_id?, trecho?, nota?}; cite o lead e o trecho exato) e acao: o que o gerenciador aplica quando o gestor aprovar, num destes formatos (campo "tipo" dentro de acao):',
  '• {tipo:"instrucao_criar", escopo:"global"|"region"|"contato", region?: praça quando escopo=region (sp|rj|goiania|brasil|brasil2|pos_venda|arquitetos), contato_id?: inteiro quando escopo=contato, titulo: até 120, texto: até 1500 (o que a Bruna deve fazer, em uma orientação), aplica_em?: lista com "conversa"|"toque"|"retorno" (padrão os três), prioridade?: inteiro (menor vale primeiro, padrão 100), vigencia_fim?: data ISO ou null}. Efeito: linha ORIENTAÇÕES DO GESTOR no contexto da Bruna; avise que ela só entra na mensagem do turno depois que o nó "Montar contexto v3" subir ao n8n.',
  '• {tipo:"instrucao_desativar", id: inteiro, motivo?: texto}. Efeito: a orientação deixa de valer.',
  '• {tipo:"base_criar", titulo: até 200, conteudo: até 6000 (o texto que a Bruna vai ler e usar com o cliente), categoria: até 40 (produto|tecnico|atendimento|processo|empresa|fachada|aplicacao|visita|escopo|manutencao|pagamento|garantia), region?: praça ou null, palavras_chave?: lista de termos, prioridade?: inteiro, fonte?: texto, confianca?: "alta"|"media", chave?: identificador (gerado do título se faltar)}. Efeito: entrada nova em bruna_conhecimento, lida pela tool consultar_base da Bruna.',
  '• {tipo:"base_atualizar", id: inteiro, campos: {titulo?, conteudo?, categoria?, region?, palavras_chave?, prioridade?, ativo?, fonte?, confianca?}}. Efeito: corrige a entrada (a versão anterior fica no histórico).',
  '• {tipo:"revisao_criar", contato_id: inteiro, tipo_revisao: pergunta_sem_resposta|insistiu|pergunta_repetida|info_errada|bairro_errado|retorno_sem_agenda|encaminhou_sem_tool|chamou_sem_tool|agendamento_falso|resposta_automatica|contradisse|ignorou_parada|outro, gravidade: "grave"|"media"|"leve", erro: até 400 (o que a Bruna errou, com a fala citada), na_proxima: até 400 (o que fazer na próxima mensagem), horas?: validade (padrão 72)}. Só vale em sp, rj e goiania. Efeito: linha REVISÃO DO SEU ATENDIMENTO no próximo turno daquele lead.',
  '• {tipo:"regua_pausar", escada: true|false, retornos: true|false, motivo?: texto}. Efeito: pausa (true) ou retoma (false) a escada de 24 h e os retornos prometidos para todos os leads.',
  '• {tipo:"fup90_etapa_atualizar", id: inteiro (id da etapa em fup_campanha_etapas), campos: {offset_dias?, temperatura?, objetivo?, template_name?, template_lang?, variaveis?, condicional?, min_leituras?, ativo?, template_body?}}.',
  '• {tipo:"fup90_campanha_atualizar", id: inteiro (a campanha FUP90 é a 1), campos: {nome?, ativa?, regioes?, tags_bloqueantes?, tags_pausantes?, hora_inicio?, hora_fim?, hora_overflow?, jitter_min?, jitter_janela_min?, envia_fim_semana?, janela_min_horas?, janela_max_dias?, intervalo_min_horas?, limite_inscricao_dia?, limite_envio_dia?, teto_toques_total?}}.',
  '• {tipo:"nucleo_trecho", trecho_atual: texto copiado AO PÉ DA LETRA do núcleo publicado (leia com nucleo_trecho antes; tem de aparecer uma única vez), trecho_novo: o texto que entra no lugar (vazio apaga o trecho), nota: até 500 (por que mudar)}. Efeito: versão nova do núcleo em rascunho; publicar é manual, pelo gestor.',
  '• {tipo:"config_atualizar", chave: até 40 (regua|copiloto|analise), valor: objeto com os campos a mesclar}.',
  '• {tipo:"lead_bruna", contato_id: inteiro, ligada: true|false}. Efeito: liga ou desliga a Bruna naquele lead (contatos.status).',
  '• {tipo:"bairro_foco_salvar", region: sp|rj|goiania, tipo_item: "bairro"|"cidade" (cidade = a cidade inteira), nome: 2 a 80 caracteres (como o item fica na lista), so_se?: lista de até 20 cidades (o item só vale se a cidade do lead for uma delas), nao_se?: lista de até 20 termos de até 60 caracteres (o item não vale quando o bairro do lead tem um deles, ex.: "barra mansa" para "Barra"), observacao?: até 300 (nota do gestor; a Bruna não lê), nome_original?: o nome EXATO do item como veio em bairros_foco, só para alterar um que existe (sem ele, cria um item novo), tipo_original?: o tipo de hoje, só quando ele muda, motivo?: até 300 (vai para o histórico)}. Na alteração, so_se, nao_se e observacao que não vierem ficam como estão; lista vazia apaga a regra e observacao null apaga a nota. Efeito: vale na hora para o bairro gravado, a tool salvar_contato e a escada; o texto da lista no prompt da Bruna só muda depois que o "Montar contexto v3" subir (diga isso ao gestor). Para uma variação de nome que não casa (o cliente diz "Recreio", a lista tem "Recreio dos Bandeirantes"), acrescente a forma do cliente como item novo, com nao_se para os lugares que começam igual e não são foco; não renomeie o que já casa.',
  '• {tipo:"bairro_foco_remover", region: sp|rj|goiania, tipo_item: "bairro"|"cidade", nome: o nome EXATO do item como veio em bairros_foco, motivo?: até 300}. O banco recusa tirar o último item da praça.',
  '• {tipo:"manual", instrucoes: o passo a passo para o gestor fazer à mão} quando nenhum formato acima serve (template da Meta, mudança no n8n, decisão de negócio).',
  'Devolve {id} da sugestão criada; cite o número ao gestor.',
].join('\n');

export const DEFINICOES_DAS_TOOLS: DefinicaoDeTool[] = [
  estrita(
    'buscar_leads',
    'Busca leads da Bruna por nome, telefone, bairro ou id (ex.: "#26634"), com filtro opcional por praça/funil e por situação. Chame quando o gestor citar um lead sem o contato_id, pedir "quais leads..." ou quiser uma lista para investigar. Devolve uma linha por lead (id, praça, Bruna ligada ou não, última mensagem e marcas: agendado, revisão viva, orientações, retorno pendente, em escada, opt-out, entregue a alguém do time), do mais recente ao mais antigo.',
    {
      q: { type: 'string', description: 'Texto da busca: parte do nome, dígitos do telefone (4 ou mais), bairro/condomínio ou "#id". Vazio lista os mais recentes.' },
      region: { type: 'string', enum: [...REGIOES], description: 'Praça ou funil: sp, rj, goiania (com consultor), brasil, brasil2 (funis de qualificação, representante), pos_venda.' },
      filtro: { type: 'string', enum: [...FILTROS_DE_LEADS], description: 'agendados, bruna_off, com_revisao (revisão viva), com_instrucao (orientação ativa no lead), retorno_pendente, com_chamado (7 dias), sem_resposta_24h (cliente falou e ninguém respondeu).' },
      limite: { type: 'integer', description: 'Quantos leads (padrão 20, máximo 60).' },
    },
  ),
  estrita(
    'lead_estado',
    'Lê o estado completo de um lead pelo contato_id: cadastro (contatos), tags, o contexto que a Bruna recebe no turno (bruna_v4_contexto sem o histórico), orientações, revisões, retornos prometidos, opt-out, FUP90, toques da escada, kanban, obra, conferências recentes, total de mensagens e a praça. Chame PRIMEIRO sempre que a conversa for sobre um lead específico (uma sessão com lead em foco começa por aqui) e antes de propor qualquer ajuste nele. Devolve JSON.',
    { contato_id: { type: 'integer', description: 'O id do contato (contatos.id).' } },
    ['contato_id'],
  ),
  estrita(
    'lead_conversa',
    'Lê a conversa do lead no WhatsApp, uma linha por mensagem em ordem cronológica: "[id] dd/mm HH:MM Autor: texto" (Autor = Bruna, Cliente, Atendente, Template ou Sistema; hora de Brasília; texto cortado em 600 caracteres; áudio vem com a transcrição e foto com a descrição). Chame para ver o que foi dito de fato antes de afirmar qualquer coisa sobre o atendimento ou citar uma fala. Devolve as últimas `limite` mensagens; para as mais antigas, repita com antes_de_id igual ao menor id devolvido.',
    {
      contato_id: { type: 'integer', description: 'O id do contato.' },
      limite: { type: 'integer', description: 'Quantas mensagens (padrão 80, máximo 300).' },
      antes_de_id: { type: 'integer', description: 'Só mensagens com id menor que este (paginação para trás).' },
    },
    ['contato_id'],
  ),
  estrita(
    'lead_linha_do_tempo',
    'Lê a linha do tempo do lead: o que aconteceu fora das bolhas da conversa (objeções, retornos prometidos, encaminhamentos ao representante, chamados ao time, revisões, silêncios, horários conferidos, toques da escada, FUP90, follow-ups programados, orientações, consultas à base, auditoria, agendamento, criação). Chame para entender a sequência de eventos e os erros de processo (chamado que não saiu, encaminhamento com erro, toque pulado, retorno cancelado). Devolve uma linha por evento, do mais novo ao mais antigo.',
    {
      contato_id: { type: 'integer', description: 'O id do contato.' },
      limite: { type: 'integer', description: 'Quantos eventos (padrão 60, máximo 300).' },
    },
    ['contato_id'],
  ),
  estrita(
    'metricas',
    'Lê as métricas da Bruna nos últimos `dias` dias e no período anterior de mesmo tamanho, para comparar: novos leads, atendidos, responderam, mensagens (Bruna, cliente, atendente), convites, agendados (e quantos pela Bruna), chamados, encaminhamentos (e com erro), toques da escada (e pulados), retornos criados/enviados/cancelados, FUP90 (envios, entregues, lidos, respondidos), follow-ups programados, revisões (e graves, e sem verificar), dúvidas (e sem acerto na base), objeções, opt-outs, silêncios, horários suspeitos, tempo mediano de resposta em segundos e o detalhe por praça. Chame para qualquer pergunta de volume, taxa, conversão ou tendência.',
    { dias: { type: 'integer', description: 'Tamanho do período em dias (1 a 365; 7 para a semana).' } },
    ['dias'],
  ),
  estrita(
    'erros',
    'Lê os erros e a qualidade do atendimento nos últimos `dias` dias: revisões por tipo e por praça e as mais recentes (com o erro e o que fazer), conferências da autochecagem, horários suspeitos, chamados por assunto, objeções por tipo, perguntas que a base não respondeu (com exemplos e leads), entradas da base mais consultadas, encaminhamentos com erro e templates descartados. Chame quando o gestor perguntar o que está dando errado, onde a Bruna erra mais ou o que a base não cobre.',
    { dias: { type: 'integer', description: 'Tamanho do período em dias (1 a 365).' } },
    ['dias'],
  ),
  estrita(
    'alertas',
    'Lê os alertas vivos do gerenciador agora: agenda da praça sem responder, FUP90 travado, régua pausada, campanha FUP90 desativada, revisões da autochecagem à espera de conferência, perguntas sem resposta na base, templates reprovados pela Meta, encaminhamentos e chamados que não saíram, retornos falhando, sugestões pendentes. Chame quando perguntarem se a Bruna está bem ou o que precisa de atenção.',
    {},
  ),
  estrita(
    'regua_resumo',
    'Lê o resumo da régua de follow-ups nos últimos `dias` dias: toques da escada de 24 h por etapa (enviados, pulados, respondeu em 24 h, agendou em 7 dias), campanha FUP90 por toque (envios, entregues, lidos, respondidos, falhas) e inscrições por status, retornos prometidos (criados, enviados, pendentes, cancelados por motivo, por quem prometeu, respondeu em 24 h), follow-ups programados por status, kanban de follow-up por praça, as pausas e a configuração da campanha. Chame para perguntas sobre a régua, a escada, o FUP90 ou os retornos.',
    { dias: { type: 'integer', description: 'Tamanho do período em dias (1 a 365).' } },
    ['dias'],
  ),
  estrita(
    'orientacoes',
    'Lista as orientações do gestor para a Bruna (bruna_instrucoes). Com contato_id, devolve as que valem para aquele lead agora (globais, da praça dele e dele), na ordem em que entram no contexto; sem contato_id, todas as ativas, com escopo, praça, lead, turnos em que valem e vigência. Chame antes de propor uma orientação nova, para não repetir nem contradizer uma que já existe.',
    { contato_id: { type: 'integer', description: 'O id do contato, para ver só as que valem para ele.' } },
  ),
  estrita(
    'base_buscar',
    'Busca na base de conhecimento da Bruna (bruna_conhecimento, a mesma que a tool consultar_base dela lê): busca de texto em português e, se nada bater, por trecho do título ou do conteúdo. Chame para conferir o que a Bruna sabe sobre um assunto antes de dizer que ela errou uma informação, antes de propor uma entrada nova ou uma correção. Devolve id, chave, título, categoria, praça e o conteúdo (até 1500 caracteres).',
    {
      termo: { type: 'string', description: 'O assunto, em poucas palavras (ex.: "garantia", "película transparente calor").' },
      limite: { type: 'integer', description: 'Quantas entradas (padrão 8, máximo 20).' },
    },
    ['termo'],
  ),
  estrita(
    'nucleo_secoes',
    'Lista as seções do núcleo publicado (o prompt fixo da Bruna): cada título ## e ### com o tamanho em caracteres. Chame antes de nucleo_trecho para achar a seção certa, e antes de propor qualquer mudança no núcleo.',
    {},
  ),
  estrita(
    'nucleo_trecho',
    'Devolve o texto de uma seção do núcleo publicado cujo título contém `titulo` (com as subseções, até 12000 caracteres). Chame para ler a regra exata que a Bruna segue antes de afirmar o que o núcleo manda e antes de propor uma troca de trecho (a ação nucleo_trecho exige o trecho atual copiado ao pé da letra).',
    { titulo: { type: 'string', description: 'Parte do título da seção, como veio em nucleo_secoes.' } },
    ['titulo'],
  ),
  estrita(
    'bairros_foco',
    'Lê os bairros foco de uma praça com consultoria (sp, rj, goiania), a mesma conta da tela Bairros foco: a lista de hoje na ordem (bairros e cidades inteiras, com so_se, nao_se e a observação do gestor) e, nos últimos 90 dias, quantos leads caíram em cada item e quantos agendaram, os totais de leads (com bairro, no foco, fora do foco, sem bairro) e até 40 bairros que os leads informaram e ficaram fora da lista (bairro e cidade como o lead escreveu, leads, agendados, o último pedido e um lead de exemplo). Chame quando o gestor perguntar onde a Bruna oferece a consultoria ou por que um lead foi para a foto, e antes de propor qualquer mudança na lista (os nomes exatos vêm daqui). Devolve JSON.',
    { region: { type: 'string', enum: [...PRACAS_COM_CONSULTORIA], description: 'A praça: sp, rj ou goiania.' } },
    ['region'],
  ),
  estrita(
    'bairro_testar',
    'Testa um bairro, escrito como o cliente escreveria, contra a lista de hoje da praça e devolve a decisão real da Bruna (bruna_v4_foco_do_bairro, a mesma do bairro gravado, da tool salvar_contato e da escada): se é foco, com que item casou e como (nome completo ou núcleo), o texto e o núcleo que o banco comparou e os itens que casariam mas foram barrados por so_se ou nao_se. Chame antes de propor acrescentar, trocar ou tirar um item: para saber se a forma que o cliente usa já casa, e com a forma de lugares parecidos, para ver se a mudança não pega quem não devia. Devolve JSON com uma explicação em uma frase.',
    {
      region: { type: 'string', enum: [...PRACAS_COM_CONSULTORIA], description: 'A praça: sp, rj ou goiania.' },
      bairro: { type: 'string', description: 'O bairro como o cliente escreveu (ex.: "Recreio", "Itaim").' },
      cidade: { type: 'string', description: 'A cidade, quando o cliente disse ou o cadastro tem (conta para o so_se).' },
    },
    ['region', 'bairro'],
  ),
  estrita(
    'sugestoes_pendentes',
    'Lista as sugestões que ainda esperam decisão do gestor (da análise semanal, do copiloto ou do gestor): id, origem, tipo, título, prioridade e data. Chame antes de propor algo, para não duplicar uma sugestão que já está na fila.',
    {},
  ),
  {
    name: 'propor_acao',
    description: DESCRICAO_DA_PROPOSTA,
    input_schema: {
      type: 'object',
      properties: {
        tipo: { type: 'string', enum: [...TIPOS_DE_SUGESTAO], description: 'A alavanca que a sugestão mexe.' },
        titulo: { type: 'string', description: 'Até 160 caracteres, direto ao ponto.' },
        descricao: { type: 'string', description: 'O que mudar e por quê, com os fatos lidos pelas ferramentas.' },
        impacto: { type: 'string', description: 'O que melhora se o gestor aplicar.' },
        prioridade: { type: 'string', enum: [...PRIORIDADES] },
        evidencias: {
          type: 'array',
          description: 'As provas: o lead e o trecho exato da conversa, ou a métrica.',
          items: {
            type: 'object',
            properties: {
              contato_id: { type: 'integer' },
              mensagem_id: { type: 'integer' },
              trecho: { type: 'string', description: 'Trecho citado ao pé da letra (até 600 caracteres).' },
              nota: { type: 'string', description: 'Observação curta (até 400 caracteres).' },
            },
          },
        },
        acao: { type: ['object', 'null'], description: 'A ação no formato descrito acima (com o campo "tipo"), ou null quando não há nada a aplicar.' },
      },
      required: ['tipo', 'titulo', 'descricao', 'prioridade', 'evidencias', 'acao'],
    },
  },
];

export const NOME_LEGIVEL: Record<string, string> = {
  buscar_leads: 'Busca de leads',
  lead_estado: 'Estado do lead',
  lead_conversa: 'Conversa do lead',
  lead_linha_do_tempo: 'Linha do tempo do lead',
  metricas: 'Métricas',
  erros: 'Erros',
  alertas: 'Alertas',
  regua_resumo: 'Resumo da régua',
  orientacoes: 'Orientações',
  base_buscar: 'Busca na base',
  nucleo_secoes: 'Seções do núcleo',
  nucleo_trecho: 'Trecho do núcleo',
  bairros_foco: 'Bairros foco',
  bairro_testar: 'Teste de bairro',
  sugestoes_pendentes: 'Sugestões pendentes',
  propor_acao: 'Proposta de ação',
};

/* ----------------------------------------------------------------------------
 * Utilidades puras
 * ------------------------------------------------------------------------- */

type Obj = Record<string, unknown>;

const FUSO = 'America/Sao_Paulo';
const DATA_HORA = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/** Timestamps sem fuso (mensagens.created_at) guardam UTC e chegam sem "Z". */
export function instante(valor: unknown): Date | null {
  if (valor == null || valor === '') return null;
  const s = String(valor);
  const temFuso = /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(s);
  const d = new Date(temFuso ? s : `${s.replace(' ', 'T')}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "21/10 13:33" em Brasília. */
export function dataHoraBr(valor: unknown): string {
  const d = instante(valor);
  return d ? DATA_HORA.format(d).replace(',', '') : '—';
}

export function umaLinha(s: unknown): string {
  return String(s ?? '').replace(/\s+/g, ' ').trim();
}

export function cortar(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

const compacto = (v: unknown): string => JSON.stringify(v ?? null);

function inteiro(v: unknown, padrao: number, min: number, max: number): number {
  const n = typeof v === 'number' ? v : v == null || v === '' ? NaN : Number(v);
  if (!Number.isFinite(n)) return padrao;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function idObrigatorio(v: unknown, nome: string): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`"${nome}" tem de ser um inteiro positivo`);
  return n;
}

function textoObrigatorio(v: unknown, nome: string): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) throw new Error(`"${nome}" é obrigatório`);
  return s;
}

function pracaComConsultoria(v: unknown): string {
  if (typeof v === 'string' && (PRACAS_COM_CONSULTORIA as readonly string[]).includes(v)) return v;
  throw new Error(`"region" tem de ser uma praça com consultoria (${PRACAS_COM_CONSULTORIA.join(', ')})`);
}

async function rpc<T = unknown>(banco: Banco, funcao: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await banco.rpc(funcao, args);
  if (error) throw new Error(error.message);
  return data as T;
}

async function consulta<T = unknown>(q: PromiseLike<RespostaDoBanco>): Promise<T> {
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data as T;
}

function periodoDosUltimos(dias: number, agora: Date): { de: string; ate: string; dias: number } {
  const de = new Date(agora.getTime() - dias * 86_400_000);
  return { de: de.toISOString(), ate: agora.toISOString(), dias };
}

function periodoAnterior(p: { de: string; ate: string; dias: number }): { de: string; ate: string; dias: number } {
  const ate = new Date(p.de);
  const de = new Date(ate.getTime() - p.dias * 86_400_000);
  return { de: de.toISOString(), ate: ate.toISOString(), dias: p.dias };
}

/* ----------------------------------------------------------------------------
 * A conversa do lead (puro, testável)
 * ------------------------------------------------------------------------- */

export interface MensagemDaConversa {
  id: number;
  created_at: string;
  sender_type: string | null;
  direction: string | null;
  content: string | null;
  message_type: string | null;
  template_name: string | null;
  sender_name: string | null;
  transcricao?: string | null;
  midia_descricao?: string | null;
  auto_resposta?: boolean | null;
}

export function rotuloDoAutor(m: MensagemDaConversa): string {
  if (m.message_type === 'template') return 'Template';
  switch (m.sender_type) {
    case 'agent':
      return 'Bruna';
    case 'customer':
      return 'Cliente';
    case 'human':
      return m.sender_name ? `Atendente (${umaLinha(m.sender_name)})` : 'Atendente';
    case 'sistema':
      return 'Sistema';
    default:
      return m.sender_type ? m.sender_type : m.direction === 'inbound' ? 'Cliente' : 'Bruna';
  }
}

export function textoDaMensagem(m: MensagemDaConversa): string {
  const base = umaLinha(m.content);
  const legenda = base === '[MÍDIA]' ? '' : base;
  const descricao = umaLinha(m.midia_descricao);
  switch (m.message_type) {
    case 'ptt':
    case 'audio': {
      const transcricao = umaLinha(m.transcricao);
      if (transcricao) return `[ÁUDIO] ${transcricao}`;
      return legenda && !/^🎤/.test(legenda) ? `[ÁUDIO] ${legenda}` : '[ÁUDIO sem transcrição]';
    }
    case 'image':
      return `[FOTO]${legenda ? ` ${legenda}` : ''}${descricao ? ` | na foto: ${descricao}` : ''}`;
    case 'video':
      return `[VÍDEO]${legenda ? ` ${legenda}` : ''}${descricao ? ` | no vídeo: ${descricao}` : ''}`;
    case 'document':
      return `[DOCUMENTO]${legenda ? ` ${legenda}` : ''}`;
    case 'location':
      return '[LOCALIZAÇÃO]';
    case 'nao_suportado':
      return '[MENSAGEM QUE O WHATSAPP NÃO ENTREGOU]';
    case 'template':
      return `${legenda || '[template]'}${m.template_name ? ` (template ${m.template_name})` : ''}`;
    default:
      return legenda || '[sem texto]';
  }
}

/** "[id] dd/mm HH:MM Autor: texto" (texto cortado em 600 caracteres). */
export function formatarLinhaDaConversa(m: MensagemDaConversa): string {
  const auto = m.auto_resposta ? ' (resposta automática)' : '';
  return `[${m.id}] ${dataHoraBr(m.created_at)} ${rotuloDoAutor(m)}${auto}: ${cortar(textoDaMensagem(m), CORTE_DA_MENSAGEM)}`;
}

/* ----------------------------------------------------------------------------
 * O núcleo: seções (puro, testável)
 * ------------------------------------------------------------------------- */

export interface SecaoDoNucleo {
  nivel: 2 | 3;
  titulo: string;
  /** Posição do título no texto. */
  inicio: number;
  /** Fim do texto próprio (até o próximo título de qualquer nível). */
  fim: number;
  /** Fim contando as subseções (até o próximo título do mesmo nível ou acima). */
  fimComSubsecoes: number;
  tamanho: number;
  tamanhoComSubsecoes: number;
}

export function listarSecoesDoNucleo(conteudo: string): SecaoDoNucleo[] {
  const re = /^(#{2,3})[ \t]+(.+?)[ \t]*$/gm;
  const cabecalhos: Array<{ nivel: 2 | 3; titulo: string; inicio: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(conteudo))) {
    cabecalhos.push({ nivel: m[1].length === 2 ? 2 : 3, titulo: m[2].trim(), inicio: m.index });
  }
  return cabecalhos.map((c, i) => {
    const fim = i + 1 < cabecalhos.length ? cabecalhos[i + 1].inicio : conteudo.length;
    let fimComSubsecoes = conteudo.length;
    for (let j = i + 1; j < cabecalhos.length; j++) {
      if (cabecalhos[j].nivel <= c.nivel) {
        fimComSubsecoes = cabecalhos[j].inicio;
        break;
      }
    }
    return { ...c, fim, fimComSubsecoes, tamanho: fim - c.inicio, tamanhoComSubsecoes: fimComSubsecoes - c.inicio };
  });
}

function normalizarParaBusca(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[“”"']/g, '').replace(/\s+/g, ' ').trim();
}

/** A seção cujo título contém o termo (prefere o título exato), com as subseções, cortada em `max`. */
export function trechoDoNucleo(conteudo: string, termo: string, max = TAMANHO_MAXIMO_DO_TRECHO): { secao: SecaoDoNucleo; texto: string; cortado: boolean } | null {
  const alvo = normalizarParaBusca(termo);
  if (!alvo) return null;
  const secoes = listarSecoesDoNucleo(conteudo);
  const secao = secoes.find((s) => normalizarParaBusca(s.titulo) === alvo) ?? secoes.find((s) => normalizarParaBusca(s.titulo).includes(alvo));
  if (!secao) return null;
  const inteiro = conteudo.slice(secao.inicio, secao.fimComSubsecoes).trimEnd();
  const cortado = inteiro.length > max;
  return { secao, texto: cortado ? inteiro.slice(0, max) : inteiro, cortado };
}

/* ----------------------------------------------------------------------------
 * Bairros foco (puro, testável)
 * ------------------------------------------------------------------------- */

const COM_ACENTO = 'áàâãäéèêëíìîïóòôõöúùûüçñ';
const SEM_ACENTO = 'aaaaaeeeeiiiiooooouuuucn';

/** O mesmo que public.bruna_normaliza_texto: minúsculas, o translate de acentos do banco e tudo que não é letra ou número vira espaço. */
export function normalizarComoOBanco(texto: unknown): string {
  let s = '';
  for (const ch of String(texto ?? '').toLowerCase()) {
    const i = COM_ACENTO.indexOf(ch);
    s += i >= 0 ? SEM_ACENTO[i] : ch;
  }
  return s.replace(/[^a-z0-9]+/g, ' ').trim();
}

const numeroOuZero = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Um item da lista, enxuto: só as regras que existem. */
function itemEnxuto(i: Obj): Obj {
  const o: Obj = { nome: i.nome, leads: numeroOuZero(i.leads), agendados: numeroOuZero(i.agendados) };
  if (Array.isArray(i.so_se) && i.so_se.length) o.so_se = i.so_se;
  if (Array.isArray(i.nao_se) && i.nao_se.length) o.nao_se = i.nao_se;
  if (typeof i.observacao === 'string' && i.observacao.trim()) o.observacao = i.observacao.trim();
  return o;
}

/**
 * O que bruna_gestor_bairros_foco_painel devolve, enxuto para o modelo: os
 * itens sem as datas de gravação, os pedidos fora do foco com a data em
 * Brasília e os totais de leads do período.
 */
export function resumirPainelDoFoco(painel: unknown): Obj {
  const p = objeto(painel) ?? {};
  const itens = (Array.isArray(p.itens) ? p.itens : []).map(objeto).filter((i): i is Obj => Boolean(i));
  const periodo = objeto(p.periodo);
  const comBairro = numeroOuZero(p.com_bairro);
  const noFoco = numeroOuZero(p.no_foco);
  const bairros = itens.filter((i) => i.tipo === 'bairro').map(itemEnxuto);
  const cidades = itens.filter((i) => i.tipo === 'cidade').map(itemEnxuto);
  const fora = (Array.isArray(p.fora_do_foco) ? p.fora_do_foco : [])
    .map(objeto)
    .filter((f): f is Obj => Boolean(f))
    .map((f) => ({
      bairro: f.bairro ?? null,
      cidade: f.cidade ?? null,
      leads: numeroOuZero(f.leads),
      agendados: numeroOuZero(f.agendados),
      ultimo: dataHoraBr(f.ultimo_em),
      contato_exemplo: f.contato_exemplo ?? null,
    }));
  return {
    praca: { region: p.region ?? null, nome: p.nome ?? null, oferece_consultoria: p.oferece_consultoria !== false },
    periodo: { dias: periodo?.dias ?? null, de: dataHoraBr(periodo?.de), ate: dataHoraBr(periodo?.ate) },
    totais: {
      bairros: bairros.length,
      cidades: cidades.length,
      leads_com_bairro: comBairro,
      leads_no_foco: noFoco,
      leads_fora_do_foco: Math.max(0, comBairro - noFoco),
      leads_sem_bairro: numeroOuZero(p.sem_bairro),
    },
    bairros,
    cidades,
    fora_do_foco: fora,
  };
}

/** A explicação do resultado de bruna_gestor_bairro_foco_testar em uma frase (a mesma da tela Bairros foco). */
export function fraseDoTesteDoFoco(resultado: unknown): string {
  const r = objeto(resultado) ?? {};
  if (r.oferece_consultoria === false) return 'Não é foco: a praça está sem lista, e sem lista a Bruna não oferece consultoria nela.';
  if (r.foco === true) {
    const com = r.tipo === 'cidade' ? `a cidade ${r.nome}` : String(r.nome ?? 'um item da lista');
    if (r.como === 'nucleo') return `É foco: casou com ${com} pelo núcleo '${r.nucleo}'.`;
    if (r.como === 'nome_completo') return `É foco: casou com ${com} pelo nome completo.`;
    return `É foco: casou com ${com}.`;
  }
  const primeiro = objeto(Array.isArray(r.bloqueados) ? r.bloqueados[0] : null);
  if (primeiro?.motivo === 'nao_se') return `Não é foco: '${primeiro.nome}' não vale quando o texto tem '${primeiro.termo}'.`;
  if (primeiro?.motivo === 'so_se') {
    const exige = Array.isArray(primeiro.exige) ? primeiro.exige.map(String) : [];
    return `Não é foco: '${primeiro.nome}' só vale se a cidade for ${exige.join(' ou ')}.`;
  }
  return 'Não é foco: nenhum item da lista casou.';
}

export interface ItemDaLista {
  tipo: string;
  nome: string;
}

/**
 * Confere uma ação de bairros foco contra a lista de hoje da praça (a mesma
 * regra de bruna_bairros_foco_validar e do remover): o item a alterar ou tirar
 * tem de estar lá com o nome exato; o nome novo não pode repetir outro do
 * mesmo tipo (sem acento e sem caixa); e o último item não sai. Devolve o
 * problema, ou null quando está tudo certo.
 */
export function problemaNaListaDoFoco(acao: Obj, lista: ItemDaLista[]): string | null {
  const praca = String(acao.region);
  const existe = (tipo: unknown, nome: unknown) => lista.some((i) => i.tipo === tipo && i.nome === nome);
  const exemplo = (tipo: unknown, nome: unknown) => {
    const alvo = normalizarComoOBanco(nome);
    const parecido = lista.find((i) => i.tipo === tipo && normalizarComoOBanco(i.nome) === alvo);
    return parecido ? ` (na lista está "${parecido.nome}")` : '';
  };
  if (acao.tipo === 'bairro_foco_remover') {
    if (!existe(acao.tipo_item, acao.nome)) {
      return `"${acao.nome}" (${acao.tipo_item}) não está nos bairros foco de ${praca}${exemplo(acao.tipo_item, acao.nome)}: leia com bairros_foco e use o nome exato`;
    }
    if (lista.length <= 1) return `"${acao.nome}" é o último item de ${praca}: sem nenhum, a praça deixa de ter consultoria`;
    return null;
  }
  const original = typeof acao.nome_original === 'string' ? acao.nome_original : null;
  const tipoOriginal = original ? (acao.tipo_original ?? acao.tipo_item) : null;
  if (original && !existe(tipoOriginal, original)) {
    return `"${original}" (${tipoOriginal}) não está nos bairros foco de ${praca}${exemplo(tipoOriginal, original)}: leia com bairros_foco e use o nome exato em nome_original`;
  }
  const alvo = normalizarComoOBanco(acao.nome);
  const repetido = lista.find((i) => i.tipo === acao.tipo_item && normalizarComoOBanco(i.nome) === alvo && !(original && i.tipo === tipoOriginal && i.nome === original));
  if (repetido) return `já existe "${repetido.nome}" (${acao.tipo_item}) nos bairros foco de ${praca}: para mudar as regras dele, use nome_original`;
  return null;
}

/* ----------------------------------------------------------------------------
 * propor_acao: validação (puro, testável)
 * ------------------------------------------------------------------------- */

export interface Evidencia {
  contato_id?: number;
  mensagem_id?: number;
  trecho?: string;
  nota?: string;
}

export interface PropostaValidada {
  tipo: (typeof TIPOS_DE_SUGESTAO)[number];
  titulo: string;
  descricao: string;
  impacto: string | null;
  prioridade: (typeof PRIORIDADES)[number];
  evidencias: Evidencia[];
  acao: Obj | null;
}

class PropostaInvalida extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'PropostaInvalida';
  }
}

const objeto = (v: unknown): Obj | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : null);

function texto(v: unknown, nome: string, max: number, opcional = false): string | undefined {
  if (v == null) {
    if (opcional) return undefined;
    throw new PropostaInvalida(`falta "${nome}"`);
  }
  if (typeof v !== 'string') throw new PropostaInvalida(`"${nome}" tem de ser texto`);
  const s = v.trim();
  if (!s) {
    if (opcional) return undefined;
    throw new PropostaInvalida(`falta "${nome}"`);
  }
  if (s.length > max) throw new PropostaInvalida(`"${nome}" passa de ${max} caracteres`);
  return s;
}

function inteiroObrigatorio(v: unknown, nome: string): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
  if (!Number.isInteger(n)) throw new PropostaInvalida(`"${nome}" tem de ser um número inteiro`);
  return n;
}

function inteiroOpcional(v: unknown, nome: string): number | undefined {
  return v == null ? undefined : inteiroObrigatorio(v, nome);
}

function booleano(v: unknown, nome: string): boolean {
  if (typeof v !== 'boolean') throw new PropostaInvalida(`"${nome}" tem de ser true ou false`);
  return v;
}

function opcao<T extends string>(v: unknown, nome: string, opcoes: readonly T[], padrao?: T): T {
  if (v == null && padrao !== undefined) return padrao;
  if (typeof v !== 'string' || !(opcoes as readonly string[]).includes(v)) {
    throw new PropostaInvalida(`"${nome}" tem de ser um de: ${opcoes.join(', ')}`);
  }
  return v as T;
}

function camposPermitidos(v: unknown, nome: string, permitidos: readonly string[]): Obj {
  const o = objeto(v);
  if (!o) throw new PropostaInvalida(`"${nome}" tem de ser um objeto`);
  const saida = Object.fromEntries(Object.entries(o).filter(([k]) => permitidos.includes(k)));
  if (!Object.keys(saida).length) throw new PropostaInvalida(`"${nome}" não trouxe nenhum campo válido (${permitidos.join(', ')})`);
  return saida;
}

function listaDeTextos(v: unknown, nome: string, max: number): string[] | undefined {
  if (v == null) return undefined;
  if (!Array.isArray(v)) throw new PropostaInvalida(`"${nome}" tem de ser uma lista`);
  return v.map((x) => umaLinha(x)).filter(Boolean).slice(0, max);
}

/** O nome de um item dos bairros foco como o banco grava: espaços colapsados, de 2 a 80 caracteres, com letra ou número. */
function nomeDoItemDoFoco(v: unknown, nome: string): string {
  if (typeof v !== 'string') throw new PropostaInvalida(`"${nome}" tem de ser texto`);
  const s = umaLinha(v);
  if (s.length < 2 || s.length > NOME_DO_ITEM_MAXIMO) throw new PropostaInvalida(`"${nome}" tem de ter de 2 a ${NOME_DO_ITEM_MAXIMO} caracteres`);
  if (!normalizarComoOBanco(s)) throw new PropostaInvalida(`"${nome}" tem de ter letras ou números`);
  return s;
}

/** so_se e nao_se: undefined quando não veio (null também); limpos, sem repetir, até 20 termos de até 60 caracteres. */
function termosDoFoco(v: unknown, nome: string): string[] | undefined {
  if (v == null) return undefined;
  if (!Array.isArray(v)) throw new PropostaInvalida(`"${nome}" tem de ser uma lista`);
  const vistos = new Set<string>();
  const saida: string[] = [];
  for (const x of v) {
    const t = umaLinha(x);
    const chave = normalizarComoOBanco(t);
    if (!chave || vistos.has(chave)) continue;
    if (t.length > TERMO_MAXIMO) throw new PropostaInvalida(`o termo "${cortar(t, 40)}" de "${nome}" passa de ${TERMO_MAXIMO} caracteres`);
    vistos.add(chave);
    saida.push(t);
  }
  if (saida.length > TERMOS_MAXIMOS) throw new PropostaInvalida(`"${nome}" aceita no máximo ${TERMOS_MAXIMOS} termos`);
  return saida;
}

/** Valida e limpa `acao` (só campos conhecidos). Lança PropostaInvalida. */
export function validarAcao(acao: unknown): Obj | null {
  if (acao == null) return null;
  const a = objeto(acao);
  if (!a) throw new PropostaInvalida('"acao" tem de ser um objeto ou null');
  const tipo = opcao(a.tipo, 'acao.tipo', TIPOS_DE_ACAO);
  switch (tipo) {
    case 'instrucao_criar': {
      const escopo = opcao(a.escopo, 'acao.escopo', ['global', 'region', 'contato'] as const);
      const saida: Obj = { tipo, escopo, titulo: texto(a.titulo, 'acao.titulo', 120), texto: texto(a.texto, 'acao.texto', 1500) };
      if (escopo === 'region') saida.region = opcao(a.region, 'acao.region', REGIOES_DA_ORIENTACAO);
      if (escopo === 'contato') saida.contato_id = inteiroObrigatorio(a.contato_id, 'acao.contato_id');
      if (a.aplica_em != null) {
        if (!Array.isArray(a.aplica_em)) throw new PropostaInvalida('"acao.aplica_em" tem de ser uma lista');
        const turnos = a.aplica_em.map((t) => opcao(t, 'acao.aplica_em', ['conversa', 'toque', 'retorno'] as const));
        if (turnos.length) saida.aplica_em = [...new Set(turnos)];
      }
      const prioridade = inteiroOpcional(a.prioridade, 'acao.prioridade');
      if (prioridade !== undefined) saida.prioridade = prioridade;
      const vigencia = texto(a.vigencia_fim, 'acao.vigencia_fim', 40, true);
      if (vigencia) {
        if (Number.isNaN(Date.parse(vigencia))) throw new PropostaInvalida('"acao.vigencia_fim" tem de ser uma data ISO');
        saida.vigencia_fim = vigencia;
      }
      return saida;
    }
    case 'instrucao_desativar': {
      const saida: Obj = { tipo, id: inteiroObrigatorio(a.id, 'acao.id') };
      const motivo = texto(a.motivo, 'acao.motivo', 400, true);
      if (motivo) saida.motivo = motivo;
      return saida;
    }
    case 'base_criar': {
      const saida: Obj = {
        tipo,
        titulo: texto(a.titulo, 'acao.titulo', 200),
        conteudo: texto(a.conteudo, 'acao.conteudo', 6000),
        categoria: texto(a.categoria, 'acao.categoria', 40),
      };
      const chave = texto(a.chave, 'acao.chave', 60, true);
      if (chave) saida.chave = chave;
      const region = texto(a.region, 'acao.region', 30, true);
      if (region) saida.region = region;
      const palavras = listaDeTextos(a.palavras_chave, 'acao.palavras_chave', 40);
      if (palavras?.length) saida.palavras_chave = palavras;
      const prioridade = inteiroOpcional(a.prioridade, 'acao.prioridade');
      if (prioridade !== undefined) saida.prioridade = prioridade;
      const fonte = texto(a.fonte, 'acao.fonte', 200, true);
      if (fonte) saida.fonte = fonte;
      if (a.confianca != null) saida.confianca = opcao(a.confianca, 'acao.confianca', ['alta', 'media'] as const);
      return saida;
    }
    case 'base_atualizar':
      return { tipo, id: inteiroObrigatorio(a.id, 'acao.id'), campos: camposPermitidos(a.campos, 'acao.campos', CAMPOS_DA_BASE) };
    case 'revisao_criar': {
      const saida: Obj = {
        tipo,
        contato_id: inteiroObrigatorio(a.contato_id, 'acao.contato_id'),
        tipo_revisao: texto(a.tipo_revisao, 'acao.tipo_revisao', 60, true) ?? 'outro',
        gravidade: opcao(a.gravidade, 'acao.gravidade', ['grave', 'media', 'leve'] as const, 'media'),
        erro: texto(a.erro, 'acao.erro', 400),
        na_proxima: texto(a.na_proxima, 'acao.na_proxima', 400),
      };
      const horas = inteiroOpcional(a.horas, 'acao.horas');
      if (horas !== undefined) saida.horas = horas;
      return saida;
    }
    case 'regua_pausar': {
      const saida: Obj = { tipo, escada: booleano(a.escada, 'acao.escada'), retornos: booleano(a.retornos, 'acao.retornos') };
      const motivo = texto(a.motivo, 'acao.motivo', 200, true);
      if (motivo) saida.motivo = motivo;
      return saida;
    }
    case 'fup90_etapa_atualizar':
      return { tipo, id: inteiroObrigatorio(a.id, 'acao.id'), campos: camposPermitidos(a.campos, 'acao.campos', CAMPOS_DA_ETAPA_FUP90) };
    case 'fup90_campanha_atualizar':
      return { tipo, id: inteiroObrigatorio(a.id, 'acao.id'), campos: camposPermitidos(a.campos, 'acao.campos', CAMPOS_DA_CAMPANHA_FUP90) };
    case 'nucleo_trecho': {
      if (typeof a.trecho_novo !== 'string') throw new PropostaInvalida('"acao.trecho_novo" tem de ser texto (vazio apaga o trecho)');
      return { tipo, trecho_atual: texto(a.trecho_atual, 'acao.trecho_atual', 20000), trecho_novo: a.trecho_novo, nota: texto(a.nota, 'acao.nota', 500) };
    }
    case 'config_atualizar': {
      const valor = objeto(a.valor);
      if (!valor || !Object.keys(valor).length) throw new PropostaInvalida('"acao.valor" tem de ser um objeto com os campos a mudar');
      return { tipo, chave: texto(a.chave, 'acao.chave', 40), valor };
    }
    case 'lead_bruna':
      return { tipo, contato_id: inteiroObrigatorio(a.contato_id, 'acao.contato_id'), ligada: booleano(a.ligada, 'acao.ligada') };
    case 'bairro_foco_salvar': {
      const saida: Obj = {
        tipo,
        region: opcao(a.region, 'acao.region', PRACAS_COM_CONSULTORIA),
        tipo_item: opcao(a.tipo_item, 'acao.tipo_item', TIPOS_DO_ITEM_DO_FOCO),
        nome: nomeDoItemDoFoco(a.nome, 'acao.nome'),
      };
      const soSe = termosDoFoco(a.so_se, 'acao.so_se');
      if (soSe) saida.so_se = soSe;
      const naoSe = termosDoFoco(a.nao_se, 'acao.nao_se');
      if (naoSe) saida.nao_se = naoSe;
      // Ausente mantém a nota (na alteração); null ou vazio apaga.
      if (a.observacao !== undefined) saida.observacao = texto(a.observacao, 'acao.observacao', OBSERVACAO_MAXIMA, true) ?? null;
      const original = texto(a.nome_original, 'acao.nome_original', NOME_DO_ITEM_MAXIMO, true);
      if (original) saida.nome_original = original;
      if (a.tipo_original != null) {
        if (!original) throw new PropostaInvalida('"acao.tipo_original" só vale junto com "acao.nome_original" (alterar um item que existe)');
        saida.tipo_original = opcao(a.tipo_original, 'acao.tipo_original', TIPOS_DO_ITEM_DO_FOCO);
      }
      const motivo = texto(a.motivo, 'acao.motivo', MOTIVO_MAXIMO, true);
      if (motivo) saida.motivo = motivo;
      return saida;
    }
    case 'bairro_foco_remover': {
      const saida: Obj = {
        tipo,
        region: opcao(a.region, 'acao.region', PRACAS_COM_CONSULTORIA),
        tipo_item: opcao(a.tipo_item, 'acao.tipo_item', TIPOS_DO_ITEM_DO_FOCO),
        nome: texto(a.nome, 'acao.nome', NOME_DO_ITEM_MAXIMO) as string,
      };
      const motivo = texto(a.motivo, 'acao.motivo', MOTIVO_MAXIMO, true);
      if (motivo) saida.motivo = motivo;
      return saida;
    }
    case 'manual':
      return { tipo, instrucoes: texto(a.instrucoes, 'acao.instrucoes', 4000) };
    default:
      throw new PropostaInvalida(`"acao.tipo" desconhecido: ${String(tipo)}`);
  }
}

function validarEvidencias(v: unknown): Evidencia[] {
  if (v == null) return [];
  if (!Array.isArray(v)) throw new PropostaInvalida('"evidencias" tem de ser uma lista');
  const saida: Evidencia[] = [];
  for (const item of v.slice(0, 12)) {
    const o = objeto(item);
    if (!o) continue;
    const ev: Evidencia = {};
    const contato = inteiroOpcional(o.contato_id, 'evidencias.contato_id');
    if (contato !== undefined) ev.contato_id = contato;
    const mensagem = inteiroOpcional(o.mensagem_id, 'evidencias.mensagem_id');
    if (mensagem !== undefined) ev.mensagem_id = mensagem;
    const trecho = texto(o.trecho, 'evidencias.trecho', 600, true);
    if (trecho) ev.trecho = trecho;
    const nota = texto(o.nota, 'evidencias.nota', 400, true);
    if (nota) ev.nota = nota;
    if (Object.keys(ev).length) saida.push(ev);
  }
  return saida;
}

export type ResultadoDaValidacao = { ok: true; proposta: PropostaValidada } | { ok: false; erro: string };

/** Valida a entrada da tool propor_acao (que vai sem strict). */
export function validarPropostaDeAcao(entrada: unknown): ResultadoDaValidacao {
  const e = objeto(entrada);
  if (!e) return { ok: false, erro: 'a entrada tem de ser um objeto' };
  try {
    return {
      ok: true,
      proposta: {
        tipo: opcao(e.tipo, 'tipo', TIPOS_DE_SUGESTAO),
        titulo: texto(e.titulo, 'titulo', 160) as string,
        descricao: texto(e.descricao, 'descricao', 6000) as string,
        impacto: texto(e.impacto, 'impacto', 1000, true) ?? null,
        prioridade: opcao(e.prioridade, 'prioridade', PRIORIDADES, 'media'),
        evidencias: validarEvidencias(e.evidencias),
        acao: validarAcao(e.acao),
      },
    };
  } catch (err) {
    if (err instanceof PropostaInvalida) return { ok: false, erro: err.message };
    throw err;
  }
}

/* ----------------------------------------------------------------------------
 * Executores
 * ------------------------------------------------------------------------- */

type Executor = (entrada: Obj, ctx: ContextoDasTools) => Promise<ResultadoDaTool>;

const AUTOR_DA_BUSCA: Record<string, string> = { agent: 'Bruna', customer: 'cliente', human: 'atendente', sistema: 'sistema' };

/** Audita sem derrubar a ação: o supabase-js não lança, devolve { error }; a recusa vai para o log da função. */
async function auditar(ctx: ContextoDasTools, acao: string, entidade: string, entidadeId: number | null, contatoId: number | null, detalhes: Obj): Promise<void> {
  try {
    const { error } = await ctx.banco.rpc('bruna_gestor_auditar', {
      p_acao: acao,
      p_entidade: entidade,
      p_entidade_id: entidadeId,
      p_contato_id: contatoId,
      p_detalhes: detalhes,
    });
    if (error) console.warn('[bruna-copiloto] auditoria falhou', acao, error.message);
  } catch (e) {
    console.warn('[bruna-copiloto] auditoria falhou', acao, e instanceof Error ? e.message : String(e));
  }
}

const EXECUTORES: Record<string, Executor> = {
  async buscar_leads(e, ctx) {
    const q = typeof e.q === 'string' ? e.q.trim() : '';
    const region = typeof e.region === 'string' && e.region ? e.region : null;
    const filtro = typeof e.filtro === 'string' && e.filtro ? e.filtro : null;
    const limite = inteiro(e.limite, 20, 1, 60);
    const linhas = (await rpc<Obj[] | null>(ctx.banco, 'bruna_gestor_buscar_leads', { p_q: q || null, p_region: region, p_filtro: filtro, p_limite: limite })) ?? [];
    const saida = linhas.map((l) => {
      const marcas: string[] = [];
      if (l.agendado_at) marcas.push(`agendado${l.agendado_para ? ` para ${dataHoraBr(l.agendado_para)}` : ''}${l.agendado_por ? ` (${l.agendado_por})` : ''}`);
      if (l.entregue) marcas.push(`entregue: ${l.entregue}`);
      if (l.revisao_viva) marcas.push('revisão viva');
      if (Number(l.instrucoes) > 0) marcas.push(`${l.instrucoes} orientação(ões)`);
      if (l.retorno_pendente) marcas.push(`retorno ${dataHoraBr(l.retorno_pendente)}`);
      if (l.em_escada) marcas.push('em escada');
      if (l.optout) marcas.push('opt-out');
      const lugar = [l.bairro, l.cidade].filter(Boolean).join('/');
      const ultima = l.ultima_mensagem ? ` por ${AUTOR_DA_BUSCA[String(l.ultimo_autor)] ?? l.ultimo_autor ?? '?'}: "${cortar(umaLinha(l.ultima_mensagem), 100)}"` : '';
      return `[${l.id}] ${umaLinha(l.user_name) || 'sem nome'} · ${l.region} · Bruna ${l.status ?? '?'}${l.last_message_at ? ` · última ${dataHoraBr(l.last_message_at)}${ultima}` : ''}${lugar ? ` · ${lugar}` : ''}${l.objetivo ? ` · objetivo: ${cortar(umaLinha(l.objetivo), 80)}` : ''}${marcas.length ? ` · ${marcas.join(', ')}` : ''}`;
    });
    const criterio = [q ? `"${q}"` : '', region ? `praça ${region}` : '', filtro ? `filtro ${filtro}` : ''].filter(Boolean).join(', ');
    return {
      resultado: saida.length ? `${saida.length} lead(s), do mais recente ao mais antigo:\n${saida.join('\n')}` : 'Nenhum lead encontrado com esses critérios.',
      resumo: `Busquei leads${criterio ? ` (${criterio})` : ''}: ${saida.length} resultado(s)`,
    };
  },

  async lead_estado(e, ctx) {
    const contatoId = idObrigatorio(e.contato_id, 'contato_id');
    const estado = await rpc<Obj | null>(ctx.banco, 'bruna_gestor_lead_estado', { p_contato_id: contatoId });
    const contato = estado && objeto(estado.contato);
    if (!contato) throw new Error(`o lead ${contatoId} não existe`);
    const nome = umaLinha(contato.user_name);
    return { resultado: compacto(estado), resumo: `Li o estado do lead ${contatoId}${nome ? ` (${nome})` : ''}` };
  },

  async lead_conversa(e, ctx) {
    const contatoId = idObrigatorio(e.contato_id, 'contato_id');
    const limite = inteiro(e.limite, LIMITE_PADRAO_DA_CONVERSA, 1, LIMITE_MAXIMO_DA_CONVERSA);
    const antesDeId = e.antes_de_id == null ? null : idObrigatorio(e.antes_de_id, 'antes_de_id');
    let q = ctx.banco
      .from('mensagens')
      .select('id, created_at, sender_type, direction, content, message_type, template_name, sender_name, transcricao, midia_descricao, auto_resposta')
      .eq('contato_id', contatoId)
      .neq('sender_type', 'copiloto');
    if (antesDeId) q = q.lt('id', antesDeId);
    q = q.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(limite);
    const linhas = ((await consulta<MensagemDaConversa[] | null>(q)) ?? []).slice().reverse();
    if (!linhas.length) {
      return { resultado: antesDeId ? `Não há mensagens antes da nº ${antesDeId}.` : `O lead ${contatoId} não tem mensagens.`, resumo: `Li a conversa do lead ${contatoId}: sem mensagens` };
    }
    const menorId = linhas[0].id;
    const cabecalho = `${linhas.length} mensagem(ns) do lead ${contatoId}, da mais antiga para a mais nova (horário de Brasília).${linhas.length >= limite ? ` Para ver as anteriores, chame de novo com antes_de_id=${menorId}.` : ' É o começo da conversa.'}`;
    return {
      resultado: `${cabecalho}\n${linhas.map(formatarLinhaDaConversa).join('\n')}`,
      resumo: `Li ${linhas.length} mensagens da conversa do lead ${contatoId}${antesDeId ? ` (antes da nº ${antesDeId})` : ''}`,
    };
  },

  async lead_linha_do_tempo(e, ctx) {
    const contatoId = idObrigatorio(e.contato_id, 'contato_id');
    const limite = inteiro(e.limite, 60, 1, 300);
    const eventos = (await rpc<Obj[] | null>(ctx.banco, 'bruna_gestor_lead_timeline', { p_contato_id: contatoId, p_limite: limite })) ?? [];
    const linhas = eventos.map((ev) => {
      const extra = objeto(ev.extra);
      const detalhe = cortar(umaLinha(ev.detalhe), 300);
      let cauda = '';
      if (ev.tipo === 'revisao' && extra) {
        const estado = extra.cancelada_em ? 'cancelada' : extra.verificada_em ? 'verificada' : 'sem verificar';
        cauda = ` | na próxima: ${cortar(umaLinha(extra.na_proxima), 300)} | ${estado}`;
      } else if (ev.tipo === 'retorno' && extra) {
        cauda = ` | prometido por ${extra.quem_prometeu ?? '?'}${extra.esperando ? `, esperando ${umaLinha(extra.esperando)}` : ''}`;
      } else if (ev.tipo === 'instrucao' && extra) {
        cauda = ` | ${extra.ativa ? 'ativa' : 'inativa'}${extra.por ? `, por ${extra.por}` : ''}`;
      }
      return `${dataHoraBr(ev.quando)} [${ev.tipo}] ${umaLinha(ev.titulo)}${detalhe ? ` — ${detalhe}` : ''}${cauda} (ref ${ev.ref})`;
    });
    return {
      resultado: linhas.length ? `${linhas.length} evento(s) do lead ${contatoId}, do mais novo ao mais antigo:\n${linhas.join('\n')}` : `O lead ${contatoId} não tem eventos na linha do tempo.`,
      resumo: `Li a linha do tempo do lead ${contatoId}: ${linhas.length} evento(s)`,
    };
  },

  async metricas(e, ctx) {
    const dias = inteiro(e.dias, 7, 1, 365);
    const agora = ctx.agora ? ctx.agora() : new Date();
    const atual = periodoDosUltimos(dias, agora);
    const anterior = periodoAnterior(atual);
    const [m1, m2] = await Promise.all([
      rpc<Obj>(ctx.banco, 'bruna_gestor_metricas', { p_de: atual.de, p_ate: atual.ate }),
      rpc<Obj>(ctx.banco, 'bruna_gestor_metricas', { p_de: anterior.de, p_ate: anterior.ate }),
    ]);
    return {
      resultado: compacto({ dias, periodo_atual: { de: atual.de, ate: atual.ate }, atual: m1, periodo_anterior: { de: anterior.de, ate: anterior.ate }, anterior: m2 }),
      resumo: `Li as métricas dos últimos ${dias} dias e do período anterior`,
    };
  },

  async erros(e, ctx) {
    const dias = inteiro(e.dias, 7, 1, 365);
    const p = periodoDosUltimos(dias, ctx.agora ? ctx.agora() : new Date());
    const dados = await rpc<Obj>(ctx.banco, 'bruna_gestor_erros', { p_de: p.de, p_ate: p.ate });
    return { resultado: compacto({ dias, periodo: { de: p.de, ate: p.ate }, ...dados }), resumo: `Li os erros e revisões dos últimos ${dias} dias` };
  },

  async alertas(_e, ctx) {
    const lista = (await rpc<Obj[] | null>(ctx.banco, 'bruna_gestor_alertas')) ?? [];
    const linhas = lista.map((a) => `[${a.gravidade}] ${umaLinha(a.titulo)}${a.detalhe ? ` — ${cortar(umaLinha(a.detalhe), 300)}` : ''}${a.acao ? ` → ${umaLinha(a.acao)}` : ''} (${a.chave})`);
    return {
      resultado: linhas.length ? `${linhas.length} alerta(s):\n${linhas.join('\n')}` : 'Nenhum alerta vivo agora.',
      resumo: `Li os alertas: ${linhas.length}`,
    };
  },

  async regua_resumo(e, ctx) {
    const dias = inteiro(e.dias, 7, 1, 365);
    const p = periodoDosUltimos(dias, ctx.agora ? ctx.agora() : new Date());
    const dados = await rpc<Obj>(ctx.banco, 'bruna_gestor_regua_resumo', { p_de: p.de, p_ate: p.ate });
    return { resultado: compacto({ dias, periodo: { de: p.de, ate: p.ate }, ...dados }), resumo: `Li o resumo da régua dos últimos ${dias} dias` };
  },

  async orientacoes(e, ctx) {
    if (e.contato_id != null) {
      const contatoId = idObrigatorio(e.contato_id, 'contato_id');
      const vivas = (await rpc<Obj[] | null>(ctx.banco, 'bruna_instrucoes_vivas', { p_contato_id: contatoId })) ?? [];
      return {
        resultado: vivas.length ? compacto(vivas) : `Nenhuma orientação vale para o lead ${contatoId} agora.`,
        resumo: `Li as orientações que valem para o lead ${contatoId}: ${vivas.length}`,
      };
    }
    const linhas =
      (await consulta<Obj[] | null>(
        ctx.banco
          .from('bruna_instrucoes')
          .select('id, escopo, region, contato_id, titulo, texto, aplica_em, prioridade, vigencia_inicio, vigencia_fim, origem, criado_por_email, criado_em')
          .eq('ativa', true)
          .order('escopo')
          .order('prioridade')
          .limit(200),
      )) ?? [];
    const saida = linhas.map((i) => {
      const alvo = i.escopo === 'global' ? 'todas as conversas' : i.escopo === 'region' ? `praça ${i.region}` : `lead ${i.contato_id}`;
      const turnos = Array.isArray(i.aplica_em) ? i.aplica_em.join('/') : 'conversa/toque/retorno';
      return `[${i.id}] ${alvo} · ${umaLinha(i.titulo)}: ${umaLinha(i.texto)} · vale em ${turnos}${i.vigencia_fim ? ` até ${dataHoraBr(i.vigencia_fim)}` : ''} · prioridade ${i.prioridade} · ${i.origem}${i.criado_por_email ? ` (${i.criado_por_email})` : ''} em ${dataHoraBr(i.criado_em)}`;
    });
    return {
      resultado: saida.length ? `${saida.length} orientação(ões) ativa(s):\n${saida.join('\n')}` : 'Não há orientação ativa.',
      resumo: `Li as orientações ativas: ${saida.length}`,
    };
  },

  async base_buscar(e, ctx) {
    const termo = textoObrigatorio(e.termo, 'termo');
    const limite = inteiro(e.limite, 8, 1, 20);
    const colunas = 'id, chave, titulo, categoria, region, conteudo';
    let linhas = (await consulta<Obj[] | null>(
      ctx.banco.from('bruna_conhecimento').select(colunas).eq('ativo', true).textSearch('busca', termo, { config: 'portuguese', type: 'websearch' }).limit(limite),
    )) ?? [];
    let modo = 'busca de texto';
    if (!linhas.length) {
      const t = termo.replace(/[,()"'\\]/g, ' ').replace(/\s+/g, ' ').trim();
      if (t) {
        linhas = (await consulta<Obj[] | null>(
          ctx.banco.from('bruna_conhecimento').select(colunas).eq('ativo', true).or(`titulo.ilike.%${t}%,conteudo.ilike.%${t}%`).limit(limite),
        )) ?? [];
        modo = 'trecho do título ou do conteúdo';
      }
    }
    const saida = linhas.map((k) => ({
      id: k.id,
      chave: k.chave,
      titulo: k.titulo,
      categoria: k.categoria,
      region: k.region ?? null,
      conteudo: cortar(String(k.conteudo ?? ''), CORTE_DO_CONTEUDO_DA_BASE),
    }));
    return {
      resultado: saida.length ? compacto({ busca: modo, entradas: saida }) : `Nada na base ativa para "${termo}" (busca de texto e por trecho).`,
      resumo: `Busquei "${cortar(termo, 60)}" na base: ${saida.length} entrada(s)`,
    };
  },

  async nucleo_secoes(_e, ctx) {
    const atual = await consulta<Obj | null>(ctx.banco.from('bruna_prompt_atual').select('id, numero, conteudo').maybeSingle());
    if (!atual || typeof atual.conteudo !== 'string') throw new Error('não há versão publicada do núcleo no banco');
    const conteudo = atual.conteudo;
    const secoes = listarSecoesDoNucleo(conteudo);
    const preambulo = secoes.length ? secoes[0].inicio : conteudo.length;
    const linhas = secoes.map((s) =>
      `${'#'.repeat(s.nivel)} ${s.titulo} (${s.tamanho}${s.nivel === 2 && s.tamanhoComSubsecoes !== s.tamanho ? `; com subseções ${s.tamanhoComSubsecoes}` : ''})`,
    );
    return {
      resultado: `Núcleo publicado nº ${atual.numero} (${conteudo.length} caracteres). Abertura antes do primeiro título: ${preambulo} caracteres. Seções (tamanho em caracteres):\n${linhas.join('\n')}`,
      resumo: `Listei as ${secoes.length} seções do núcleo (versão nº ${atual.numero})`,
    };
  },

  async nucleo_trecho(e, ctx) {
    const titulo = textoObrigatorio(e.titulo, 'titulo');
    const atual = await consulta<Obj | null>(ctx.banco.from('bruna_prompt_atual').select('id, numero, conteudo').maybeSingle());
    if (!atual || typeof atual.conteudo !== 'string') throw new Error('não há versão publicada do núcleo no banco');
    const achado = trechoDoNucleo(atual.conteudo, titulo);
    if (!achado) {
      const titulos = listarSecoesDoNucleo(atual.conteudo).map((s) => `${'#'.repeat(s.nivel)} ${s.titulo}`);
      return { isError: true, resultado: `Nenhuma seção com "${titulo}" no título. Títulos disponíveis:\n${titulos.join('\n')}`, resumo: `Não achei a seção "${cortar(titulo, 60)}" no núcleo` };
    }
    const aviso = achado.cortado ? `\n\n(cortado em ${TAMANHO_MAXIMO_DO_TRECHO} de ${achado.secao.tamanhoComSubsecoes} caracteres)` : '';
    return {
      resultado: `Seção "${achado.secao.titulo}" do núcleo nº ${atual.numero} (${achado.texto.length} caracteres${achado.cortado ? ', cortada' : ''}):\n\n${achado.texto}${aviso}`,
      resumo: `Li a seção "${cortar(achado.secao.titulo, 60)}" do núcleo (${achado.texto.length} caracteres)`,
    };
  },

  async bairros_foco(e, ctx) {
    const region = pracaComConsultoria(e.region);
    const painel = await rpc<Obj | null>(ctx.banco, 'bruna_gestor_bairros_foco_painel', { p_region: region, p_dias: DIAS_DO_PAINEL_DO_FOCO });
    if (!painel) throw new Error(`o painel dos bairros foco de ${region} veio vazio`);
    const r = resumirPainelDoFoco(painel);
    const totais = r.totais as Obj;
    const nome = umaLinha((r.praca as Obj).nome) || region;
    return {
      resultado: compacto(r),
      resumo: `Li os bairros foco de ${nome}: ${totais.bairros} bairro(s), ${totais.cidades} cidade(s) inteira(s), ${(r.fora_do_foco as unknown[]).length} pedido(s) fora do foco em ${DIAS_DO_PAINEL_DO_FOCO} dias`,
    };
  },

  async bairro_testar(e, ctx) {
    const region = pracaComConsultoria(e.region);
    const bairro = textoObrigatorio(e.bairro, 'bairro');
    const cidade = typeof e.cidade === 'string' && e.cidade.trim() ? e.cidade.trim() : null;
    const r = await rpc<Obj | null>(ctx.banco, 'bruna_gestor_bairro_foco_testar', { p_region: region, p_bairro: bairro, p_cidade: cidade });
    if (!r) throw new Error('o teste do bairro veio vazio');
    const frase = fraseDoTesteDoFoco(r);
    return {
      resultado: compacto({ ...r, explicacao: frase }),
      resumo: `Testei "${cortar(bairro, 40)}"${cidade ? ` (${cortar(cidade, 30)})` : ''} em ${region}: ${r.foco === true ? `foco, casou com ${umaLinha(r.nome)}` : 'fora do foco'}`,
    };
  },

  async sugestoes_pendentes(_e, ctx) {
    const linhas =
      (await consulta<Obj[] | null>(
        ctx.banco.from('bruna_sugestoes').select('id, origem, tipo, titulo, prioridade, criado_em').eq('status', 'pendente').order('criado_em', { ascending: false }).limit(50),
      )) ?? [];
    const saida = linhas.map((s) => `[${s.id}] ${s.tipo} · prioridade ${s.prioridade} · ${s.origem} em ${dataHoraBr(s.criado_em)} · ${umaLinha(s.titulo)}`);
    return {
      resultado: saida.length ? `${saida.length} sugestão(ões) pendente(s):\n${saida.join('\n')}` : 'Nenhuma sugestão pendente.',
      resumo: `Li as sugestões pendentes: ${saida.length}`,
    };
  },

  async propor_acao(e, ctx) {
    const v = validarPropostaDeAcao(e);
    // Comparação explícita: sem strictNullChecks o TypeScript não estreita a união por "!v.ok".
    if (v.ok === false) return { isError: true, resultado: `proposta inválida: ${v.erro}`, resumo: `Proposta recusada: ${cortar(v.erro, 100)}` };
    const p = v.proposta;
    if (p.acao && (p.acao.tipo === 'bairro_foco_salvar' || p.acao.tipo === 'bairro_foco_remover')) {
      // O nome exato e a repetição se conferem agora, contra a lista de hoje:
      // aqui o modelo ainda pode corrigir; no clique do gestor, seria um erro.
      const lista = (await consulta<ItemDaLista[] | null>(ctx.banco.from('bruna_bairros_foco').select('tipo, nome').eq('region', p.acao.region))) ?? [];
      const problema = problemaNaListaDoFoco(p.acao, lista);
      if (problema) return { isError: true, resultado: `proposta inválida: ${problema}`, resumo: `Proposta recusada: ${cortar(problema, 100)}` };
    }
    const linha = {
      origem: 'copiloto',
      status: 'pendente',
      analise_id: null,
      tipo: p.tipo,
      titulo: p.titulo,
      descricao: p.descricao,
      impacto: p.impacto,
      prioridade: p.prioridade,
      evidencias: p.evidencias,
      acao: p.acao,
    };
    const s = await consulta<Obj>(ctx.banco.from('bruna_sugestoes').insert(linha).select('id, tipo, titulo, descricao, prioridade, acao').single());
    const id = Number(s.id);
    ctx.emitir('sugestao', { id, tipo: s.tipo, titulo: s.titulo, descricao: s.descricao, prioridade: s.prioridade, acao: s.acao ?? null });
    const contatoDaAcao = p.acao && typeof p.acao.contato_id === 'number' ? p.acao.contato_id : null;
    const contatoId = contatoDaAcao ?? p.evidencias.find((ev) => typeof ev.contato_id === 'number')?.contato_id ?? null;
    await auditar(ctx, 'gestor_copiloto_sugestao_proposta', 'bruna_sugestoes', id, contatoId, {
      tipo: p.tipo,
      titulo: p.titulo,
      prioridade: p.prioridade,
      acao: p.acao ? String(p.acao.tipo) : null,
      sessao_id: ctx.sessaoId,
    });
    return { resultado: compacto({ id, status: 'pendente' }), resumo: `Propus a sugestão nº ${id}: ${cortar(p.titulo, 80)}` };
  },
};

export const NOMES_DAS_TOOLS = Object.keys(EXECUTORES);

/** Executa uma tool pelo nome; erro vira resultado com isError (nunca lança). */
export async function executarTool(nome: string, entrada: unknown, ctx: ContextoDasTools): Promise<ResultadoDaTool> {
  const executor = EXECUTORES[nome];
  if (!executor) return { isError: true, resultado: `ferramenta desconhecida: ${nome}`, resumo: `Ferramenta desconhecida: ${nome}` };
  const e = objeto(entrada) ?? {};
  try {
    return await executor(e, ctx);
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err);
    return { isError: true, resultado: `erro em ${nome}: ${mensagem}`, resumo: `${NOME_LEGIVEL[nome] ?? nome} falhou: ${cortar(mensagem, 120)}` };
  }
}
