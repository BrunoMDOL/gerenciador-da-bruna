import { Link } from 'react-router-dom';
import { ChevronRight, CircleCheck, Info, OctagonAlert, TriangleAlert, type LucideIcon } from 'lucide-react';
import { Erro, Esqueleto, Painel, Pilula, Vazio, type TomDaPilula } from '@/gerenciador/componentes';
import type { GravidadeAlerta } from '@/gerenciador/lib/tipos';
import { cn } from '@/lib/utils';
import { gravidadeDe, ordenarAlertas } from './calculos';
import { reguaPausada, useAlertas, useRegua, type Dias } from './dados';
import { rotaDeLeads, rotaDoAlerta } from './rotas';
import { LINK } from './util';

const NOME: Record<GravidadeAlerta, string> = { grave: 'grave', media: 'média', leve: 'leve' };
const TOM: Record<GravidadeAlerta, TomDaPilula> = { grave: 'caneta', media: 'alerta', leve: 'suave' };
const ICONE: Record<GravidadeAlerta, LucideIcon> = { grave: OctagonAlert, media: TriangleAlert, leve: Info };
const COR: Record<GravidadeAlerta, string> = { grave: 'text-croqui-red-text', media: 'text-warning', leve: 'text-croqui-soft' };

/**
 * bruna_gestor_alertas, em ordem de gravidade. Cada alerta tem ícone, a
 * gravidade escrita e o caminho até onde se resolve. A pausa da régua não
 * repete aqui quando já está no topo da página.
 */
export function Alertas({ dias, className }: { dias: Dias; className?: string }) {
  const q = useAlertas();
  const regua = useRegua(dias);
  const pausaNoTopo = Boolean(regua.data) && reguaPausada(regua.data?.resumo?.pausas);

  const lista = ordenarAlertas((q.data ?? []).filter((a) => !(pausaNoTopo && a.chave === 'regua_pausada')));
  const graves = lista.filter((a) => gravidadeDe(a) === 'grave').length;

  return (
    <Painel
      titulo="Alertas"
      nota={q.data ? (lista.length ? `${lista.length} agora${graves ? ` · ${graves} grave${graves > 1 ? 's' : ''}` : ''}` : 'nenhum agora') : undefined}
      className={className}
      semRecheio
    >
      {q.isPending && <div className="p-4"><Esqueleto linhas={4} /></div>}
      {q.isError && <div className="p-4"><Erro mensagem={q.error.message} tentar={() => q.refetch()} /></div>}
      {q.data && lista.length === 0 && (
        <Vazio
          Icone={CircleCheck}
          titulo="Nada pede atenção agora"
          descricao="Agendas, régua, revisões e chamados estão em dia. Para adiantar, veja os leads sem resposta há 24 h."
          acao={<Link to={rotaDeLeads({ filtro: 'sem_resposta_24h' })} className={cn('text-[13px] text-foreground', LINK)}>Ver leads sem resposta</Link>}
          className="py-8"
        />
      )}
      {lista.length > 0 && (
        <ul className="divide-y divide-border">
          {lista.map((a) => {
            const g = gravidadeDe(a);
            const Icone = ICONE[g];
            return (
              <li key={a.chave}>
                <Link
                  to={rotaDoAlerta(a)}
                  className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline-none"
                >
                  <Icone className={cn('mt-0.5 h-4 w-4 shrink-0', COR[g])} strokeWidth={1.75} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[13.5px] font-semibold leading-snug text-foreground">{a.titulo}</span>
                      <Pilula tom={TOM[g]}>{NOME[g]}</Pilula>
                    </div>
                    {a.detalhe && <p className="mt-0.5 text-[13px] leading-snug text-croqui-soft">{a.detalhe}</p>}
                    <p className={cn('mt-1 text-[13px] text-foreground', LINK)}>{a.acao || 'abrir'}</p>
                  </div>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-croqui-soft group-hover:text-foreground" strokeWidth={1.75} aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Painel>
  );
}
