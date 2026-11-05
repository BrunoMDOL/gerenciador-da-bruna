// Codificador de Server-Sent Events do copiloto (bruna-copiloto).
//
// Cada evento sai como "event: <nome>\ndata: <json numa linha>\n\n". O JSON
// fica numa linha porque JSON.stringify escapa quebras de linha. O canal é um
// ReadableStream com controller: a função enfileira eventos antes mesmo de
// devolver a Response (ficam no buffer) e fecha no fim do turno. O ping de
// manutenção só começa depois do primeiro evento: antes dele a Response ainda
// não saiu, e o protocolo pede `sessao` como primeiro evento.
//
// Módulo puro: sem Deno, sem npm. É testado pelo vitest em
// src/gerenciador/areas/copiloto/funcao.test.ts.

export type NomeDoEvento =
  | 'sessao'
  | 'usuario'
  | 'texto'
  | 'ferramenta'
  | 'sugestao'
  | 'fim'
  | 'erro'
  // Fora do protocolo da interface: só mantém a conexão viva enquanto o
  // modelo pensa (data: {"t": segundos}). Um leitor que ignora eventos
  // desconhecidos não precisa saber dele.
  | 'ping';

const codificador = new TextEncoder();

/** "event: nome\ndata: {...}\n\n" com o JSON numa linha só. */
export function formatarEvento(nome: NomeDoEvento, dados: unknown): string {
  return `event: ${nome}\ndata: ${JSON.stringify(dados ?? {})}\n\n`;
}

export function codificarEvento(nome: NomeDoEvento, dados: unknown): Uint8Array {
  return codificador.encode(formatarEvento(nome, dados));
}

export interface CanalSse {
  /** O corpo da Response (text/event-stream). */
  readonly stream: ReadableStream<Uint8Array>;
  /** true depois de fechar() ou de o cliente desconectar. */
  readonly fechado: boolean;
  /** Enfileira um evento. Devolve false quando o canal já fechou. */
  emitir(nome: NomeDoEvento, dados: unknown): boolean;
  /** Encerra o stream (idempotente). */
  fechar(): void;
}

export interface OpcoesDoCanal {
  /** Intervalo do ping de manutenção (só depois do primeiro evento); 0 (padrão) desliga. */
  pingMs?: number;
}

export function criarCanalSse(opcoes: OpcoesDoCanal = {}): CanalSse {
  const pingMs = opcoes.pingMs ?? 0;
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  let fechado = false;
  let jaEmitiu = false;
  let ultimoEnvio = Date.now();
  let timer: ReturnType<typeof setInterval> | null = null;

  const pararPing = () => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  const emitir = (nome: NomeDoEvento, dados: unknown): boolean => {
    if (fechado || !controller) return false;
    try {
      controller.enqueue(codificarEvento(nome, dados));
      ultimoEnvio = Date.now();
      jaEmitiu = true;
      return true;
    } catch {
      // O cliente foi embora e o stream já não aceita nada.
      fechado = true;
      pararPing();
      return false;
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
      if (pingMs > 0) {
        timer = setInterval(() => {
          if (jaEmitiu && Date.now() - ultimoEnvio >= pingMs) emitir('ping', { t: Math.round(Date.now() / 1000) });
        }, Math.max(250, Math.floor(pingMs / 2)));
      }
    },
    cancel() {
      fechado = true;
      pararPing();
    },
  });

  const fechar = () => {
    pararPing();
    if (fechado) return;
    fechado = true;
    try {
      controller?.close();
    } catch {
      // já estava fechado pelo outro lado
    }
  };

  return {
    stream,
    get fechado() {
      return fechado;
    },
    emitir,
    fechar,
  };
}
