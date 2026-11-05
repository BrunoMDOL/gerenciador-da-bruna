import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, MapPin, MapPinOff } from 'lucide-react';
import { Carregando, Erro, Painel, Pilula, Vazio } from '@/gerenciador/componentes';
import { dataHora, nomeDaRegiao } from '@/gerenciador/lib/formatos';
import { ordenarRegioes, useRegioes, type Regiao } from './comum/regioes';
import { sigla } from './comum/util';
import { ROTAS, rotaDosBairros } from './rotas';

const LINK = 'inline-flex min-h-9 items-center gap-1 text-[13px] text-croqui-soft underline decoration-croqui-rule underline-offset-4 hover:text-foreground';

/** "08:30:00" -> "08:30". */
function horario(h: string): string {
  return h.slice(0, 5);
}

/**
 * /configuracoes/regioes: as regiões como o banco as conhece
 * (bruna_regioes), só leitura. A fonte de verdade é o regioes.json do
 * repositório; os bairros foco de cada praça têm tela própria.
 */
export default function Regioes() {
  const q = useRegioes();

  if (q.isPending) return <Carregando texto="Carregando as regiões" />;
  if (q.isError && !q.data) return <Erro mensagem={q.error.message} tentar={() => void q.refetch()} />;

  const todas = ordenarRegioes(q.data ?? []);
  const comConsultoria = todas.filter((r) => r.oferece_consultoria);
  const semConsultoria = todas.filter((r) => !r.oferece_consultoria);

  return (
    <div className="space-y-6">
      {todas.length === 0 ? (
        <Painel>
          <Vazio
            Icone={MapPinOff}
            titulo="Nenhuma região em bruna_regioes"
            descricao="As regiões vêm do docs/bruna/regioes.json do repositório. Sem elas, o estado do lead e os alertas de agenda ficam sem praça."
          />
        </Painel>
      ) : (
        <>
          <section aria-labelledby="regioes-pracas">
            <h2 id="regioes-pracas" className="text-[13.5px] font-semibold text-foreground">Praças, com consultoria</h2>
            <p className="mt-0.5 text-2xs text-croqui-soft">Onde a Bruna oferece a visita e reserva na agenda do consultor.</p>
            {comConsultoria.length === 0 ? (
              <p className="mt-3 text-[13px] text-croqui-soft">Nenhuma região está marcada com consultoria.</p>
            ) : (
              <ul className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {comConsultoria.map((r) => <li key={r.region}><CartaoDaPraca r={r} /></li>)}
              </ul>
            )}
          </section>

          {semConsultoria.length > 0 && (
            <section aria-labelledby="regioes-outras">
              <h2 id="regioes-outras" className="text-[13.5px] font-semibold text-foreground">Funis de qualificação e outras regiões</h2>
              <p className="mt-0.5 text-2xs text-croqui-soft">Sem consultoria presencial: a Bruna qualifica e encaminha.</p>
              <Painel semRecheio className="mt-3">
                <ul className="divide-y divide-border">
                  {semConsultoria.map((r) => (
                    <li key={r.region} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5">
                      <span className="flex items-center gap-2">
                        <span className="w-9 text-2xs font-semibold tracking-[0.08em] text-foreground">{sigla(r.region)}</span>
                        <span className="text-sm text-foreground">{nomeDaRegiao(r.region)}</span>
                        {r.nome !== nomeDaRegiao(r.region) && <span className="text-2xs text-croqui-soft">(“{r.nome}” no banco)</span>}
                      </span>
                      <span className="flex items-center gap-3 text-2xs text-croqui-soft">
                        <Pilula tom="suave">sem consultoria</Pilula>
                        <span>atualizada <span className="font-croqui-num tabular-nums">{dataHora(r.atualizado_em)}</span></span>
                        <Link to={`${ROTAS.leads}?region=${r.region}`} className={LINK}>Leads<span className="sr-only"> de {nomeDaRegiao(r.region)}</span> <ArrowUpRight className="h-3 w-3" aria-hidden /></Link>
                      </span>
                    </li>
                  ))}
                </ul>
              </Painel>
            </section>
          )}
        </>
      )}

      <Painel titulo="De onde vem e como muda">
        <div className="max-w-[72ch] space-y-2 text-[13px] leading-relaxed text-croqui-soft">
          <p>
            A fonte de verdade das regiões é o <span className="font-medium text-foreground">docs/bruna/regioes.json</span>, no repositório. O
            build-contexto.mjs grava esse arquivo dentro do nó “Montar contexto v3” (a constante REGIOES), e é dela que o contexto da Bruna tira,
            praça a praça, se há consultoria, a grade e o bloqueio da agenda, a duração que ela diz ao cliente, a política de preço e os
            representantes. Esta tela mostra a cópia que o banco usa (bruna_regioes) no estado do lead e nos alertas de agenda.
          </p>
          <p>
            Mudar região é mudança de código: edite o regioes.json numa branch, rode o build e o teste, suba o nó como no núcleo e leve a branch
            para a main. Nada aqui grava.
          </p>
          <p>
            Os bairros foco de cada praça, que decidem entre consultoria e análise por foto, não passam por aqui: têm tela própria, em{' '}
            <Link to={ROTAS.bairros} className="font-medium text-foreground underline decoration-croqui-rule underline-offset-4 hover:decoration-foreground">Bairros foco</Link>,
            onde se põe, tira e edita cada um.
          </p>
        </div>
      </Painel>
    </div>
  );
}

/** O e-mail da agenda quebra depois do @, e não no meio do domínio. */
function Email({ valor }: { valor: string | null }) {
  if (!valor) return <>—</>;
  const i = valor.indexOf('@');
  if (i < 0) return <>{valor}</>;
  return <>{valor.slice(0, i + 1)}<wbr />{valor.slice(i + 1)}</>;
}

function CartaoDaPraca({ r }: { r: Regiao }) {
  const grade = r.grade ?? [];
  return (
    <article aria-labelledby={`praca-${r.region}`} className="flex h-full flex-col rounded-md border border-border bg-card">
      <header className="flex items-baseline justify-between gap-2 border-b border-border px-4 py-2.5">
        <h3 id={`praca-${r.region}`} className="flex items-baseline gap-2">
          <span className="text-2xs font-semibold tracking-[0.08em] text-foreground">{sigla(r.region)}</span>
          <span className="text-[15px] font-semibold text-foreground">{r.nome}</span>
        </h3>
        <Pilula tom="tinta">com consultoria</Pilula>
      </header>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 px-4 py-3 text-[13px]">
        <dt className="text-croqui-soft">Consultor</dt>
        <dd className="text-foreground">{r.consultor ?? '—'}</dd>
        <dt className="text-croqui-soft">Agenda</dt>
        <dd className="break-words text-foreground"><Email valor={r.calendario} /></dd>
        <dt className="text-croqui-soft" title="Quanto cada reserva ocupa na agenda da praça (bloqueio_min no regioes.json)">Bloqueio na agenda</dt>
        <dd className="font-croqui-num tabular-nums text-foreground">{r.duracao_min != null ? `${r.duracao_min} min` : '—'}</dd>
        <dt className="text-croqui-soft">Horizonte</dt>
        <dd className="font-croqui-num tabular-nums text-foreground">{r.horizonte_dias} dias</dd>
      </dl>
      <div className="px-4 pb-3">
        <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.1em] text-croqui-soft">
          <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          Grade · <span className="font-croqui-num tabular-nums">{grade.length}</span> {grade.length === 1 ? 'horário' : 'horários'}
        </p>
        {grade.length ? (
          <ul className="mt-1.5 flex flex-wrap gap-1" aria-label={`Horários de ${r.nome}`}>
            {grade.map((h) => (
              <li key={h} className="rounded-sm border border-border px-1.5 py-0.5 font-croqui-num text-[13px] tabular-nums text-foreground">{horario(h)}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-[13px] text-croqui-soft">Sem grade no banco.</p>
        )}
      </div>
      <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2">
        <span className="text-2xs text-croqui-soft">atualizada <span className="font-croqui-num tabular-nums">{dataHora(r.atualizado_em)}</span></span>
        <span className="flex items-center gap-3">
          <Link to={rotaDosBairros(r.region)} className={LINK}>
            <MapPin className="h-3 w-3" aria-hidden /> Bairros foco<span className="sr-only"> de {r.nome}</span>
          </Link>
          <Link to={`${ROTAS.leads}?region=${r.region}`} className={LINK}>Leads<span className="sr-only"> de {r.nome}</span> <ArrowUpRight className="h-3 w-3" aria-hidden /></Link>
        </span>
      </footer>
    </article>
  );
}
