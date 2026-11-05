import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { data, nomeCurto, numero } from '@/gerenciador/lib/formatos';
import { cn } from '@/lib/utils';
import type { LeadQueMuda, Simulacao, SituacaoDoLead } from './tipos';
import { rota } from '@/gerenciador/lib/rotas';

const VISIVEIS = 20;
const LINK = 'underline decoration-croqui-rule underline-offset-4 hover:decoration-foreground';

/**
 * O que a simulação do banco respondeu: quantos leads recentes têm bairro
 * parecido, quantos passam a foco, deixam o foco ou trocam de nome, e quem.
 * Quando há candidatos demais, o banco confere só os mais recentes (parcial):
 * a tela diz que as contas são desses. Os leads abrem em outra aba para o
 * diálogo não se perder.
 */
export function EfeitoDaMudanca({ simulacao, dias, className }: { simulacao: Simulacao; dias: number; className?: string }) {
  const [todos, setTodos] = useState(false);
  const mudam = simulacao.mudam ?? [];
  const candidatos = simulacao.candidatos ?? 0;
  const parcial = Boolean(simulacao.parcial);
  const avaliados = simulacao.avaliados ?? candidatos;
  const total = (simulacao.passam_a_foco ?? 0) + (simulacao.deixam_foco ?? 0) + (simulacao.trocam_nome ?? 0);
  const visiveis = todos ? mudam : mudam.slice(0, VISIVEIS);

  return (
    <section aria-label="Efeito nos leads" className={cn('space-y-3 rounded-md border border-border px-3 py-3', className)}>
      <p className="text-[13px] leading-relaxed text-croqui-soft">
        {candidatos === 0 ? (
          <>Nenhum lead dos últimos {dias} dias tem bairro parecido.</>
        ) : parcial ? (
          <>
            Dos <Numero>{numero(candidatos)}</Numero> leads dos últimos {dias} dias com bairro parecido, os{' '}
            <Numero>{numero(avaliados)}</Numero> mais recentes foram conferidos; as contas abaixo são desses.
          </>
        ) : (
          <>
            <Numero>{numero(candidatos)}</Numero>{' '}
            {candidatos === 1
              ? `lead dos últimos ${dias} dias com bairro parecido foi conferido.`
              : `leads dos últimos ${dias} dias com bairro parecido foram conferidos.`}
          </>
        )}
      </p>

      <dl className="grid grid-cols-3 gap-2">
        <Contagem rotulo="passam a foco" valor={simulacao.passam_a_foco} />
        <Contagem rotulo="deixam o foco" valor={simulacao.deixam_foco} caneta={simulacao.deixam_foco > 0} />
        <Contagem rotulo="trocam de nome" valor={simulacao.trocam_nome} />
      </dl>

      {total === 0 ? (
        <p className="text-[13px] text-foreground">{parcial ? 'Nenhum dos conferidos muda de situação.' : 'Nenhum lead recente muda de situação.'}</p>
      ) : (
        <div>
          <ul className="divide-y divide-border">
            {visiveis.map((l) => <LinhaDoLead key={l.contato_id} lead={l} />)}
          </ul>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-2xs text-croqui-soft">
            {mudam.length < total && (
              <span>
                O banco devolve até {mudam.length} leads; a conta acima é {parcial ? `dos ${numero(avaliados)} conferidos` : 'de todos'}.
              </span>
            )}
            {mudam.length > VISIVEIS && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setTodos((v) => !v)}>
                {todos ? `Mostrar só ${VISIVEIS}` : `Mostrar os ${mudam.length}`}
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Numero({ children }: { children: ReactNode }) {
  return <span className="font-croqui-num font-medium tabular-nums text-foreground">{children}</span>;
}

function Contagem({ rotulo, valor, caneta }: { rotulo: string; valor: number; caneta?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-2xs text-croqui-soft">{rotulo}</dt>
      <dd className={cn('font-croqui-num text-xl font-semibold leading-none tabular-nums', caneta ? 'text-croqui-red-text' : 'text-foreground')}>
        {numero(valor ?? 0)}
      </dd>
    </div>
  );
}

function LinhaDoLead({ lead }: { lead: LeadQueMuda }) {
  const nome = lead.nome?.trim() ? nomeCurto(lead.nome) : `Lead ${lead.contato_id}`;
  const onde = [lead.bairro, lead.cidade].filter(Boolean).join(', ');
  return (
    <li className="flex flex-col gap-1 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
      <div className="min-w-0 text-[13px]">
        <Link
          to={rota(`/leads/${lead.contato_id}`)}
          target="_blank"
          rel="noreferrer"
          data-touch-target=""
          className={cn('inline-flex items-center font-medium text-foreground', LINK)}
        >
          {nome}
          <span className="sr-only"> (abre em outra aba)</span>
        </Link>
        <span className="ml-1.5 text-croqui-soft">{onde || 'sem bairro'}</span>
        <span className="ml-1.5 whitespace-nowrap text-2xs text-croqui-soft">chegou em <span className="font-croqui-num tabular-nums">{data(lead.criado_em)}</span></span>
      </div>
      <p className="flex shrink-0 flex-wrap items-center gap-1 text-xs">
        <span className="sr-only">antes:</span>
        <Situacao s={lead.antes} />
        <ArrowRight className="h-3 w-3 text-croqui-soft" strokeWidth={1.75} aria-hidden />
        <span className="sr-only">depois:</span>
        <Situacao s={lead.depois} forte />
      </p>
    </li>
  );
}

function Situacao({ s, forte }: { s: SituacaoDoLead; forte?: boolean }) {
  if (!s?.foco) return <span className={forte ? 'text-foreground' : 'text-croqui-soft'}>fora do foco</span>;
  return (
    <span className={forte ? 'text-foreground' : 'text-croqui-soft'}>
      foco: <span className={forte ? 'font-medium' : undefined}>{s.nome ?? '—'}</span>
    </span>
  );
}
