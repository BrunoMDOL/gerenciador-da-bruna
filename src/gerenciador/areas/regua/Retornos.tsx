import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CalendarClock, CalendarX, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Erro, Esqueleto, Painel, Pilula, Vazio } from '@/gerenciador/componentes';
import { dataHora, nomeCurto, nomeDaRegiao, numero, relativo, telefoneLegivel } from '@/gerenciador/lib/formatos';
import { cn } from '@/lib/utils';
import { CancelarRetorno } from './CancelarRetorno';
import { contarRetornos, estaAtrasado, useRetornosPendentes, useRetornosRecentes, LIMITE_DE_PENDENTES } from './dados';
import { CHIP, CHIP_ATIVO, CHIP_REPOUSO, LINK, NOTA, NUM } from './estilos';
import { rotaDoLead } from './rotas';
import { motivoDoCancelamento, naRegiao, siglaDaPraca, textoDeQuemPrometeu, textoDoEsperando } from './textos';
import type { RetornoComLead } from './tipos';

const PASSO = 50;
const ORDEM_DAS_PRACAS = ['sp', 'rj', 'goiania', 'brasil', 'brasil2'];

function regiaoDoRetorno(r: RetornoComLead): string {
  return r.region ?? r.lead?.region ?? '';
}

function Lead({ r }: { r: RetornoComLead }) {
  return (
    <span className="min-w-0">
      <Link to={rotaDoLead(r.contato_id)} className={cn(LINK, 'font-medium text-foreground')}>
        {r.lead ? nomeCurto(r.lead.user_name, r.lead.user_number) : `lead ${r.contato_id}`}
      </Link>
      {r.lead?.user_number && <span className={cn(NUM, 'block text-2xs text-croqui-soft')}>{telefoneLegivel(r.lead.user_number)}</span>}
    </span>
  );
}

function Quando({ quando, agora }: { quando: string; agora: Date }) {
  const atrasado = estaAtrasado(quando, agora);
  return (
    <span className={cn('inline-flex flex-col', atrasado ? 'text-croqui-red-text' : 'text-foreground')}>
      <span className={cn(NUM, 'inline-flex items-center gap-1')}>
        {atrasado && <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />}
        {dataHora(quando)}
      </span>
      <span className="text-2xs">{atrasado ? `atrasado · ${relativo(quando, agora)}` : relativo(quando, agora)}</span>
    </span>
  );
}

function Detalhes({ r }: { r: RetornoComLead }) {
  return (
    <span className="text-2xs text-croqui-soft">
      prometido {textoDeQuemPrometeu(r.quem_prometeu)} · esperando {textoDoEsperando(r.esperando)}
      {r.data_do_cliente ? ' · data dada pelo cliente' : ''}
      {r.tentativas > 0 ? <> · <span className={NUM}>{r.tentativas}</span> {r.tentativas === 1 ? 'tentativa' : 'tentativas'}</> : null}
    </span>
  );
}

function ListaDePendentes({ linhas, agora, aoCancelar }: { linhas: RetornoComLead[]; agora: Date; aoCancelar: (r: RetornoComLead) => void }) {
  return (
    <>
      <table className="hidden w-full text-[13px] md:table">
        <thead>
          <tr className="border-b border-border text-left text-2xs uppercase tracking-[0.1em] text-croqui-soft">
            <th scope="col" className="px-4 py-2 font-medium">Lead</th>
            <th scope="col" className="px-2 py-2 font-medium">Praça</th>
            <th scope="col" className="px-2 py-2 font-medium">Quando</th>
            <th scope="col" className="px-2 py-2 font-medium">Motivo</th>
            <th scope="col" className="px-4 py-2"><span className="sr-only">Ação</span></th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((r) => (
            <tr key={r.id} className="border-b border-border align-top last:border-0">
              <td className="px-4 py-2.5"><Lead r={r} /></td>
              <td className="px-2 py-2.5"><span className="text-2xs font-semibold" title={nomeDaRegiao(regiaoDoRetorno(r))}>{siglaDaPraca(regiaoDoRetorno(r))}</span></td>
              <td className="whitespace-nowrap px-2 py-2.5"><Quando quando={r.quando} agora={agora} /></td>
              <td className="px-2 py-2.5">
                <p className="max-w-[48ch] text-foreground">{r.motivo || '—'}</p>
                <Detalhes r={r} />
              </td>
              <td className="px-4 py-2 text-right">
                <Button size="sm" variant="outline" onClick={() => aoCancelar(r)} aria-label={`Cancelar o retorno de ${r.lead ? nomeCurto(r.lead.user_name, r.lead.user_number) : `lead ${r.contato_id}`}`}>
                  <X className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Cancelar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="divide-y divide-border md:hidden">
        {linhas.map((r) => (
          <li key={r.id} className="space-y-1.5 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <Lead r={r} />
              <span className="shrink-0 text-2xs font-semibold" title={nomeDaRegiao(regiaoDoRetorno(r))}>{siglaDaPraca(regiaoDoRetorno(r))}</span>
            </div>
            <Quando quando={r.quando} agora={agora} />
            <p className="text-[13px] text-foreground">{r.motivo || '—'}</p>
            <Detalhes r={r} />
            <div>
              <Button size="sm" variant="outline" className="h-10" onClick={() => aoCancelar(r)} aria-label={`Cancelar o retorno de ${r.lead ? nomeCurto(r.lead.user_name, r.lead.user_number) : `lead ${r.contato_id}`}`}>
                <X className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Cancelar
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function Recentes() {
  const q = useRetornosRecentes();
  return (
    <Painel titulo="Últimos enviados e cancelados" semRecheio>
      {q.isPending ? (
        <Esqueleto linhas={4} className="p-4" />
      ) : q.isError ? (
        <div className="p-4"><Erro mensagem={q.error.message} tentar={() => void q.refetch()} /></div>
      ) : q.data.length === 0 ? (
        <Vazio Icone={Send} titulo="Nenhum retorno enviado ou cancelado ainda" descricao="Quando a Bruna mandar ou cancelar um retorno combinado, ele aparece aqui." />
      ) : (
        <ul className="divide-y divide-border">
          {q.data.map((r) => {
            const enviado = Boolean(r.enviado_em);
            return (
              <li key={r.id} className="flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-start sm:gap-4">
                <span className="flex shrink-0 items-center gap-1.5 sm:w-[150px]">
                  {enviado ? <Send className="h-3.5 w-3.5 text-success" strokeWidth={1.75} aria-hidden /> : <CalendarX className="h-3.5 w-3.5 text-croqui-soft" strokeWidth={1.75} aria-hidden />}
                  <span className={cn(NUM, 'text-[13px]')}>{dataHora(enviado ? r.enviado_em : r.cancelado_em)}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <Lead r={r} />
                    <Pilula tom={enviado ? 'ok' : 'suave'}>{enviado ? 'enviado' : 'cancelado'}</Pilula>
                    <span className="text-2xs font-semibold">{siglaDaPraca(regiaoDoRetorno(r))}</span>
                  </span>
                  <span className="mt-0.5 block text-[13px] text-croqui-soft">
                    {enviado ? (r.motivo || 'sem motivo registrado') : motivoDoCancelamento(r.cancelado_motivo)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Painel>
  );
}

/**
 * /regua/retornos: os retornos prometidos pendentes (bruna_followups não
 * cumpridos e não cancelados), do mais antigo para o mais novo, com o
 * cancelamento; e os últimos que saíram ou caíram.
 */
export default function Retornos() {
  const q = useRetornosPendentes();
  const [params, setParams] = useSearchParams();
  const praca = params.get('praca') || null;
  const [mostrar, setMostrar] = useState(PASSO);
  const [cancelando, setCancelando] = useState<RetornoComLead | null>(null);
  const agora = new Date();

  const todas = useMemo(() => q.data?.linhas ?? [], [q.data]);
  const pracas = useMemo(() => {
    const presentes = new Set(todas.map(regiaoDoRetorno).filter(Boolean));
    return [...presentes].sort((a, b) => {
      const ia = ORDEM_DAS_PRACAS.indexOf(a), ib = ORDEM_DAS_PRACAS.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
    });
  }, [todas]);
  const filtradas = praca ? todas.filter((r) => regiaoDoRetorno(r) === praca) : todas;
  const contagem = contarRetornos(filtradas, agora);
  const visiveis = filtradas.slice(0, mostrar);

  const escolherPraca = (p: string | null) => {
    const novo = new URLSearchParams(params);
    if (p) novo.set('praca', p);
    else novo.delete('praca');
    setParams(novo, { replace: true });
    setMostrar(PASSO);
  };

  return (
    <div className="space-y-6">
      <Painel
        titulo="Pendentes"
        nota={q.data ? `${numero(contagem.pendentes)} ${contagem.pendentes === 1 ? 'retorno' : 'retornos'}${praca ? ` ${naRegiao(praca)}` : ''}` : undefined}
        semRecheio
      >
        {q.isPending ? (
          <Esqueleto linhas={6} className="p-4" />
        ) : q.isError ? (
          <div className="p-4"><Erro mensagem={q.error.message} tentar={() => void q.refetch()} /></div>
        ) : todas.length === 0 ? (
          <Vazio
            Icone={CalendarClock}
            titulo="Nenhum retorno prometido esperando"
            descricao="Quando a Bruna combinar de voltar a falar com um lead numa data (ou o cliente prometer avisar), o retorno aparece aqui até sair ou ser cancelado."
          />
        ) : (
          <>
            <div className="flex flex-col gap-3 border-b border-border px-4 py-3">
              <p className="text-[13px] text-foreground">
                <span className={cn(NUM, 'font-semibold', contagem.atrasados > 0 && 'text-croqui-red-text')}>{numero(contagem.atrasados)}</span>{' '}
                {contagem.atrasados === 1 ? 'atrasado' : 'atrasados'}
                {' · '}
                <span className={cn(NUM, 'font-semibold')}>{numero(contagem.hoje)}</span> ainda hoje
                {q.data.noLimite && <span className="text-croqui-soft"> · mostrando os {numero(LIMITE_DE_PENDENTES)} mais antigos</span>}
              </p>
              {pracas.length > 1 && (
                <div role="group" aria-label="Filtrar por praça" className="flex flex-wrap gap-1.5">
                  <button type="button" aria-pressed={!praca} onClick={() => escolherPraca(null)} className={cn(CHIP, !praca ? CHIP_ATIVO : CHIP_REPOUSO)}>
                    Todas
                  </button>
                  {pracas.map((p) => (
                    <button key={p} type="button" aria-pressed={praca === p} onClick={() => escolherPraca(p)} className={cn(CHIP, praca === p ? CHIP_ATIVO : CHIP_REPOUSO)}>
                      {nomeDaRegiao(p)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {filtradas.length === 0 ? (
              <Vazio
                Icone={CalendarClock}
                titulo={`Nenhum retorno pendente ${naRegiao(praca)}`}
                descricao="Escolha outra praça ou volte para Todas."
                acao={<Button variant="outline" onClick={() => escolherPraca(null)}>Ver todas as praças</Button>}
              />
            ) : (
              <>
                <ListaDePendentes linhas={visiveis} agora={agora} aoCancelar={setCancelando} />
                {filtradas.length > visiveis.length && (
                  <div className="border-t border-border px-4 py-3">
                    <Button variant="outline" onClick={() => setMostrar((m) => m + PASSO)}>
                      Mostrar mais {Math.min(PASSO, filtradas.length - visiveis.length)} (faltam {numero(filtradas.length - visiveis.length)})
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </Painel>
      <p className={NOTA}>
        Atrasado é o retorno cuja hora já passou: ele sai na próxima rodada entre 8 h e 20h59, até 3 tentativas. Cancelar aqui é para quando o
        retorno não faz mais sentido e a Bruna não viu (o banco já cancela sozinho quando o cliente responde, agenda ou manda o material).
      </p>
      <Recentes />
      <CancelarRetorno retorno={cancelando} aoFechar={() => setCancelando(null)} />
    </div>
  );
}
