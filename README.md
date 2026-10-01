# Estúdio Teológico

Aplicativo pessoal de estudo teológico. O plano completo está em [claude.md](claude.md) e o design em [design/](design/), exportado do Claude Design.

## Rodar

```bash
npm install
npm run dev
```

Abra http://localhost:3000.

Sem o Supabase configurado, o app abre em **modo de leitura local**. Dá para ler toda a Bíblia Livre, mas notas, marcadores e perfis ficam desligados.

## Conectar o Supabase

1. Crie um projeto em https://supabase.com. O projeto deste app se chama `religioso`.
2. Copie `.env.example` para `.env.local` e preencha:
   - `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, de *Project Settings > API Keys*;
   - `DATABASE_URL`, a string de conexão do *Session pooler* (*Connect* no topo do painel). Ela só é usada pelos scripts e nunca vai para o navegador.
3. Aplique as migrações em [supabase/migrations/](supabase/migrations/). A tabela de controle é a mesma da CLI do Supabase.
   ```bash
   npm run db:migrate
   ```
4. Importe a Bíblia Livre:
   ```bash
   npm run import:bible
   ```
   O script cadastra primeiro a fonte e a licença, e depois os 31.102 versículos.
5. Em *Authentication > Providers > Email*, deixe "Confirm email" como preferir. Depois de criar a sua conta, desative novos cadastros em *Authentication > Sign In / Providers*: o app é de uso pessoal.

## Texto bíblico

- Bíblia Livre (BLIVRE), © 2018 Diego Santos, Mario Sérgio e Marco Teles, sob licença CC BY 4.0 Brasil. Arquivo original em https://eBible.org/Scriptures/porbr2018_vpl.zip.
- `data/bible/blivre.json` é gerado a partir do arquivo original com `npm run bible:build`. Antes, coloque o `porbr2018_vpl.txt` em `data/source/`.
- Outras versões (ARC, NVI, NVT, NTLH) **não** são embutidas. O leitor só oferece um link "Ler em outra versão".

## Estrutura

- `src/app/(app)/`: telas com a navegação (Hoje, Bíblia, Marcadores, Notas, Fontes, Mais)
- `src/app/perfis`, `src/app/entrar`: escolha de perfil e login
- `src/components/`: navegação, leitor, formulários
- `src/lib/bible/`: livros, referências, fonte e leitura do texto
- `src/lib/actions/`: ações do servidor (login, perfis, marcadores, notas)
- `supabase/migrations/`: migrações versionadas, com RLS
