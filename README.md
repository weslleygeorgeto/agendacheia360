# Agenda Cheia 360

SaaS de agendamento para barbearias, salões e clínicas. Next.js 14 (App Router) + Supabase + Tailwind.

- `/b/[slug]` — página pública de agendamento (sem login)
- `/login` e `/dashboard` — painel do dono (Supabase Auth)

## Como rodar

1. **Supabase**: crie um projeto em supabase.com.
2. **Banco**: abra *SQL Editor*, cole todo o `supabase/schema.sql` e execute (uma vez).
3. **Usuário dono**: em *Authentication > Users*, crie um usuário com e-mail e senha. Não há cadastro aberto.
4. **Variáveis**: copie `.env.example` para `.env.local` e preencha com *Project Settings > API*:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (**secreta**, só no servidor)
5. `npm install` e `npm run dev`, depois abra http://localhost:3000/login.
6. Entre com o usuário criado, cadastre o negócio e os serviços. Sua página pública fica em `/b/seu-link`.

Para ativar o Realtime da lista de agendamentos, habilite a replicação da tabela `appointments` em *Database > Replication*. Sem isso, a lista só atualiza ao recarregar.

## Sem Node no computador (ex.: Windows 7)

O Next.js 14 exige Node 18.17 ou mais novo. Se o seu computador não roda isso, publique direto pela Vercel:

1. Crie um repositório novo no GitHub e envie os arquivos deste projeto para a **raiz** do repositório (o `package.json` deve aparecer logo na primeira tela do repositório).
2. Em vercel.com, entre com o GitHub, clique em **Add New > Project** e importe o repositório.
3. Em **Environment Variables**, cadastre as 4 variáveis do `.env.example` (pode colar o conteúdo do seu `.env.local` no primeiro campo). Use a Project URL **sem** `/rest/v1/`.
4. Clique em **Deploy**. Abra `/login` no endereço que a Vercel gerar.
5. Rode o `supabase/schema.sql` no SQL Editor **antes** de testar. Ele só pode rodar uma vez por projeto; para repetir, apague as tabelas antes.

## Scripts

- `npm run dev` — desenvolvimento
- `npm run build` — build de produção
- `npm test` — testes (slots e métricas)
- `npm run typecheck` — checagem de tipos

## Segurança (resumo)

- O visitante anônimo não tem acesso direto a nenhuma tabela (sem policies para `anon`).
- Leitura pública e agendamento passam por `/api/public/*`, server-side, com validação (zod), rate limit, honeypot e limite de 3 agendamentos futuros por WhatsApp.
- Preço, duração e horário final vêm sempre do banco.
- O banco impede overbooking com a constraint `no_overlap` (resposta 409 em conflito).
- `/dashboard` e `/api/dashboard/*` exigem sessão; RLS isola os dados de cada dono.
- `SUPABASE_SERVICE_ROLE_KEY` nunca vai ao navegador.
- O rate limit atual é em memória. Em produção com várias instâncias, troque por Upstash Redis.

## Checklist antes do deploy

- [ ] anon não consegue SELECT/INSERT em nenhuma tabela (REST do Supabase com a anon key deve falhar)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` não aparece no bundle do client
- [ ] `/dashboard` sem login redireciona para `/login`
- [ ] Dono A não vê dados do dono B
- [ ] Duas requisições simultâneas ao mesmo horário: uma retorna 200, a outra 409
- [ ] Honeypot preenchido não grava nada
- [ ] `/api/public/business/[slug]` não contém `owner_id` nem `owner_name`
- [ ] `npm test` passando

## WhatsApp

`/api/dashboard/whatsapp` hoje só registra a mensagem em `campaigns`. Integre a Evolution API no ponto marcado com `TODO`.
