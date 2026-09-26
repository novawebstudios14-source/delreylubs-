# Del Rey Lubs · Histórico digital do veículo

Sistema web de oficina para clientes, veículos, manutenção, retornos e histórico público por QR Code. O histórico acompanha o veículo após a transferência de proprietário. Todos os serviços cadastrados aparecem automaticamente no histórico público; observações internas permanecem privadas.

## Tecnologia

Next.js 15, Appwrite Cloud Auth, Appwrite Sites e PostgreSQL nativo gerenciado. Somente o servidor acessa o PostgreSQL; autenticação e perfil administrativo são verificados antes de cada consulta interna.

## Configuração

1. `npm ci`; copie `.env.example` para `.env.local`.
2. Crie projeto Appwrite Cloud Pro e um banco **PostgreSQL nativo** no mesmo projeto. Escolha a região de acordo com o projeto; obtenha endpoint, ID e cadeia de conexão TLS no Console. Não use TablesDB para esta migração.
3. No Console, crie uma chave de API **somente no servidor** com escopos `sessions.write` e `users.write` (este último necessário apenas para migrar usuários; após a importação, substitua a chave por outra somente com `sessions.write`). Configure `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, `APPWRITE_DATABASE_URL` e `NEXT_PUBLIC_SITE_URL` com o domínio HTTPS definitivo.
4. Aplique `appwrite/schema.sql` **apenas no destino vazio** usando editor SQL do Appwrite ou `psql`. O schema é independente dos schemas internos do Supabase.
5. Para instalações novas, crie uma conta pela administração do Appwrite e insira manualmente seu UUID em `profiles` com `role='admin'`. Não existe cadastro público de administradores.
6. Execute `npm run typecheck`, `npm run lint`, `npm run build` e teste login, cadastro, serviço, transferência, retorno, QR e PDF no site de prévia.

## Transferência sem perda de registros

O script `appwrite/migrate.mjs` exige as variáveis acima e `SOURCE_DATABASE_URL` (conexão PostgreSQL do Supabase, somente na máquina de migração). Nunca salve credenciais no GitHub. Rode `node appwrite/migrate.mjs` para conferir origem, contagens e destino vazio; depois de fazer backup da origem e manter a oficina sem novas gravações durante a janela de transferência, execute `node appwrite/migrate.mjs --apply`.

O script preserva UUIDs, `public_id` dos QR codes, datas, histórico de proprietários, serviços, lembretes, contatos, perfis e o hash bcrypt das contas; verifica as linhas de cada tabela antes de confirmar. O Supabase de origem não é modificado. O script não permite sobrescrever um destino com registros. Não use a migração automática de bancos do Appwrite para estes dados: ela não mantém funções, índices e campos do PostgreSQL necessariamente idênticos.

Uma exportação e comparação corretas **não substituem** o teste de login e do histórico público no domínio final. Mantenha o domínio dos QR codes existentes; se mudar o endereço, configure redirecionamento permanente da rota `/v/<id>` e do PDF antes de substituir a hospedagem. Mantenha o Supabase de origem disponível até conferir o funcionamento e as contagens no destino. A troca de DNS/publicação deve acontecer após essas verificações. A importação cria contas Appwrite com os mesmos UUIDs e hashes bcrypt; sessões já abertas no Supabase precisarão de novo login.

O histórico público retorna somente marca, modelo, ano, placa mascarada, quilometragem, data de atualização e os campos públicos dos serviços. A chave Appwrite e o endereço do banco nunca devem usar prefixo `NEXT_PUBLIC_`. Configure limite de requisições para `/v/*/pdf` na borda; o PDF também limita tamanho e quantidade de serviços por requisição.

## Estrutura

- `app/`: painel, formulários, páginas públicas, server actions e exportação PDF.
- `lib/appwrite.ts`: login e validação de sessão; `lib/database.ts`: conexão SQL exclusivamente no servidor.
- `appwrite/schema.sql`: schema da nova instância; `appwrite/migrate.mjs`: migração com conferência.
- `supabase/migrations/`: histórico original para auditoria e reversão; não aplicar no Appwrite.

Não há envio automático de WhatsApp. O botão abre uma conversa com texto sugerido; o envio depende do usuário.
