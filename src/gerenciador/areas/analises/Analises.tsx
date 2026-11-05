import { useParams } from 'react-router-dom';
import { DetalheDaAnalise } from './DetalheDaAnalise';
import { ListaDeAnalises } from './ListaDeAnalises';

/**
 * Análises: a leitura semanal (e sob demanda) dos leads, das conversas e do
 * comportamento da Bruna, com sugestões que o gestor aprova e aplica daqui.
 * /analises lista as rodadas e as sugestões; /analises/:analiseId
 * abre uma rodada.
 */
export default function Analises() {
  const { analiseId } = useParams();
  if (analiseId === undefined) return <ListaDeAnalises />;
  const id = Number(analiseId);
  return <DetalheDaAnalise key={analiseId} id={Number.isInteger(id) && id > 0 ? id : 0} />;
}
