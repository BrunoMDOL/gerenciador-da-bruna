import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Pilula } from '@/gerenciador/componentes';
import { dataHora } from '@/gerenciador/lib/formatos';
import { hashCurto } from '../comum/util';
import type { VersaoDaLista } from './dados';
import { ESTADO_DA_VERSAO, ORIGEM_DA_VERSAO } from './textos';

const VISIVEIS = 8;

interface Props {
  versoes: VersaoDaLista[];
  atualId: number | null;
  selecionadaId: number | null;
  aoSelecionar: (id: number) => void;
}

function quemFez(v: VersaoDaLista): string {
  return v.criado_por_email ?? '—';
}

export function EstadoDaVersao({ v, noAr }: { v: VersaoDaLista; noAr: boolean }) {
  const e = ESTADO_DA_VERSAO[v.status];
  return (
    <span className="inline-flex items-center gap-1">
      <Pilula tom={e.tom} titulo={e.descricao}>
        <e.Icone className="mr-1 h-3 w-3" strokeWidth={2} aria-hidden />
        {e.rotulo}
      </Pilula>
      {noAr && <Pilula tom="ok" titulo="a última publicada, segundo o banco">no ar</Pilula>}
    </span>
  );
}

/**
 * As versões do núcleo, da mais nova para a mais velha. A publicada fica em
 * tinta mais forte; a escolhida, com o traço de caneta à esquerda.
 */
export function ListaDeVersoes({ versoes, atualId, selecionadaId, aoSelecionar }: Props) {
  const [todas, setTodas] = useState(false);
  const indiceDaEscolhida = versoes.findIndex((v) => v.id === selecionadaId);
  const limite = Math.max(VISIVEIS, indiceDaEscolhida + 1);
  const mostradas = todas ? versoes : versoes.slice(0, limite);

  return (
    <div>
      <table className="hidden w-full text-sm md:table">
        <thead>
          <tr className="border-b border-border text-left text-2xs font-medium uppercase tracking-[0.1em] text-croqui-soft">
            <th scope="col" className="px-4 py-2 font-medium">Versão</th>
            <th scope="col" className="px-2 py-2 font-medium">Estado</th>
            <th scope="col" className="px-2 py-2 font-medium">Origem</th>
            <th scope="col" className="px-2 py-2 font-medium">Nota</th>
            <th scope="col" className="px-2 py-2 font-medium">Quem</th>
            <th scope="col" className="px-2 py-2 font-medium">Quando</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">Hash</th>
          </tr>
        </thead>
        <tbody>
          {mostradas.map((v) => {
            const escolhida = v.id === selecionadaId;
            const noAr = v.id === atualId;
            return (
              <tr
                key={v.id}
                onClick={() => aoSelecionar(v.id)}
                className={cn(
                  'cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-accent/60',
                  escolhida && 'bg-accent/70',
                )}
              >
                <td className={cn('border-l-2 px-4 py-2.5', escolhida ? 'border-l-croqui-red' : 'border-l-transparent')}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); aoSelecionar(v.id); }}
                    aria-current={escolhida ? 'true' : undefined}
                    className={cn('font-croqui-num text-[15px] tabular-nums underline decoration-croqui-rule underline-offset-4 hover:decoration-foreground', noAr ? 'font-semibold text-foreground' : 'text-foreground/90')}
                  >
                    nº {v.numero}
                  </button>
                </td>
                <td className="px-2 py-2.5"><EstadoDaVersao v={v} noAr={noAr} /></td>
                <td className="px-2 py-2.5 text-[13px] text-croqui-soft">{ORIGEM_DA_VERSAO[v.origem]}</td>
                <td className="max-w-[28rem] px-2 py-2.5 text-[13px] text-foreground/90"><span className="line-clamp-2">{v.nota ?? '—'}</span></td>
                <td className="max-w-[12rem] truncate px-2 py-2.5 text-[13px] text-croqui-soft" title={quemFez(v)}>{quemFez(v)}</td>
                <td className="whitespace-nowrap px-2 py-2.5 font-croqui-num text-[13px] tabular-nums text-croqui-soft">{dataHora(v.criado_em)}</td>
                <td className="px-4 py-2.5 text-right font-croqui-num text-[13px] tabular-nums text-croqui-soft" title={v.hash}>{hashCurto(v.hash)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ul className="divide-y divide-border md:hidden">
        {mostradas.map((v) => {
          const escolhida = v.id === selecionadaId;
          const noAr = v.id === atualId;
          return (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => aoSelecionar(v.id)}
                aria-current={escolhida ? 'true' : undefined}
                className={cn('flex w-full items-start gap-3 border-l-2 px-4 py-3 text-left', escolhida ? 'border-l-croqui-red bg-accent/70' : 'border-l-transparent')}
              >
                <span className={cn('font-croqui-num text-[17px] tabular-nums', noAr ? 'font-semibold' : '')}>nº {v.numero}</span>
                <span className="min-w-0 flex-1 space-y-1">
                  <EstadoDaVersao v={v} noAr={noAr} />
                  <span className="block text-[13px] text-foreground/90">{v.nota ?? '—'}</span>
                  <span className="block font-croqui-num text-2xs tabular-nums text-croqui-soft">
                    {ORIGEM_DA_VERSAO[v.origem]} · {dataHora(v.criado_em)} · {hashCurto(v.hash)}
                  </span>
                </span>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-croqui-soft" strokeWidth={1.75} aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>

      {versoes.length > limite && (
        <div className="border-t border-border px-4 py-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setTodas((t) => !t)}>
            {todas ? 'Mostrar só as mais novas' : `Mostrar as ${versoes.length} versões`}
          </Button>
        </div>
      )}
    </div>
  );
}
