import { useLocation } from 'react-router-dom';

// O "← LEADS" e o "← ANÁLISES" do detalhe voltam para a lista como o gestor a
// deixou (busca, praça, filtro, recorte, aba): a lista passa o próprio
// endereço no state do link, e o detalhe o lê. Sem state (link colado, alerta,
// outra área), volta para a lista limpa.

export interface DeOndeVeio {
  de: string;
}

/** O state para o link que sai da lista: o endereço dela, com a busca. */
export function useDeOndeVeio(): DeOndeVeio {
  const { pathname, search } = useLocation();
  return { de: `${pathname}${search}` };
}

/** O destino do "voltar" do detalhe: a lista de onde o gestor veio, se veio dela; senão, a lista limpa. */
export function useVoltarPara(lista: string, rotulo: string): { para: string; rotulo: string } {
  const { state } = useLocation();
  const de = (state as Partial<DeOndeVeio> | null)?.de;
  const daLista = typeof de === 'string' && (de === lista || de.startsWith(`${lista}?`));
  return { para: daLista ? de : lista, rotulo };
}
