import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Esqueleto, Painel } from '@/gerenciador/componentes';
import { data, numero } from '@/gerenciador/lib/formatos';
import { cn } from '@/lib/utils';
import { DIAS_DO_PAINEL } from './dados';
import { daPraca, rotaDosLeads } from './regras';
import type { PainelDoFoco, Praca } from './tipos';
import { rota } from '@/gerenciador/lib/rotas';

const PRIMEIROS = 8;
const LINK = 'underline decoration-croqui-rule underline-offset-4 hover:decoration-foreground';

interface Props {
  praca: Praca;
  painel: UseQueryResult<PainelDoFoco, Error>;
  aoAdicionar: (nome: string) => void;
}

/** Os bairros que leads da praça pediram e que a lista não cobre: onde a lista pode crescer. */
export function ForaDoFoco({ praca, painel, aoAdicionar }: Props) {
  const [todos, setTodos] = useState(false);
  const pedidos = painel.data?.fora_do_foco ?? [];
  const dias = painel.data?.periodo?.dias ?? DIAS_DO_PAINEL;
  const visiveis = todos ? pedidos : pedidos.slice(0, PRIMEIROS);

  return (
    <Painel titulo="Pedidos fora do foco" nota={painel.data ? `${numero(pedidos.length)} ${pedidos.length === 1 ? 'bairro' : 'bairros'}` : undefined}>
      <p className="text-[13px] leading-relaxed text-croqui-soft">
        Bairros que leads {daPraca(praca.nome)} informaram nos últimos {dias} dias e que não estão na lista, os mais pedidos primeiro.
      </p>

      {painel.isPending ? (
        <Esqueleto linhas={4} className="mt-3" />
      ) : painel.isError ? (
        <p className="mt-3 text-[13px] text-croqui-soft">Sem os números da praça agora; o erro aparece na lista.</p>
      ) : pedidos.length === 0 ? (
        <p className="mt-3 text-[13px] text-foreground">Nenhum pedido fora do foco nesses {dias} dias: todo lead que disse o bairro caiu num item da lista.</p>
      ) : (
        <>
          <ul className="mt-2">
            {visiveis.map((p, i) => (
              <li key={`${p.bairro}-${i}`} className="border-t border-border py-2.5 first:border-t-0">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 break-words text-[13.5px] font-medium text-foreground">{p.bairro}</p>
                  <Link
                    to={rotaDosLeads(praca.region, { tipo: 'fora', nome: p.bairro, dias })}
                    data-touch-target=""
                    className={cn('inline-flex shrink-0 items-center gap-1 text-[13px] text-foreground', LINK)}
                    aria-label={`${p.leads} ${p.leads === 1 ? 'lead' : 'leads'} de ${p.bairro}: ver na lista de leads`}
                  >
                    <span className="font-croqui-num font-medium tabular-nums">{numero(p.leads)}</span>
                    <span>{p.leads === 1 ? 'lead' : 'leads'}</span>
                  </Link>
                </div>
                <p className="mt-0.5 text-xs text-croqui-soft">
                  {p.cidade || 'cidade não informada'}
                  {' · '}
                  <span className="font-croqui-num tabular-nums">{numero(p.agendados)}</span> {p.agendados === 1 ? 'agendado' : 'agendados'}
                  {p.ultimo_em ? <> · último em <span className="font-croqui-num tabular-nums">{data(p.ultimo_em)}</span></> : null}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Button type="button" variant="outline" size="sm" className="h-8 px-2.5 text-[13px]" onClick={() => aoAdicionar(p.bairro)} aria-label={`Adicionar ${p.bairro} ao foco`}>
                    <Plus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                    Adicionar ao foco
                  </Button>
                  {p.contato_exemplo ? (
                    <Link
                      to={rota(`/leads/${p.contato_exemplo}`)}
                      data-touch-target=""
                      className={cn('inline-flex items-center text-xs text-croqui-soft hover:text-foreground', LINK)}
                    >
                      ver um desses leads
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          {pedidos.length > PRIMEIROS && (
            <Button type="button" variant="ghost" size="sm" className="mt-1" onClick={() => setTodos((v) => !v)}>
              {todos ? `Mostrar só os ${PRIMEIROS} primeiros` : `Mostrar os ${pedidos.length}`}
            </Button>
          )}
        </>
      )}
    </Painel>
  );
}
