import { AlertCircle, AlertTriangle, Info, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { Achado } from './tipos';
import { rota } from '@/gerenciador/lib/rotas';

const GRAVIDADE: Record<Achado['gravidade'], { nome: string; Icone: LucideIcon; classe: string; ordem: number }> = {
  grave: { nome: 'grave', Icone: AlertTriangle, classe: 'text-croqui-red-text', ordem: 0 },
  media: { nome: 'média', Icone: AlertCircle, classe: 'text-warning', ordem: 1 },
  leve: { nome: 'leve', Icone: Info, classe: 'text-croqui-soft', ordem: 2 },
};

/** Os achados da análise, graves primeiro: marcador + palavra, título, descrição e as conversas que mostram o problema. */
export function Achados({ achados }: { achados: Achado[] }) {
  const ordenados = [...achados].sort((a, b) => (GRAVIDADE[a.gravidade]?.ordem ?? 9) - (GRAVIDADE[b.gravidade]?.ordem ?? 9));
  return (
    <ol className="divide-y divide-border">
      {ordenados.map((a, i) => {
        const g = GRAVIDADE[a.gravidade] ?? GRAVIDADE.leve;
        const { Icone } = g;
        const evidencias = Array.isArray(a.evidencias) ? a.evidencias : [];
        return (
          <li key={i} className="py-4 first:pt-0 last:pb-0">
            <div className="flex items-start gap-2.5">
              <Icone className={cn('mt-0.5 h-4 w-4 shrink-0', g.classe)} strokeWidth={1.75} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className={cn('text-2xs font-semibold uppercase tracking-[0.1em]', g.classe)}>{g.nome}</span>
                  <h3 className="text-[15px] font-semibold leading-snug text-foreground">{a.titulo}</h3>
                </div>
                <p className="mt-1 max-w-[65ch] whitespace-pre-line text-sm leading-relaxed text-foreground/90">{a.descricao}</p>
                {evidencias.length > 0 && (
                  <ul className="mt-2 space-y-1 border-l border-border pl-3">
                    {evidencias.map((ev, j) => (
                      <li key={j} className="text-xs text-croqui-soft">
                        {ev.contato_id != null && (
                          <Link
                            to={rota(`/leads/${ev.contato_id}`)}
                            className="font-medium text-foreground underline decoration-croqui-rule underline-offset-4 hover:decoration-croqui-red"
                          >
                            lead {ev.contato_id}
                          </Link>
                        )}
                        {ev.trecho ? <span className={cn('italic', ev.contato_id != null && 'ml-1.5')}>“{ev.trecho}”</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
