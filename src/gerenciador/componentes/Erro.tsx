import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Erro({ mensagem, tentar }: { mensagem: string; tentar?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 rounded-md border border-destructive/40 bg-card px-4 py-3 text-[13px]">
      <p className="flex items-center gap-2 font-medium text-destructive">
        <AlertTriangle className="h-4 w-4" aria-hidden />
        Não deu para carregar
      </p>
      <p className="text-croqui-soft">{mensagem}</p>
      {tentar && <Button size="sm" variant="outline" onClick={tentar}>Tentar de novo</Button>}
    </div>
  );
}
