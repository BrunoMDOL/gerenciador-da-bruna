import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pagina } from '@/gerenciador/componentes';
import { periodoDosUltimos } from '@/gerenciador/lib/db';
import { data } from '@/gerenciador/lib/formatos';
import { lerDias, type Dias } from './dados';
import { SeletorDePeriodo } from './SeletorDePeriodo';
import { PausaDaRegua } from './PausaDaRegua';
import { Medidas } from './Medidas';
import { Alertas } from './Alertas';
import { SerieDiaria } from './SerieDiaria';
import { PorPraca } from './PorPraca';
import { ErrosDoPeriodo } from './ErrosDoPeriodo';
import { ReguaResumo } from './ReguaResumo';
import { DependeDoDono } from './DependeDoDono';
import { Atalhos } from './Atalhos';

/**
 * A primeira tela do gerenciador: como a Bruna está no período (7, 14 ou 30
 * dias, guardado em ?dias=) e o caminho até onde cada número se explica.
 * Cada bloco busca o que precisa e mostra o próprio carregando, vazio e erro,
 * para que uma RPC que falhe não apague as outras.
 */
export default function VisaoGeral() {
  const [params, setParams] = useSearchParams();
  const dias = lerDias(params.get('dias'));
  const periodo = useMemo(() => periodoDosUltimos(dias), [dias]);

  const mudarDias = (d: Dias) => {
    setParams(
      (anterior) => {
        const p = new URLSearchParams(anterior);
        p.set('dias', String(d));
        return p;
      },
      { replace: true },
    );
  };

  return (
    <Pagina
      rotulo="Gerenciador · Visão geral"
      titulo="Como a Bruna está"
      descricao={`Últimos ${dias} dias (${data(periodo.de)} a ${data(periodo.ate)}), comparados com os ${dias} dias anteriores. Horário de Brasília.`}
      acoes={<SeletorDePeriodo dias={dias} aoMudar={mudarDias} />}
    >
      <div className="space-y-4 lg:space-y-5">
        <PausaDaRegua dias={dias} />
        <Medidas dias={dias} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          <Alertas dias={dias} className="lg:col-span-5" />
          <SerieDiaria dias={dias} className="lg:col-span-7" />
          <PorPraca dias={dias} className="lg:col-span-4" />
          <ErrosDoPeriodo dias={dias} className="lg:col-span-4" />
          <ReguaResumo dias={dias} className="lg:col-span-4" />
          <DependeDoDono className="lg:col-span-12" />
          <Atalhos className="lg:col-span-12" />
        </div>
      </div>
    </Pagina>
  );
}
