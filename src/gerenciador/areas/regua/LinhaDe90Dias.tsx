import { cn } from '@/lib/utils';
import { DIAS_DA_LINHA, etapasForaDaLinha, ordenarEtapas, posicaoNaLinha } from './regrasDaCampanha';
import { NUM } from './estilos';

export interface MarcoDaLinha {
  id: number;
  followup_num: number;
  offset_dias: number;
  ativo: boolean;
  template_name: string | null;
}

const REFERENCIAS = [0, 7, 30, 60, 90];

function alinhamento(dia: number) {
  if (dia <= 0) return 'translate-x-0';
  if (dia >= DIAS_DA_LINHA) return '-translate-x-full';
  return '-translate-x-1/2';
}

/**
 * A campanha FUP90 desenhada em tinta: a linha de terra de 0 a 90 dias, cada
 * etapa como um traço com o número do FUP (cheio quando ativa, tracejado
 * quando inativa). A escala é comprimida no começo (raiz dos dias) para os
 * dias 1, 2 e 3 não caírem um em cima do outro. Etapa além do dia 90 fica
 * listada embaixo, fora da linha.
 */
export function LinhaDe90Dias({
  etapas,
  aoEscolher,
  className,
}: {
  etapas: MarcoDaLinha[];
  /** Quando há, cada traço vira botão (na aba FUP90, leva ao cartão da etapa). */
  aoEscolher?: (etapa: MarcoDaLinha) => void;
  className?: string;
}) {
  const ordenadas = ordenarEtapas(etapas);
  const dentro = ordenadas.filter((e) => e.offset_dias <= DIAS_DA_LINHA);
  const fora = etapasForaDaLinha(ordenadas);
  const descricao = ordenadas.map((e) => `FUP ${e.followup_num} no dia ${e.offset_dias}${e.ativo ? '' : ', inativa'}`).join('; ');

  return (
    <figure className={cn('min-w-0', className)}>
      <div
        className="relative mx-2 h-[92px]"
        role={aoEscolher ? undefined : 'img'}
        aria-label={aoEscolher ? undefined : `Linha de 90 dias: ${descricao || 'sem etapas'}`}
      >
        {dentro.map((e, i) => {
          const alto = i % 2 === 0;
          const conteudo = (
            <>
              <span className={cn(NUM, 'text-[12px] font-semibold leading-none', e.ativo ? 'text-foreground' : 'text-croqui-soft')}>{e.followup_num}</span>
              <span
                aria-hidden
                className={cn('mt-0.5 block w-0', alto ? 'h-8' : 'h-3.5', e.ativo ? 'border-l-[1.5px] border-foreground' : 'border-l border-dashed border-croqui-soft')}
              />
            </>
          );
          const posicao = { left: `${posicaoNaLinha(e.offset_dias)}%` };
          const base = 'absolute bottom-[34px] flex -translate-x-1/2 flex-col items-center';
          return aoEscolher ? (
            <button
              key={e.id}
              type="button"
              style={posicao}
              onClick={() => aoEscolher(e)}
              aria-label={`FUP ${e.followup_num}, dia ${e.offset_dias}${e.ativo ? '' : ', inativa'}`}
              className={cn(base, 'min-h-[28px] min-w-[24px] rounded-sm px-1 pt-1 hover:text-croqui-red-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}
            >
              {conteudo}
            </button>
          ) : (
            <span key={e.id} style={posicao} className={base} aria-hidden>
              {conteudo}
            </span>
          );
        })}

        <span aria-hidden className="absolute inset-x-0 bottom-[34px] h-[1.5px] bg-foreground" />
        <span aria-hidden className="absolute bottom-[29px] left-0 h-3 w-px bg-foreground" />
        <span aria-hidden className="absolute bottom-[29px] right-0 h-3 w-px bg-foreground" />

        {REFERENCIAS.map((d) => (
          <span
            key={d}
            aria-hidden
            style={{ left: `${posicaoNaLinha(d)}%` }}
            className={cn('absolute bottom-[10px] whitespace-nowrap text-2xs text-croqui-soft', NUM, alinhamento(d))}
          >
            {d === 0 ? 'entrada' : `dia ${d}`}
          </span>
        ))}
      </div>
      <figcaption className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-croqui-soft">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-3 w-0 border-l-[1.5px] border-foreground" /> ativa
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-3 w-0 border-l border-dashed border-croqui-soft" /> inativa
        </span>
        <span>escala comprimida no começo</span>
        {fora.length > 0 && (
          <span>
            além do dia 90:{' '}
            {fora.map((e, i) => (
              <span key={e.id} className={cn(NUM, !e.ativo && 'text-croqui-soft')}>
                {i > 0 ? ', ' : ''}FUP {e.followup_num} (dia {e.offset_dias}{e.ativo ? '' : ', inativa'})
              </span>
            ))}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
