import { describe, it, expect } from 'vitest';
import { criarLeitorDeSse, type EventoSse } from './lib/sse';

function ler(pedacos: string[]): EventoSse[] {
  const eventos: EventoSse[] = [];
  const leitor = criarLeitorDeSse((e) => eventos.push(e));
  for (const p of pedacos) leitor.alimentar(p);
  leitor.terminar();
  return eventos;
}

describe('leitor de SSE do copiloto', () => {
  it('lê eventos inteiros na ordem', () => {
    expect(ler(['event: sessao\ndata: {"id":7,"titulo":null,"contato_id":26634}\n\nevent: texto\ndata: {"delta":"Oi"}\n\n'])).toEqual([
      { nome: 'sessao', dados: '{"id":7,"titulo":null,"contato_id":26634}' },
      { nome: 'texto', dados: '{"delta":"Oi"}' },
    ]);
  });

  it('junta pedaços cortados no meio de uma linha e no meio de um evento', () => {
    const texto = 'event: texto\ndata: {"delta":"Olhei a conversa, gestor"}\n\nevent: fim\ndata: {"mensagem_id":205,"tokens_entrada":9120,"tokens_saida":410,"modelo":"claude-opus-5-5"}\n\n';
    const pedacos: string[] = [];
    for (let i = 0; i < texto.length; i += 5) pedacos.push(texto.slice(i, i + 5));
    expect(ler(pedacos)).toEqual([
      { nome: 'texto', dados: '{"delta":"Olhei a conversa, gestor"}' },
      { nome: 'fim', dados: '{"mensagem_id":205,"tokens_entrada":9120,"tokens_saida":410,"modelo":"claude-opus-5-5"}' },
    ]);
  });

  it('aceita \\r\\n, ignora comentários e junta data em várias linhas', () => {
    expect(ler([': keep-alive\r\nevent: texto\r\ndata: {"a":\r\ndata: 1}\r\n\r\n'])).toEqual([
      { nome: 'texto', dados: '{"a":\n1}' },
    ]);
  });

  it('despacha o último evento mesmo sem a linha vazia final', () => {
    expect(ler(['event: erro\ndata: {"mensagem":"a API não respondeu"}'])).toEqual([
      { nome: 'erro', dados: '{"mensagem":"a API não respondeu"}' },
    ]);
  });

  it('não despacha evento sem data e chama de "message" o que vem sem nome', () => {
    expect(ler(['event: sessao\n\ndata: {"solto":true}\n\n'])).toEqual([{ nome: 'message', dados: '{"solto":true}' }]);
  });

  it('aceita "data:" colado, sem o espaço', () => {
    expect(ler(['event:texto\ndata:{"delta":"x"}\n\n'])).toEqual([{ nome: 'texto', dados: '{"delta":"x"}' }]);
  });
});
