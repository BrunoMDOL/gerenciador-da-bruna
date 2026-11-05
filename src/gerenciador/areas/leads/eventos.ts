// Como cada evento de bruna_gestor_lead_timeline aparece na tela. A RPC devolve
// códigos ("Revisão (grave): info_errada", "Contato criado no funil sp") e, na
// auditoria, a ação crua ("tag_add por pablo") com o JSON em texto no detalhe.
// Aqui viram título e detalhe em português, e saem os eventos que só repetem
// outro que já está na lista.
import { dataHora, instante, nomeDaRegiao } from '@/gerenciador/lib/formatos';
import type { EventoDaLinhaDoTempo, TipoEvento } from '@/gerenciador/lib/tipos';
import {
  ACAO_DE_AUDITORIA, AGENDADO_POR, ASSUNTO_DO_CHAMADO, ESCOLHA_DE_ATENDIMENTO, MOTIVO_DO_PROGRAMADO_CANCELADO, STATUS_DO_ENVIO,
  VEREDITO_DO_HORARIO, campoTexto, nomeDaEtapaDaEscada, nomeDaGravidade, nomeDaObjecao, nomeDoTipoDeRevisao,
} from './textos';

export interface EventoNaTela extends EventoDaLinhaDoTempo {
  /** Quem fez no gerenciador, quando a auditoria que repetia este evento saiu da lista. */
  autor: string | null;
}

/** A auditoria e o evento que ela repete são gravados juntos: segundos de diferença, no máximo. */
const JANELA_DO_PAR_MS = 2 * 60_000;

/** As ações do gerenciador que já aparecem como evento próprio na linha do tempo. */
const EVENTO_DA_ACAO: Partial<Record<string, TipoEvento>> = {
  gestor_revisao_criada: 'revisao',
  gestor_retorno_cancelado: 'retorno_cancelado',
  gestor_instrucao_criada: 'instrucao',
};

type Detalhes = Record<string, unknown>;

/** audit_logs.action de um evento de auditoria; nulo nos outros tipos. */
export function acaoDaAuditoria(e: EventoDaLinhaDoTempo): string | null {
  return e.tipo === 'auditoria' ? campoTexto(e.extra, 'action') : null;
}

function detalhesDaAuditoria(e: EventoDaLinhaDoTempo): Detalhes {
  const d = e.extra?.details;
  return d && typeof d === 'object' && !Array.isArray(d) ? (d as Detalhes) : {};
}

/** A RPC monta o título como action || ' por ' || e-mail sem o domínio: "tag_add por pablo" → "pablo". */
export function autorDaAuditoria(e: EventoDaLinhaDoTempo): string | null {
  const acao = acaoDaAuditoria(e);
  if (!acao) return null;
  const prefixo = `${acao} por `;
  return e.titulo.startsWith(prefixo) ? e.titulo.slice(prefixo.length).trim() || null : null;
}

/** Código desconhecido em texto legível: "gestor_algo_novo" → "Algo novo". */
function semCodigo(acao: string): string {
  const t = acao.replace(/^gestor_/, '').replace(/_/g, ' ').trim();
  return t ? t[0].toUpperCase() + t.slice(1) : 'Ação no painel';
}

function tituloDaAcao(acao: string, d: Detalhes): string {
  if (acao === 'bruna_toggle') {
    const para = campoTexto(d, 'to');
    if (para === 'on') return 'Bruna ligada';
    if (para === 'off') return 'Bruna desligada';
  }
  if (acao === 'mark_replied' && d.to === false) return 'Marcado como não respondido';
  return ACAO_DE_AUDITORIA[acao] ?? semCodigo(acao);
}

/** contatos.agendado_por decide de quem é a visita: "da Bruna" ou "do atendente". */
const deQuem = (lado: unknown) => {
  const por = campoTexto(lado, 'agendado_por');
  return por === 'bruna' ? 'da Bruna' : por === 'humano' ? 'do atendente' : null;
};

const deParaRegiao = (d: Detalhes) => {
  const de = campoTexto(d, 'from');
  const para = campoTexto(d, 'to');
  return de && para ? `${nomeDaRegiao(de)} → ${nomeDaRegiao(para)}` : null;
};

/** O detalhe legível de cada ação, tirado do JSON que a RPC devolve em extra.details. Nunca o JSON. */
function detalheDaAcao(acao: string, d: Detalhes): string | null {
  switch (acao) {
    case 'bruna_toggle': case 'mark_replied': case 'agendamento_clear':
    case 'gestor_bruna_ligada': case 'gestor_bruna_desligada': case 'gestor_revisao_verificada': case 'gestor_copiloto_pergunta':
      return null;
    case 'tag_add': case 'tag_remove':
      return campoTexto(d, 'tag_name');
    case 'tag_add_bloqueado': case 'tag_origem_corrigida':
    case 'gestor_revisao_cancelada': case 'gestor_retorno_cancelado':
      return campoTexto(d, 'motivo');
    case 'stage_assign': case 'stage_unassign':
      return campoTexto(d, 'stage_name');
    case 'region_change':
      return deParaRegiao(d);
    case 'escolha_atendimento': {
      const escolha = campoTexto(d, 'escolha');
      const avisado = campoTexto(d, 'avisado_para');
      return [escolha ? ESCOLHA_DE_ATENDIMENTO[escolha] ?? escolha : null, deParaRegiao(d), avisado ? `avisado: ${avisado}` : null].filter(Boolean).join(' · ') || null;
    }
    case 'agendamento_set': {
      const para = deQuem(d.to);
      return campoTexto(d, 'motivo') ?? (para ? `conta como ${para}` : null);
    }
    case 'agendamento_change': {
      const motivo = campoTexto(d, 'motivo');
      if (motivo) return motivo;
      const de = deQuem(d.from);
      const para = deQuem(d.to);
      return de && para && de !== para ? `era ${de}, passou a ser ${para}` : null;
    }
    case 'movido_nao_contatar': {
      const origem = campoTexto(d, 'origem');
      return origem?.startsWith('trigger') ? 'automático, por tag' : origem;
    }
    case 'followup_programado': {
      const template = campoTexto(d, 'template');
      const para = campoTexto(d, 'agendado_para');
      return [template, para ? `para ${dataHora(para)}` : null].filter(Boolean).join(' ') || null;
    }
    case 'followup_programado_cancelado': {
      const motivo = campoTexto(d, 'motivo');
      return motivo ? MOTIVO_DO_PROGRAMADO_CANCELADO[motivo] ?? motivo.replace(/_/g, ' ') : null;
    }
    case 'correcao_manual':
      return campoTexto(d, 'o_que');
    case 'playbook_quebra_usada':
      return campoTexto(d, 'situacao');
    case 'gestor_revisao_criada':
      return campoTexto(d, 'erro');
    default:
      // gestor_instrucao_*, sugestões, playbook e o que vier de novo: o primeiro campo de texto que diga algo.
      for (const chave of ['titulo', 'preview', 'tag_name', 'stage_name', 'motivo', 'situacao']) {
        const v = campoTexto(d, chave);
        if (v) return v;
      }
      return null;
  }
}

/** Título e detalhe de um evento de auditoria, em português e sem o JSON. */
export function lerAuditoria(e: EventoDaLinhaDoTempo): { titulo: string; detalhe: string | null } {
  const acao = acaoDaAuditoria(e) ?? '';
  const d = detalhesDaAuditoria(e);
  const autor = autorDaAuditoria(e);
  const titulo = tituloDaAcao(acao, d);
  return { titulo: autor ? `${titulo} por ${autor}` : titulo, detalhe: detalheDaAcao(acao, d) };
}

/** O título de qualquer evento, sem os códigos que a RPC devolve. */
export function tituloDoEvento(e: EventoDaLinhaDoTempo): string {
  const t = e.titulo ?? '';
  let m: RegExpExecArray | null;
  switch (e.tipo) {
    case 'auditoria':
      return lerAuditoria(e).titulo;
    case 'revisao':
      m = /^Revisão \(([^)]*)\): (.+)$/.exec(t);
      return m ? `Revisão ${nomeDaGravidade(m[1])}: ${nomeDoTipoDeRevisao(m[2])}` : t;
    case 'objecao':
      m = /^Objeção registrada: (.+)$/.exec(t);
      return m ? `Objeção registrada: ${nomeDaObjecao(m[1])}` : t;
    case 'horario_suspeito':
      m = /^Horário conferido: (.+)$/.exec(t);
      return m ? `Horário conferido: ${VEREDITO_DO_HORARIO[m[1]] ?? m[1].replace(/_/g, ' ')}` : t;
    case 'instrucao':
      return t.replace(/^Instrução do gestor: /, 'Orientação do gestor: ');
    case 'agendamento':
      return t.replace(/ \((bruna|humano|\?)\)$/, (_, quem: string) => (AGENDADO_POR[quem] ? ` ${AGENDADO_POR[quem]}` : ''));
    case 'retorno_cancelado':
      // bruna_gestor_retorno_cancelar grava o motivo como "gestor: <motivo>".
      m = /^Retorno cancelado: gestor: (.*)$/.exec(t);
      if (!m) return t;
      return m[1] === 'cancelado no gerenciador' ? 'Retorno cancelado no gerenciador' : `Retorno cancelado no gerenciador: ${m[1]}`;
    case 'criado':
      m = /^Contato criado no funil (.+)$/.exec(t);
      return m ? `Lead criado no funil ${nomeDaRegiao(m[1])}` : t;
    case 'fup90':
      // "FUP90 toque 3 (falha_perm): fup90_v2_10_calculadora"; sem template, a RPC deixa o ": " no fim.
      m = /^FUP90 toque (\d+) \(([^)]+)\): ?(.*)$/.exec(t);
      return m ? `FUP90 toque ${m[1]} (${STATUS_DO_ENVIO[m[2]] ?? m[2].replace(/_/g, ' ')})${m[3] ? `: ${m[3]}` : ''}` : t;
    case 'chamado': case 'chamado_erro':
      m = /^(Chamou .+): ([a-z_]+)( \(não saiu\))?$/.exec(t);
      return m ? `${m[1]}: ${ASSUNTO_DO_CHAMADO[m[2]] ?? m[2].replace(/_/g, ' ')}${m[3] ?? ''}` : t;
    case 'toque': case 'toque_pulado':
      m = /^Escada \(([^)]+)\): (.+)$/.exec(t);
      return m ? `Escada (${nomeDaEtapaDaEscada(m[1])}): ${m[2]}` : t;
    default:
      return t;
  }
}

/** O detalhe de qualquer evento; na auditoria, o texto tirado do JSON. */
export function detalheDoEvento(e: EventoDaLinhaDoTempo): string | null {
  if (e.tipo === 'auditoria') return lerAuditoria(e).detalhe;
  return e.detalhe ? e.detalhe : null;
}

function perto(a: EventoDaLinhaDoTempo, b: EventoDaLinhaDoTempo): boolean {
  const ta = instante(a.quando)?.getTime();
  const tb = instante(b.quando)?.getTime();
  return ta != null && tb != null && Math.abs(ta - tb) <= JANELA_DO_PAR_MS;
}

/**
 * O que a linha do tempo mostra, na ordem da RPC. Ficam de fora:
 * - message_sent: a mensagem já está na conversa, ao lado;
 * - bruna_toggle gravado pelo gatilho de contatos junto com o gestor_bruna_*
 *   do gerenciador (o mesmo liga/desliga, duas vezes);
 * - a auditoria do gerenciador que repete um evento próprio (revisão gravada,
 *   retorno cancelado, orientação criada): fica o evento, com o autor.
 */
export function eventosParaMostrar(lista: EventoDaLinhaDoTempo[]): EventoNaTela[] {
  const fora = new Set<number>();
  const autores = new Map<number, string | null>();

  lista.forEach((e, i) => {
    const acao = acaoDaAuditoria(e);
    if (!acao) return;
    if (acao === 'message_sent') {
      fora.add(i);
      return;
    }
    if (acao === 'bruna_toggle') {
      const para = campoTexto(detalhesDaAuditoria(e), 'to');
      const doGerenciador = para === 'on' ? 'gestor_bruna_ligada' : para === 'off' ? 'gestor_bruna_desligada' : null;
      if (doGerenciador && lista.some((o) => acaoDaAuditoria(o) === doGerenciador && perto(o, e))) fora.add(i);
      return;
    }
    const tipo = EVENTO_DA_ACAO[acao];
    if (!tipo) return;
    const titulo = campoTexto(detalhesDaAuditoria(e), 'titulo');
    const j = lista.findIndex((o, k) => (
      o.tipo === tipo && !autores.has(k) && perto(o, e)
      && (tipo !== 'instrucao' || !titulo || o.titulo.endsWith(`: ${titulo}`))
    ));
    if (j < 0) return;
    fora.add(i);
    autores.set(j, autorDaAuditoria(e));
  });

  return lista.flatMap((e, i) => (fora.has(i) ? [] : [{ ...e, autor: autores.get(i) ?? null }]));
}
