import { useParams } from 'react-router-dom';
import { ListaDeLeads } from './ListaDeLeads';
import { LeadDetalhe } from './LeadDetalhe';

/**
 * /leads: a lista com busca e filtros; /leads/:contatoId: o lead
 * inteiro (conversa, estado da Bruna e linha do tempo) com as ações do gestor.
 */
export default function Leads() {
  const { contatoId } = useParams();
  // A chave remonta o detalhe ao trocar de lead: abas, busca na conversa e linha do tempo começam do zero.
  if (contatoId !== undefined) return <LeadDetalhe key={contatoId} contatoIdBruto={contatoId} />;
  return <ListaDeLeads />;
}
