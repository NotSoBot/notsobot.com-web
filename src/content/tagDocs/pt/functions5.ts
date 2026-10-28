// tagDocs/functions/part5.ts in Brazilian Portuguese, keyed by function id

import type { TagDocsTranslation } from '../localize';

import { API_LIMIT } from './common';


const USER_LOOKUP = 'Opcional. Uma menção, um ID de usuário ou um nome para procurar entre os membros do servidor. Se omitido, é usada a pessoa que está usando a tag.';
const USER_LOOKUP_NOTE = 'Buscar outro usuário conta como uma requisição de rede. Se ninguém corresponder, nada é retornado.';
const RANDOM_DM = 'Em DMs, escolhe entre a pessoa que está usando a tag e o próprio NotSoBot.';
const MEMBER_LIST = 'Se a lista de membros do servidor ainda não estiver totalmente carregada, o NotSoBot a pede antes, o que pode levar um tempinho em servidores grandes.';
const PRESENCE_CACHE = 'Só escolhe entre membros que o NotSoBot tem em cache com uma presença.';
const VARIABLES_STORAGE_NOTES = [
  'Faz uma requisição para buscar as variáveis salvas da tag atual. Se a tag não estiver rodando como uma tag salva (então não há tag para buscar), retorna `{}`.',
  'Se a tag for um alias de outra tag, são usadas as variáveis da tag original.',
];
const NOT_SAVED = 'Não retorna nada se não for executada a partir de uma tag salva.';
const TIME_UNKNOWN = 'Se o horário não for entendido, nada é retornado.';
const ONE_REQUEST = 'Conta como uma requisição de rede.';


export const FUNCTIONS_PORTUGUESE_5: TagDocsTranslation['functions'] = {
  STRING_UPPER: {
    summary: 'Converte o texto para MAIÚSCULAS.',
    args: {
      text: 'O texto a converter.',
    },
    results: [
      '',
      'Seu nome de usuário em maiúsculas',
    ],
  },
  STRING_URL_ENCODE: {
    summary: 'Codifica o texto para URL, para que ele possa ser colocado com segurança dentro de um link.',
    description: 'Usa a codificação padrão de componentes de URI, então espaços viram `%20`, `&` vira `%26`, e assim por diante.',
    args: {
      text: 'O texto a codificar.',
    },
    results: [
      '',
      'Um link de pesquisa do Google para o que foi passado para a tag',
    ],
  },
  TAG: {
    summary: 'Executa outra tag pelo ID e insere o resultado dela.',
    description: 'A primeira parte é o ID da tag a executar, e tudo depois do primeiro `|` é passado para essa tag como argumentos (o que `{args}` retorna dentro dela).\n\nA tag chamada roda como se fosse a tag atual, então funções como `{tagid}` e `{tagname}` se referem a ela enquanto roda, e o resultado dela (texto, embeds, arquivos etc.) é juntado ao resultado da tag atual. As variáveis que você define na sua tag não são compartilhadas com a tag chamada, e as variáveis da tag chamada não voltam para a sua, a não ser que a tag chame a si mesma, caso em que todas as variáveis são compartilhadas. Os limites de uso (requisições de rede, execuções de tags etc.) são compartilhados entre as duas.',
    args: {
      tag_id: 'O ID da tag a executar (não o nome dela).',
      arguments: 'Texto passado para a tag chamada como argumentos. O padrão é nada.',
    },
    results: [
      'O resultado da tag 123456789012345678, executada sem argumentos',
      'O resultado dessa tag, com `{args}` valendo "hello world" dentro dela',
    ],
    notes: [
      'A tag precisa estar no diretório de tags, ou pertencer ao mesmo servidor (ou às DMs do dono da tag). Senão, gera um erro.',
      'Gera um erro se o ID estiver faltando ou não for um ID válido.',
      'Conta para o limite de execuções de tags (2 por execução por padrão) e conta como uma requisição de rede.',
      'Chamar a tag também aumenta o contador de usos dela.',
      'É ignorado (não retorna nada) quando usado dentro da análise de código ou do JSON de componentes filhos.',
      'A tag chamada sempre conta como a tag de um usuário, mesmo quando o NotSoAI a chama, então `{isfromai}` é `false` dentro dela e as funções exclusivas do NotSoAI não funcionam ali.',
    ],
  },
  TAG_CONTENT: {
    summary: 'Retorna o conteúdo bruto, sem interpretação, da tag atual.',
    description: 'Se a tag for um alias de outra tag, é retornado o conteúdo da tag original.',
    results: [
      'Mostra o código da própria tag num bloco de código',
    ],
    notes: [
      NOT_SAVED,
    ],
  },
  TAG_CREATE: {
    summary: 'Salva uma tag nova para a pessoa que pediu ao NotSoAI. Só o NotSoAI pode usar isto.',
    description: 'Cria uma tag cujo dono é a pessoa que pediu ao NotSoAI, no servidor atual (ou DM), e retorna o nome dela. O conteúdo é interpretado como qualquer outro argumento, então envolva o TagScript em {ignore} para salvar o próprio código em vez do resultado dele.',
    args: {
      name: 'O nome da nova tag, de até 64 caracteres. É salvo em minúsculas.',
      content: 'O conteúdo da tag, de até 2000 caracteres. Tudo depois do primeiro `|` é usado.',
    },
    results: [
      '`greet`, e executar `tag greet` cumprimenta quem a executar',
    ],
    notes: [
      'Só o NotSoAI pode usar isto, e só na própria resposta: na tag de um usuário, ou num botão que o NotSoAI criou, a função fica como texto normal. Também fica como texto normal quando o prompt do NotSoAI tinha texto de outra pessoa (uma mensagem de outra pessoa que ele respondeu, um link, um arquivo que não foi enviado pelo próprio usuário ou a opção `url`, também antes na conversa), e em código que só existe durante a execução, como uma resposta do `{ai}` ou o que `{eval}` e `{evalsilent}` executam.',
      'Só cria tags novas. Gera um erro se já existir uma tag com esse nome no servidor, mesmo que seja sua.',
      'O NotSoAI só pode criar uma tag por mensagem.',
      API_LIMIT,
    ],
  },
  TAG_ID: {
    summary: 'Retorna o ID da tag atual.',
    results: [
      '',
    ],
    notes: [
      'Não retorna nada se não for executada a partir de uma tag salva. Dentro de uma tag chamada com `{tag}`, é o ID da tag chamada.',
    ],
  },
  TAG_NAME: {
    summary: 'Retorna o nome da tag atual.',
    results: [
      '',
    ],
    notes: [
      'Não retorna nada se não for executada a partir de uma tag salva. Dentro de uma tag chamada com `{tag}`, é o nome da tag chamada.',
    ],
  },
  TAG_OWNER_ID: {
    summary: 'Retorna o ID de usuário do dono da tag atual.',
    results: [
      '',
      'Menciona o dono da tag',
    ],
    notes: [
      NOT_SAVED,
    ],
  },
  TEXT: {
    summary: 'Baixa uma URL e retorna o conteúdo dela como texto.',
    args: {
      url: 'A URL a baixar.',
    },
    results: [
      'O conteúdo de file.txt',
      'O campo `name` de um arquivo JSON baixado',
    ],
    notes: [
      ONE_REQUEST,
      'Gera um erro se o texto baixado fizer o resultado da tag passar do tamanho máximo de anexo do contexto atual.',
    ],
  },
  TEXT_FROM_HTML: {
    summary: 'Baixa uma página web e retorna o texto dela sem o HTML.',
    args: {
      url: 'A URL da página a baixar.',
    },
    results: [
      'O texto legível da página, sem tags HTML',
    ],
    notes: [
      ONE_REQUEST,
      'Gera um erro se o texto fizer o resultado da tag passar do tamanho máximo de anexo do contexto atual.',
    ],
  },
  TIME_UNIX: {
    summary: 'Retorna um timestamp Unix em milissegundos, de agora ou de um horário que você descrever.',
    description: 'Sem argumento, retorna o horário atual. Com argumento, lê linguagem natural como "tomorrow at 5pm" ou "in 2 hours", em relação a quando a mensagem foi enviada e usando o fuso horário do usuário.',
    args: {
      time: 'Um horário em palavras, ex.: "in 3 days" ou "next friday at noon".',
    },
    results: [
      '',
      'O timestamp (ms) de daqui a uma hora',
    ],
    notes: [
      TIME_UNKNOWN,
    ],
  },
  TIME_UNIX_FROM_SNOWFLAKE: {
    summary: 'Retorna a data de criação (milissegundos Unix) de um ID do Discord.',
    description: 'Todo ID do Discord (usuários, mensagens, canais, servidores etc.) traz a data de criação embutida. Isto a extrai.',
    args: {
      id: 'Qualquer ID do Discord.',
    },
    results: [
      'Quando sua conta foi criada, em milissegundos Unix',
    ],
    notes: [
      'Não retorna nada com um argumento vazio.',
      'Se o argumento não for um número, a função fica no resultado como texto normal.',
    ],
  },
  TIME_UNIX_SECONDS: {
    summary: 'Retorna um timestamp Unix em segundos, de agora ou de um horário que você descrever.',
    description: 'Igual ao `{unix}`, mas em segundos (arredondado para baixo), que é o que os timestamps `<t:...>` do Discord usam.',
    args: {
      time: 'Um horário em palavras, ex.: "tomorrow at 9am".',
    },
    results: [
      '',
      'Event starts in 5 days (como o Discord mostra)',
    ],
    notes: [
      TIME_UNKNOWN,
    ],
  },
  TRANSCRIBE: {
    summary: 'Transcreve em texto a fala de um clipe de áudio ou vídeo.',
    description: 'Se nenhuma URL for dada, é usado o áudio/vídeo mais recente do chat (anexos, respostas etc.). Se nenhum for encontrado e a configuração `MEDIA_AV_FALLBACK` estiver definida (ex.: `{settings:MEDIA_AV_FALLBACK|search.youtube}`), essa função é executada com o mesmo argumento para encontrar uma URL.',
    args: {
      url: 'Um link para um arquivo de áudio ou vídeo. O padrão é o último áudio/vídeo encontrado.',
    },
    results: [
      'O texto falado do último áudio/vídeo do chat',
      'O texto falado de voice.mp3',
    ],
    notes: [
      ONE_REQUEST,
      'Se nenhuma mídia for encontrada ou a transcrição falhar, nada é retornado (sem erro).',
    ],
  },
  TRAVERSE_JSON: {
    summary: 'Tira um valor de um JSON usando um caminho como `cake[0].test`.',
    description: 'O caminho é dividido em chaves:\n\n`a.b` entra na chave `a` e depois na chave `b`.\n\n`a[0]` entra na chave `a` e depois no índice `0` do array.\n\n`a["some.key"]` ou `a[\'some.key\']` usa uma chave entre aspas, então pontos e colchetes dentro dela são mantidos (use `\\` para fazer o escape de uma aspa).\n\nSe o valor encontrado for um objeto ou array, ele é retornado como JSON; senão, é retornado como está.',
    args: {
      path: 'Onde procurar, ex.: `data.items[2].name`.',
      json: 'O texto JSON onde procurar. Tudo depois do primeiro `|`.',
    },
    results: [
      '',
      '',
      '',
    ],
    notes: [
      'Se o caminho não existir, nada é retornado.',
      'JSON inválido, um caminho vazio ou a falta do `|` fazem a função falhar.',
    ],
  },
  TYPE: {
    summary: 'Converte texto num número, com um valor alternativo opcional.',
    description: 'Os tipos suportados são `number` (um número inteiro, lido com parseInt) e `float` (um número decimal, lido com parseFloat). A leitura para no primeiro caractere que não faz parte de um número, então `12abc` vira `12`.',
    args: {
      type: '`number` ou `float` (sem diferenciar maiúsculas).',
      value: 'O texto a converter.',
      default: 'Usado se o valor não for um número.',
    },
    results: [
      '',
      '',
      '',
    ],
    notes: [
      'Se o valor não for um número e não houver padrão, nada é retornado.',
      'Um tipo desconhecido, um padrão que não é número ou a falta do `|` fazem a função falhar.',
    ],
  },
  USER_AVATAR: {
    summary: 'Retorna a URL do avatar de um usuário.',
    description: 'Dá o avatar global (da conta) do usuário em 1024px.',
    args: {
      user: USER_LOOKUP,
    },
    results: [
      '',
      'Mostra o avatar do usuário dado como argumento',
    ],
    notes: [USER_LOOKUP_NOTE],
  },
  USER_DISCRIMINATOR: {
    summary: 'Retorna o discriminador de um usuário (o antigo número #0000).',
    args: {
      user: USER_LOOKUP,
    },
    results: [
      '',
      '',
    ],
    notes: [
      'Usuários no sistema de nomes de usuário mais novo do Discord têm discriminador `0`.',
      USER_LOOKUP_NOTE,
    ],
  },
  USER_ID: {
    summary: 'Retorna o ID de um usuário.',
    args: {
      user: USER_LOOKUP,
    },
    results: [
      '',
      'O ID do usuário dado como argumento',
    ],
    notes: [USER_LOOKUP_NOTE],
  },
  USER_MENTION: {
    summary: 'Retorna uma menção de um usuário.',
    args: {
      user: USER_LOOKUP,
    },
    results: [
      'Hey @você!',
      'Menciona um membro aleatório',
    ],
    notes: [USER_LOOKUP_NOTE],
  },
  USER_NAME: {
    summary: 'Retorna o nome de usuário de um usuário.',
    args: {
      user: USER_LOOKUP,
    },
    results: [
      '',
      'O nome de usuário desse usuário',
    ],
    notes: [
      'É o nome de usuário da conta, não o apelido no servidor. Para isso use `{nick}`.',
      USER_LOOKUP_NOTE,
    ],
  },
  USER_NICK: {
    summary: 'Retorna o nome de exibição de um usuário, usando o apelido no servidor se ele tiver um.',
    args: {
      user: USER_LOOKUP,
    },
    results: [
      '',
    ],
    notes: [USER_LOOKUP_NOTE],
  },
  USER_RANDOM: {
    summary: 'Retorna o nome de exibição de um membro aleatório do servidor.',
    results: [
      '',
    ],
    notes: [
      MEMBER_LIST,
      RANDOM_DM,
    ],
  },
  USER_RANDOM_ID: {
    summary: 'Retorna o ID de um membro aleatório do servidor.',
    results: [
      '',
      'Menciona um membro aleatório',
    ],
    notes: [
      MEMBER_LIST,
      RANDOM_DM,
    ],
  },
  USER_RANDOM_ONLINE: {
    summary: 'Retorna o nome de exibição de um membro aleatório que tenha uma presença (online, ausente ou não perturbe).',
    results: [
      '',
    ],
    notes: [
      PRESENCE_CACHE,
      RANDOM_DM,
    ],
  },
  USER_RANDOM_ONLINE_ID: {
    summary: 'Retorna o ID de um membro aleatório que tenha uma presença (online, ausente ou não perturbe).',
    results: [
      '',
    ],
    notes: [
      PRESENCE_CACHE,
      RANDOM_DM,
    ],
  },
  USER_RANDOM_ONLINE_TAG: {
    summary: 'Retorna a tag de usuário completa de um membro aleatório que tenha uma presença (online, ausente ou não perturbe).',
    results: [
      '',
    ],
    notes: [
      PRESENCE_CACHE,
      RANDOM_DM,
    ],
  },
  USER_RANDOM_TAG: {
    summary: 'Retorna a tag de usuário completa de um membro aleatório do servidor.',
    results: [
      '',
    ],
    notes: [
      MEMBER_LIST,
      RANDOM_DM,
    ],
  },
  USER_STATUS: {
    summary: 'Retorna o status de um membro: online, idle, dnd ou offline.',
    args: {
      user: USER_LOOKUP,
    },
    results: [
      '',
      '',
    ],
    notes: [
      'Só funciona com membros do servidor atual; não retorna nada em DMs nem para usuários que não estão no servidor.',
      'Membros sem presença conhecida aparecem como `offline`.',
      USER_LOOKUP_NOTE,
    ],
  },
  USER_TAG: {
    summary: 'Retorna a tag completa de um usuário (nome de usuário com discriminador).',
    args: {
      user: USER_LOOKUP,
    },
    results: [
      '',
    ],
    notes: [USER_LOOKUP_NOTE],
  },
  VARIABLES: {
    summary: 'Retorna todas as variáveis da execução atual como um objeto JSON.',
    description: 'Útil para depurar. O resultado inclui as variáveis que você define com `{set}` e também as internas que começam com `__` (como `__args` e contadores de uso).',
    results: [
      '',
    ],
  },
  VARIABLES_CHANNEL: {
    summary: 'Retorna as variáveis de canal salvas da tag (para este canal) como um objeto JSON.',
    results: [
      '',
    ],
    notes: VARIABLES_STORAGE_NOTES,
  },
  VARIABLES_GLOBAL: {
    summary: 'Retorna as variáveis globais salvas da tag como um objeto JSON.',
    results: [
      '',
    ],
    notes: VARIABLES_STORAGE_NOTES,
  },
  VARIABLES_SERVER: {
    summary: 'Retorna as variáveis de servidor salvas da tag (para este servidor) como um objeto JSON.',
    results: [
      '',
    ],
    notes: VARIABLES_STORAGE_NOTES,
  },
  VARIABLES_USER: {
    summary: 'Retorna as variáveis de usuário salvas da tag (para a pessoa que está usando a tag) como um objeto JSON.',
    results: [
      '',
    ],
    notes: VARIABLES_STORAGE_NOTES,
  },
};
