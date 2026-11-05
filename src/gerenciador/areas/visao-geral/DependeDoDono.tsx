import { Link } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { Erro, Painel } from '@/gerenciador/componentes';
import { cn } from '@/lib/utils';
import { usePendencias } from './dados';
import { ROTAS } from './rotas';
import { LINK, diaComAno } from './util';

/**
 * As pendências de bruna_gestor_config ('pendencias') que ainda não foram
 * resolvidas. Sem pendência, o painel não existe; nada aqui é texto fixo.
 */
export function DependeDoDono({ className }: { className?: string }) {
  const q = usePendencias();
  if (q.isPending) return null;
  if (q.isError) return <div className={className}><Erro mensagem={q.error.message} tentar={() => q.refetch()} /></div>;
  if (q.data.length === 0) return null;

  return (
    <Painel
      titulo="Depende do dono"
      nota={`${q.data.length} pendência${q.data.length > 1 ? 's' : ''}`}
      acoes={<Link to={ROTAS.configGeral} className={cn('text-[13px] text-croqui-soft hover:text-foreground', LINK)}>Configurações › Geral</Link>}
      className={className}
    >
      <ul className="grid gap-3 sm:grid-cols-2">
        {q.data.map((p) => (
          <li key={p.codigo} className="flex items-start gap-2">
            <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0 text-croqui-soft" strokeWidth={1.75} aria-hidden />
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium text-foreground">{p.titulo}</p>
              {/* Sem ligadura: a Barlow junta "--" num travessão e o "--base" do comando viraria "—base" (como em Configurações › Geral). */}
              {p.texto && <p className="mt-0.5 break-words text-[13px] leading-relaxed text-croqui-soft [font-variant-ligatures:none]">{p.texto}</p>}
              {p.desde && <p className="mt-0.5 font-croqui-num text-2xs tabular-nums text-croqui-soft">desde {diaComAno(p.desde)}</p>}
            </div>
          </li>
        ))}
      </ul>
    </Painel>
  );
}
