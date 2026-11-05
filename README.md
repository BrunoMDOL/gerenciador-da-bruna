# Gerenciador da Bruna

O gerenciador da Bruna como app próprio: a visão geral, os leads, o copiloto,
as análises, a régua, os bairros foco e as configurações que antes moravam na
rota `/bruna` do Besser Talk. Entra quem é admin, diretoria ou `bruna_gestor`,
com o mesmo login do Besser Talk: o app aponta para o MESMO projeto Supabase
(`tcluzvtubvctkrnychwy`) e as mesmas edge functions. Nada mudou no banco.

- Visão geral em `/`, e as áreas em `/leads`, `/copiloto`, `/analises`,
  `/regua/*`, `/bairros` e `/configuracoes/*`. O prefixo vive num lugar só:
  `src/gerenciador/lib/rotas.ts` (`rota('/leads')`).
- Login em `/auth` (e-mail e senha, sem cadastro).
- "Voltar ao painel" abre o Besser Talk (https://bruna-chat-manager.lovable.app)
  em outra aba.

## Rodar

```sh
npm install
npm run dev        # http://localhost:8081
npm run build      # gera dist/
npm run preview
npm run typecheck  # tsc -b
npm test           # vitest (jsdom)
npm run lint
```

## Variáveis

Copie `.env.example` para `.env`. São as mesmas do Besser Talk:

| variável | o que é |
| --- | --- |
| `VITE_SUPABASE_URL` | a URL do projeto (`https://tcluzvtubvctkrnychwy.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | a chave pública (papel `anon`); não é segredo, vai em toda chamada |
| `VITE_SUPABASE_PROJECT_ID` | o ref do projeto |

`src/gerenciador/lib/funcoes.ts` lê as duas primeiras para chamar as edge
functions `bruna-copiloto` e `bruna-analise`; sem elas, usa os mesmos valores
com que `src/integrations/supabase/client.ts` cria o cliente.

## Deploy na Vercel

Projeto Vite, `vercel.json` já faz o rewrite de SPA (toda rota cai em
`index.html`, menos `assets/`). Na Vercel: importe o repositório, framework
Vite, build `npm run build`, saída `dist`, e cadastre as três variáveis acima
em Settings › Environment Variables.

## Onde fica o resto

O banco (migrations), as edge functions e os scripts do n8n continuam no
repositório **bruna-s-chat-hub**: o `supabase/` de lá é a fonte de verdade do
bdBruna. Este app só lê e grava nele.

A pasta `supabase/functions/` daqui guarda **cópias** de alguns módulos puros
das edge functions (`bruna-analise`, `bruna-copiloto` e `create-template`)
porque os testes do gerenciador os importam (`funcao.test.ts`,
`templateFuncao.test.ts`). Não é a fonte: quem muda uma edge function muda no
bruna-s-chat-hub e, se o teste daqui quebrar, atualiza a cópia.
