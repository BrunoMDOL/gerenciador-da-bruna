import { useId, useMemo } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarCheck } from 'lucide-react';
import { Erro, Esqueleto, Painel, Vazio } from '@/gerenciador/componentes';
import { numero } from '@/gerenciador/lib/formatos';
import { useSerieDiaria, type Dias } from './dados';
import { diaCurto, diaPorExtenso, hojeEmSaoPaulo, n } from './util';

interface Ponto {
  dia: string;
  rotulo: string;
  atendidos: number;
  responderam: number;
  agendados: number;
  agendados_bruna: number;
}

const TINTA = 'hsl(var(--foreground))';
const SUAVE = 'rgb(var(--croqui-soft))';
const REGUA = 'rgb(var(--croqui-rule))';
const CANETA = 'rgb(var(--croqui-red))';
const FONTE_NUM = '"Barlow Semi Condensed", Barlow, ui-sans-serif, sans-serif';

interface DicaProps {
  active?: boolean;
  payload?: Array<{ payload: Ponto }>;
}

function DicaDoDia({ active, payload }: DicaProps) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <div className="elev-2 rounded-md border border-border bg-popover px-3 py-2 text-[12px] text-foreground">
      <p className="font-medium capitalize">{diaPorExtenso(p.dia)}</p>
      <dl className="mt-1 grid grid-cols-[auto_auto] gap-x-3 font-croqui-num tabular-nums">
        <dt className="text-croqui-soft">atendidos</dt><dd className="text-right">{numero(p.atendidos)}</dd>
        <dt className="text-croqui-soft">responderam</dt><dd className="text-right">{numero(p.responderam)}</dd>
        <dt className="text-croqui-soft">agendados</dt><dd className="text-right text-croqui-red-text">{numero(p.agendados)}</dd>
        <dt className="text-croqui-soft">pela Bruna</dt><dd className="text-right">{numero(p.agendados_bruna)}</dd>
      </dl>
    </div>
  );
}

/**
 * Atendidos e responderam em traço de tinta (cheio e tracejado) e os agendados
 * em barra hachurada de caneta, na mesma escala. A tabela dobrada embaixo é o
 * mesmo gráfico em texto, para leitor de tela e para quem quer o número exato.
 */
export function SerieDiaria({ dias, className }: { dias: Dias; className?: string }) {
  const q = useSerieDiaria(dias);
  const idHachura = `hachura-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const hoje = hojeEmSaoPaulo();

  const pontos = useMemo<Ponto[]>(
    () => (q.data ?? []).map((d) => ({
      dia: String(d.dia),
      rotulo: String(d.dia) === hoje ? 'hoje' : diaCurto(String(d.dia)),
      atendidos: n(d.atendidos),
      responderam: n(d.responderam),
      agendados: n(d.agendados),
      agendados_bruna: n(d.agendados_bruna),
    })),
    [q.data, hoje],
  );
  const temHoje = pontos.some((p) => p.dia === hoje);
  const cheios = pontos.length - (temHoje ? 1 : 0);
  // Soma dos dias: atendidos e responderam contam leads distintos por dia, então
  // quem conversou em três dias entra três vezes. Agendados somam certo (um dia por lead).
  const totais = pontos.reduce(
    (acc, p) => ({ atendidos: acc.atendidos + p.atendidos, responderam: acc.responderam + p.responderam, agendados: acc.agendados + p.agendados }),
    { atendidos: 0, responderam: 0, agendados: 0 },
  );
  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];

  return (
    <Painel
      titulo="Dia a dia"
      nota={temHoje ? `${cheios} ${cheios === 1 ? 'dia cheio' : 'dias cheios'} e hoje, em andamento` : undefined}
      className={className}
    >
      {q.isPending && <Esqueleto linhas={5} className="h-[220px]" />}
      {q.isError && <Erro mensagem={q.error.message} tentar={() => q.refetch()} />}
      {q.data && pontos.length === 0 && (
        <Vazio Icone={CalendarCheck} titulo="Sem dias no período" descricao="A série diária voltou vazia. Troque o período ou tente de novo." />
      )}
      {pontos.length > 0 && (
        <>
          <div
            className="h-[220px] w-full"
            role="img"
            aria-label={`Gráfico de ${pontos.length} dias, de ${diaCurto(primeiro.dia)} a ${ultimo.dia === hoje ? 'hoje' : diaCurto(ultimo.dia)}: atendidos e responderam por dia em linha, agendados em barra, ${numero(totais.agendados)} no total. Os números de cada dia estão na tabela abaixo.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={pontos} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <pattern id={idHachura} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(135)">
                    <line x1="0" y1="0" x2="0" y2="6" stroke={CANETA} strokeWidth="1.5" />
                  </pattern>
                </defs>
                <CartesianGrid vertical={false} stroke={REGUA} strokeDasharray="2 4" />
                <XAxis
                  dataKey="rotulo"
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={20}
                  tick={{ fill: SUAVE, fontSize: 11, fontFamily: FONTE_NUM }}
                />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} width={40} tick={{ fill: SUAVE, fontSize: 11, fontFamily: FONTE_NUM }} />
                <Tooltip content={<DicaDoDia />} cursor={{ stroke: REGUA, strokeWidth: 1 }} isAnimationActive={false} />
                <Bar dataKey="agendados" name="Agendados" fill={`url(#${idHachura})`} stroke={CANETA} strokeWidth={1} maxBarSize={18} isAnimationActive={false} />
                <Line type="monotone" dataKey="atendidos" name="Atendidos" stroke={TINTA} strokeWidth={1.5} dot={false} activeDot={{ r: 3, stroke: TINTA, fill: TINTA }} isAnimationActive={false} />
                <Line type="monotone" dataKey="responderam" name="Responderam" stroke={SUAVE} strokeWidth={1.5} strokeDasharray="4 3" dot={false} activeDot={{ r: 3, stroke: SUAVE, fill: SUAVE }} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-croqui-soft" aria-label="Legenda">
            <li className="flex items-center gap-1.5"><span aria-hidden className="inline-block w-4 border-t-[1.5px] border-foreground" />atendidos</li>
            <li className="flex items-center gap-1.5"><span aria-hidden className="inline-block w-4 border-t-[1.5px] border-dashed border-croqui-soft" />responderam</li>
            <li className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-2.5 w-3 border border-croqui-red"
                style={{ backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 2px, rgb(var(--croqui-red)) 2px 3px)' }}
              />
              agendados (barra)
            </li>
          </ul>

          <details className="mt-3 text-[13px]">
            <summary className="cursor-pointer select-none text-croqui-soft hover:text-foreground">Números dia a dia</summary>
            <table className="mt-2 w-full text-[13px]">
              <thead>
                <tr className="text-2xs uppercase tracking-[0.1em] text-croqui-soft">
                  <th scope="col" className="py-1.5 text-left font-medium">Dia</th>
                  <th scope="col" className="py-1.5 text-right font-medium">Atendidos</th>
                  <th scope="col" className="py-1.5 text-right font-medium">Responderam</th>
                  <th scope="col" className="py-1.5 text-right font-medium">Agendados</th>
                  <th scope="col" className="hidden py-1.5 text-right font-medium sm:table-cell">Pela Bruna</th>
                </tr>
              </thead>
              <tbody>
                {pontos.map((p) => (
                  <tr key={p.dia} className="border-t border-border">
                    <th scope="row" className="py-1.5 text-left font-croqui-num font-normal tabular-nums text-foreground">
                      {diaCurto(p.dia)}{p.dia === hoje ? ' (hoje)' : ''}
                    </th>
                    <td className="py-1.5 text-right font-croqui-num tabular-nums">{numero(p.atendidos)}</td>
                    <td className="py-1.5 text-right font-croqui-num tabular-nums">{numero(p.responderam)}</td>
                    <td className="py-1.5 text-right font-croqui-num tabular-nums">{numero(p.agendados)}</td>
                    <td className="hidden py-1.5 text-right font-croqui-num tabular-nums sm:table-cell">{numero(p.agendados_bruna)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-[1.5px] border-foreground font-semibold">
                  <th scope="row" className="py-1.5 text-left">Soma dos dias</th>
                  <td className="py-1.5 text-right font-croqui-num tabular-nums">{numero(totais.atendidos)}</td>
                  <td className="py-1.5 text-right font-croqui-num tabular-nums">{numero(totais.responderam)}</td>
                  <td className="py-1.5 text-right font-croqui-num tabular-nums">{numero(totais.agendados)}</td>
                  <td className="hidden py-1.5 text-right font-croqui-num tabular-nums sm:table-cell">{numero(pontos.reduce((s, p) => s + p.agendados_bruna, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </details>
        </>
      )}
    </Painel>
  );
}
