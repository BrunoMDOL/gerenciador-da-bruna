import { useSearchParams } from 'react-router-dom';
import { Workflow } from 'lucide-react';
import { Erro, Esqueleto, Vazio } from '@/gerenciador/componentes';
import { dataHora } from '@/gerenciador/lib/formatos';
import { lerDias, type Dias } from './chaves';
import { useResumoDaRegua } from './dados';
import { BlocoDoFup90, BlocoDoKanban, BlocoDosProgramados, BlocoDosRetornos } from './BlocosDaVisao';
import { DiagramaDaEscada } from './DiagramaDaEscada';
import { PausaGeral } from './PausaGeral';
import { SeletorDePeriodo } from './SeletorDePeriodo';
import { periodoEmBranco } from './regrasDaEscada';

/**
 * /regua: a régua inteira desenhada. A pausa geral fica no topo (é a
 * única coisa daqui que muda o que sai hoje); depois, cada parte com o que
 * aconteceu no período e o caminho até a aba que a edita.
 */
export default function Visao() {
  const [params, setParams] = useSearchParams();
  const dias = lerDias(params.get('dias'));
  const q = useResumoDaRegua(dias);

  const mudarDias = (d: Dias) => {
    const p = new URLSearchParams(params);
    if (d === 7) p.delete('dias');
    else p.set('dias', String(d));
    setParams(p, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SeletorDePeriodo dias={dias} aoMudar={mudarDias} />
        {q.data && (
          <p className="text-2xs text-croqui-soft">
            de {dataHora(q.data.periodo.de)} a {dataHora(q.data.periodo.ate)}, horário de Brasília
          </p>
        )}
      </div>

      {q.isPending ? (
        <div className="space-y-4" aria-busy="true">
          <Esqueleto linhas={3} />
          <Esqueleto linhas={6} />
          <Esqueleto linhas={4} />
        </div>
      ) : q.isError ? (
        <Erro mensagem={q.error.message} tentar={() => void q.refetch()} />
      ) : (
        <>
          <PausaGeral key={`${q.data.resumo.pausas?.pausado_em ?? 'livre'}-${q.data.resumo.pausas?.motivo ?? ''}`} pausas={q.data.resumo.pausas ?? null} />
          {periodoEmBranco(q.data.resumo) ? (
            <>
              <Vazio
                Icone={Workflow}
                titulo={`Nada saiu da régua nos últimos ${dias} dias`}
                descricao="Nem toque da escada, nem retorno, nem envio da FUP90, e nenhum retorno esperando. Veja se a pausa geral acima ou o interruptor da campanha na aba FUP90 estão desligados, ou abra um período maior."
                className="rounded-md border border-border bg-card"
              />
              {/* O que não depende do período continua à vista: os programados à espera, a FUP90 e o kanban. */}
              <BlocoDosProgramados programados={q.data.resumo.programados} />
            </>
          ) : (
            <>
              <DiagramaDaEscada escada={q.data.resumo.escada ?? []} pausada={Boolean(q.data.resumo.pausas?.escada_pausada)} />
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start">
                <BlocoDosRetornos retornos={q.data.resumo.retornos} pausados={Boolean(q.data.resumo.pausas?.retornos_pausados)} />
                <BlocoDosProgramados programados={q.data.resumo.programados} />
              </div>
            </>
          )}
          <BlocoDoFup90 campanha={q.data.resumo.campanha} fup90={q.data.resumo.fup90} inscricoes={q.data.resumo.fup90_inscricoes} />
          <BlocoDoKanban kanban={q.data.resumo.kanban} />
        </>
      )}
    </div>
  );
}
