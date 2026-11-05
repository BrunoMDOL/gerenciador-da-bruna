// Os cálculos puros da visão geral, fora dos arquivos de componente para que
// o fast refresh continue valendo e para que os testes os prendam direto.
import { numero } from '@/gerenciador/lib/formatos';
import type { Alerta, ErrosDoPeriodo, GravidadeAlerta, Metricas } from '@/gerenciador/lib/tipos';
import { ROTAS, rotaDeLeads } from './rotas';
import { humanizar, n, soma } from './util';

const ORDEM: Record<GravidadeAlerta, number> = { grave: 0, media: 1, leve: 2 };

export function gravidadeDe(a: Alerta): GravidadeAlerta {
  return a.gravidade in ORDEM ? a.gravidade : 'leve';
}

/** Os mais graves primeiro; dentro da mesma gravidade, a ordem da RPC. */
export function ordenarAlertas(lista: Alerta[]): Alerta[] {
  return lista
    .map((a, i) => ({ a, i }))
    .sort((x, y) => ORDEM[gravidadeDe(x.a)] - ORDEM[gravidadeDe(y.a)] || x.i - y.i)
    .map(({ a }) => a);
}

export interface LinhaDeErro {
  chave: string;
  rotulo: string;
  n: number;
  detalhe?: string;
  rota: string;
  /** Erro que não saiu ou revisão grave: o número vai em caneta. */
  caneta?: boolean;
}

/**
 * O que bruna_gestor_erros e bruna_gestor_metricas trazem, virado em linhas
 * contáveis, da mais frequente para a menos. Só entra o que a RPC trouxe; o
 * que está em zero não aparece.
 */
export function linhasDeErro(e: ErrosDoPeriodo, m?: Metricas | null): LinhaDeErro[] {
  const linhas: LinhaDeErro[] = [];

  for (const r of e.revisoes_por_tipo ?? []) {
    const graves = n(r.graves);
    linhas.push({
      chave: `revisao_${r.tipo}`,
      rotulo: `Revisão: ${humanizar(r.tipo)}`,
      n: n(r.total),
      detalhe: graves ? `${numero(graves)} grave${graves > 1 ? 's' : ''}` : 'da autochecagem',
      rota: rotaDeLeads({ filtro: 'com_revisao' }),
      caneta: graves > 0,
    });
  }

  const chamadosComErro = m ? n(m.chamados_com_erro) : soma(e.chamados_por_assunto, 'com_erro');
  if (chamadosComErro) {
    const assuntos = (e.chamados_por_assunto ?? []).filter((c) => n(c.com_erro) > 0).map((c) => `${humanizar(c.assunto)} (${numero(n(c.com_erro))})`);
    linhas.push({ chave: 'chamados', rotulo: 'Chamados ao atendente que não saíram', n: chamadosComErro, detalhe: assuntos.join(', ') || undefined, rota: rotaDeLeads({ filtro: 'com_chamado' }), caneta: true });
  }

  const encaminhamentosComErro = m ? n(m.encaminhamentos_com_erro) : (e.encaminhamentos_com_erro ?? []).length;
  if (encaminhamentosComErro) {
    const destinos = Array.from(new Set((e.encaminhamentos_com_erro ?? []).map((x) => x.destino).filter(Boolean))).slice(0, 3);
    linhas.push({ chave: 'encaminhamentos', rotulo: 'Encaminhamentos ao representante que não saíram', n: encaminhamentosComErro, detalhe: destinos.length ? `para ${destinos.join(', ')}` : undefined, rota: ROTAS.leads, caneta: true });
  }

  const duvidas = e.duvidas_sem_acerto ?? [];
  const duvidasSemAcerto = m ? n(m.duvidas_sem_acerto) : soma(duvidas, 'vezes');
  if (duvidasSemAcerto) {
    linhas.push({ chave: 'duvidas', rotulo: 'Perguntas que a base não respondeu', n: duvidasSemAcerto, detalhe: duvidas[0]?.pergunta ? `“${duvidas[0].pergunta}”` : undefined, rota: ROTAS.configBase });
  }

  // Só 'bloqueado' é erro: a agenda respondeu e o horário não estava livre. 'nao_verificado'
  // e 'nao_corta' passam pelo guarda (docs/bruna/guarda-de-horario.mjs) e não entram aqui.
  const bloqueados = n((e.horarios_suspeitos ?? []).find((h) => h.veredito === 'bloqueado')?.n);
  if (bloqueados) {
    linhas.push({ chave: 'horarios', rotulo: 'Horários barrados pelo guarda da agenda', n: bloqueados, detalhe: 'a frase foi cortada antes de sair', rota: ROTAS.leads });
  }

  const descartados = soma(e.templates_descartados, 'descartados');
  if (descartados) {
    const pior = [...(e.templates_descartados ?? [])].sort((a, b) => n(b.descartados) - n(a.descartados))[0];
    linhas.push({ chave: 'descartes', rotulo: 'Templates descartados pela Meta', n: descartados, detalhe: pior ? `${pior.template}: ${numero(n(pior.descartados))} de ${numero(n(pior.registrados))}` : undefined, rota: ROTAS.regua });
  }

  return linhas.sort((a, b) => b.n - a.n);
}

/** As três perguntas prontas do atalho para o copiloto. */
export const PERGUNTAS_SUGERIDAS = [
  'O que a Bruna mais errou esta semana?',
  'Quais leads agendados estão sem confirmação?',
  'Resuma os chamados com erro',
] as const;
