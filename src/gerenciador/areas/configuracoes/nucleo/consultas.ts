import { useQuery } from '@tanstack/react-query';
import { CHAVES } from '../chaves';
import { lerConteudo, lerVersaoAtual, listarVersoes } from './dados';

export function useVersoes() {
  return useQuery({ queryKey: CHAVES.versoes, queryFn: listarVersoes });
}

export function useVersaoAtual() {
  return useQuery({ queryKey: CHAVES.atual, queryFn: lerVersaoAtual });
}

export function useConteudo(id: number | null) {
  return useQuery({
    queryKey: CHAVES.conteudo(id ?? 0),
    queryFn: () => lerConteudo(id as number),
    enabled: id != null,
    // O conteúdo de uma versão não muda depois de criada.
    staleTime: Infinity,
  });
}
