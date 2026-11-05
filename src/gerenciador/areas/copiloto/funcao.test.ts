// Testes da edge function bruna-copiloto (supabase/functions/bruna-copiloto):
// os módulos puros (sse, historico, tools, prompt) importados por caminho
// relativo. O index.ts (Deno + npm) não entra aqui: não há deno no ambiente.
// Os dados de exemplo são cópias da forma real vista no banco em 05/11/2026
// (lead 26634, lead 27926, mensagens, base, alertas).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { codificarEvento, criarCanalSse, formatarEvento } from '../../../../supabase/functions/bruna-copiloto/sse.ts';
import {
  TEXTO_DO_RESULTADO_SINTETICO,
  carimbarMensagemDoGestor,
  cortarHistorico,
  juntarMensagensSeguidas,
  reconstruirHistorico,
  repararParesDeTool,
  semPensamento,
  temPensamento,
  textoDosBlocos,
  tituloDaSessao,
  type LinhaDeMensagem,
  type MensagemDaApi,
} from '../../../../supabase/functions/bruna-copiloto/historico.ts';
import {
  avisoDoFim,
  avisoDoPrazo,
  blocosDeTextoDaParcial,
  criarSaidaDeTexto,
  motivoDaNaoExecucao,
  textoDaLinha,
  type FimDaRodada,
} from '../../../../supabase/functions/bruna-copiloto/turno.ts';
import {
  DEFINICOES_DAS_TOOLS,
  NOMES_DAS_TOOLS,
  PRACAS_COM_CONSULTORIA,
  dataHoraBr,
  executarTool,
  formatarLinhaDaConversa,
  fraseDoTesteDoFoco,
  listarSecoesDoNucleo,
  normalizarComoOBanco,
  problemaNaListaDoFoco,
  resumirPainelDoFoco,
  rotuloDoAutor,
  trechoDoNucleo,
  validarPropostaDeAcao,
  type Banco,
  type Consulta,
  type ContextoDasTools,
  type MensagemDaConversa,
  type RespostaDoBanco,
} from '../../../../supabase/functions/bruna-copiloto/tools.ts';
import { SYSTEM_PROMPT } from '../../../../supabase/functions/bruna-copiloto/prompt.ts';

/* ------------------------------------------------------------------------ */
/* Dados reais (forma vista no banco)                                        */
/* ------------------------------------------------------------------------ */

const ESTADO_26634 = {
  obra: null,
  tags: [{ id: 42, name: 'Online Leandro Henrique', color: '#22c55e' }, { id: 6, name: 'Ôrganico', color: '#06b6d4' }],
  fup90: { status: 'encerrada_manual', enviados: 3, etapa_atual: 3, encerrada_em: '2026-10-21T11:40:00.337381+00:00', proximo_envio_em: null, proximo_template: null, motivo_encerramento: 'tag bloqueante aplicada apos inscricao' },
  escada: [{ em: '2026-10-13T22:10:54.158377+00:00', etapa: 'bairro', plano: null, toque: 2, pulado: false }],
  kanban: null,
  optout: null,
  regiao: { nome: 'São Paulo', grade: ['08:30:00', '10:00:00'], region: 'sp', consultor: 'Aisten ou Leandro Faria', calendario: 'agendamento.sp@besserhome.com.br', duracao_min: 90, horizonte_dias: 10, oferece_consultoria: true },
  contato: { id: 26634, region: 'sp', status: 'on', objetivo: 'película transparente', user_name: 'Reinaldo Staliano-DTAADV', created_at: '2026-10-09T15:49:20.162471', agendado_at: null, user_number: '5511941161447@s.whatsapp.net', last_message_at: '2026-10-21T16:33:42.394823' },
  contexto: { region: 'sp', entregue: { tag: 'Online Leandro Henrique', tag_id: 42 }, objetivo: 'película transparente', contato_id: 26634, instrucoes: [], silenciado: false, ja_agendado: false, bairro_estado: 'nao_informado', revisao: null },
  retornos: [],
  revisoes: [{ id: 120, erro: 'Às 11:05 de 13/10 ele perguntou quanto custa a película transparente...', tipo: 'info_errada', region: 'sp', gravidade: 'grave', contato_id: 26634, criado_em: '2026-10-13T16:58:31.2563+00:00', verificada_em: '2026-10-13T17:00:56.932335+00:00', cancelada_em: null }],
  instrucoes: [],
  mensagens_total: 20,
  instrucoes_vivas: [],
  conferencias_recentes: [{ em: '2026-10-21T14:34:40.665713', acao: 'pulado', veredito: null, conferido: false }],
};

const LEAD_27926 = {
  id: 27926, user_number: '556299731909@s.whatsapp.net', user_name: 'Adão Souto', region: 'brasil2', status: 'off',
  created_at: '2026-10-26 01:05:28.551427', last_message_at: '2026-11-05 02:50:14.125691', agendado_at: null, agendado_por: null, agendado_para: null,
  objetivo: 'Calor Parte frontal da loja', bairro: 'Vila Brasília', cidade: 'Aparecida de Goiânia',
  ultima_mensagem: 'É um calor insuportável durante esse período ?', ultimo_autor: 'human', tags: [{ id: 4, name: 'Tráfego pago', color: '#22c55e' }],
  entregue: null, revisao_viva: false, instrucoes: 0, retorno_pendente: null, em_escada: false, optout: false,
};

const MENSAGENS_26634: MensagemDaConversa[] = [
  { id: 428943, created_at: '2026-10-21 16:33:42.394823', sender_type: 'customer', direction: 'inbound', content: 'Ok', message_type: 'text', template_name: null, sender_name: 'Reinaldo Staliano-DTAADV', transcricao: null, midia_descricao: null, auto_resposta: false },
  { id: 428704, created_at: '2026-10-21 14:34:40.665713', sender_type: 'agent', direction: 'outbound', content: 'Reinaldo, alguém do time vai seguir com você por aqui sobre o orçamento no local.', message_type: 'text', template_name: null, sender_name: null, transcricao: null, midia_descricao: null, auto_resposta: false },
  { id: 427263, created_at: '2026-10-20 14:30:02.654349', sender_type: 'agent', direction: 'outbound', content: 'Oi Reinaldo, sei que tem muita coisa disputando sua atenção', message_type: 'template', template_name: 'fup90_v2_10_calculadora', sender_name: null, transcricao: null, midia_descricao: null, auto_resposta: false },
];

const BASE_GARANTIA = { id: 9, chave: 'garantia_e_durabilidade', titulo: 'Garantia e durabilidade', categoria: 'garantia', region: null, conteudo: 'A garantia é de 7 a 12 anos, conforme a linha: Celestia 7 anos, Solara, Lumina e Aurea 10, Orion 12.' };

const ALERTAS = [
  { acao: 'responder em Configurações › Base', chave: 'duvidas_sem_resposta', titulo: '2 pergunta(s) de clientes que a base não respondeu', detalhe: 'Perguntas distintas sem entrada na base de conhecimento (últimos 14 dias).', gravidade: 'media' },
  { acao: 'ver em Régua › Templates', chave: 'templates_reprovados', titulo: '6 template(s) reprovado(s) pela Meta', detalhe: 'calc_automacao, follow_up_leads_antigos', gravidade: 'leve' },
];

const NUCLEO = [
  'Você é a Bruna, da Besser Home. Conversa por WhatsApp com quem demonstrou interesse.',
  '',
  '## O que a Besser Home é',
  '',
  'Vendemos películas arquitetônicas.',
  '',
  '## Sobre preço',
  '',
  'Preço só o da tabela.',
  '',
  '### Quando o preço pesa, com ou sem outro orçamento',
  '',
  'Explique valor antes de desconto.',
  '',
  '### Pedido de orçamento',
  '',
  'O valor fechado sai da consultoria.',
  '',
  '## Limites',
  '',
  'Nunca invente horário.',
].join('\n');

// bruna_gestor_bairros_foco_painel('rj', 90) em 05/11/2026 (cinco dos 16 itens e três dos 40 pedidos fora do foco).
const PAINEL_RJ = {
  region: 'rj',
  nome: 'Rio de Janeiro',
  oferece_consultoria: true,
  periodo: { de: '2026-08-07T14:09:24.754276+00:00', ate: '2026-11-05T14:09:24.754276+00:00', dias: 90 },
  itens: [
    { nome: 'Barra da Tijuca', tipo: 'bairro', leads: 44, ordem: 1, so_se: [], nao_se: [], agendados: 13, observacao: null, atualizado_em: '2026-09-11T18:47:23.317028+00:00', ultimo_lead_em: '2026-11-04T12:24:24.536923+00:00', atualizado_por_email: null },
    { nome: 'Joá', tipo: 'bairro', leads: 1, ordem: 2, so_se: [], nao_se: [], agendados: 0, observacao: null, atualizado_em: '2026-09-11T18:47:23.317028+00:00', ultimo_lead_em: '2026-08-07T20:52:55.366657+00:00', atualizado_por_email: null },
    { nome: 'Recreio dos Bandeirantes', tipo: 'bairro', leads: 18, ordem: 4, so_se: [], nao_se: [], agendados: 5, observacao: null, atualizado_em: '2026-09-11T18:47:23.317028+00:00', ultimo_lead_em: '2026-10-02T01:18:44.510812+00:00', atualizado_por_email: null },
    { nome: 'Barra', tipo: 'bairro', leads: 26, ordem: 15, so_se: [], nao_se: ['barra mansa', 'barra do pirai', 'barra de guaratiba', 'barra do sana', 'barra bonita', 'barra seca', 'barra funda'], agendados: 1, observacao: null, atualizado_em: '2026-11-05T13:03:37.39875+00:00', ultimo_lead_em: '2026-10-31T00:35:31.617454+00:00', atualizado_por_email: null },
    { nome: 'Recreio', tipo: 'bairro', leads: 16, ordem: 16, so_se: [], nao_se: ['rio das ostras'], agendados: 2, observacao: null, atualizado_em: '2026-11-05T13:03:37.39875+00:00', ultimo_lead_em: '2026-11-03T23:25:52.47284+00:00', atualizado_por_email: null },
  ],
  fora_do_foco: [
    { leads: 26, bairro: 'Campo Grande', cidade: 'Rio de Janeiro', agendados: 0, ultimo_em: '2026-10-28T20:56:44.483122+00:00', contato_exemplo: 28280 },
    { leads: 17, bairro: 'Tijuca', cidade: 'Rio de Janeiro', agendados: 0, ultimo_em: '2026-10-27T23:40:52.782568+00:00', contato_exemplo: 28171 },
    { leads: 12, bairro: 'Botafogo', cidade: 'Rio de Janeiro', agendados: 0, ultimo_em: '2026-10-26T23:58:23.897853+00:00', contato_exemplo: 28062 },
  ],
  com_bairro: 519,
  no_foco: 159,
  sem_bairro: 709,
};

// bruna_gestor_bairro_foco_testar no Rio em 05/11/2026.
const TESTE_RECREIO = { alvo: 'recreio', como: 'nome_completo', foco: true, nome: 'Recreio', tipo: 'bairro', nucleo: 'recreio', bloqueados: [], oferece_consultoria: true };
const TESTE_BARRA_MANSA = { alvo: 'barra mansa', como: null, foco: false, nome: null, tipo: null, nucleo: 'barra mansa', bloqueados: [{ nome: 'Barra', tipo: 'bairro', termo: 'barra mansa', motivo: 'nao_se' }], oferece_consultoria: true };
const TESTE_TIJUCA = { alvo: 'tijuca', como: null, foco: false, nome: null, tipo: null, nucleo: 'tijuca', bloqueados: [], oferece_consultoria: true };

const LISTA_RJ = PAINEL_RJ.itens.map((i) => ({ tipo: i.tipo, nome: i.nome }));

/* ------------------------------------------------------------------------ */
/* Um banco falso que registra as chamadas                                   */
/* ------------------------------------------------------------------------ */

type Passo = [string, unknown[]];
interface Chamada { tabela: string; passos: Passo[] }
interface ChamadaRpc { funcao: string; args: Record<string, unknown> | undefined }

function fakeBanco(opcoes: {
  tabelas?: Record<string, (c: Chamada) => unknown>;
  rpcs?: Record<string, (args: Record<string, unknown>) => unknown>;
  erroRpc?: string;
} = {}) {
  const chamadas: Chamada[] = [];
  const rpcs: ChamadaRpc[] = [];
  const banco: Banco = {
    from(tabela: string) {
      const chamada: Chamada = { tabela, passos: [] };
      chamadas.push(chamada);
      const resolver = (): RespostaDoBanco => {
        const fn = opcoes.tabelas?.[tabela];
        return { data: fn ? fn(chamada) : null, error: null };
      };
      const q: Record<string, unknown> = {
        then: (ok: (v: RespostaDoBanco) => unknown, falha?: (e: unknown) => unknown) => Promise.resolve(resolver()).then(ok, falha),
        maybeSingle: () => {
          chamada.passos.push(['maybeSingle', []]);
          return Promise.resolve(resolver());
        },
        single: () => {
          chamada.passos.push(['single', []]);
          return Promise.resolve(resolver());
        },
      };
      for (const metodo of ['select', 'insert', 'eq', 'neq', 'lt', 'or', 'textSearch', 'order', 'limit']) {
        q[metodo] = (...args: unknown[]) => {
          chamada.passos.push([metodo, args]);
          return q;
        };
      }
      return q as unknown as Consulta;
    },
    rpc(funcao: string, args?: Record<string, unknown>) {
      rpcs.push({ funcao, args });
      if (opcoes.erroRpc) return Promise.resolve({ data: null, error: { message: opcoes.erroRpc } });
      const fn = opcoes.rpcs?.[funcao];
      if (!fn) return Promise.resolve({ data: null, error: { message: `rpc ${funcao} não esperada no teste` } });
      return Promise.resolve({ data: fn(args ?? {}), error: null });
    },
  };
  return { banco, chamadas, rpcs };
}

const AGORA = new Date('2026-11-05T03:20:00Z'); // 00:20 de quinta em Brasília

function contexto(banco: Banco, emitir = vi.fn()): ContextoDasTools & { emitir: ReturnType<typeof vi.fn> } {
  return { banco, emitir, sessaoId: 7, agora: () => AGORA };
}

const passo = (c: Chamada, nome: string) => c.passos.find(([m]) => m === nome)?.[1];

/* ------------------------------------------------------------------------ */
/* sse.ts                                                                    */
/* ------------------------------------------------------------------------ */

describe('sse: codificação dos eventos', () => {
  it('formata "event: nome\\ndata: json\\n\\n" com o JSON numa linha só', () => {
    const texto = formatarEvento('texto', { delta: 'duas\nlinhas' });
    expect(texto).toBe('event: texto\ndata: {"delta":"duas\\nlinhas"}\n\n');
    expect(texto.split('\n').length).toBe(4);
  });

  it('codifica em bytes UTF-8', () => {
    const bytes = codificarEvento('sessao', { id: 1, titulo: 'Revisão', contato_id: null });
    // ArrayBuffer.isView em vez de instanceof: o TextEncoder do Node devolve um Uint8Array de outro realm no jsdom.
    expect(ArrayBuffer.isView(bytes)).toBe(true);
    expect(new TextDecoder().decode(bytes)).toBe('event: sessao\ndata: {"id":1,"titulo":"Revisão","contato_id":null}\n\n');
  });

  it('o canal guarda o que foi emitido antes da leitura e fecha de forma idempotente', async () => {
    const canal = criarCanalSse();
    expect(canal.emitir('sessao', { id: 3, titulo: 'oi', contato_id: 26634 })).toBe(true);
    expect(canal.emitir('usuario', { mensagem_id: 10 })).toBe(true);
    canal.fechar();
    canal.fechar();
    expect(canal.fechado).toBe(true);
    expect(canal.emitir('fim', {})).toBe(false);
    const leitor = canal.stream.getReader();
    const decodificador = new TextDecoder();
    let recebido = '';
    for (;;) {
      const { value, done } = await leitor.read();
      if (done) break;
      recebido += decodificador.decode(value);
    }
    expect(recebido).toBe('event: sessao\ndata: {"id":3,"titulo":"oi","contato_id":26634}\n\nevent: usuario\ndata: {"mensagem_id":10}\n\n');
  });

  describe('ping de manutenção', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('só começa depois do primeiro evento, para nada sair antes de `sessao`', async () => {
      vi.useFakeTimers();
      const canal = criarCanalSse({ pingMs: 1000 });
      vi.advanceTimersByTime(5000); // a API ainda não aceitou o pedido: nada no buffer
      canal.emitir('sessao', { id: 3, titulo: 'oi', contato_id: null });
      vi.advanceTimersByTime(1600);
      canal.fechar();
      vi.useRealTimers();
      const leitor = canal.stream.getReader();
      const decodificador = new TextDecoder();
      let recebido = '';
      for (;;) {
        const { value, done } = await leitor.read();
        if (done) break;
        recebido += decodificador.decode(value);
      }
      const eventos = recebido.split('\n\n').filter(Boolean).map((e) => e.split('\n')[0]);
      expect(eventos[0]).toBe('event: sessao');
      expect(eventos.slice(1)).toEqual(['event: ping']);
    });
  });
});

/* ------------------------------------------------------------------------ */
/* historico.ts                                                              */
/* ------------------------------------------------------------------------ */

const LINHAS: LinhaDeMensagem[] = [
  { id: 1, papel: 'user', conteudo: [{ type: 'text', text: '[Mensagem do gestor enviada em qua 04/11/2026 21:00, horário de Brasília; sessão sobre o lead 26634]\nO que aconteceu com esse lead?' }], texto: 'O que aconteceu com esse lead?' },
  {
    id: 2,
    papel: 'assistant',
    conteudo: [
      { type: 'thinking', thinking: '', signature: 'EqQBCkYIBxgCKkB' },
      { type: 'text', text: 'Vou ler o lead.', citations: null },
      { type: 'tool_use', id: 'toolu_01A', name: 'lead_estado', input: { contato_id: 26634 } },
    ],
    texto: 'Vou ler o lead.',
  },
  { id: 3, papel: 'user', conteudo: [{ type: 'tool_result', tool_use_id: 'toolu_01A', content: JSON.stringify(ESTADO_26634) }], texto: null },
  { id: 4, papel: 'assistant', conteudo: [{ type: 'thinking', thinking: '', signature: 'xyz' }, { type: 'text', text: 'O lead 26634 está com o Leandro.' }], texto: 'O lead 26634 está com o Leandro.' },
];

describe('historico: reconstrução a partir de bruna_copiloto_mensagens', () => {
  it('devolve os blocos em ordem de id, só com os campos da API, e o pensamento igual quando o histórico está inteiro', () => {
    const h = reconstruirHistorico([LINHAS[3], LINHAS[1], LINHAS[0], LINHAS[2]]);
    expect(h.map((m) => m.role)).toEqual(['user', 'assistant', 'user', 'assistant']);
    // O pensamento volta igual (o cache das mensagens depende disso no Opus 5.5).
    expect(h[1].content).toEqual([
      { type: 'thinking', thinking: '', signature: 'EqQBCkYIBxgCKkB' },
      { type: 'text', text: 'Vou ler o lead.' },
      { type: 'tool_use', id: 'toolu_01A', name: 'lead_estado', input: { contato_id: 26634 } },
    ]);
    expect(h[2].content[0]).toMatchObject({ type: 'tool_result', tool_use_id: 'toolu_01A' });
    expect(h[3].content[0]).toEqual({ type: 'thinking', thinking: '', signature: 'xyz' });
    expect(temPensamento(h)).toBe(true);
  });

  it('tira o pensamento quando o histórico foi cortado, quando a leitura não pegou o começo ou quando pedido', () => {
    const semThinking = (h: MensagemDaApi[]) => !JSON.stringify(h).includes('thinking');
    expect(semThinking(reconstruirHistorico(LINHAS, { manterPensamento: false }))).toBe(true);
    expect(semThinking(reconstruirHistorico(LINHAS, { incompleto: true }))).toBe(true);
    const comPerguntaNova: LinhaDeMensagem[] = [
      ...LINHAS,
      { id: 5, papel: 'user', conteudo: [{ type: 'text', text: 'E a revisão 120?' }], texto: 'E a revisão 120?' },
      { id: 6, papel: 'assistant', conteudo: [{ type: 'thinking', thinking: '', signature: 'abc' }, { type: 'text', text: 'Já foi conferida.' }], texto: 'Já foi conferida.' },
    ];
    const cortado = reconstruirHistorico(comPerguntaNova, { maxMensagens: 2 });
    expect(cortado).toEqual([
      { role: 'user', content: [{ type: 'text', text: 'E a revisão 120?' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'Já foi conferida.' }] },
    ]);
    // Sem o pensamento, a mensagem fica só com o resto; o que não tem pensamento sai igual.
    const reconstruido = reconstruirHistorico(LINHAS);
    expect(semPensamento(reconstruido)[1].content.map((b) => b.type)).toEqual(['text', 'tool_use']);
    expect(semPensamento(reconstruido)[0]).toBe(reconstruido[0]);
  });

  it('descarta a resposta que só tem pensamento (cortada antes de escrever) e o pensamento sem assinatura', () => {
    const h = reconstruirHistorico([
      LINHAS[0],
      { id: 2, papel: 'assistant', conteudo: [{ type: 'thinking', thinking: '', signature: 'sig' }], texto: '(A resposta foi cortada no limite de 8192 tokens. Peça para eu continuar.)' },
      { id: 3, papel: 'user', conteudo: [{ type: 'text', text: 'continue' }], texto: 'continue' },
      { id: 4, papel: 'assistant', conteudo: [{ type: 'thinking', thinking: 'x' }, { type: 'redacted_thinking', data: 'EmwKAhgBEgy' }, { type: 'text', text: 'Pronto.' }], texto: 'Pronto.' },
    ]);
    expect(h.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(h[0].content.map((b) => b.text)).toEqual([(LINHAS[0].conteudo as Array<{ text: string }>)[0].text, 'continue']);
    expect(h[1].content).toEqual([{ type: 'redacted_thinking', data: 'EmwKAhgBEgy' }, { type: 'text', text: 'Pronto.' }]);
  });

  it('mede o corte por caracteres sem as assinaturas do pensamento', () => {
    const assinatura = 'S'.repeat(5000);
    const ms: MensagemDaApi[] = [
      { role: 'user', content: [{ type: 'text', text: 'primeira' }] },
      { role: 'assistant', content: [{ type: 'thinking', thinking: '', signature: assinatura }, { type: 'text', text: 'curta' }] },
      { role: 'user', content: [{ type: 'text', text: 'segunda' }] },
      { role: 'assistant', content: [{ type: 'thinking', thinking: '', signature: assinatura }, { type: 'text', text: 'também curta' }] },
    ];
    expect(cortarHistorico(ms, { maxMensagens: 40, maxCaracteres: 1000 })).toHaveLength(4);
  });

  it('textoDosBlocos junta os blocos de texto e devolve null quando só há tool_use', () => {
    expect(textoDosBlocos(LINHAS[1].conteudo)).toBe('Vou ler o lead.');
    expect(textoDosBlocos([{ type: 'tool_use', id: 'x', name: 'alertas', input: {} }])).toBeNull();
    expect(textoDosBlocos([{ type: 'text', text: 'a' }, { type: 'text', text: ' b ' }])).toBe('a\n\nb');
  });

  it('sintetiza o tool_result que faltou num turno interrompido e junta com a pergunta seguinte', () => {
    const h = reconstruirHistorico([LINHAS[0], LINHAS[1], { id: 9, papel: 'user', conteudo: [{ type: 'text', text: 'e aí?' }], texto: 'e aí?' }]);
    expect(h.map((m) => m.role)).toEqual(['user', 'assistant', 'user']);
    expect(h[2].content).toEqual([
      { type: 'tool_result', tool_use_id: 'toolu_01A', is_error: true, content: TEXTO_DO_RESULTADO_SINTETICO },
      { type: 'text', text: 'e aí?' },
    ]);
  });

  it('o turno que parou no limite de rodadas (tool_result sintético gravado) e a pergunta nova alternam os papéis', () => {
    const linhas: LinhaDeMensagem[] = [
      LINHAS[0],
      LINHAS[1],
      { id: 3, papel: 'user', conteudo: [{ type: 'tool_result', tool_use_id: 'toolu_01A', is_error: true, content: 'Não executada: limite de 8 rodadas por turno. Peça ao gestor para continuar em outra mensagem.' }], texto: null },
    ];
    const historico = reconstruirHistorico(linhas);
    const nova = { role: 'user' as const, content: [{ type: 'text', text: '[Mensagem do gestor enviada em qui 05/11/2026 00:20, horário de Brasília; sessão sobre o lead 26634]\ncontinue' }] };
    const mensagens = juntarMensagensSeguidas([...historico, nova]);
    expect(mensagens.map((m) => m.role)).toEqual(['user', 'assistant', 'user']);
    expect(mensagens[2].content.map((b) => b.type)).toEqual(['tool_result', 'text']);
    // Reconstruir de novo depois de gravar a pergunta dá o mesmo prefixo (o pensamento continua válido).
    const depois = reconstruirHistorico([...linhas, { id: 4, papel: 'user', conteudo: nova.content, texto: 'continue' }]);
    expect(depois).toEqual(mensagens);
  });

  it('juntarMensagensSeguidas põe os tool_result na frente, não mexe no assistente e é idempotente', () => {
    const ms: MensagemDaApi[] = [
      { role: 'user', content: [{ type: 'text', text: 'a' }] },
      { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'alertas', input: {} }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: 'ok' }] },
      { role: 'user', content: [{ type: 'text', text: 'b' }] },
      { role: 'user', content: [{ type: 'text', text: 'c' }] },
    ];
    const juntas = juntarMensagensSeguidas(ms);
    expect(juntas.map((m) => m.role)).toEqual(['user', 'assistant', 'user']);
    expect(juntas[2].content).toEqual([{ type: 'tool_result', tool_use_id: 't1', content: 'ok' }, { type: 'text', text: 'b' }, { type: 'text', text: 'c' }]);
    expect(juntarMensagensSeguidas(juntas)).toEqual(juntas);
    expect(juntarMensagensSeguidas([{ role: 'user', content: [{ type: 'text', text: 'x' }] }, { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't9', content: 'y' }] }])[0].content.map((b) => b.type)).toEqual(['tool_result', 'text']);
  });

  it('sintetiza o resultado de um tool_use pendurado no fim e descarta tool_result órfão', () => {
    const reparado = repararParesDeTool([
      { role: 'user', content: [{ type: 'text', text: 'oi' }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_orfao', content: 'x' }] },
      { role: 'assistant', content: [{ type: 'tool_use', id: 'toolu_02', name: 'alertas', input: {} }] },
    ]);
    expect(reparado.map((m) => m.role)).toEqual(['user', 'assistant', 'user']);
    expect(reparado[2].content[0]).toMatchObject({ type: 'tool_result', tool_use_id: 'toolu_02', is_error: true });
  });

  it('corta nas últimas ~40 mensagens começando numa mensagem do gestor com texto', () => {
    const muitas: MensagemDaApi[] = [];
    for (let turno = 0; turno < 15; turno++) {
      muitas.push({ role: 'user', content: [{ type: 'text', text: `pergunta ${turno}` }] });
      muitas.push({ role: 'assistant', content: [{ type: 'tool_use', id: `t${turno}`, name: 'alertas', input: {} }] });
      muitas.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: `t${turno}`, content: 'ok' }] });
      muitas.push({ role: 'assistant', content: [{ type: 'text', text: `resposta ${turno}` }] });
    }
    const cortado = cortarHistorico(muitas, { maxMensagens: 40 });
    expect(cortado.length).toBeLessThanOrEqual(40);
    expect(cortado[0]).toEqual({ role: 'user', content: [{ type: 'text', text: 'pergunta 5' }] });
    expect(cortado.at(-1)).toEqual({ role: 'assistant', content: [{ type: 'text', text: 'resposta 14' }] });
  });

  it('respeita o teto de caracteres avançando para a mensagem do gestor seguinte', () => {
    const grande = 'x'.repeat(5000);
    const ms: MensagemDaApi[] = [
      { role: 'user', content: [{ type: 'text', text: 'primeira' }] },
      { role: 'assistant', content: [{ type: 'text', text: grande }] },
      { role: 'user', content: [{ type: 'text', text: 'segunda' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'curta' }] },
    ];
    const cortado = cortarHistorico(ms, { maxMensagens: 40, maxCaracteres: 1000 });
    expect(cortado[0].content).toEqual([{ type: 'text', text: 'segunda' }]);
    expect(cortado.length).toBe(2);
  });

  it('devolve vazio quando não há mensagem do gestor com texto', () => {
    expect(reconstruirHistorico([{ id: 1, papel: 'user', conteudo: [{ type: 'tool_result', tool_use_id: 'a', content: 'x' }], texto: null }])).toEqual([]);
  });

  it('carimba a mensagem do gestor com a hora de Brasília e o lead em foco', () => {
    const carimbado = carimbarMensagemDoGestor('Esse lead agendou?', AGORA, 26634);
    expect(carimbado).toBe('[Mensagem do gestor enviada em qui 05/11/2026 00:20, horário de Brasília; sessão sobre o lead 26634]\nEsse lead agendou?');
    expect(carimbarMensagemDoGestor('oi', AGORA, null)).not.toContain('lead');
    expect(tituloDaSessao('  Quais   leads\n de SP  agendaram esta semana e quais ficaram sem resposta depois do convite?')).toBe('Quais leads de SP agendaram esta semana e quais ficaram sem');
    expect(tituloDaSessao('x'.repeat(80)).length).toBe(60);
    expect(tituloDaSessao('x').length).toBe(1);
  });
});

/* ------------------------------------------------------------------------ */
/* turno.ts                                                                  */
/* ------------------------------------------------------------------------ */

describe('turno: a saída de texto do fluxo', () => {
  it('segura os deltas até abrir e depois solta na ordem', () => {
    const emitidos: string[] = [];
    const saida = criarSaidaDeTexto((d) => emitidos.push(d));
    saida.novoBloco();
    saida.delta('O lead ');
    saida.delta('26634');
    expect(emitidos).toEqual([]);
    expect(saida.aberta).toBe(false);
    saida.abrir();
    expect(saida.aberta).toBe(true);
    expect(emitidos).toEqual(['O lead ', '26634']);
    saida.delta(' está com o Leandro.');
    expect(emitidos.at(-1)).toBe(' está com o Leandro.');
  });

  it('separa por linha em branco cada bloco de texto novo (na mesma resposta ou na rodada seguinte) e ignora delta vazio', () => {
    const emitidos: string[] = [];
    const saida = criarSaidaDeTexto((d) => emitidos.push(d));
    saida.abrir();
    saida.novoBloco();
    saida.delta('');
    saida.delta('Vou ler o lead.');
    saida.novoBloco(); // texto depois de um tool_use, na mesma resposta
    saida.delta('E a conversa.');
    saida.novoBloco(); // rodada seguinte, depois das ferramentas
    saida.delta('Pronto.');
    expect(emitidos).toEqual(['Vou ler o lead.', '\n\n', 'E a conversa.', '\n\n', 'Pronto.']);
  });

  it('o que sai ao vivo é igual ao que a coluna texto guarda (textoDosBlocos + aviso)', () => {
    const emitidos: string[] = [];
    const saida = criarSaidaDeTexto((d) => emitidos.push(d));
    const conteudo = [
      { type: 'thinking', thinking: '', signature: 'sig' },
      { type: 'text', text: 'O lead 26634 pediu preço às 11:05.' },
      { type: 'tool_use', id: 'toolu_01', name: 'base_buscar', input: { termo: 'preço' } },
      { type: 'text', text: 'A base não tem a faixa da transparente.' },
    ];
    for (const b of conteudo) {
      if (b.type !== 'text') continue;
      saida.novoBloco();
      saida.delta(b.text.slice(0, 10));
      saida.delta(b.text.slice(10));
    }
    const aviso = avisoDoFim({ stopReason: 'max_tokens', querTools: false, continua: false, rodada: 1, maxRodadas: 8, maxTokens: 8192 });
    saida.aviso(aviso as string);
    saida.abrir();
    expect(emitidos.join('')).toBe(textoDaLinha(textoDosBlocos(conteudo), aviso));
  });

  it('o aviso da recusa sai como parágrafo à parte quando já houve texto, e sozinho quando não houve', () => {
    const comTexto: string[] = [];
    const a = criarSaidaDeTexto((d) => comTexto.push(d));
    a.abrir();
    a.novoBloco();
    a.delta('Sobre isso');
    a.aviso('Não consigo ajudar com isso.');
    expect(comTexto.join('')).toBe('Sobre isso\n\nNão consigo ajudar com isso.');
    const semTexto: string[] = [];
    const b = criarSaidaDeTexto((d) => semTexto.push(d));
    b.abrir();
    b.aviso('  Não consigo ajudar com isso.  ');
    b.aviso('   ');
    expect(semTexto).toEqual(['Não consigo ajudar com isso.']);
    expect(b.emitiuTexto).toBe(true);
  });
});

describe('turno: avisos e motivos de fim', () => {
  const fim = (f: Partial<FimDaRodada>): FimDaRodada => ({ stopReason: 'end_turn', querTools: false, continua: false, rodada: 1, maxRodadas: 8, maxTokens: 8192, ...f });

  it('avisa recusa, corte, contexto estourado, limite de rodadas e tempo; nada num fim normal', () => {
    expect(avisoDoFim(fim({}))).toBeNull();
    expect(avisoDoFim(fim({ stopReason: 'tool_use', querTools: true, continua: true }))).toBeNull();
    expect(avisoDoFim(fim({ stopReason: 'refusal' }))).toBe('Não consigo ajudar com isso.');
    expect(avisoDoFim(fim({ stopReason: 'max_tokens' }))).toBe('(A resposta foi cortada no limite de 8192 tokens. Peça para eu continuar.)');
    expect(avisoDoFim(fim({ stopReason: 'model_context_window_exceeded' }))).toContain('Abra uma sessão nova');
    expect(avisoDoFim(fim({ stopReason: 'tool_use', querTools: true, rodada: 8 }))).toBe('(Parei no limite de 8 rodadas de ferramentas neste turno. Peça para eu continuar.)');
    expect(avisoDoFim(fim({ stopReason: 'tool_use', querTools: true, rodada: 3 }))).toBe('(Parei por tempo neste turno. Peça para eu continuar.)');
    expect(avisoDoPrazo(330_000)).toBe('(Parei por tempo: o turno chegou ao limite de 330 s da função. Peça para eu continuar.)');
  });

  it('explica por que os tool_use não rodaram', () => {
    expect(motivoDaNaoExecucao(fim({ stopReason: 'refusal' }))).toBe('a resposta foi recusada');
    expect(motivoDaNaoExecucao(fim({ stopReason: 'max_tokens' }))).toBe('a resposta foi cortada no limite de tokens');
    expect(motivoDaNaoExecucao(fim({ stopReason: 'model_context_window_exceeded' }))).toContain('limite de contexto');
    expect(motivoDaNaoExecucao(fim({ stopReason: 'tool_use', querTools: true, rodada: 8 }))).toBe('limite de 8 rodadas por turno');
    expect(motivoDaNaoExecucao(fim({ stopReason: 'tool_use', querTools: true, rodada: 2 }))).toBe('tempo do turno esgotado');
    expect(motivoDaNaoExecucao(fim({ stopReason: 'end_turn' }))).toContain('end_turn');
  });

  it('textoDaLinha junta texto e aviso e devolve null quando não há nenhum', () => {
    expect(textoDaLinha('Resposta.', null)).toBe('Resposta.');
    expect(textoDaLinha(null, 'Não consigo ajudar com isso.')).toBe('Não consigo ajudar com isso.');
    expect(textoDaLinha('Resposta.', '(Parei por tempo neste turno. Peça para eu continuar.)')).toBe('Resposta.\n\n(Parei por tempo neste turno. Peça para eu continuar.)');
    expect(textoDaLinha(null, null)).toBeNull();
    expect(textoDaLinha('  ', undefined)).toBeNull();
  });

  it('da resposta cortada no prazo guarda só os blocos de texto', () => {
    expect(
      blocosDeTextoDaParcial([
        { type: 'thinking', thinking: '', signature: '' },
        { type: 'text', text: 'Li a conversa do lead 26634. ' },
        { type: 'tool_use', id: 'toolu_x', name: 'lead_conversa', input: {} },
        { type: 'text', text: '   ' },
      ]),
    ).toEqual([{ type: 'text', text: 'Li a conversa do lead 26634.' }]);
    expect(blocosDeTextoDaParcial(undefined)).toEqual([]);
  });
});

/* ------------------------------------------------------------------------ */
/* tools.ts: definições e validação                                          */
/* ------------------------------------------------------------------------ */

describe('tools: definições', () => {
  it('toda tool tem executor e a lista é estável (buscar_leads primeiro, propor_acao por último)', () => {
    const nomes = DEFINICOES_DAS_TOOLS.map((t) => t.name);
    expect(new Set(nomes).size).toBe(nomes.length);
    expect([...nomes].sort()).toEqual([...NOMES_DAS_TOOLS].sort());
    expect(nomes[0]).toBe('buscar_leads');
    expect(nomes.at(-1)).toBe('propor_acao');
    expect(nomes).toContain('lead_conversa');
  });

  it('as tools de leitura são strict com additionalProperties false e required; propor_acao vai sem strict', () => {
    for (const t of DEFINICOES_DAS_TOOLS) {
      expect(t.input_schema.type).toBe('object');
      if (t.name === 'propor_acao') {
        expect(t.strict).toBeUndefined();
        expect(t.input_schema.required).toEqual(['tipo', 'titulo', 'descricao', 'prioridade', 'evidencias', 'acao']);
      } else {
        expect(t.strict).toBe(true);
        expect(t.input_schema.additionalProperties).toBe(false);
        expect(Array.isArray(t.input_schema.required)).toBe(true);
      }
    }
    const leadEstado = DEFINICOES_DAS_TOOLS.find((t) => t.name === 'lead_estado')!;
    expect(leadEstado.input_schema.required).toEqual(['contato_id']);
    expect(DEFINICOES_DAS_TOOLS.find((t) => t.name === 'propor_acao')!.description).toContain('manual');
  });
});

describe('tools: validação da propor_acao', () => {
  const base = {
    tipo: 'instrucao',
    titulo: 'Confirmar o bairro antes de dar a faixa de preço',
    descricao: 'No lead 26634 a Bruna deu a faixa do catálogo inteiro como se fosse a da transparente.',
    impacto: 'Menos informação errada sobre preço.',
    prioridade: 'alta',
    evidencias: [{ contato_id: 26634, mensagem_id: 417093, trecho: 'Para película transparente, os valores vão de R$397 a R$1.290', nota: ' revisão 120 ' }],
  };

  it('aceita uma orientação por lead e limpa os campos', () => {
    const r = validarPropostaDeAcao({ ...base, acao: { tipo: 'instrucao_criar', escopo: 'contato', contato_id: '26634', titulo: 'Preço das claras', texto: 'Diga só a faixa das películas claras.', aplica_em: ['conversa', 'conversa'], lixo: 1 } });
    expect(r.ok).toBe(true);
    if (r.ok !== true) return;
    expect(r.proposta.acao).toEqual({ tipo: 'instrucao_criar', escopo: 'contato', contato_id: 26634, titulo: 'Preço das claras', texto: 'Diga só a faixa das películas claras.', aplica_em: ['conversa'] });
    expect(r.proposta.evidencias[0]).toEqual({ contato_id: 26634, mensagem_id: 417093, trecho: 'Para película transparente, os valores vão de R$397 a R$1.290', nota: 'revisão 120' });
    expect(r.proposta.prioridade).toBe('alta');
  });

  it('exige a praça na orientação por praça e o lead na orientação por lead', () => {
    expect(validarPropostaDeAcao({ ...base, acao: { tipo: 'instrucao_criar', escopo: 'region', titulo: 'x', texto: 'y' } })).toMatchObject({ ok: false, erro: expect.stringContaining('acao.region') });
    expect(validarPropostaDeAcao({ ...base, acao: { tipo: 'instrucao_criar', escopo: 'contato', titulo: 'x', texto: 'y' } })).toMatchObject({ ok: false, erro: expect.stringContaining('acao.contato_id') });
  });

  it('recusa o que falta ou o que não existe', () => {
    expect(validarPropostaDeAcao({ ...base, titulo: '', acao: null })).toMatchObject({ ok: false, erro: 'falta "titulo"' });
    expect(validarPropostaDeAcao({ ...base, tipo: 'promo', acao: null })).toMatchObject({ ok: false, erro: expect.stringContaining('"tipo"') });
    expect(validarPropostaDeAcao({ ...base, acao: { tipo: 'apagar_tudo' } })).toMatchObject({ ok: false, erro: expect.stringContaining('acao.tipo') });
    expect(validarPropostaDeAcao({ ...base, acao: { tipo: 'revisao_criar', contato_id: 26634, gravidade: 'grave', erro: 'deu a faixa errada' } })).toMatchObject({ ok: false, erro: 'falta "acao.na_proxima"' });
    expect(validarPropostaDeAcao({ ...base, acao: { tipo: 'regua_pausar', escada: 'sim', retornos: false } })).toMatchObject({ ok: false, erro: expect.stringContaining('acao.escada') });
    expect(validarPropostaDeAcao({ ...base, acao: { tipo: 'base_atualizar', id: 9, campos: { senha: 'x' } } })).toMatchObject({ ok: false, erro: expect.stringContaining('acao.campos') });
    expect(validarPropostaDeAcao({ ...base, acao: { tipo: 'nucleo_trecho', trecho_atual: 'a', nota: 'b' } })).toMatchObject({ ok: false, erro: expect.stringContaining('trecho_novo') });
    expect(validarPropostaDeAcao('texto solto')).toMatchObject({ ok: false });
  });

  it('aceita os outros formatos e mantém só os campos permitidos', () => {
    const ok = (acao: unknown) => {
      const r = validarPropostaDeAcao({ ...base, acao });
      expect(r.ok, JSON.stringify(r)).toBe(true);
      return r.ok === true ? r.proposta.acao : null;
    };
    expect(ok({ tipo: 'revisao_criar', contato_id: 26634, tipo_revisao: 'info_errada', gravidade: 'grave', erro: 'Deu a faixa do catálogo inteiro.', na_proxima: 'Corrija em uma linha.', horas: 48 })).toMatchObject({ gravidade: 'grave', horas: 48 });
    expect(ok({ tipo: 'base_criar', titulo: 'Garantia da Celestia 20X', conteudo: 'Tem garantia própria.', categoria: 'garantia', palavras_chave: ['garantia', ' 20x '], confianca: 'alta' })).toMatchObject({ palavras_chave: ['garantia', '20x'], confianca: 'alta' });
    expect(ok({ tipo: 'base_atualizar', id: 9, campos: { conteudo: 'novo', senha: 'x' } })).toEqual({ tipo: 'base_atualizar', id: 9, campos: { conteudo: 'novo' } });
    expect(ok({ tipo: 'regua_pausar', escada: true, retornos: false, motivo: 'feriado' })).toEqual({ tipo: 'regua_pausar', escada: true, retornos: false, motivo: 'feriado' });
    expect(ok({ tipo: 'fup90_campanha_atualizar', id: 1, campos: { ativa: false, cor: 'azul' } })).toEqual({ tipo: 'fup90_campanha_atualizar', id: 1, campos: { ativa: false } });
    expect(ok({ tipo: 'fup90_etapa_atualizar', id: 3, campos: { offset_dias: 10 } })).toMatchObject({ campos: { offset_dias: 10 } });
    expect(ok({ tipo: 'nucleo_trecho', trecho_atual: 'Preço só o da tabela.', trecho_novo: '', nota: 'apagar' })).toMatchObject({ trecho_novo: '' });
    expect(ok({ tipo: 'config_atualizar', chave: 'copiloto', valor: { max_tokens: 4096 } })).toMatchObject({ chave: 'copiloto' });
    expect(ok({ tipo: 'lead_bruna', contato_id: 26634, ligada: false })).toEqual({ tipo: 'lead_bruna', contato_id: 26634, ligada: false });
    expect(ok({ tipo: 'instrucao_desativar', id: 4, motivo: 'venceu' })).toEqual({ tipo: 'instrucao_desativar', id: 4, motivo: 'venceu' });
    expect(ok({ tipo: 'manual', instrucoes: 'Reprovar o template no Gerenciador de Anúncios.' })).toMatchObject({ tipo: 'manual' });
    expect(ok(null)).toBeNull();
  });
});

/* ------------------------------------------------------------------------ */
/* tools.ts: conversa e núcleo                                               */
/* ------------------------------------------------------------------------ */

describe('tools: linhas da conversa', () => {
  it('rotula o autor pelo sender_type real (agent, customer, human, sistema) e template pelo message_type', () => {
    expect(rotuloDoAutor(MENSAGENS_26634[1])).toBe('Bruna');
    expect(rotuloDoAutor(MENSAGENS_26634[0])).toBe('Cliente');
    expect(rotuloDoAutor({ ...MENSAGENS_26634[0], sender_type: 'human', sender_name: 'Filipe' })).toBe('Atendente (Filipe)');
    expect(rotuloDoAutor({ ...MENSAGENS_26634[0], sender_type: 'sistema', direction: 'internal' })).toBe('Sistema');
    expect(rotuloDoAutor(MENSAGENS_26634[2])).toBe('Template');
  });

  it('formata "[id] dd/mm HH:MM Autor: texto" em Brasília (created_at sem fuso guarda UTC)', () => {
    expect(dataHoraBr('2026-10-21 16:33:42.394823')).toBe('21/10 13:33');
    expect(dataHoraBr('2026-10-21T11:40:00.337381+00:00')).toBe('21/10 08:40');
    expect(formatarLinhaDaConversa(MENSAGENS_26634[0])).toBe('[428943] 21/10 13:33 Cliente: Ok');
    expect(formatarLinhaDaConversa(MENSAGENS_26634[2])).toBe('[427263] 20/10 11:30 Template: Oi Reinaldo, sei que tem muita coisa disputando sua atenção (template fup90_v2_10_calculadora)');
  });

  it('mostra transcrição de áudio, descrição de foto e corta em 600 caracteres', () => {
    const audio = formatarLinhaDaConversa({ ...MENSAGENS_26634[0], message_type: 'ptt', content: '🎤 Áudio', transcricao: 'quero orçamento' });
    expect(audio).toContain('Cliente: [ÁUDIO] quero orçamento');
    const foto = formatarLinhaDaConversa({ ...MENSAGENS_26634[0], message_type: 'image', content: '[MÍDIA]', midia_descricao: 'janela de sala' });
    expect(foto).toContain('[FOTO] | na foto: janela de sala');
    const longa = formatarLinhaDaConversa({ ...MENSAGENS_26634[1], content: 'a'.repeat(700), auto_resposta: true });
    expect(longa).toContain('Bruna (resposta automática): ');
    expect(longa.length).toBeLessThan(700);
    expect(longa.endsWith('…')).toBe(true);
  });
});

describe('tools: seções do núcleo', () => {
  it('lista os títulos ## e ### com o tamanho em caracteres', () => {
    const secoes = listarSecoesDoNucleo(NUCLEO);
    expect(secoes.map((s) => `${s.nivel}:${s.titulo}`)).toEqual([
      '2:O que a Besser Home é',
      '2:Sobre preço',
      '3:Quando o preço pesa, com ou sem outro orçamento',
      '3:Pedido de orçamento',
      '2:Limites',
    ]);
    const preco = secoes[1];
    expect(NUCLEO.slice(preco.inicio, preco.fim)).toBe('## Sobre preço\n\nPreço só o da tabela.\n\n');
    expect(preco.tamanhoComSubsecoes).toBeGreaterThan(preco.tamanho);
    expect(NUCLEO.slice(preco.inicio, preco.fimComSubsecoes)).toContain('### Pedido de orçamento');
    expect(secoes.at(-1)!.fim).toBe(NUCLEO.length);
  });

  it('acha a seção por parte do título, sem acento e sem caixa, com as subseções e o corte', () => {
    const achado = trechoDoNucleo(NUCLEO, 'sobre preco');
    expect(achado?.secao.titulo).toBe('Sobre preço');
    expect(achado?.texto).toContain('### Quando o preço pesa');
    expect(achado?.texto).not.toContain('## Limites');
    expect(achado?.cortado).toBe(false);
    expect(trechoDoNucleo(NUCLEO, 'orçamento')?.secao.titulo).toBe('Quando o preço pesa, com ou sem outro orçamento');
    expect(trechoDoNucleo(NUCLEO, 'Pedido de orçamento')?.secao.titulo).toBe('Pedido de orçamento');
    expect(trechoDoNucleo(NUCLEO, 'inexistente')).toBeNull();
    const curto = trechoDoNucleo(NUCLEO, 'limites', 12);
    expect(curto?.cortado).toBe(true);
    expect(curto?.texto.length).toBe(12);
  });
});

/* ------------------------------------------------------------------------ */
/* tools.ts: executores (o banco falso registra RPC e tabela)                */
/* ------------------------------------------------------------------------ */

describe('tools: executores', () => {
  it('lead_estado chama bruna_gestor_lead_estado com p_contato_id e devolve o JSON inteiro', async () => {
    const { banco, rpcs } = fakeBanco({ rpcs: { bruna_gestor_lead_estado: () => ESTADO_26634 } });
    const r = await executarTool('lead_estado', { contato_id: 26634 }, contexto(banco));
    expect(rpcs).toEqual([{ funcao: 'bruna_gestor_lead_estado', args: { p_contato_id: 26634 } }]);
    expect(r.isError).toBeUndefined();
    expect(r.resumo).toBe('Li o estado do lead 26634 (Reinaldo Staliano-DTAADV)');
    expect(JSON.parse(r.resultado)).toEqual(ESTADO_26634);
  });

  it('lead_estado de contato inexistente vira erro para o modelo', async () => {
    const { banco } = fakeBanco({ rpcs: { bruna_gestor_lead_estado: () => ({ contato: null, tags: [] }) } });
    const r = await executarTool('lead_estado', { contato_id: 999999 }, contexto(banco));
    expect(r.isError).toBe(true);
    expect(r.resultado).toContain('999999 não existe');
  });

  it('buscar_leads passa p_q, p_region, p_filtro e p_limite e resume cada lead numa linha', async () => {
    const { banco, rpcs } = fakeBanco({ rpcs: { bruna_gestor_buscar_leads: () => [LEAD_27926] } });
    const r = await executarTool('buscar_leads', { q: 'Adão', region: 'brasil2' }, contexto(banco));
    expect(rpcs[0]).toEqual({ funcao: 'bruna_gestor_buscar_leads', args: { p_q: 'Adão', p_region: 'brasil2', p_filtro: null, p_limite: 20 } });
    expect(r.resultado).toContain('[27926] Adão Souto · brasil2 · Bruna off · última 04/11 23:50 por atendente: "É um calor insuportável durante esse período ?" · Vila Brasília/Aparecida de Goiânia · objetivo: Calor Parte frontal da loja');
    expect(r.resumo).toBe('Busquei leads ("Adão", praça brasil2): 1 resultado(s)');
    const vazio = await executarTool('buscar_leads', { limite: 500, filtro: 'agendados' }, contexto(fakeBanco({ rpcs: { bruna_gestor_buscar_leads: () => [] } }).banco));
    expect(vazio.resultado).toBe('Nenhum lead encontrado com esses critérios.');
  });

  it('lead_conversa lê mensagens sem o copiloto, da mais nova para a mais antiga, e devolve em ordem cronológica', async () => {
    const { banco, chamadas } = fakeBanco({ tabelas: { mensagens: () => MENSAGENS_26634 } });
    const r = await executarTool('lead_conversa', { contato_id: 26634, antes_de_id: 430000 }, contexto(banco));
    const c = chamadas[0];
    expect(c.tabela).toBe('mensagens');
    expect(passo(c, 'select')).toEqual(['id, created_at, sender_type, direction, content, message_type, template_name, sender_name, transcricao, midia_descricao, auto_resposta']);
    expect(passo(c, 'eq')).toEqual(['contato_id', 26634]);
    expect(passo(c, 'neq')).toEqual(['sender_type', 'copiloto']);
    expect(passo(c, 'lt')).toEqual(['id', 430000]);
    expect(c.passos.filter(([m]) => m === 'order').map(([, a]) => a)).toEqual([['created_at', { ascending: false }], ['id', { ascending: false }]]);
    expect(passo(c, 'limit')).toEqual([80]);
    const linhas = r.resultado.split('\n');
    expect(linhas[0]).toContain('3 mensagem(ns) do lead 26634');
    expect(linhas.slice(1)).toEqual([
      '[427263] 20/10 11:30 Template: Oi Reinaldo, sei que tem muita coisa disputando sua atenção (template fup90_v2_10_calculadora)',
      '[428704] 21/10 11:34 Bruna: Reinaldo, alguém do time vai seguir com você por aqui sobre o orçamento no local.',
      '[428943] 21/10 13:33 Cliente: Ok',
    ]);
    expect(r.resumo).toBe('Li 3 mensagens da conversa do lead 26634 (antes da nº 430000)');
  });

  it('lead_linha_do_tempo chama bruna_gestor_lead_timeline com o limite', async () => {
    const eventos = [{ ref: 120, tipo: 'revisao', extra: { na_proxima: 'Corrija em uma linha.', verificada_em: '2026-10-13T17:00:56+00:00', cancelada_em: null }, quando: '2026-10-13T16:58:31.2563+00:00', titulo: 'Revisão (grave): info_errada', detalhe: 'Deu a faixa do catálogo inteiro.' }];
    const { banco, rpcs } = fakeBanco({ rpcs: { bruna_gestor_lead_timeline: () => eventos } });
    const r = await executarTool('lead_linha_do_tempo', { contato_id: 26634, limite: 10 }, contexto(banco));
    expect(rpcs[0]).toEqual({ funcao: 'bruna_gestor_lead_timeline', args: { p_contato_id: 26634, p_limite: 10 } });
    expect(r.resultado).toContain('13/10 13:58 [revisao] Revisão (grave): info_errada — Deu a faixa do catálogo inteiro. | na próxima: Corrija em uma linha. | verificada (ref 120)');
  });

  it('metricas lê o período e o anterior de mesmo tamanho', async () => {
    const { banco, rpcs } = fakeBanco({ rpcs: { bruna_gestor_metricas: (args) => ({ periodo: { de: args.p_de, ate: args.p_ate }, novos: 595, agendados: 55 }) } });
    const r = await executarTool('metricas', { dias: 7 }, contexto(banco));
    expect(rpcs.map((x) => x.funcao)).toEqual(['bruna_gestor_metricas', 'bruna_gestor_metricas']);
    expect(rpcs[0].args).toEqual({ p_de: '2026-10-29T03:20:00.000Z', p_ate: '2026-11-05T03:20:00.000Z' });
    expect(rpcs[1].args).toEqual({ p_de: '2026-10-22T03:20:00.000Z', p_ate: '2026-10-29T03:20:00.000Z' });
    const dados = JSON.parse(r.resultado);
    expect(dados.atual.novos).toBe(595);
    expect(dados.periodo_anterior.ate).toBe(dados.periodo_atual.de);
    expect(r.resumo).toBe('Li as métricas dos últimos 7 dias e do período anterior');
  });

  it('erros, regua_resumo e alertas chamam as RPCs certas', async () => {
    const { banco, rpcs } = fakeBanco({
      rpcs: { bruna_gestor_erros: () => ({ revisoes_por_tipo: [] }), bruna_gestor_regua_resumo: () => ({ escada: [] }), bruna_gestor_alertas: () => ALERTAS },
    });
    const ctx = contexto(banco);
    await executarTool('erros', { dias: 30 }, ctx);
    await executarTool('regua_resumo', { dias: 7 }, ctx);
    const alertas = await executarTool('alertas', {}, ctx);
    expect(rpcs.map((x) => x.funcao)).toEqual(['bruna_gestor_erros', 'bruna_gestor_regua_resumo', 'bruna_gestor_alertas']);
    expect(rpcs[0].args).toEqual({ p_de: '2026-10-06T03:20:00.000Z', p_ate: '2026-11-05T03:20:00.000Z' });
    expect(alertas.resultado).toContain('[media] 2 pergunta(s) de clientes que a base não respondeu — Perguntas distintas sem entrada na base de conhecimento (últimos 14 dias). → responder em Configurações › Base (duvidas_sem_resposta)');
    expect(alertas.resumo).toBe('Li os alertas: 2');
  });

  it('orientacoes usa bruna_instrucoes_vivas com o lead e a tabela bruna_instrucoes sem ele', async () => {
    const { banco, rpcs, chamadas } = fakeBanco({
      rpcs: { bruna_instrucoes_vivas: () => [{ id: 1, escopo: 'global', titulo: 'Bairro antes do preço', texto: 'Pergunte o bairro.', aplica_em: ['conversa'] }] },
      tabelas: { bruna_instrucoes: () => [{ id: 1, escopo: 'region', region: 'sp', contato_id: null, titulo: 'Bairro antes do preço', texto: 'Pergunte o bairro.', aplica_em: ['conversa', 'toque'], prioridade: 100, vigencia_fim: null, origem: 'gestor', criado_por_email: 'bruno@besserhome.com.br', criado_em: '2026-11-05T02:00:00+00:00' }] },
    });
    const vivas = await executarTool('orientacoes', { contato_id: 26634 }, contexto(banco));
    expect(rpcs[0]).toEqual({ funcao: 'bruna_instrucoes_vivas', args: { p_contato_id: 26634 } });
    expect(JSON.parse(vivas.resultado)[0].titulo).toBe('Bairro antes do preço');
    const todas = await executarTool('orientacoes', {}, contexto(banco));
    expect(chamadas[0].tabela).toBe('bruna_instrucoes');
    expect(passo(chamadas[0], 'eq')).toEqual(['ativa', true]);
    expect(todas.resultado).toContain('[1] praça sp · Bairro antes do preço: Pergunte o bairro. · vale em conversa/toque · prioridade 100 · gestor (bruno@besserhome.com.br)');
  });

  it('base_buscar tenta a busca de texto em português e cai para ilike quando não acha', async () => {
    const { banco, chamadas } = fakeBanco({ tabelas: { bruna_conhecimento: (c) => (c.passos.some(([m]) => m === 'or') ? [BASE_GARANTIA] : []) } });
    const r = await executarTool('base_buscar', { termo: 'garantia (anos), "prazo"' }, contexto(banco));
    expect(chamadas.length).toBe(2);
    expect(passo(chamadas[0], 'textSearch')).toEqual(['busca', 'garantia (anos), "prazo"', { config: 'portuguese', type: 'websearch' }]);
    expect(passo(chamadas[0], 'eq')).toEqual(['ativo', true]);
    expect(passo(chamadas[0], 'limit')).toEqual([8]);
    expect(passo(chamadas[1], 'or')).toEqual(['titulo.ilike.%garantia anos prazo%,conteudo.ilike.%garantia anos prazo%']);
    const dados = JSON.parse(r.resultado);
    expect(dados.busca).toBe('trecho do título ou do conteúdo');
    expect(dados.entradas[0]).toMatchObject({ id: 9, chave: 'garantia_e_durabilidade', categoria: 'garantia' });
    expect(r.resumo).toBe('Busquei "garantia (anos), "prazo"" na base: 1 entrada(s)');
  });

  it('base_buscar devolve só a busca de texto quando ela acha', async () => {
    const { banco, chamadas } = fakeBanco({ tabelas: { bruna_conhecimento: () => [BASE_GARANTIA] } });
    const r = await executarTool('base_buscar', { termo: 'garantia', limite: 3 }, contexto(banco));
    expect(chamadas.length).toBe(1);
    expect(JSON.parse(r.resultado).busca).toBe('busca de texto');
  });

  it('nucleo_secoes e nucleo_trecho leem bruna_prompt_atual', async () => {
    const { banco, chamadas } = fakeBanco({ tabelas: { bruna_prompt_atual: () => ({ id: 1, numero: 1, conteudo: NUCLEO }) } });
    const secoes = await executarTool('nucleo_secoes', {}, contexto(banco));
    expect(chamadas[0].tabela).toBe('bruna_prompt_atual');
    expect(passo(chamadas[0], 'maybeSingle')).toEqual([]);
    expect(secoes.resultado).toContain('Núcleo publicado nº 1');
    expect(secoes.resultado).toContain('## Sobre preço (');
    expect(secoes.resultado).toContain('### Pedido de orçamento (');
    expect(secoes.resumo).toBe('Listei as 5 seções do núcleo (versão nº 1)');
    const trecho = await executarTool('nucleo_trecho', { titulo: 'limites' }, contexto(banco));
    expect(trecho.resultado).toContain('## Limites\n\nNunca invente horário.');
    const nada = await executarTool('nucleo_trecho', { titulo: 'descontos' }, contexto(banco));
    expect(nada.isError).toBe(true);
    expect(nada.resultado).toContain('## Sobre preço');
  });

  it('sugestoes_pendentes lê bruna_sugestoes com status pendente', async () => {
    const { banco, chamadas } = fakeBanco({ tabelas: { bruna_sugestoes: () => [{ id: 3, origem: 'analise', tipo: 'base', titulo: 'Responder sobre película elétrica', prioridade: 'media', criado_em: '2026-11-05T02:00:00+00:00' }] } });
    const r = await executarTool('sugestoes_pendentes', {}, contexto(banco));
    expect(chamadas[0].tabela).toBe('bruna_sugestoes');
    expect(passo(chamadas[0], 'eq')).toEqual(['status', 'pendente']);
    expect(r.resultado).toContain('[3] base · prioridade media · analise em 04/11 23:00 · Responder sobre película elétrica');
  });

  it('propor_acao grava em bruna_sugestoes (origem copiloto, pendente), emite o evento sugestao e audita', async () => {
    const inserido: unknown[] = [];
    const { banco, chamadas, rpcs } = fakeBanco({
      tabelas: {
        bruna_sugestoes: (c) => {
          inserido.push(passo(c, 'insert')?.[0]);
          return { id: 41, tipo: 'instrucao', titulo: 'Confirmar o bairro antes do preço', descricao: 'desc', prioridade: 'alta', acao: { tipo: 'instrucao_criar', escopo: 'contato', contato_id: 26634, titulo: 'Bairro', texto: 'Pergunte o bairro.' } };
        },
      },
      rpcs: { bruna_gestor_auditar: () => null },
    });
    const ctx = contexto(banco);
    const r = await executarTool(
      'propor_acao',
      {
        tipo: 'instrucao',
        titulo: 'Confirmar o bairro antes do preço',
        descricao: 'desc',
        prioridade: 'alta',
        evidencias: [{ contato_id: 26634, trecho: 'Para película transparente, os valores vão de R$397 a R$1.290' }],
        acao: { tipo: 'instrucao_criar', escopo: 'contato', contato_id: 26634, titulo: 'Bairro', texto: 'Pergunte o bairro.' },
      },
      ctx,
    );
    expect(chamadas[0].tabela).toBe('bruna_sugestoes');
    expect(inserido[0]).toEqual({
      origem: 'copiloto',
      status: 'pendente',
      analise_id: null,
      tipo: 'instrucao',
      titulo: 'Confirmar o bairro antes do preço',
      descricao: 'desc',
      impacto: null,
      prioridade: 'alta',
      evidencias: [{ contato_id: 26634, trecho: 'Para película transparente, os valores vão de R$397 a R$1.290' }],
      acao: { tipo: 'instrucao_criar', escopo: 'contato', contato_id: 26634, titulo: 'Bairro', texto: 'Pergunte o bairro.' },
    });
    expect(passo(chamadas[0], 'select')).toEqual(['id, tipo, titulo, descricao, prioridade, acao']);
    expect(ctx.emitir).toHaveBeenCalledWith('sugestao', {
      id: 41,
      tipo: 'instrucao',
      titulo: 'Confirmar o bairro antes do preço',
      descricao: 'desc',
      prioridade: 'alta',
      acao: { tipo: 'instrucao_criar', escopo: 'contato', contato_id: 26634, titulo: 'Bairro', texto: 'Pergunte o bairro.' },
    });
    expect(rpcs[0]).toEqual({
      funcao: 'bruna_gestor_auditar',
      args: { p_acao: 'gestor_copiloto_sugestao_proposta', p_entidade: 'bruna_sugestoes', p_entidade_id: 41, p_contato_id: 26634, p_detalhes: { tipo: 'instrucao', titulo: 'Confirmar o bairro antes do preço', prioridade: 'alta', acao: 'instrucao_criar', sessao_id: 7 } },
    });
    expect(JSON.parse(r.resultado)).toEqual({ id: 41, status: 'pendente' });
    expect(r.resumo).toBe('Propus a sugestão nº 41: Confirmar o bairro antes do preço');
  });

  it('propor_acao com a auditoria recusada mantém a sugestão e registra a recusa no log', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const { banco, rpcs } = fakeBanco({
        tabelas: { bruna_sugestoes: () => ({ id: 42, tipo: 'base', titulo: 'Faixa da transparente na base', descricao: 'desc', prioridade: 'media', acao: null }) },
        erroRpc: 'sem permissão para o gerenciador da Bruna',
      });
      const ctx = contexto(banco);
      const r = await executarTool('propor_acao', { tipo: 'base', titulo: 'Faixa da transparente na base', descricao: 'desc', prioridade: 'media', evidencias: [], acao: null }, ctx);
      expect(r.isError).toBeUndefined();
      expect(JSON.parse(r.resultado)).toEqual({ id: 42, status: 'pendente' });
      expect(rpcs.map((x) => x.funcao)).toEqual(['bruna_gestor_auditar']);
      expect(aviso).toHaveBeenCalledWith('[bruna-copiloto] auditoria falhou', 'gestor_copiloto_sugestao_proposta', 'sem permissão para o gerenciador da Bruna');
    } finally {
      aviso.mockRestore();
    }
  });

  it('propor_acao inválida não grava nada e volta como erro para o modelo', async () => {
    const { banco, chamadas } = fakeBanco();
    const ctx = contexto(banco);
    const r = await executarTool('propor_acao', { tipo: 'instrucao', descricao: 'x', acao: null }, ctx);
    expect(r.isError).toBe(true);
    expect(r.resultado).toBe('proposta inválida: falta "titulo"');
    expect(chamadas).toEqual([]);
    expect(ctx.emitir).not.toHaveBeenCalled();
  });

  it('erro do banco e ferramenta desconhecida viram tool_result com is_error, nunca exceção', async () => {
    const { banco } = fakeBanco({ erroRpc: 'sem permissão para o gerenciador da Bruna' });
    const r = await executarTool('alertas', {}, contexto(banco));
    expect(r).toEqual({ isError: true, resultado: 'erro em alertas: sem permissão para o gerenciador da Bruna', resumo: 'Alertas falhou: sem permissão para o gerenciador da Bruna' });
    const x = await executarTool('apagar_lead', { contato_id: 1 }, contexto(banco));
    expect(x.isError).toBe(true);
    const semId = await executarTool('lead_estado', { contato_id: 'abc' }, contexto(banco));
    expect(semId.isError).toBe(true);
    expect(semId.resultado).toContain('contato_id');
  });
});

/* ------------------------------------------------------------------------ */
/* tools.ts: bairros foco                                                    */
/* ------------------------------------------------------------------------ */

/** Percorre um schema e conta, como a página de structured outputs, os parâmetros opcionais e os com união. */
function contarParametros(s: unknown, acc = { opcionais: 0, unioes: 0 }) {
  if (!s || typeof s !== 'object') return acc;
  const o = s as Record<string, unknown>;
  if (o.type === 'object' && o.properties && typeof o.properties === 'object') {
    const obrigatorios = new Set(Array.isArray(o.required) ? (o.required as string[]) : []);
    for (const [nome, p] of Object.entries(o.properties as Record<string, Record<string, unknown>>)) {
      if (!obrigatorios.has(nome)) acc.opcionais++;
      if (Array.isArray(p.anyOf) || Array.isArray(p.type)) acc.unioes++;
      contarParametros(p, acc);
    }
    return acc;
  }
  for (const [k, v] of Object.entries(o)) {
    if (k === 'properties') continue;
    if (Array.isArray(v)) v.forEach((x) => contarParametros(x, acc));
    else if (v && typeof v === 'object') contarParametros(v, acc);
  }
  return acc;
}

describe('tools: bairros foco nas definições', () => {
  it('as duas tools de leitura entram na lista estável, entre o núcleo e as sugestões pendentes', () => {
    expect(DEFINICOES_DAS_TOOLS.map((t) => t.name)).toEqual([
      'buscar_leads', 'lead_estado', 'lead_conversa', 'lead_linha_do_tempo', 'metricas', 'erros', 'alertas', 'regua_resumo',
      'orientacoes', 'base_buscar', 'nucleo_secoes', 'nucleo_trecho', 'bairros_foco', 'bairro_testar', 'sugestoes_pendentes', 'propor_acao',
    ]);
    const painel = DEFINICOES_DAS_TOOLS.find((t) => t.name === 'bairros_foco')!;
    expect(painel.strict).toBe(true);
    expect(painel.input_schema.required).toEqual(['region']);
    expect((painel.input_schema.properties.region as { enum: string[] }).enum).toEqual(['sp', 'rj', 'goiania']);
    expect([...PRACAS_COM_CONSULTORIA]).toEqual(['sp', 'rj', 'goiania']);
    const testar = DEFINICOES_DAS_TOOLS.find((t) => t.name === 'bairro_testar')!;
    expect(testar.strict).toBe(true);
    expect(testar.input_schema.required).toEqual(['region', 'bairro']);
    expect(Object.keys(testar.input_schema.properties)).toEqual(['region', 'bairro', 'cidade']);
    const proposta = DEFINICOES_DAS_TOOLS.find((t) => t.name === 'propor_acao')!.description;
    for (const termo of ['bairro_foco_salvar', 'bairro_foco_remover', 'tipo_item', 'nome_original', 'tipo_original', 'so_se', 'nao_se', 'salvar_contato', 'Montar contexto v3']) {
      expect(proposta).toContain(termo);
    }
  });

  it('as tools strict cabem nos limites da API: até 20 tools, 24 opcionais e 16 parâmetros com união somados', () => {
    // platform.claude.com/docs/en/build-with-claude/structured-outputs: os limites valem para a soma de todas as strict do pedido.
    const estritas = DEFINICOES_DAS_TOOLS.filter((t) => t.strict);
    const soma = estritas.reduce((acc, t) => contarParametros(t.input_schema, acc), { opcionais: 0, unioes: 0 });
    expect(estritas.length).toBe(15);
    expect(estritas.length).toBeLessThanOrEqual(20);
    expect(soma.opcionais).toBe(10);
    expect(soma.opcionais).toBeLessThanOrEqual(24);
    expect(soma.unioes).toBe(0);
    // propor_acao vai sem strict: o acao objeto-ou-null dela não conta.
    expect(DEFINICOES_DAS_TOOLS.find((t) => t.name === 'propor_acao')!.strict).toBeUndefined();
  });
});

describe('tools: propor_acao com os bairros foco', () => {
  const base = {
    tipo: 'config',
    titulo: 'Tijuca nos bairros foco do Rio',
    descricao: '17 leads da Tijuca em 90 dias ficaram fora do foco e foram para a foto.',
    prioridade: 'media',
    evidencias: [{ contato_id: 28171, nota: 'lead de exemplo do painel' }],
  };
  const aceita = (acao: unknown) => {
    const r = validarPropostaDeAcao({ ...base, acao });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    return r.ok === true ? r.proposta.acao : null;
  };
  const recusa = (acao: unknown) => {
    const r = validarPropostaDeAcao({ ...base, acao });
    expect(r.ok).toBe(false);
    return r.ok === false ? r.erro : '';
  };

  it('criar: limpa nome e termos (espaços, repetidos sem acento e sem caixa, vazios) e descarta o resto', () => {
    expect(aceita({ tipo: 'bairro_foco_salvar', region: 'rj', tipo_item: 'bairro', nome: '  Barra  ', nao_se: ['barra mansa', ' Barra  Mansa ', '', 'barra do pirai'], motivo: ' 26 leads ', cor: 'azul' }))
      .toEqual({ tipo: 'bairro_foco_salvar', region: 'rj', tipo_item: 'bairro', nome: 'Barra', nao_se: ['barra mansa', 'barra do pirai'], motivo: '26 leads' });
  });

  it('alterar: guarda nome_original e tipo_original; lista vazia e observação null seguem para apagar', () => {
    expect(aceita({ tipo: 'bairro_foco_salvar', region: 'sp', tipo_item: 'cidade', nome: 'Barueri', nome_original: 'Barueri', tipo_original: 'bairro', so_se: [], observacao: null }))
      .toEqual({ tipo: 'bairro_foco_salvar', region: 'sp', tipo_item: 'cidade', nome: 'Barueri', so_se: [], observacao: null, nome_original: 'Barueri', tipo_original: 'bairro' });
    // Sem so_se, nao_se e observacao, nada disso vai: o gerenciador mantém o que está gravado.
    expect(aceita({ tipo: 'bairro_foco_salvar', region: 'rj', tipo_item: 'bairro', nome: 'Recreio dos Bandeirantes', nome_original: 'Recreio dos Bandeirantes', so_se: null }))
      .toEqual({ tipo: 'bairro_foco_salvar', region: 'rj', tipo_item: 'bairro', nome: 'Recreio dos Bandeirantes', nome_original: 'Recreio dos Bandeirantes' });
  });

  it('tirar: o nome exato e o motivo', () => {
    expect(aceita({ tipo: 'bairro_foco_remover', region: 'rj', tipo_item: 'bairro', nome: 'Joá', motivo: 'um lead em 90 dias', so_se: ['x'] }))
      .toEqual({ tipo: 'bairro_foco_remover', region: 'rj', tipo_item: 'bairro', nome: 'Joá', motivo: 'um lead em 90 dias' });
  });

  it('recusa praça sem consultoria, tipo de item, nome fora do tamanho, termo longo, termos demais e tipo_original solto', () => {
    expect(recusa({ tipo: 'bairro_foco_salvar', region: 'brasil', tipo_item: 'bairro', nome: 'Centro' })).toContain('"acao.region" tem de ser um de: sp, rj, goiania');
    expect(recusa({ tipo: 'bairro_foco_salvar', region: 'rj', tipo_item: 'condominio', nome: 'Barra' })).toContain('acao.tipo_item');
    expect(recusa({ tipo: 'bairro_foco_salvar', region: 'rj', tipo_item: 'bairro', nome: 'B' })).toContain('de 2 a 80 caracteres');
    expect(recusa({ tipo: 'bairro_foco_salvar', region: 'rj', tipo_item: 'bairro', nome: 'x'.repeat(81) })).toContain('de 2 a 80 caracteres');
    expect(recusa({ tipo: 'bairro_foco_salvar', region: 'rj', tipo_item: 'bairro', nome: '--' })).toContain('letras ou números');
    expect(recusa({ tipo: 'bairro_foco_salvar', region: 'rj', tipo_item: 'bairro', nome: 'Barra', nao_se: ['x'.repeat(61)] })).toContain('passa de 60 caracteres');
    expect(recusa({ tipo: 'bairro_foco_salvar', region: 'rj', tipo_item: 'bairro', nome: 'Barra', nao_se: Array.from({ length: 21 }, (_, i) => `barra ${i}`) })).toContain('no máximo 20 termos');
    expect(recusa({ tipo: 'bairro_foco_salvar', region: 'rj', tipo_item: 'bairro', nome: 'Barra', so_se: 'rio de janeiro' })).toContain('"acao.so_se" tem de ser uma lista');
    expect(recusa({ tipo: 'bairro_foco_salvar', region: 'rj', tipo_item: 'bairro', nome: 'Barra', tipo_original: 'cidade' })).toContain('nome_original');
    expect(recusa({ tipo: 'bairro_foco_remover', region: 'rj', tipo_item: 'bairro' })).toBe('falta "acao.nome"');
  });
});

describe('tools: bairros foco (puro)', () => {
  it('normaliza como bruna_normaliza_texto', () => {
    expect(normalizarComoOBanco('  São Conrado ')).toBe('sao conrado');
    expect(normalizarComoOBanco('Jardim Botânico/RJ')).toBe('jardim botanico rj');
    expect(normalizarComoOBanco('Itanhangá')).toBe('itanhanga');
    expect(normalizarComoOBanco(null)).toBe('');
  });

  it('resume o painel: itens enxutos por tipo, pedidos fora do foco com a data em Brasília e os totais de leads', () => {
    const r = resumirPainelDoFoco(PAINEL_RJ);
    expect(r.praca).toEqual({ region: 'rj', nome: 'Rio de Janeiro', oferece_consultoria: true });
    expect(r.periodo).toEqual({ dias: 90, de: '07/08 11:09', ate: '05/11 11:09' });
    expect(r.totais).toEqual({ bairros: 5, cidades: 0, leads_com_bairro: 519, leads_no_foco: 159, leads_fora_do_foco: 360, leads_sem_bairro: 709 });
    expect(r.bairros).toEqual([
      { nome: 'Barra da Tijuca', leads: 44, agendados: 13 },
      { nome: 'Joá', leads: 1, agendados: 0 },
      { nome: 'Recreio dos Bandeirantes', leads: 18, agendados: 5 },
      { nome: 'Barra', leads: 26, agendados: 1, nao_se: ['barra mansa', 'barra do pirai', 'barra de guaratiba', 'barra do sana', 'barra bonita', 'barra seca', 'barra funda'] },
      { nome: 'Recreio', leads: 16, agendados: 2, nao_se: ['rio das ostras'] },
    ]);
    expect(r.fora_do_foco).toEqual([
      { bairro: 'Campo Grande', cidade: 'Rio de Janeiro', leads: 26, agendados: 0, ultimo: '28/10 17:56', contato_exemplo: 28280 },
      { bairro: 'Tijuca', cidade: 'Rio de Janeiro', leads: 17, agendados: 0, ultimo: '27/10 20:40', contato_exemplo: 28171 },
      { bairro: 'Botafogo', cidade: 'Rio de Janeiro', leads: 12, agendados: 0, ultimo: '26/10 20:58', contato_exemplo: 28062 },
    ]);
    expect(JSON.stringify(r)).not.toMatch(/atualizado_em|ultimo_lead_em|ordem/);
    // Cidade inteira vai na lista dela, e a observação do gestor entra quando existe.
    const comCidade = resumirPainelDoFoco({ ...PAINEL_RJ, itens: [{ ...PAINEL_RJ.itens[0], nome: 'Barueri', tipo: 'cidade', observacao: '  nota do gestor  ' }] });
    expect(comCidade.cidades).toEqual([{ nome: 'Barueri', leads: 44, agendados: 13, observacao: 'nota do gestor' }]);
    expect(comCidade.bairros).toEqual([]);
    expect(resumirPainelDoFoco(null).totais).toEqual({ bairros: 0, cidades: 0, leads_com_bairro: 0, leads_no_foco: 0, leads_fora_do_foco: 0, leads_sem_bairro: 0 });
  });

  it('explica o teste em uma frase, como a tela Bairros foco', () => {
    expect(fraseDoTesteDoFoco(TESTE_RECREIO)).toBe('É foco: casou com Recreio pelo nome completo.');
    expect(fraseDoTesteDoFoco(TESTE_BARRA_MANSA)).toBe("Não é foco: 'Barra' não vale quando o texto tem 'barra mansa'.");
    expect(fraseDoTesteDoFoco(TESTE_TIJUCA)).toBe('Não é foco: nenhum item da lista casou.');
    expect(fraseDoTesteDoFoco({ ...TESTE_RECREIO, como: 'nucleo', nome: 'Setor Bueno', alvo: 'bueno', nucleo: 'bueno' })).toBe("É foco: casou com Setor Bueno pelo núcleo 'bueno'.");
    expect(fraseDoTesteDoFoco({ ...TESTE_RECREIO, tipo: 'cidade', nome: 'Barueri' })).toBe('É foco: casou com a cidade Barueri pelo nome completo.');
    expect(fraseDoTesteDoFoco({ ...TESTE_TIJUCA, bloqueados: [{ nome: 'Centro', tipo: 'bairro', motivo: 'so_se', exige: ['barueri', 'santana de parnaiba'] }] }))
      .toBe("Não é foco: 'Centro' só vale se a cidade for barueri ou santana de parnaiba.");
    expect(fraseDoTesteDoFoco({ ...TESTE_TIJUCA, oferece_consultoria: false })).toContain('sem lista');
  });

  it('confere a ação contra a lista de hoje: nome exato para tirar ou alterar, sem repetir outro item, e o último não sai', () => {
    const acao = (a: Record<string, unknown>) => ({ region: 'rj', tipo_item: 'bairro', ...a });
    expect(problemaNaListaDoFoco(acao({ tipo: 'bairro_foco_remover', nome: 'Joá' }), LISTA_RJ)).toBeNull();
    expect(problemaNaListaDoFoco(acao({ tipo: 'bairro_foco_remover', nome: 'joa' }), LISTA_RJ)).toBe('"joa" (bairro) não está nos bairros foco de rj (na lista está "Joá"): leia com bairros_foco e use o nome exato');
    expect(problemaNaListaDoFoco(acao({ tipo: 'bairro_foco_remover', nome: 'Recreio dos Bandeirante' }), LISTA_RJ)).toContain('não está nos bairros foco de rj: leia com bairros_foco');
    expect(problemaNaListaDoFoco(acao({ tipo: 'bairro_foco_remover', nome: 'Joá' }), [{ tipo: 'bairro', nome: 'Joá' }])).toContain('é o último item de rj');
    expect(problemaNaListaDoFoco(acao({ tipo: 'bairro_foco_salvar', nome: 'Tijuca' }), LISTA_RJ)).toBeNull();
    expect(problemaNaListaDoFoco(acao({ tipo: 'bairro_foco_salvar', nome: 'BARRA DA TIJUCA' }), LISTA_RJ)).toBe('já existe "Barra da Tijuca" (bairro) nos bairros foco de rj: para mudar as regras dele, use nome_original');
    // Cidade e bairro são listas separadas, como no banco.
    expect(problemaNaListaDoFoco(acao({ tipo: 'bairro_foco_salvar', tipo_item: 'cidade', nome: 'Barra' }), LISTA_RJ)).toBeNull();
    expect(problemaNaListaDoFoco(acao({ tipo: 'bairro_foco_salvar', nome: 'Recreio', nome_original: 'Recreio', nao_se: [] }), LISTA_RJ)).toBeNull();
    expect(problemaNaListaDoFoco(acao({ tipo: 'bairro_foco_salvar', nome: 'Recreio', nome_original: 'Recreios' }), LISTA_RJ)).toContain('"Recreios" (bairro) não está nos bairros foco de rj');
    expect(problemaNaListaDoFoco(acao({ tipo: 'bairro_foco_salvar', nome: 'Recreio dos Bandeirantes', nome_original: 'Recreio' }), LISTA_RJ)).toContain('já existe "Recreio dos Bandeirantes"');
    expect(problemaNaListaDoFoco(acao({ tipo: 'bairro_foco_salvar', tipo_item: 'cidade', nome: 'Joá', nome_original: 'Joá', tipo_original: 'bairro' }), LISTA_RJ)).toBeNull();
  });
});

describe('tools: executores dos bairros foco', () => {
  it('bairros_foco lê o painel de 90 dias da praça e devolve o resumo enxuto', async () => {
    const { banco, rpcs } = fakeBanco({ rpcs: { bruna_gestor_bairros_foco_painel: () => PAINEL_RJ } });
    const r = await executarTool('bairros_foco', { region: 'rj' }, contexto(banco));
    expect(rpcs).toEqual([{ funcao: 'bruna_gestor_bairros_foco_painel', args: { p_region: 'rj', p_dias: 90 } }]);
    expect(r.isError).toBeUndefined();
    expect(JSON.parse(r.resultado)).toEqual(resumirPainelDoFoco(PAINEL_RJ));
    expect(r.resumo).toBe('Li os bairros foco de Rio de Janeiro: 5 bairro(s), 0 cidade(s) inteira(s), 3 pedido(s) fora do foco em 90 dias');
  });

  it('bairros_foco e bairro_testar recusam praça sem consultoria sem chamar o banco', async () => {
    const { banco, rpcs } = fakeBanco();
    const r = await executarTool('bairros_foco', { region: 'brasil' }, contexto(banco));
    expect(r.isError).toBe(true);
    expect(r.resultado).toBe('erro em bairros_foco: "region" tem de ser uma praça com consultoria (sp, rj, goiania)');
    expect((await executarTool('bairro_testar', { region: 'brasil2', bairro: 'Centro' }, contexto(banco))).isError).toBe(true);
    expect(rpcs).toEqual([]);
  });

  it('bairro_testar passa o bairro e a cidade como vieram e devolve a decisão com a explicação', async () => {
    const { banco, rpcs } = fakeBanco({ rpcs: { bruna_gestor_bairro_foco_testar: (args) => (args.p_bairro === 'Tijuca' ? TESTE_TIJUCA : TESTE_BARRA_MANSA) } });
    const tijuca = await executarTool('bairro_testar', { region: 'rj', bairro: ' Tijuca ', cidade: 'Rio de Janeiro' }, contexto(banco));
    expect(rpcs[0]).toEqual({ funcao: 'bruna_gestor_bairro_foco_testar', args: { p_region: 'rj', p_bairro: 'Tijuca', p_cidade: 'Rio de Janeiro' } });
    expect(JSON.parse(tijuca.resultado)).toEqual({ ...TESTE_TIJUCA, explicacao: 'Não é foco: nenhum item da lista casou.' });
    expect(tijuca.resumo).toBe('Testei "Tijuca" (Rio de Janeiro) em rj: fora do foco');
    const barraMansa = await executarTool('bairro_testar', { region: 'rj', bairro: 'Barra Mansa' }, contexto(banco));
    expect(rpcs[1].args).toEqual({ p_region: 'rj', p_bairro: 'Barra Mansa', p_cidade: null });
    expect(JSON.parse(barraMansa.resultado).explicacao).toBe("Não é foco: 'Barra' não vale quando o texto tem 'barra mansa'.");
    const recreio = await executarTool('bairro_testar', { region: 'rj', bairro: 'Recreio' }, contexto(fakeBanco({ rpcs: { bruna_gestor_bairro_foco_testar: () => TESTE_RECREIO } }).banco));
    expect(recreio.resumo).toBe('Testei "Recreio" em rj: foco, casou com Recreio');
  });

  it('propor_acao de bairro confere a lista de hoje antes de gravar a sugestão', async () => {
    const inserido: unknown[] = [];
    const acao = { tipo: 'bairro_foco_salvar', region: 'rj', tipo_item: 'bairro', nome: 'Tijuca', motivo: '17 leads em 90 dias' };
    const { banco, chamadas, rpcs } = fakeBanco({
      tabelas: {
        bruna_bairros_foco: () => LISTA_RJ,
        bruna_sugestoes: (c) => {
          inserido.push(passo(c, 'insert')?.[0]);
          return { id: 43, tipo: 'config', titulo: 'Tijuca nos bairros foco do Rio', descricao: 'desc', prioridade: 'media', acao };
        },
      },
      rpcs: { bruna_gestor_auditar: () => null },
    });
    const ctx = contexto(banco);
    const r = await executarTool('propor_acao', { tipo: 'config', titulo: 'Tijuca nos bairros foco do Rio', descricao: 'desc', prioridade: 'media', evidencias: [{ contato_id: 28171 }], acao }, ctx);
    expect(r.isError).toBeUndefined();
    expect(chamadas.map((c) => c.tabela)).toEqual(['bruna_bairros_foco', 'bruna_sugestoes']);
    expect(passo(chamadas[0], 'select')).toEqual(['tipo, nome']);
    expect(passo(chamadas[0], 'eq')).toEqual(['region', 'rj']);
    expect(inserido[0]).toMatchObject({ origem: 'copiloto', status: 'pendente', tipo: 'config', acao });
    expect(ctx.emitir).toHaveBeenCalledWith('sugestao', expect.objectContaining({ id: 43, acao }));
    expect(rpcs[0].args).toMatchObject({ p_acao: 'gestor_copiloto_sugestao_proposta', p_contato_id: 28171, p_detalhes: expect.objectContaining({ acao: 'bairro_foco_salvar' }) });
  });

  it('propor_acao de bairro com o nome errado volta como erro para o modelo e não grava nada', async () => {
    const { banco, chamadas } = fakeBanco({ tabelas: { bruna_bairros_foco: () => LISTA_RJ } });
    const ctx = contexto(banco);
    const r = await executarTool(
      'propor_acao',
      { tipo: 'config', titulo: 'Tirar o Joá', descricao: 'Um lead em 90 dias.', prioridade: 'baixa', evidencias: [], acao: { tipo: 'bairro_foco_remover', region: 'rj', tipo_item: 'bairro', nome: 'Joa' } },
      ctx,
    );
    expect(r.isError).toBe(true);
    expect(r.resultado).toBe('proposta inválida: "Joa" (bairro) não está nos bairros foco de rj (na lista está "Joá"): leia com bairros_foco e use o nome exato');
    expect(chamadas.map((c) => c.tabela)).toEqual(['bruna_bairros_foco']);
    expect(ctx.emitir).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------------ */
/* prompt.ts                                                                 */
/* ------------------------------------------------------------------------ */

describe('prompt: o system prompt é estável e cobre o essencial', () => {
  it('não tem data nem hora (o cache do prefixo depende disso) e fala das alavancas e do aviso do n8n', () => {
    expect(SYSTEM_PROMPT).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(SYSTEM_PROMPT).not.toMatch(/\b(hoje|agora) (é|são)\b/i);
    for (const termo of ['propor_acao', 'Montar contexto v3', 'REVISÃO DO SEU ATENDIMENTO', 'ORIENTAÇÕES DO GESTOR', 'consultar_base', 'bairro_estado', 'sp, rj e goiania', 'Nunca diga que aplicou']) {
      expect(SYSTEM_PROMPT).toContain(termo);
    }
    // "bot" só aparece na proibição do vocabulário.
    expect(SYSTEM_PROMPT).toContain('nunca "bot"');
    expect(SYSTEM_PROMPT.match(/\bbot\b/gi)?.length).toBe(1);
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(4000);
  });

  it('a alavanca 7 é a dos bairros foco, com o efeito exato e a regra de testar antes de propor', () => {
    expect(SYSTEM_PROMPT).toContain('7. Bairros foco (bruna_bairros_foco; ações bairro_foco_salvar e bairro_foco_remover)');
    expect(SYSTEM_PROMPT).toContain('8. Quando nada disso serve');
    // Vale na hora para o bairro gravado, a tool salvar_contato e a escada; o prompt e a conversa, depois da subida do nó.
    expect(SYSTEM_PROMPT).toMatch(/vale na hora para o bairro já gravado no lead.*salvar_contato.*escada; o texto da lista no prompt da Bruna e a leitura da conversa antes de o bairro ser gravado só mudam depois que o "Montar contexto v3" subir/s);
    expect(SYSTEM_PROMPT).toContain('rode bairro_testar');
    expect(SYSTEM_PROMPT).toContain('use o fora_do_foco de bairros_foco como evidência');
    expect(SYSTEM_PROMPT).toContain('"Recreio dos Bandeirantes"');
    expect(SYSTEM_PROMPT).toContain('"Centro"');
    // A ordem das alavancas continua de 1 a 8, sem número repetido.
    const numeros = [...SYSTEM_PROMPT.matchAll(/^(\d)\. /gm)].map((m) => Number(m[1]));
    expect(numeros).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
