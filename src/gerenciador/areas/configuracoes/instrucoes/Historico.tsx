import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Carregando, Erro, Pilula, Vazio } from '@/gerenciador/componentes';
import { dataHora } from '@/gerenciador/lib/formatos';
import type { Instrucao } from '@/gerenciador/lib/tipos';
import { CHAVES } from '../chaves';
import { rotuloDaRegiao } from '../comum/util';
import { blocosComContexto, diffDeLinhas } from '../nucleo/diff';
import { VisaoDoDiff } from '../nucleo/VisaoDoDiff';
import { lerHistoricoDaInstrucao, nomeDosTurnos, type HistoricoDaInstrucao } from './dados';

const CAMPOS: Array<[keyof Instrucao, string]> = [
  ['escopo', 'para quem'], ['region', 'região'], ['titulo', 'título'], ['texto', 'texto'], ['ativa', 'ativa'],
  ['aplica_em', 'vale em'], ['prioridade', 'prioridade'], ['vigencia_inicio', 'vale desde'], ['vigencia_fim', 'vale até'],
];
const ESCOPO: Record<string, string> = { global: 'todas as conversas', region: 'uma região', contato: 'um lead' };
const ACAO: Record<HistoricoDaInstrucao['acao'], { rotulo: string; tom: 'tinta' | 'suave' | 'caneta' }> = {
  criada: { rotulo: 'criada', tom: 'tinta' }, alterada: { rotulo: 'alterada', tom: 'suave' }, apagada: { rotulo: 'apagada', tom: 'caneta' },
};

function valor(campo: keyof Instrucao, v: unknown): string {
  if (v == null || v === '') return campo === 'vigencia_fim' ? 'sem prazo' : '—';
  if (campo === 'ativa') return v ? 'sim' : 'não';
  if (campo === 'aplica_em') return nomeDosTurnos(v as string[]);
  if (campo === 'vigencia_fim' || campo === 'vigencia_inicio') return dataHora(String(v));
  if (campo === 'region') return rotuloDaRegiao(String(v));
  if (campo === 'escopo') return ESCOPO[String(v)] ?? String(v);
  return String(v);
}

function mudancas(h: HistoricoDaInstrucao): Array<{ campo: keyof Instrucao; nome: string; antes: unknown; depois: unknown }> {
  if (h.acao !== 'alterada' || !h.antes || !h.depois) return [];
  return CAMPOS.filter(([c]) => JSON.stringify(h.antes?.[c] ?? null) !== JSON.stringify(h.depois?.[c] ?? null))
    .map(([c, nome]) => ({ campo: c, nome, antes: h.antes?.[c], depois: h.depois?.[c] }));
}

/** Toda mudança de uma orientação, com o antes e o depois (bruna_instrucoes_historico). */
export function HistoricoDaInstrucaoDialog({ instrucao, aoFechar }: { instrucao: Instrucao; aoFechar: () => void }) {
  const q = useQuery({ queryKey: CHAVES.historicoDaInstrucao(instrucao.id), queryFn: () => lerHistoricoDaInstrucao(instrucao.id) });
  return (
    <Dialog open onOpenChange={(v) => { if (!v) aoFechar(); }}>
      <DialogContent className="max-h-[94vh] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto">
        <DialogHeader className="text-left">
          <DialogTitle className="pr-6 text-base">Histórico de “{instrucao.titulo}”</DialogTitle>
          <DialogDescription className="text-[13px] text-croqui-soft">Cada mudança, com quem fez e quando. O mais novo vem primeiro.</DialogDescription>
        </DialogHeader>
        {q.isPending ? (
          <Carregando texto="Lendo o histórico" />
        ) : q.isError ? (
          <Erro mensagem={q.error.message} tentar={() => void q.refetch()} />
        ) : !q.data.length ? (
          <Vazio Icone={History} titulo="Sem histórico registrado" descricao="O histórico começa a contar a partir da criação do gerenciador. Mudanças daqui em diante aparecem aqui." className="py-6" />
        ) : (
          <ol className="space-y-4">
            {q.data.map((h) => {
              const lista = mudancas(h);
              return (
                <li key={h.id} className="border-l border-border pl-3">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-croqui-soft">
                    <Pilula tom={ACAO[h.acao].tom}>{ACAO[h.acao].rotulo}</Pilula>
                    <span className="font-croqui-num tabular-nums">{dataHora(h.em)}</span>
                    <span>{h.por_email ?? 'sem e-mail'}</span>
                  </p>
                  {h.acao === 'criada' && h.depois && (
                    <p className="mt-1 text-[13px] text-foreground/90">
                      {valor('escopo', h.depois.escopo)}{h.depois.region ? ` · ${valor('region', h.depois.region)}` : ''} · {valor('aplica_em', h.depois.aplica_em)} · prioridade {h.depois.prioridade}
                    </p>
                  )}
                  {h.acao === 'alterada' && !lista.length && <p className="mt-1 text-[13px] text-croqui-soft">Gravada sem mudança nos campos que a Bruna lê.</p>}
                  {lista.length > 0 && (
                    <dl className="mt-1.5 space-y-1.5 text-[13px]">
                      {lista.map((m) => (
                        <div key={String(m.campo)}>
                          <dt className="text-2xs font-semibold uppercase tracking-[0.1em] text-croqui-soft">{m.nome}</dt>
                          <dd className="mt-0.5">
                            {m.campo === 'texto' ? (
                              <VisaoDoDiff blocos={blocosComContexto(diffDeLinhas(String(m.antes ?? ''), String(m.depois ?? '')).linhas, 2)} rotulo="Texto antes e depois" />
                            ) : (
                              <span>
                                <span className="text-croqui-soft line-through decoration-croqui-red/70">{valor(m.campo, m.antes)}</span>
                                <span aria-hidden className="mx-1.5 text-croqui-soft">→</span>
                                <span className="sr-only"> passou a </span>
                                <span className="font-medium text-foreground">{valor(m.campo, m.depois)}</span>
                              </span>
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
