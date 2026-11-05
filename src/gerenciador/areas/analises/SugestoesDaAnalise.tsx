import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCheck, Lightbulb, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { CartaoDeSugestao, Erro, Esqueleto, Painel, Vazio } from '@/gerenciador/componentes';
import { aplicarSugestao, type Aplicador } from '@/gerenciador/lib/acoes';
import type { Sugestao } from '@/gerenciador/lib/tipos';
import { CHAVE, contarSugestoes, plural, temAcaoAutomatica } from './dados';

interface SugestoesDaAnaliseProps {
  sugestoes: Sugestao[] | undefined;
  carregando: boolean;
  erro: Error | null;
  tentar: () => void;
  quem: Aplicador;
  /** A análise terminou: sem sugestão é "não deixou"; rodando é "ainda chegam". */
  concluida: boolean;
}

interface Resultado {
  feitas: string[];
  falhas: Array<{ titulo: string; erro: string }>;
}

/**
 * As sugestões que esta análise deixou, pendentes primeiro, com o contador e
 * o botão que aprova e aplica todas as pendentes com ação automática, uma a
 * uma, dizendo quantas deram certo e quais falharam.
 */
export function SugestoesDaAnalise({ sugestoes, carregando, erro, tentar, quem, concluida }: SugestoesDaAnaliseProps) {
  const qc = useQueryClient();
  const [aplicando, setAplicando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const lista = sugestoes ?? [];
  const c = contarSugestoes(lista);
  const automaticas = lista.filter((s) => s.status === 'pendente' && temAcaoAutomatica(s));
  const recarregar = () => { void qc.invalidateQueries({ queryKey: CHAVE.tudo }); };

  const contador = [
    plural(c.pendentes, 'pendente', 'pendentes'),
    c.aprovadas ? plural(c.aprovadas, 'aprovada', 'aprovadas') : null,
    plural(c.aplicadas, 'aplicada', 'aplicadas'),
    plural(c.rejeitadas, 'rejeitada', 'rejeitadas'),
  ].filter(Boolean).join(' · ');

  const aplicarTodas = async () => {
    setAplicando(true);
    const r: Resultado = { feitas: [], falhas: [] };
    for (const s of automaticas) {
      try {
        await aplicarSugestao(s, quem);
        r.feitas.push(s.titulo);
      } catch (e) {
        r.falhas.push({ titulo: s.titulo, erro: e instanceof Error ? e.message : 'não deu certo' });
      }
    }
    setResultado(r);
    setAplicando(false);
    if (r.falhas.length === 0) toast.success(`${plural(r.feitas.length, 'sugestão aplicada', 'sugestões aplicadas')}.`);
    else toast.error(`${plural(r.feitas.length, 'aplicada', 'aplicadas')}, ${plural(r.falhas.length, 'falhou', 'falharam')}. Veja quais abaixo.`);
    recarregar();
  };

  return (
    <Painel titulo="Sugestões desta análise" nota={lista.length ? contador : undefined}>
      {carregando ? (
        <Esqueleto linhas={4} />
      ) : erro ? (
        <Erro mensagem={erro.message} tentar={tentar} />
      ) : lista.length === 0 ? (
        <Vazio
          Icone={Lightbulb}
          titulo={concluida ? 'A análise não deixou sugestão' : 'As sugestões chegam quando a análise terminar'}
          descricao={concluida ? 'Os achados ficam acima; quando houver algo para aplicar, a sugestão aparece aqui.' : undefined}
          className="py-6"
        />
      ) : (
        <div className="space-y-4">
          {automaticas.length > 0 && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] text-croqui-soft">
                {plural(automaticas.length, 'pendente com ação automática', 'pendentes com ação automática')}; as outras se aplicam à mão, uma a uma.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" disabled={aplicando}>
                    {aplicando ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <CheckCheck className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />}
                    Aprovar e aplicar todas ({automaticas.length})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Aprovar e aplicar {plural(automaticas.length, 'sugestão', 'sugestões')}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cada uma é aplicada em sequência (orientação, base, régua, revisão, configuração) e fica registrada na auditoria.
                      O que falhar continua pendente e aparece listado aqui.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <ul className="max-h-48 space-y-1 overflow-y-auto text-[13px] text-foreground">
                    {automaticas.map((s) => <li key={s.id} className="truncate">· {s.titulo}</li>)}
                  </ul>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void aplicarTodas()}>Aplicar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {resultado && (
            <div role="status" className="rounded-md border border-border bg-accent/40 px-3 py-2 text-[13px]">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-foreground">
                  {plural(resultado.feitas.length, 'aplicada', 'aplicadas')}
                  {resultado.falhas.length ? `, ${plural(resultado.falhas.length, 'falhou', 'falharam')}` : ''}.
                </p>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-croqui-soft" aria-label="Fechar resultado" onClick={() => setResultado(null)}>
                  <X className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </div>
              {resultado.falhas.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-croqui-soft">
                  {resultado.falhas.map((f, i) => (
                    <li key={i}><span className="text-foreground">{f.titulo}</span>: {f.erro}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <ul className="space-y-3" aria-label="Sugestões desta análise">
            {lista.map((s) => (
              <li key={s.id}>
                <CartaoDeSugestao sugestao={s} quem={quem} aoMudar={recarregar} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </Painel>
  );
}
