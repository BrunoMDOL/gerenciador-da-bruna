import { db } from '@/gerenciador/lib/db';
import { cabecalhosDaFuncao, enderecoDaFuncao } from '@/gerenciador/lib/funcoes';
import { criarLeitorDeSse } from './sse';

/**
 * O contrato entre a interface e a edge function bruna-copiloto. Os dois lados
 * foram construídos em paralelo a partir do mesmo protocolo; o que está aqui
 * é a parte da interface: montar o pedido, ler o fluxo SSE e traduzir cada
 * evento e cada resposta de erro.
 */
export const NOME_DA_FUNCAO = 'bruna-copiloto';

export interface SessaoDoEvento { id: number; titulo: string | null; contato_id: number | null }
export interface FerramentaDoEvento { nome: string; entrada: Record<string, unknown>; resumo: string }
export interface SugestaoDoEvento {
  id: number;
  tipo: string;
  titulo: string;
  descricao: string;
  prioridade: string;
  acao: Record<string, unknown> | null;
}
export interface FimDoEvento { mensagem_id: number; tokens_entrada: number; tokens_saida: number; modelo: string }

export type EventoDoCopiloto =
  | { tipo: 'sessao'; dados: SessaoDoEvento }
  | { tipo: 'usuario'; dados: { mensagem_id: number } }
  | { tipo: 'texto'; dados: { delta: string } }
  | { tipo: 'ferramenta'; dados: FerramentaDoEvento }
  | { tipo: 'sugestao'; dados: SugestaoDoEvento }
  | { tipo: 'fim'; dados: FimDoEvento }
  | { tipo: 'erro'; dados: { mensagem: string } };

const NOMES_DE_EVENTO = ['sessao', 'usuario', 'texto', 'ferramenta', 'sugestao', 'fim', 'erro'] as const;

export interface PedidoAoCopiloto {
  sessao_id: number | null;
  texto: string;
  contato_id: number | null;
}

/** Por que a conversa não andou. Cada motivo tem um aviso próprio na tela. */
export type MotivoDoErro =
  | 'sem_login'        // 401
  | 'sem_permissao'    // 403
  | 'sem_chave'        // 503 ANTHROPIC_API_KEY ausente
  | 'chave_invalida'   // 503 chave inválida: a Anthropic recusou a ANTHROPIC_API_KEY configurada
  | 'desligado'        // 503 copiloto desligado
  | 'pedido_invalido'  // 400
  | 'indisponivel'     // outro HTTP
  | 'rede'             // fetch não chegou lá
  | 'fluxo'            // o fluxo parou, veio evento "erro" ou um evento ilegível
  | 'cancelado';       // o gestor cancelou

export class ErroDoCopiloto extends Error {
  constructor(public readonly motivo: MotivoDoErro, message: string, public readonly status?: number) {
    super(message);
    this.name = 'ErroDoCopiloto';
  }
}

function lerEvento(nome: string, dados: string): EventoDoCopiloto | null {
  if (!(NOMES_DE_EVENTO as readonly string[]).includes(nome)) return null;
  let json: unknown;
  try {
    json = JSON.parse(dados);
  } catch {
    throw new ErroDoCopiloto('fluxo', `o copiloto mandou um evento "${nome}" que não deu para ler`);
  }
  if (!json || typeof json !== 'object') throw new ErroDoCopiloto('fluxo', `o evento "${nome}" veio sem conteúdo`);
  return { tipo: nome, dados: json } as EventoDoCopiloto;
}

async function erroDaResposta(resposta: Response): Promise<ErroDoCopiloto> {
  let texto = '';
  try {
    const bruto = await resposta.text();
    try {
      const json = JSON.parse(bruto) as { erro?: unknown };
      texto = typeof json?.erro === 'string' ? json.erro : bruto;
    } catch {
      texto = bruto;
    }
  } catch {
    texto = '';
  }
  texto = texto.trim();
  const s = resposta.status;
  if (s === 401) return new ErroDoCopiloto('sem_login', texto || 'sem login válido', s);
  if (s === 403) return new ErroDoCopiloto('sem_permissao', texto || 'sem permissão para o gerenciador da Bruna', s);
  // Chave que falta e chave recusada pedem coisas diferentes ao dono: pôr o segredo, ou trocá-lo.
  if (s === 503 && /ANTHROPIC_API_KEY ausente/i.test(texto)) return new ErroDoCopiloto('sem_chave', texto, s);
  if (s === 503 && /chave inv[aá]lida/i.test(texto)) return new ErroDoCopiloto('chave_invalida', texto, s);
  if (s === 503 && /desligad/i.test(texto)) return new ErroDoCopiloto('desligado', texto, s);
  if (s === 400 || s === 404) return new ErroDoCopiloto('pedido_invalido', texto || 'pedido inválido', s);
  return new ErroDoCopiloto('indisponivel', texto || `o copiloto respondeu HTTP ${s}`, s);
}

/**
 * Manda a pergunta do gestor e entrega cada evento do fluxo, na ordem, ao
 * callback. Resolve quando o servidor fecha o fluxo; lança ErroDoCopiloto
 * quando a resposta não é um fluxo (401, 403, 503, 400...), quando a rede
 * falha, quando o fluxo é cancelado pelo sinal ou quando vem um evento
 * ilegível. O evento "erro" do protocolo é entregue ao callback como os outros.
 */
export async function conversarComCopiloto(
  pedido: PedidoAoCopiloto,
  aoEvento: (evento: EventoDoCopiloto) => void,
  sinal?: AbortSignal,
): Promise<void> {
  const { data } = await db.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new ErroDoCopiloto('sem_login', 'sem sessão de login', 401);

  let resposta: Response;
  try {
    resposta = await fetch(enderecoDaFuncao(NOME_DA_FUNCAO), {
      method: 'POST',
      headers: { ...cabecalhosDaFuncao(token), Accept: 'text/event-stream' },
      body: JSON.stringify(pedido),
      signal: sinal,
    });
  } catch (e) {
    if (sinal?.aborted) throw new ErroDoCopiloto('cancelado', 'resposta cancelada');
    throw new ErroDoCopiloto('rede', e instanceof Error ? e.message : 'não deu para chamar o copiloto');
  }
  if (!resposta.ok) throw await erroDaResposta(resposta);
  if (!resposta.body) throw new ErroDoCopiloto('fluxo', 'o copiloto respondeu sem corpo');

  const leitor = resposta.body.getReader();
  const decodificador = new TextDecoder();
  const sse = criarLeitorDeSse(({ nome, dados }) => {
    const evento = lerEvento(nome, dados);
    if (evento) aoEvento(evento);
  });
  let lidoAteOFim = false;
  try {
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      sse.alimentar(decodificador.decode(value, { stream: true }));
    }
    lidoAteOFim = true;
    sse.alimentar(decodificador.decode());
    sse.terminar();
  } catch (e) {
    if (sinal?.aborted) throw new ErroDoCopiloto('cancelado', 'resposta cancelada');
    if (e instanceof ErroDoCopiloto) throw e;
    throw new ErroDoCopiloto('fluxo', e instanceof Error ? e.message : 'a resposta parou no meio');
  } finally {
    // Parou antes do fim (evento ilegível, callback que falhou): fecha a conexão em vez de deixá-la aberta até o servidor terminar.
    if (!lidoAteOFim) void leitor.cancel().catch(() => undefined);
  }
}

/** Título e explicação de cada motivo, para o aviso na tela. */
export function explicarErro(erro: ErroDoCopiloto): { titulo: string; texto: string } {
  switch (erro.motivo) {
    case 'sem_login':
      return { titulo: 'Entre de novo', texto: 'Sua sessão de login expirou. O copiloto só responde a quem está logado.' };
    case 'sem_permissao':
      return {
        titulo: 'Sem acesso ao copiloto',
        texto: /outro gestor/i.test(erro.message)
          ? 'Esta conversa é de outro gestor: dá para ler, não para continuar. Abra uma conversa nova.'
          : 'Seu login não tem o papel bruna_gestor. Peça a um admin.',
      };
    case 'sem_chave':
      return {
        titulo: 'O copiloto precisa da chave da Anthropic',
        texto: 'O copiloto precisa da chave da Anthropic (ANTHROPIC_API_KEY) nos segredos do projeto Supabase; veja Configurações › Geral › Pendências.',
      };
    case 'chave_invalida':
      return {
        titulo: 'A Anthropic recusou a chave',
        texto: 'A chave que está nos segredos do projeto Supabase (ANTHROPIC_API_KEY) foi recusada pela API da Anthropic: troque o segredo por uma chave válida.',
      };
    case 'desligado':
      return { titulo: 'Copiloto desligado', texto: 'O copiloto está desligado nas configurações do gerenciador. Ligue em Configurações › Geral.' };
    case 'pedido_invalido':
      return { titulo: 'O copiloto recusou o pedido', texto: erro.message };
    case 'indisponivel':
      return { titulo: 'O copiloto não respondeu', texto: erro.message };
    case 'rede':
      return { titulo: 'Sem conexão com o copiloto', texto: erro.message };
    case 'cancelado':
      return { titulo: 'Resposta cancelada', texto: 'Você interrompeu a resposta.' };
    case 'fluxo':
    default:
      return { titulo: 'A resposta parou no meio', texto: erro.message };
  }
}
