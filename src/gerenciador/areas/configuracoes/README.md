# Configurações (`/configuracoes/*`)

`Configuracoes.tsx` monta a faixa de abas e as sub-rotas; a raiz e caminho
desconhecido levam a `nucleo`.

| aba | arquivo | lê | escreve (e audita) |
|---|---|---|---|
| `nucleo` | `Nucleo.tsx`, `nucleo/*` | `bruna_prompt_versoes` (lista sem o conteúdo; conteúdo por versão), `bruna_prompt_atual` | `bruna_prompt_versao_nova` (editar seção, reverter), update de status (aprovar, descartar, marcar publicada; a anterior volta a `aprovada`) |
| `instrucoes` | `Instrucoes.tsx`, `instrucoes/*` | `bruna_instrucoes`, `bruna_instrucoes_historico`, `contatos` | insert/update em `bruna_instrucoes` (`gestor_instrucao_criada/alterada/desativada/reativada`) |
| `base` | `Base.tsx`, `base/*` | `bruna_conhecimento` (+ `textSearch` no tsvector `busca`), `bruna_conhecimento_historico`, `bruna_duvidas`, `bruna_regioes` | insert/update em `bruna_conhecimento` (`gestor_base_criada/alterada/restaurada/desativada/reativada`), update em `bruna_duvidas` (resposta e descarte) |
| `regioes` | `Regioes.tsx` | `bruna_regioes` | nada (a fonte é `docs/bruna/regioes.json`; os bairros foco se põem, tiram e editam em `/bairros`, e o cartão de cada praça abre lá em `?praca=<region>`) |
| `geral` | `Geral.tsx`, `geral/*` | `bruna_gestor_config` | update da chave inteira, relida e mesclada na hora (`gestor_config_alterada`) |
| `auditoria` | `Auditoria.tsx`, `auditoria/*` | `audit_logs` com `action like 'gestor_%'` | nada |

- Query keys: `chaves.ts` (`['gerenciador', 'configuracoes', ...]`); o que
  outras áreas mostram é invalidado por `invalidarOutrasAreas`.
- `?versao=<id>` abre uma versão do núcleo; `?aba=comparar&base=<id>` abre o diff.
- Publicar o núcleo é subir o nó pelo repositório: o painel mostra os passos e
  só registra no banco depois ("Já subi: marcar como publicada").
- O diff (`nucleo/diff.ts`) é LCS de linhas, sem dependência; as pontas iguais
  saem antes da tabela.
- Todo update direto termina em `.select(...)` e passa por `exigirLinha`
  (`comum/util.ts`): sem linha devolvida (a linha sumiu ou a RLS recusou em
  silêncio) lança `NadaGravado` antes de auditar, e a tela recarrega a lista.
- O "Vale até" das orientações é lido e gravado em horário de Brasília
  (`paraInputLocal`/`deInputLocal`), como o cartão mostra, seja qual for o fuso
  do navegador.
- Testes: `*.test.ts(x)` nesta pasta, com o banco falso de `testes/banco.ts` e
  dados na forma real em `testes/dados.ts`.
