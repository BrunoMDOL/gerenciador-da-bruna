import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Cota } from '@/components/croqui/Cota';
import { data, duracao, nomeCurto, nomeDaRegiao, numero, pct } from '@/gerenciador/lib/formatos';
import { cn } from '@/lib/utils';
import { duracaoLegivel, motivoLegivel, plural } from './dados';
import type { DadosDaAnalise } from './tipos';
import { rota } from '@/gerenciador/lib/rotas';

function Item({ rotulo, valor, nota }: { rotulo: string; valor: ReactNode; nota?: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-2xs font-semibold uppercase tracking-[0.1em] text-croqui-soft">{rotulo}</dt>
      <dd className="font-croqui-num text-lg font-semibold leading-tight tabular-nums text-foreground">
        {valor}
        {nota ? <span className="ml-1.5 font-croqui text-2xs font-normal text-croqui-soft">{nota}</span> : null}
      </dd>
    </div>
  );
}

function Secao({ titulo, nota, children }: { titulo: string; nota?: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-[13px] font-semibold text-foreground">
        {titulo}
        {nota ? <span className="ml-2 text-2xs font-normal text-croqui-soft">{nota}</span> : null}
      </h3>
      <Cota className="my-2" />
      {children}
    </section>
  );
}

const n = (v: unknown): number | null => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const somar = (xs: unknown, chave: string): number =>
  Array.isArray(xs) ? xs.reduce<number>((t, x) => t + (n((x as Record<string, unknown>)?.[chave]) ?? 0), 0) : 0;
const tamanho = (xs: unknown): number => (Array.isArray(xs) ? xs.length : 0);

/**
 * "O que foi analisado": o resumo do digest que foi ao modelo (dados.digest),
 * em contagens e na lista dos leads amostrados, sem despejar o JSON.
 */
export function OQueFoiAnalisado({ dados, className }: { dados: DadosDaAnalise | null; className?: string }) {
  const [aberto, setAberto] = useState(false);
  const digest = dados?.digest ?? null;
  if (!digest) return null;

  const m = digest.metricas ?? {};
  const e = digest.erros ?? {};
  const r = digest.regua ?? {};
  const conversas = digest.conversas ?? [];
  const instrucoes = digest.instrucoes_vivas ?? [];
  const base = digest.base_indice ?? [];
  const ativas = base.filter((b) => b.ativo).length;
  const foraDoFoco = Array.isArray(digest.bairros_fora_do_foco) ? digest.bairros_fora_do_foco : [];
  const retornos = (r.retornos ?? {}) as Partial<NonNullable<typeof r.retornos>>;
  const pausas = r.pausas ?? null;
  const metricas: Array<{ rotulo: string; valor: number | null; nota?: string }> = [
    { rotulo: 'Novos', valor: n(m.novos) },
    { rotulo: 'Atendidos', valor: n(m.atendidos) },
    { rotulo: 'Responderam', valor: n(m.responderam) },
    { rotulo: 'Convites', valor: n(m.convites) },
    { rotulo: 'Agendados', valor: n(m.agendados), nota: n(m.agendados_bruna) != null ? `${numero(n(m.agendados_bruna))} pela Bruna` : undefined },
    { rotulo: 'Mensagens da Bruna', valor: n(m.mensagens_bruna) },
    { rotulo: 'Revisões', valor: n(m.revisoes), nota: n(m.revisoes_graves) != null ? `${numero(n(m.revisoes_graves))} graves` : undefined },
    { rotulo: 'Chamados', valor: n(m.chamados), nota: n(m.chamados_com_erro) ? `${numero(n(m.chamados_com_erro))} com erro` : undefined },
    { rotulo: 'Objeções', valor: n(m.objecoes) },
    { rotulo: 'Perguntas sem resposta', valor: n(m.duvidas_sem_acerto), nota: n(m.duvidas) != null ? `de ${numero(n(m.duvidas))} consultas à base` : undefined },
    { rotulo: 'Silêncios', valor: n(m.silencios) },
  ].filter((x) => x.valor != null);
  const tempo = n(m.tempo_resposta_mediano_s);

  return (
    <Collapsible open={aberto} onOpenChange={setAberto} className={cn('rounded-md border border-border bg-card', className)}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex min-h-[44px] w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-accent/60"
          aria-expanded={aberto}
        >
          <span className="min-w-0">
            <span className="block text-[13.5px] font-semibold text-foreground">O que foi analisado</span>
            <span className="block text-2xs text-croqui-soft">
              {digest.periodo ? `${data(digest.periodo.de)} a ${data(digest.periodo.ate)} · ` : ''}
              {plural(conversas.length, 'conversa amostrada', 'conversas amostradas')}
              {dados?.duracao_ms != null ? ` · coleta e modelo em ${duracaoLegivel(dados.duracao_ms)}` : ''}
            </span>
          </span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-croqui-soft transition-transform', aberto && 'rotate-180')} strokeWidth={1.75} aria-hidden />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-6 border-t border-border p-4">
          {metricas.length > 0 && (
            <Secao titulo="Métricas do período">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
                {metricas.map((x) => <Item key={x.rotulo} rotulo={x.rotulo} valor={numero(x.valor)} nota={x.nota} />)}
                {tempo != null && <Item rotulo="Resposta mediana" valor={duracao(tempo)} />}
              </dl>
            </Secao>
          )}

          <Secao titulo="Erros e qualidade">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
              <Item rotulo="Revisões lidas" valor={numero(tamanho(e.revisoes_recentes))} />
              <Item rotulo="Perguntas distintas sem resposta" valor={numero(tamanho(e.duvidas_sem_acerto))} />
              <Item rotulo="Encaminhamentos com erro" valor={numero(tamanho(e.encaminhamentos_com_erro))} />
              <Item rotulo="Templates com descarte" valor={numero(tamanho(e.templates_descartados))} />
              <Item rotulo="Horários conferidos" valor={numero(somar(e.horarios_suspeitos, 'n'))} />
            </dl>
          </Secao>

          <Secao titulo="Régua">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
              <Item rotulo="Toques da escada" valor={numero(somar(r.escada, 'enviados'))} nota={somar(r.escada, 'pulados') ? `${numero(somar(r.escada, 'pulados'))} pulados` : undefined} />
              <Item rotulo="Retornos criados" valor={numero(n(retornos.criados) ?? 0)} />
              <Item rotulo="Retornos enviados" valor={numero(n(retornos.enviados) ?? 0)} />
              <Item rotulo="Retornos pendentes" valor={numero(n(retornos.pendentes) ?? 0)} />
              <Item rotulo="Envios FUP90" valor={numero(somar(r.fup90, 'envios'))} nota={somar(r.fup90, 'respondidos') ? `${numero(somar(r.fup90, 'respondidos'))} responderam` : undefined} />
            </dl>
            {pausas && (pausas.escada_pausada || pausas.retornos_pausados) && (
              <p className="mt-2 text-2xs text-warning">
                Durante o período a régua estava pausada: {[pausas.escada_pausada ? 'escada' : null, pausas.retornos_pausados ? 'retornos' : null].filter(Boolean).join(' e ')}.
              </p>
            )}
          </Secao>

          <Secao titulo="Orientações do gestor vivas" nota={numero(instrucoes.length)}>
            {instrucoes.length === 0 ? (
              <p className="text-[13px] text-croqui-soft">Nenhuma orientação ativa na hora da coleta.</p>
            ) : (
              <ul className="space-y-1 text-[13px]">
                {instrucoes.slice(0, 12).map((i) => (
                  <li key={i.id} className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-foreground">{i.titulo}</span>
                    <span className="text-2xs text-croqui-soft">
                      {i.escopo === 'global' ? 'todas as conversas' : i.escopo === 'region' ? `praça ${nomeDaRegiao(i.region)}` : `lead ${i.contato_id}`}
                    </span>
                  </li>
                ))}
                {instrucoes.length > 12 && <li className="text-2xs text-croqui-soft">e mais {numero(instrucoes.length - 12)}</li>}
              </ul>
            )}
          </Secao>

          <Secao titulo="Base de conhecimento">
            <p className="font-data text-[13px] text-foreground">
              {plural(base.length, 'entrada', 'entradas')} <span className="text-croqui-soft">· {numero(ativas)} ativas</span>
            </p>
          </Secao>

          {foraDoFoco.length > 0 && (
            <Secao titulo="Bairros fora do foco" nota="a conta de Bairros foco, por praça">
              <ul className="space-y-3 text-[13px]">
                {foraDoFoco.map((p) => {
                  const pedidos = Array.isArray(p.pedidos) ? p.pedidos : [];
                  const comBairro = n(p.com_bairro);
                  const noFoco = n(p.no_foco);
                  return (
                    <li key={p.region}>
                      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <Link
                          to={rota(`/bairros?${new URLSearchParams({ praca: p.region }).toString()}`)}
                          className="font-medium text-foreground underline decoration-croqui-rule underline-offset-4 hover:decoration-croqui-red"
                        >
                          {p.nome || nomeDaRegiao(p.region)}
                        </Link>
                        {comBairro != null && noFoco != null && (
                          <span className="font-data text-2xs text-croqui-soft">
                            {numero(noFoco)} de {numero(comBairro)} leads com bairro no foco ({pct(noFoco, comBairro)})
                            {n(p.periodo?.dias) != null ? ` · ${plural(Number(p.periodo?.dias), 'dia', 'dias')}` : ''}
                          </span>
                        )}
                      </p>
                      {pedidos.length === 0 ? (
                        <p className="mt-0.5 text-2xs text-croqui-soft">Nenhum bairro pedido fora do foco.</p>
                      ) : (
                        <p className="mt-0.5 break-words text-foreground/90">
                          {pedidos.map((x, i) => (
                            <span key={`${x.bairro ?? ''}-${i}`}>
                              {i > 0 ? ' · ' : ''}
                              {x.bairro || 'sem nome'}
                              <span className="font-data text-2xs text-croqui-soft"> {plural(n(x.leads) ?? 0, 'lead', 'leads')}{n(x.agendados) ? `, ${plural(n(x.agendados) ?? 0, 'agendado', 'agendados')}` : ''}</span>
                            </span>
                          ))}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Secao>
          )}

          <Secao titulo="Conversas amostradas" nota={numero(conversas.length)}>
            {conversas.length === 0 ? (
              <p className="text-[13px] text-croqui-soft">Nenhuma conversa entrou na amostra.</p>
            ) : (
              <ul className="divide-y divide-border">
                {conversas.map((c) => (
                  <li key={c.contato_id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-2 text-[13px] first:pt-0 last:pb-0">
                    <Link
                      to={rota(`/leads/${c.contato_id}`)}
                      className="font-medium text-foreground underline decoration-croqui-rule underline-offset-4 hover:decoration-croqui-red"
                    >
                      {nomeCurto(c.contato?.nome)} <span className="font-data font-normal text-croqui-soft">#{c.contato_id}</span>
                    </Link>
                    {c.contato?.region && <span className="text-croqui-soft">{nomeDaRegiao(c.contato.region)}</span>}
                    <span className="text-foreground/90">{motivoLegivel(c.motivo)}</span>
                    <span className="font-data text-2xs text-croqui-soft">
                      {plural(tamanho(c.mensagens), 'mensagem', 'mensagens')}
                      {tamanho(c.revisoes) ? ` · ${plural(tamanho(c.revisoes), 'revisão', 'revisões')}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {dados?.amostra != null && (
              <p className="mt-2 text-2xs text-croqui-soft">Amostra pedida: {numero(dados.amostra)} conversas (até 40 mensagens cada).</p>
            )}
          </Secao>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
