import { useState, type FormEvent } from 'react';
import { CircleCheck, CircleSlash, Loader2, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Painel } from '@/gerenciador/componentes';
import { useTesteDoBairro, type ConsultaDoTeste } from './dados';
import { colapsar, descreverBloqueio, fraseDoTeste } from './regras';
import type { Praca, ResultadoDoTeste } from './tipos';

/**
 * Escreve um bairro como o cliente escreveria e vê a decisão que o banco toma
 * (a mesma do bairro gravado, da tool salvar_contato e da escada), com o
 * porquê em uma frase.
 */
export function TestarBairro({ praca }: { praca: Praca }) {
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [consulta, setConsulta] = useState<ConsultaDoTeste | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const teste = useTesteDoBairro(praca.region, consulta);

  const testar = (e: FormEvent) => {
    e.preventDefault();
    const b = colapsar(bairro);
    if (!b) {
      setErro('Escreva o bairro como o cliente escreveria.');
      return;
    }
    setErro(null);
    setConsulta({ bairro: b, cidade: colapsar(cidade) });
  };

  return (
    <Painel titulo="Testar um bairro" nota={praca.nome}>
      <form onSubmit={testar} noValidate className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          <div className="space-y-1">
            <Label htmlFor="teste-bairro" className="text-[13px]">Bairro</Label>
            <Input id="teste-bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} placeholder="Como o cliente escreveu" className="h-10 text-sm sm:h-9" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="teste-cidade" className="text-[13px]">Cidade <span className="font-normal text-croqui-soft">(opcional)</span></Label>
            <Input id="teste-cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Para as exceções por cidade" className="h-10 text-sm sm:h-9" />
          </div>
        </div>
        <Button type="submit" size="sm" disabled={teste.isFetching}>
          {teste.isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
          Testar
        </Button>
        {erro && <p role="alert" className="text-xs text-destructive">{erro}</p>}
      </form>

      {consulta && (
        <div className="mt-3 border-t border-border pt-3" aria-live="polite">
          {teste.isPending ? (
            <p className="text-[13px] text-croqui-soft">Perguntando ao banco…</p>
          ) : teste.isError ? (
            <div role="alert" className="space-y-2 text-[13px]">
              <p className="flex items-start gap-2 text-destructive">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                <span>{teste.error.message}</span>
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => teste.refetch()}>Tentar de novo</Button>
            </div>
          ) : teste.data ? (
            <Resultado r={teste.data} />
          ) : null}
        </div>
      )}
    </Painel>
  );
}

function Resultado({ r }: { r: ResultadoDoTeste }) {
  const bloqueados = r.bloqueados ?? [];
  return (
    <div className="space-y-2">
      <p className="flex items-start gap-2 text-sm font-medium text-foreground">
        {r.foco
          ? <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={1.75} aria-hidden />
          : <CircleSlash className="mt-0.5 h-4 w-4 shrink-0 text-croqui-soft" strokeWidth={1.75} aria-hidden />}
        <span>{fraseDoTeste(r)}</span>
      </p>
      {r.alvo && (
        <p className="text-2xs text-croqui-soft">
          O banco comparou “{r.alvo}”{r.nucleo && r.nucleo !== r.alvo ? ` (núcleo “${r.nucleo}”)` : ''}.
        </p>
      )}
      {bloqueados.length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground">{r.foco ? 'Barrados no caminho' : 'Barrados'}</p>
          <ul className="mt-0.5 space-y-0.5">
            {bloqueados.map((b, i) => (
              <li key={`${b.nome}-${i}`} className="text-xs text-croqui-soft">
                <span className="text-foreground">{b.nome}</span>: {descreverBloqueio(b)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
