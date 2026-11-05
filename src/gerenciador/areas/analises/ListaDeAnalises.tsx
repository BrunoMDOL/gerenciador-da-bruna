import type { ReactNode } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FlaskConical, Lightbulb, type LucideIcon } from 'lucide-react';
import { Cota } from '@/components/croqui/Cota';
import { FaixaDeAbas } from '@/components/croqui/FaixaDeAbas';
import { Erro, Esqueleto, Pagina, Painel, Vazio } from '@/gerenciador/componentes';
import { dataHora, numero } from '@/gerenciador/lib/formatos';
import { useDeOndeVeio } from '@/gerenciador/lib/voltar';
import { cn } from '@/lib/utils';
import { AgendaSemanal } from './AgendaSemanal';
import { PendenciaDaChave } from './PendenciaDaChave';
import { RodarAgora } from './RodarAgora';
import { StatusDaAnalise } from './StatusDaAnalise';
import { Sugestoes } from './Sugestoes';
import {
  CHAVE, contarAchados, contarSugestoesPorAnalise, custoLegivel, emAndamento, lerSugestoesPendentes, listarAnalises, NOME_DO_TIPO, periodoLegivel, porQuem,
  resumoDasSugestoes,
} from './dados';
import { usePedirAnalise } from './usePedirAnalise';
import type { AnaliseDaLista, ContagemDeSugestoes } from './tipos';
import { rota } from '@/gerenciador/lib/rotas';

type NomeDaAba = 'analises' | 'sugestoes';

function Aba({ ativa, onClick, Icone, children }: { ativa: boolean; onClick: () => void; Icone: LucideIcon; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={ativa ? 'page' : undefined}
      className={cn(
        'relative inline-flex h-10 items-center gap-1.5 whitespace-nowrap px-3 text-sm transition-colors',
        ativa ? 'font-semibold text-foreground' : 'font-medium text-croqui-soft hover:text-foreground',
      )}
    >
      <Icone className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
      {children}
      {ativa && <Cota tom="caneta" className="absolute inset-x-2 bottom-0 h-2" />}
    </button>
  );
}

/**
 * /analises: as rodadas da análise (semanal e sob demanda) com a agenda
 * ao lado, e a aba de sugestões pendentes de qualquer origem.
 */
export function ListaDeAnalises() {
  const [params, setParams] = useSearchParams();
  const aba: NomeDaAba = params.get('aba') === 'sugestoes' ? 'sugestoes' : 'analises';
  const trocarAba = (nova: NomeDaAba) => {
    const p = new URLSearchParams(params);
    if (nova === 'analises') p.delete('aba'); else p.set('aba', nova);
    setParams(p, { replace: true });
  };

  const { pedir, ocupado, chaveAusente, limparChaveAusente } = usePedirAnalise();
  const lista = useQuery({
    queryKey: CHAVE.lista,
    queryFn: listarAnalises,
    refetchInterval: (q) => ((q.state.data ?? []).some((a) => emAndamento(a.status)) ? 5000 : false),
  });
  // A contagem lê só as sugestões das rodadas listadas (até 100), e só na aba que mostra a tabela.
  const ids = (lista.data ?? []).map((a) => a.id);
  const contagem = useQuery({
    queryKey: [...CHAVE.contagem, ids],
    queryFn: () => contarSugestoesPorAnalise(ids),
    enabled: aba === 'analises' && ids.length > 0,
    placeholderData: keepPreviousData,
  });
  const pendentes = useQuery({ queryKey: CHAVE.sugestoesPendentes, queryFn: lerSugestoesPendentes });
  const rodando = (lista.data ?? []).some((a) => emAndamento(a.status));

  return (
    <Pagina
      rotulo="Gerenciador · Análises"
      titulo="Análises"
      descricao="A leitura semanal (ou quando você pedir) dos leads, das conversas e do comportamento da Bruna, com sugestões para aprovar e aplicar daqui mesmo."
      acoes={<RodarAgora pedir={pedir} ocupado={ocupado} rodando={rodando} />}
    >
      {chaveAusente && <PendenciaDaChave aoFechar={limparChaveAusente} className="mb-6" />}

      <FaixaDeAbas ativa={aba} className="mb-6 border-b border-border">
        <Aba ativa={aba === 'analises'} onClick={() => trocarAba('analises')} Icone={FlaskConical}>Análises</Aba>
        <Aba ativa={aba === 'sugestoes'} onClick={() => trocarAba('sugestoes')} Icone={Lightbulb}>
          Sugestões
          {pendentes.data && pendentes.data.length > 0 && (
            <span className="font-croqui-num text-[13px] font-semibold tabular-nums text-croqui-red-text" aria-label={`${pendentes.data.length} pendentes`}>
              {pendentes.data.length}
            </span>
          )}
        </Aba>
      </FaixaDeAbas>

      {aba === 'sugestoes' ? (
        <Sugestoes />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <Painel titulo="Rodadas" nota={lista.data ? `${numero(lista.data.length)} ${lista.data.length === 1 ? 'análise' : 'análises'}` : undefined} semRecheio>
            {lista.isPending ? (
              <Esqueleto linhas={5} className="p-4" />
            ) : lista.isError ? (
              <div className="p-4"><Erro mensagem={lista.error.message} tentar={() => void lista.refetch()} /></div>
            ) : lista.data.length === 0 ? (
              <Vazio
                Icone={FlaskConical}
                titulo="Nenhuma análise ainda"
                descricao="Rode a primeira agora, com os últimos 7, 14 ou 30 dias, ou deixe a agenda semanal ao lado cuidar disso."
                acao={<RodarAgora pedir={pedir} ocupado={ocupado} />}
              />
            ) : (
              <TabelaDeAnalises analises={lista.data} contagem={contagem.data} />
            )}
          </Painel>
          <AgendaSemanal />
        </div>
      )}
    </Pagina>
  );
}

function TabelaDeAnalises({ analises, contagem }: { analises: AnaliseDaLista[]; contagem?: Record<number, ContagemDeSugestoes> }) {
  const navigate = useNavigate();
  const deOndeVeio = useDeOndeVeio();
  const abrir = (id: number) => navigate(rota(`/analises/${id}`), { state: deOndeVeio });
  const th = 'px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-[0.1em] text-croqui-soft';
  const td = 'px-3 py-3 align-top text-[13px]';

  return (
    <>
      {/*
        Tabela só a partir de 1280px: ao lado da agenda, abaixo disso ela não
        cabe e viraria rolagem dentro do painel. O tipo vai junto do número e
        o modelo (quase sempre o mesmo) só aparece com folga, a partir de 1536px.
      */}
      <div className="hidden overflow-x-auto xl:block">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className={th}>Quando</th>
            <th scope="col" className={th}>Período</th>
            <th scope="col" className={th}>Status</th>
            <th scope="col" className={cn(th, 'text-right')}>Achados</th>
            <th scope="col" className={th}>Sugestões</th>
            <th scope="col" className={cn(th, 'hidden 2xl:table-cell')}>Modelo</th>
            <th scope="col" className={cn(th, 'text-right')}>Custo</th>
          </tr>
        </thead>
        <tbody>
          {analises.map((a) => {
            const custo = custoLegivel(a.custo_usd);
            const quem = porQuem(a);
            return (
              <tr key={a.id} className="cursor-pointer border-b border-border last:border-b-0 hover:bg-accent/60" onClick={() => abrir(a.id)}>
                <td className={td}>
                  <div className="whitespace-nowrap">
                    <Link
                      to={rota(`/analises/${a.id}`)}
                      state={deOndeVeio}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-foreground underline decoration-croqui-rule underline-offset-4 hover:decoration-croqui-red"
                    >
                      nº {a.id}
                    </Link>
                    <span className="text-croqui-soft" aria-hidden> · </span>
                    <span className="text-foreground">{NOME_DO_TIPO[a.tipo] ?? a.tipo}</span>
                  </div>
                  <div className="font-data text-2xs text-croqui-soft">{dataHora(a.criado_em)}</div>
                  {quem && <div className="max-w-[12rem] truncate text-2xs text-croqui-soft" title={quem}>{quem}</div>}
                </td>
                <td className={cn(td, 'font-data whitespace-nowrap text-foreground')}>{periodoLegivel(a.periodo_inicio, a.periodo_fim)}</td>
                <td className={td}><StatusDaAnalise status={a.status} erro={a.erro} /></td>
                <td className={cn(td, 'font-data text-right text-foreground')}>{a.status === 'concluida' ? numero(contarAchados(a)) : '—'}</td>
                <td className={cn(td, 'font-data text-foreground')}>{resumoDasSugestoes(contagem?.[a.id])}</td>
                <td className={cn(td, 'hidden text-croqui-soft 2xl:table-cell')}>{a.modelo ?? '—'}</td>
                <td className={cn(td, 'font-data text-right text-foreground')}>{custo ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>

      {/* Até 1280px: lista de cartões */}
      <ul className="divide-y divide-border xl:hidden">
        {analises.map((a) => {
          const custo = custoLegivel(a.custo_usd);
          const sugestoes = resumoDasSugestoes(contagem?.[a.id]);
          return (
            <li key={a.id}>
              <Link to={rota(`/analises/${a.id}`)} state={deOndeVeio} className="block px-4 py-3 hover:bg-accent/60">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-foreground">nº {a.id} <span className="font-normal text-croqui-soft">· {NOME_DO_TIPO[a.tipo] ?? a.tipo}</span></span>
                  <StatusDaAnalise status={a.status} erro={a.erro} />
                </div>
                <div className="mt-1 font-data text-[13px] text-foreground">{periodoLegivel(a.periodo_inicio, a.periodo_fim)}</div>
                <div className="mt-1 flex flex-wrap gap-x-3 font-data text-2xs text-croqui-soft">
                  <span>{dataHora(a.criado_em)}</span>
                  {a.status === 'concluida' && <span>{numero(contarAchados(a))} achados</span>}
                  {/* Sem sugestão, o cartão não mostra um traço solto. */}
                  {sugestoes !== '—' && <span>{sugestoes}</span>}
                  {custo && <span>{custo}</span>}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
