import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Faixa de abas que rola na horizontal sem esconder que rola: quando há abas
 * fora da vista, a borda esmaece e ganha uma seta que avança. A aba ativa
 * (aria-current="page") é trazida para dentro da vista ao montar e ao trocar.
 */
export function FaixaDeAbas({
  children,
  className,
  ativa,
}: {
  children: ReactNode;
  className?: string;
  /** Chave da aba ativa: quando muda, a faixa rola até ela. */
  ativa?: string;
}) {
  const trilho = useRef<HTMLDivElement>(null);
  const [haAntes, setHaAntes] = useState(false);
  const [haDepois, setHaDepois] = useState(false);

  const medir = useCallback(() => {
    const el = trilho.current;
    if (!el) return;
    setHaAntes(el.scrollLeft > 2);
    setHaDepois(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  // Observador e escuta de rolagem montados uma vez: antes dependiam de
  // `children`, que muda a cada render do painel (toda mensagem nova), e cada
  // volta forçava uma medição de layout.
  useEffect(() => {
    const el = trilho.current;
    if (!el) return;
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    el.addEventListener('scroll', medir, { passive: true });
    return () => {
      observador.disconnect();
      el.removeEventListener('scroll', medir);
    };
  }, [medir]);

  // Quando entram ou saem abas (os papéis carregam depois), a largura do
  // conteúdo muda sem o trilho mudar de tamanho: mede de novo.
  const quantas = Children.count(children);
  useEffect(medir, [quantas, medir]);

  // A aba ativa entra na vista só quando ela muda.
  useEffect(() => {
    const el = trilho.current;
    const aba = el?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!el || !aba) return;
    const inicio = aba.offsetLeft;
    const fim = inicio + aba.offsetWidth;
    if (inicio < el.scrollLeft || fim > el.scrollLeft + el.clientWidth) {
      el.scrollLeft = Math.max(0, inicio - 32);
      medir();
    }
  }, [ativa, quantas, medir]);

  const rolar = (sentido: 1 | -1) => trilho.current?.scrollBy({ left: sentido * 140, behavior: 'smooth' });

  return (
    <div className={cn('relative min-w-0', className)}>
      <div
        ref={trilho}
        className="flex items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      {haAntes && (
        <button
          type="button"
          aria-label="Ver as abas anteriores"
          onClick={() => rolar(-1)}
          className="absolute inset-y-0 left-0 flex w-10 items-center justify-start bg-gradient-to-r from-background via-background/90 to-transparent text-foreground"
        >
          <ChevronLeft aria-hidden className="h-4 w-4" strokeWidth={1.75} />
        </button>
      )}
      {haDepois && (
        <button
          type="button"
          aria-label="Ver mais abas"
          onClick={() => rolar(1)}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-end bg-gradient-to-l from-background via-background/90 to-transparent text-foreground"
        >
          <ChevronRight aria-hidden className="h-4 w-4" strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}
