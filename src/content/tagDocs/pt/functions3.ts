// tagDocs/functions/part3.ts in Brazilian Portuguese, keyed by function id

import type { TagDocsTranslation } from '../localize';


const LAST_MEDIA_DESCRIPTION = [
  'Sem argumento, o bot procura a mídia correspondente mais recente nesta ordem: um anexo de um comando de barra, a mensagem que executou a tag (anexos, embeds, figurinhas), a mensagem que ela responde e, por fim, as últimas 25 mensagens do canal (primeiro as que o bot tem em cache, e depois as que ele busca se puder ler o histórico de mensagens).',
  'Com argumento, os anexos da mensagem que executou a tag e da mensagem que ela responde continuam vindo primeiro. Depois disso, o argumento é lido como: `^` (a última mídia, igual a sem argumento), uma URL ou um link de mensagem do Discord (pega a mídia dessa mensagem), uma menção de usuário, ID, `@name` ou `name#0000` (o avatar desse usuário), um emoji personalizado (a imagem dele), um emoji unicode (a imagem dele no Twemoji), ou uma busca por nome de membro (o avatar dele).',
].join('\n\n');

const LAST_MEDIA = 'Conta como 1 requisição de rede, mesmo que nada seja encontrado.';
const NOTHING_FOUND = 'Não retorna nada se nenhuma mídia correspondente for encontrada.';
const IV_FALLBACK = 'Se nada for encontrado, a alternativa definida com `{settings:MEDIA_IV_FALLBACK|...}` é executada no lugar, com o mesmo argumento (por exemplo `search.google.images`, `search.ddg.images` ou `imagine`, que gera uma imagem e usa a URL temporária dela).';
const STORAGE_NOTES = [
  'As chaves podem ter até 128 caracteres e os valores até 16.384 caracteres; senão, a tag gera um erro.',
  'Cada tag pode guardar até 5 chaves por armazenamento de canal, servidor, usuário ou global; salvar uma 6ª chave gera um erro. Um valor vazio apaga a chave.',
  'O armazenamento pertence à tag (aliases compartilham o armazenamento da tag original). Nada é salvo a não ser que o código esteja rodando como uma tag salva.',
  'Tanto a chave quanto o valor podem conter outras funções; elas são executadas antes de salvar.',
  'Sem um `|`, a função fica como texto normal.',
];
const MESSAGE_PERMISSION = 'Você precisa das permissões Ver canal e Ler histórico de mensagens nesse canal, e o bot precisa conseguir ler o histórico dele; senão, a tag gera um erro.';

const STORAGE_ARGS = {
  name: 'A chave de armazenamento.',
  value: 'O valor a salvar.',
};
const NOT_A_NUMBER = 'Fica como texto normal se o argumento não for um número.';
const RADIANS = 'O ângulo em radianos; decimais funcionam.';
const WHOLE_NUMBERS = 'Um ou mais números separados por `|`. As partes decimais são descartadas, e números muito grandes são tratados com exatidão.';
const AI_REQUEST = 'Conta como 1 requisição de rede e 1 requisição de IA (5 requisições de IA por execução por padrão).';
const SAFE_MODE = 'Sempre roda no modo seguro.';
const IMAGINE_MODEL = 'Usa o modelo escolhido com `{settings:ML_IMAGINE_MODEL|...}` (por enquanto só `FLUX_KLEIN`); `{settings:ML_IMAGINE_DO_NOT_ERROR|true}` também é repassado.';
const IMAGINE_MODEL_SHORT = 'Usa o modelo escolhido com `{settings:ML_IMAGINE_MODEL|...}`.';
const LINK_EXPIRES = 'O link enviado expira em 7 dias.';
const MAX_ATTACHMENTS = 'Gera um erro se a tag já tiver o máximo de anexos (10), ou se o resultado for maior que o limite de upload.';
const PROMPT_BEFORE_PIPE = 'O que mudar. Se houver um `|`, tudo antes do último `|` é o prompt.';
const CHANNEL_LOOK = 'O canal onde procurar (ID, menção ou nome). O padrão é o canal atual.';
const CHANNEL_MESSAGE = 'O canal onde a mensagem está (ID, menção ou nome). O padrão é o canal atual.';
const LOOKUP_CHANNEL_MESSAGE = 'Buscar um canal conta como 1 requisição de rede, assim como buscar uma mensagem que o bot não tem em cache.';
const MESSAGE_NOT_FOUND = 'Não retorna nada se a mensagem ou o canal não forem encontrados, se a mensagem estiver em outro canal, ou se for uma mensagem efêmera de outra pessoa.';
const NO_MESSAGES = 'Não retorna nada se não houver mensagens para escolher.';


export const FUNCTIONS_PORTUGUESE_3: TagDocsTranslation['functions'] = {
  LOGICAL_SET: {
    summary: 'Define uma variável para esta execução da tag.',
    description: 'Guarda um valor sob um nome para você ler depois com `{get:name}`. As variáveis só duram a execução atual; use `{setserver}`, `{setuser}`, `{setchannel}` ou `{setglobal}` para manter valores entre execuções.',
    args: {
      name: 'O nome da variável. Não pode começar com `__` (esses são reservados).',
      value: 'O valor a guardar. Tudo depois do primeiro `|` é usado, então ele pode conter mais caracteres `|`. Os espaços do começo e do fim são removidos.',
    },
    results: [
      '',
      '',
    ],
    notes: [
      'Os nomes podem ter até 64 caracteres e você pode ter até 100 variáveis por execução.',
      'Valores com mais de 1 MiB são cortados.',
      'Definir um nome que já existe o sobrescreve.',
      'O nome e o valor podem conter outras funções; elas são executadas antes de salvar.',
      'Sem um `|`, a função fica como texto normal.',
    ],
  },
  LOGICAL_SET_CHANNEL: {
    summary: 'Salva um valor para esta tag, compartilhado por todos no canal atual.',
    description: 'Mantém o valor entre execuções. Leia de volta com `{getchannel:name}`.',
    args: STORAGE_ARGS,
    results: [
      'Saved! (e lembra de você como o último usuário deste canal)',
    ],
    notes: STORAGE_NOTES,
  },
  LOGICAL_SET_FILE_NAME: {
    summary: 'Renomeia um arquivo que a tag vai anexar.',
    description: 'Muda o nome do arquivo (e, se quiser, a extensão) de um dos arquivos que a tag já anexou, como um adicionado por `{attach}`, `{imagine}` ou `{mediascript}`.',
    args: {
      'file number': 'Qual arquivo anexado renomear, começando em 1.',
      'name': 'O novo nome, sem a extensão. Deixe vazio para manter o nome antigo.',
      'extension': 'A nova extensão, sem o ponto. Se for omitida por completo, a extensão antiga é mantida; se for dada mas vazia, o arquivo fica sem extensão.',
    },
    results: [
      'Renomeia o primeiro arquivo para myfile, mantendo a extensão (ex.: myfile.png)',
      'Renomeia o primeiro arquivo para notes.txt',
      'Mantém o nome, mas muda a extensão para .gif',
    ],
    notes: [
      'Gera um erro se não houver nenhum arquivo anexado com esse número.',
      'Fica como texto normal se não houver `|` ou se o número do arquivo não for um número.',
      'Isto só renomeia o arquivo; não o converte.',
    ],
  },
  LOGICAL_SET_GLOBAL: {
    summary: 'Salva um valor para esta tag, compartilhado em todo lugar onde ela é usada.',
    description: 'Mantém o valor entre execuções, em todos os servidores, canais e usuários. Leia de volta com `{getglobal:name}`.',
    args: STORAGE_ARGS,
    results: [
      'Conta cada uso da tag, em qualquer lugar',
    ],
    notes: STORAGE_NOTES,
  },
  LOGICAL_SET_SERVER: {
    summary: 'Salva um valor para esta tag, compartilhado por todos no servidor atual.',
    description: 'Mantém o valor entre execuções. Leia de volta com `{getserver:name}`. Em DMs, o canal é usado no lugar de um servidor.',
    args: STORAGE_ARGS,
    results: [
      'Salva uma mensagem do dia para este servidor',
    ],
    notes: STORAGE_NOTES,
  },
  LOGICAL_SET_USER: {
    summary: 'Salva um valor para esta tag, privado para a pessoa que a executa.',
    description: 'Mantém o valor entre execuções para o usuário que executa a tag, em qualquer servidor. Leia de volta com `{getuser:name}`.',
    args: STORAGE_ARGS,
    results: [
      'Lembra a cor só para você',
    ],
    notes: STORAGE_NOTES,
  },

  MATH: {
    summary: 'Calcula uma expressão matemática.',
    description: 'Usa um analisador do math.js com números de alta precisão (BigNumber), então coisas como `0.1+0.2` dão `0.3`. Aceita `+ - * / % ^`, parênteses, `**` (tratado como `^`), comparações, funções como `sqrt`, `round`, `floor`, `ceil`, `abs`, `min`, `max`, `log`, `pow`, `sin`/`cos`/`tan`, constantes como `pi` e `e`, conversões de unidade como `5 inch to cm`, e mudanças de base com `base(number, base)` e `frombase("digits", base)` para bases de 2 a 36 (`0-9` e depois `a-z`).\n\nNúmeros com separadores de milhar como `1,000,000` são entendidos. Resultados que se repetem para sempre são arredondados para 2 casas decimais, e os zeros do final são removidos.',
    args: {
      expression: 'A expressão a calcular. Os espaços das pontas são removidos.',
    },
    results: [
      '',
      '',
      '',
      '',
      '',
    ],
    notes: [
      'Cada expressão tem um limite de tempo de 750 ms; expressões lentas geram um erro de tempo esgotado.',
      'Expressões inválidas fazem a tag gerar um erro com a mensagem do erro matemático.',
      'Conversões de unidade retornam só o número, sem o nome da unidade.',
      'Dentro de uma execução, variáveis atribuídas numa expressão (como `x = 5`) podem ser reaproveitadas por chamadas seguintes de `{math}`, desde que essas chamadas usem o nome da variável.',
    ],
  },
  MATH_ABS: {
    summary: 'Valor absoluto de um número.',
    args: {
      number: 'Um número; decimais funcionam.',
    },
    results: [
      '',
      '',
    ],
    notes: [
      NOT_A_NUMBER,
    ],
  },
  MATH_COS: {
    summary: 'Cosseno de um ângulo em radianos.',
    args: {
      radians: RADIANS,
    },
    results: [
      '',
      '',
    ],
    notes: [
      NOT_A_NUMBER,
    ],
  },
  MATH_E: {
    summary: 'O número de Euler.',
    results: [
      '',
    ],
  },
  MATH_MAX: {
    summary: 'O maior de uma lista de números inteiros.',
    args: {
      numbers: WHOLE_NUMBERS,
    },
    results: [
      '',
      '',
    ],
    notes: [
      'Fica como texto normal se o argumento estiver vazio ou algum valor não for um número.',
    ],
  },
  MATH_MIN: {
    summary: 'O menor de uma lista de números inteiros.',
    args: {
      numbers: WHOLE_NUMBERS,
    },
    results: [
      '',
      '',
    ],
    notes: [
      'Fica como texto normal se o argumento estiver vazio ou algum valor não for um número.',
    ],
  },
  MATH_PI: {
    summary: 'O número pi.',
    results: [
      '',
    ],
  },
  MATH_SIN: {
    summary: 'Seno de um ângulo em radianos.',
    args: {
      radians: RADIANS,
    },
    results: [
      '',
    ],
    notes: [
      NOT_A_NUMBER,
    ],
  },
  MATH_TAN: {
    summary: 'Tangente de um ângulo em radianos.',
    args: {
      radians: RADIANS,
    },
    results: [
      '',
    ],
    notes: [
      NOT_A_NUMBER,
    ],
  },

  MEDIA: {
    summary: 'Pega a URL de uma imagem, vídeo ou arquivo de áudio.',
    description: LAST_MEDIA_DESCRIPTION,
    args: {
      query: 'Uma URL, link de mensagem, usuário, emoji ou `^`. Deixe vazio para usar a última mídia do canal.',
    },
    results: [
      '',
      'Mídia a partir do que o usuário passou (uma URL, o avatar de um usuário, um emoji, ...)',
    ],
    notes: [LAST_MEDIA, NOTHING_FOUND],
  },
  MEDIA_AUDIO: {
    summary: 'Pega a URL de um arquivo de áudio.',
    description: 'Funciona como `{media}`, mas só corresponde a áudio.\n\n' + LAST_MEDIA_DESCRIPTION,
    args: {
      query: 'Uma URL, link de mensagem ou `^`. Deixe vazio para usar o último áudio do canal.',
    },
    results: [
      '',
    ],
    notes: [LAST_MEDIA, NOTHING_FOUND],
  },
  MEDIA_AUDIO_OR_VIDEO: {
    summary: 'Pega a URL de um arquivo de áudio ou vídeo.',
    description: 'Funciona como `{media}`, mas pula imagens.\n\n' + LAST_MEDIA_DESCRIPTION,
    args: {
      query: 'Uma URL, link de mensagem ou `^`. Deixe vazio para usar o último áudio/vídeo do canal.',
    },
    results: [
      '',
    ],
    notes: [LAST_MEDIA, NOTHING_FOUND],
  },
  MEDIA_IMAGE: {
    summary: 'Pega a URL de uma imagem.',
    description: 'Funciona como `{media}`, mas só corresponde a imagens.\n\n' + LAST_MEDIA_DESCRIPTION,
    args: {
      query: 'Uma URL, link de mensagem, usuário, emoji ou `^`. Deixe vazio para usar a última imagem do canal.',
    },
    results: [
      '',
      'A URL do seu avatar',
      'Uma imagem a partir dos argumentos ou, se nenhuma for encontrada, um resultado do Google Imagens para eles',
    ],
    notes: [LAST_MEDIA, IV_FALLBACK, NOTHING_FOUND],
  },
  MEDIA_IMAGE_EDIT: {
    summary: 'Edita uma imagem com IA a partir de um prompt de texto e anexa o resultado.',
    description: 'Encontra uma imagem (do mesmo jeito que `{image}`) e pede ao editor de imagens com IA para mudá-la conforme o seu prompt. A imagem editada é anexada à resposta da tag. Se o prompt estiver vazio, um é inventado automaticamente.',
    args: {
      prompt: PROMPT_BEFORE_PIPE,
      image: 'Onde encontrar a imagem (URL, usuário, emoji, `^`...). Só é lido se houver um `|`; senão, é usada a última imagem.',
    },
    results: [
      'Anexa uma versão editada da última imagem',
      'Anexa seu avatar usando um chapéu de festa',
      'Anexa uma edição da imagem dada com um prompt automático',
    ],
    notes: [
      AI_REQUEST,
      SAFE_MODE,
      IMAGINE_MODEL,
      IV_FALLBACK,
      'Fica como texto normal se nenhuma imagem for encontrada, ou se anexos não forem permitidos aqui.',
      MAX_ATTACHMENTS,
    ],
  },
  MEDIA_IMAGE_EDIT_URL: {
    summary: 'Edita uma imagem com IA e retorna um link para o resultado.',
    description: 'Igual ao `{edit}`, mas em vez de anexar a imagem, ele faz upload e retorna a URL, para você usar em embeds ou passar para outras funções.',
    args: {
      prompt: PROMPT_BEFORE_PIPE,
      image: 'Onde encontrar a imagem. Só é lido se houver um `|`; senão, é usada a última imagem.',
    },
    results: [
      '',
      '',
    ],
    notes: [
      AI_REQUEST,
      SAFE_MODE,
      LINK_EXPIRES,
      IMAGINE_MODEL_SHORT,
      IV_FALLBACK,
      'Não retorna nada se nenhuma imagem for encontrada.',
    ],
  },
  MEDIA_IMAGE_IMAGINE: {
    summary: 'Gera uma imagem com IA e a anexa.',
    description: 'Cria uma imagem totalmente nova a partir de um prompt de texto e a anexa à resposta da tag. Se o prompt estiver vazio, um é inventado automaticamente.',
    args: {
      prompt: 'O que a imagem deve mostrar.',
    },
    results: [
      'Anexa uma imagem gerada de um gato com coroa',
      'Anexa uma imagem a partir de um prompt aleatório',
      'Gera com o modelo Flux Klein',
    ],
    notes: [
      AI_REQUEST,
      SAFE_MODE,
      IMAGINE_MODEL,
      'Fica como texto normal se anexos não forem permitidos aqui.',
      MAX_ATTACHMENTS,
    ],
  },
  MEDIA_IMAGE_IMAGINE_URL: {
    summary: 'Gera uma imagem com IA e retorna um link para ela.',
    description: 'Igual ao `{imagine}`, mas faz upload da imagem e retorna a URL em vez de anexá-la.',
    args: {
      prompt: 'O que a imagem deve mostrar.',
    },
    results: [
      '',
      '',
    ],
    notes: [
      AI_REQUEST,
      SAFE_MODE,
      LINK_EXPIRES,
      IMAGINE_MODEL_SHORT,
    ],
  },
  MEDIA_IMAGE_OR_VIDEO: {
    summary: 'Pega a URL de uma imagem ou vídeo.',
    description: 'Funciona como `{media}`, mas pula áudio.\n\n' + LAST_MEDIA_DESCRIPTION,
    args: {
      query: 'Uma URL, link de mensagem, usuário, emoji ou `^`. Deixe vazio para usar a última imagem/vídeo do canal.',
    },
    results: [
      '',
    ],
    notes: [LAST_MEDIA, IV_FALLBACK, NOTHING_FOUND],
  },
  MEDIA_LIST: {
    summary: 'Pega as URLs de várias mídias como um array JSON.',
    description: 'Junta mídia nesta ordem: anexos de um comando de barra, a mensagem que executou a tag (anexos, figurinhas), a mensagem que ela responde e, por fim, o argumento de texto. Para quando tiver `max` URLs.\n\nAo contrário do `{media}`, não procura nas mensagens mais antigas do canal, então a lista é só o que foi enviado ou indicado. Coloque `^` no texto para adicionar a última mídia do canal.\n\nO texto é lido como o argumento do `{media}`: URLs, links de mensagens do Discord, menções de usuário, IDs, `@name` (o avatar), emojis e buscas por nome de membro. Use com `{foreach}` para passar por cada URL, ou com `{traversejson}` para escolher ou contar.',
    args: {
      type: '`media` (o padrão), `image`, `video`, `audio`, `av` (áudio ou vídeo) ou `iv` (imagem ou vídeo).',
      max: 'O máximo de URLs a retornar, de 1 a 10. O padrão é 10.',
      text: 'Mídia extra a procurar, como `{args}`.',
    },
    results: [
      '',
      'Até duas imagens da mensagem, da resposta e dos argumentos',
      'Envia de novo cada imagem da mensagem',
      '',
    ],
    notes: [
      LAST_MEDIA,
      'Retorna `[]` se nenhuma mídia correspondente for encontrada.',
      'Um tipo desconhecido, ou um `max` que não é um número, deixa a função como texto normal.',
    ],
  },
  MEDIA_VIDEO: {
    summary: 'Pega a URL de um vídeo.',
    description: 'Funciona como `{media}`, mas só corresponde a vídeos.\n\n' + LAST_MEDIA_DESCRIPTION,
    args: {
      query: 'Uma URL, link de mensagem ou `^`. Deixe vazio para usar o último vídeo do canal.',
    },
    results: [
      '',
    ],
    notes: [LAST_MEDIA, NOTHING_FOUND],
  },

  MESSAGE_CONTENT: {
    summary: 'Pega o texto de uma mensagem.',
    description: 'Sem argumento, retorna o conteúdo da mensagem que executou a tag (só com comandos de prefixo). Com um ID de mensagem, retorna o conteúdo dessa mensagem.',
    args: {
      'message id': 'O ID da mensagem a ler.',
      'channel': CHANNEL_MESSAGE,
    },
    results: [
      'O texto completo da mensagem que executou a tag',
      'O texto da mensagem anterior do canal',
    ],
    notes: [
      LOOKUP_CHANNEL_MESSAGE,
      MESSAGE_PERMISSION,
      MESSAGE_NOT_FOUND,
    ],
  },
  MESSAGE_LAST_ID: {
    summary: 'Pega o ID de uma mensagem recente de um canal.',
    description: 'Olha as mensagens recentes do canal (pulando a que executou a tag) e retorna o ID da que está na posição dada. `0` é a mais recente.',
    args: {
      position: 'Quanto voltar, de `0` (a mais nova) a `99`, ou `random` para uma aleatória das últimas 100. O padrão é `0`; qualquer coisa que não seja um número é tratada como `0`.',
      channel: CHANNEL_LOOK,
    },
    results: [
      '1234567890123456789 (a mensagem anterior)',
      'O ID da terceira mensagem mais recente',
      'O autor de uma mensagem recente aleatória',
    ],
    notes: [
      'Gera um erro se a posição for 100 ou mais.',
      'Buscar um canal conta como 1 requisição de rede, assim como buscar o histórico quando o bot não tem mensagens suficientes em cache.',
      MESSAGE_PERMISSION,
      'Mensagens efêmeras de outras pessoas são puladas.',
      NO_MESSAGES,
    ],
  },
  MESSAGE_RANDOM_ID: {
    summary: 'Pega o ID de uma mensagem aleatória entre as últimas 100 de um canal.',
    args: {
      channel: CHANNEL_LOOK,
    },
    results: [
      '',
      'Cita uma mensagem recente aleatória',
    ],
    notes: [
      'A mensagem que executou a tag e as mensagens efêmeras de outras pessoas são puladas.',
      'Buscar um canal conta como 1 requisição de rede, assim como buscar o histórico quando o bot não tem 100 mensagens em cache.',
      MESSAGE_PERMISSION,
      NO_MESSAGES,
    ],
  },
  MESSAGE_USER_ID: {
    summary: 'Pega o ID do autor de uma mensagem.',
    description: 'Sem argumento, retorna o ID de quem enviou a mensagem que executou a tag (só com comandos de prefixo). Com um ID de mensagem, retorna o ID do autor dessa mensagem.',
    args: {
      'message id': 'O ID da mensagem.',
      'channel': CHANNEL_MESSAGE,
    },
    results: [
      'Seu ID de usuário',
      'Menciona quem enviou a mensagem anterior',
    ],
    notes: [
      LOOKUP_CHANNEL_MESSAGE,
      MESSAGE_PERMISSION,
      MESSAGE_NOT_FOUND,
    ],
  },

  MEDIASCRIPT: {
    summary: 'Executa um programa de MediaScript e anexa o arquivo que ele produz.',
    description: 'O MediaScript é a linguagem de script do NotSoBot para criar e editar imagens, vídeo e áudio. O código roda nos servidores do NotSoBot e o arquivo de saída é anexado à resposta da tag.\n\nVocê pode passar para o script arquivos que a tag já anexou escrevendo `FILE_1`, `FILE_2` e assim por diante (numerados na ordem dos anexos). Usar `FILE_1` move esse arquivo para o script, então ele é removido da resposta; use `FILE_1_COPY` para manter o original anexado também. Anexos que são só um link são substituídos pela URL deles.',
    args: {
      code: 'O código de MediaScript a executar. Os espaços das pontas são removidos.',
    },
    results: [
      'Anexa a imagem processada no lugar da original',
    ],
    notes: [
      'Conta como 1 requisição de rede.',
      'O modo seguro fica ativado, a não ser que o canal seja NSFW (ou uma DM), seguindo as regras de NSFW de sempre.',
      'Qualquer geração de imagem dentro do script usa o modelo escolhido com `{settings:ML_IMAGINE_MODEL|...}`.',
      'Os valores que o script retorna como argumentos são salvos como variáveis da tag, como se tivessem sido definidos com `{set}`.',
      'Saídas de texto (como .txt) são anexadas como arquivos de texto.',
      'Fica como texto normal se o código estiver vazio ou se anexos não forem permitidos aqui.',
      'Gera um erro se `FILE_n` se referir a um arquivo que não existe, se o script der erro, se a tag já tiver o máximo de anexos (10), ou se o resultado for maior que o limite de upload.',
    ],
  },
};
