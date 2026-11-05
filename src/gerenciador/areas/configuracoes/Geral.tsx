import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, CheckCircle2, CircleAlert, Loader2, Settings2, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Carregando, Erro, Painel, Pilula, Vazio } from '@/gerenciador/componentes';
import { useGestor } from '@/gerenciador/lib/acesso';
import { dataHora } from '@/gerenciador/lib/formatos';
import { CHAVES, invalidarOutrasAreas } from './chaves';
import { diaComAno, mensagemDeErro } from './comum/util';
import {
  MAX_TOKENS_MAXIMO, MAX_TOKENS_MINIMO, MODELOS, MODELO_PADRAO, lerPendencias, mesclarValor, objeto, salvarConfig, trocarPendencia, useConfigs,
  type LinhaDeConfig,
} from './geral/dados';
import { ROTAS } from './rotas';

const DIAS_DA_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const LINK = 'inline-flex min-h-9 items-center gap-1 text-[13px] text-croqui-soft underline decoration-croqui-rule underline-offset-4 hover:text-foreground';

interface Gravacao {
  chave: string;
  calcular: (atual: unknown) => unknown;
  detalhes?: Record<string, unknown>;
  mensagem: string;
}

/**
 * /configuracoes/geral: bruna_gestor_config. O copiloto (modelo,
 * teto e liga/desliga), o modelo da análise semanal, a pausa da régua (só
 * leitura) e as pendências que dependem do dono.
 */
export default function Geral() {
  const { email } = useGestor();
  const qc = useQueryClient();
  const configs = useConfigs();
  const { hash } = useLocation();

  const salvar = useMutation({
    mutationFn: (g: Gravacao) => salvarConfig(g.chave, g.calcular, email, g.detalhes),
    onSuccess: (_r, g) => {
      toast.success(g.mensagem);
      void qc.invalidateQueries({ queryKey: CHAVES.config });
      invalidarOutrasAreas(qc, 'config');
    },
    onError: (e) => {
      toast.error(mensagemDeErro(e));
      void qc.invalidateQueries({ queryKey: CHAVES.config });
    },
  });

  // O link de outras áreas para "#pendencias" chega aqui depois de os dados carregarem.
  useEffect(() => {
    if (!configs.data || !hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'start' });
  }, [configs.data, hash]);

  if (configs.isPending) return <Carregando texto="Carregando a configuração" />;
  if (configs.isError && !configs.data) return <Erro mensagem={configs.error.message} tentar={() => void configs.refetch()} />;
  const c = configs.data;
  if (!Object.keys(c).length) {
    return (
      <Painel>
        <Vazio
          Icone={Settings2}
          titulo="bruna_gestor_config está vazia"
          descricao="A migration da fundação do gerenciador cria as chaves copiloto, analise, regua e pendencias. Sem elas, o copiloto e a análise usam os padrões das funções."
        />
      </Painel>
    );
  }
  const ocupada = (chave: string) => salvar.isPending && salvar.variables?.chave === chave;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <Copiloto linha={c.copiloto} ocupada={ocupada('copiloto')} gravar={(g) => salvar.mutateAsync(g)} />
        <Analise linha={c.analise} ocupada={ocupada('analise')} gravar={(g) => salvar.mutateAsync(g)} />
        <Regua linha={c.regua} />
      </div>
      <Pendencias linha={c.pendencias} ocupada={ocupada('pendencias') ? (salvar.variables?.detalhes?.codigo as string | undefined) ?? null : null} gravar={(g) => salvar.mutateAsync(g)} />
    </div>
  );
}

type Gravar = (g: Gravacao) => Promise<unknown>;
const engolir = () => undefined;

function Rodape({ linha }: { linha: LinhaDeConfig }) {
  return (
    <p className="mt-4 border-t border-border pt-2 text-2xs text-croqui-soft">
      Última alteração <span className="font-croqui-num tabular-nums">{dataHora(linha.atualizado_em)}</span>
      {linha.atualizado_por ? ` por ${linha.atualizado_por}` : ''}
    </p>
  );
}

function SemChave({ chave, titulo }: { chave: string; titulo: string }) {
  return (
    <Painel titulo={titulo}>
      <Vazio Icone={CircleAlert} titulo={`A chave ${chave} não está em bruna_gestor_config`} descricao="A migration da fundação do gerenciador cria essa linha; até lá, a função usa os próprios padrões." className="py-6" />
    </Painel>
  );
}

function SeletorDeModelo({ id, valor, aoMudar, desabilitado, rotulo }: { id: string; valor: string; aoMudar: (v: string) => void; desabilitado: boolean; rotulo: string }) {
  const conhecido = MODELOS.some((m) => m.id === valor);
  return (
    <Select value={valor || MODELO_PADRAO} onValueChange={aoMudar} disabled={desabilitado}>
      <SelectTrigger id={id} className="h-10" aria-label={rotulo}><SelectValue /></SelectTrigger>
      <SelectContent>
        {MODELOS.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {m.nome} <span className="text-croqui-soft">· {m.nota}</span>
          </SelectItem>
        ))}
        {!conhecido && valor && <SelectItem value={valor}>{valor} <span className="text-croqui-soft">· o que está gravado</span></SelectItem>}
      </SelectContent>
    </Select>
  );
}

function Campo({ rotulo, htmlFor, children, nota }: { rotulo: string; htmlFor: string; children: ReactNode; nota?: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={htmlFor} className="text-2xs font-semibold uppercase tracking-[0.1em] text-croqui-soft">{rotulo}</Label>
      {children}
      {nota && <p className="text-2xs leading-relaxed text-croqui-soft">{nota}</p>}
    </div>
  );
}

function Copiloto({ linha, ocupada, gravar }: { linha?: LinhaDeConfig; ocupada: boolean; gravar: Gravar }) {
  const v = objeto(linha?.valor);
  const modelo = typeof v.modelo === 'string' ? v.modelo : MODELO_PADRAO;
  const maxTokens = Number(v.max_tokens);
  const ativo = v.ativo !== false;
  const [teto, setTeto] = useState(Number.isFinite(maxTokens) ? String(maxTokens) : '');
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => { setTeto(Number.isFinite(maxTokens) ? String(maxTokens) : ''); }, [maxTokens]);
  if (!linha) return <SemChave chave="copiloto" titulo="Copiloto" />;

  const salvarTeto = (e: FormEvent) => {
    e.preventDefault();
    const n = Number(teto);
    if (!Number.isInteger(n) || n < MAX_TOKENS_MINIMO || n > MAX_TOKENS_MAXIMO) {
      setErro(`Use um número inteiro de ${MAX_TOKENS_MINIMO.toLocaleString('pt-BR')} a ${MAX_TOKENS_MAXIMO.toLocaleString('pt-BR')}.`);
      return;
    }
    setErro(null);
    void gravar({ chave: 'copiloto', calcular: (a) => mesclarValor(a, { max_tokens: n }), detalhes: { campo: 'max_tokens' }, mensagem: `Teto do copiloto: ${n.toLocaleString('pt-BR')} tokens por resposta.` }).catch(engolir);
  };

  return (
    <Painel titulo="Copiloto" nota="edge function bruna-copiloto" acoes={ocupada ? <Loader2 className="h-3.5 w-3.5 animate-spin text-croqui-soft" aria-label="Salvando" /> : undefined}>
      <div className="space-y-4">
        <div className="flex min-h-10 items-center justify-between gap-3">
          <div>
            <Label htmlFor="copiloto-ativo" className="text-sm font-medium text-foreground">Copiloto ligado</Label>
            <p className="text-2xs text-croqui-soft">{ativo ? 'Responde no gerenciador.' : 'Desligado: a função recusa as perguntas até ligar de novo.'}</p>
          </div>
          <Switch
            id="copiloto-ativo"
            checked={ativo}
            disabled={ocupada}
            onCheckedChange={(on) => void gravar({ chave: 'copiloto', calcular: (a) => mesclarValor(a, { ativo: on }), detalhes: { campo: 'ativo' }, mensagem: on ? 'Copiloto ligado.' : 'Copiloto desligado.' }).catch(engolir)}
          />
        </div>
        <Campo rotulo="Modelo" htmlFor="copiloto-modelo">
          <SeletorDeModelo
            id="copiloto-modelo"
            rotulo="Modelo do copiloto"
            valor={modelo}
            desabilitado={ocupada}
            aoMudar={(m) => { if (m !== modelo) void gravar({ chave: 'copiloto', calcular: (a) => mesclarValor(a, { modelo: m }), detalhes: { campo: 'modelo' }, mensagem: 'Modelo do copiloto trocado.' }).catch(engolir); }}
          />
        </Campo>
        <form onSubmit={salvarTeto} noValidate>
          <Campo
            rotulo="Teto por resposta (tokens)"
            htmlFor="copiloto-teto"
            nota={<>De {MAX_TOKENS_MINIMO.toLocaleString('pt-BR')} a {MAX_TOKENS_MAXIMO.toLocaleString('pt-BR')}. A resposta que passa do teto sai cortada, com o aviso.</>}
          >
            <div className="flex gap-2">
              <Input
                id="copiloto-teto"
                type="number"
                inputMode="numeric"
                min={MAX_TOKENS_MINIMO}
                max={MAX_TOKENS_MAXIMO}
                step={1}
                value={teto}
                onChange={(e) => setTeto(e.target.value)}
                className="h-10 font-croqui-num tabular-nums"
              />
              <Button type="submit" variant="outline" disabled={ocupada || teto === String(maxTokens)}>Salvar teto</Button>
            </div>
          </Campo>
          {erro && <p role="alert" className="mt-1 text-[13px] text-destructive">{erro}</p>}
        </form>
      </div>
      <Rodape linha={linha} />
    </Painel>
  );
}

function Analise({ linha, ocupada, gravar }: { linha?: LinhaDeConfig; ocupada: boolean; gravar: Gravar }) {
  if (!linha) return <SemChave chave="analise" titulo="Análise semanal" />;
  const v = objeto(linha.valor);
  const modelo = typeof v.modelo === 'string' ? v.modelo : MODELO_PADRAO;
  const dia = Number(v.dia_semana);
  const hora = Number(v.hora);
  const ativa = Boolean(v.ativa);
  return (
    <Painel titulo="Análise semanal" nota="edge function bruna-analise" acoes={ocupada ? <Loader2 className="h-3.5 w-3.5 animate-spin text-croqui-soft" aria-label="Salvando" /> : undefined}>
      <div className="space-y-4">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-croqui-soft">Agenda</p>
          <p className="mt-1 text-sm text-foreground">
            {ativa ? (
              <>Roda sozinha toda <span className="font-medium">{DIAS_DA_SEMANA[((dia % 7) + 7) % 7] ?? '—'}</span> às{' '}
                <span className="font-croqui-num tabular-nums">{Number.isFinite(hora) ? `${String(hora).padStart(2, '0')}:00` : '—'}</span>, horário de Brasília.</>
            ) : (
              <>Desligada: nenhuma análise roda sozinha.</>
            )}
          </p>
          <Link to={ROTAS.analises} className={LINK}>Mudar a agenda em Análises <ArrowUpRight className="h-3 w-3" aria-hidden /></Link>
        </div>
        <Campo rotulo="Modelo" htmlFor="analise-modelo" nota="O modelo que lê o digest da semana e escreve os achados e as sugestões.">
          <SeletorDeModelo
            id="analise-modelo"
            rotulo="Modelo da análise"
            valor={modelo}
            desabilitado={ocupada}
            aoMudar={(m) => { if (m !== modelo) void gravar({ chave: 'analise', calcular: (a) => mesclarValor(a, { modelo: m }), detalhes: { campo: 'modelo' }, mensagem: 'Modelo da análise trocado.' }).catch(engolir); }}
          />
        </Campo>
      </div>
      <Rodape linha={linha} />
    </Painel>
  );
}

function EstadoDaPausa({ pausada, nome }: { pausada: boolean; nome: string }) {
  return (
    <li className="flex min-h-9 items-center justify-between gap-3 text-sm">
      <span className="text-foreground">{nome}</span>
      {pausada ? <Pilula tom="alerta">pausada</Pilula> : <Pilula tom="ok">rodando</Pilula>}
    </li>
  );
}

function Regua({ linha }: { linha?: LinhaDeConfig }) {
  if (!linha) return <SemChave chave="regua" titulo="Régua" />;
  const v = objeto(linha.valor);
  const escada = Boolean(v.escada_pausada);
  const retornos = Boolean(v.retornos_pausados);
  return (
    <Painel titulo="Régua" nota="só leitura">
      <ul className="divide-y divide-border">
        <EstadoDaPausa pausada={escada} nome="Escada de 24 h" />
        <EstadoDaPausa pausada={retornos} nome="Retornos prometidos" />
      </ul>
      {(escada || retornos) && (
        <p className="mt-2 text-[13px] text-croqui-soft">
          {typeof v.motivo === 'string' && v.motivo ? <>“{v.motivo}” · </> : null}
          pausada {typeof v.pausado_por === 'string' && v.pausado_por ? `por ${v.pausado_por} ` : ''}
          {typeof v.pausado_em === 'string' ? <>em <span className="font-croqui-num tabular-nums">{dataHora(v.pausado_em)}</span></> : null}
        </p>
      )}
      <p className="mt-2 text-2xs text-croqui-soft">A campanha FUP90 se pausa à parte, na própria Régua.</p>
      <Link to={ROTAS.regua} className={LINK}>Pausar ou retomar em Régua <ArrowUpRight className="h-3 w-3" aria-hidden /></Link>
      <Rodape linha={linha} />
    </Painel>
  );
}

function Pendencias({ linha, ocupada, gravar }: { linha?: LinhaDeConfig; ocupada: string | null; gravar: Gravar }) {
  const lista = lerPendencias(linha?.valor);
  const ordenada = [...lista].sort((a, b) => Number(Boolean(a.resolvida)) - Number(Boolean(b.resolvida)));
  const abertas = lista.filter((p) => !p.resolvida).length;
  return (
    <section id="pendencias" className="scroll-mt-20">
      <Painel titulo="Pendências que dependem do dono" nota={linha ? `${abertas} em aberto de ${lista.length}` : undefined}>
        {!linha ? (
          <Vazio Icone={Wrench} titulo="A chave pendencias não está em bruna_gestor_config" descricao="Sem a lista, a interface não tem o que avisar." className="py-6" />
        ) : !lista.length ? (
          <Vazio Icone={CheckCircle2} titulo="Nenhuma pendência registrada" descricao="Quando algo do gerenciador depender do dono (uma chave, uma subida ao n8n), aparece aqui." className="py-6" />
        ) : (
          <ul className="divide-y divide-border">
            {ordenada.map((p) => {
              const resolvida = Boolean(p.resolvida);
              return (
                <li key={p.codigo} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-2">
                    {resolvida
                      ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={1.75} aria-hidden />
                      : <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={1.75} aria-hidden />}
                    <div className="min-w-0">
                      <p className={cn('text-[13.5px] font-medium', resolvida ? 'text-croqui-soft line-through decoration-croqui-rule' : 'text-foreground')}>{p.titulo}</p>
                      {p.texto && <p className="mt-0.5 break-words text-[13px] leading-relaxed text-croqui-soft [font-variant-ligatures:none]">{p.texto}</p>}
                      <p className="mt-0.5 text-2xs text-croqui-soft">
                        {p.desde ? <>desde <span className="font-croqui-num tabular-nums">{diaComAno(p.desde)}</span> · </> : null}
                        código <span className="font-croqui-num">{p.codigo}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 pl-6 sm:pl-0">
                    {ocupada === p.codigo && <Loader2 className="h-3.5 w-3.5 animate-spin text-croqui-soft" aria-hidden />}
                    <Label htmlFor={`pendencia-${p.codigo}`} className="text-[13px] text-croqui-soft">{resolvida ? 'Resolvida' : 'Em aberto'}</Label>
                    <Switch
                      id={`pendencia-${p.codigo}`}
                      checked={resolvida}
                      disabled={ocupada !== null}
                      aria-label={`Resolvida: ${p.titulo}`}
                      onCheckedChange={(on) => void gravar({
                        chave: 'pendencias',
                        calcular: (a) => trocarPendencia(a, p.codigo, on),
                        detalhes: { codigo: p.codigo, resolvida: on },
                        mensagem: on ? `Pendência resolvida: ${p.titulo}.` : `Pendência reaberta: ${p.titulo}.`,
                      }).catch(engolir)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {linha && <Rodape linha={linha} />}
      </Painel>
    </section>
  );
}
