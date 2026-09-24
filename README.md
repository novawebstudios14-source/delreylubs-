# Del Rey Lubs · Histórico digital do veículo

Sistema web de oficina para clientes, veículos, manutenção, retornos e histórico público por QR Code. O histórico acompanha o veículo após a transferência de proprietário.

## Tecnologia

Next.js 15, TypeScript, Supabase Auth/PostgreSQL, Row Level Security e `qrcode`.

## Instalação

1. `npm install`
2. Copie `.env.example` para `.env.local` e configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `NEXT_PUBLIC_SITE_URL` (URL pública exata, sem barra final).
3. Crie um projeto Supabase e aplique, na ordem, os dois arquivos em `supabase/migrations/` pelo SQL Editor ou fluxo de migrations da sua instância.
4. No Supabase Auth, crie o usuário da oficina e copie seu UUID. No SQL Editor, execute `insert into public.profiles(id,role) values ('UUID_DO_USUARIO','admin');`. Use somente uma conta autorizada. O aplicativo não oferece cadastro público de administradores.
5. `npm run dev` e acesse `http://localhost:3000`.

Se o projeto Supabase desativar a exposição automática de tabelas pelo Data API, exponha `public` e conceda os privilégios de tabelas da migration. Todas as tabelas têm RLS e somente administradores autorizados acessam seus dados. A função pública aceita um UUID imprevisível e retorna exclusivamente marca, modelo, ano, placa mascarada, quilometragem e descrição do histórico; jamais consulta tabelas de clientes para o visitante.

## Dados fictícios

Após a migration, execute `supabase/seed.sql` pelo SQL Editor para inserir 10 clientes, 12 veículos e 30 serviços fictícios. O script é idempotente pelos IDs fixos. Não execute em produção com dados reais.

## Validação

`npm run lint`, `npm run typecheck`, `npm run build`. Depois de conectar o Supabase, confirme login, cadastro e edição, registro de serviço, retorno, QR Code, consulta anônima e transferência. As funcionalidades dependentes do banco não funcionam antes de aplicar a migration e configurar o administrador.

## Deploy

Conecte o repositório ao provedor Next.js (por exemplo, Vercel), configure as mesmas três variáveis, aplique a migration no Supabase de produção e adicione o perfil do administrador. Defina `NEXT_PUBLIC_SITE_URL` como o domínio HTTPS publicado para que o QR Code impresso aponte para a página correta. Faça a impressão somente após confirmar esse domínio.

## Estrutura

- `app/`: painel, formulários, páginas públicas e server actions.
- `lib/`: cliente Supabase SSR e verificação administrativa.
- `middleware.ts`: renovação da sessão e proteção de rotas.
- `supabase/migrations/`: schema, índices, triggers, RLS e funções restritas.

Não há envio automático de WhatsApp. O botão abre uma conversa com texto sugerido; o envio depende do usuário.
