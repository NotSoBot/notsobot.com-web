// tagDocs/functions/part1.ts in Brazilian Portuguese (AI through COMPONENTS_ON_TIMEOUT), keyed by function id

import type { TagDocsTranslation } from '../localize';

import {
  API_LIMIT,
  ATTACHMENT_LIMIT,
  CACHED_QUERY,
  CHANNEL_ARG,
  CHANNEL_MATCH,
  EMPTY_ARGUMENT,
  EMPTY_QUERY,
  END_INDEX,
  MEMORY_PERMANENT,
  NETWORK,
  NO_CHANNEL,
  NOT_A_NUMBER,
  ONLY_NOTSOAI,
  OUT_OF_RANGE,
  QUERY_1024,
  SAFE_SEARCH,
  START_INDEX,
  USER_ARG,
} from './common';


const MEMORY_CHANGES = 'As funções `ai.memory.*` podem mudar a memória no máximo 3 vezes por mensagem; mais uma mudança gera um erro.';
const BAD_POSITION = 'Gera um erro se a posição não for um número positivo ou não houver nenhuma memória nessa posição.';


export const FUNCTIONS_PORTUGUESE_1: TagDocsTranslation['functions'] = {
  AI: {
    summary: 'Faz uma pergunta à IA do NotSoBot e retorna a resposta.',
    description: [
      'Envia o texto para a IA e adiciona a resposta gerada ao resultado. O texto pode vir envolto num bloco de código, que é removido antes do envio.',
      'Você pode dar mídia para a IA colocando linhas `load URL` (ou `load URL filename`) bem no começo do prompt. Arquivos que você criou antes na tag com {attach} podem ser usados como `FILE_1`, `FILE_2` etc. Usar `FILE_1` move esse arquivo para a requisição à IA (ele não será mais enviado com a mensagem); use `FILE_1_COPY` para mantê-lo.',
      'A personalidade vem de {settings:AI_PERSONALITY|...} se estiver definida; senão, da personalidade de IA do seu usuário ou do servidor. O modelo pode ser escolhido com {settings:AI_MODEL|...}.',
    ].join('\n\n'),
    args: {
      prompt: 'O que perguntar. Pode começar com linhas opcionais `load URL [filename]`.',
    },
    results: [
      'Um haicai sobre o primeiro argumento, escrito pela IA.',
      'Uma descrição em uma frase da última imagem do canal.',
    ],
    notes: [
      'Conta para o limite de execuções de IA (1 por execução por padrão) e para o limite de requisições de rede.',
      'O prompt é limitado a 12.000 caracteres (incluindo um pequeno cabeçalho interno com o número de execuções de IA).',
      'Um prompt vazio não retorna nada.',
      'Dentro de uma tag, a resposta é adicionada como texto normal. Quando o script vem da própria IA, a resposta é interpretada como TagScript primeiro (e conta como vinda do NotSoAI para {isfromai} e para as funções exclusivas do NotSoAI).',
      'Usar um `FILE_N` que não existe gera um erro.',
    ],
  },
  AI_MEMORY_ADD: {
    summary: 'Salva na memória um fato sobre a pessoa que está usando o NotSoAI. Só o NotSoAI pode usar isto.',
    description: 'O fato é mostrado ao NotSoAI em todos os prompts futuros dessa pessoa. Por padrão, ele é lembrado em todo lugar; passe `server` para lembrar só no servidor atual. Retorna `true` quando salva, ou `false` se o NotSoAI já lembrava desse fato (comparado sem diferenciar maiúsculas).',
    args: {
      fact: 'O fato a lembrar. Cortado em 200 caracteres.',
      server: '`server` para lembrar só neste servidor. É ignorado em DMs, onde é lembrado em todo lugar.',
    },
    results: [
      '',
      'true (lembrado só neste servidor)',
    ],
    notes: [
      ONLY_NOTSOAI,
      MEMORY_PERMANENT,
      'As funções `ai.memory.*` podem mudar a memória no máximo 3 vezes por mensagem; mais uma mudança gera um erro. Uma adição só conta quando salva algo novo.',
      NETWORK,
      'Um fato vazio não retorna nada.',
      'Gera um erro se a pessoa desativou a memória do NotSoAI, já tem 25 memórias globais (ou 15 para este servidor, com `server`), ou se o fato parecer uma senha, token ou chave.',
    ],
  },
  AI_MEMORY_CLEAR: {
    summary: 'Esquece tudo o que o NotSoAI lembra da pessoa que o está usando. Só o NotSoAI pode usar isto.',
    description: 'Apaga todas as memórias da pessoa, incluindo as salvas para outros servidores. Retorna quantas memórias foram esquecidas.',
    results: [
      '',
    ],
    notes: [
      ONLY_NOTSOAI,
      MEMORY_PERMANENT,
      'As funções `ai.memory.*` podem mudar a memória no máximo 3 vezes por mensagem; mais uma mudança gera um erro. Limpar só conta quando algo foi esquecido.',
      NETWORK,
    ],
  },
  AI_MEMORY_DELETE: {
    summary: 'Esquece uma das memórias do NotSoAI sobre a pessoa que o está usando, pela posição. Só o NotSoAI pode usar isto.',
    description: 'A posição é o número da memória na lista de memórias mostrada ao NotSoAI no prompt dele, começando em 1. Retorna `true` quando apagada.',
    args: {
      position: 'O número da memória, começando em 1.',
    },
    results: [
      '',
    ],
    notes: [
      ONLY_NOTSOAI,
      MEMORY_PERMANENT,
      MEMORY_CHANGES,
      NETWORK,
      EMPTY_ARGUMENT,
      BAD_POSITION,
    ],
  },
  AI_MEMORY_EDIT: {
    summary: 'Substitui uma das memórias do NotSoAI sobre a pessoa que o está usando, pela posição. Só o NotSoAI pode usar isto.',
    description: 'A posição é o número da memória na lista de memórias mostrada ao NotSoAI no prompt dele, começando em 1. Retorna `true` quando substituída.',
    args: {
      position: 'O número da memória, começando em 1.',
      fact: 'O novo fato. Cortado em 200 caracteres.',
    },
    results: [
      '',
    ],
    notes: [
      ONLY_NOTSOAI,
      MEMORY_PERMANENT,
      MEMORY_CHANGES,
      NETWORK,
      'Não retorna nada se a posição ou o fato estiverem vazios.',
      BAD_POSITION,
    ],
  },
  API_AUDIO_IDENTIFY: {
    summary: 'Identifica a música que toca num áudio ou vídeo e retorna as correspondências como JSON.',
    description: 'Retorna um array de correspondências, a melhor primeiro. Cada uma tem `title`, `artists` (nomes), `album`, `cover_url`, `duration`, `timestamp` (em que ponto da música seu clipe correspondeu), `score` (confiança de 0 a 100), `genres`, `label`, `release_date` e `urls` com os links de `apple_music`, `deezer`, `musicbrainz`, `spotify` e `youtube` (`null` quando ela não está em algum deles). Sem argumento, é usado o último áudio ou vídeo do chat.',
    args: {
      url: 'A URL de um áudio ou vídeo. O padrão é o último áudio ou vídeo do chat.',
    },
    results: [
      'O nome da música do último áudio ou vídeo.',
      'O link da música no Spotify.',
    ],
    notes: [
      'Conta duas vezes para o limite de requisições de rede, uma para encontrar a mídia e outra para identificá-la. Identificar a mesma mídia de novo numa execução reaproveita o resultado guardado.',
      '`duration` e `timestamp` estão em milissegundos.',
      'Retorna `[]` se nenhuma música for reconhecida, e gera um erro se nenhum áudio ou vídeo for encontrado.',
    ],
  },
  API_CREATE_REMINDER: {
    summary: 'Cria um lembrete para o usuário e o retorna como JSON. Só o NotSoAI pode usar isto.',
    description: 'O horário é interpretado do mesmo jeito que no comando de lembretes (coisas como "in 5 minutes" ou "tomorrow at 4pm"). Se nenhum texto for dado, as palavras que sobrarem do texto do horário são usadas. Retorna um objeto como `{"id": string, "position": number, "content": string, "timestamp_start": string, ...}`.',
    args: {
      time: 'Um horário em linguagem natural, ex.: `in 2 hours` ou `next friday at 4pm do laundry`.',
      text: 'O texto do lembrete. O padrão são as palavras de `time` que não são o horário. Tudo depois do primeiro `|` é usado.',
    },
    results: [
      'Cria o lembrete e retorna o JSON dele.',
    ],
    notes: [
      ONLY_NOTSOAI,
      API_LIMIT,
      'Gera um erro se nenhum horário for encontrado em `time`.',
      EMPTY_ARGUMENT,
    ],
  },
  API_DELETE_REMINDER: {
    summary: 'Apaga um dos lembretes do usuário pela posição. Só o NotSoAI pode usar isto.',
    description: 'A posição é o campo `position` de {api.fetch.reminders}. Retorna `true` quando apagado.',
    args: {
      position: 'O número da posição do lembrete.',
    },
    results: [
      '',
    ],
    notes: [
      ONLY_NOTSOAI,
      API_LIMIT,
      'Gera um erro se a posição não for um número positivo ou não existir nenhum lembrete nela.',
      EMPTY_ARGUMENT,
    ],
  },
  API_EDIT_REMINDER: {
    summary: 'Muda o horário e/ou o texto de um dos lembretes do usuário. Só o NotSoAI pode usar isto.',
    description: 'A posição é o campo `position` de {api.fetch.reminders}. Deixe `time` vazio para manter o horário atual, e omita `text` para manter o texto atual. Retorna o lembrete editado como JSON.',
    args: {
      position: 'O número da posição do lembrete.',
      time: 'Um novo horário em linguagem natural, ou vazio para manter o atual.',
      text: 'O novo texto do lembrete. Tudo depois do segundo `|` é usado.',
    },
    results: [
      'Move o lembrete 1 para amanhã às 9h e retorna o JSON dele.',
      'Muda o texto do lembrete 2 e retorna o JSON dele.',
    ],
    notes: [
      ONLY_NOTSOAI,
      API_LIMIT,
      'Gera um erro se a posição não for um número positivo, se não existir nenhum lembrete nela ou se o novo horário já tiver passado.',
    ],
  },
  API_FETCH_REMINDERS: {
    summary: 'Retorna os lembretes do usuário como JSON. Só o NotSoAI pode usar isto.',
    description: 'Retorna um objeto como `{"count": number, "reminders": [...]}` com os mesmos campos de lembrete de {api.create.reminder}. Só os lembretes do servidor atual são listados, a não ser que `global` seja passado.',
    args: {
      global: 'Passe `global` para listar os lembretes de todos os servidores.',
    },
    results: [
      'Quantos lembretes o usuário tem neste servidor.',
    ],
    notes: [
      ONLY_NOTSOAI,
      NETWORK,
    ],
  },
  API_INFO_INVITE: {
    summary: 'Busca um convite do Discord e retorna o servidor e o canal dele como JSON.',
    description: 'Retorna um objeto com `code`, `url`, `member_count`, `online_count`, `expires_at` (data ISO, `null` se nunca expirar), `inviter` (`id` e `username`), `channel` (`id`, `name`, `type`) e `guild` com `id`, `name`, `description`, `created_at`, `features`, `verification_level`, `vanity_url_code`, `icon_url`, `banner_url` e `splash_url` do servidor.',
    args: {
      code: 'O código do convite, ou um link de convite como `discord.gg/code` ou `discord.com/invite/code`.',
    },
    results: [
      'O nome do servidor do convite.',
      'Quantos membros esse servidor tem.',
    ],
    notes: [
      'Conta para o limite de requisições de rede. Buscar o mesmo código de novo numa execução reaproveita o resultado guardado.',
      'Gera um erro se o convite não existir ou tiver expirado.',
      'Qualquer coisa que não seja um código ou link de convite não retorna nada.',
    ],
  },
  API_SEARCH_DUCKDUCKGO_IMAGES: {
    summary: 'Pesquisa no DuckDuckGo Imagens e retorna os resultados brutos como JSON.',
    description: 'Retorna um objeto como `{"amount": number, "results": [...]}` em que cada resultado tem campos como `header`, `footer`, `url`, `image.url`, `image.width`, `image.height` e `thumbnail.url`. Combine com {traversejson} ou {set} para pegar o que precisar.',
    args: {
      query: QUERY_1024,
    },
    results: [
      'A URL do primeiro resultado de imagem.',
      'Quantos resultados foram encontrados.',
    ],
    notes: [
      CACHED_QUERY,
      SAFE_SEARCH,
      EMPTY_QUERY,
    ],
  },
  API_SEARCH_IMAGES: {
    summary: 'Pesquisa imagens com o seu provedor de pesquisa e retorna os resultados como JSON.',
    description: 'Retorna um objeto como `{"provider": "GOOGLE", "results": [...]}` com até 10 resultados, cada um com `image` (a URL da imagem), `title` e `url` (a página onde ela está). Os campos são os mesmos qualquer que seja o provedor.',
    args: {
      query: QUERY_1024,
    },
    results: [
      'A URL do primeiro resultado de imagem.',
      'Qual buscador foi usado, como `BING`.',
    ],
    notes: [
      'Usa o provedor de pesquisa de imagens da pessoa que executa a tag (`/settings set search-provider`), depois o do servidor e, por fim, o Google.',
      'Conta para o limite de requisições de rede. Repetir a mesma pesquisa numa execução (aqui ou em {search.images}) reaproveita o resultado guardado sem contar de novo.',
      SAFE_SEARCH,
      EMPTY_QUERY,
    ],
  },
  API_SEARCH_IMGUR: {
    summary: 'Pesquisa no Imgur e retorna os resultados brutos como JSON.',
    description: 'Retorna um objeto como `{"amount": number, "results": [...]}` em que cada resultado tem `id`, `url`, `thumbnail`, `type`, `views`, `likes`, `dislikes` e `points`.',
    args: {
      query: QUERY_1024,
    },
    results: [
      'A URL do primeiro resultado do Imgur.',
    ],
    notes: [
      CACHED_QUERY,
      EMPTY_QUERY,
    ],
  },
  API_SEARCH_REDDIT: {
    summary: 'Pesquisa posts do Reddit e retorna os resultados como JSON.',
    description: 'Retorna um objeto como `{"results": [...]}` em que cada post tem `title`, `author`, `subreddit`, `url` (o link do post), `score`, `num_comments`, `created_utc` (segundos unix), `selftext` (cortado em 1000 caracteres), `is_video` e `over_18`.',
    args: {
      query: QUERY_1024,
      subreddit: 'Opcional. Pesquisa só dentro deste subreddit, com ou sem `r/` (até 20 caracteres).',
    },
    results: [
      'O título do post principal.',
      'O link para o post principal em r/discordapp.',
    ],
    notes: [
      CACHED_QUERY,
      'Posts NSFW ficam de fora, a não ser que o canal permita conteúdo NSFW.',
      'Links de imagens e vídeos não são incluídos; use o link do post.',
      EMPTY_QUERY,
    ],
  },
  API_SEARCH_STEAM: {
    summary: 'Pesquisa usuários na comunidade da Steam e retorna os resultados como JSON.',
    description: 'Retorna um objeto como `{"count": number, "results": [...]}`, em que `count` é o número total de correspondências. Cada resultado tem `username`, `url`, `avatar_url`, `real_name`, `country`, `country_flag_url`, `custom_url`, `past_names`, `steam_id` e `steam_id_64`. Encontra contas, não jogos.',
    args: {
      query: 'O nome a pesquisar (só os primeiros 1024 caracteres são usados).',
    },
    results: [
      'O link do perfil da melhor correspondência.',
    ],
    notes: [
      CACHED_QUERY,
      EMPTY_QUERY,
    ],
  },
  API_SEARCH_URBAN: {
    summary: 'Busca as definições de uma palavra no Urban Dictionary e as retorna como JSON.',
    description: 'Retorna um array de definições, a principal primeiro. Cada uma tem `word`, `definition`, `example`, `author`, `thumbs_up`, `thumbs_down`, `written_on`, `permalink`, `defid` e `sound_urls`. Palavras entre `[brackets]` são links para outras definições.',
    args: {
      term: 'Opcional. A palavra a definir (só os primeiros 1024 caracteres são usados). Deixe vazio para definições aleatórias.',
    },
    results: [
      'A definição principal de "yeet".',
      'Uma palavra aleatória do Urban Dictionary.',
    ],
    notes: [
      'Conta para o limite de requisições de rede. Repetir o mesmo termo numa execução reaproveita o resultado guardado sem contar de novo; definições aleatórias nunca são guardadas.',
      'Retorna `[]` se nada for encontrado.',
    ],
  },
  API_SEARCH_WEB: {
    summary: 'Pesquisa na web com o seu provedor de pesquisa e retorna os resultados como JSON.',
    description: 'Retorna um objeto como `{"provider": "DUCK_DUCK_GO", "results": [...]}` com até 10 resultados, cada um com `title`, `url` e `description`. Os campos são os mesmos qualquer que seja o provedor.',
    args: {
      query: QUERY_1024,
    },
    results: [
      'A URL do primeiro resultado.',
      'O trecho do primeiro resultado.',
    ],
    notes: [
      'Usa o provedor de pesquisa web da pessoa que executa a tag (`/settings set search-provider`), depois o do servidor e, por fim, o DuckDuckGo.',
      'Conta para o limite de requisições de rede. Repetir a mesma pesquisa numa execução (aqui ou em {search.web}) reaproveita o resultado guardado sem contar de novo.',
      SAFE_SEARCH,
      EMPTY_QUERY,
    ],
  },
  API_SEARCH_WIKIHOW: {
    summary: 'Pesquisa artigos do wikiHow, ou pega um aleatório com os passos dele, como JSON.',
    description: 'Com uma pesquisa, retorna um array de artigos com `title`, `url`, `views`, `updated`, `thumbnail` e `badge`. Sem pesquisa, retorna um artigo aleatório com `title`, `description`, `url`, `rating` e `methods`, em que cada método tem um `title` e os `steps` dele (`text`, `image`, `url`).',
    args: {
      query: 'Opcional. A pesquisa (só os primeiros 1024 caracteres são usados). Deixe vazio para um artigo aleatório.',
    },
    results: [
      'O link para o artigo que melhor corresponde.',
      'O primeiro passo de um artigo aleatório.',
    ],
    notes: [
      'Conta para o limite de requisições de rede. Repetir a mesma pesquisa numa execução reaproveita o resultado guardado sem contar de novo; um artigo aleatório nunca é guardado.',
    ],
  },
  API_SEARCH_WOLFRAM_ALPHA: {
    summary: 'Faz uma pergunta ao WolframAlpha e retorna a resposta como JSON.',
    description: 'Retorna um objeto como `{"fields": [...], "images": [...], "url": string}`. Cada campo é uma das seções da resposta do WolframAlpha, com um `name` e um `value` de texto. A primeira costuma ser `Input interpretation` e a segunda `Result`. `images` são as seções renderizadas, e `url` leva à resposta completa.',
    args: {
      query: 'A pergunta, conta ou conversão (só os primeiros 1024 caracteres são usados).',
    },
    results: [
      'A distância convertida.',
      'A integral, como texto.',
    ],
    notes: [
      CACHED_QUERY,
      '`fields` e `images` ficam vazios se o WolframAlpha não entender a pesquisa.',
      EMPTY_QUERY,
    ],
  },
  API_UTILITIES_EXIF: {
    summary: 'Lê os metadados de uma imagem, áudio ou vídeo e os retorna como JSON.',
    description: 'Retorna um objeto como `{"metadata": {...}, "channels": {...}, "exif": [...]}`. `metadata` tem `mimetype`, `width`, `height`, `size` (bytes), `duration` e `frames`. `channels` tem as faixas `image`, `video` e `audio` com codecs, taxas de bits, quadros por segundo e taxas de amostragem (e também os `delay` dos quadros de uma imagem animada, o `loop` e o `comment` de um gif). `exif` são os campos EXIF da foto, cada um com `name`, `value` e `description`. Sem argumento, é usada a última mídia do chat.',
    args: {
      url: 'A URL de uma mídia, um usuário ou um emoji. O padrão é a última mídia do chat.',
    },
    results: [
      'O tipo da última mídia, como `image/png`.',
      'Os quadros por segundo do último vídeo.',
    ],
    notes: [
      'Conta duas vezes para o limite de requisições de rede, uma para encontrar a mídia e outra para lê-la. Ler a mesma mídia de novo numa execução reaproveita o resultado guardado.',
      'Durações e atrasos de quadro estão em milissegundos.',
      'Gera um erro se nenhuma mídia for encontrada.',
    ],
  },
  API_UTILITIES_LOCATIONS: {
    summary: 'Busca lugares que correspondem a uma pesquisa e retorna os resultados como JSON.',
    description: 'Retorna um objeto como `{"count": number, "results": [...]}`. Cada resultado tem `name`, `name_official`, `latitude`, `longitude`, `urls` e um objeto `address` (`full`, `city`, `state`, `country`, `country_code`, `zipcode` e mais).',
    args: {
      query: 'O lugar a buscar (só os primeiros 1024 caracteres são usados).',
    },
    results: [
      'O endereço completo da melhor correspondência.',
    ],
    notes: [
      CACHED_QUERY,
      EMPTY_QUERY,
    ],
  },
  API_UTILITIES_QR_CREATE: {
    summary: 'Anexa uma imagem com o QR code de um texto.',
    description: 'Adiciona o QR code como anexo ao resultado da tag.',
    args: {
      text: 'O texto ou a URL a codificar.',
    },
    results: [
      'Anexa um QR code que abre o site do NotSoBot.',
    ],
    notes: [
      'Conta para o limite de anexos e para o limite de requisições de rede.',
      EMPTY_ARGUMENT,
    ],
  },
  API_UTILITIES_QR_SCAN: {
    summary: 'Procura QR codes numa imagem e retorna os resultados como JSON.',
    description: 'Retorna um objeto como `{"results": [{"data": string, "type": string}]}`. Sem argumento, é usada a última imagem do chat.',
    args: {
      url: 'A URL de uma imagem, um usuário ou um emoji. O padrão é a última imagem do chat.',
    },
    results: [
      'O conteúdo do primeiro QR code encontrado.',
    ],
    notes: [
      NETWORK,
      'Gera um erro se nenhuma imagem for encontrada.',
    ],
  },
  API_UTILITIES_SCREENSHOT: {
    summary: 'Anexa uma captura de tela de um site.',
    description: 'Adiciona a captura como anexo ao resultado da tag. Sites NSFW são bloqueados, a não ser que o canal esteja marcado como NSFW.',
    args: {
      url: 'O site a capturar.',
    },
    results: [
      'Anexa uma captura do site do NotSoBot.',
    ],
    notes: [
      'Conta para o limite de anexos e para o limite de requisições de rede.',
      EMPTY_ARGUMENT,
    ],
  },
  API_UTILITIES_WEATHER: {
    summary: 'Pega o clima de um lugar e retorna os dados brutos como JSON.',
    description: 'Retorna um objeto com `location` (no mesmo formato de um resultado de {api.utilities.locations}), `timezone`, `thumbnail` e `weather`. `weather.current` inclui `temperature`, `feels_like`, `humidity`, `wind`, `conditions` e mais, e `weather.daily` traz a previsão, uma entrada por dia. O `rain` de cada dia é a quantidade de chuva prevista em milímetros (0 quando não há). Todos os horários, como `timestamp`, `sunrise` e `sunset`, são timestamps Unix em segundos.',
    args: {
      query: 'O lugar (só os primeiros 1024 caracteres são usados).',
      units: '`metric` ou `imperial` (sem diferenciar maiúsculas). Só é tratado como unidade se a última parte depois de um `|` for um destes; senão continua fazendo parte da pesquisa.',
    },
    results: [
      'A temperatura atual em Londres, em graus Celsius.',
      'Algo como "Clouds".',
    ],
    notes: [
      'Conta para o limite de requisições de rede. Repetir a mesma pesquisa com as mesmas unidades numa execução reaproveita o resultado guardado sem contar de novo.',
      EMPTY_ARGUMENT,
    ],
  },
  ARG: {
    summary: 'Retorna um único argumento passado para a tag.',
    description: 'Os argumentos são o texto depois do nome da tag, separado por espaços. Palavras entre aspas contam como um só argumento, então `"hello world"` é um único argumento (sem as aspas).',
    args: {
      index: 'Índice do argumento, começando em 0; o padrão é 0. Números negativos contam a partir do final (-1 é o último argumento).',
    },
    results: [
      'Com `.t mytag apple banana`, retorna "apple".',
      'Com `.t mytag apple banana`, retorna "banana".',
      'O último argumento.',
    ],
    notes: [
      OUT_OF_RANGE,
      NOT_A_NUMBER,
    ],
  },
  ARG_SAFE: {
    summary: 'Como {arg}, mas faz o escape de qualquer `|` no argumento para que ele possa ser passado com segurança para outras funções.',
    description: 'Todo `|` sem escape vira `\\|`, então se um usuário digitar uma barra vertical ela não vai dividir sem querer os argumentos da função para a qual você o passar.',
    args: {
      index: 'Índice do argumento, começando em 0; o padrão é 0. Números negativos contam a partir do final.',
    },
    results: [
      'Guarda o primeiro argumento numa variável, mesmo que contenha `|`.',
    ],
    notes: [
      OUT_OF_RANGE,
      NOT_A_NUMBER,
    ],
  },
  ARGS: {
    summary: 'Retorna todos os argumentos da tag, ou um intervalo deles.',
    description: 'Sem argumento, retorna o texto dos argumentos exatamente como foi digitado. Com um intervalo, pega um trecho da lista de argumentos já separados e o une com espaços simples.',
    args: {
      start: START_INDEX,
      end: END_INDEX,
    },
    results: [
      'Com `.t mytag one two three`, retorna "one two three".',
      'Tudo menos o primeiro argumento: "two three".',
      'Tudo menos o último argumento: "one two".',
    ],
    notes: [
      'Se `start` não for um número, a função fica como está no resultado.',
      'Ao usar um intervalo, os argumentos entre aspas perdem as aspas e os espaços são normalizados para espaços simples.',
    ],
  },
  ARGS_LEN: {
    summary: 'Retorna quantos argumentos foram passados para a tag.',
    results: [
      'Com `.t mytag one "two three"`, retorna "2".',
      'Avisa o usuário quando nenhum argumento é dado.',
    ],
    notes: [
      'Texto entre aspas conta como um só argumento.',
    ],
  },
  ARGS_SAFE: {
    summary: 'Como {args}, mas faz o escape de qualquer `|` para que o texto possa ser passado com segurança para outras funções.',
    args: {
      start: START_INDEX,
      end: END_INDEX,
    },
    results: [
      'Guarda todos os argumentos numa variável, mesmo que contenham `|`.',
      'Todos os argumentos depois do primeiro, com as barras verticais escapadas.',
    ],
    notes: [
      'Se `start` não for um número, a função fica como está no resultado.',
    ],
  },
  ATTACHMENT: {
    summary: 'Baixa uma URL e a anexa como arquivo à mensagem da tag.',
    description: 'Além de URLs normais, você pode passar uma menção ou ID de usuário (anexa o avatar dele) ou um emoji (personalizado ou unicode). URLs sem `http(s)://` recebem `https://`.\n\nArquivos anexados podem ser usados depois no {ai} e nas funções de código como `FILE_1`, `FILE_2` etc.',
    args: {
      url: 'A URL, o usuário ou o emoji a baixar.',
      filename: 'Nome a dar ao arquivo. O padrão é o nome do download.',
      description: 'Texto alternativo do arquivo. Tudo depois do segundo `|` é usado.',
    },
    results: [
      'Envia cat.png junto com a mensagem.',
      'Anexa seu avatar como me.png com texto alternativo.',
    ],
    notes: [
      'Conta para o limite de requisições de rede. Anexar a mesma URL de novo numa execução reaproveita o download sem contar de novo.',
      'Até 10 anexos por execução por padrão; passar disso gera um erro. Se os anexos estiverem desativados nesta execução, a função fica como está.',
      'Cada arquivo precisa caber no limite de tamanho de upload do servidor/canal; senão, gera um erro.',
      'Os downloads usam uma filtragem parecida com a do SafeSearch, a não ser que o canal permita conteúdo NSFW.',
      'Uma URL inválida gera um erro.',
    ],
  },
  ATTACHMENT_LAST: {
    summary: 'Retorna a URL da imagem mais recente.',
    description: 'Procura uma imagem primeiro na mensagem que executou a tag, depois na mensagem que ela responde e depois nas mensagens recentes do canal. Em comandos de barra, é usado o arquivo anexado.',
    results: [
      'Algo como "https://cdn.discordapp.com/attachments/.../image.png".',
      'Envia de novo a última imagem como again.png.',
    ],
    notes: [
      'Sempre conta para o limite de requisições de rede.',
      'Não retorna nada se nenhuma imagem for encontrada. Qualquer argumento é ignorado.',
    ],
  },
  ATTACHMENT_SPOILER: {
    summary: 'Igual ao {attach}, mas o arquivo é marcado como spoiler.',
    args: {
      url: 'A URL, o usuário ou o emoji a baixar.',
      filename: 'Nome a dar ao arquivo. O padrão é o nome do download.',
      description: 'Texto alternativo do arquivo.',
    },
    results: [
      'Envia a imagem escondida atrás de um spoiler.',
    ],
    notes: [
      'Tem todos os limites e o comportamento do {attach}.',
    ],
  },
  ATTACHMENT_TEXT: {
    summary: 'Anexa o texto dado como arquivo .txt.',
    description: 'O primeiro arquivo se chama `content.txt`; se já houver outros arquivos anexados, ele vira `content.2.txt`, `content.3.txt` etc. O argumento inteiro é usado como conteúdo do arquivo, incluindo qualquer `|`.',
    args: {
      text: 'O conteúdo do arquivo de texto.',
    },
    results: [
      'Envia os argumentos como content.txt.',
    ],
    notes: [
      'Não usa nenhuma requisição de rede.',
      ATTACHMENT_LIMIT,
      'O texto precisa caber no limite de tamanho de upload; senão, gera um erro.',
    ],
  },
  ATTACHMENT_VOICE: {
    summary: 'Baixa áudio ou vídeo de uma URL e o anexa como mensagem de voz do Discord.',
    description: 'O áudio é extraído e convertido para OGG com uma forma de onda, então aparece como uma mensagem de voz.',
    args: {
      url: 'URL do áudio ou vídeo a usar.',
      filename: 'Nome a dar ao arquivo. Tudo depois do primeiro `|` é usado.',
    },
    results: [
      'Envia song.mp3 como mensagem de voz.',
    ],
    notes: [
      'Sempre conta para o limite de requisições de rede (não fica em cache).',
      ATTACHMENT_LIMIT,
      'O resultado precisa caber no limite de tamanho de upload; senão, gera um erro.',
    ],
  },
  AVATAR: {
    summary: 'Retorna a URL do avatar de um usuário (1024px).',
    args: {
      user: USER_ARG,
    },
    results: [
      'A URL do seu avatar.',
      'A URL do avatar desse usuário.',
      'Anexa o avatar do usuário indicado no primeiro argumento.',
    ],
    notes: [
      'Buscar um usuário conta para o limite de requisições de rede; usar sem argumento não.',
      'Não retorna nada se o usuário não for encontrado.',
    ],
  },
  CHANNEL: {
    summary: 'Retorna o nome de um canal.',
    args: {
      channel: CHANNEL_ARG,
    },
    results: [
      'Algo como "general".',
      'O nome desse canal.',
    ],
    notes: [
      'Em DMs (sem argumento), retorna "Direct Message".',
      'Só são encontrados canais do servidor atual. Os nomes são comparados sem diferenciar maiúsculas (primeiro os que começam com o texto, depois os que o contêm).',
      NO_CHANNEL,
    ],
  },
  CHANNEL_ID: {
    summary: 'Retorna o ID de um canal.',
    args: {
      channel: CHANNEL_ARG,
    },
    results: [
      'O ID do canal atual, ex.: "560595518129045504".',
      'O ID do primeiro canal que corresponde a "general".',
    ],
    notes: [
      CHANNEL_MATCH,
      NO_CHANNEL,
    ],
  },
  CHANNEL_MENTION: {
    summary: 'Retorna uma menção clicável de um canal.',
    args: {
      channel: CHANNEL_ARG,
    },
    results: [
      'Uma menção do canal atual, como <#560595518129045504>.',
      'Menciona o canal de regras.',
    ],
    notes: [
      CHANNEL_MATCH,
      NO_CHANNEL,
    ],
  },
  CHANNEL_RANDOM: {
    summary: 'Retorna o nome de um canal aleatório do servidor.',
    results: [
      'Algo como "Go hang out in #memes!".',
    ],
    notes: [
      'Escolhe entre todos os canais que o bot conhece no servidor, o que pode incluir categorias e canais de voz.',
      'Em DMs, retorna "Direct Message".',
    ],
  },
  COMPONENT_JSON: {
    summary: 'Adiciona um componente de mensagem (botões, menus de seleção, contêineres etc.) a partir de JSON.',
    description: 'O argumento é um objeto de componente do Discord em JSON, que pode vir envolto num bloco de código. O TagScript de dentro é interpretado primeiro, e depois o JSON é lido e adicionado à mensagem. Os tipos suportados incluem linhas de ação, botões, menus de seleção, contêineres, seções, textos, miniaturas, galerias de mídia, arquivos e separadores.\n\nBotões precisam de um `label` ou de uma `url` (uma URL o transforma num botão de link), e podem ter uma string `run` com TagScript a executar quando são apertados.',
    args: {
      json: 'Um único objeto de componente em JSON.',
    },
    results: [
      'Adiciona uma linha de ação com um botão.',
      'Adiciona um botão de link.',
    ],
    notes: [
      'JSON inválido, ou JSON que não é um objeto, gera um erro.',
      '{newline} dentro de uma string JSON vira uma quebra de linha de verdade.',
      'Até 5 linhas de ação ou 25 botões soltos por mensagem, e não dá para misturar linhas de ação com botões soltos.',
      'Linhas de ação levam de 1 a 5 componentes; contêineres, de 1 a 40.',
    ],
  },
  COMPONENTS_ON_TIMEOUT: {
    summary: 'Define um TagScript que roda quando os componentes da mensagem expiram.',
    description: 'O argumento é guardado como está (não é interpretado na hora) e é executado quando os componentes expiram.',
    args: {
      tagscript: 'O TagScript a executar quando expirar.',
    },
    results: [
      'Mostra esse texto quando os botões param de funcionar.',
    ],
    notes: [
      'Só um script de expiração é guardado; usar isto de novo substitui o anterior.',
      'Um argumento vazio deixa a função como está no resultado.',
    ],
  },
};
