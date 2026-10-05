# Prompt: conteúdo histórico da Etapa 5

Como usar: abra uma conversa nova com o Claude **com a busca na web ligada**, cole tudo o que está abaixo da linha e troque o período na última seção. Peça um período por vez (são oito). Salve cada resposta em `data/historia/<id-do-periodo>.json`.

---

Preciso da sua ajuda para montar a linha do tempo de história da igreja de um aplicativo de estudo teológico de uso pessoal, o Estúdio Teológico. Vou pedir um período por vez; o período desta conversa está no fim da mensagem.

## Para que serve

Sou batista reformado, membro de uma igreja da Convenção Batista Brasileira (CBB), e estudo por questões e revisão espaçada. O aplicativo já tem a Bíblia, questões de teologia sistemática, catecismos e mensagens para célula. Agora entra a história: uma linha do tempo que eu leio período por período e sobre a qual sou testado depois.

O que você escrever será importado por um script e aparecerá na tela marcado como "Fala da IA (com fontes)", como rascunho. Eu leio, confiro e aprovo item por item antes de ele entrar no meu banco de estudo. Por isso o que mais me ajuda é conteúdo que eu consiga conferir rápido: afirmações precisas, cada uma com uma fonte que abre.

## Como eu quero que a história seja contada

**Fonte em cada evento.** Todo evento precisa de pelo menos uma fonte com link. Use a busca na web para encontrar a página e copie o endereço que a busca devolveu; não escreva links de memória, porque o aplicativo testa cada link e descarta o que não abre. Prefira, nesta ordem: o documento primário (o texto do concílio, da confissão, da carta, do sermão), uma obra de referência em domínio público e, por último, uma página institucional ou acadêmica estável. Sites como ccel.org, newadvent.org, earlychristianwritings.com e as páginas oficiais das convenções e arquivos batistas costumam servir. Evite blogs, redes sociais e a Wikipédia como fonte final (ela pode servir de caminho para chegar ao documento).

**Se não achar fonte, diga.** Quando você não conseguir confirmar um fato numa fonte que abre, mantenha o evento só se ele for essencial ao período, marque `"sem_fonte_verificada": true` e explique em `observacao` o que falta. Um campo vazio é melhor que um dado inventado: prefiro doze eventos sólidos a vinte duvidosos.

**Datas incertas ficam incertas.** Se os historiadores divergem ou a data é aproximada, marque `"data_aproximada": true` e diga em `observacao` qual é a dúvida.

**Cada tradição nos seus próprios termos.** A linha do tempo passa por católicos, ortodoxos, luteranos, reformados, anglicanos, anabatistas, batistas gerais e particulares, metodistas e pentecostais. Descreva o que cada grupo afirmava com as palavras que ele mesmo usaria e, quando possível, com o documento dele como fonte. Não declare quem tinha razão; a minha tradição é o ponto de onde eu estudo, e não um veredito sobre as outras. Onde houver leituras diferentes de um mesmo fato (por exemplo, as origens dos batistas), apresente as principais e diga quem defende cada uma.

**Pessoas vivas.** Não atribua posição ou fato a pessoa viva sem uma fonte verificada, de preferência dela mesma. Na dúvida, deixe a pessoa fora.

**Direitos autorais.** Escreva os resumos com as suas palavras. Citação literal só em `trecho_citado`, com até 25 palavras, e só de obra em domínio público.

**O que importa para um batista.** No campo `importancia_batista`, diga em uma ou duas frases por que aquele evento interessa a quem estuda a história batista, quando houver uma ligação real. Quando não houver, deixe `null`; não force a ligação.

## O que entregar

Um único arquivo JSON, sem texto antes ou depois, neste formato:

```json
{
  "lote_historia": 1,
  "gerado_em": "AAAA-MM-DD",
  "periodo": {
    "id": "igreja-antiga",
    "nome": "Igreja antiga",
    "ano_inicio": 30,
    "ano_fim": 600,
    "resumo": "De três a cinco frases: o que define o período e por que ele importa.",
    "fontes": [
      { "titulo": "", "autor": "", "ano": "", "url": "", "tipo": "primaria" }
    ]
  },
  "eventos": [
    {
      "id": "IA-001",
      "ano": 325,
      "ano_fim": null,
      "data_aproximada": false,
      "titulo": "Concílio de Niceia",
      "descricao": "De duas a quatro frases: o que aconteceu, quem estava envolvido e o que resultou.",
      "local": "Niceia (atual İznik, Turquia)",
      "pessoas": ["Atanásio de Alexandria", "Ário"],
      "tradicoes": ["igreja antiga"],
      "importancia_batista": null,
      "fontes": [
        {
          "titulo": "",
          "autor": "",
          "ano": "",
          "url": "",
          "tipo": "primaria",
          "trecho_citado": ""
        }
      ],
      "sem_fonte_verificada": false,
      "observacao": ""
    }
  ],
  "leituras": [
    {
      "titulo": "",
      "autor": "",
      "ano": "",
      "url": "",
      "idioma": "en",
      "dominio_publico": true,
      "observacao": "Uma frase: o que ler ali e por quê."
    }
  ],
  "questoes": [
    {
      "id": "HIS-IA-001",
      "tipo": "card",
      "nivel": "basico",
      "tema": "História da igreja",
      "subtema": "Igreja antiga",
      "pergunta": "",
      "alternativas": [],
      "alternativa_correta": null,
      "resposta": "",
      "explicacao": "",
      "referencias_biblicas": "",
      "fonte": "",
      "link_fonte": "",
      "traducao_automatica": false,
      "status": "rascunho"
    }
  ]
}
```

Detalhes do formato:

- **Quantidade:** de 12 a 20 eventos, de 3 a 6 leituras e de 10 a 15 questões por período.
- **`id` dos eventos:** as iniciais do período e um número de três dígitos, em ordem cronológica (`IA-001`, `IA-002`…). Nas questões, `HIS-` antes das iniciais.
- **`tipo` da fonte:** `primaria` (documento da época) ou `secundaria`.
- **`tradicoes`:** em minúsculas, os grupos envolvidos no evento.
- **Questões:** `tipo` é `card` ou `multipla_escolha`; `nivel` é `basico`, `intermediario` ou `dificil`. Em múltipla escolha, `alternativas` tem de quatro a cinco textos e `alternativa_correta` é a posição da certa começando em 0; em card, fica como no exemplo. Faça mais ou menos metade de cada tipo.
- **Cada questão testa um evento da lista** e repete em `fonte` e `link_fonte` a fonte daquele evento. `referencias_biblicas` normalmente fica vazio em história.
- **`traducao_automatica`:** `true` quando a resposta ou a explicação traz a sua tradução de um texto em outra língua.
- Texto todo em português do Brasil. Nomes de pessoas e lugares na forma usual em português, com o original entre parênteses na primeira vez quando ajudar a pesquisar.

Antes de entregar, releia o arquivo como se fosse eu conferindo: cada link veio da busca? Cada data bate com a fonte citada? Alguma tradição foi descrita de um jeito que os próprios adeptos não reconheceriam? Depois do JSON, não escreva mais nada; se houver algo que eu precise saber (um evento que você deixou de fora por falta de fonte, uma divergência entre historiadores), ponha no campo `observacao` do evento ou do período.

## Os oito períodos

| id | Período | Recorte |
|---|---|---|
| `igreja-antiga` | Igreja antiga | Dos apóstolos até cerca de 600: perseguições, concílios, credos, pais da igreja |
| `reforma` | Reforma | Dos pré-reformadores ao fim do século XVI: Lutero, Zuínglio, Calvino, anabatistas, Reforma inglesa |
| `puritanos` | Puritanos | Inglaterra e Nova Inglaterra, séculos XVI e XVII: separatistas, Assembleia de Westminster, Grande Expulsão |
| `origens-batistas` | Origens batistas | Inglaterra e Holanda, início do século XVII: Smyth, Helwys, a igreja de Amsterdã, a volta a Londres |
| `gerais-e-particulares` | Batistas gerais e particulares | Século XVII e XVIII: as duas correntes, as confissões de 1644 e 1689, perseguição e tolerância |
| `carey-e-missoes` | Carey e as missões | Fim do século XVIII e século XIX: Fuller, Carey, a Sociedade Missionária Batista, Judson, a expansão |
| `batistas-no-brasil` | Batistas no Brasil | Século XIX e início do XX: os primeiros grupos, Santa Bárbara d'Oeste, Bagby e Taylor, a igreja em Salvador |
| `formacao-da-cbb` | Formação da CBB | De 1907 em diante: a fundação da Convenção, juntas, seminários, a Declaração Doutrinária |

## Período desta conversa

**`igreja-antiga`**
