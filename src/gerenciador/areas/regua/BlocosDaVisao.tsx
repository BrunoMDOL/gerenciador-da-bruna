import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { Erro, Esqueleto, Medida, Painel, Pilula } from '@/gerenciador/componentes';
import { nomeDaRegiao, numero, pct } from '@/gerenciador/lib/formatos';
import type { CampanhaFup90, ResumoDaRegua } from '@/gerenciador/lib/tipos';
import { cn } from '@/lib/utils';
import { contarRetornos, useProgramadosPendentes, useRetornosPendentes } from './dados';
import { useEtapas } from './dadosDoFup90';
import { LINK, NOTA, NUM, ROTULO } from './estilos';
import { LinhaDe90Dias } from './LinhaDe90Dias';
import { somaDoMapa } from './regrasDaEscada';
import { ROTAS } from './rotas';
import { motivoDoCancelamento, siglaDaPraca, STATUS_DA_INSCRICAO, STATUS_DO_PROGRAMADO } from './textos';

function Abrir({ para, children }: { para: string; children: ReactNode }) {
  return (
    <Link to={para} className={cn(LINK, 'inline-flex min-h-[40px] items-center gap-1 text-[13px] text-croqui-soft hover:text-foreground')}>
      {children}
      <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
    </Link>
  );
}

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Retornos prometidos: o que espera, o que atrasou e o que saiu ou caiu no período. */
export function BlocoDosRetornos({ retornos, pausados }: { retornos: ResumoDaRegua['retornos']; pausados: boolean }) {
  const navigate = useNavigate();
  const pendentes = useRetornosPendentes();
  const contagem = pendentes.data ? contarRetornos(pendentes.data.linhas) : null;
  const cancelados = Object.entries(retornos?.cancelados_por_motivo ?? {}).map(([m, q]) => [m, n(q)] as const).sort((a, b) => b[1] - a[1]);
  const totalCancelados = cancelados.reduce((s, [, q]) => s + q, 0);
  const porQuem = retornos?.por_quem_prometeu ?? {};
  const irParaRetornos = () => navigate(ROTAS.retornos);

  return (
    <Painel titulo="Retornos prometidos" acoes={<Abrir para={ROTAS.retornos}>ver todos</Abrir>}>
      <p className={cn(NOTA, 'mb-3')}>O que a Bruna ou o cliente combinou de retomar numa data.</p>
      {pausados && <p className="mb-3 text-[13px] font-medium text-croqui-red-text">Pausados pelo gestor: nenhum sai até retomar.</p>}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Medida rotulo="Pendentes" valor={numero(n(retornos?.pendentes))} nota="esperando a hora" onClick={irParaRetornos} />
        <Medida rotulo="Ainda hoje" valor={contagem ? numero(contagem.hoje) : '—'} nota="marcados até a meia-noite" onClick={irParaRetornos} />
        <Medida
          rotulo="Atrasados"
          valor={contagem ? numero(contagem.atrasados) : '—'}
          caneta={Boolean(contagem?.atrasados)}
          nota={contagem?.atrasados ? <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" aria-hidden /> a hora já passou</span> : 'a hora já passou'}
          onClick={irParaRetornos}
        />
        <Medida rotulo="Enviados" valor={numero(n(retornos?.enviados))} nota={`${numero(n(retornos?.respondeu_24h))} responderam em 24 h`} onClick={irParaRetornos} />
      </div>
      {pendentes.isError && <p className="mt-2 text-2xs text-croqui-soft">Não deu para contar os atrasados: {pendentes.error.message}</p>}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <p className={ROTULO}>Criados no período</p>
          <p className="mt-1 text-[13px] text-foreground">
            <span className={cn(NUM, 'font-semibold')}>{numero(n(retornos?.criados))}</span> · pela Bruna <span className={NUM}>{numero(n(porQuem.bruna))}</span> · pelo cliente <span className={NUM}>{numero(n(porQuem.cliente))}</span>
          </p>
          <p className={cn(NOTA, 'mt-2')}>
            Saem na hora combinada, entre 8 h e 20h59, com até 3 tentativas. Caem sozinhos quando o cliente responde antes, agenda, manda o
            material esperado ou sai do atendimento; promessa do cliente sem data vence sem cobrança.
          </p>
        </div>
        <div>
          <p className={ROTULO}>Cancelados no período · <span className={NUM}>{numero(totalCancelados)}</span></p>
          {cancelados.length === 0 ? (
            <p className="mt-1 text-[13px] text-croqui-soft">Nenhum.</p>
          ) : (
            <ul className="mt-1 space-y-0.5 text-[13px]">
              {cancelados.slice(0, 6).map(([m, q]) => (
                <li key={m} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-croqui-soft">{motivoDoCancelamento(m)}</span>
                  <span className={cn(NUM, 'text-foreground')}>{numero(q)}</span>
                </li>
              ))}
              {cancelados.length > 6 && <li className="text-2xs text-croqui-soft">e mais {cancelados.length - 6} motivos</li>}
            </ul>
          )}
        </div>
      </div>
    </Painel>
  );
}

/** Follow-ups programados pelos atendentes no painel de atendimento. */
export function BlocoDosProgramados({ programados }: { programados: ResumoDaRegua['programados'] }) {
  const pendentes = useProgramadosPendentes();
  const noPeriodo = Object.entries(programados ?? {}).map(([s, q]) => [s, n(q)] as const).sort((a, b) => b[1] - a[1]);
  return (
    <Painel titulo="Programados pelos atendentes">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <div>
          <p className={ROTULO}>Esperando a hora</p>
          <p className={cn(NUM, 'mt-1 text-[26px] font-semibold leading-none text-foreground')}>
            {pendentes.isPending ? '—' : pendentes.isError ? '—' : numero(pendentes.data)}
          </p>
        </div>
        <div className="min-w-0">
          <p className={ROTULO}>Com hora marcada no período</p>
          {noPeriodo.length === 0 ? (
            <p className="mt-1 text-[13px] text-croqui-soft">Nenhum.</p>
          ) : (
            <p className="mt-1 text-[13px] text-foreground">
              {noPeriodo.map(([s, q], i) => (
                <span key={s}>{i > 0 ? ' · ' : ''}<span className={cn(NUM, 'font-semibold')}>{numero(q)}</span> {STATUS_DO_PROGRAMADO[s] ?? s}</span>
              ))}
            </p>
          )}
        </div>
      </div>
      {pendentes.isError && <p className="mt-2 text-2xs text-croqui-soft">Não deu para contar os pendentes: {pendentes.error.message}</p>}
      <p className={cn(NOTA, 'mt-3')}>Templates que o atendente agendou na conversa do lead, no painel de atendimento. O programado cai sozinho quando o cliente responde antes da hora.</p>
    </Painel>
  );
}

/** A campanha FUP90: a linha de 90 dias, as inscrições e o que saiu por FUP no período. */
export function BlocoDoFup90({ campanha, fup90, inscricoes }: {
  campanha: CampanhaFup90 | null;
  fup90: ResumoDaRegua['fup90'];
  inscricoes: ResumoDaRegua['fup90_inscricoes'];
}) {
  const etapas = useEtapas(campanha?.id ?? null);
  const linhas = [...(fup90 ?? [])].sort((a, b) => n(a.toque) - n(b.toque));
  const total = linhas.reduce(
    (s, l) => ({ envios: s.envios + n(l.envios), entregues: s.entregues + n(l.entregues), lidos: s.lidos + n(l.lidos), respondidos: s.respondidos + n(l.respondidos), falhas: s.falhas + n(l.falhas) }),
    { envios: 0, entregues: 0, lidos: 0, respondidos: 0, falhas: 0 },
  );
  const encerradas = Object.entries(inscricoes ?? {}).filter(([s]) => s.startsWith('encerrada')).map(([s, q]) => [s, n(q)] as const).sort((a, b) => b[1] - a[1]);

  return (
    <Painel
      titulo="FUP90"
      nota={campanha ? campanha.nome : 'campanha de 90 dias por template'}
      acoes={<Abrir para={ROTAS.fup90}>editar</Abrir>}
    >
      {!campanha ? (
        <p className="text-[13px] text-croqui-soft">Não há campanha FUP90 no banco (fup_campanhas id 1).</p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Pilula tom={campanha.ativa ? 'ok' : 'caneta'}>{campanha.ativa ? 'ligada' : 'desligada'}</Pilula>
            <span className="text-2xs text-croqui-soft">
              {campanha.regioes.map(siglaDaPraca).join(' · ')} · envios das {campanha.hora_inicio.slice(0, 5)} às {campanha.hora_fim.slice(0, 5)} · até {numero(campanha.limite_envio_dia)} por dia
            </span>
          </div>
          {etapas.isPending ? (
            <Esqueleto linhas={2} />
          ) : etapas.isError ? (
            <Erro mensagem={etapas.error.message} tentar={() => void etapas.refetch()} />
          ) : (
            <LinhaDe90Dias etapas={etapas.data} />
          )}

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div><p className={ROTULO}>Inscrições ativas</p><p className={cn(NUM, 'text-[22px] font-semibold')}>{numero(n(inscricoes?.ativa))}</p></div>
            <div><p className={ROTULO}>Pausadas</p><p className={cn(NUM, 'text-[22px] font-semibold')}>{numero(n(inscricoes?.pausada))}</p></div>
            <div><p className={ROTULO}>Envios no período</p><p className={cn(NUM, 'text-[22px] font-semibold')}>{numero(total.envios)}</p></div>
            <div>
              <p className={ROTULO}>Falhas</p>
              <p className={cn(NUM, 'text-[22px] font-semibold', total.falhas > 0 ? 'text-croqui-red-text' : 'text-foreground')}>{numero(total.falhas)}</p>
            </div>
          </div>

          {linhas.length === 0 ? (
            <p className="mt-3 text-[13px] text-croqui-soft">Nenhum envio da FUP90 no período.</p>
          ) : (
            <>
              <table className="mt-3 hidden w-full text-[13px] sm:table">
                <thead>
                  <tr className="border-b border-border text-left text-2xs uppercase tracking-[0.1em] text-croqui-soft">
                    <th scope="col" className="py-2 pr-2 font-medium">FUP</th>
                    <th scope="col" className="py-2 pr-2 font-medium">Template</th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">Envios</th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">Entregues</th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">Lidos</th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">Responderam</th>
                    <th scope="col" className="py-2 pl-2 text-right font-medium">Falhas</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l) => (
                    <tr key={`${l.toque}-${l.template}`} className="border-b border-border">
                      <td className={cn(NUM, 'py-2 pr-2')}>{l.toque}</td>
                      <td className="max-w-[260px] truncate py-2 pr-2 text-croqui-soft">{l.template}</td>
                      <td className={cn(NUM, 'px-2 py-2 text-right')}>{numero(n(l.envios))}</td>
                      <td className={cn(NUM, 'px-2 py-2 text-right')}>{numero(n(l.entregues))}</td>
                      <td className={cn(NUM, 'px-2 py-2 text-right')}>{numero(n(l.lidos))}</td>
                      <td className={cn(NUM, 'px-2 py-2 text-right')}>{numero(n(l.respondidos))} <span className="text-2xs text-croqui-soft">{pct(n(l.respondidos), n(l.envios))}</span></td>
                      <td className={cn(NUM, 'py-2 pl-2 text-right', n(l.falhas) > 0 && 'text-croqui-red-text')}>{numero(n(l.falhas))}</td>
                    </tr>
                  ))}
                  <tr className="border-t-[1.5px] border-foreground font-semibold">
                    <td className="py-2 pr-2" colSpan={2}>Total</td>
                    <td className={cn(NUM, 'px-2 py-2 text-right')}>{numero(total.envios)}</td>
                    <td className={cn(NUM, 'px-2 py-2 text-right')}>{numero(total.entregues)}</td>
                    <td className={cn(NUM, 'px-2 py-2 text-right')}>{numero(total.lidos)}</td>
                    <td className={cn(NUM, 'px-2 py-2 text-right')}>{numero(total.respondidos)} <span className="text-2xs font-normal text-croqui-soft">{pct(total.respondidos, total.envios)}</span></td>
                    <td className={cn(NUM, 'py-2 pl-2 text-right')}>{numero(total.falhas)}</td>
                  </tr>
                </tbody>
              </table>
              <ul className="mt-3 divide-y divide-border sm:hidden">
                {linhas.map((l) => (
                  <li key={`${l.toque}-${l.template}`} className="py-2">
                    <p className="text-[13.5px] text-foreground">FUP <span className={NUM}>{l.toque}</span> <span className="text-2xs text-croqui-soft">{l.template}</span></p>
                    <p className="text-2xs text-croqui-soft">
                      <span className={cn(NUM, 'text-foreground')}>{numero(n(l.envios))}</span> envios · {numero(n(l.entregues))} entregues · {numero(n(l.lidos))} lidos ·{' '}
                      <span className={cn(NUM, 'text-foreground')}>{numero(n(l.respondidos))}</span> responderam
                      {n(l.falhas) > 0 && <span className="text-croqui-red-text"> · {numero(n(l.falhas))} falhas</span>}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}

          {encerradas.length > 0 && (
            <p className="mt-3 text-2xs leading-relaxed text-croqui-soft">
              Encerradas desde o começo:{' '}
              {encerradas.map(([s, q], i) => (
                <span key={s}>{i > 0 ? ' · ' : ''}<span className={cn(NUM, 'text-foreground')}>{numero(q)}</span> {STATUS_DA_INSCRICAO[s] ?? s}</span>
              ))}
              {' '}(total <span className={NUM}>{numero(somaDoMapa(Object.fromEntries(encerradas)))}</span>).
            </p>
          )}
        </>
      )}
    </Painel>
  );
}

/** A coluna Follow-up do kanban (sales_stages.is_followup), por praça. */
export function BlocoDoKanban({ kanban }: { kanban: ResumoDaRegua['kanban'] }) {
  const linhas = [...(kanban ?? [])].sort((a, b) => n(b.leads) - n(a.leads));
  return (
    <Painel titulo="Coluna Follow-up do kanban" nota="por praça">
      {linhas.length === 0 ? (
        <p className="text-[13px] text-croqui-soft">Nenhuma coluna de follow-up no kanban.</p>
      ) : (
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {linhas.map((k) => (
            <li key={`${k.region}-${k.nome}`} className="min-w-[72px]">
              <p className={ROTULO} title={nomeDaRegiao(k.region)}>{siglaDaPraca(k.region)}</p>
              <p className={cn(NUM, 'text-[22px] font-semibold leading-tight text-foreground')}>{numero(n(k.leads))}</p>
              <p className="text-2xs text-croqui-soft">{k.nome}</p>
            </li>
          ))}
        </ul>
      )}
      <p className={cn(NOTA, 'mt-3')}>
        Desde 25/08 é coluna comum: nada sai sozinho dela. É para onde o botão "Enviar para o Kanban" do Monitor manda o lead.
      </p>
    </Painel>
  );
}
