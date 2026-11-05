import { CirclePause } from 'lucide-react';
import { Painel } from '@/gerenciador/componentes';
import { numero, pct } from '@/gerenciador/lib/formatos';
import { cn } from '@/lib/utils';
import { NOTA, NUM, ROTULO } from './estilos';
import { agregarPorToque, agruparPorEtapa, CONDICOES_DA_ESCADA, TOQUES_DA_ESCADA, type LinhaDaEscada } from './regrasDaEscada';

/** Horas depois da pergunta sem resposta, na escala do desenho (0 a 8 h). */
const HORAS_DO_TOQUE: Record<number, number> = { 0: 0.75, 1: 4, 2: 8 };
const posicao = (horas: number) => `${(horas / 8) * 100}%`;

function LinhaDaEscadaDesenhada() {
  return (
    <div className="relative mx-2 h-[78px]" aria-hidden>
      {TOQUES_DA_ESCADA.map((t) => {
        const ultimo = t.toque === 2;
        return (
          <div
            key={t.toque}
            style={{ left: posicao(HORAS_DO_TOQUE[t.toque]) }}
            className={cn('absolute top-0 flex flex-col', ultimo ? '-translate-x-full items-end' : '-translate-x-1/2 items-center')}
          >
            <span className="whitespace-nowrap text-2xs font-semibold uppercase tracking-[0.08em] text-croqui-soft">toque {t.toque}</span>
            <span className={cn(NUM, 'whitespace-nowrap text-[15px] font-semibold leading-tight text-foreground')}>{t.depois}</span>
            <span className={cn('mt-1 block h-3 w-0 border-l-[1.5px] border-foreground', ultimo && 'mr-[-1px]')} />
          </div>
        );
      })}
      <span className="absolute inset-x-0 top-[46px] h-[1.5px] bg-foreground" />
      <span className="absolute left-0 top-[40px] h-3.5 w-3.5 -translate-x-1/2 rounded-full border-[1.5px] border-foreground bg-card" />
      <span className="absolute left-0 top-[58px] whitespace-nowrap text-2xs text-croqui-soft">pergunta da Bruna sem resposta</span>
    </div>
  );
}

/**
 * A escada de 24 h: os três toques nos intervalos de
 * followup_etapas_candidatos, com o que saiu no período, as condições e a
 * conta por pergunta.
 */
export function DiagramaDaEscada({ escada, pausada, className }: { escada: LinhaDaEscada[]; pausada: boolean; className?: string }) {
  const porToque = agregarPorToque(escada);
  const porEtapa = agruparPorEtapa(escada);

  return (
    <Painel titulo="Escada de 24 h" className={className}>
      <p className={cn(NOTA, 'mb-4')}>Cobrança automática depois de uma pergunta da Bruna que ficou sem resposta, enquanto a janela de 24 h do WhatsApp segue aberta.</p>
      {pausada && (
        <p role="status" className="mb-4 flex items-center gap-2 text-[13px] font-medium text-croqui-red-text">
          <CirclePause className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
          Pausada pelo gestor: nenhum toque sai até retomar.
        </p>
      )}
      <figure>
        <LinhaDaEscadaDesenhada />
        <figcaption className="sr-only">
          Três toques: {TOQUES_DA_ESCADA.map((t) => `toque ${t.toque} ${t.depois} depois`).join(', ')} da pergunta sem resposta.
        </figcaption>
      </figure>

      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {porToque.map((t) => {
          const regra = TOQUES_DA_ESCADA.find((x) => x.toque === t.toque);
          return (
            <div key={t.toque} className="min-w-0 border-t border-border pt-3">
              <dt className={ROTULO}>toque {t.toque} · {regra?.depois}</dt>
              <dd className="mt-1">
                <span className={cn(NUM, 'text-[26px] font-semibold leading-none text-foreground')}>{numero(t.enviados)}</span>
                <span className="ml-1.5 text-[13px] text-croqui-soft">{t.enviados === 1 ? 'enviado' : 'enviados'}</span>
              </dd>
              <dd className="mt-1 text-2xs leading-relaxed text-croqui-soft">
                <span className={NUM}>{numero(t.pulados)}</span> pulados ·{' '}
                <span className={NUM}>{numero(t.respondeu_24h)}</span> responderam em 24 h ({pct(t.respondeu_24h, t.enviados)}) ·{' '}
                <span className={NUM}>{numero(t.agendou_7d)}</span> agendaram em 7 dias
              </dd>
              {regra && <dd className="mt-1 text-2xs text-croqui-soft">{regra.regra}</dd>}
            </div>
          );
        })}
      </dl>

      <div className="mt-5">
        <h3 className="text-[13px] font-semibold text-foreground">Quando um toque sai</h3>
        <ul className={cn(NOTA, 'mt-1 list-disc space-y-0.5 pl-5')}>
          {CONDICOES_DA_ESCADA.map((c) => <li key={c}>{c}</li>)}
        </ul>
      </div>

      <div className="mt-5">
        <h3 className="text-[13px] font-semibold text-foreground">Por pergunta que ficou sem resposta</h3>
        {porEtapa.length === 0 ? (
          <p className={cn(NOTA, 'mt-1')}>Nenhum toque no período.</p>
        ) : (
          <>
            <table className="mt-2 hidden w-full text-[13px] sm:table">
              <thead>
                <tr className="border-b border-border text-left text-2xs uppercase tracking-[0.1em] text-croqui-soft">
                  <th scope="col" className="py-2 pr-3 font-medium">Pergunta</th>
                  {TOQUES_DA_ESCADA.map((t) => <th key={t.toque} scope="col" className="px-2 py-2 text-right font-medium">{t.depois}</th>)}
                  <th scope="col" className="px-2 py-2 text-right font-medium">Pulados</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">Responderam em 24 h</th>
                  <th scope="col" className="py-2 pl-2 text-right font-medium">Agendaram em 7 dias</th>
                </tr>
              </thead>
              <tbody>
                {porEtapa.map((e) => (
                  <tr key={e.etapa} className="border-b border-border last:border-0">
                    <th scope="row" className="py-2 pr-3 text-left font-normal text-foreground">{e.nome}</th>
                    {e.toques.map((t) => <td key={t.toque} className={cn(NUM, 'px-2 py-2 text-right')}>{numero(t.enviados)}</td>)}
                    <td className={cn(NUM, 'px-2 py-2 text-right text-croqui-soft')}>{numero(e.pulados)}</td>
                    <td className={cn(NUM, 'px-2 py-2 text-right')}>{numero(e.respondeu_24h)} <span className="text-2xs text-croqui-soft">{pct(e.respondeu_24h, e.enviados)}</span></td>
                    <td className={cn(NUM, 'py-2 pl-2 text-right')}>{numero(e.agendou_7d)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="mt-2 divide-y divide-border sm:hidden">
              {porEtapa.map((e) => (
                <li key={e.etapa} className="py-2">
                  <p className="text-[13.5px] text-foreground">{e.nome}</p>
                  <p className="mt-0.5 text-2xs text-croqui-soft">
                    {e.toques.map((t, i) => (
                      <span key={t.toque}>{i > 0 ? ' · ' : ''}{TOQUES_DA_ESCADA[i]?.depois} <span className={cn(NUM, 'text-foreground')}>{numero(t.enviados)}</span></span>
                    ))}
                    {' · '}responderam <span className={cn(NUM, 'text-foreground')}>{numero(e.respondeu_24h)}</span> ({pct(e.respondeu_24h, e.enviados)})
                    {' · '}agendaram <span className={cn(NUM, 'text-foreground')}>{numero(e.agendou_7d)}</span>
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Painel>
  );
}
