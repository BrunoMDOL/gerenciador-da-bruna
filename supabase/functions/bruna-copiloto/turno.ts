// Peças puras do turno do copiloto (bruna-copiloto): a saída de texto do
// fluxo SSE e os avisos de fim de turno. Ficam fora do index.ts para o vitest
// testar (src/gerenciador/areas/copiloto/funcao.test.ts).
//
// Módulo puro: sem Deno, sem npm.

/**
 * A saída de texto do turno. Cuida de três coisas em todas as rodadas:
 *   - segura os deltas até abrir(): a primeira rodada começa antes de a
 *     mensagem do gestor ser gravada (ela só é gravada depois que a API
 *     aceitou o pedido), e o protocolo exige `sessao` e `usuario` antes de
 *     qualquer texto;
 *   - separa por uma linha em branco cada bloco de texto que começa depois de
 *     já ter saído texto, na mesma resposta ou na rodada seguinte; é como
 *     textoDosBlocos junta os mesmos blocos na coluna `texto`, então o que se
 *     vê ao vivo é o que se vê depois de recarregar;
 *   - emite os avisos da função (corte, recusa, tempo) como parágrafo à parte.
 * O separador sai como delta próprio ("\n\n"): a interface descarta um delta
 * só de espaço quando ele abriria um balão novo.
 */
export interface SaidaDeTexto {
  /** Um bloco de texto começou (content_block_start do tipo text). */
  novoBloco(): void;
  /** Um pedaço de texto do modelo. */
  delta(texto: string): void;
  /** Um aviso da função, como parágrafo à parte. */
  aviso(texto: string): void;
  /** Solta o que ficou retido, na ordem, e passa a emitir direto. */
  abrir(): void;
  readonly aberta: boolean;
  readonly emitiuTexto: boolean;
}

export function criarSaidaDeTexto(emitir: (delta: string) => void): SaidaDeTexto {
  let retidos: string[] | null = [];
  let emitiu = false;
  let blocoNovo = false;
  const enviar = (d: string) => {
    if (retidos) retidos.push(d);
    else emitir(d);
  };
  return {
    novoBloco() {
      blocoNovo = true;
    },
    delta(texto: string) {
      if (!texto) return;
      if (blocoNovo && emitiu) enviar('\n\n');
      blocoNovo = false;
      emitiu = true;
      enviar(texto);
    },
    aviso(texto: string) {
      const t = texto.trim();
      if (!t) return;
      if (emitiu) enviar('\n\n');
      blocoNovo = false;
      emitiu = true;
      enviar(t);
    },
    abrir() {
      const pendentes = retidos ?? [];
      retidos = null;
      for (const d of pendentes) emitir(d);
    },
    get aberta() {
      return retidos === null;
    },
    get emitiuTexto() {
      return emitiu;
    },
  };
}

/** Como a rodada terminou, para decidir o aviso e o motivo de não rodar as ferramentas. */
export interface FimDaRodada {
  stopReason: string | null;
  /** stop_reason tool_use com pelo menos um tool_use na resposta. */
  querTools: boolean;
  /** As ferramentas vão rodar e o turno segue para outra rodada. */
  continua: boolean;
  rodada: number;
  maxRodadas: number;
  maxTokens: number;
}

/** O aviso que a função acrescenta quando o turno para antes da hora; null quando terminou normal. */
export function avisoDoFim(f: FimDaRodada): string | null {
  if (f.stopReason === 'refusal') return 'Não consigo ajudar com isso.';
  if (f.stopReason === 'max_tokens') return `(A resposta foi cortada no limite de ${f.maxTokens} tokens. Peça para eu continuar.)`;
  if (f.stopReason === 'model_context_window_exceeded') return '(A conversa ficou longa demais para o modelo. Abra uma sessão nova.)';
  if (f.querTools && !f.continua) {
    const onde = f.rodada >= f.maxRodadas ? `no limite de ${f.maxRodadas} rodadas de ferramentas` : 'por tempo';
    return `(Parei ${onde} neste turno. Peça para eu continuar.)`;
  }
  return null;
}

/** O aviso da rodada cortada no prazo do turno. */
export function avisoDoPrazo(prazoMs: number): string {
  return `(Parei por tempo: o turno chegou ao limite de ${Math.round(prazoMs / 1000)} s da função. Peça para eu continuar.)`;
}

/** Por que os tool_use da rodada não foram executados (vai no tool_result sintético). */
export function motivoDaNaoExecucao(f: FimDaRodada): string {
  if (f.stopReason === 'refusal') return 'a resposta foi recusada';
  if (f.stopReason === 'max_tokens') return 'a resposta foi cortada no limite de tokens';
  if (f.stopReason === 'model_context_window_exceeded') return 'a conversa passou do limite de contexto do modelo';
  if (f.stopReason !== 'tool_use') return `a resposta terminou (${f.stopReason ?? 'sem motivo'}) sem esperar a ferramenta`;
  if (f.rodada >= f.maxRodadas) return `limite de ${f.maxRodadas} rodadas por turno`;
  return 'tempo do turno esgotado';
}

/** A coluna `texto` da linha do assistente: o texto da resposta e o aviso da função, se houver. */
export function textoDaLinha(texto: string | null | undefined, aviso: string | null | undefined): string | null {
  const partes = [texto, aviso].map((p) => (typeof p === 'string' ? p.trim() : '')).filter(Boolean);
  return partes.length ? partes.join('\n\n') : null;
}

/**
 * Da resposta cortada no meio (o snapshot do stream abortado), só os blocos
 * de texto que já chegaram. Pensamento (sem assinatura completa) e tool_use
 * pela metade ficam fora: o histórico continua válido sem tool_result.
 */
export function blocosDeTextoDaParcial(content: unknown): Array<{ type: 'text'; text: string }> {
  if (!Array.isArray(content)) return [];
  const saida: Array<{ type: 'text'; text: string }> = [];
  for (const b of content) {
    if (!b || typeof b !== 'object') continue;
    const bloco = b as { type?: unknown; text?: unknown };
    if (bloco.type !== 'text' || typeof bloco.text !== 'string') continue;
    const text = bloco.text.trimEnd();
    if (text.trim()) saida.push({ type: 'text', text });
  }
  return saida;
}
