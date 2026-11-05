import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, SearchX, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Cota } from '@/components/croqui/Cota';
import { useIsMobile } from '@/hooks/use-mobile';
import { Erro, Esqueleto, Pagina, Painel, Pilula, Vazio } from '@/gerenciador/componentes';
import { data, nomeCurto, nomeDaRegiao, numero, relativo, telefoneLegivel } from '@/gerenciador/lib/formatos';
import type { LeadEstado } from '@/gerenciador/lib/tipos';
import { useVoltarPara } from '@/gerenciador/lib/voltar';
import { cn } from '@/lib/utils';
import { Conversa } from './Conversa';
import { EstadoDaBruna } from './EstadoDaBruna';
import { LinhaDoTempo } from './LinhaDoTempo';
import { useAcoesDoLead, useLeadEstado } from './dados';
import { situacaoDaRevisao, situacaoDoRetorno } from './situacoes';
import { siglaDaRegiao } from './textos';
import { rota } from '@/gerenciador/lib/rotas';
import { BESSER_TALK_URL } from '@/gerenciador/layout/GerenciadorShell';

type AbaDoCelular = 'conversa' | 'estado' | 'tempo';
type AbaDaDireita = 'estado' | 'tempo';

/**
 * O rótulo da página vira o caminho de volta à lista: a lista como o gestor a
 * deixou (busca, praça, filtro, recorte), quando ele veio dela.
 */
const useVoltar = () => useVoltarPara(rota('/leads'), 'Leads');

/**
 * /leads/:contatoId: o lead inteiro. No desktop, a conversa larga à
 * esquerda e, à direita, o estado da Bruna e a linha do tempo em abas; no
 * celular, as três em abas.
 */
export function LeadDetalhe({ contatoIdBruto }: { contatoIdBruto: string }) {
  const contatoId = /^\d{1,12}$/.test(contatoIdBruto) ? Number(contatoIdBruto) : null;
  const consulta = useLeadEstado(contatoId);
  const voltar = useVoltar();

  if (contatoId == null || (consulta.isSuccess && !consulta.data?.contato)) return <NaoEncontrado contatoIdBruto={contatoIdBruto} />;

  if (consulta.isPending) {
    return (
      <Pagina voltar={voltar} titulo="Carregando o lead">
        <div className="grid gap-4 lg:grid-cols-12">
          <Painel className="lg:col-span-7"><Esqueleto linhas={8} /></Painel>
          <Painel className="lg:col-span-5"><Esqueleto linhas={6} /></Painel>
        </div>
      </Pagina>
    );
  }
  if (consulta.isError) {
    return (
      <Pagina voltar={voltar} titulo={`Lead ${contatoIdBruto}`}>
        <Erro mensagem={consulta.error.message} tentar={() => consulta.refetch()} />
      </Pagina>
    );
  }

  return <LeadCarregado estado={consulta.data} contatoId={contatoId} />;
}

function NaoEncontrado({ contatoIdBruto }: { contatoIdBruto: string }) {
  const voltar = useVoltar();
  return (
    <Pagina voltar={voltar} titulo="Lead não encontrado">
      <Vazio
        Icone={SearchX}
        titulo={`Não há lead nº ${contatoIdBruto}`}
        descricao="O número pode estar errado ou o contato foi apagado. Volte à lista e busque pelo nome ou telefone."
        acao={<Button variant="outline" asChild><Link to={voltar.para}><ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden /> Voltar aos leads</Link></Button>}
        className="h-[50vh]"
      />
    </Pagina>
  );
}

function LeadCarregado({ estado, contatoId }: { estado: LeadEstado; contatoId: number }) {
  const contato = estado.contato!;
  const acoes = useAcoesDoLead(contatoId);
  const voltar = useVoltar();
  const isMobile = useIsMobile();
  const [abaDoCelular, setAbaDoCelular] = useState<AbaDoCelular>('conversa');
  const [abaDaDireita, setAbaDaDireita] = useState<AbaDaDireita>('estado');

  const nome = nomeCurto(contato.user_name, contato.user_number);
  const ligada = contato.status === 'on';
  const revisoesVivas = (estado.revisoes ?? []).filter((r) => situacaoDaRevisao(r).viva).length;
  const retornosPendentes = (estado.retornos ?? []).filter((f) => situacaoDoRetorno(f).pendente).length;
  const orientacoes = (estado.instrucoes_vivas ?? []).filter((i) => i.escopo === 'contato').length;

  const interruptor = (
    <label className="flex h-10 items-center gap-2.5 rounded-md border border-border bg-card px-3 text-sm">
      <Switch
        checked={ligada}
        disabled={acoes.ligarBruna.isPending}
        onCheckedChange={(v) => acoes.ligarBruna.mutate({ userNumber: contato.user_number, ligada: v, anterior: contato.status })}
        aria-label={ligada ? 'Desligar a Bruna neste lead' : 'Ligar a Bruna neste lead'}
      />
      <span className={cn('font-medium', ligada ? 'text-bot' : 'text-croqui-soft')}>{ligada ? 'Bruna ligada' : 'Bruna desligada'}</span>
    </label>
  );

  const conversa = <Conversa contatoId={contatoId} className="h-[calc(100vh-15rem)] min-h-[24rem] lg:h-[calc(100vh-13rem)]" />;
  const estadoDaBruna = <EstadoDaBruna estado={estado} acoes={acoes} nomeDoLead={nome} />;
  const linhaDoTempo = <Painel semRecheio><LinhaDoTempo contatoId={contatoId} /></Painel>;

  return (
    <Pagina
      voltar={voltar}
      titulo={nome}
      descricao={
        <span className="flex flex-wrap items-center gap-y-0.5">
          {[
            <span key="telefone" className="font-croqui-num tabular-nums text-foreground">{telefoneLegivel(contato.user_number)}</span>,
            <span key="praca"><span className="font-semibold tracking-[0.08em] text-foreground">{siglaDaRegiao(contato.region)}</span> {nomeDaRegiao(contato.region)}</span>,
            <span key="criado">criado <span className="font-croqui-num tabular-nums">{data(contato.created_at, true)}</span></span>,
            <span key="ultima">última mensagem <span className="font-croqui-num tabular-nums">{relativo(contato.last_message_at)}</span></span>,
            <span key="total"><span className="font-croqui-num tabular-nums">{numero(estado.mensagens_total)}</span> {estado.mensagens_total === 1 ? 'mensagem' : 'mensagens'}</span>,
          ].map((parte, i, todas) => (
            <span key={parte.key} className="inline-flex items-center whitespace-nowrap">
              {parte}
              {i < todas.length - 1 && <span aria-hidden className="mx-2">·</span>}
            </span>
          ))}
        </span>
      }
      acoes={
        <>
          {interruptor}
          <Button asChild>
            <Link to={rota(`/copiloto?contato=${contatoId}`)}><Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden /> Analisar com o Copiloto</Link>
          </Button>
          <Button variant="outline" asChild>
            <a href={`${BESSER_TALK_URL}/?lead=${contatoId}`} target="_blank" rel="noopener noreferrer" title="Abre a conversa deste lead no Besser Talk, em outra aba">
              <ExternalLink className="h-4 w-4" strokeWidth={1.75} aria-hidden /> Abrir no Besser Talk
            </a>
          </Button>
        </>
      }
    >
      <div className="-mt-1 mb-4 flex flex-wrap items-center gap-1.5">
        {estado.tags.map((t) => <Pilula key={t.id} tom="tinta" titulo="Tag do painel">{t.name}</Pilula>)}
        {estado.kanban && <Pilula tom="suave" titulo="Etapa do kanban">kanban: {estado.kanban.nome}</Pilula>}
        {contato.agendado_at && <Pilula tom="ok">consultoria {contato.agendado_para ? data(contato.agendado_para) : 'marcada'}</Pilula>}
        {revisoesVivas > 0 && <Pilula tom="caneta">{revisoesVivas === 1 ? 'revisão viva' : `${revisoesVivas} revisões vivas`}</Pilula>}
        {orientacoes > 0 && <Pilula tom="tinta">{orientacoes === 1 ? 'orientação' : `${orientacoes} orientações`}</Pilula>}
        {retornosPendentes > 0 && <Pilula tom="alerta">{retornosPendentes === 1 ? 'retorno pendente' : `${retornosPendentes} retornos pendentes`}</Pilula>}
        {estado.optout && <Pilula tom="alerta">pediu para parar</Pilula>}
        {estado.contexto?.entregue?.tag && <Pilula tom="suave">entregue: {estado.contexto.entregue.tag}</Pilula>}
      </div>

      {isMobile ? (
        <Tabs value={abaDoCelular} onValueChange={(v) => setAbaDoCelular(v as AbaDoCelular)}>
          <TabsList className="h-10 w-full justify-start gap-1 rounded-none border-b border-border bg-transparent p-0">
            <Aba valor="conversa" ativa={abaDoCelular === 'conversa'}>Conversa</Aba>
            <Aba valor="estado" ativa={abaDoCelular === 'estado'}>Estado da Bruna</Aba>
            <Aba valor="tempo" ativa={abaDoCelular === 'tempo'}>Linha do tempo</Aba>
          </TabsList>
          <TabsContent value="conversa" className="mt-3">{conversa}</TabsContent>
          <TabsContent value="estado" className="mt-3">{estadoDaBruna}</TabsContent>
          <TabsContent value="tempo" className="mt-3">{linhaDoTempo}</TabsContent>
        </Tabs>
      ) : (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="min-w-0 lg:sticky lg:top-4 lg:col-span-6 lg:self-start xl:col-span-7">{conversa}</div>
          <div className="min-w-0 lg:col-span-6 xl:col-span-5">
            <Tabs value={abaDaDireita} onValueChange={(v) => setAbaDaDireita(v as AbaDaDireita)}>
              <TabsList className="h-10 w-full justify-start gap-1 rounded-none border-b border-border bg-transparent p-0">
                <Aba valor="estado" ativa={abaDaDireita === 'estado'}>Estado da Bruna</Aba>
                <Aba valor="tempo" ativa={abaDaDireita === 'tempo'}>Linha do tempo</Aba>
              </TabsList>
              <TabsContent value="estado" className="mt-3">{estadoDaBruna}</TabsContent>
              <TabsContent value="tempo" className="mt-3">{linhaDoTempo}</TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </Pagina>
  );
}

/** Aba do Croqui: texto em grafite, a ativa em tinta 600 com a cota caneta na base. */
function Aba({ valor, ativa, children }: { valor: string; ativa: boolean; children: string }) {
  return (
    <TabsTrigger
      value={valor}
      className={cn(
        'relative h-10 rounded-none bg-transparent px-3 text-[13.5px] font-medium text-croqui-soft shadow-none transition-colors hover:text-foreground',
        'data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none',
      )}
    >
      {children}
      {ativa && <Cota tom="caneta" className="absolute inset-x-1 bottom-0 h-2" />}
    </TabsTrigger>
  );
}
