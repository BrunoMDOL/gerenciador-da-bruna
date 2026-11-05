import { useId, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useCriarTemplate, type CategoriaDoTemplate, type TemplateCriado } from './dadosDosTemplates';
import { CHIP, CHIP_ATIVO, CHIP_REPOUSO, NOTA, NUM } from './estilos';
import {
  CREATE_TEMPLATE_MANDA_EXTRAS, LIMITE_DO_BOTAO, LIMITE_DO_CORPO, LIMITE_DO_RODAPE, MAX_BOTOES, exemplosEmOrdem, juntarComE,
  nomeValido, normalizarNome, preencherVariaveis, problemasDoCorpo, problemasDoRodape, problemasDosBotoes, problemasDosExemplos,
  variaveisDoTexto,
} from './templatesTexto';
import { textoDoStatusDoTemplate } from './textos';

/** Os idiomas que a edge function create-template aceita. */
const IDIOMAS = [
  { valor: 'pt_BR', nome: 'Português do Brasil (pt_BR)' },
  { valor: 'pt_PT', nome: 'Português de Portugal (pt_PT)' },
  { valor: 'en_US', nome: 'Inglês dos EUA (en_US)' },
  { valor: 'en', nome: 'Inglês (en)' },
  { valor: 'es', nome: 'Espanhol (es)' },
  { valor: 'es_ES', nome: 'Espanhol da Espanha (es_ES)' },
  { valor: 'es_MX', nome: 'Espanhol do México (es_MX)' },
];

const CATEGORIAS: Array<{ valor: CategoriaDoTemplate; nome: string; nota: string }> = [
  { valor: 'MARKETING', nome: 'Marketing', nota: 'retomada, oferta, follow-up (toda a FUP90 é marketing)' },
  { valor: 'UTILITY', nome: 'Utilidade', nota: 'aviso de algo que o cliente pediu: confirmação, lembrete' },
];

function Aviso({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-sm border border-warning/50 px-3 py-2 text-[13px] leading-relaxed text-foreground">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={1.75} aria-hidden />
      <p>{children}</p>
    </div>
  );
}

function Contador({ valor, limite, className }: { valor: number; limite: number; className?: string }) {
  return (
    <span className={cn(NUM, 'text-2xs', valor > limite ? 'text-croqui-red-text' : 'text-croqui-soft', className)}>
      {valor}/{limite}
    </span>
  );
}

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  /** Os nomes que já existem na tabela, para avisar antes de a Meta recusar. */
  nomesExistentes: string[];
  /** Reprovados por formato inválido com variável e sem exemplo: o que a create-template de hoje produz. */
  reprovadosSemExemplo?: string[];
  /** A create-template manda à Meta o exemplo, o rodapé e os botões? Padrão: CREATE_TEMPLATE_MANDA_EXTRAS. */
  extrasNaFuncao?: boolean;
}

/**
 * Criar template na Meta pela create-template. O pedido leva nome, categoria,
 * idioma, corpo e o exemplo de cada variável (e rodapé e botões quando a
 * função os manda). Enquanto a função no ar não manda o exemplo, a tela avisa
 * antes e confere depois o que a Meta recebeu.
 */
export function CriarTemplate({
  aberto, aoFechar, nomesExistentes, reprovadosSemExemplo = [], extrasNaFuncao = CREATE_TEMPLATE_MANDA_EXTRAS,
}: Props) {
  const criar = useCriarTemplate();
  const id = useId();
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState<CategoriaDoTemplate>('MARKETING');
  const [idioma, setIdioma] = useState('pt_BR');
  const [corpo, setCorpo] = useState('');
  const [exemplos, setExemplos] = useState<Record<number, string>>({});
  const [rodape, setRodape] = useState('');
  const [botoes, setBotoes] = useState<string[]>([]);
  const [tentou, setTentou] = useState(false);
  const [criado, setCriado] = useState<TemplateCriado | null>(null);

  const variaveis = variaveisDoTexto(corpo);
  const problemasDoNome = !nome
    ? ['Dê um nome ao template.']
    : !nomeValido(nome)
      ? ['O nome só aceita letras minúsculas, números e _.']
      : nomesExistentes.includes(nome) ? ['Já existe um template com esse nome na conta.'] : [];
  const problemasDosExtras = extrasNaFuncao ? [...problemasDoRodape(rodape), ...problemasDosBotoes(botoes)] : [];
  const problemas = [...problemasDoNome, ...problemasDoCorpo(corpo), ...problemasDosExemplos(variaveis, exemplos), ...problemasDosExtras];
  const podeEnviar = problemas.length === 0 && !criar.isPending;
  const botoesNaPrevia = extrasNaFuncao ? botoes.map((b) => b.trim()).filter(Boolean) : [];

  const limpar = () => {
    setNome(''); setCategoria('MARKETING'); setIdioma('pt_BR'); setCorpo(''); setExemplos({});
    setRodape(''); setBotoes([]); setTentou(false); setCriado(null);
  };
  const fechar = () => {
    if (criar.isPending) return;
    limpar();
    aoFechar();
  };
  const enviar = () => {
    setTentou(true);
    if (problemas.length) return;
    criar.mutate(
      {
        name: nome,
        category: categoria,
        language: idioma,
        body: corpo.trim(),
        examples: exemplosEmOrdem(variaveis, exemplos),
        ...(extrasNaFuncao ? { footer: rodape, buttons: botoes.map((text) => ({ text })) } : {}),
      },
      { onSuccess: (t) => setCriado(t) },
    );
  };

  return (
    <Dialog open={aberto} onOpenChange={(a) => { if (!a) fechar(); }}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar template</DialogTitle>
          <DialogDescription>
            Vai para a aprovação da Meta, que responde em até 24 h. Só depois de aprovado o template pode ser usado na régua, na FUP90 e no painel.
          </DialogDescription>
        </DialogHeader>

        {criado ? (
          <div role="status" className="space-y-3">
            <p className="flex items-start gap-2 text-[13.5px] text-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={1.75} aria-hidden />
              <span>
                <span className="font-semibold">{criado.name}</span> foi enviado para a Meta. Status agora:{' '}
                <span className="font-semibold">{textoDoStatusDoTemplate(criado.statusNoBanco ?? criado.statusNaCriacao)}</span>.
              </span>
            </p>
            {criado.faltouNaMeta.length > 0 && (
              <Aviso>
                {extrasNaFuncao
                  ? `A Meta recebeu o template sem ${juntarComE(criado.faltouNaMeta)}, e o pedido levava isso. A create-template manda isso desde a versão 59: confira se a versão no ar não voltou a uma anterior.`
                  : `A Meta recebeu o template sem ${juntarComE(criado.faltouNaMeta)}: a create-template no ar ainda não manda isso.`}
                {criado.faltouNaMeta.includes('o exemplo das variáveis') &&
                  ' Se ele voltar reprovado por formato inválido, crie de novo pelo WhatsApp Manager da Meta, com o exemplo, e sincronize.'}
              </Aviso>
            )}
            <p className={NOTA}>
              {criado.sincronizou
                ? 'A lista já foi sincronizada. Quando a Meta decidir, o status muda aqui (o banco recebe o aviso dela e também sincroniza de hora em hora).'
                : 'O sync com a Meta falhou logo depois da criação: clique em "Sincronizar agora" daqui a pouco para o template aparecer na lista.'}
            </p>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={limpar}>Criar outro</Button>
              <Button onClick={fechar}>Fechar</Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); enviar(); }}
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-nome`}>Nome</Label>
              <Input
                id={`${id}-nome`}
                value={nome}
                onChange={(e) => setNome(normalizarNome(e.target.value))}
                placeholder="retorno_combinado_v2"
                autoComplete="off"
                className={cn(NUM, 'h-10')}
                aria-invalid={tentou && problemasDoNome.length > 0}
              />
              <p className="text-2xs text-croqui-soft">Letras minúsculas, números e _ (espaço vira _ sozinho). Não dá para mudar depois.</p>
            </div>

            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">Categoria</legend>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIAS.map((c) => (
                  <button key={c.valor} type="button" aria-pressed={categoria === c.valor} onClick={() => setCategoria(c.valor)} className={cn(CHIP, categoria === c.valor ? CHIP_ATIVO : CHIP_REPOUSO)}>
                    {c.nome}
                  </button>
                ))}
              </div>
              <p className="text-2xs text-croqui-soft">{CATEGORIAS.find((c) => c.valor === categoria)?.nota}</p>
            </fieldset>

            <div className="space-y-1.5">
              <Label htmlFor={`${id}-idioma`}>Idioma</Label>
              <Select value={idioma} onValueChange={setIdioma}>
                <SelectTrigger id={`${id}-idioma`} className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {IDIOMAS.map((i) => <SelectItem key={i.valor} value={i.valor}>{i.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor={`${id}-corpo`}>Corpo</Label>
                <Contador valor={corpo.length} limite={LIMITE_DO_CORPO} />
              </div>
              <Textarea
                id={`${id}-corpo`}
                value={corpo}
                onChange={(e) => setCorpo(e.target.value)}
                rows={6}
                placeholder="Oi {{1}}, aqui é a Bruna, da Besser Home…"
                aria-invalid={tentou && problemasDoCorpo(corpo).length > 0}
              />
              <p className="text-2xs text-croqui-soft">Variáveis com número, em ordem: {'{{1}}'}, {'{{2}}'}… Na régua, o {'{{1}}'} vira o primeiro nome do lead.</p>
            </div>

            {variaveis.length > 0 && (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Exemplo de cada variável</legend>
                {variaveis.map((v) => (
                  <div key={v} className="flex items-center gap-2">
                    <Label htmlFor={`${id}-ex-${v}`} className={cn(NUM, 'w-12 shrink-0 text-croqui-soft')}>{`{{${v}}}`}</Label>
                    <Input
                      id={`${id}-ex-${v}`}
                      value={exemplos[v] ?? ''}
                      onChange={(e) => setExemplos((x) => ({ ...x, [v]: e.target.value }))}
                      placeholder={v === 1 ? 'Mariana' : 'exemplo'}
                      className="h-10 min-w-0"
                      aria-invalid={tentou && !(exemplos[v] ?? '').trim()}
                    />
                  </div>
                ))}
                <p className="text-2xs text-croqui-soft">A Meta revisa o template com o exemplo no lugar da variável; o lead nunca o vê.</p>
                {!extrasNaFuncao && (
                  <Aviso>
                    A create-template no ar ainda não manda o exemplo para a Meta, e a Meta costuma reprovar template com variável sem exemplo.
                    {reprovadosSemExemplo.length > 0 &&
                      ` Foi o que aconteceu com ${juntarComE(reprovadosSemExemplo)}: ${reprovadosSemExemplo.length === 1 ? 'reprovado' : 'reprovados'} por formato inválido.`}
                    {' '}Até a função mandar o exemplo, template com variável se cria pelo WhatsApp Manager da Meta e aparece aqui depois do
                    &quot;Sincronizar agora&quot;.
                  </Aviso>
                )}
              </fieldset>
            )}

            {extrasNaFuncao && (
              <>
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <Label htmlFor={`${id}-rodape`}>Rodapé <span className="font-normal text-croqui-soft">(opcional)</span></Label>
                    <Contador valor={rodape.trim().length} limite={LIMITE_DO_RODAPE} />
                  </div>
                  <Input
                    id={`${id}-rodape`}
                    value={rodape}
                    onChange={(e) => setRodape(e.target.value)}
                    placeholder="Besser Home · Películas arquitetônicas"
                    className="h-10"
                    aria-invalid={tentou && problemasDoRodape(rodape).length > 0}
                  />
                  <p className="text-2xs text-croqui-soft">Linha curta embaixo da mensagem, sem variável.</p>
                </div>

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">
                    Botões de resposta rápida <span className="font-normal text-croqui-soft">(opcional, até {MAX_BOTOES})</span>
                  </legend>
                  {botoes.map((b, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Label htmlFor={`${id}-botao-${i}`} className="sr-only">{`Botão ${i + 1}`}</Label>
                      <Input
                        id={`${id}-botao-${i}`}
                        value={b}
                        onChange={(e) => setBotoes((x) => x.map((y, k) => (k === i ? e.target.value : y)))}
                        placeholder={i === 0 ? 'Quero retomar' : 'Ainda estou avaliando'}
                        className="h-10 min-w-0"
                        aria-invalid={tentou && (!b.trim() || b.trim().length > LIMITE_DO_BOTAO)}
                      />
                      <Contador valor={b.trim().length} limite={LIMITE_DO_BOTAO} className="w-10 shrink-0 text-right" />
                      <Button
                        type="button" size="icon" variant="ghost" className="h-10 w-10 shrink-0"
                        onClick={() => setBotoes((x) => x.filter((_, k) => k !== i))}
                        aria-label={`Tirar o botão ${i + 1}`}
                      >
                        <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" className="h-10" disabled={botoes.length >= MAX_BOTOES} onClick={() => setBotoes((x) => [...x, ''])}>
                    <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden /> Adicionar botão
                  </Button>
                  <p className="text-2xs text-croqui-soft">O cliente toca no botão e o texto dele chega como resposta na conversa.</p>
                </fieldset>
              </>
            )}

            {corpo.trim() && (
              <div>
                <p className="mb-1 text-2xs font-semibold uppercase tracking-[0.1em] text-croqui-soft">Prévia</p>
                <div className="rounded-md border border-primary/30 bg-bubble-agent px-3 py-2">
                  <p className="whitespace-pre-line text-[13.5px] text-foreground">{preencherVariaveis(corpo, exemplos)}</p>
                  {extrasNaFuncao && rodape.trim() && <p className="mt-1.5 text-2xs text-croqui-soft">{rodape.trim()}</p>}
                </div>
                {botoesNaPrevia.length > 0 && (
                  <ul aria-label="Botões na prévia" className="mt-1 space-y-1">
                    {botoesNaPrevia.map((b, i) => (
                      <li key={`${i}-${b}`} className="rounded-md border border-border bg-card px-3 py-1.5 text-center text-[13px] text-foreground">{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {!extrasNaFuncao && (
              <p className={NOTA}>
                A create-template no ar manda à Meta só nome, categoria, idioma e corpo. Rodapé e botões ela ainda não envia: template com eles se
                cria no WhatsApp Manager da Meta e aparece aqui depois do &quot;Sincronizar agora&quot;.
              </p>
            )}

            {tentou && problemas.length > 0 && (
              <ul role="alert" className="space-y-1 text-[13px] text-croqui-red-text">
                {problemas.map((p) => (
                  <li key={p} className="flex items-start gap-1.5"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{p}</li>
                ))}
              </ul>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={fechar} disabled={criar.isPending}>Cancelar</Button>
              <Button type="submit" disabled={criar.isPending || (tentou && !podeEnviar)}>
                {criar.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                Enviar para a Meta
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
