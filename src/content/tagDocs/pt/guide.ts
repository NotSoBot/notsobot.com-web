// The TagScript guide (tagDocs/guide.ts) in Brazilian Portuguese, keyed by section id. Table cells left '' keep the English one.

import type { TagDocsTranslation } from '../localize';


export const GUIDE_PORTUGUESE: TagDocsTranslation['guide'] = {
  'what-are-tags': {
    title: 'O que são tags?',
    body: [
      'Uma tag é uma mensagem salva que você pode trazer de volta com um nome curto. Tags podem ser texto normal, mas também podem conter TagScript: pequenas `{functions}` entre chaves que são executadas toda vez que a tag é mostrada. Assim, uma mesma tag pode cumprimentar quem a usou, escolher uma resposta aleatória, lembrar uma pontuação, buscar uma imagem ou até executar Python.',
      'Crie uma tag com `.tag create <name> <content>` e mostre-a com `.tag <name>` (ou com o mais curto `.t <name>`, ou com `/tag show`). Tudo o que você digitar depois do nome da tag é passado para ela como argumentos. Nomes de tag com espaços vão entre aspas, como `.tag create "my tag" hello!`.',
      'Altere uma tag com `.tag edit <name> <new content>` e veja o código-fonte dela com `.tag raw <name>` (um alias de `.tag info`). Quem gerencia o servidor pode transformar uma tag em comando personalizado com `.tag commands add <name>`, para que os membros a usem diretamente como `.<name>`.',
      'Se você criar uma tag sem texto mas anexar um arquivo à mensagem, a tag é salva como `{attach:URL}`, então o arquivo é enviado toda vez que a tag for executada.',
    ].join('\n\n'),
    results: [
      'Cria uma tag chamada `greet`.',
      '',
    ],
  },

  'syntax': {
    title: 'Sintaxe',
    body: [
      'Uma função é escrita como `{name}` ou `{name:argument}`. O nome termina no primeiro `:`, e tudo o que vem depois, até a `}` correspondente, é o argumento. Nomes de função não diferenciam maiúsculas de minúsculas, então `{UPPER:hi}` e `{upper:hi}` são a mesma coisa.',
      'Funções que recebem vários argumentos os separam com `|`, como `{range:1|10}`. Um `|` dentro de uma função aninhada não divide a função de fora, então `{choose:a|{upper:b|c}}` tem duas opções, não três.',
      'Funções podem ser aninhadas. Na maioria das funções o argumento é avaliado primeiro (de dentro para fora), e depois a função trabalha com o texto pronto: em `{upper:{user}}`, `{user}` vira `cake` e depois `upper` transforma isso em `CAKE`.',
      'Algumas funções avaliam seus argumentos de forma preguiçosa, executando só as partes de que realmente precisam: `if`, `and`, `or`, `iferror`, `choose`, `foreach`, `set` e `get` (em todos os escopos de armazenamento), `includes`, `indexof`, `substring`, `setfilename`, `componentjson`, `componentsontimeout` e `evalsilent`. É por isso que `{if}` só executa o ramo que corresponde e `{choose}` só executa a opção que escolheu.',
      'Os espaços logo dentro das chaves são removidos, então `{ user }` funciona, mas o nome em si precisa ser escrito sem espaços antes do `:` (`{upper :hi}` não é reconhecido). Argumentos simples também têm os espaços removidos.',
      'Se um nome não for uma função conhecida, ou uma função receber argumentos que não consegue usar, o texto fica no resultado do jeito que foi escrito (com as funções aninhadas já substituídas). Uma `{` sem a `}` correspondente também aparece como texto normal.',
    ].join('\n\n'),
    results: [
      '',
      'You won gold! (ou silver; só o `set` escolhido é executado)',
      '',
    ],
  },

  'escaping': {
    title: 'Escapes e comentários',
    body: [
      'Para mostrar TagScript sem executá-lo, envolva-o em `{ignore:...}`. O argumento é mostrado exatamente como foi escrito e nada dentro dele é avaliado. As chaves dele ainda precisam estar balanceadas.',
      '`{note:...}` é um comentário: o conteúdo nunca é avaliado e nada é retornado, o que é útil para deixar anotações em tags longas.',
      'Para mostrar um único símbolo que de outra forma seria lido como sintaxe, use as funções de inserção: `{bracketleft}` para `{`, `{bracketright}` para `}`, `{splitterargument}` para `|`, `{splitterfunction}` para `:` e `{newline}` para uma quebra de linha. Todas aceitam uma quantidade, como `{newline:3}`.',
      'Uma barra invertida `\\` antes de `{`, `}` ou `|` faz o escape dele. No texto da própria tag (fora de qualquer função) a barra invertida é removida e o caractere aparece como está, então `\\{user}` mostra `{user}` sem executá-lo. Dentro do argumento de uma função, `\\{` e `\\}` impedem que uma chave abra ou feche uma função e `\\|` impede que um `|` separe argumentos, mas ali a barra invertida antes de uma chave continua no resultado, então dentro de funções `{ignore}` e as funções de inserção costumam ser mais limpos.',
      'Lembre que as funções de inserção produzem caracteres de verdade: quando usadas dentro de uma função que avalia o argumento primeiro, essa função vê um `|` inserido como separador.',
    ].join('\n\n'),
    results: [
      '',
      '',
      '',
    ],
  },

  'arguments': {
    title: 'Argumentos',
    body: [
      'Tudo o que é digitado depois do nome da tag vira os argumentos dela. `{args}` retorna tudo do jeito que foi digitado, e `{arg:N}` retorna um único argumento pela posição, começando em 0 (`{arg}` sozinho é o primeiro). Posições negativas contam a partir do final, então `{arg:-1}` é o último argumento. `{argslen}` retorna quantos argumentos existem, e `{args:start|end}` retorna um intervalo unido com espaços.',
      'Os argumentos são separados por espaços. Colocar palavras entre aspas as mantém juntas como um só argumento, então `.tag rate "pizza with pineapple"` tem um argumento. Funcionam aspas retas e a maioria dos pares de aspas curvas e internacionais.',
      'Os argumentos são inseridos na sua tag como texto, então se alguém digitar um `|` ele pode ser lido como separador pela função onde for parar. `{argsafe}` e `{argssafe}` funcionam como `{arg}` e `{args}`, mas fazem o escape de qualquer `|` antes.',
      'Quando uma tag executa outra com `{tag:id|arguments}`, a tag de dentro recebe seus próprios argumentos, e os argumentos da tag de fora são restaurados quando ela termina.',
    ].join('\n\n'),
    results: [
      'Cria uma tag que dá nota ao primeiro argumento.',
      '',
      'Com os argumentos `a b c`: You gave 3 arguments, the last one was c',
    ],
  },

  'variables-and-storage': {
    title: 'Variáveis e armazenamento',
    body: [
      'Variáveis permitem que uma tag lembre valores enquanto é executada. `{set:name|value}` guarda um valor e `{get:name}` lê de volta. `{get:name|fallback}` retorna a alternativa quando a variável nunca foi definida, e `{delete:name}` a remove. Os valores têm os espaços das pontas removidos ao serem guardados.',
      'Variáveis só duram uma execução da tag (e os cliques em botões dessa mesma mensagem). Uma tag pode ter até 100 variáveis, os nomes podem ter até 64 caracteres e valores com mais de 1 MB são cortados.',
      'Nomes que começam com `__` são reservados para as variáveis privadas do próprio motor, então não podem ser definidos nem apagados, mas alguns podem ser lidos com `{get}`: `{get:__args}` dá os argumentos já separados como um array JSON, `{get:__argsString}` os argumentos exatamente como foram digitados, e `{get:__files}` uma lista JSON (nome do arquivo e descrição) dos arquivos anexados à resposta até agora.',
      'Para guardar dados entre execuções, use o armazenamento persistente. Há quatro escopos, cada um com suas funções de set, get e delete: o de usuário (`{setuser}`, `{getuser}`, `{deleteuser}`) é separado para cada pessoa, o de canal (`{setchannel}`...) para cada canal, o de servidor (`{setserver}`...) para cada servidor (em DMs, o canal da DM conta como servidor), e o global (`{setglobal}`, `{getglobal}`) é compartilhado por todo mundo que usa a tag em qualquer lugar.',
      'O armazenamento pertence à tag, então duas tags diferentes nunca veem os dados uma da outra, enquanto os aliases de uma tag compartilham o dela. O armazenamento só funciona ao executar uma tag salva. As chaves de armazenamento podem ter até 128 caracteres e os valores até 16.384 caracteres. Cada escopo guarda no máximo 5 chaves; salvar uma 6ª gera um erro, e salvar um valor vazio apaga a chave. `{variablesuser}`, `{variableschannel}`, `{variablesserver}` e `{variablesglobal}` retornam as chaves e os valores guardados de um escopo como JSON.',
      'O código executado a partir de uma tag (Python, Node.js, Bun e Lua) também pode ler e alterar variáveis e armazenamento, pelo objeto `discord`. O código também tem acesso a blobs: um valor maior por escopo (usuário, canal, servidor e global), de até 256 KB cada, que só o código pode ler e escrever. O mesmo limite de 5 chaves por escopo vale tanto se o armazenamento for escrito com `{setuser}` e afins quanto pelo código. Veja "O objeto `discord`" para os detalhes.',
      'Resumindo: variáveis guardam até 1 MB cada e são apagadas depois de cada execução, valores de armazenamento guardam até 16.384 caracteres cada e são mantidos entre execuções, e blobs guardam até 256 KB cada e são mantidos entre execuções.',
    ].join('\n\n'),
    results: [
      '',
      '',
      '',
    ],
  },

  'conditions': {
    title: 'Condições',
    body: [
      '`{if:value|operator|value|then:...|else:...|finally:...}` compara dois valores e executa o ramo correspondente. `then:`, `else:` e `finally:` podem vir em qualquer ordem e qualquer um deles pode ser omitido (é preciso pelo menos um). Só o ramo que corresponde é avaliado; `finally:` é sempre avaliado depois e adicionado em seguida.',
      'Os dois valores são avaliados primeiro e depois comparados. Escreva o operador sem espaços em volta (`|=|`, não `| = |`); senão ele não é reconhecido e o `{if}` inteiro aparece como texto. Espaços deixados em volta dos valores também contam como parte deles.',
      '`=` e `!=` comparam texto exatamente, diferenciando maiúsculas de minúsculas. `>`, `>=`, `<` e `<=` comparam números (decimais funcionam, e um valor vazio conta como 0); se algum dos valores não for um número, a comparação é falsa. `~` é um igual flexível: números são comparados pelo valor, então `1.50` corresponde a `1.5`, e todo o resto é comparado como texto sem diferenciar maiúsculas, então `Yes` corresponde a `yes`. `?` trata o segundo valor como uma regex e verifica se ela corresponde a qualquer parte do primeiro valor, sem diferenciar maiúsculas (use `^` e `$` para corresponder ao valor inteiro, e `\\|` para um `|` literal na regex).',
      'Para combinar verificações, `{and:a|b|c}` executa cada parte em ordem e para na primeira que sair vazia. Se nenhuma estiver vazia, retorna a última parte. `{or:a|b|c}` retorna a primeira parte que não estiver vazia. As duas vão da esquerda para a direita e pulam o resto assim que têm uma resposta. Com uma parte só (sem `|`), `{or}` simplesmente a avalia e retorna.',
    ].join('\n\n'),
    table: {
      columns: ['Operador', 'Significado', 'Compara'],
      rows: [
        ['', 'Igual', 'Texto, correspondência exata'],
        ['', 'Diferente', 'Texto, correspondência exata'],
        ['', 'Maior que', 'Números'],
        ['', 'Maior ou igual a', 'Números'],
        ['', 'Menor que', 'Números'],
        ['', 'Menor ou igual a', 'Números'],
        ['', 'Igual flexível', 'Números pelo valor; senão, texto sem diferenciar maiúsculas'],
        ['', 'Correspondência de regex', 'Texto, contra a regex do segundo valor, sem diferenciar maiúsculas'],
      ],
    },
    results: [
      'Com o argumento `YES`: Great!',
      'Critical hit! (mais ou menos 1 a cada 10 vezes)',
      'O apelido salvo, ou seu nome de usuário se nenhum estiver definido.',
    ],
  },

  'code-execution': {
    title: 'Executar código',
    body: [
      'Tags podem executar código de verdade num sandbox: use uma linguagem de programação como nome da função, como `{python:print("hi")}` ou `{js:console.log(1 + 1)}`. O que o programa imprimir é adicionado ao resultado da tag naquele ponto, então dá para misturar código e TagScript normal à vontade.',
      'O código também pode vir envolto num bloco de código ``` dentro da função (`{python:```py ... ```}`). A linguagem escrita depois das crases de abertura é ignorada; quem decide a linguagem é o nome da função. Uma função vazia não faz nada.',
      'Nomes de linguagem não diferenciam maiúsculas, e os nomes internos também funcionam (`{node:...}`, `{golang:...}`, `{c_plus_plus:...}`). Dá para pedir uma versão específica depois de um hífen, como `{python-3.12.15:...}` ou `{node-26.12.1:...}`; ela precisa ser uma das versões da tabela, escrita por completo. Sem ela, é usada a versão padrão.',
      'Cada execução de código conta como uma requisição de rede (arquivos carregados com linhas `load` não custam a mais). Não dá para executar outras tags de dentro do código: um `{tag}` dentro de uma função de código fica como texto normal.',
      'A tabela lista todas as linguagens e os nomes com que você pode chamá-las. Python, Node.js, Bun e Lua também recebem um objeto `discord` pronto com o contexto, as variáveis e o armazenamento da tag (veja "O objeto `discord`" abaixo).',
    ].join('\n\n'),
    table: {
      columns: ['Linguagem', 'Nomes que você pode usar', 'Observações'],
      rows: [
        ['', '', 'ffmpeg e ImageMagick estão instalados.'],
        ['', '', ''],
        ['', '', 'Versão 1.4.3. Executa JavaScript e TypeScript, com os mesmos pacotes e o mesmo objeto `discord` do Node.js.'],
        ['', '', 'Versões 17.0.0 (C17) e 23.0.0 (C23, padrão).'],
        ['', '', 'Versões 20.0.0 (C++20) e 23.0.0 (C++23, padrão).'],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        ['', '', 'Sem objeto `discord`.'],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        ['', '', 'Versões 25.0.4 e 27.0.0 (padrão).'],
        ['', '', ''],
        ['', '', ''],
        ['', '', 'Versões 5.4.9 e 5.5.1 (padrão), com dkjson e base64. Tem o objeto `discord`.'],
        ['NASM (32 bits)', '', ''],
        ['NASM (64 bits)', '', ''],
        ['', '', 'Versões 22.23.3, 24.22.0 (padrão) e 26.12.1. Tem o objeto `discord`.'],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        ['', '', 'Versões 3.11.17, 3.12.15, 3.13.16 e 3.14.8 (padrão). Tem o objeto `discord`.'],
        ['', '', 'Versão 2.7.18. Tem o objeto `discord`.'],
        ['', '', ''],
        ['', '', ''],
        ['', '', 'Executa o código como SQL num banco de dados novo em memória.'],
        ['', '', ''],
        ['', '', 'Os mesmos pacotes do Node.js, mas sem objeto `discord`.'],
      ],
    },
    results: [
      '',
      '',
      '',
    ],
  },

  'code-tagscript-first': {
    title: 'O TagScript dentro do código é executado primeiro',
    body: [
      'Antes de o seu código ser enviado ao sandbox, o argumento inteiro é avaliado como TagScript. Isso é útil, porque `{python:print("{user}")}` imprime seu nome de usuário, mas também significa que cada `{...}` no seu código é lido como uma possível função de TagScript.',
      'Há chaves por toda parte no código: dicts, sets e f-strings do Python, objetos, blocos e templates `${}` do JavaScript, e o corpo das funções em C, Java, Rust e Go. Se o texto entre as chaves coincidir com o nome de uma função (`{name}`, `{id}`, `{user}`, `{text}`, `{e}`, `{pi}`, `{args}`...), ele é substituído, e o programa quebra de formas confusas. Chaves que não coincidem com um nome de função ficam como estão, mas o que há dentro delas ainda é avaliado e pode gastar o limite de iterações.',
      'A solução é envolver o código em `{ignore:...}`, que o passa exatamente como foi escrito. Você pode deixar fora do `{ignore}` as partes de TagScript que quiser, por exemplo linhas `load` ou um valor que você insere no começo. As chaves dentro do `{ignore}` ainda precisam estar balanceadas, então uma `{` solta dentro de uma string deve ser escrita de outro jeito (como `chr(123)` em Python).',
      'Para passar ao código o que o usuário digitou com segurança, insira com `{jsonify:...}`. Ele transforma qualquer texto numa string literal entre aspas e com escape, válida tanto em Python quanto em JavaScript, então aspas ou quebras de linha no texto não conseguem quebrar seu código.',
    ].join('\n\n'),
    results: [
      '',
      'Com os argumentos `Ana "the great"`: Hello Ana "the great", your name has 15 letters',
      'Hi cake (não Bob): `{name}` é uma função de TagScript, então foi substituída pelo seu nome de usuário antes de o Python rodar. Envolver o código em `{ignore}` resolve.',
    ],
  },

  'code-environment': {
    title: 'O que o código pode usar',
    body: [
      'Cada execução começa num sandbox novo e vazio, com a pasta de trabalho em `/home/notsocoder`. Nada é mantido entre execuções, exceto o que você salvar no armazenamento, nos blobs e nas variáveis do objeto `discord`.',
      'O código tem acesso à internet, limitado a uns 20 Mbps e 3 requisições por segundo, então pode chamar APIs web (por exemplo com `requests` em Python ou `fetch` em Node.js). Uma execução pode levar uns 15 segundos antes de ser interrompida, um pouco mais para usuários premium.',
      'As ferramentas de linha de comando `ffmpeg`, `ffprobe` e ImageMagick estão instaladas para todas as linguagens, então até uma tag `{bash}` consegue converter mídia. Os pacotes da tabela abaixo vêm pré-instalados; não dá para instalar mais nada.',
      'Qualquer coisa que um programa escreva na saída de erro (stderr) interrompe a tag com esse texto como erro, mesmo que seja só um aviso. Silencie os avisos ou escreva no stdout. A única exceção é o ffmpeg, que imprime o banner da versão no stderr mesmo quando funciona: se a saída de erro começar com esse banner ou mencionar `Input`, a tag continua desde que o programa tenha gerado arquivos de saída. Passar `-hide_banner -loglevel error` para o ffmpeg evita o problema por completo.',
    ].join('\n\n'),
    table: {
      columns: ['Linguagem', 'Pacotes de terceiros'],
      rows: [],
    },
    results: [
      '',
      '[1, 2, 3] (os avisos são silenciados para não interromperem a tag)',
    ],
  },

  'code-output': {
    title: 'O que o código devolve',
    body: [
      'O texto impresso no stdout é adicionado ao resultado da tag, sem os espaços das pontas. Texto impresso de até 16.000 caracteres é verificado como JSON (embeds, componentes, páginas); texto mais longo é sempre adicionado como texto normal. A mensagem final ainda é cortada no tamanho normal de uma mensagem.',
      'Se o programa imprimir um único objeto JSON, algumas chaves viram partes reais da mensagem em vez de texto:',
      '- `embed` (um objeto de embed) e `embeds` (uma lista deles) adicionam embeds, até 10 no total.\n- `components` (uma lista de botões, menus de seleção ou linhas de ação, no mesmo formato de `{componentjson}`) adiciona componentes; uma string opcional `componentsOnTimeout` é TagScript a executar quando eles expiram.\n- `pages` adiciona páginas ao paginador no mesmo formato de `{pagejson}`, mas só quando é a única chave do objeto.',
      'Quando o JSON tem `embed`, `embeds` ou `components`, nada do texto impresso é mostrado, e as outras chaves (como `content`) são ignoradas. Imprima uma linha de texto normal, ou use `{embedjson}` fora do código, se precisar das duas coisas.',
      'Arquivos que o programa salvar em `/home/notsocoder/output` (ou `./output`) são anexados à resposta, até 10 por execução. Arquivos maiores que o limite de upload do canal são pulados, e a resposta como um todo continua podendo levar só 10 anexos. Imagens e vídeos de saída passam pelo mesmo filtro de conteúdo das outras mídias, então resultados NSFW são bloqueados fora de canais NSFW. Esses arquivos podem ser passados depois para outro código, para o `{ai}` ou para o MediaScript com `load FILE_X` (veja "Carregar arquivos com `load`").',
    ].join('\n\n'),
    results: [
      'Um embed cor blurple com o título "Hello from Python" (o JSON em si não aparece).',
      'Um gráfico de linhas anexado como chart.png.',
      'done, com numbers.txt anexado.',
    ],
  },

  'code-discord-object': {
    title: 'O objeto `discord`',
    body: [
      'Em Python (3 e 2), Node.js (JavaScript), Bun e Lua, um objeto global `discord` guarda o contexto da execução da tag. Em Python é um dict (`discord["user"]["id"]`), em Node.js e Bun um objeto (`discord.user.id`) e em Lua uma tabela (`discord.user.id`). Deno, TypeScript e as outras linguagens não o recebem.',
      'A maioria dos campos são cópias somente leitura: alterá-los não faz nada. Só `variables`, `storage` e `blobs` são gravados de volta quando o programa termina normalmente. Em Node.js isso acontece no evento `beforeExit`, então chamar `process.exit()` ou dar crash pula o salvamento; em Python acontece na saída, então `os._exit()` pula. Mudar a pasta de trabalho também pode impedir que o que precisa ser salvo seja encontrado.',
      '`variables` contém as variáveis da tag no momento em que o código começou (incluindo as privadas como `__args` e `__files`). Depois da execução, cada chave que não começa com `__` é definida como variável de TagScript, convertida em texto e cortada em 1 MB, seguindo as regras normais de variáveis (nomes de até 64 caracteres, até 100 variáveis). Remover uma chave no código não apaga a variável de TagScript; use `{delete}` para isso.',
      '`storage` guarda o armazenamento persistente da tag para os escopos atuais de `user`, `channel`, `server` e `global`, os mesmos dados que `{getuser}`, `{getchannel}`, `{getserver}` e `{getglobal}` leem. Cada escopo é gravado de volta inteiro: chaves que você apagar são removidas, e definir um escopo como `{}` (ou `None`/`null` em Python e Node.js) o esvazia. Os valores são salvos como texto: um número `5` vira `"5"`, e um dict, lista ou objeto é salvo como seu texto JSON (interprete de novo quando for ler).',
      'O armazenamento escrito pelo código tem regras extras: cada escopo pode guardar no máximo 5 chaves, as chaves podem ter até 128 caracteres e os valores até 16.384 caracteres. Desrespeitar uma delas interrompe a tag com um erro. `{setuser}` e afins aplicam o mesmo limite de 5 chaves, então o armazenamento escrito fora do código nunca consegue bloquear uma execução de código. Valores vazios não contam para o limite.',
      '`blobs` guardam um valor maior por escopo (`user`, `channel`, `server`, `global`), de até 256 KB cada, e só podem ser usados pelo código. Um blob chega como `bytes` em Python, um `Buffer` em Node.js e uma string em Lua, ou como `None`/`null` quando está vazio. Você pode atribuir bytes, uma string ou qualquer outro valor (que é salvo como texto JSON); defina como `None`/`null` para esvaziá-lo. Em Lua, definir um blob ou escopo de armazenamento como `nil` mantém o valor antigo, então atribua uma string ou tabela vazia.',
      'Armazenamento e blobs só existem ao executar uma tag salva. Aliases compartilham os dados da tag principal. Quando o código roda fora de uma tag salva, os dois começam vazios e as mudanças são descartadas.',
    ].join('\n\n'),
    table: {
      columns: ['Campo', 'O que contém', 'Gravável'],
      rows: [
        ['', 'O usuário que executou a tag (id, username, avatar...).', 'Não'],
        ['', 'Os dados de membro do servidor desse usuário (nick, roles, joined_at...). Null fora de servidores.', 'Não'],
        ['', 'O canal onde a tag foi executada, e o id dele.', 'Não'],
        ['', 'O servidor e o id dele. Null em DMs. Em servidores com mais de 10.000 membros, só são incluídos o bot, o usuário e os membros em canais de voz.', 'Não'],
        ['', 'A mensagem que executou a tag. Null em comandos de barra e cliques em botões.', 'Não'],
        ['', 'A tag salva: id, name, content, uses, nsfw, locked, created, edited, user (o dono) e mais. Null fora de tags salvas.', 'Não'],
        ['', 'Os dados de usuário e de membro do próprio bot.', 'Não'],
        ['', 'As variáveis da tag. As chaves que não começam com `__` são copiadas de volta como variáveis de TagScript.', 'Sim'],
        ['', 'Objetos `user`, `channel`, `server` e `global` de armazenamento persistente chave/valor.', 'Sim'],
        ['', 'Valores binários `user`, `channel`, `server` e `global`, de até 256 KB cada.', 'Sim'],
      ],
    },
    results: [
      '',
      'You have run this tag 3 times (o contador é o mesmo que `{getuser:runs}` lê)',
      '',
      '',
    ],
  },

  'code-files': {
    title: 'Arquivos no código',
    body: [
      'Arquivos que você passa para o programa com linhas `load` (explicadas na próxima seção) são salvos em `/home/notsocoder/input` (também acessível como `./input`), com o nome que você deu ou o do download. Os nomes de arquivo são limpos, então espaços e caracteres incomuns podem ser substituídos. Dá para carregar até 10 arquivos numa execução.',
      'O caminho completo de cada arquivo carregado também vai para uma variável de ambiente: `FILE_1`, `FILE_2` e assim por diante. Leia com `os.environ["FILE_1"]` em Python, `process.env.FILE_1` em Node.js ou `$FILE_1` em Bash. Essa numeração só conta os arquivos carregados nesta execução, e é separada dos números `FILE_X` usados nas linhas `load`.',
      'As variáveis de ambiente são numeradas com os arquivos reaproveitados de antes na tag (`load FILE_X`) primeiro, e depois os arquivos baixados de URLs da web, cada grupo na ordem das suas linhas `load`. Se você só carrega de um tipo, é simplesmente a ordem das linhas. Ao misturar os dois, dar um nome a cada arquivo e abri-lo em `/home/notsocoder/input/NAME` evita qualquer confusão.',
      'Tudo o que for salvo em `/home/notsocoder/output` (ou `./output`) é anexado à resposta quando o programa termina. Não tente usar `{attach}` nesses caminhos; eles só existem dentro do sandbox.',
    ].join('\n\n'),
    results: [
      '',
      'A última imagem ou vídeo do chat com as cores invertidas.',
    ],
  },

  'loading-files': {
    title: 'Carregar arquivos com `load`',
    body: [
      'O código, o `{ai}` e o MediaScript podem receber arquivos começando o conteúdo com linhas `load`. No código e no `{ai}`, a linha é `load URL` ou `load URL FILENAME`; no MediaScript é `load URL MEDIA_KEY`, onde a terceira palavra dá nome à mídia dentro do script.',
      'As regras para o código e o `{ai}`:',
      '- Coloque uma linha `load` por arquivo bem no começo, antes de qualquer outro código ou texto. Linhas em branco entre elas não tem problema.\n- A primeira linha que não for `load` encerra a lista, e tudo dali em diante é seu código ou prompt. Uma linha `load` mais abaixo é tratada só como código.\n- A URL não pode ter espaços, e tudo depois de `##` numa linha `load` é comentário. `load` não diferencia maiúsculas.\n- A URL costuma ser TagScript, como `{image}`, `{avatar}` ou `{iv}`, que é substituído antes de o código rodar.\n- Dê um nome diferente a cada arquivo: se duas linhas `load` tiverem o mesmo nome de arquivo, só a última fica.',
      'Em vez de uma URL da web, você pode escrever `FILE_X` para reaproveitar um arquivo que esta execução da tag já produziu: qualquer coisa adicionada por `{attach}`, `{attachtext}`, `{mediascript}`, ou arquivos escritos por código anterior. `FILE_1` é o primeiro arquivo anexado à resposta naquele momento, `FILE_2` o segundo, e assim por diante, na ordem em que foram adicionados. `{get:__files}` mostra a lista atual se você não tiver certeza.',
      '`FILE_X` move o arquivo: ele é entregue e removido dos anexos da resposta, que é o que você quer quando o arquivo era só um passo intermediário. `FILE_X_COPY` entrega uma cópia e deixa o original anexado. Um arquivo carregado com `FILE_X` mantém o nome, a não ser que você dê um novo.',
      'Como `FILE_X` remove arquivos, os números dos arquivos que vêm depois diminuem quando a função termina. Se a resposta tem os arquivos 1, 2 e 3 e o código carrega `FILE_1`, o antigo arquivo 2 é `FILE_1` para a próxima função. Dentro de uma mesma função, todos os números se referem à lista como estava antes de a função começar, então `load FILE_1` e `load FILE_2` juntos pegam os dois primeiros arquivos. Arquivos de saída novos são adicionados ao final da lista.',
      'No MediaScript, `FILE_X` e `FILE_X_COPY` funcionam do mesmo jeito, mas são substituídos em qualquer lugar do script, não só nas linhas `load`.',
    ].join('\n\n'),
    table: {
      columns: ['Escreva', 'O que acontece'],
      rows: [
        ['', 'Baixa a URL e a passa (com o nome do download).'],
        ['', 'O mesmo, salvo como name.png.'],
        ['', 'Passa o 2º arquivo anexado até agora e o remove da resposta.'],
        ['', 'Passa o 2º arquivo anexado até agora e o mantém na resposta.'],
        ['', 'Move o 2º arquivo, renomeado para new.png.'],
      ],
    },
    results: [
      'Inverted!, com a última imagem do chat anexada como inverted.png, com as cores invertidas.',
      'Com o argumento `@friend`: seu avatar e o do seu amigo lado a lado.',
      'A descrição da IA da última imagem do chat (gasta sua única chamada de `{ai}`).',
      'The inverted image is 512x512. O resultado do MediaScript foi movido para o Python, então não é anexado.',
      'O Python cria um quadrado vermelho, o MediaScript o faz girar, e só o GIF girando é enviado.',
      'cat.png is 20480 bytes, com cat.png ainda anexado por causa do `_COPY`.',
    ],
  },

  'settings': {
    title: 'Configurações',
    body: [
      '`{settings:SETTING|value}` muda como o resto da tag se comporta. Os nomes das configurações não diferenciam maiúsculas. As configurações só afetam a execução atual e valem para as funções executadas depois delas, então coloque-as no começo da tag.',
      'Espaços em volta da configuração e do valor são ignorados, e um valor vazio limpa a configuração. Um nome de configuração desconhecido, ou uma chamada sem exatamente um `|`, fica no resultado como texto.',
    ].join('\n\n'),
    table: {
      columns: ['Configuração', 'Valor', 'O que faz'],
      rows: [
        ['', 'Um nome de modelo, ex.: ANTHROPIC_CLAUDE_HAIKU_5_5', 'Qual modelo o `{ai}` usa. Um modelo desconhecido gera um erro listando as opções válidas.'],
        ['', 'Qualquer texto', 'A personalidade que o `{ai}` usa no lugar da que você salvou.'],
        ['', 'true ou false', 'Deixa qualquer pessoa usar os botões e menus de seleção da tag. Por padrão, só quem executou a tag pode.'],
        ['', 'true ou false', 'Por padrão, uma resposta que é só um arquivo (ou só um link do nsb.gg) aparece como a resposta de um comando de mídia, com o tamanho e quem executou. `true` envia como um anexo ou link normal do Discord.'],
        ['', 'SEARCH_YOUTUBE ou search.youtube (ou um alias como s.yt)', 'Quando o `{transcribe}` não encontra áudio nem vídeo, pesquisa no YouTube com o argumento dele.'],
        ['', 'MEDIA_IMAGE_IMAGINE, SEARCH_GOOGLE_IMAGES ou SEARCH_DUCK_DUCK_GO_IMAGES (ou os nomes das funções, como imagine, e seus aliases)', 'Quando funções de imagem como `{image}`, `{iv}`, `{ocr}` ou `{edit}` não encontram nenhuma imagem, gera uma (como URL temporária) ou pesquisa uma usando o argumento.'],
        ['', 'true ou false', 'É passado para a geração de imagens como a opção "do not error" (não dar erro).'],
        ['', '', 'Qual modelo a geração de imagens (`{imagine}`, `{edit}`, scripts de mídia) usa.'],
      ],
    },
    results: [
      'A última imagem do chat ou, se não houver nenhuma, um resultado do Google Imagens para os argumentos.',
      'Uma imagem gerada com o Flux Klein.',
    ],
  },

  'limits': {
    title: 'Limites',
    body: [
      'Para manter tudo rápido e justo, cada execução de uma tag tem limites. Passar de um deles interrompe a tag com um erro, exceto o limite de iterações (explicado abaixo). Esses limites são os mesmos para todo mundo, com premium ou sem, exceto quanto tempo a tag e o código dela podem rodar. Tags verificadas do diretório de tags sempre rodam com os limites de premium, seja quem for que as use. Cada clique num botão ou menu de seleção da mensagem de uma tag começa com os limites zerados.',
      'O limite de iterações conta quantas vezes o motor analisa um trecho de texto: uma vez para a própria tag e uma vez para cada argumento que contém uma função. Quando ele acaba, o resto da tag aparece como texto normal, sem ser avaliado.',
    ].join('\n\n'),
    table: {
      columns: ['Limite', 'Padrão', 'O que cobre'],
      rows: [
        ['Tempo de execução', '40 segundos', 'Quanto tempo a execução inteira pode levar, incluindo tudo o que ela chama: 60 segundos num servidor premium, 70 com Premium, 100 com Plus e 130 com Plus AI.'],
        ['Iterações', '', 'Vezes que o texto é analisado por execução. Quando acabam, o texto restante aparece sem ser avaliado.'],
        ['Requisições de rede', '', 'Funções que acessam a internet: downloads, pesquisas, anexos, execuções de código, buscar usuários etc.'],
        ['Requisições de IA', '', 'Chamadas de `{ai}`.'],
        ['Requisições de aprendizado de máquina', '', 'Geração e edição de imagens (`{imagine}`, `{edit}` e suas versões de URL).'],
        ['Verificações de segurança', '', 'Chamadas de `{nsfwfilter}`.'],
        ['Ações da API', '', 'Funções que criam algo, como `{api.create.reminder}`.'],
        ['Chamadas de tags', '', 'Outras tags executadas com `{tag}`.'],
        ['Execuções de componentes', '', 'Vezes que a tag pode rodar de novo por cliques em botões, menus de seleção ou `{componentsontimeout}`.'],
        ['Anexos', '', 'Arquivos anexados à resposta.'],
        ['Embeds', '', 'Embeds na resposta.'],
        ['Páginas', '1.000', 'Páginas adicionadas com `{pagejson}` ou pelo código.'],
        ['Variáveis', '', 'Variáveis definidas durante uma execução.'],
        ['Tamanho do nome de variável', '64 caracteres', 'Tamanho do nome de uma variável.'],
        ['Tamanho do valor de variável', '', 'Valores maiores são cortados.'],
        ['Tamanho da chave de armazenamento', '128 caracteres', 'Tamanho de uma chave de armazenamento persistente.'],
        ['Tamanho do valor de armazenamento', '16.384 caracteres', 'Tamanho de um valor de armazenamento persistente.'],
        ['Chaves de armazenamento por escopo', '', 'Chaves que um escopo (usuário, canal, servidor, global) pode guardar por tag, pelas funções set ou pelo código. Valores vazios não contam.'],
        ['Tamanho do blob', '', 'Tamanho do blob de cada escopo, escrito pelo código.'],
        ['Tempo de execução do código', 'Uns 15 segundos', 'Quanto tempo uma execução de código pode levar antes de ser interrompida: 20 segundos num servidor premium, 30 com Premium e 45 com Plus.'],
        ['Verificação de JSON na saída do código', '16.000 caracteres', 'Saída impressa maior que isso nunca é lida como JSON de embed, componente ou página, só como texto.'],
        ['Arquivos carregados no código', '', 'Arquivos de linhas `load` numa execução de código.'],
        ['Arquivos do código', '', 'Arquivos salvos na pasta de saída numa execução (a resposta continua levando 10 anexos no total).'],
        ['Rede do código', '', 'Velocidade da internet dentro do sandbox, com cerca de 3 requisições por segundo.'],
        ['Tamanho do prompt de IA', '12.000 caracteres', 'Prompts de `{ai}` maiores são cortados.'],
        ['Tempo de regex', '', 'Quanto tempo o `{replace}` pode gastar numa expressão regular.'],
        ['Tamanho do loop', '', 'Itens que o `{foreach}` pode percorrer.'],
      ],
    },
  },

  'output': {
    title: 'Saída',
    body: [
      'Quando a tag termina, todo o texto que ela produziu tem os espaços das pontas removidos e é enviado como mensagem. O texto é cortado em 2.000 caracteres (ou 4.000 quando a mensagem usa os layouts de componentes mais novos). As quebras de `{newline}` sobrevivem a esse corte.',
      'Arquivos adicionados com `{attach}` (e arquivos escritos pelo código) são enviados como anexos, até 10. Embeds de `{embedjson}` são enviados junto com o texto, também até 10. Se a tag não produzir nada, o bot responde com "Tag returned no content".',
      'Botões e menus de seleção podem ser adicionados com `{componentjson}`. Dê a um botão ou menu de seleção um campo `run` com TagScript, e esse código roda quando ele é clicado, mantendo as mesmas variáveis. O JSON em si é avaliado quando o componente é criado, então envolva o código do `run` em `{ignore:...}` se ele só deve rodar no clique. As opções escolhidas num menu de seleção ficam disponíveis como JSON em `{get:__values}`. Uma mensagem pode ter até 5 linhas de ação ou até 25 botões soltos, mas não os dois. Os componentes param de funcionar depois de um minuto, e `{componentsontimeout:...}` pode executar TagScript quando isso acontece.',
      'Páginas de `{pagejson}` transformam a resposta num paginador que você pode folhear. Quando uma tag tem páginas, a resposta é formada só por essas páginas, e o resto do texto e os embeds não aparecem. Não dá para adicionar páginas a partir de um clique em botão.',
      'Antes do envio, o texto, os embeds e os componentes passam por um filtro de conteúdo, e uma mensagem com 150 quebras de linha ou mais é substituída por um aviso de spam. Durante a execução, o texto de uma tag também não pode passar do limite de tamanho de upload do canal.',
    ].join('\n\n'),
    results: [
      'Um embed vermelho com o título "Hello cake".',
      'O texto "Look at this cat!" com a imagem anexada como kitty.png.',
      'Um botão "Roll" que sorteia um número novo cada vez que é clicado.',
    ],
  },

  'errors': {
    title: 'Erros',
    body: [
      'Quando uma função falha (por exemplo um download que não funciona, ao chegar num limite ou ao definir uma variável que começa com `__`), a tag inteira para e o bot responde com uma mensagem de "Command Error" explicando o que deu errado. Nada mais da tag é enviado.',
      'Nem todo engano é um erro. Nomes de função desconhecidos, e funções que recebem argumentos que não conseguem usar, ficam no resultado como texto normal, o que facilita encontrar erros de digitação.',
      'Para tratar erros você mesmo, `{iferror:a|b|c}` tenta cada parte em ordem e retorna a primeira que não falhar (dentro de uma parte seguinte, `{get:error}` é a mensagem do erro anterior), e `{evalsilent:...}` executa o conteúdo e simplesmente descarta qualquer erro. Para parar uma tag de propósito, `{exit:message}` descarta tudo o que foi produzido até ali e envia só a mensagem, enquanto `{exitsilent:message}` para mas mantém o que já foi produzido. Um exit dentro de `{iferror}` ou `{evalsilent}` não é capturado: ele continua parando a tag inteira.',
    ].join('\n\n'),
    results: [
      'Anexa o arquivo, ou diz "That link didn\'t work!" se não for possível baixá-lo.',
      'Anexa o arquivo, ou diz por que não foi possível baixá-lo.',
      'Sem argumentos: Please give me something to rate!',
    ],
  },
};
