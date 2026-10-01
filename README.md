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

## Lotes de questões

Lotes em JSON (como [data/lotes/lote1questoes.json](data/lotes/lote1questoes.json)) entram como **rascunho** e só vão para a revisão depois de aprovados na tela Estudar.

```bash
npm run import:items -- data/lotes/lote1questoes.json --dry-run   # só confere
npm run import:items -- data/lotes/lote1questoes.json             # grava
```

O script:
- mapeia tema, nível e tipo para o modelo do app;
- confere as referências bíblicas contra a base;
- verifica cada link de fonte;
- reimporta sem duplicar, usando o `id` de cada item. Um item reimportado volta para rascunho.

Com mais de um perfil, use `--profile "Nome"`.

Se você mesmo já revisou o lote e as fontes, há duas opções:
- `--approve`: os itens entram já aprovados;
- `--skip-link-check`: os links não são verificados e ficam como "não verificados", nunca como "verificada".

Exemplo: `npm run import:items -- data/lotes/lote2questoes.json --approve --skip-link-check`.

## Catecismos

Os textos ficam em `data/catechisms/`: o original (`*.json`) e a tradução automática (`*.pt.json`).

```bash
npm run catechisms:build     # recria os originais a partir de data/source/catechisms/
npm run import:catechisms    # grava fontes, catecismos e perguntas no banco
```

- **Breve Catecismo de Westminster (1647):** original em inglês, domínio público.
- **Catecismo de Heidelberg (1563):** original alemão e tradução inglesa de 1863, da edição de Philip Schaff (1877), domínio público. A tradução inglesa moderna que circula na internet tem direitos autorais e não é usada.
- **Catecismo de Spurgeon (1855):** ainda fora. As cópias disponíveis trazem uma edição modernizada, com trechos alterados.

O português é tradução automática do original e aparece sempre rotulado assim, com o original ao lado.

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
