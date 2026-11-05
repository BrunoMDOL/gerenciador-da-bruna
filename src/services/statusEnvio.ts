/**
 * O veredito de entrega: o que de fato aconteceu com uma mensagem que saiu.
 *
 * "Template enviado com sucesso" sempre foi meia verdade: significa que a Meta
 * aceitou a chamada, não que a mensagem saiu. Foi essa diferença que escondeu
 * 6.015 mensagens que nunca chegaram ao cliente.
 *
 * O veredito real vem segundos depois, pelo webhook de status. Este módulo é o
 * único lugar que o julga: o balão da conversa recebe o veredito pronto, e o
 * motivo da Meta é traduzido num dicionário só. É o recorte do
 * src/services/statusEnvio.ts do Besser Talk que a leitura da conversa usa.
 */

import { supabase } from '@/integrations/supabase/client';

export type ResultadoStatus = 'entregue' | 'lido' | 'saiu' | 'falhou' | 'sem_retorno';

export interface ResultadoEnvio {
  status: ResultadoStatus;
  erroCodigo?: number | null;
  erroTitulo?: string | null;
  /** Explicação longa da Meta, quando veio. Serve de motivo para código sem tradução. */
  erroDetalhe?: string | null;
}

/** Uma linha de `mensagens_status`, com o que o veredito precisa ler. */
export interface LinhaStatus {
  status: string;
  error_code: number | null;
  error_title: string | null;
  error_details?: string | null;
  delivered_at: string | null;
  read_at: string | null;
}

// `.in()` vira query string: lote grande demais estoura o tamanho da URL.
const TAMANHO_LOTE = 150;

/**
 * O veredito vem dos carimbos, não só do campo `status`.
 *
 * A Meta às vezes manda um `failed` (erro 131026, com o mesmo horário do envio)
 * para mensagens que ela própria confirmou como entregues — em 14 dos 962
 * descartes registrados até 20/08, e em 11 deles o cliente chegou a abrir e ler.
 * Como `failed` tem o posto mais alto na gravação, o `status` trava em 'failed'
 * e o aviso na tela passaria a dizer "não entregue" para mensagem lida. Quem
 * tem `delivered_at`/`read_at` chegou ao aparelho: esse evento a Meta não emite
 * por engano, então ele ganha do `failed`.
 */
export function vereditoDe(linha: LinhaStatus): ResultadoEnvio {
  if (linha.read_at) return { status: 'lido' };
  if (linha.delivered_at) return { status: 'entregue' };
  if (linha.status === 'failed') {
    return {
      status: 'falhou',
      erroCodigo: linha.error_code,
      erroTitulo: linha.error_title,
      erroDetalhe: linha.error_details ?? null,
    };
  }
  if (linha.status === 'read') return { status: 'lido' };
  if (linha.status === 'delivered') return { status: 'entregue' };
  return { status: 'saiu' };
}

/**
 * O veredito de cada wamid que já tem status gravado. Quem ainda não tem fica
 * fora do mapa: ausência é "sem confirmação", não falha.
 *
 * Consulta em lotes porque `.in()` vira query string. Um lote que falha não
 * derruba os outros: status é informação extra, a conversa continua legível.
 */
export async function buscarVereditos(wamids: string[]): Promise<Map<string, ResultadoEnvio>> {
  const encontrados = new Map<string, ResultadoEnvio>();

  for (let i = 0; i < wamids.length; i += TAMANHO_LOTE) {
    const fatia = wamids.slice(i, i + TAMANHO_LOTE);
    const { data, error } = await supabase
      .from('mensagens_status')
      .select('wamid, status, error_code, error_title, error_details, delivered_at, read_at')
      .in('wamid', fatia);

    if (error) {
      console.error('[StatusEnvio] erro ao consultar:', error);
      continue;
    }
    for (const linha of data || []) {
      encontrados.set(linha.wamid, vereditoDe(linha));
    }
  }
  return encontrados;
}

/**
 * O título que a Meta manda é uma frase longa em inglês ("This message was not
 * delivered to maintain healthy ecosystem engagement."). Na tela cabe o que o
 * operador precisa decidir.
 */
const MOTIVO_CURTO: Record<number, string> = {
  130472: 'Número em experimento da Meta',
  131026: 'Número não recebe a mensagem',
  131042: 'Cobrança/elegibilidade da conta',
  131047: 'Janela de 24h fechada',
  131049: 'Limite de marketing da Meta',
  131050: 'Cliente saiu do marketing',
  132001: 'Template não existe ou sem acesso',
  132015: 'Template pausado pela Meta',
};

/** O motivo em português quando o código é conhecido; senão, o texto da Meta. */
export function motivoCurto(m: { codigo?: number | null; titulo?: string | null }): string {
  if (m.codigo && MOTIVO_CURTO[m.codigo]) return MOTIVO_CURTO[m.codigo];
  return m.titulo ?? 'motivo não informado';
}
