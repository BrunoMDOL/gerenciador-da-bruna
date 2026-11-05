# Gerenciador da Bruna (`/`)

A área do Besser Talk onde quem cuida da Bruna acompanha o desempenho dela, lê
conversas inteiras, ajusta o atendimento de um lead sem mexer nos outros, conversa
com um copiloto (Claude), recebe a análise semanal com sugestões para aprovar e
mexe na régua de follow-ups e nas configurações.

Este arquivo é o contrato entre as áreas. Quem constrói uma área lê isto antes.

## Onde as coisas estão

| o quê | onde |
|---|---|
| entrada, rotas e gate de acesso | `src/gerenciador/index.tsx` |
| barra lateral e cabeçalho | `src/gerenciador/layout/GerenciadorShell.tsx` |
| primitivas de tela | `src/gerenciador/componentes/` (`Pagina`, `Painel`, `Medida`, `Pilula`, `Vazio`, `Carregando`, `Esqueleto`, `Erro`) |
| acesso ao banco | `src/gerenciador/lib/db.ts` (`db`, `rpc`, `periodoDosUltimos`, `periodoAnterior`) |
| endereço das edge functions | `src/gerenciador/lib/funcoes.ts` (`enderecoDaFuncao`, `cabecalhosDaFuncao`) |
| recorte de Bairros foco na lista de Leads | `src/gerenciador/lib/recorte.ts` (`rotaDoRecorte`, `lerRecorte`, `filtroDoRecorte`) |
| voltar do detalhe para a lista como estava | `src/gerenciador/lib/voltar.ts` (`useDeOndeVeio`, `useVoltarPara`) |
| as sugestões e como aplicá-las | `src/gerenciador/lib/acoes.ts` (`AcaoSugerida`, `aplicarSugestao`, `descreverAcao`) |
| quem pode | `src/gerenciador/lib/acesso.ts` (`useGestor`) |
| formatação pt-BR / Brasília | `src/gerenciador/lib/formatos.ts` |
| auditoria das ações | `src/gerenciador/lib/auditoria.ts` (`auditarGestor`) |
| tipos do que o banco devolve | `src/gerenciador/lib/tipos.ts` (os de bairros foco em `areas/bairros/tipos.ts`) |
| as áreas | `src/gerenciador/areas/<area>/<Area>.tsx` (export default) |
| banco | `supabase/migrations/20261104201*_gerenciador_*.sql`, `20261104210000_instrucoes_do_gestor_no_contexto.sql` e as de 05/11 (`20261105*`: copiloto, análise, bairros foco, guarda das leituras, e as da integração `2026110515*`: recorte de leads, config, policies e o núcleo imutável) |
| edge functions | `supabase/functions/bruna-copiloto/` e `supabase/functions/bruna-analise/` |

Rotas (todas dentro de `/`): `/` visão geral · `/leads` e `/leads/:contatoId` ·
`/copiloto` e `/copiloto/:sessaoId` · `/analises` e `/analises/:analiseId` ·
`/regua/*` · `/bairros` · `/configuracoes/*`. As áreas com `/*` montam as
próprias sub-rotas com `<Routes>` relativas.

Lista e detalhe: a lista guarda o estado na URL e passa o próprio endereço no
`state` do link (`useDeOndeVeio`); o "← LEADS"/"← ANÁLISES" do detalhe volta
para ele (`useVoltarPara`). Sem `state` (link colado, alerta, outra área), o
detalhe volta para a lista limpa.

## Regras de desenho (resumo do DESIGN.md: o mundo "Croqui")

- **Vocabulário do glossário** (`CONTEXT.md`): Bruna (nunca "bot", nunca "IA"
  sem nome), atendente (nunca "humano"), consultoria (nunca "reunião"), convite,
  veredito de entrega, descarte, template reprovado, praça, funil de qualificação.
  Texto em português do Brasil, direto, sem floreio.
- **Tinta, não cor.** Identidade de área, praça ou estado se escreve com rótulo,
  sigla ou ícone em tinta. Nada de cartão colorido. O coral (`text-croqui-red-text`,
  `bg-croqui-red`) é caneta: só no número que pede atenção, no alerta, no item
  ativo, na ação (botão `variant="default"` já é a ação) e na voz da Bruna.
- **Nunca só vermelho.** Erro e atraso levam texto e marcador (ícone, seta).
- **Número é medida:** `font-croqui-num` + `tabular-nums` (a `Medida` já faz).
  Toda métrica leva à conversa ou à lista que a explica: `Medida` com `onClick`.
- **Cantos de 2px** (o `--radius` global já faz isso), sem sombra em repouso,
  sem vidro, sem gradiente. Separação por traço de 1px (`border-border`) ou
  pela `Cota` (`@/components/croqui/Cota`).
- **Escuro é o padrão** e o claro tem de ficar tão bom quanto: use só tokens
  (`bg-card`, `text-foreground`, `text-croqui-soft`, `border-border`, `bg-accent`,
  `text-success`, `text-warning`, `text-destructive`). Nenhuma cor hex solta.
- **Celular primeiro:** calha de 16px (`px-4`), nada rola na horizontal, alvo de
  toque de 40px. Tabela larga vira lista no celular (`hidden sm:table` / cards).
- **Fontes:** Barlow (texto) e Barlow Semi Condensed (número) já estão carregadas.
  Nada de Google Fonts, nada de biblioteca nova sem necessidade real.
- **Componentes:** shadcn em `@/components/ui/*` (Button, Input, Textarea, Select,
  Dialog, Sheet, Tabs, Switch, Badge, Tooltip, Table, ScrollArea, Popover,
  Command, Checkbox, Collapsible). Ícones: lucide-react, `strokeWidth={1.75}`.
- **Estado vazio diz o que fazer** (`Vazio`). Erro mostra a mensagem do banco e
  um botão de tentar de novo (`Erro`). Carregando é `Carregando` ou `Esqueleto`.
- **Dados reais, nunca inventados.** Se um número não existe no banco, a tela
  não o mostra.

## Como falar com o banco

```ts
import { rpc, db, periodoDosUltimos } from '@/gerenciador/lib/db';
import type { Metricas } from '@/gerenciador/lib/tipos';
const p = periodoDosUltimos(7);
const m = await rpc<Metricas>('bruna_gestor_metricas', { p_de: p.de, p_ate: p.ate });
const { data } = await db.from('bruna_instrucoes').select('*').eq('ativa', true);
```

Use `@tanstack/react-query` (`useQuery`/`useMutation`, o `QueryClientProvider`
já envolve o app) com chaves `['gerenciador', <area>, ...]`. Mutations: toast
com `sonner` (`import { toast } from 'sonner'`) e `auditarGestor(...)` depois de
cada ação que muda algo.

Período: as RPCs recebem instantes (`timestamptz`, ISO) e contam o que cai em
`[p_de, p_ate)`. `periodoDosUltimos(n)` serve para as medidas. A
`bruna_gestor_serie_diaria` devolve uma linha por dia de São Paulo, de
`p_de` a `p_ate`: passe `p_de` à **meia-noite de São Paulo**
(`meiaNoiteEmSaoPaulo` em `areas/visao-geral/util.ts`), senão o primeiro dia
sai pela metade.

### Quem pode: `bruna_gestor_pode`

`bruna_gestor_pode(auth.uid())` é verdadeiro para admin, diretoria,
bruna_gestor e para a service role (a `bruna-analise` e o n8n; o
`bruna-copiloto` chama com o JWT do gestor). Toda RPC do gerenciador começa por
ela (as leituras, depois da migration abaixo) e recusa com a exceção "sem
permissão para o gerenciador da Bruna" (nas leituras, com o código `42501`); a
interface mostra a mensagem do banco (`Erro`).

- Escrita e bairros foco (inclusive `_painel`, `_testar` e `_leads`): desde que nasceram.
- Leitura (`metricas`, `serie_diaria`, `alertas`, `erros`, `regua_resumo`,
  `buscar_leads`, `lead_estado`, `lead_timeline`, `bruna_analise_coletar`):
  pela migration `20261105120000_gerenciador_leituras_so_para_gestor.sql`,
  **ainda não aplicada**. Até ela entrar, qualquer login do Besser Talk consegue
  chamar essas leituras pelo PostgREST. `bruna_instrucoes_vivas` devolve `[]`
  para login que não gerencia, em vez de erro: o contexto da Bruna a chama com
  a service role. A mesma migration deixa quem tem só o papel bruna_gestor ler
  as ações `gestor_*` de `audit_logs` (a tela de Auditoria).

### RPCs (todas `security definer`)

| RPC | argumentos | devolve |
|---|---|---|
| `bruna_gestor_metricas` | `p_de, p_ate` (ISO) | `Metricas` |
| `bruna_gestor_serie_diaria` | `p_de` (meia-noite de São Paulo), `p_ate` | `DiaDaSerie[]` |
| `bruna_gestor_alertas` | — | `Alerta[]` |
| `bruna_gestor_erros` | `p_de, p_ate` | `ErrosDoPeriodo` |
| `bruna_gestor_regua_resumo` | `p_de, p_ate` | `ResumoDaRegua` |
| `bruna_gestor_buscar_leads` | `p_q?, p_region?, p_filtro?, p_limite?` | `LeadDaBusca[]`; `p_filtro` é um de `FiltroDeLeads` ou o recorte de Bairros foco (`foco:<tipo>:<dias>:<nome>`, `foco_agendados:…`; ver Bairros foco) |
| `bruna_gestor_lead_estado` | `p_contato_id` | `LeadEstado` |
| `bruna_gestor_lead_timeline` | `p_contato_id, p_limite?` | `EventoDaLinhaDoTempo[]` |
| `bruna_gestor_revisao_criar` | `p_contato_id, p_tipo, p_gravidade, p_erro, p_na_proxima, p_horas?` | `{ok, id}`; só SP/RJ/Goiânia |
| `bruna_gestor_revisao_cancelar` | `p_id, p_motivo?` | `{ok}` |
| `bruna_gestor_revisao_verificar` | `p_id` | `{ok}` |
| `bruna_gestor_retorno_cancelar` | `p_followup_id, p_motivo?` | `{ok}` |
| `bruna_gestor_pausar_regua` | `p_escada, p_retornos, p_motivo?` | `PausasDaRegua` |
| `bruna_gestor_auditar` | `p_acao, p_entidade?, p_entidade_id?, p_contato_id?, p_detalhes?` | void |
| `bruna_prompt_versao_nova` | `p_conteudo, p_nota, p_origem?, p_base_versao_id?, p_status?` | id |
| `bruna_instrucoes_vivas` | `p_contato_id` | `InstrucaoViva[]` |
| `bruna_analise_coletar` | `p_de, p_ate, p_amostra?` | jsonb (o digest da análise) |
| `toggle_agent` (já existia) | `phone, new_status` | liga/desliga a Bruna no lead |

`toggle_agent` já é auditado pelo banco: o gatilho `trg_audit_contatos_update`
(`audit_contatos_update`) grava `bruna_toggle` em `audit_logs` sempre que
`contatos.status` muda com um login (não com a service role). O gerenciador
grava, além dele, `gestor_bruna_ligada`/`gestor_bruna_desligada`
(`auditarGestor`), e a linha do tempo do lead junta os dois num evento só
(`areas/leads/eventos.ts`). Não conte os dois como duas ações.

Do mesmo jeito, aplicar uma sugestão cujo efeito passa por uma RPC que já
audita (`revisao_criar`, `regua_pausar`, `bairro_foco_salvar`,
`bairro_foco_remover`, e `lead_bruna` pelo gatilho do `toggle_agent`) grava
duas linhas: o efeito (`gestor_revisao_criada`, `gestor_regua_pausa`,
`gestor_bairro_foco_*`, `bruna_toggle`) e `gestor_sugestao_aplicada`, que leva
o nº da sugestão e a referência do que foi criado. É um clique só: na contagem
de ações, as duas são uma.

Tabelas que o gestor lê e escreve direto (RLS por `bruna_gestor_pode`):
`bruna_instrucoes`, `bruna_prompt_versoes` (e a view `bruna_prompt_atual`),
`bruna_conhecimento` (escrita nova), `bruna_conhecimento_historico` (leitura),
`bruna_instrucoes_historico` (leitura), `bruna_analises`, `bruna_sugestoes`,
`bruna_gestor_config`, `fup_campanhas` (update), `fup_campanha_etapas`.

- **A auditoria dessas tabelas é da interface, e é de melhor esforço.**
  `bruna_instrucoes` e `bruna_conhecimento` têm histórico por gatilho; as
  outras não têm gatilho de auditoria: a interface chama `auditarGestor`
  depois de gravar e segue em frente se a auditoria falhar (fica no console).
  Quem escrever direto pelo PostgREST não deixa linha em `audit_logs`. Se o
  dono quiser auditoria garantida, o caminho é um gatilho AFTER que chame
  `bruna_gestor_auditar`, e então as chamadas a `auditarGestor` dessas tabelas
  saem da interface, para não auditar duas vezes.
- **Versão do núcleo não muda de conteúdo.** Desde a `20261105151400`, o
  gatilho `trg_bruna_prompt_versoes_imutavel` recusa (42501) mudar `conteudo`,
  `numero` ou `hash` de uma versão quando o pedido vem com login (inclusive
  dentro de RPC); status, nota e carimbos seguem livres. Versão nova nasce por
  `bruna_prompt_versao_nova`.

Só leitura para a interface: `bruna_copiloto_sessoes` e `bruna_copiloto_mensagens`
(quem escreve é a edge function, com o JWT do gestor: ver abaixo; desde a
`20261105151300` a RLS só deixa cada gestor mudar e apagar as próprias
sessões, e todo gestor lê todas) e
`bruna_bairros_foco` e `bruna_bairros_foco_historico` (quem escreve são as RPCs
de bairros foco; `authenticated` só tem SELECT nas duas).
`audit_logs`: login comum só grava linha em nome dele (`actor_user_id` = o
próprio uid) e nunca ação `gestor_*` (`20261105151200`); as ações do gestor
entram só por `bruna_gestor_auditar`.
Leitura já liberada para todo autenticado: `mensagens`, `contatos`, `templates`,
`bruna_revisoes`, `bruna_followups`, `bruna_objecoes`, `bruna_chamados`,
`bruna_duvidas` (e update), `bruna_regioes`, `bruna_peliculas`, `fup_*`, `followup_etapas`.

### Bairros foco (`/bairros`)

`bruna_bairros_foco` é a fonte viva da lista de cada praça desde 05/11 (o
`docs/bruna/regioes.json` virou a cópia do repositório). A interface escreve só
pelas RPCs abaixo, que conferem `bruna_gestor_pode`, validam, gravam o histórico
(gatilho, origem `gestor`) e auditam (`gestor_bairro_foco_*`); migration e
`sincronizar-bairros-foco.mjs` gravam com origem `sistema`. Os tipos estão em
`areas/bairros/tipos.ts`; os detalhes, em `docs/bruna/bairros-foco-no-banco-2026-11-05.md`.

| RPC | argumentos | devolve |
|---|---|---|
| `bruna_gestor_bairros_foco_painel` | `p_region, p_dias?` (90) | `PainelDoFoco` (itens com leads do período, pedidos fora do foco) |
| `bruna_gestor_bairro_foco_leads` | `p_region, p_tipo` (`bairro`, `cidade` ou `fora`), `p_nome, p_dias?` (90), `p_agendados?` | os ids (`setof bigint`) dos leads que o painel conta no item, ou no pedido fora do foco; recorte que não existe devolve nada |
| `bruna_gestor_bairro_foco_testar` | `p_region, p_bairro, p_cidade?` | `ResultadoDoTeste` (a decisão de `bruna_v4_foco_do_bairro`) |
| `bruna_gestor_bairro_foco_simular` | `p_acao, p_region, p_tipo, p_nome, p_so_se?, p_nao_se?, p_nome_original?, p_tipo_original?, p_dias?` (180) | `Simulacao`; não grava (bloco desfeito) |
| `bruna_gestor_bairro_foco_salvar` | `p_region, p_tipo, p_nome, p_so_se?, p_nao_se?, p_observacao?, p_nome_original?, p_tipo_original?, p_depois_de?, p_motivo?` | `ResultadoDoSalvar` `{ok, acao, historico_id, item, avisos}` (item do tipo cidade volta com o aviso de como ela casa) |
| `bruna_gestor_bairro_foco_mover` | `p_region, p_tipo, p_nome, p_depois_de` | `{ok}` |
| `bruna_gestor_bairro_foco_remover` | `p_region, p_tipo, p_nome, p_motivo?` | `{ok, historico_id}`; recusa o último item da praça |
| `bruna_gestor_bairro_foco_desfazer` | `p_historico_id` | `ResultadoDoDesfazer` `{ok, acao}`; só o que o gerenciador fez |

`_remover` e `_desfazer` estão em `20261105040200_bairros_foco_remover_e_desfazer.sql`,
**ainda não aplicada** (tem DELETE e a ferramenta pede a confirmação do dono):
até ela entrar, as duas respondem que a função não existe (PGRST202; a tela
diz isso em português) e o resto da área funciona.

**O número leva aos mesmos leads.** Os leads e os agendados de cada item, e os
leads de cada pedido fora do foco, abrem `/leads?region=<praça>&foco=<tipo>:<nome>&dias=<n>`
(`&filtro=agendados` para os agendados; `rotaDoRecorte` em `lib/recorte.ts`).
A lista manda o recorte no `p_filtro` de `bruna_gestor_buscar_leads`
(`foco:<tipo>:<dias>:<nome>` ou `foco_agendados:…`), que tira os leads de
`bruna_gestor_bairro_foco_leads`: a mesma regra e o mesmo desempate do painel
(conferido nos 222 itens das três praças em 05/11; migration
`20261105151000`). Com o recorte, a lista só combina o filtro de agendados, e
trocar a praça tira o recorte. "Com bairro" e "Sem bairro" seguem abrindo todos
os leads da praça, de qualquer data.

A Bruna segue o banco na hora no bairro gravado, na tool `salvar_contato` e na
escada; a lista do prompt e a leitura da conversa só depois que o "Montar
contexto v3" subir (pendência `n8n_montar_contexto`).

### Conversa de um lead

Reaproveite o que o painel já tem: `useMessages(contatoId)` (`@/hooks/useMessages`)
traz as mensagens e os vereditos; `MessageBubble` (`@/components/dashboard/MessageBubble`)
desenha o balão certo para Bruna, atendente e cliente. Não reescreva balão.
A nota interna (`sender_type` `sistema`, `direction` `internal`, `message_type`
`nota_interna`, como as respostas do formulário da calculadora do site) sai no
balão de nota do `MessageBubble`, que decide pela `message_type`; nos textos do
gerenciador o autor dela é "nota interna" (`AUTOR` em `areas/leads/textos.ts`).

## Edge functions

Endereço e cabeçalhos vêm de `src/gerenciador/lib/funcoes.ts`:
`enderecoDaFuncao('bruna-copiloto')` e `cabecalhosDaFuncao(accessToken)` (o JWT
do gestor no `Authorization`, a chave pública no `apikey`, corpo JSON). Os dois
leem `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` do `.env`, com os
valores de `src/integrations/supabase/client.ts` de reserva. Não leia
`supabaseUrl`/`supabaseKey` do cliente: são campos protegidos do supabase-js.
As duas funções estão publicadas com `verify_jwt = false` e conferem o chamador
por dentro; sem o segredo `ANTHROPIC_API_KEY` respondem 503
`{ "erro": "ANTHROPIC_API_KEY ausente" }`.

### `bruna-copiloto`

`POST { sessao_id | null, texto, contato_id | null }` → `text/event-stream`.

- Eventos, nesta ordem: `sessao` `{id, titulo, contato_id}` (sempre o primeiro),
  `usuario` `{mensagem_id}`, depois `texto` `{delta}`, `ferramenta`
  `{nome, entrada, resumo}` e `sugestao` `{id, tipo, titulo, descricao, prioridade, acao}`
  no meio, e um `fim` `{mensagem_id, tokens_entrada, tokens_saida, modelo}` ou
  um `erro` `{mensagem}`. Depois do primeiro evento a função manda `ping`
  `{t}` a cada 15 s sem outro evento, só para manter a conexão: o leitor ignora
  evento que não conhece (`lib/protocolo.ts` já ignora).
- Antes do fluxo, a resposta é JSON `{erro}`: 401 (sem login), 403 (não é
  gestor, ou a sessão é de outro gestor), 404 (sessão que não existe), 400
  (pedido inválido, lead que não existe), 503 (`ANTHROPIC_API_KEY ausente`,
  `copiloto desligado`, chave recusada pela Anthropic), 429 (limite da API),
  502/500. Uma falha depois de aberta a sessão (ler o histórico, a primeira
  chamada à API, gravar a pergunta) não grava nada da conversa: numa sessão que
  já existia o JSON traz também `sessao_id`; a sessão criada neste pedido é
  apagada.
- Quem grava `bruna_copiloto_sessoes` e `bruna_copiloto_mensagens` é a função,
  com o JWT do gestor (RLS e `auth.uid()` valem; a política
  `bruna_copiloto_mensagens_gestores_escrevem`, de `20261105033000`, só deixa
  gravar nas sessões dele). A pergunta do gestor só é gravada depois que a API
  da Anthropic aceitou o pedido (o `connect` da primeira rodada); depois que o
  fluxo começou, uma falha vira o evento `erro` e a pergunta fica gravada.
- Tools de bairros foco: `bairros_foco {region}` (o painel de 90 dias, enxuto:
  totais, itens e os pedidos fora do foco com um lead de exemplo) e
  `bairro_testar {region, bairro, cidade?}` (a decisão de
  `bruna_v4_foco_do_bairro`). `propor_acao` confere `bairro_foco_salvar` e
  `bairro_foco_remover` contra a lista na hora da proposta (nome que não está,
  ou que já está, é recusado com o motivo).
- Cada mensagem da API vira uma linha: `papel` `user` (a pergunta, com `texto`;
  os `tool_result`, com `texto` nulo) ou `assistant`. Os avisos da função
  (resposta cortada no limite de tokens, limite de rodadas ou de tempo, recusa)
  vão na coluna `texto` da linha do assistente, não em `conteudo`: recarregar
  mostra o mesmo que se viu ao vivo, e o modelo não os lê como fala dele.
  `modelo` e os tokens ficam só na última linha do assistente do turno.

### `bruna-analise`

- Interface ("Rodar agora"): `POST { de, ate, tipo: 'manual' }` cria a análise;
  `POST { analise_id }` repete uma que **falhou** (só `falhou` pode repetir).
  O pg_cron (`bruna_analise_disparar()`, header `x-analise-secret`) só começa
  linha `pendente` (a que ele acabou de criar).
- Antes de responder, a função reserva a linha (update condicional para
  `coletando`): de dois pedidos para a mesma análise (duplo clique, gestor e
  cron juntos) só um passa; o outro recebe **409** com o motivo, e também quem
  tenta repetir uma análise que não falhou. Depois, 202
  `{ok, analise_id, status: 'analisando'}` e o trabalho segue em segundo plano;
  a interface acompanha lendo `bruna_analises`.
- Status: `pendente` → `coletando` → `analisando` → `concluida` ou `falhou`.
  `dados` volta a nulo na reserva e ganha o digest (com a amostra e as
  reduções) quando a análise passa a `analisando`; quando ela falha, fica o que
  já se sabia. `resumo` e `achados` só no fim.
  Análise presa há mais de 30 min vira `falhou` (a própria função ao começar e
  o cron de hora em hora), para o gestor poder tentar de novo.
- A função audita `gestor_analise_concluida` e `gestor_analise_falhou`; o
  pedido (`gestor_analise_pedida`) quem audita é a interface.
- O digest tem `bairros_fora_do_foco` (migration `20261105141500`): uma entrada
  por praça com consultoria, com a conta do painel de bairros foco —
  `{region, nome, periodo {dias, de, ate}, com_bairro, no_foco, pedidos[] (os
  10 mais pedidos fora da lista: bairro, cidade, leads, agendados,
  contato_exemplo), foco {bairros[], cidades[]}}` (`BairrosForaDoFocoNoDigest`
  em `areas/analises/tipos.ts`; o detalhe da análise mostra a seção em "O que
  foi analisado"). A ação sai do modelo como texto JSON e o `validar.ts` confere
  `bairro_foco_*` contra `foco`: problema vira sugestão manual, com o motivo.

## Sugestões (`lib/acoes.ts`)

A análise semanal e o copiloto não mudam nada sozinhos: escrevem em
`bruna_sugestoes` com uma `acao` no formato `AcaoSugerida`, e o gestor decide
no `CartaoDeSugestao` (aprovar e aplicar, só aprovar, rejeitar, marcar aplicada
à mão, reabrir). `aplicarSugestao` executa com o login do gestor e grava
`gestor_sugestao_aplicada`; `descreverAcao` é a frase "Ao aplicar" do cartão.
Os tipos: `instrucao_criar`, `instrucao_desativar`, `base_criar`,
`base_atualizar`, `revisao_criar`, `regua_pausar`, `fup90_etapa_atualizar`,
`fup90_campanha_atualizar`, `nucleo_trecho`, `config_atualizar`, `lead_bruna`,
`bairro_foco_salvar`, `bairro_foco_remover` e `manual`. Os dois de bairros foco
(tipo `config` em `bruna_sugestoes`, cujo check não tem `bairros`):

```ts
| { tipo: 'bairro_foco_salvar'; region: string; tipo_item: TipoDoItemDoFoco; nome: string; so_se?: string[]; nao_se?: string[];
    observacao?: string | null; nome_original?: string | null; tipo_original?: TipoDoItemDoFoco | null; motivo?: string | null }
| { tipo: 'bairro_foco_remover'; region: string; tipo_item: TipoDoItemDoFoco; nome: string; motivo?: string | null }
```

Sem `nome_original`, `bairro_foco_salvar` cria; com ele (o nome exato de hoje),
altera, e `so_se`, `nao_se` e `observacao` que não vierem ficam como estão
(lidos na hora de aplicar); vindo, substituem: lista vazia apaga a regra,
`observacao` null ou vazia apaga a nota (o cartão diz "Apagar a observação").
A análise não manda lista vazia (não apaga regra); a nota, sim. Os dois vão
pelas RPCs de bairros foco, que validam, gravam o histórico e auditam;
`bairro_foco_remover` depende da `20261105040200` (até lá, aplicar diz que
falta a migration e a sugestão continua pendente).

## O que entra no contexto da Bruna

- `bruna_revisoes` com `verificada_em`: a Bruna lê no PRÓXIMO turno (linha
  REVISÃO DO SEU ATENDIMENTO) e a revisão some depois que o cliente responde.
  Só em SP, RJ e Goiânia. É o ajuste pontual.
- `bruna_instrucoes` (global, por praça ou por lead): a linha ORIENTAÇÕES DO
  GESTOR, durável. Já sai de `bruna_v4_contexto`; o "Montar contexto v3" do n8n
  passa a escrevê-la na mensagem do turno quando o nó subir (pendente de
  `N8N_API_KEY`). A interface avisa isso enquanto não subir.
- `contatos.status` (`toggle_agent`): liga e desliga a Bruna no lead.

## O que não fazer

- Não editar nada em `src/components/dashboard/*` além do necessário para
  reaproveitar; o painel de atendimento continua como está.
- Não criar tabela nem RPC fora de `supabase/migrations/` (e não aplicar nada
  no banco por conta própria: quem aplica é o orquestrador).
- Não colocar segredo em lugar nenhum do código.
- Não instalar dependência nova sem escrever o porquê no PR.
