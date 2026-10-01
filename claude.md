# Estúdio Teológico

## Visão geral

Aplicativo web de uso **pessoal** (um único usuário) para aprofundar estudos teológicos a partir da perspectiva de um batista reformado da CBB, sem se fechar nela: também estuda com fidelidade outras tradições (presbiterianos, pentecostais, neopentecostais, wesleyanos).

O motor do sistema é **questões + revisão espaçada**, porque o dono aprende melhor estudando por questões e exercícios. Em volta dele ficam o texto bíblico, as anotações, a trilha de teologia sistemática, a história da igreja, as fichas de teólogos e movimentos, e um gerador de **mini-mensagens para célula**.

## Princípios (valem para todas as etapas)

1. **IA livre, mas sempre com fonte.** A IA pode responder, explicar e comparar usando o próprio conhecimento, sem ficar restrita ao material carregado. Em troca, **toda afirmação factual** (o que um autor disse, obra, data, posição de uma tradição, versículo) vem acompanhada de **link de fonte**. Os links precisam ser reais: o sistema obtém as fontes por busca na web feita pela API (que devolve URLs verdadeiras, em vez de a IA escrever links de cabeça) e **verifica se cada link abre** antes de exibir. Afirmação sem fonte confirmada aparece marcada como "sem fonte verificada" e não entra no banco de estudo. O texto de um versículo nunca sai da IA: ela informa a referência e o sistema busca o texto na base. A tela separa visualmente **"Da sua base"** e **"Fala da IA (com fontes)"**.
2. **A IA rascunha, o dono decide.** Questões, cards, esboços e resumos gerados entram como *rascunho* e só viram parte do banco depois de aprovados. Mensagens para célula são sempre revisadas contra o texto bíblico.
3. **Justiça com as tradições.** Cada posição é descrita **nos termos dos próprios adeptos**, com fonte primária (confissão, declaração de fé, obra do autor). Sem caricatura e sem a IA declarar "quem tem razão". A tradição do dono serve de âncora de estudo, mas as demais são apresentadas com o mesmo cuidado.
4. **Pessoas vivas.** Para teólogos contemporâneos (John Piper, Yago Martins, Pedro Pamplona, Guilherme Nunes e outros que o dono incluir), a ficha é **preenchida pelo dono** a partir de livros, sermões e vídeos que ele leu ou assistiu, sempre com a fonte. A IA pode comentar sobre essas pessoas, mas só com fonte linkada e verificada (princípio 1) e sempre rotulada como fala da IA. Atribuição de posição a pessoa viva sem fonte verificada não é exibida como fato. Dados como denominação e vínculo institucional só entram na ficha se confirmados numa fonte.
5. **Rótulos amplos exigem cuidado.** "Neopentecostal", por exemplo, agrupa igrejas muito diferentes. Descrever por igreja ou movimento específico, com a declaração de fé ou obra dele, e não generalizar.
6. **Direitos autorais.** Só embutir no sistema textos em domínio público (ex.: o texto original da Confissão de Fé Batista de 1689 e sermões antigos; ou com licença livre, como a Bíblia Livre, CC BY 4.0. Revisões e traduções modernas têm direitos próprios: a lista verificada está em `KIT-FONTES-LIVRES.md`). Obras protegidas e traduções modernas entram apenas como **anotações e resumos do próprio dono**, nunca como cópia do texto. A IA também não reproduz trechos longos de obras protegidas: resume com as próprias palavras e aponta o link da fonte.
7. **Leve e sempre funcionando.** Cada etapa termina com algo utilizável.
8. **Camadas de comentário nunca se misturam.** Comentário de autor clássico, nota do dono e fala da IA aparecem separados e rotulados. Texto da IA **nunca** é atribuído a um teólogo nem tem aparência de comentário dele. Tradução ou resumo automático de obra de domínio público é marcado como tal, com link para o original.

## Stack

- Next.js (App Router) com TypeScript
- Supabase (Postgres gerenciado) para banco de dados, autenticação e armazenamento de arquivos, com políticas de acesso por linha (RLS) para que só o dono veja os dados
- Autenticação pelo Supabase Auth (uso pessoal). Chave de serviço do Supabase e chave da Anthropic ficam **apenas no servidor**, nunca no navegador.
- IA: API da Anthropic, chamada **somente no servidor**, chave em variável de ambiente
- Revisão espaçada: algoritmo simples do tipo SM-2
- Testes: Playwright para os fluxos principais

## Design

O design segue o `BRIEFING-DESIGN.md` e os acréscimos do `PROMPT-DESIGN-2.md` (perfis e marcadores, devocionais, comentários bíblicos e trilha da fé batista). Decisões-chave: celular e desktop com o mesmo peso, visual sóbrio e clássico (leitura em primeiro lugar, uma única cor de destaque), tela inicial na Revisão do dia, e distinção sempre visível entre "Da sua base" e "Fala da IA (com fontes)". Ao implementar a interface, seguir o sistema de design entregue a partir desse briefing.

## Como trabalhar neste projeto

- Fazer **uma etapa por vez**, na ordem abaixo, sem adiantar.
- Antes de cada etapa, resumir em poucas linhas o que será feito e esperar confirmação.
- Ao terminar, dizer como rodar, o que foi entregue e atualizar a seção "Andamento".
- Se houver duas opções razoáveis, explicar em uma frase cada e recomendar uma.
- Comunicação em português do Brasil. Nomes de código, variáveis e commits em inglês.
- Não inventar conteúdo doutrinário ou histórico. Se faltar fonte, deixar o campo vazio e avisar.

## Conceitos de dados (visão geral, detalhar na Etapa 1)

- **Passagem:** texto bíblico da base (livro, capítulo, versículo).
- **Nota:** anotação do dono ligada a passagens, temas, teólogos ou movimentos.
- **Tema:** assunto da teologia sistemática (Escritura, Deus, Cristo, Espírito Santo, homem e pecado, salvação, igreja, últimas coisas) e seus subtemas.
- **Card e Questão:** itens de estudo, com tema, nível, resposta, explicação, fonte e estado de revisão.
- **Teólogo:** época, obras, tradição, posições por tema, cada uma com fonte.
- **Movimento/Tradição:** batistas gerais e particulares, presbiterianos, pentecostais clássicos, neopentecostais (por igreja específica), wesleyanos/metodistas, entre outros, com suas declarações de fé.
- **Posição:** o que um teólogo, confissão ou movimento afirma sobre um tema, com fonte.
- **Mensagem:** mini-mensagem para célula, com versões e modelo usado.
- **Catecismo:** conjunto ordenado de perguntas e respostas com referências bíblicas, cada uma virando um card.
- **Simulado:** tentativa cronometrada, com resultado por tema.
- **Série:** conjunto ordenado de mensagens de célula, com ilustrações e perguntas de discussão reutilizáveis.
- **Perfil:** dono dos marcadores, notas, progresso e revisões.
- **Fonte:** origem e licença de cada texto embutido, com link, data de verificação e crédito exigido.
- **Marcador:** passagem salva por um perfil, com nome e etiqueta opcionais; existe um marcador automático "onde parei".
- **Comentário:** texto ligado a uma passagem ou versículo, com camada (autor clássico, nota própria ou IA), autor, obra, edição, link e indicação de tradução automática quando houver.
- **Devocional e Série de devocionais:** texto diário ligado a uma passagem, e conjunto ordenado deles, com ritmo, estado e progresso.

## Etapas

### Etapa 1: Base e texto bíblico
- Criar o projeto Next.js, o projeto no Supabase, as tabelas (com migrações versionadas) e as políticas de acesso (RLS).
- Importar a **Bíblia Livre** (CC BY 4.0, ver `KIT-FONTES-LIVRES.md`) e criar um leitor simples com busca por referência, com o crédito exigido no rodapé. A ARC e outras versões modernas **não** são embutidas: para elas, guardar só a referência e oferecer "Ler em outra versão".
- Criar a tabela de **fontes e licenças** (nome, autor ou tradutor, ano, licença, link, data de verificação, crédito exigido) e a página "Fontes e licenças". Nenhum texto entra no banco sem uma fonte cadastrada.
- Criar notas ligadas a passagens.
- **Perfis e marcadores:** cada perfil tem os seus próprios marcadores, notas, progresso e revisões, isolados por RLS. Marcadores de passagem com nome e etiqueta opcionais, mais o marcador automático "onde parei", que alimenta o "Continuar lendo". Tudo sincronizado entre celular e desktop.
- **Pronto quando:** dá para ler qualquer passagem e salvar uma nota e um marcador nela, dentro do seu perfil.

### Etapa 2: Núcleo de questões, revisão espaçada e catecismos
- Cadastro manual de cards e questões (com tema, nível, explicação e fonte).
- Revisão espaçada e tela de **revisão diária** que puxa o que venceu, com contagem de sequência de dias.
- Modo "revisar erros".
- **Catecismos** como primeiro conteúdo real: Breve Catecismo de Westminster, Catecismo de Heidelberg e Catecismo de Spurgeon, com cada pergunta virando um card (pergunta, resposta e referências bíblicas). Ritmo sugerido: um catecismo por semana, liberando poucas perguntas por dia. **Atenção:** os catecismos originais são de domínio público, mas a **tradução em português pode ter direitos autorais**. Antes de embutir, confirmar a licença da tradução; se não for livre, o dono cadastra o texto como anotação própria.
- **Pronto quando:** dá para cadastrar itens, revisá-los, ver o agendamento funcionando e estudar um catecismo pela revisão diária.

### Etapa 3: Trilha de teologia sistemática e simulados
- Estrutura de temas e subtemas com leituras indicadas, notas, cards e questões.
- Acompanhamento de progresso por tema.
- **Simulados:** prova cronometrada por tema (ou mista), com número de questões e tempo configuráveis. Ao fim, nota, gabarito comentado e **diagnóstico por tema** (percentual de acerto e tendência). Os temas com pior desempenho ganham prioridade na revisão diária seguinte.
- **Pronto quando:** dá para percorrer um tema do início ao fim, com questões vinculadas, e fazer um simulado com diagnóstico.

### Etapa 4: Mini-mensagens e séries para célula (com IA e modelos)
- **Modelos de estrutura** selecionáveis, por exemplo: expositiva (passagem versículo a versículo), temática, narrativa. Cada modelo define os blocos: abertura/quebra-gelo, leitura do texto, contexto, pontos principais, aplicação, perguntas para discussão e oração.
- Entradas: passagem, tempo disponível (ex.: 10 a 20 minutos), perfil do grupo e tema.
- A IA monta o rascunho a partir do **texto bíblico da base e das notas do dono sobre aquela passagem**, e pode complementar com o próprio conhecimento (contexto histórico, paralelos, ilustrações), sempre com link de fonte verificado nas afirmações factuais (princípio 1).
- Editor para ajustar, salvar versões e marcar mensagens usadas.
- Lista de conferência antes de finalizar: "o texto sustenta cada ponto?", "as referências existem na base?".
- Exportar para PDF ou versão para impressão/compartilhar.
- **Séries:** agrupar mensagens em uma série de 4 a 6 semanas sobre um livro ou tema, com ordem, título, passagem de cada semana e histórico do que já foi ensinado ao grupo (para não repetir). A IA pode sugerir a divisão de um livro em semanas com base nas passagens e no tempo disponível.
- **Banco de ilustrações e perguntas de discussão** reutilizáveis, com tema e fonte, que podem ser inseridos nos modelos.
- **Pronto quando:** dá para gerar, editar e exportar uma mini-mensagem a partir de uma passagem e montar uma série.

### Etapa 5: História, fé batista e confissões
- Linha do tempo (igreja antiga, Reforma, puritanos, origens batistas na Inglaterra e Holanda, batistas gerais e particulares, Carey e as missões, chegada ao Brasil, formação da CBB).
- Confissões: leitura guiada da Confissão de Fé Batista de 1689 (capítulo por capítulo, com questões; texto original em inglês com tradução automática rotulada, conforme `KIT-FONTES-LIVRES.md`) e espaço para a Declaração Doutrinária da CBB e outras declarações de fé carregadas pelo dono.
- **Trilha da fé batista**, no mesmo formato da trilha de sistemática (leituras, notas, cards, questões e progresso), com as seções: origens (batistas gerais e particulares); distintivos batistas (autoridade da Escritura, batismo de crentes, igreja local formada por regenerados, sacerdócio de todos os crentes, liberdade de consciência, congregacionalismo); confissões batistas e o que cada uma afirma; a igreja local (membresia, ofícios, assembleia, disciplina); as ordenanças (batismo e Ceia); missões e cooperação (convenções, CBB); batistas no Brasil; e debates internos atuais (por exemplo, calvinismo e arminianismo dentro da denominação), descritos nos termos de cada lado e com fontes.
- **Confissões batistas lado a lado:** comparar, tema a tema, a Confissão de 1689, a Declaração Doutrinária da CBB e outros documentos que o dono carregar, com citação curta e link do documento em cada ponto.
- **Pronto quando:** dá para estudar um período ou um capítulo da confissão, percorrer uma seção da trilha da fé batista e ser testado sobre eles.

### Etapa 6: Teólogos, movimentos e comparador
- Fichas de teólogos históricos (ex.: Agostinho, Calvino, Arminius, Owen, Edwards, Spurgeon, Wesley, Fuller, Carey) e contemporâneos (Piper, Yago Martins, Pedro Pamplona, Guilherme Nunes e outros), obedecendo aos princípios 3 e 4.
- Fichas de movimentos e tradições (batistas, presbiterianos, pentecostais, neopentecostais por igreja específica, wesleyanos), cada uma ancorada na sua declaração de fé.
- **Comparador:** escolher um tema (eleição, expiação, perseverança, batismo, governo da igreja, dons espirituais, escatologia) e ver as posições lado a lado, cada uma com fonte e sem veredito da IA.
- **Pronto quando:** dá para comparar pelo menos três tradições em um tema, com fontes.

### Etapa 7: IA de estudo
- Chat de estudo livre: o dono pergunta qualquer coisa e a IA responde com fontes verificadas, com opção de salvar a resposta como nota (mantendo os links).
- Gerar questões e flashcards a partir de textos que o dono carrega ou de temas escolhidos, entrando como rascunho para aprovação e com a fonte de cada resposta.
- Correção de respostas abertas ("explique justificação em 3 linhas"), apontando o que faltou em relação ao material de referência carregado.
- **Pronto quando:** dá para carregar um texto, gerar rascunhos, aprovar e incluir na revisão.

### Etapa 8: Comentários bíblicos no leitor
- Camadas de comentário por passagem ou versículo, **sempre separadas e rotuladas** (princípio 8): (1) **autores clássicos** de domínio público, com autor, obra, edição e link; (2) **minhas notas**; (3) **fala da IA (com fontes)**.
- Candidatos para a primeira camada, a confirmar licença de cada edição: John Gill (batista), João Calvino, Matthew Henry, Charles Spurgeon (O Tesouro de Davi, para os Salmos), Charles Hodge, Matthew Poole, entre outros. Cobrir várias tradições, não só a do dono, e apresentá-las com o mesmo peso.
- Obras em domínio público costumam existir só em inglês. A IA pode oferecer **tradução ou resumo em português**, marcado como "tradução automática do original", com link para o texto original. Traduções modernas em português normalmente têm direitos autorais e só entram se a licença for confirmada.
- A IA pode escrever comentário próprio, mas **nunca** como se fosse de um autor.
- No leitor: indicador discreto nos versículos com comentário, painel com abas por camada e opção de ocultar tudo para leitura limpa.
- **Pronto quando:** dá para abrir uma passagem, ver ao menos um comentário clássico com fonte e alternar entre as camadas.

### Etapa 9: Devocionais e séries de devocionais
- **Devocional:** texto curto e diário ligado a uma passagem, com estrutura definida por modelo (por exemplo: passagem, observação, reflexão, aplicação e oração; o método SOAP é um exemplo conhecido).
- **Série:** conjunto ordenado de devocionais sobre um livro ou tema, com data de início, ritmo (diário ou dias escolhidos), progresso e estados: rascunho, ativa, pausada, concluída e arquivada.
- **Criação:** manual, por modelo ou com a IA (rascunho a partir da passagem e das notas do dono, com fontes verificadas e aprovação obrigatória). A IA pode propor uma série inteira a partir de um livro ou tema, sempre como rascunho.
- **Uso diário:** "Devocional de hoje" na tela Hoje, marcar como lido, anotar, criar card a partir dele e lembrete no horário escolhido.
- **Compartilhar:** copiar como texto formatado para WhatsApp, exportar PDF e ligar uma série à Célula.
- **Pronto quando:** dá para criar uma série, ativá-la e cumprir o devocional do dia com anotação.

### Etapa 10 (opcional): Extras
- Biblioteca pessoal com busca semântica nas anotações e nos documentos carregados (usando pgvector do Supabase), com resposta citando a fonte.
- Plano de leitura bíblica com acompanhamento.
- Testes E2E com Playwright, deploy e README.

## Decisões em aberto

- Forma de login no Supabase Auth (e-mail e senha ou link mágico) e se, no futuro, mais pessoas terão acesso (ex.: grupo da célula).
- Quais catecismos entram primeiro e qual tradução em português usar (confirmar a licença), além do que o dono está lendo ou estudando agora, para a Etapa 2 já nascer com material dele.
- Quais documentos de confissão e declaração de fé o dono vai carregar e de onde virão.
- Se as mini-mensagens terão versão para compartilhar com o grupo da célula.
- Quais comentaristas clássicos entram primeiro e onde ficam os textos (confirmar licença e edição de cada um).
- Quais modelos de devocional oferecer por padrão.
- Como obter as fontes (ferramenta de busca na web da API da Anthropic ou outro provedor) e o que fazer com link que deixa de abrir depois de salvo (reverificar periodicamente e marcar).

## Andamento

Trabalho por tasks: cada task termina com commit, e a próxima só começa depois de confirmada.

### Etapa 1 (concluída em 2026-10-01)

- [x] **Task 1: base do app, sem banco.** Next.js 16 + design do Claude Design (`design/`); leitor da Bíblia Livre lendo do arquivo local (`data/bible/blivre.json`, 66 livros, 31.102 versículos); busca por referência; "Ler em outra versão" (só link externo); páginas Hoje, Marcadores, Notas, Fontes e licenças, Mais, Perfis e Entrar; migração SQL com tabelas e RLS; script de importação. Decisão tomada pelo design: **vários perfis dentro da mesma conta** ("Quem está estudando?"). Login provisório: e-mail e senha.
- [x] **Task 2: conectar o Supabase** (projeto `religioso`). Chave publishable e `DATABASE_URL` em `.env.local`; migração aplicada com `npm run db:migrate`; Bíblia importada com `npm run import:bible` (fonte cadastrada, 31.102 versículos); leitura pública e bloqueio de escrita conferidos pela API; isolamento entre contas testado por SQL (9 de 9 verificações).
- [x] **Task 3: testar o fluxo completo.** Conta e perfil criados; leitura, nota, marcador e "onde parei" testados manualmente pelo dono. Testes automáticos com Playwright ficam para a Etapa 10.
- [x] **Task 4: ajustes no leitor (pedido do dono).** Grifo por versículo em quatro cores suaves (amarelo, verde, azul, rosa), com "Remover grifo", salvo por perfil (tabela `highlights`, RLS); "Aa" abre um seletor de tamanho em vez de alternar sozinho; botão de modo claro/escuro no topo, no leitor (celular) e em Mais, guardado em cookie.

### Etapa 2 (próxima)

Decisão do dono: catecismos entram pelo **texto original em domínio público com tradução automática rotulada** ("tradução automática do original", com link para o original).

- [x] Task 1: cards e questões. Tabelas `themes` (8 temas da sistemática, subtemas na Etapa 3) e `study_items` (card ou múltipla escolha de 2 a 6 alternativas, tema, nível, explicação, fonte com link opcional, referências bíblicas conferidas contra a base), RLS por perfil. Telas em Estudar: lista com filtros por tipo e tema, criar, editar e apagar; "Criar card" no leitor já traz a referência. Na barra do celular, "Estudar" entrou no lugar de "Fontes" (que está em Mais).
- [x] Ajuste (pedido do dono): barra lateral redimensionável (arrastar a borda, 200 a 360 px; clique duplo volta ao padrão; setas do teclado) e recolhível numa faixa só de ícones. Preferência salva em cookie.
- [x] Lote 1 de questões (enviado pelo dono, gerado por IA): 61 itens (32 cards, 29 múltipla escolha) importados como **rascunho** com `npm run import:items`. Referências conferidas na base; 25 links verificados. Os links de `reformedbaptist.org` recusam acesso automático (HTTP 403) e foram trocados pela página do capítulo citado da Confissão de 1689 no CCEL (`ccel.org/creeds/bcf/bcfcNN.htm`). Estudar ganhou abas Rascunhos/Aprovados, selo "Fala da IA (com fontes)", fonte verificada ou não, aviso de tradução automática e Aprovar/Editar/Descartar; item da IA só é aprovado com fonte verificada. SAL-010 traz observação: falta fonte arminiana primária.
- [ ] Task 2: revisão espaçada SM-2, revisão do dia, sequência de dias, "revisar erros".
- [ ] Task 3: catecismos (Westminster Breve, Heidelberg, Spurgeon) com fonte e licença.
