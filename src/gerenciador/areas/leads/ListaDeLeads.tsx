import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Bot, BotOff, ChevronRight, Search, SearchX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Cota } from '@/components/croqui/Cota';
import { FaixaDeAbas } from '@/components/croqui/FaixaDeAbas';
import { Carregando, Erro, Pagina, Painel, Pilula, Vazio } from '@/gerenciador/componentes';
import { data, nomeCurto, nomeDaRegiao, relativo, telefoneLegivel } from '@/gerenciador/lib/formatos';
import { descreverRecorte, lerRecorte, type RecorteDoFoco } from '@/gerenciador/lib/recorte';
import type { FiltroDeLeads, LeadDaBusca } from '@/gerenciador/lib/tipos';
import { useDeOndeVeio } from '@/gerenciador/lib/voltar';
import { cn } from '@/lib/utils';
import { LIMITE_DA_BUSCA, useBuscaDeLeads } from './dados';
import { AUTOR, FILTROS, REGIOES_DA_BUSCA, deOndeEOLead, ehFiltro, ehRegiaoDaBusca, siglaDaRegiao } from './textos';
import { rota } from '@/gerenciador/lib/rotas';

const ESPERA_DA_BUSCA_MS = 300;

/**
 * /leads: busca por nome, telefone, bairro ou número do lead, praça e
 * filtros, tudo na URL (q, region, filtro) para a tela voltar igual. Tabela no
 * desktop, cartões no celular; clique leva ao lead.
 *
 * O recorte de Bairros foco (foco=<tipo>:<nome>, dias) chega dos números de
 * /bairros e traz os mesmos leads que o painel contou. Ele só vale com a
 * praça e só se combina com o filtro de agendados (a outra coluna do painel).
 */
export function ListaDeLeads() {
  const navigate = useNavigate();
  const deOndeVeio = useDeOndeVeio();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const regionBruta = params.get('region');
  const region: string = ehRegiaoDaBusca(regionBruta) ? regionBruta : '';
  const focoBruto = params.get('foco');
  const diasBruto = params.get('dias');
  const recorte: RecorteDoFoco | null = region ? lerRecorte(focoBruto, diasBruto) : null;
  const filtroBruto = params.get('filtro');
  const filtro: FiltroDeLeads | null = ehFiltro(filtroBruto) && (!recorte || filtroBruto === 'agendados') ? filtroBruto : null;

  const mudar = useCallback((patch: Record<string, string | null>) => {
    setParams((anterior) => {
      const proximo = new URLSearchParams(anterior);
      for (const [chave, valor] of Object.entries(patch)) {
        if (valor) proximo.set(chave, valor); else proximo.delete(chave);
      }
      return proximo;
    }, { replace: true });
  }, [setParams]);

  // Praça, filtro ou recorte que a busca não conhece (link antigo, arquitetos, recorte sem praça…) sai da URL em vez de deixar o seletor em branco.
  const regionInvalida = regionBruta !== null && !region;
  const filtroInvalido = filtroBruto !== null && !filtro;
  const recorteInvalido = (focoBruto !== null || diasBruto !== null) && !recorte;
  useEffect(() => {
    if (regionInvalida || filtroInvalido || recorteInvalido) {
      mudar({
        ...(regionInvalida ? { region: null } : {}),
        ...(filtroInvalido ? { filtro: null } : {}),
        ...(recorteInvalido ? { foco: null, dias: null } : {}),
      });
    }
  }, [regionInvalida, filtroInvalido, recorteInvalido, mudar]);

  // O campo responde na hora; a URL (e a busca) esperam 300 ms de pausa.
  const [texto, setTexto] = useState(q);
  const textoRef = useRef(texto);
  textoRef.current = texto;
  useEffect(() => { if (textoRef.current !== q) setTexto(q); }, [q]);
  useEffect(() => {
    if (texto === q) return;
    const t = setTimeout(() => mudar({ q: texto.trim() || null }), ESPERA_DA_BUSCA_MS);
    return () => clearTimeout(t);
  }, [texto, q, mudar]);

  const [limite, setLimite] = useState(LIMITE_DA_BUSCA);
  const chaveDoRecorte = recorte ? `${recorte.tipo}:${recorte.dias}:${recorte.nome}` : '';
  useEffect(() => { setLimite(LIMITE_DA_BUSCA); }, [q, region, filtro, chaveDoRecorte]);

  const busca = useBuscaDeLeads(q, region || null, filtro, limite, recorte);
  const tirarORecorte = () => mudar({ foco: null, dias: null });
  const leads = busca.data ?? [];
  const podeHaverMais = leads.length >= limite;

  return (
    <Pagina
      rotulo="Gerenciador · Leads"
      titulo="Leads"
      descricao="Busque um lead, leia a conversa inteira e ajuste o atendimento dele sem mexer nos outros."
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-croqui-soft" strokeWidth={1.75} aria-hidden />
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Nome, telefone, bairro ou nº do lead"
            aria-label="Buscar lead"
            className="h-9 pl-9 pr-9 text-sm"
          />
          {texto && (
            <button
              type="button"
              aria-label="Limpar a busca"
              onClick={() => { setTexto(''); mudar({ q: null }); }}
              className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-croqui-soft hover:text-foreground"
            >
              <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </button>
          )}
        </div>
        <Select value={region || 'todas'} onValueChange={(v) => mudar({ region: v === 'todas' ? null : v, foco: null, dias: null })}>
          <SelectTrigger className="h-9 w-full sm:w-52" aria-label="Praça">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as praças</SelectItem>
            {REGIOES_DA_BUSCA.map((r) => (
              <SelectItem key={r} value={r}>{nomeDaRegiao(r)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {recorte && <AvisoDoRecorte recorte={recorte} region={region} aoTirar={tirarORecorte} />}

      <FaixaDeAbas ativa={filtro ?? 'todos'} className="mt-3 border-b border-border">
        <Chip ativo={filtro === null} onClick={() => mudar({ filtro: null })}>Todos</Chip>
        {(recorte ? FILTROS.filter((f) => f.valor === 'agendados') : FILTROS).map((f) => (
          <Chip key={f.valor} ativo={filtro === f.valor} titulo={f.descricao} onClick={() => mudar({ filtro: f.valor })}>{f.rotulo}</Chip>
        ))}
      </FaixaDeAbas>

      <Painel
        className="mt-4"
        semRecheio
        titulo={busca.isPending ? 'Leads' : `${leads.length} ${leads.length === 1 ? 'lead' : 'leads'}`}
        nota={
          busca.isPending ? undefined
            : busca.isFetching ? 'atualizando…'
            : podeHaverMais ? `os ${limite} com mensagem mais recente; pode haver mais`
            : leads.length ? 'ordenados pela última mensagem'
            : undefined
        }
      >
        {busca.isPending ? (
          <Carregando texto="Buscando leads" />
        ) : busca.isError ? (
          <div className="p-4"><Erro mensagem={busca.error.message} tentar={() => busca.refetch()} /></div>
        ) : leads.length === 0 && recorte ? (
          <Vazio
            Icone={SearchX}
            titulo="Nenhum lead nesse recorte"
            descricao={q ? 'A busca vale dentro do recorte: tire a busca ou o recorte.' : 'Tire o recorte para ver todos os leads da praça.'}
            acao={<Button variant="outline" size="sm" onClick={tirarORecorte}>Tirar o recorte</Button>}
          />
        ) : leads.length === 0 ? (
          <Vazio
            Icone={SearchX}
            titulo="Nenhum lead com essa busca"
            descricao={q || filtro || region ? 'Tente outro nome ou telefone, troque a praça ou tire o filtro.' : 'Digite um nome, um telefone ou o número do lead.'}
            acao={(q || filtro || region) ? <Button variant="outline" size="sm" onClick={() => { setTexto(''); mudar({ q: null, filtro: null, region: null, foco: null, dias: null }); }}>Limpar busca e filtros</Button> : undefined}
          />
        ) : (
          <>
            <table className="hidden w-full text-sm sm:table">
              <thead>
                <tr className="text-left text-2xs font-medium uppercase tracking-[0.1em] text-croqui-soft">
                  <th scope="col" className="px-4 py-2.5 font-medium">Lead</th>
                  <th scope="col" className="px-2 py-2.5 font-medium">Praça</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Última mensagem</th>
                  <th scope="col" className="px-2 py-2.5 font-medium">Bruna</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Marcadores</th>
                  <th scope="col" className="w-8 px-2 py-2.5"><span className="sr-only">Abrir</span></th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => navigate(rota(`/leads/${lead.id}`), { state: deOndeVeio })}
                    className="cursor-pointer border-t border-border transition-colors hover:bg-accent/60"
                  >
                    <td className="px-4 py-3 align-top">
                      <Link
                        to={rota(`/leads/${lead.id}`)}
                        state={deOndeVeio}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-foreground underline decoration-croqui-rule underline-offset-4 hover:decoration-foreground"
                      >
                        {nomeCurto(lead.user_name, lead.user_number)}
                      </Link>
                      <div className="mt-0.5 font-croqui-num text-xs tabular-nums text-croqui-soft">{telefoneLegivel(lead.user_number)}</div>
                    </td>
                    <td className="px-2 py-3 align-top">
                      <span className="text-2xs font-semibold tracking-[0.08em] text-foreground" title={nomeDaRegiao(lead.region)}>{siglaDaRegiao(lead.region)}</span>
                    </td>
                    <td className="max-w-[28rem] px-4 py-3 align-top">
                      <UltimaMensagem lead={lead} />
                    </td>
                    <td className="px-2 py-3 align-top"><PilulaDaBruna status={lead.status} /></td>
                    <td className="px-4 py-3 align-top"><Marcadores lead={lead} /></td>
                    <td className="px-2 py-3 align-top text-croqui-soft"><ChevronRight className="h-4 w-4" strokeWidth={1.75} aria-hidden /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="sm:hidden">
              {leads.map((lead) => (
                <li key={lead.id} className="border-t border-border first:border-t-0">
                  <Link to={rota(`/leads/${lead.id}`)} state={deOndeVeio} className="block px-4 py-3 active:bg-accent/60">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate font-medium text-foreground">{nomeCurto(lead.user_name, lead.user_number)}</span>
                      <span className="shrink-0 text-2xs font-semibold tracking-[0.08em] text-foreground">{siglaDaRegiao(lead.region)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-3 font-croqui-num text-xs tabular-nums text-croqui-soft">
                      <span>{telefoneLegivel(lead.user_number)}</span>
                      <span>{relativo(lead.last_message_at)}</span>
                    </div>
                    {lead.ultima_mensagem && (
                      <p className="mt-1 line-clamp-2 text-[13px] text-croqui-soft">
                        {lead.ultimo_autor && <span className="font-medium text-foreground">{AUTOR[lead.ultimo_autor] ?? lead.ultimo_autor}: </span>}
                        {lead.ultima_mensagem}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      <PilulaDaBruna status={lead.status} />
                      <Marcadores lead={lead} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {podeHaverMais && (
              <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-[13px] text-croqui-soft">
                <span>Mostrando {leads.length}. A busca traz os mais recentes primeiro.</span>
                <Button variant="outline" size="sm" onClick={() => setLimite((l) => l + LIMITE_DA_BUSCA)} disabled={busca.isFetching}>
                  Mostrar mais {LIMITE_DA_BUSCA}
                </Button>
              </div>
            )}
          </>
        )}
      </Painel>
    </Pagina>
  );
}

/** O recorte de Bairros foco: o que a lista mostra, o caminho de volta e o jeito de tirar. */
function AvisoDoRecorte({ recorte, region, aoTirar }: { recorte: RecorteDoFoco; region: string; aoTirar: () => void }) {
  return (
    <section aria-label="Recorte de Bairros foco" className="mt-3 flex flex-col gap-2 border-y border-border py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 text-[13px] leading-relaxed">
        <p className="break-words font-medium text-foreground">{descreverRecorte(recorte)}</p>
        <p className="text-croqui-soft">A mesma conta da lista de Bairros foco {deOndeEOLead(region)}.</p>
      </div>
      <div className="-ml-3 flex shrink-0 flex-wrap items-center gap-1 sm:ml-0">
        <Button asChild variant="ghost" size="sm">
          <Link to={rota(`/bairros?${new URLSearchParams({ praca: region }).toString()}`)}>Ver em Bairros foco</Link>
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={aoTirar}>Tirar o recorte</Button>
      </div>
    </section>
  );
}

function Chip({ ativo, onClick, titulo, children }: { ativo: boolean; onClick: () => void; titulo?: string; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      aria-current={ativo ? 'page' : undefined}
      title={titulo}
      onClick={onClick}
      className={cn(
        'relative flex h-10 shrink-0 items-center whitespace-nowrap px-3 text-[13.5px] transition-colors',
        ativo ? 'font-semibold text-foreground' : 'font-medium text-croqui-soft hover:text-foreground',
      )}
    >
      {children}
      {ativo && <Cota tom="caneta" className="absolute inset-x-1 bottom-0 h-2" />}
    </button>
  );
}

function UltimaMensagem({ lead }: { lead: LeadDaBusca }) {
  return (
    <div className="min-w-0">
      <div className="font-croqui-num text-xs tabular-nums text-croqui-soft" title={lead.last_message_at ? data(lead.last_message_at, true) : undefined}>
        {relativo(lead.last_message_at)}
        {lead.ultimo_autor && <span className="ml-1.5 font-sans text-foreground">{AUTOR[lead.ultimo_autor] ?? lead.ultimo_autor}</span>}
      </div>
      {lead.ultima_mensagem && <p className="mt-0.5 line-clamp-2 text-[13px] text-foreground/90">{lead.ultima_mensagem}</p>}
    </div>
  );
}

/**
 * Ligada ou desligada, em tinta: o coral fica só no ícone da Bruna (a voz
 * dela), não numa pílula repetida em cada linha da lista.
 */
export function PilulaDaBruna({ status }: { status: 'on' | 'off' | null }) {
  const ligada = status === 'on';
  const Icone = ligada ? Bot : BotOff;
  return (
    <span
      title={ligada ? 'A Bruna responde este lead' : 'A Bruna não responde este lead'}
      className={cn('inline-flex h-5 items-center gap-1 whitespace-nowrap text-2xs font-medium', ligada ? 'text-foreground' : 'text-croqui-soft')}
    >
      <Icone className={cn('h-3.5 w-3.5 shrink-0', ligada && 'text-bot')} strokeWidth={1.75} aria-hidden />
      {ligada ? 'Bruna ligada' : 'Bruna desligada'}
    </span>
  );
}

/** Os marcadores que a busca devolve. Chamado e "sem resposta" só existem como filtro, não como coluna. */
function Marcadores({ lead }: { lead: LeadDaBusca }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {lead.agendado_at && (
        <Pilula tom="ok" titulo={lead.agendado_para ? `Consultoria em ${data(lead.agendado_para, true)}` : 'Consultoria marcada'}>
          consultoria{lead.agendado_para ? ` ${data(lead.agendado_para)}` : ''}
        </Pilula>
      )}
      {lead.revisao_viva && <Pilula tom="caneta" titulo="Há revisão viva para o próximo turno">revisão viva</Pilula>}
      {lead.instrucoes > 0 && <Pilula tom="tinta" titulo="Orientação do gestor só para este lead">{lead.instrucoes === 1 ? 'orientação' : `${lead.instrucoes} orientações`}</Pilula>}
      {lead.retorno_pendente && <Pilula tom="alerta" titulo={`Retorno prometido para ${data(lead.retorno_pendente, true)}`}>retorno {data(lead.retorno_pendente)}</Pilula>}
      {lead.entregue && <Pilula tom="suave" titulo="O lead foi entregue (representante ou descarte)">entregue: {lead.entregue}</Pilula>}
      {lead.em_escada && <Pilula tom="suave" titulo="Recebeu toque da escada de 24 h">na escada</Pilula>}
      {lead.optout && <Pilula tom="alerta" titulo="Pediu para não receber mais mensagens">pediu para parar</Pilula>}
    </div>
  );
}
