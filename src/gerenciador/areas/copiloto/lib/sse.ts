/** Um evento do fluxo text/event-stream: o nome (linha "event:") e o dado (linhas "data:" juntas por "\n"). */
export interface EventoSse {
  nome: string;
  dados: string;
}

/**
 * Lê um fluxo SSE aos pedaços. Cada chamada a `alimentar` pode trazer meio
 * evento, meia linha ou vários eventos de uma vez; os completos saem pelo
 * callback na ordem em que chegaram. `terminar` descarrega o que sobrou
 * quando o servidor fecha sem a linha vazia final.
 *
 * Segue a gramática do padrão: campos "event" e "data", comentários (":")
 * ignorados, "\r\n" aceito como quebra, um espaço opcional depois dos dois
 * pontos. Evento sem "data" não é despachado.
 */
export function criarLeitorDeSse(aoEvento: (evento: EventoSse) => void) {
  let sobra = '';
  let nome = '';
  let dados: string[] = [];

  const despachar = () => {
    if (dados.length > 0) aoEvento({ nome: nome || 'message', dados: dados.join('\n') });
    nome = '';
    dados = [];
  };

  const lerLinha = (linha: string) => {
    if (linha === '') {
      despachar();
      return;
    }
    if (linha.startsWith(':')) return;
    const dois = linha.indexOf(':');
    const campo = dois === -1 ? linha : linha.slice(0, dois);
    let valor = dois === -1 ? '' : linha.slice(dois + 1);
    if (valor.startsWith(' ')) valor = valor.slice(1);
    if (campo === 'event') nome = valor;
    else if (campo === 'data') dados.push(valor);
  };

  return {
    alimentar(pedaco: string) {
      sobra += pedaco;
      let fim = sobra.indexOf('\n');
      while (fim !== -1) {
        let linha = sobra.slice(0, fim);
        sobra = sobra.slice(fim + 1);
        if (linha.endsWith('\r')) linha = linha.slice(0, -1);
        lerLinha(linha);
        fim = sobra.indexOf('\n');
      }
    },
    terminar() {
      if (sobra !== '') {
        let linha = sobra;
        sobra = '';
        if (linha.endsWith('\r')) linha = linha.slice(0, -1);
        lerLinha(linha);
      }
      despachar();
    },
  };
}
