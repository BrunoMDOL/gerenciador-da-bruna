import { useState, type ReactNode } from 'react';
import { BookOpen, CalendarClock, ChevronDown, ClipboardCheck, Loader2, Plus, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { Painel, Pilula, type TomDaPilula } from '@/gerenciador/componentes';
import { PRACAS, data, dataHora, nomeDaRegiao, numero } from '@/gerenciador/lib/formatos';
import type { Instrucao, InstrucaoViva, LeadEstado, Revisao } from '@/gerenciador/lib/tipos';
import { cn } from '@/lib/utils';
import { usePendenciaDoContexto, type AcoesDoLead } from './dados';
import { NovaOrientacaoDialog } from './NovaOrientacaoDialog';
import { NovaRevisaoDialog } from './NovaRevisaoDialog';
import { situacaoDaRevisao, situacaoDoRetorno } from './situacoes';
import {
  ACAO_DA_CONFERENCIA, AGENDADO_POR, ESPERANDO, ESTADO_DO_BAIRRO, FASE_DA_OBRA, NOME_DO_ESCOPO, ORIGEM_DO_OPTOUT,
  STATUS_DA_OBRA, STATUS_FUP90, TOM_DA_GRAVIDADE, campoTexto, deOndeEOLead, nomeDaEtapaDaEscada, nomeDaGravidade, nomeDaObjecao, nomeDoTipoDeRevisao,
  nomeDosTurnos, prometidoPor,
} from './textos';

interface Props {
  estado: LeadEstado;
  acoes: AcoesDoLead;
  nomeDoLead: string;
}

/**
 * O que a Bruna sabe e vai fazer neste lead: o contexto que ela recebe no
 * turno, as orientações do gestor, as revisões, os retornos prometidos, a
 * régua, a obra. Cada bloco só aparece quando há o que mostrar.
 */
export function EstadoDaBruna({ estado, acoes, nomeDoLead }: Props) {
  const [novaOrientacao, setNovaOrientacao] = useState(false);
  const [novaRevisao, setNovaRevisao] = useState(false);
  const region = estado.contato?.region ?? '';
  const temRevisao = (PRACAS as readonly string[]).includes(region);

  return (
    <div className="flex flex-col gap-3">
      <BlocoContexto estado={estado} />
      <BlocoOrientacoes estado={estado} acoes={acoes} abrirNova={() => setNovaOrientacao(true)} />
      <BlocoRevisoes estado={estado} acoes={acoes} temRevisao={temRevisao} abrirNova={() => setNovaRevisao(true)} abrirOrientacao={() => setNovaOrientacao(true)} />
      <BlocoRetornos estado={estado} acoes={acoes} />
      <BlocoRegua estado={estado} />
      <BlocoObra obra={estado.obra} doContexto={estado.contexto?.obra ?? null} />
      <BlocoPraca estado={estado} />

      <NovaOrientacaoDialog
        aberto={novaOrientacao}
        aoFechar={() => setNovaOrientacao(false)}
        aoSalvar={(f) => acoes.criarOrientacao.mutateAsync(f)}
        salvando={acoes.criarOrientacao.isPending}
        nomeDoLead={nomeDoLead}
      />
      <NovaRevisaoDialog
        aberto={novaRevisao && temRevisao}
        aoFechar={() => setNovaRevisao(false)}
        aoSalvar={(f) => acoes.criarRevisao.mutateAsync(f)}
        salvando={acoes.criarRevisao.isPending}
        nomeDoLead={nomeDoLead}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pares rótulo/valor
// ---------------------------------------------------------------------------

interface Par { rotulo: string; valor: ReactNode }

function Pares({ pares }: { pares: Par[] }) {
  return (
    <dl className="divide-y divide-border">
      {pares.map((p) => (
        <div key={p.rotulo} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
          <dt className="w-40 shrink-0 text-2xs font-semibold uppercase tracking-[0.1em] text-croqui-soft sm:pt-0.5">{p.rotulo}</dt>
          <dd className="min-w-0 break-words text-sm text-foreground">{p.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

const Num = ({ children }: { children: ReactNode }) => <span className="font-croqui-num tabular-nums">{children}</span>;

// ---------------------------------------------------------------------------
// O que a Bruna sabe (bruna_v4_contexto sem o histórico)
// ---------------------------------------------------------------------------

function BlocoContexto({ estado }: { estado: LeadEstado }) {
  const c = estado.contexto ?? {};
  const contato = estado.contato;
  const pares: Par[] = [];
  const objetivo = campoTexto(c, 'objetivo');
  if (objetivo) pares.push({ rotulo: 'Objetivo', valor: <>{objetivo}{campoTexto(c, 'objetivo_em') && <span className="text-croqui-soft"> · desde <Num>{data(campoTexto(c, 'objetivo_em'))}</Num></span>}</> });

  const bairro = campoTexto(c, 'bairro');
  const estadoDoBairro = c.bairro_estado ? ESTADO_DO_BAIRRO[c.bairro_estado] ?? c.bairro_estado : null;
  if (bairro || estadoDoBairro) {
    pares.push({
      rotulo: 'Bairro',
      valor: (
        <>
          {bairro ?? <span className="text-croqui-soft">não informado</span>}
          {bairro && estadoDoBairro && <span className="text-croqui-soft"> · {estadoDoBairro}{c.foco_nome ? ` (${c.foco_nome})` : ''}</span>}
          {bairro && campoTexto(c, 'bairro_em') && <span className="text-croqui-soft"> · <Num>{data(campoTexto(c, 'bairro_em'))}</Num></span>}
        </>
      ),
    });
  }
  if (contato?.cidade) pares.push({ rotulo: 'Cidade', valor: `${contato.cidade}${contato.estado ? ` / ${contato.estado}` : ''}` });
  if (campoTexto(c, 'endereco')) pares.push({ rotulo: 'Endereço', valor: campoTexto(c, 'endereco') });

  if (c.ja_agendado === true || contato?.agendado_at) {
    const para = campoTexto(c, 'agendado_para') ?? contato?.agendado_para;
    pares.push({
      rotulo: 'Consultoria',
      valor: (
        <>
          marcada{para ? <> para <Num>{dataHora(para)}</Num></> : null}
          {contato?.agendado_por && <span className="text-croqui-soft"> · {AGENDADO_POR[contato.agendado_por] ?? contato.agendado_por}</span>}
          {campoTexto(c, 'agendado_origem') && <span className="text-croqui-soft"> · {campoTexto(c, 'agendado_origem')}</span>}
        </>
      ),
    });
  } else if (estado.regiao) {
    pares.push({ rotulo: 'Consultoria', valor: <span className="text-croqui-soft">{estado.regiao.oferece_consultoria ? 'ainda não marcada' : 'este funil não oferece consultoria'}</span> });
  }

  if (c.entregue?.tag) pares.push({ rotulo: 'Entregue', valor: <>sim, pela tag <span className="font-medium">{c.entregue.tag}</span></> });
  if (c.silenciado === true) pares.push({ rotulo: 'Silêncio', valor: 'a Bruna encerrou a conversa e não responde mais' });
  if (c.revisao) {
    pares.push({
      rotulo: 'Revisão no próximo turno',
      valor: <><Pilula tom={TOM_DA_GRAVIDADE[c.revisao.gravidade] ?? 'tinta'} className="mr-1.5">{nomeDaGravidade(c.revisao.gravidade)}</Pilula>{nomeDoTipoDeRevisao(c.revisao.tipo)} <span className="text-croqui-soft">· feita <Num>{c.revisao.feita_em}</Num></span></>,
    });
  }
  if (c.followup_pendente) {
    const f = c.followup_pendente;
    pares.push({ rotulo: 'Retorno pendente', valor: <><Num>{dataHora(f.quando)}</Num>{f.motivo && <span className="text-croqui-soft"> · {f.motivo}</span>}</> });
  }
  if (c.objecao) {
    pares.push({ rotulo: 'Última objeção', valor: <>{nomeDaObjecao(c.objecao.tipo)}{c.objecao.detalhe && <span className="text-croqui-soft">: {c.objecao.detalhe}</span>} <span className="text-croqui-soft">· <Num>{data(c.objecao.criado_at)}</Num></span></> });
  }
  if (c.indicacao) {
    const quem = campoTexto(c.indicacao, 'quem_indicou');
    const relacao = campoTexto(c.indicacao, 'relacao');
    const visita = c.indicacao.visita && typeof c.indicacao.visita === 'object' ? c.indicacao.visita as Record<string, unknown> : null;
    pares.push({
      rotulo: 'Indicação',
      valor: <>{quem ?? 'indicado por outro contato'}{relacao && <span className="text-croqui-soft"> ({relacao})</span>}{visita && campoTexto(visita, 'dia') && <span className="text-croqui-soft"> · visita <Num>{campoTexto(visita, 'dia')} {campoTexto(visita, 'hora')}</Num></span>}</>,
    });
  }
  const vivas = Array.isArray(c.instrucoes) ? c.instrucoes.length : 0;
  if (vivas) pares.push({ rotulo: 'Orientações no contexto', valor: <Num>{vivas}</Num> });
  if (contato?.em_negociacao) {
    pares.push({ rotulo: 'Negociação', valor: <>{contato.negociacao_status?.replace(/_/g, ' ')}{contato.valor != null && <> · <Num>R$ {numero(contato.valor)}</Num></>}{contato.metragem != null && <> · <Num>{numero(contato.metragem)} m²</Num></>}</> });
  }
  if (contato?.escolha_atendimento) pares.push({ rotulo: 'Escolha de atendimento', valor: contato.escolha_atendimento === 'online' ? 'online, foi para o funil do Brasil' : 'agendar com o representante' });
  if (contato?.campaign_name || contato?.ad_name) pares.push({ rotulo: 'Veio do anúncio', valor: [contato.campaign_name, contato.ad_name].filter(Boolean).join(' › ') });

  return (
    <Painel titulo="O que a Bruna sabe" nota="o contexto que entra no turno">
      {pares.length ? <Pares pares={pares} /> : <p className="text-[13px] text-croqui-soft">A Bruna ainda não sabe nada deste lead além do nome e do número.</p>}
      <Collapsible className="mt-3">
        <CollapsibleTrigger className="group flex h-9 items-center gap-1.5 text-[13px] text-croqui-soft underline decoration-croqui-rule underline-offset-4 hover:text-foreground">
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" strokeWidth={1.75} aria-hidden />
          Ver tudo que a Bruna recebe (JSON)
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre className="mt-2 max-h-96 overflow-y-auto whitespace-pre-wrap break-all rounded-sm border border-border bg-background p-3 text-2xs leading-relaxed text-foreground/90">
            {JSON.stringify(c, null, 2)}
          </pre>
        </CollapsibleContent>
      </Collapsible>
    </Painel>
  );
}

// ---------------------------------------------------------------------------
// Praça
// ---------------------------------------------------------------------------

function BlocoPraca({ estado }: { estado: LeadEstado }) {
  const r = estado.regiao;
  if (!r) return null;
  const pares: Par[] = [
    { rotulo: 'Consultoria', valor: r.oferece_consultoria ? 'a praça oferece' : 'este funil não oferece' },
  ];
  if (r.consultor) pares.push({ rotulo: 'Consultor', valor: r.consultor });
  if (r.grade?.length) pares.push({ rotulo: 'Horários', valor: <Num>{r.grade.map((h) => h.slice(0, 5)).join(' · ')}</Num> });
  if (r.duracao_min) pares.push({ rotulo: 'Duração', valor: <Num>{r.duracao_min} min</Num> });
  if (r.horizonte_dias) pares.push({ rotulo: 'Horizonte', valor: <><Num>{r.horizonte_dias}</Num> dias à frente</> });
  if (r.calendario) pares.push({ rotulo: 'Agenda', valor: r.calendario });
  return (
    <Painel titulo={`${r.oferece_consultoria ? 'Praça' : 'Funil'}: ${r.nome ?? nomeDaRegiao(r.region)}`} nota="o que vale para todos os leads daqui">
      <Pares pares={pares} />
    </Painel>
  );
}

// ---------------------------------------------------------------------------
// Orientações do gestor
// ---------------------------------------------------------------------------

function BlocoOrientacoes({ estado, acoes, abrirNova }: { estado: LeadEstado; acoes: AcoesDoLead; abrirNova: () => void }) {
  const pendencia = usePendenciaDoContexto();
  const vivas = estado.instrucoes_vivas ?? [];
  const doLead = estado.instrucoes ?? [];
  const herdadas = vivas.filter((v) => v.escopo !== 'contato');
  const idsVivos = new Set(vivas.map((v) => v.id));

  return (
    <Painel
      titulo="Orientações do gestor"
      nota={vivas.length ? `${vivas.length} ${vivas.length === 1 ? 'viva' : 'vivas'}` : 'nenhuma viva'}
      acoes={<Button size="sm" onClick={abrirNova}><Plus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Nova orientação</Button>}
    >
      {pendencia.data && (
        <p className="mb-3 flex items-start gap-2 rounded-sm border border-warning/40 px-3 py-2 text-[13px] text-foreground">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" strokeWidth={1.75} aria-hidden />
          <span>As orientações já saem do banco, mas só entram na mensagem do turno depois que o nó “Montar contexto v3” subir ao n8n (pendência do dono).</span>
        </p>
      )}

      {doLead.length === 0 && herdadas.length === 0 ? (
        <p className="text-[13px] leading-relaxed text-croqui-soft">
          Nenhuma orientação vale para este lead. Crie uma para ajustar o atendimento dele sem mexer nos outros: a Bruna passa a ler no próximo turno.
        </p>
      ) : (
        <div className="space-y-4">
          {doLead.length > 0 && (
            <ul className="space-y-3">
              {doLead.map((i) => <OrientacaoDoLead key={i.id} instrucao={i} viva={idsVivos.has(i.id)} acoes={acoes} />)}
            </ul>
          )}
          {herdadas.length > 0 && (
            <div>
              <p className="mb-2 text-2xs font-semibold uppercase tracking-[0.1em] text-croqui-soft">Herdadas da praça e de todas as conversas</p>
              <ul className="space-y-2">
                {herdadas.map((v) => <OrientacaoHerdada key={v.id} instrucao={v} />)}
              </ul>
            </div>
          )}
        </div>
      )}
    </Painel>
  );
}

function OrientacaoDoLead({ instrucao: i, viva, acoes }: { instrucao: Instrucao; viva: boolean; acoes: AcoesDoLead }) {
  const situacao: { rotulo: string; tom: TomDaPilula } = !i.ativa
    ? { rotulo: 'desativada', tom: 'suave' }
    : viva ? { rotulo: 'viva', tom: 'ok' } : { rotulo: 'fora da vigência', tom: 'alerta' };
  const ocupada = acoes.desativarOrientacao.isPending && acoes.desativarOrientacao.variables?.id === i.id;
  return (
    <li className={cn('rounded-sm border border-border p-3', !i.ativa && 'opacity-70')}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Pilula tom="tinta">este lead</Pilula>
        <Pilula tom={situacao.tom}>{situacao.rotulo}</Pilula>
        <span className="text-2xs text-croqui-soft">vale {nomeDosTurnos(i.aplica_em)}</span>
      </div>
      <p className="mt-1.5 text-sm font-medium text-foreground">{i.titulo}</p>
      <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-foreground/90">{i.texto}</p>
      <p className="mt-1.5 font-croqui-num text-2xs tabular-nums text-croqui-soft">
        criada {dataHora(i.criado_em)}{i.criado_por_email ? ` por ${i.criado_por_email}` : ''}
        {i.vigencia_fim ? ` · vale até ${dataHora(i.vigencia_fim)}` : ' · sem prazo'}
        {i.origem !== 'gestor' ? ` · veio ${i.origem === 'copiloto' ? 'do copiloto' : 'da análise'}` : ''}
      </p>
      {i.ativa && (
        <div className="mt-2">
          <Button size="sm" variant="ghost" disabled={ocupada} onClick={() => acoes.desativarOrientacao.mutate({ id: i.id, titulo: i.titulo })}>
            {ocupada ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            Desativar
          </Button>
        </div>
      )}
    </li>
  );
}

function OrientacaoHerdada({ instrucao: v }: { instrucao: InstrucaoViva }) {
  return (
    <li className="rounded-sm border border-border p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Pilula tom="suave">{NOME_DO_ESCOPO[v.escopo] ?? v.escopo}</Pilula>
        <span className="text-2xs text-croqui-soft">vale {nomeDosTurnos(v.aplica_em)}</span>
      </div>
      <p className="mt-1.5 text-sm font-medium text-foreground">{v.titulo}</p>
      <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-foreground/90">{v.texto}</p>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Revisões para o próximo turno
// ---------------------------------------------------------------------------

function BlocoRevisoes({ estado, acoes, temRevisao, abrirNova, abrirOrientacao }: { estado: LeadEstado; acoes: AcoesDoLead; temRevisao: boolean; abrirNova: () => void; abrirOrientacao: () => void }) {
  const revisoes = estado.revisoes ?? [];
  const lida = estado.contexto?.revisao?.id ?? null;
  const vivas = revisoes.filter((r) => situacaoDaRevisao(r).viva).length;
  return (
    <Painel
      titulo="Revisões para o próximo turno"
      nota={revisoes.length ? `${vivas} ${vivas === 1 ? 'viva' : 'vivas'} de ${revisoes.length}` : 'nenhuma'}
      acoes={
        <Button size="sm" onClick={abrirNova} disabled={!temRevisao} title={temRevisao ? undefined : 'A revisão só existe em SP, RJ e Goiânia'}>
          <ClipboardCheck className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Nova revisão
        </Button>
      }
    >
      {!temRevisao && (
        <p className="mb-3 flex flex-wrap items-center gap-x-1 gap-y-1 text-[13px] leading-relaxed text-croqui-soft">
          A revisão para o próximo turno só existe em SP, RJ e Goiânia; este lead é {deOndeEOLead(estado.contato?.region)}.
          Para ajustar a Bruna aqui,
          <button type="button" onClick={abrirOrientacao} className="inline-flex items-center gap-1 text-foreground underline decoration-croqui-rule underline-offset-4 hover:decoration-foreground">
            <BookOpen className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> crie uma orientação
          </button>.
        </p>
      )}
      {revisoes.length === 0 ? (
        <p className="text-[13px] leading-relaxed text-croqui-soft">
          {temRevisao
            ? 'Nenhuma revisão neste lead. Quando a Bruna errar numa fala, grave uma: ela lê na próxima mensagem e corrige.'
            : 'Nenhuma revisão neste lead.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {revisoes.map((r) => <CartaoDeRevisao key={r.id} revisao={r} lida={lida === r.id} acoes={acoes} />)}
        </ul>
      )}
    </Painel>
  );
}

function CartaoDeRevisao({ revisao: r, lida, acoes }: { revisao: Revisao; lida: boolean; acoes: AcoesDoLead }) {
  const s = situacaoDaRevisao(r);
  const liberando = acoes.liberarRevisao.isPending && acoes.liberarRevisao.variables === r.id;
  return (
    <li className={cn('rounded-sm border border-border p-3', !s.viva && 'opacity-70', s.viva && r.gravidade === 'grave' && 'border-l-2 border-l-croqui-red')}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Pilula tom={TOM_DA_GRAVIDADE[r.gravidade] ?? 'tinta'}>{nomeDaGravidade(r.gravidade)}</Pilula>
        <span className="text-sm font-medium text-foreground">{nomeDoTipoDeRevisao(r.tipo)}</span>
        <Pilula tom={s.tom}>{s.rotulo}</Pilula>
        {lida && <Pilula tom="bruna" titulo="É esta que entra no contexto da próxima mensagem">a Bruna lê esta</Pilula>}
      </div>
      <dl className="mt-2 space-y-1.5 text-[13px] leading-relaxed">
        <div><dt className="inline font-medium text-foreground">Erro: </dt><dd className="inline text-foreground/90">{r.erro}</dd></div>
        <div><dt className="inline font-medium text-foreground">Na próxima: </dt><dd className="inline text-foreground/90">{r.na_proxima}</dd></div>
        {r.citacao && <div><dt className="inline font-medium text-foreground">Fala da Bruna: </dt><dd className="inline italic text-croqui-soft">“{r.citacao}”</dd></div>}
      </dl>
      <p className="mt-2 font-croqui-num text-2xs tabular-nums text-croqui-soft">
        feita {dataHora(r.criado_em)} · vale até {dataHora(r.expira_em)}
        {r.verificada_em ? ` · conferida ${dataHora(r.verificada_em)}` : ''}
        {r.cancelada_em ? ` · cancelada ${dataHora(r.cancelada_em)}` : ''}
      </p>
      {r.verificacao && <p className="mt-1 text-2xs leading-relaxed text-croqui-soft">{r.verificacao}</p>}
      {s.viva && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {!r.verificada_em && (
            <Button size="sm" variant="outline" disabled={liberando} onClick={() => acoes.liberarRevisao.mutate(r.id)}>
              {liberando ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
              Conferir e liberar
            </Button>
          )}
          <AcaoComMotivo
            rotulo="Cancelar revisão"
            confirmar="Confirmar cancelamento"
            placeholder="Por que cancelar (opcional; entra na auditoria)"
            ocupado={acoes.cancelarRevisao.isPending && acoes.cancelarRevisao.variables?.id === r.id}
            aoConfirmar={(motivo) => acoes.cancelarRevisao.mutateAsync({ id: r.id, motivo })}
          />
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Retornos prometidos
// ---------------------------------------------------------------------------

function BlocoRetornos({ estado, acoes }: { estado: LeadEstado; acoes: AcoesDoLead }) {
  const retornos = estado.retornos ?? [];
  if (!retornos.length) return null;
  const pendentes = retornos.filter((f) => situacaoDoRetorno(f).pendente).length;
  return (
    <Painel titulo="Retornos prometidos" nota={pendentes ? `${pendentes} ${pendentes === 1 ? 'pendente' : 'pendentes'}` : 'nenhum pendente'}>
      <ul className="space-y-3">
        {retornos.map((f) => {
          const s = situacaoDoRetorno(f);
          const ocupado = acoes.cancelarRetorno.isPending && acoes.cancelarRetorno.variables?.id === f.id;
          return (
            <li key={f.id} className={cn('rounded-sm border border-border p-3', !s.pendente && 'opacity-70')}>
              <div className="flex flex-wrap items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-croqui-soft" strokeWidth={1.75} aria-hidden />
                <span className="font-croqui-num text-sm font-medium tabular-nums text-foreground">{dataHora(f.quando)}</span>
                <Pilula tom={s.tom}>{s.rotulo}</Pilula>
              </div>
              {f.motivo && <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/90">{f.motivo}</p>}
              <p className="mt-1.5 text-2xs text-croqui-soft">
                {prometidoPor(f.quem_prometeu)}
                {f.esperando ? ` · esperando ${ESPERANDO[f.esperando] ?? f.esperando}` : ''}
                {f.data_do_cliente ? ' · data dada pelo cliente' : ''}
                {f.tentativas > 0 ? ` · ${f.tentativas} ${f.tentativas === 1 ? 'tentativa' : 'tentativas'}` : ''}
                {f.reagendado_em ? ` · reagendado ${data(f.reagendado_em)}` : ''}
                {f.cancelado_motivo ? ` · ${f.cancelado_motivo}` : ''}
              </p>
              {s.pendente && (
                <div className="mt-2">
                  <AcaoComMotivo
                    rotulo="Cancelar retorno"
                    confirmar="Confirmar cancelamento"
                    placeholder="Por que cancelar (opcional; entra na auditoria)"
                    ocupado={ocupado}
                    aoConfirmar={(motivo) => acoes.cancelarRetorno.mutateAsync({ id: f.id, motivo })}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Painel>
  );
}

// ---------------------------------------------------------------------------
// Régua neste lead
// ---------------------------------------------------------------------------

function BlocoRegua({ estado }: { estado: LeadEstado }) {
  const { optout, fup90, escada, kanban, conferencias_recentes: conferencias } = estado;
  const temAlgo = optout || fup90 || escada?.length || kanban || conferencias?.length;
  if (!temAlgo) return null;
  const pares: Par[] = [];
  if (optout) {
    pares.push({
      rotulo: 'Pediu para parar',
      valor: <><Num>{dataHora(optout.em)}</Num> <span className="text-croqui-soft">· {ORIGEM_DO_OPTOUT[optout.origem] ?? optout.origem}</span>{optout.evidencia && <p className="mt-0.5 italic text-croqui-soft">“{optout.evidencia}”</p>}</>,
    });
  }
  if (kanban) pares.push({ rotulo: 'Etapa do kanban', valor: kanban.nome });
  if (fup90) {
    pares.push({
      rotulo: 'FUP90',
      valor: (
        <>
          {STATUS_FUP90[fup90.status] ?? fup90.status}
          <span className="text-croqui-soft"> · etapa <Num>{fup90.etapa_atual}</Num> · <Num>{fup90.enviados}</Num> {fup90.enviados === 1 ? 'envio' : 'envios'}</span>
          {fup90.proximo_envio_em && <p className="mt-0.5 text-croqui-soft">próximo toque <Num>{dataHora(fup90.proximo_envio_em)}</Num>{fup90.proximo_template ? ` (${fup90.proximo_template})` : ''}</p>}
          {fup90.encerrada_em && <p className="mt-0.5 text-croqui-soft">encerrada <Num>{dataHora(fup90.encerrada_em)}</Num>{fup90.motivo_encerramento ? `: ${fup90.motivo_encerramento}` : ''}</p>}
        </>
      ),
    });
  }
  if (escada?.length) {
    const dados = escada.filter((t) => !t.pulado).length;
    const pulados = escada.length - dados;
    pares.push({
      rotulo: 'Escada de 24 h',
      valor: (
        <>
          <Num>{dados}</Num> {dados === 1 ? 'toque dado' : 'toques dados'}{pulados ? <>, <Num>{pulados}</Num> {pulados === 1 ? 'pulado' : 'pulados'}</> : null}
          <ul className="mt-1 space-y-0.5 text-[13px] text-croqui-soft">
            {escada.map((t) => (
              <li key={`${t.etapa}-${t.toque}-${t.em}`}>
                <Num>{dataHora(t.em)}</Num> · {nomeDaEtapaDaEscada(t.etapa)} · toque {t.toque + 1}{t.pulado ? ' pulado' : ''}{t.plano ? ` · ${t.plano}` : ''}
              </li>
            ))}
          </ul>
        </>
      ),
    });
  }
  if (conferencias?.length) {
    pares.push({
      rotulo: 'Conferências recentes',
      valor: (
        <ul className="space-y-0.5 text-[13px]">
          {conferencias.map((x) => (
            <li key={`${x.em}-${x.acao}`}>
              <Num>{dataHora(x.em)}</Num> · {ACAO_DA_CONFERENCIA[x.acao] ?? x.acao}{x.conferido ? '' : <span className="text-croqui-soft"> (sem conferência)</span>}
              {campoTexto(x.veredito, 'porque') && <span className="text-croqui-soft">: {campoTexto(x.veredito, 'porque')}</span>}
            </li>
          ))}
        </ul>
      ),
    });
  }
  return (
    <Painel titulo="Régua neste lead" nota="toques, FUP90, retornos e conferências">
      <Pares pares={pares} />
    </Painel>
  );
}

// ---------------------------------------------------------------------------
// Obra
// ---------------------------------------------------------------------------

/** As notas que a Bruna anotou do imóvel (bruna_obras.caracteristicas.notas). */
function notasDaObra(obra: Record<string, unknown>): string[] {
  const c = obra.caracteristicas;
  const notas = c && typeof c === 'object' ? (c as Record<string, unknown>).notas : null;
  return Array.isArray(notas) ? notas.filter((n): n is string => typeof n === 'string' && n.trim() !== '') : [];
}

/** "hoje", "há 1 dia", "há 7 dias"; dias_desde_identificacao só vem na obra do contexto. */
function haQuantosDias(...fontes: Array<Record<string, unknown> | null>): string | null {
  for (const f of fontes) {
    const v = f?.dias_desde_identificacao;
    const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
    if (Number.isFinite(n) && n >= 0) return n === 0 ? 'hoje' : `há ${numero(n)} ${n === 1 ? 'dia' : 'dias'}`;
  }
  return null;
}

function BlocoObra({ obra, doContexto }: { obra: Record<string, unknown> | null; doContexto: Record<string, unknown> | null }) {
  if (!obra) return null;
  const pares: Par[] = [];
  const status = campoTexto(obra, 'status');
  const fase = campoTexto(obra, 'fase');
  if (status || fase) pares.push({ rotulo: 'Situação', valor: [status ? STATUS_DA_OBRA[status] ?? status : null, fase ? FASE_DA_OBRA[fase] ?? fase : null].filter(Boolean).join(' · ') });
  if (campoTexto(obra, 'tipo_imovel')) pares.push({ rotulo: 'Imóvel', valor: campoTexto(obra, 'tipo_imovel') });
  const onde = [campoTexto(obra, 'condominio'), campoTexto(obra, 'bairro'), campoTexto(obra, 'cidade')].filter(Boolean).join(', ');
  if (onde) pares.push({ rotulo: 'Onde', valor: onde });
  if (campoTexto(obra, 'objetivos')) pares.push({ rotulo: 'Objetivos', valor: campoTexto(obra, 'objetivos') });
  const notas = notasDaObra(obra);
  if (notas.length) {
    pares.push({
      rotulo: 'Características',
      valor: notas.length === 1 ? notas[0] : <ul className="list-disc space-y-0.5 pl-4">{notas.map((n) => <li key={n}>{n}</li>)}</ul>,
    });
  }
  if (campoTexto(obra, 'previsao_conclusao')) pares.push({ rotulo: 'Previsão de conclusão', valor: <>{campoTexto(obra, 'previsao_conclusao')}{campoTexto(obra, 'previsao_origem') && <span className="text-croqui-soft"> ({campoTexto(obra, 'previsao_origem')})</span>}</> });
  if (campoTexto(obra, 'resumo')) pares.push({ rotulo: 'Resumo', valor: campoTexto(obra, 'resumo') });
  const materiais = Array.isArray(obra.materiais) ? obra.materiais.length : 0;
  if (materiais) pares.push({ rotulo: 'Materiais', valor: <><Num>{materiais}</Num> {materiais === 1 ? 'foto ou vídeo recebido' : 'fotos ou vídeos recebidos'}</> });
  const toques = Number(obra.toques_sem_resposta ?? 0);
  if (toques) pares.push({ rotulo: 'Toques sem resposta', valor: <Num>{toques}</Num> });
  if (campoTexto(obra, 'identificada_em')) {
    const ha = haQuantosDias(obra, doContexto);
    pares.push({ rotulo: 'Identificada', valor: <><Num>{dataHora(campoTexto(obra, 'identificada_em'))}</Num>{ha && <span className="text-croqui-soft"> · {ha}</span>}</> });
  }
  if (campoTexto(obra, 'ultimo_toque_em')) pares.push({ rotulo: 'Último toque', valor: <Num>{dataHora(campoTexto(obra, 'ultimo_toque_em'))}</Num> });
  if (campoTexto(obra, 'concluida_em')) pares.push({ rotulo: 'Concluída', valor: <Num>{dataHora(campoTexto(obra, 'concluida_em'))}</Num> });
  if (campoTexto(obra, 'encerrada_motivo')) pares.push({ rotulo: 'Encerrada', valor: campoTexto(obra, 'encerrada_motivo') });
  if (!pares.length) return null;
  return (
    <Painel titulo="Obra" nota="o que a Bruna anotou do imóvel">
      <Pares pares={pares} />
    </Painel>
  );
}

// ---------------------------------------------------------------------------
// Ação com motivo opcional (cancelar revisão, cancelar retorno)
// ---------------------------------------------------------------------------

function AcaoComMotivo({ rotulo, confirmar, placeholder, ocupado, aoConfirmar }: { rotulo: string; confirmar: string; placeholder: string; ocupado: boolean; aoConfirmar: (motivo: string) => Promise<unknown> }) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState('');
  if (!aberto) {
    return <Button size="sm" variant="ghost" onClick={() => setAberto(true)} disabled={ocupado}>{rotulo}</Button>;
  }
  return (
    <div className="w-full space-y-2">
      <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={placeholder} rows={2} className="text-sm" aria-label={placeholder} />
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={ocupado}
          onClick={async () => {
            try { await aoConfirmar(motivo); setAberto(false); setMotivo(''); } catch { /* o toast já avisou */ }
          }}
        >
          {ocupado ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
          {confirmar}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setAberto(false)} disabled={ocupado}>Voltar</Button>
      </div>
    </div>
  );
}
