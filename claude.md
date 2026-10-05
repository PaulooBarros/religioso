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

### Etapa 2 (concluída em 2026-10-01, a pedido do dono, sem os catecismos)

Decisão do dono: catecismos entram pelo **texto original em domínio público com tradução automática rotulada** ("tradução automática do original", com link para o original).

- [x] Task 1: cards e questões. Tabelas `themes` (8 temas da sistemática, subtemas na Etapa 3) e `study_items` (card ou múltipla escolha de 2 a 6 alternativas, tema, nível, explicação, fonte com link opcional, referências bíblicas conferidas contra a base), RLS por perfil. Telas em Estudar: lista com filtros por tipo e tema, criar, editar e apagar; "Criar card" no leitor já traz a referência. Na barra do celular, "Estudar" entrou no lugar de "Fontes" (que está em Mais).
- [x] Ajuste (pedido do dono): barra lateral redimensionável (arrastar a borda, 200 a 360 px; clique duplo volta ao padrão; setas do teclado) e recolhível numa faixa só de ícones. Preferência salva em cookie.
- [x] Lote 1 de questões (enviado pelo dono, gerado por IA): 61 itens (32 cards, 29 múltipla escolha) importados como **rascunho** com `npm run import:items`. Referências conferidas na base; 25 links verificados. Os links de `reformedbaptist.org` recusam acesso automático (HTTP 403) e foram trocados pela página do capítulo citado da Confissão de 1689 no CCEL (`ccel.org/creeds/bcf/bcfcNN.htm`). Estudar ganhou abas Rascunhos/Aprovados, selo "Fala da IA (com fontes)", fonte verificada ou não, aviso de tradução automática e Aprovar/Editar/Descartar; item da IA só é aprovado com fonte verificada. SAL-010 traz observação: falta fonte arminiana primária.
- [x] Task 2: revisão espaçada. Agendador SM-2 com um passo de aprendizado em `src/lib/srs.ts` (novo: Errei < 1 min, Difícil 6 min, Bom 1 dia, Fácil 4 dias; testes em `npm run test:srs`). Tabelas `review_states` e `review_logs` com RLS. Revisão do dia = aprovados vencidos até o fim do dia (horário de Brasília) + até 10 novos por dia. Sessão em tela cheia (`/revisao`): card com Revelar e quatro notas; múltipla escolha corrigida sozinha (acerto = Bom, erro = Errei) com explicação; item errado volta na mesma sessão; atalhos Espaço, 1–4, A–F, Enter, F, Z (desfazer), Esc; resumo no fim. Tela Hoje com o card da revisão, sequência de dias e grade de 14 dias. Modo "Revisar erros" (`/revisao?modo=erros`): itens cuja última resposta foi Errei.
- [x] Lote 2 de questões (revisado pelo dono): 30 itens de Panorama bíblico (Pentateuco e históricos) importados já **aprovados** e sem verificação automática de links, por decisão do dono (`--approve --skip-link-check`; os links ficam como "não verificados"). Novo tema de topo: Panorama bíblico.
- [x] Task 3: catecismos (feita depois da Task 1 da Etapa 3, a pedido do dono). **Breve Catecismo de Westminster** (1647, 107 perguntas, original inglês) e **Catecismo de Heidelberg** (1563, 129 perguntas, original alemão e inglês de 1863 da edição de Schaff, 1877), ambos em domínio público, com fonte registrada. Português = tradução automática feita por IA, sempre rotulada, com o original ao lado e link. A tradução inglesa moderna do Heidelberg (com direitos autorais) foi descartada. Tabelas `catechisms`, `catechism_questions`, `catechism_enrollments`. Tela Catecismos: ativar com 2, 4, 6 ou 10 novas por dia, pausar, lista de perguntas com estado e filtro. As perguntas liberadas viram cards aprovados (origem `catecismo`) e entram primeiro entre os itens novos da revisão do dia.
- [ ] **Pendente:** Catecismo de Spurgeon (1855). Todas as cópias acessíveis (Creeds.json, Spurgeon Archive, CCEL) trazem uma edição modernizada que altera o texto (ex.: pergunta 9, "six normal consecutive days" no lugar de "in the space of six days"). Decisão do dono: usar essa edição rotulada como modernizada, ou esperar um texto fiel de 1855.
- [ ] **Pendente:** referências bíblicas (textos de prova) do Westminster e do Heidelberg. As fontes usadas não as trazem; não foram inventadas.

### Etapa 3 (concluída em 2026-10-01)

Decisão do dono: os subtemas vêm dos lotes de questões (último trecho do subtema de cada item); ele completa a estrutura e as leituras pela tela.

- [x] Task 1: trilha. Tabelas `subthemes` e `readings` (por perfil, RLS); `study_items.subtheme_id`; notas podem ser de tema/subtema. 62 subtemas criados a partir dos lotes 1 e 2. Domínio: item dominado com intervalo de 21 dias ou mais; percentual do tema = média do avanço até 21 dias; "Não iniciado" sem revisões. Páginas `/trilha` e `/trilha/[tema]`: temas com barra de domínio, subtemas com barra e contagem, questões do subtema com estado (Nova, Em estudo, Dominada), leituras indicadas (marcar como lida), notas do tema, criar/renomear/apagar subtema. "Estudar este tema/subtema" abre a sessão no modo `tema`. Formulário do item escolhe subtema; `import:items` liga os próximos lotes aos subtemas.
- [x] Task 2: simulados. Tabelas `exams` e `exam_answers` (RLS; a questão é copiada na hora da prova, então o gabarito não muda se o item for editado ou apagado). Só questões de múltipla escolha aprovadas, sorteadas por tema ou mistas; 10, 20, 30 ou 50 questões (ou o que houver); sem limite, 15, 30 ou 60 min. Prova em tela cheia (`/simulado/[id]`): resposta salva na hora, marcar para revisar, grade de questões, cronômetro que entrega sozinho, continuar depois. Resultado: nota, tempo, acerto por tema com o mais fraco, gabarito comentado com filtro "Só erradas". Questões erradas são registradas como "Errei" e voltam à revisão a partir do dia seguinte; acertos não mudam o agendamento. Tela Simulados: novo simulado, diagnóstico por tema (percentual e tendência entre as duas últimas provas) e histórico. "Simulado do tema" na trilha.
- [x] Task 3: prioridade dos temas fracos. Tema com menos de 70% de acerto no **simulado mais recente** (até 7 dias depois dele) passa na frente na revisão do dia, do mais fraco ao menos fraco: entre os itens vencidos, logo depois dos que estão em passo de aprendizado; entre os novos, logo depois das perguntas de catecismo do dia. Um simulado novo substitui a prioridade anterior. A tela Hoje mostra "Primeiro: tema (x% no último simulado, n itens)" e o resultado do simulado avisa quais temas ganharam prioridade. Sem migração (regra em `getWeakThemes`, `src/lib/exams.ts`, e na ordenação de `src/lib/review.ts`). Conferido por typecheck e lint; sem teste automático da ordenação.

**Etapa 3 concluída em 2026-10-01**, faltando só o teste manual do dono.

- [ ] **Pendente:** o item SAL-010 foi aprovado, mas a visão arminiana ainda não tem fonte primária (Artigos Remonstrantes ou sermões de Wesley).

### Etapa 4 (em andamento)

Antes da Task 2, o dono precisa resolver:

- [ ] Chave da Anthropic em `.env.local` (`ANTHROPIC_API_KEY`), só no servidor.
- [ ] Como obter as fontes: busca na web da própria API da Anthropic (recomendado) ou outro provedor.
- [ ] Versão para compartilhar com a célula: só PDF e copiar texto por enquanto (recomendado) ou página pública.
- [ ] Testar se `api.anthropic.com` abre na rede do dono (a rede corporativa bloqueia vários sites).

Tasks:

- [x] Task 1: mensagens sem IA (2026-10-05). Tabelas `messages` (passagem de um capítulo ou trecho dele, modelo, tempo, perfil do grupo, tema, blocos em JSON, número da versão, data em que foi ensinada) e `message_versions`, com RLS. Os três modelos (expositiva, temática, narrativa) ficam no código (`src/lib/message-templates.ts`): definem os blocos iniciais e a orientação de cada bloco; trocar o modelo muda as orientações e os títulos padrão, não o texto. Telas: `/celula` (em preparo e ensinadas), `/celula/nova` e o editor `/celula/[id]`: título, trocar passagem (conferida contra a base), blocos com subir/descer, renomear, remover e adicionar, bloco Leitura com o texto da Bíblia Livre ("Da sua base"), notas do dono que tocam a passagem, estimativa de tempo de fala (130 palavras por minuto), salvamento automático, "Guardar versão", ver versão antiga em modo leitura e restaurar (o esboço atual é guardado antes), marcar como ensinada e apagar. Passagem que atravessa capítulos ainda não é aceita. Conferido por typecheck, lint e 14 verificações de isolamento no banco; telas não testadas no navegador.
- [ ] Task 2: rascunho com IA. Entradas: passagem, tempo, perfil do grupo e tema. Parte do texto da base e das notas do dono sobre a passagem; afirmações factuais com link verificado ou marcadas "sem fonte verificada"; texto de versículo sempre da base.
- [x] Task 3: conferência e impressão (2026-10-05). Painel **Conferência** no editor. Itens automáticos: as referências escritas no esboço existem na base (acha "Rm 8:31-39", "Romanos 8.28", "1 Co 13" e "v./vv." no texto livre; capítulo ou versículo inexistente bloqueia; "v." fora da passagem só avisa), nenhum bloco em branco (bloqueia) e cabe no tempo (só avisa). Itens manuais, marcados pelo dono: "o texto sustenta o ponto N" para cada ponto numerado, "a aplicação nasce dos pontos", "as perguntas levam de volta ao texto" e "reli o esboço com a passagem aberta". Editar um ponto desmarca só aquele ponto. "Marcar como pronta" só libera com tudo conferido, e o servidor refaz a conferência; qualquer edição devolve a mensagem a "em preparo". Colunas `checks` e `ready_at`; a lista ganhou o grupo Prontas. **Versão para impressão** em `/celula/[id]/imprimir` (fora do menu): imprimir ou salvar em PDF pelo navegador, com ou sem o texto bíblico, crédito da Bíblia Livre no rodapé e "Copiar como texto" para WhatsApp. Lógica em `src/lib/message-checks.ts` e `src/lib/bible/extract.ts`, com 26 testes (`npm run test:messages`). Nomes de livro que o sistema não reconhece não são apontados como erro. Telas não testadas no navegador.
- [x] Task 4: séries (2026-10-05), sem a sugestão automática de divisão, que depende da IA e fica para a Task 2. Tabela `series` (título, livro ou tema, modelo, tempo e perfil do grupo padrão; RLS); cada semana é uma mensagem (`messages.series_id` e `series_position`). `/celula/series/nova`: as semanas são escritas uma por linha ("Rm 8:1-11 | Nenhuma condenação"), cada passagem conferida contra a base, até 12 semanas. `/celula/series/[id]`: semanas numeradas com estado (A preparar, Em preparo, Pronta, Ensinada em…), subir/descer, tirar da série (a mensagem fica), acrescentar semana, editar e apagar a série (as mensagens ficam). **Histórico do grupo:** lista "Já ensinado ao grupo" na página da série e aviso "passagem já ensinada" na semana e no editor quando a passagem tem versículos em comum com outra mensagem ensinada. A tela Célula lista as séries com progresso; mensagens de série aparecem só dentro dela. Conferido por typecheck, lint, 34 testes (`npm run test:messages`) e 11 verificações de isolamento no banco; telas não testadas no navegador.
- [x] Task 5: banco de ilustrações e perguntas (2026-10-05). Tabelas `snippets` (tipo, texto, tema, referências bíblicas conferidas na base, fonte e link opcionais) e `snippet_uses` (em quais mensagens o item foi inserido), com RLS. `/celula/banco`: criar, editar, apagar, abas por tipo e busca por texto, tema, referência ou fonte (ignora acentos); ilustração sem fonte aparece marcada "Sem fonte"; cada item mostra em quantas mensagens foi inserido. No editor, o link "banco" de cada bloco abre o seletor: inserir no bloco (a ilustração leva junto "(Fonte: …)"; perguntas entram uma por linha), aviso de item já usado em outras mensagens, e "guardar o texto deste bloco" (no bloco de perguntas, uma pergunta por linha; repetidas são ignoradas). O link da fonte não é verificado automaticamente. Conferido por typecheck, lint, 44 testes (`npm run test:messages`) e 12 verificações de isolamento no banco; telas não testadas no navegador.

**Etapa 4: falta só a Task 2 (rascunho com IA e sugestão de divisão de séries), que espera a chave da Anthropic.**

### Etapa 9 (em andamento, adiantada a pedido do dono enquanto o conteúdo histórico da Etapa 5 é gerado com `PROMPT-HISTORIA.md`)

Só a parte sem IA: devocionais escritos pelo dono. A geração de rascunhos com a IA espera a chave da Anthropic.

- [x] Task 1: séries e dias (2026-10-05). Tabelas `devotional_series` (título, livro ou tema, descrição, modelo, ritmo em dias da semana, estado, âncora da agenda) e `devotionals` (dia com passagem, blocos, marca de leitura e anotação), com RLS. Três modelos no código (`src/lib/devotional-plan.ts`): observação/reflexão/aplicação/oração, SOAP e texto livre. Telas na aba Devocionais da Bíblia (`/biblia/devocionais`): lista por grupo (em andamento, não iniciadas, concluídas, arquivadas) com barra de progresso; nova série (dias escritos um por linha, "Sl 23:1-4 | Título", até 60, ritmo diário ou dias escolhidos); página da série com estados e ações (rascunho: ativar com data de início, excluir; ativa: pausar, arquivar; pausada: retomar, arquivar; concluída: recomeçar, arquivar; arquivada: restaurar, excluir), dias com ✓ lido, ◆ hoje, ○ futuro, – pulado e a data de cada um, subir/descer, excluir e acrescentar dia; página do dia para escrever (título, passagem, texto da Bíblia Livre "Da sua base", blocos do modelo). Agenda: o dia da âncora cai na data da âncora e os seguintes nos próximos dias do ritmo; ao retomar uma série pausada, o primeiro dia não lido passa para hoje. Conferido por typecheck, lint, 26 testes (`npm run test:devotionals`) e 13 verificações no banco; telas não testadas no navegador.
- [x] Task 2: uso diário (2026-10-05). Cartão **Devocional de hoje** na tela Hoje, um por série ativa: o dia marcado para hoje; sem ele, o dia pulado mais antigo ("atrasado"); com tudo em dia, o que foi lido hoje. A página do dia abre em modo leitura (título, passagem "Da sua base", blocos escritos), com "Minha anotação" (salva ao sair do campo ou pelo botão), "Marcar como lido" (desmarcável), "Criar card" já com a referência, e "Editar texto"; dia em branco abre direto no editor. Ler o último dia conclui a série; desmarcar um dia de série concluída a deixa pausada. Conferido por typecheck, lint e 31 testes (`npm run test:devotionals`); telas não testadas no navegador.
- [ ] Pendente: lembrete no horário escolhido. Depende de notificações do navegador, que só funcionam bem com o app publicado; fica para o deploy (Etapa 10).
- [x] Task 3: compartilhar (2026-10-05). Página `/biblia/devocionais/[id]/[dia]/compartilhar` (fora do menu), aberta pelo botão Compartilhar do dia: pré-visualização no formato de mensagem (título em negrito, série e dia, primeiro versículo em itálico com a referência e o crédito "Bíblia Livre", blocos escritos, "Para orar"), "Copiar como texto" para WhatsApp e "Imprimir ou salvar em PDF" com a passagem inteira e o crédito exigido no rodapé; opções de incluir a passagem e a anotação do dono. **Ligação com a Célula:** a série de devocionais pode ser ligada a uma série de célula (`devotional_series.cell_series_id`); a página da série de célula lista os devocionais que a acompanham. Compartilha um dia por vez; não há exportação da série inteira. Conferido por typecheck, lint e 33 testes (`npm run test:devotionals`); telas não testadas no navegador.

**Etapa 9: feita a parte sem IA.** Faltam a geração de rascunhos com a IA e o lembrete diário.
- [ ] Depende da chave da Anthropic: gerar os dias como rascunho com fontes verificadas e fila de aprovação.

### Etapa 10 (em andamento, adiantada a pedido do dono)

- [x] Task 1: plano de leitura bíblica (2026-10-05). Tabelas `reading_plans` (livros, número de dias, data de início) e `reading_plan_days` (dias lidos), com RLS; os dias não são gravados, são calculados a partir dos livros, do número de dias e da contagem de versículos da base (`src/lib/reading-plan.ts`). Os capítulos são divididos por tamanho em versículos e nunca são partidos (o Salmo 119 fica sozinho num dia). Aba "Plano de leitura" na Bíblia (`/biblia/plano`): planos prontos (Bíblia em um ano, Novo Testamento em 90 dias, Evangelhos em 30 dias, Salmos em 60 dias) ou livros e dias à escolha, com data de início; página do plano com barra de progresso, situação contra o calendário (em dia, N dias de atraso, adiantado), leitura do dia com atalho para cada capítulo no leitor, marcar e desmarcar qualquer dia, "Reajustar datas" (a próxima leitura passa para hoje sem perder o que foi lido), arquivar e excluir. Cartão "Leitura de hoje" na tela Hoje. Conferido por typecheck, lint, 26 testes (`npm run test:plan`) e 11 verificações no banco; telas não testadas no navegador.
- [ ] Task 2: testes E2E com Playwright nos fluxos principais. Precisa de uma conta de teste no Supabase e de baixar o navegador do Playwright (a rede do dono pode bloquear).
- [ ] Task 3: deploy e README. Decisões do dono: onde publicar (Vercel recomendado) e trocar antes a senha provisória do banco.
- [ ] Biblioteca pessoal com busca semântica (pgvector): precisa de um serviço de embeddings, com chave própria. A decidir.

### Acréscimos sem IA e sem internet (pedidos pelo dono em 2026-10-05, feitos na ordem)

Lista combinada: (1) busca por palavra na Bíblia; (2) memorização de versículos; (3) estatísticas de estudo; (4) notas melhores; (5) leitor (copiar versículo, teclado, marcar o plano ao ler); (6) revisão (suspender, editar na sessão, limite diário, verdadeiro ou falso); (7) célula (pedidos de oração, agenda); (8) fichas de teólogos e movimentos com comparador; (9) trilha da fé batista; (10) backup.

- [x] 1. Busca por palavra na Bíblia. Aba "Buscar" (`/biblia/busca`): versículos com todas as palavras, sem diferenciar acentos nem maiúsculas; aspas para expressão exata; asterisco para começo de palavra; filtro por testamento e por livro (com a contagem de cada livro); 50 resultados por página; palavras achadas em destaque; cada resultado abre o leitor no versículo. A busca roda no servidor sobre o texto local da Bíblia Livre (sem tabela nova). A barra do topo passou a aceitar palavras: o que não for referência vira busca. Conferido por typecheck, lint e 24 testes (`npm run test:search`); tela não testada no navegador.
