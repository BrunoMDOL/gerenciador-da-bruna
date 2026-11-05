import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Cota } from '@/components/croqui/Cota';
import { cn } from '@/lib/utils';

interface PaginaProps {
  /** Rótulo pequeno acima do título: "Gerenciador · <área>" em todas as áreas. */
  rotulo?: string;
  /**
   * Nas telas de detalhe (um lead, uma análise), o lugar do rótulo vira o
   * caminho de volta à lista: "← Leads". Substitui o rótulo.
   */
  voltar?: { para: string; rotulo: string };
  titulo: string;
  descricao?: ReactNode;
  acoes?: ReactNode;
  children: ReactNode;
  className?: string;
}

const ROTULO = 'text-2xs font-semibold uppercase tracking-[0.12em] text-croqui-soft';

/**
 * A folha de uma área do gerenciador: título em Barlow Semi Condensed, a cota
 * de tinta separando o cabeçalho do conteúdo, 16px de calha no celular e
 * respiro de prancheta no desktop.
 */
export function Pagina({ rotulo, voltar, titulo, descricao, acoes, children, className }: PaginaProps) {
  return (
    <div className={cn('mx-auto w-full max-w-[1400px] px-4 pb-16 pt-5 sm:px-6 lg:px-8', className)}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {voltar ? (
            <Link
              to={voltar.para}
              className={cn(
                ROTULO,
                // O texto é pequeno: a área de toque cresce para cima e para os lados (não sobre o título) sem mexer no desenho.
                "relative inline-flex items-center gap-1 transition-colors after:absolute after:-inset-x-2 after:-bottom-1 after:-top-4 after:content-[''] hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
            >
              <ArrowLeft className="h-3 w-3" strokeWidth={2} aria-hidden />
              {voltar.rotulo}
            </Link>
          ) : (
            rotulo && <p className={ROTULO}>{rotulo}</p>
          )}
          <h1 className="font-croqui-num text-[28px] font-semibold leading-none tracking-tight text-foreground sm:text-[32px]">{titulo}</h1>
          {descricao && <div className="mt-2 max-w-2xl text-[13px] leading-relaxed text-croqui-soft">{descricao}</div>}
        </div>
        {acoes && <div className="flex shrink-0 flex-wrap items-center gap-2">{acoes}</div>}
      </header>
      <Cota className="my-5" />
      {children}
    </div>
  );
}
