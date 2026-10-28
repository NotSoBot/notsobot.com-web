// tagDocs/functions/part2.ts in Brazilian Portuguese, keyed by function id

import type { TagDocsTranslation } from '../localize';


const REPEAT_AMOUNT = 'Opcional. Quantas vezes inserir. Precisa ser um número inteiro maior que 0.';

const REPEAT_AMOUNT_NOTES = [
  'Se a quantidade não for um número, a função fica como texto normal.',
  'Uma quantidade de 0 ou menos (ou uma absurdamente grande) gera um erro.',
];

const STORAGE_TAG = 'Só funciona ao executar uma tag salva. Se a tag for um alias, é usado o armazenamento da tag original.';

const STORAGE_KEY = 'O nome da variável pode ter no máximo 128 caracteres; senão, gera um erro.';

const IMAGE = 'Opcional. A URL de uma imagem, ou algo que leve a uma imagem (como um usuário ou emoji). Se omitido, é usada a imagem mais recente do chat.';

const IMAGE_FALLBACK = 'Se nenhuma imagem for encontrada e a configuração `MEDIA_IV_FALLBACK` estiver definida (veja `{settings}`), essa função alternativa é executada com o mesmo argumento para encontrar uma imagem.';

const GET_DEFAULT = 'Opcional. O que retornar se a variável não existir. Só é avaliado quando necessário.';

const STORED_NAME = 'O nome da variável guardada. As funções de dentro são avaliadas, e os espaços das pontas são removidos.';

const NO_OUTPUT_IGNORED = 'Não retorna nada, e falhas são ignoradas em silêncio.';

const STORED_DELETE = 'O nome da variável guardada a apagar.';

const NO_PIPE = 'Sem um `|`, a função fica como texto normal.';

const ANOTHER_USER = 'Buscar outro usuário conta como uma requisição de rede.';

const USER_YOU = 'Opcional. Uma menção, ID de usuário ou nome. O padrão é você.';

const EXIT_NOTES = [
  'Também para a tag principal quando usado dentro de uma tag chamada com `{tag}`.',
  'Não é capturado por `{iferror}` nem por `{evalsilent}`: continua parando a tag inteira.',
];


export const FUNCTIONS_PORTUGUESE_2: TagDocsTranslation['functions'] = {
  IGNORE: {
    summary: 'Retorna o conteúdo como está, sem executar nenhuma função de dentro.',
    description: 'Útil para mostrar código de TagScript literalmente, ou para passar código para algum lugar que vai executá-lo depois (como o script `run` de um componente).',
    args: {
      text: 'O texto a retornar sem mexer. As chaves de dentro ainda precisam estar balanceadas.',
    },
    results: [
      '',
      '',
    ],
  },
  NOTE: {
    summary: 'Um comentário. Não retorna nada e não executa nada de dentro.',
    args: {
      text: 'O que você quiser; é totalmente ignorado.',
    },
    results: [
      '',
    ],
  },
  CHANNEL_RANDOM_ID: {
    summary: 'Retorna o ID de um canal aleatório do servidor.',
    results: [
      '',
    ],
    notes: [
      'Escolhe entre todos os canais do servidor (incluindo categorias e canais de voz).',
      'Em DMs, retorna o ID do canal atual.',
    ],
  },
  CHANNEL_RANDOM_MENTION: {
    summary: 'Menciona um canal aleatório do servidor.',
    results: [
      '',
    ],
    notes: [
      'Escolhe entre todos os canais do servidor (incluindo categorias e canais de voz).',
      'Em DMs, menciona o canal atual.',
    ],
  },
  EMBED_JSON: {
    summary: 'Adiciona um embed à resposta da tag.',
    description: 'Recebe um objeto de embed do Discord em JSON, ex.: `title`, `description`, `url`, `color` (um número), `timestamp`, `fields` (objetos com `name`, `value` e `inline`), `author`, `footer`, `image` e `thumbnail` (objetos com uma `url`).',
    args: {
      json: 'Um objeto de embed em JSON. As funções de dentro são avaliadas primeiro.',
    },
    results: [
      'Adiciona um embed laranja cumprimentando o usuário.',
      'Adiciona um embed mostrando seu avatar.',
    ],
    notes: [
      'Se o JSON for inválido, ou o embed não tiver texto nem URL de imagem/miniatura/vídeo, a função fica como texto normal.',
      '{newline} dentro de uma string JSON vira uma quebra de linha de verdade.',
      'Uma tag pode ter no máximo 10 embeds; passar disso gera um erro.',
    ],
  },
  EVAL: {
    summary: 'Avalia o argumento uma segunda vez.',
    description: 'O argumento é avaliado como qualquer outro argumento de função, e depois o resultado é avaliado de novo como TagScript. Isso permite montar código a partir de texto, por exemplo com `{bracketleft}` e `{bracketright}`.',
    args: {
      code: 'O texto a avaliar.',
    },
    results: [
      'Seu nome de usuário',
      'Um número aleatório de 1 a 10',
    ],
  },
  EVAL_SILENT: {
    summary: 'Avalia o argumento e engole qualquer erro.',
    description: 'Ao contrário do `{eval}`, o argumento só é avaliado uma vez. Se algo de dentro gerar um erro, o resultado do bloco inteiro é descartado e a tag continua.',
    args: {
      code: 'O TagScript a executar.',
    },
    results: [
      'Done (mesmo que não exista um 5º arquivo)',
    ],
    notes: [
      'Um `{exit}` ou `{exitsilent}` de dentro não é engolido: continua parando a tag inteira.',
    ],
  },
  EXIT: {
    summary: 'Para a tag na hora e substitui o resultado inteiro por uma mensagem.',
    description: 'Tudo o que foi produzido até ali (texto, embeds, arquivos, páginas e componentes) é descartado e a resposta vira a mensagem dada.',
    args: {
      message: 'Opcional. O texto com que responder. O padrão é `Tag Exited`.',
    },
    results: [
      'Please give me some text! (quando nenhum argumento é dado)',
      '',
    ],
    notes: EXIT_NOTES,
  },
  EXIT_SILENT: {
    summary: 'Para a tag na hora, mantendo tudo o que foi retornado até ali.',
    args: {
      message: 'Opcional. Texto adicionado ao final do resultado antes de parar.',
    },
    results: [
      '',
    ],
    notes: EXIT_NOTES,
  },
  GUILD: {
    summary: 'Retorna o nome do servidor.',
    results: [
      '',
    ],
    notes: [
      'Em DMs, retorna `Direct Message`.',
    ],
  },
  GUILD_COUNT: {
    summary: 'Retorna quantos membros o servidor tem.',
    results: [
      '',
    ],
    notes: [
      'Em DMs, retorna `2`.',
    ],
  },
  GUILD_ID: {
    summary: 'Retorna o ID do servidor.',
    results: [
      '',
    ],
    notes: [
      'Em DMs, retorna `0`.',
    ],
  },
  IMAGE_INTERROGATE: {
    summary: 'Descreve uma imagem com IA, retornando um prompt curto do que ela mostra.',
    args: {
      image: IMAGE,
    },
    results: [
      'Uma descrição da última imagem do chat, ex.: "a cat sitting on a laptop keyboard"',
      'Uma descrição do seu avatar',
    ],
    notes: [
      'Conta como uma requisição de rede.',
      'Se nenhuma imagem for encontrada ou a requisição falhar, nada é retornado.',
      IMAGE_FALLBACK,
    ],
  },
  IMAGE_OCR: {
    summary: 'Lê o texto de uma imagem (OCR) e o retorna.',
    args: {
      image: IMAGE,
    },
    results: [
      'O texto encontrado na última imagem do chat',
      'O texto da legenda, quando o bot funciona',
    ],
    notes: [
      'Conta como uma requisição de rede.',
      'Se nenhuma imagem for encontrada, nenhum texto for detectado ou a requisição falhar, nada é retornado.',
      IMAGE_FALLBACK,
    ],
  },
  INSERT_BRACKET_LEFT: {
    summary: 'Retorna uma `{` literal.',
    args: {
      amount: REPEAT_AMOUNT,
    },
    results: [
      '',
      '',
    ],
    notes: REPEAT_AMOUNT_NOTES,
  },
  INSERT_BRACKET_RIGHT: {
    summary: 'Retorna uma `}` literal.',
    args: {
      amount: REPEAT_AMOUNT,
    },
    results: [
      '',
      '',
    ],
    notes: REPEAT_AMOUNT_NOTES,
  },
  INSERT_NEWLINE: {
    summary: 'Retorna uma quebra de linha.',
    description: 'Útil onde uma quebra de linha normal seria removida, como no começo ou no fim do argumento de uma função.',
    args: {
      amount: REPEAT_AMOUNT,
    },
    results: [
      '',
      'Top, três quebras de linha e depois Bottom',
    ],
    notes: [
      ...REPEAT_AMOUNT_NOTES,
      'É inserida como um caractere interno provisório que vira quebra de linha quando a tag termina, então sobrevive às remoções de espaços no meio do caminho. Dentro das strings JSON de {embedjson}, {pagejson} e {componentjson} ela também vira uma quebra de linha.',
    ],
  },
  INSERT_SPLITTER_ARGUMENT: {
    summary: 'Retorna um `|` literal (o separador de argumentos).',
    args: {
      amount: REPEAT_AMOUNT,
    },
    results: [
      '',
      '',
    ],
    notes: REPEAT_AMOUNT_NOTES,
  },
  INSERT_SPLITTER_FUNCTION: {
    summary: 'Retorna um `:` literal (o separador de funções).',
    args: {
      amount: REPEAT_AMOUNT,
    },
    results: [
      '',
    ],
    notes: REPEAT_AMOUNT_NOTES,
  },
  JSON_CHANNEL: {
    summary: 'Retorna um canal como objeto JSON.',
    description: 'O objeto usa os nomes de campo do Discord, como `id`, `name`, `type`, `guild_id`, `parent_id`, `position`, `nsfw`, `permission_overwrites` e (em canais de texto) `topic`.',
    args: {
      channel: 'Opcional. Um canal deste servidor, por menção, ID ou nome. O padrão é o canal atual.',
    },
    results: [
      '',
      '',
    ],
    notes: [
      'Se nenhum canal corresponder, nada é retornado.',
      'Se o canal atual não estiver em cache, ele é buscado, o que conta como uma requisição de rede.',
    ],
  },
  JSON_GUILD: {
    summary: 'Retorna o servidor atual como objeto JSON.',
    description: 'Inclui os dados do servidor (como `id`, `name`, `owner_id`), junto com os membros e uma lista `presences` montada a partir das presenças dos membros.',
    results: [
      '',
    ],
    notes: [
      'Em servidores muito grandes (mais de 10.000 membros), só você, o bot e os membros em canais de voz são incluídos em `members`.',
      'Em DMs, nada é retornado.',
    ],
  },
  JSON_MEMBER: {
    summary: 'Retorna um membro do servidor como objeto JSON.',
    description: 'O objeto usa os nomes de campo do Discord, como `user`, `nick`, `joined_at`, `premium_since`, `roles` (objetos de cargo completos), `hoisted_role`, `communication_disabled_until`, `avatar` e `permissions`.',
    args: {
      user: USER_YOU,
    },
    results: [
      'Seu apelido',
      'O objeto de membro do Cake',
    ],
    notes: [
      ANOTHER_USER,
      'Se o usuário não for membro deste servidor (ou você estiver em DMs), nada é retornado.',
    ],
  },
  JSON_MEMBER_OR_USER: {
    summary: 'Retorna um membro como JSON, ou um usuário se ele não estiver no servidor.',
    description: 'Dá o mesmo objeto que `{json.member}` quando possível e, senão, usa o objeto de usuário de `{json.user}` (por exemplo em DMs).',
    args: {
      user: USER_YOU,
    },
    results: [
      'Seu objeto de membro, ou seu objeto de usuário em DMs',
    ],
    notes: [
      ANOTHER_USER,
      'Se ninguém corresponder, nada é retornado.',
    ],
  },
  JSON_MESSAGE: {
    summary: 'Retorna uma mensagem como objeto JSON.',
    description: 'O objeto usa os nomes de campo do Discord, como `id`, `content`, `author`, `member`, `attachments`, `embeds`, `components`, `mentions`, `reactions`, `timestamp`, `edited_timestamp` e `referenced_message`.',
    args: {
      messageId: 'Opcional. O ID de uma mensagem do canal atual. O padrão é a mensagem que executou a tag.',
    },
    results: [
      'O conteúdo da mensagem que executou a tag',
      'A última mensagem do canal como JSON',
    ],
    notes: [
      'Só dá para buscar mensagens do canal atual.',
      'Quando um ID é dado, você precisa das permissões Ver canal e Ler histórico de mensagens no canal, e o bot também; senão, gera um erro.',
      'Buscar uma mensagem que não está em cache conta como uma requisição de rede. Se ela não for encontrada, nada é retornado.',
      'Sem ID, nada é retornado quando a tag foi executada com um comando de barra.',
    ],
  },
  JSON_MESSAGE_REPLY: {
    summary: 'Retorna a mensagem respondida como objeto JSON.',
    description: 'No mesmo formato de `{json.message}`, mas para a mensagem que a mensagem da tag respondeu.',
    results: [
      'O nome de usuário de quem escreveu a mensagem respondida',
    ],
    notes: [
      'Não retorna nada se a mensagem não for uma resposta, ou quando a tag foi executada com um comando de barra.',
    ],
  },
  JSON_ROLE: {
    summary: 'Retorna um cargo do servidor como objeto JSON.',
    description: 'O objeto usa os nomes de campo do Discord, como `id`, `name`, `color`, `colors`, `position`, `permissions`, `hoist`, `mentionable`, `managed`, `icon` e `unicode_emoji`, além de `member_count`, quantos dos membros do servidor em cache têm o cargo.',
    args: {
      role: 'Opcional. Uma menção, ID ou nome de cargo. O padrão é o seu cargo mais alto.',
    },
    results: [
      'O nome do seu cargo mais alto',
      'Quantos membros têm o cargo Moderator',
    ],
    notes: [
      'Os nomes são comparados primeiro com o começo do nome do cargo, e depois com qualquer parte dele.',
      '`member_count` só conta membros em cache, então pode ser menor que o número real em servidores grandes.',
      'Não retorna nada fora de um servidor, ou se nenhum cargo corresponder.',
    ],
  },
  JSON_USER: {
    summary: 'Retorna um usuário como objeto JSON.',
    description: 'O objeto usa os nomes de campo do Discord, como `id`, `username`, `global_name`, `discriminator`, `avatar`, `bot`, `system` e `public_flags`.',
    args: {
      user: USER_YOU,
    },
    results: [
      'Seu nome de exibição',
      '',
    ],
    notes: [
      ANOTHER_USER,
      'Se ninguém corresponder, nada é retornado.',
    ],
  },
  LOGICAL_AND: {
    summary: 'Retorna o último valor só se nenhum valor estiver vazio.',
    description: 'Cada valor é avaliado em ordem. Assim que um sair vazio, para e não retorna nada. Se nenhum estiver vazio, o último é retornado.',
    args: {
      'value1|value2|...': 'Dois ou mais valores, separados por `|`. Avaliados da esquerda para a direita, só até onde for preciso.',
    },
    results: [
      'You said hi (ou nada se nenhum argumento for dado)',
      '(nada)',
    ],
    notes: [
      NO_PIPE,
    ],
  },
  LOGICAL_DELETE: {
    summary: 'Apaga uma variável definida com `{set}`.',
    args: {
      name: 'O nome da variável a apagar.',
    },
    results: [
      '',
    ],
    notes: [
      'Não retorna nada.',
      'Nomes que começam com `__` são privados e não podem ser apagados. Nomes com mais de 64 caracteres geram um erro.',
    ],
  },
  LOGICAL_DELETE_CHANNEL: {
    summary: 'Apaga uma variável guardada para este canal com `{setchannel}`.',
    args: {
      name: STORED_DELETE,
    },
    results: [
      'Remove o "highscore" guardado deste canal.',
    ],
    notes: [
      NO_OUTPUT_IGNORED,
      STORAGE_TAG,
      STORAGE_KEY,
    ],
  },
  LOGICAL_DELETE_SERVER: {
    summary: 'Apaga uma variável guardada para este servidor com `{setserver}`.',
    args: {
      name: STORED_DELETE,
    },
    results: [
      'Remove o "counter" guardado deste servidor.',
    ],
    notes: [
      NO_OUTPUT_IGNORED,
      'Em DMs, o canal é usado no lugar do servidor.',
      STORAGE_TAG,
      STORAGE_KEY,
    ],
  },
  LOGICAL_DELETE_USER: {
    summary: 'Apaga uma variável guardada para você com `{setuser}`.',
    args: {
      name: STORED_DELETE,
    },
    results: [
      'Remove suas "coins" guardadas.',
    ],
    notes: [
      NO_OUTPUT_IGNORED,
      'Sempre afeta a pessoa que está usando a tag.',
      STORAGE_TAG,
      STORAGE_KEY,
    ],
  },
  LOGICAL_FOR_EACH: {
    summary: 'Executa código uma vez para cada item de uma lista, ou um número fixo de vezes.',
    description: 'O primeiro valor é avaliado, e então:\n\n'
      + '- um número inteiro executa o código esse número de vezes;\n'
      + '- um array JSON o executa uma vez por item;\n'
      + '- um objeto JSON o executa uma vez por chave;\n'
      + '- uma string JSON é dividida em palavras (como os argumentos de um comando; aspas mantêm palavras juntas) e executa uma vez por palavra.\n\n'
      + 'Dentro do código, `{get:idx}` é o índice atual (ou a chave do objeto) e `{get:valuex}` é o item atual (objetos e arrays saem como JSON). O resultado de cada volta é juntado sem nada entre eles.',
    args: {
      list: 'Um número, ou um array/objeto/string JSON a percorrer.',
      code: 'O TagScript a executar para cada item. Tudo depois do primeiro `|` faz parte do código.',
    },
    results: [
      '',
      '',
      'x:1 e y:2 em linhas separadas',
    ],
    notes: [
      'No máximo 200 voltas; mais do que isso gera um erro.',
      'Se a lista for JSON inválido, estiver vazia ou for qualquer outra coisa, nada é retornado.',
      NO_PIPE,
    ],
  },
  LOGICAL_GET: {
    summary: 'Retorna o valor de uma variável definida com `{set}`.',
    args: {
      name: 'O nome da variável. As funções de dentro são avaliadas, e os espaços das pontas são removidos.',
      default: GET_DEFAULT,
    },
    results: [
      '',
      '',
      '[{"filename":"image.png"}] (os arquivos anexados à resposta até agora)',
    ],
    notes: [
      'Nomes com mais de 64 caracteres geram um erro.',
      'O nome especial `__files` retorna um array JSON com os arquivos da tag (`filename` e `description`).',
      'Se a variável não existir e nenhum padrão for dado, nada é retornado.',
    ],
  },
  LOGICAL_GET_CHANNEL: {
    summary: 'Retorna uma variável guardada para este canal com `{setchannel}`.',
    description: 'Variáveis guardadas persistem entre usos da tag. As variáveis de canal são compartilhadas por todos que usam a tag neste canal.',
    args: {
      name: STORED_NAME,
      default: GET_DEFAULT,
    },
    results: [
      '',
    ],
    notes: [
      STORAGE_TAG + ' Senão, nada é retornado.',
      STORAGE_KEY,
    ],
  },
  LOGICAL_GET_FILE_NAME: {
    summary: 'Retorna o nome de um dos arquivos da tag.',
    args: {
      number: 'Qual arquivo, começando em 1 para o primeiro.',
    },
    results: [
      'O nome do primeiro arquivo, ex.: image.png',
    ],
    notes: [
      'Uma entrada vazia ou que não é um número deixa a função como texto normal.',
      'Um número de arquivo que não existe gera um erro.',
    ],
  },
  LOGICAL_GET_GLOBAL: {
    summary: 'Retorna uma variável global guardada com `{setglobal}`.',
    description: 'As variáveis globais pertencem à própria tag e são compartilhadas por todo mundo, em todos os servidores.',
    args: {
      name: STORED_NAME,
      default: GET_DEFAULT,
    },
    results: [
      '',
    ],
    notes: [
      STORAGE_TAG + ' Senão, nada é retornado.',
      STORAGE_KEY,
    ],
  },
  LOGICAL_GET_SERVER: {
    summary: 'Retorna uma variável guardada para este servidor com `{setserver}`.',
    description: 'As variáveis de servidor são compartilhadas por todos que usam a tag neste servidor.',
    args: {
      name: STORED_NAME,
      default: GET_DEFAULT,
    },
    results: [
      '',
    ],
    notes: [
      'Em DMs, o canal é usado no lugar do servidor.',
      STORAGE_TAG + ' Senão, nada é retornado.',
      STORAGE_KEY,
    ],
  },
  LOGICAL_GET_USER: {
    summary: 'Retorna uma variável guardada para você com `{setuser}`.',
    description: 'As variáveis de usuário são separadas para cada pessoa que usa a tag, e a acompanham entre servidores.',
    args: {
      name: STORED_NAME,
      default: GET_DEFAULT,
    },
    results: [
      '',
    ],
    notes: [
      'Sempre lê a variável da pessoa que está usando a tag.',
      STORAGE_TAG + ' Senão, nada é retornado.',
      STORAGE_KEY,
    ],
  },
  LOGICAL_INCLUDES: {
    summary: 'Retorna `true` se o texto corresponder a algum dos valores dados e, senão, `false`.',
    description: 'O primeiro valor é comparado em ordem com cada um dos outros (correspondência exata, diferenciando maiúsculas).',
    args: {
      'text': 'O texto a procurar. As funções de dentro são avaliadas, do mesmo jeito que os valores.',
      'value1|value2|...': 'Os valores com que comparar. São avaliados um a um até encontrar uma correspondência.',
    },
    results: [
      '',
      'true quando os argumentos são "yes" ou "Y"',
      '',
    ],
    notes: [
      NO_PIPE,
    ],
  },
  LOGICAL_IF: {
    summary: 'Compara dois valores e executa `then:` ou `else:` conforme o resultado.',
    description: 'Comparações: `=` igual, `!=` diferente, `>` `>=` `<` `<=` comparações numéricas (decimais funcionam), `~`, que compara números pelo valor ou texto sem diferenciar maiúsculas, e `?`, que verifica se o primeiro valor corresponde à regex do segundo valor (sem diferenciar maiúsculas).\n\n'
      + 'Depois dos dois valores, dê até três ramos começando com `then:`, `else:` ou `finally:`, em qualquer ordem. Só o ramo que corresponde é avaliado, e depois `finally:` (se dado) é avaliado e adicionado em seguida.',
    args: {
      'value1': 'O primeiro valor a comparar.',
      'comparison': 'Um de `=`, `!=`, `>`, `>=`, `<`, `<=`, `~`, `?`. Escreva sem espaços em volta.',
      'value2': 'O segundo valor a comparar.',
      'then:code': 'O que retornar quando a comparação for verdadeira.',
      'else:code': 'O que retornar quando a comparação for falsa.',
      'finally:code': 'Sempre avaliado e retornado depois de then/else (sem o prefixo `finally:`).',
    },
    results: [
      'Hi there! (quando o argumento é "hello")',
      'High ou Low',
      '',
      'Hey! (quando o argumento é "hi" ou "Hello")',
      '',
    ],
    notes: [
      '`>`, `>=`, `<` e `<=` são falsos se algum dos valores não for um número.',
      '`?` corresponde a qualquer parte do texto, a não ser que a regex use `^` e `$`. Faça o escape de `|` como `\\|` dentro da regex. Uma regex inválida, ou que demora demais, gera um erro.',
      'É preciso pelo menos um ramo, e cada ramo só pode aparecer uma vez (um repetido gera um erro).',
      'Os ramos precisam começar exatamente com `then:`, `else:` ou `finally:` (sem espaços antes), e a comparação precisa ser um operador válido; senão, a função fica como texto normal.',
    ],
  },
  LOGICAL_IF_ERROR: {
    summary: 'Retorna o primeiro valor que não gerar um erro.',
    description: 'Tenta cada valor em ordem. Se avaliar um deles der erro, o resultado dele é descartado e o próximo é tentado, com `{get:error}` definido como a mensagem desse erro. Se todos derem erro, nada é retornado.',
    args: {
      'code1|code2|...': 'Valores a tentar, separados por `|`.',
    },
    results: [
      'No third file! (quando há menos de 3 arquivos)',
      'O erro do download, quando o link não funciona',
    ],
    notes: [
      'Com um valor só (sem `|`), ele é avaliado e retornado, ou nada é retornado se der erro.',
      'Um `{exit}` ou `{exitsilent}` de dentro não é capturado: continua parando a tag inteira.',
      '`error` só existe dentro do `{iferror}`; depois volta ao que era antes.',
    ],
  },
  LOGICAL_IS_FROM_AI: {
    summary: 'Retorna `true` se o código foi escrito pelo NotSoAI e, senão, `false`.',
    description: 'É verdadeiro quando o código em execução é a resposta do NotSoAI (do comando de IA, ou uma resposta de `{ai}` executada como código), e falso na tag de um usuário, incluindo uma tag que o NotSoAI chama com `{tag}`. É a mesma verificação que as funções exclusivas do NotSoAI usam.',
    results: [
      'false (na tag de um usuário)',
    ],
  },
  LOGICAL_IS_FROM_COMPONENT: {
    summary: 'Retorna `true` se o código estiver rodando por causa de um componente (uso de botão/menu de seleção ou expiração de componente) e, senão, `false`.',
    results: [
      'Click the button below. (na primeira execução)',
    ],
  },
  LOGICAL_IS_MAIN_TAG: {
    summary: 'Retorna `true` se esta for a tag executada diretamente, ou `false` se ela foi chamada de outra tag com `{tag}`.',
    results: [
      '',
    ],
  },
  LOGICAL_OR: {
    summary: 'Retorna o primeiro valor que não estiver vazio.',
    description: 'Cada valor é avaliado em ordem e o primeiro que não estiver vazio é retornado. Os valores seguintes não são avaliados. Se todos estiverem vazios, nada é retornado.',
    args: {
      'value1|value2|...': 'Valores a tentar, separados por `|`.',
    },
    results: [
      'Hello stranger! (quando nenhum argumento é dado)',
      'A primeira dessas variáveis que estiver definida',
    ],
    notes: [
      'Com um valor só (sem `|`), ele é avaliado e retornado.',
    ],
  },
};
