// tagDocs/functions/part4.ts in Brazilian Portuguese, keyed by function id

import type { TagDocsTranslation } from '../localize';

import { ONLY_NOTSOAI } from './common';


const MARKUP_MENTION = 'Os sinais `@` recebem escape com um caractere invisível, para que menções, `@everyone` e `@here` não notifiquem ninguém.';
const MARKUP_SINGLE_LINE = 'As quebras de linha do texto são substituídas por espaços, então a formatação cobre uma linha só.';
const MARKUP_LIMIT = 'O texto é cortado em cerca de 2000 bytes.';
const HEADER_LINE = 'Títulos só aparecem no começo de uma linha, então coloque uma quebra de linha antes se precisar.';
const LIST_ITEM = 'Cada item fica numa linha (quebras de linha viram espaços), e `-` ou `*` dentro de um item recebem escape.';

const MEDIASCRIPT_FILES = 'Use `FILE_1`, `FILE_2`, ... no código para se referir a arquivos que a tag já anexou (na ordem em que foram anexados). Os arquivos referenciados são passados ao script e removidos dos anexos da tag; escreva `FILE_1_COPY` para manter o original anexado também. Referir-se a um arquivo que não existe é um erro.';
const MEDIASCRIPT_ARGUMENTS = 'Se o script retornar variáveis, cada uma é definida como variável da tag (como se você usasse `{set}`), então dá para lê-las depois com `{get}`.';
const MEDIASCRIPT_SAFE = 'O modo seguro (filtro NSFW) segue o canal, e o modelo de geração de imagens segue a configuração `ML_IMAGINE_MODEL` do `{settings}`.';
const EMPTY_CODE = 'Com o código vazio, a função fica no resultado como texto normal.';

const SEARCH_PAGE = 'Qual resultado usar, começando em 0, ou `random`. Se omitido (ou se a primeira parte não for um número nem `random`), um resultado aleatório é escolhido e o argumento inteiro é a pesquisa.';
const SEARCH_QUERY = 'O que pesquisar. Cortado em 1024 caracteres.';
const SEARCH_CACHE = 'Os resultados ficam em cache por pesquisa durante o resto da execução, então repetir a mesma pesquisa não conta como outra requisição de rede.';
const ONE_REQUEST = 'Conta como uma requisição de rede.';
const SAFE_SEARCH = 'A pesquisa segura fica ativada, a não ser que o canal permita conteúdo NSFW.';
const NO_RESULTS_INDEX = 'Não retorna nada se não houver resultados, se o índice passar do fim dos resultados ou se a pesquisa estiver vazia.';
const NO_RESULTS = 'Não retorna nada se não houver resultados ou se a pesquisa estiver vazia.';

const PERMANENT_USER = 'Isto muda de forma permanente as configurações do NotSoBot da pessoa que pediu ao NotSoAI, não só nesta execução.';
const READ_OR_SET = 'Omita para ler o atual.';
const NO_PIPE_OUTPUT = 'Sem um `|`, a função fica no resultado como texto normal.';


export const FUNCTIONS_PORTUGUESE_4: TagDocsTranslation['functions'] = {
  MEDIASCRIPT_MAYBE_URL: {
    summary: 'Executa código de MediaScript e anexa o resultado, ou retorna uma URL para ele quando a API faz o upload.',
    description: 'Funciona como `{mediascript}`, mas o arquivo de saída não fica preso ao limite rígido de upload do Discord. Se a API devolver uma cópia enviada do resultado, a URL dela é adicionada ao texto; senão, o arquivo resultante é anexado à resposta.',
    args: {
      code: 'O código de MediaScript a executar.',
    },
    results: [
      'A imagem editada, anexada ou como link',
    ],
    notes: [
      MEDIASCRIPT_FILES,
      MEDIASCRIPT_ARGUMENTS,
      ONE_REQUEST,
      MEDIASCRIPT_SAFE,
      'Um resultado anexado maior que o tamanho máximo de upload é um erro. Um erro do script aparece como erro.',
      EMPTY_CODE,
    ],
  },
  MEDIASCRIPT_URL: {
    summary: 'Executa código de MediaScript, faz upload do resultado e retorna a URL dele.',
    description: 'Funciona como `{mediascript}`, mas em vez de anexar o resultado à resposta, o resultado é enviado e a URL do CDN dele é adicionada ao texto. Útil para passar um resultado para outras funções ou embeds.',
    args: {
      code: 'O código de MediaScript a executar.',
    },
    results: [
      'Uma URL para a imagem editada',
    ],
    notes: [
      'Os resultados enviados expiram em 7 dias.',
      MEDIASCRIPT_FILES,
      MEDIASCRIPT_ARGUMENTS,
      ONE_REQUEST,
      MEDIASCRIPT_SAFE,
      EMPTY_CODE,
    ],
  },
  NSFW: {
    summary: 'Para a tag com um erro, a não ser que ela esteja sendo usada num lugar onde conteúdo NSFW é permitido.',
    description: 'Coloque isto no começo de uma tag que só deve ser usada em canais NSFW. Não retorna nada quando conteúdo NSFW é permitido.\n\nConteúdo NSFW é permitido em DMs com o bot, em canais com restrição de idade e em servidores cujo filtro de conteúdo explícito não se aplica ao usuário. Não é permitido quando o bot é usado como app instalado pelo usuário fora de um servidor em que ele esteja.',
    results: [
      'Gera um erro num canal normal, e mostra o texto num canal NSFW',
    ],
  },
  NSFW_FILTER: {
    summary: 'Retorna o texto só se uma verificação de segurança não o marcar como inseguro.',
    description: 'O texto é enviado para uma verificação de moderação. Se passar, o texto (cortado em 2000 caracteres) é retornado; se for marcado, nada é retornado.',
    args: {
      text: 'O texto a verificar.',
    },
    results: [
      'Os argumentos, ou nada se eles forem marcados',
    ],
    notes: [
      'Conta como uma requisição de rede e uma requisição de segurança (2 requisições de segurança são permitidas por execução por padrão), mesmo com texto vazio.',
      'A verificação é mais rígida fora de canais NSFW.',
      'Se o serviço de segurança não estiver disponível, o texto é tratado como inseguro e nada é retornado.',
      'O texto é cortado em 2000 caracteres.',
    ],
  },
  PAGE_JSON: {
    summary: 'Adiciona uma ou mais páginas à resposta, mostradas com botões de página.',
    description: 'Recebe um objeto JSON que descreve uma página, ou um array deles. Cada página pode ter:\n\n`content`: uma string de texto.\n\n`embed`: um único objeto de embed (precisa ter algum conteúdo, uma imagem, uma miniatura ou um vídeo).\n\n`files`: um array de strings `attachment://filename`, apontando para arquivos que a tag anexou.\n\n`components`: um array de componentes de layout do Components V2 (linhas de ação, contêineres, arquivos, galerias de mídia, seções, separadores, textos).\n\nToda página precisa de pelo menos um desses.',
    args: {
      json: 'Um objeto de página, ou um array de objetos de página.',
    },
    results: [
      'Duas páginas que você pode folhear',
      'Adiciona uma página com um embed',
      'Adiciona uma página com um contêiner com um pouco de texto',
    ],
    notes: [
      'JSON inválido, uma página que não é um objeto, um embed vazio ou uma página sem nada utilizável é um erro.',
      '{newline} dentro de uma string JSON vira uma quebra de linha de verdade.',
      'Os componentes das páginas não podem ser interativos: os botões precisam ser botões de link e menus de seleção não são permitidos. Os botões precisam ficar dentro de linhas de ação ou seções.',
      'Cada página pode ter no máximo 33 componentes (contando os aninhados).',
      'Uma tag pode ter no máximo 1000 páginas.',
    ],
  },
  PREFIX: {
    summary: 'Retorna o prefixo de comando que foi usado para executar a tag.',
    description: 'Em comandos de barra e outras interações, é sempre `/`.',
    results: [
      'Try .help (se a tag foi executada com o prefixo `.`)',
    ],
  },
  REPLY_CONTENT: {
    summary: 'Retorna o conteúdo da mensagem que a mensagem da tag está respondendo.',
    results: [
      'They said: (o texto da mensagem respondida)',
    ],
    notes: [
      'Só funciona quando a tag é executada a partir de uma mensagem normal que responde outra mensagem. Senão (incluindo comandos de barra), nada é retornado.',
    ],
  },
  REPLY_USER_ID: {
    summary: 'Retorna o ID de usuário do autor da mensagem respondida.',
    results: [
      '',
    ],
    notes: [
      'Só funciona quando a tag é executada a partir de uma mensagem normal que responde outra mensagem. Senão (incluindo comandos de barra), nada é retornado.',
    ],
  },
  REQUEST: {
    summary: 'Faz uma requisição HTTP e retorna a resposta como JSON.',
    description: 'Recebe um objeto JSON com as opções da requisição:\n\n`method` (obrigatório): `GET`, `POST`, `PUT`, `PATCH`, `DELETE` ou `HEAD` (sem diferenciar maiúsculas).\n\n`url` (obrigatório): a URL a requisitar.\n\n`headers`: um objeto de nomes de cabeçalho e valores.\n\n`query`: um objeto de parâmetros da query string.\n\n`json`: um corpo JSON (objeto ou array). Só é usado com `POST`, `PUT` e `PATCH`.\n\n`data`: um corpo de formulário, como um objeto plano cujos valores são strings, números ou booleanos. Só é usado com `POST`, `PUT` e `PATCH`, e não pode ser combinado com `json`.\n\nO resultado é uma string JSON como `{"cookies": {...}, "data": ..., "data_is_bytes": false, "headers": {...}, "status": 200, "url": "..."}`, em que `data` é o corpo da resposta: o JSON já interpretado se o corpo for JSON, senão o texto dele. `data_is_bytes` por enquanto é sempre `false`.',
    args: {
      json: 'O objeto de opções da requisição descrito acima.',
    },
    results: [
      '',
      'Envia os argumentos como corpo JSON e retorna a resposta',
    ],
    notes: [
      'Conta para o limite de requisições de rede.',
      'Use `{jsonify}` para colocar texto com segurança dentro das opções JSON.',
      'Opções inválidas geram um erro específico, ex.: "Request method is invalid.", "Request url is invalid." ou "Request cannot have both json and data.". Opções que não são JSON válido também são um erro.',
      'Se a requisição falhar, a tag gera um erro, incluindo os detalhes que o serviço de requisições der.',
      'A URL é interpretada como outras URLs de mídia, então uma menção ou ID de usuário vira a URL do avatar dele e um emoji personalizado vira a URL da imagem dele.',
    ],
  },
  RNG_CHOOSE: {
    summary: 'Escolhe aleatoriamente uma das opções dadas.',
    description: 'Só a opção escolhida é avaliada, então as funções das outras opções nunca rodam. Isso torna seguro colocar coisas como `{set}` ou chamadas de rede nas opções.',
    args: {
      choices: 'As opções a escolher, separadas por `|`. Sem `|`, o único valor é retornado.',
    },
    results: [
      'heads ou tails',
      'Uma das duas mensagens',
    ],
    notes: [
      'Sem argumento, a função fica no resultado como texto normal.',
    ],
  },
  RNG_RANGE: {
    summary: 'Retorna um número inteiro aleatório num intervalo, incluindo as duas pontas.',
    description: 'Com um número, escolhe entre 0 e esse número. Com dois, escolhe entre eles; a ordem não importa. Números muito grandes são suportados.',
    args: {
      min: 'O menor número. O padrão é 0.',
      max: 'O maior número.',
    },
    results: [
      'Um número de 0 a 10, ex.: 7',
      'Uma rolagem de dado, ex.: 4',
      'Um número de -5 a 5',
    ],
    notes: [
      'Os decimais são cortados (`{range:1.9|5.5}` é o mesmo que `{range:1|5}`).',
      'Se algum dos valores não for um número, ou não houver argumento, a função fica no resultado como texto normal.',
    ],
  },
  RNG_UUID: {
    summary: 'Gera um UUID aleatório.',
    args: {
      version: '`4` (o padrão) para um UUID totalmente aleatório, ou `7` para um ordenado por tempo.',
    },
    results: [
      '',
      'Um UUID v7, ex.: 0192a3e4-5b6c-7d8e-9f01-23456789abcd',
    ],
    notes: [
      'Qualquer outra versão fica no resultado como texto normal.',
    ],
  },
  SEARCH_DUCKDUCKGO_IMAGES: {
    summary: 'Pesquisa no DuckDuckGo Imagens e retorna a URL de uma imagem.',
    args: {
      index: SEARCH_PAGE,
      query: SEARCH_QUERY,
    },
    results: [
      'A URL de uma imagem de gato aleatória entre os resultados',
      'A URL do primeiro resultado',
    ],
    notes: [
      ONE_REQUEST,
      SEARCH_CACHE,
      SAFE_SEARCH,
      NO_RESULTS_INDEX,
    ],
  },
  SEARCH_GOOGLE_IMAGES: {
    summary: 'Pesquisa no Google Imagens e retorna a URL de uma imagem.',
    args: {
      index: SEARCH_PAGE,
      query: SEARCH_QUERY,
    },
    results: [
      'A URL de uma imagem de cachorro aleatória entre os resultados',
      'A URL do terceiro resultado',
      'Uma imagem aleatória do que foi passado para a tag',
    ],
    notes: [
      ONE_REQUEST,
      SEARCH_CACHE,
      SAFE_SEARCH,
      NO_RESULTS_INDEX,
    ],
  },
  SEARCH_IMAGES: {
    summary: 'Pesquisa imagens com o seu provedor de pesquisa e retorna a URL de uma imagem.',
    args: {
      index: SEARCH_PAGE,
      query: SEARCH_QUERY,
    },
    results: [
      'A URL de uma imagem de cachorro aleatória entre os resultados',
      'A URL do primeiro resultado',
    ],
    notes: [
      'Usa o provedor de pesquisa de imagens da pessoa que executa a tag (`/settings set search-provider`), depois o do servidor e, por fim, o Google.',
      ONE_REQUEST,
      SEARCH_CACHE,
      SAFE_SEARCH,
      NO_RESULTS,
    ],
  },
  SEARCH_WEB: {
    summary: 'Pesquisa na web com o seu provedor de pesquisa e retorna a URL de um resultado.',
    args: {
      index: SEARCH_PAGE,
      query: SEARCH_QUERY,
    },
    results: [
      'A URL do primeiro resultado',
      'Um resultado aleatório para o que foi passado para a tag',
    ],
    notes: [
      'Usa o provedor de pesquisa web da pessoa que executa a tag (`/settings set search-provider`), depois o do servidor e, por fim, o DuckDuckGo.',
      ONE_REQUEST,
      SEARCH_CACHE,
      SAFE_SEARCH,
      NO_RESULTS,
    ],
  },
  SEARCH_YOUTUBE: {
    summary: 'Pesquisa no YouTube e retorna a URL do primeiro vídeo.',
    description: 'Canais e playlists nos resultados são pulados; é usado o primeiro resultado que for um vídeo.',
    args: {
      query: SEARCH_QUERY,
    },
    results: [
      '',
    ],
    notes: [
      ONE_REQUEST,
      SEARCH_CACHE,
      'Não retorna nada se nenhum vídeo for encontrado ou se a pesquisa estiver vazia.',
    ],
  },
  SETTINGS: {
    summary: 'Muda como a tag se comporta durante o resto da execução.',
    description: 'Recebe exatamente duas partes: o nome da configuração (sem diferenciar maiúsculas) e o valor dela. Espaços em volta de qualquer uma das partes são ignorados, e um valor vazio limpa a configuração. As configurações só duram a execução atual da tag.\n\n`AI_MODEL`: o modelo de IA usado pelas funções de geração de texto (um modelo inválido gera um erro e lista os válidos).\n\n`AI_PERSONALITY`: um prompt de personalidade usado pelas funções de geração de texto, no lugar do do usuário ou do servidor.\n\n`ALLOW_COMPONENT_EXECUTIONS_FROM_EVERYONE`: `true` deixa qualquer pessoa usar os botões e menus da tag, não só quem a executou. `false` desliga de novo.\n\n`DISPLAY_MEDIA_AS_NATIVE`: por padrão, uma resposta que é só um arquivo (ou só um link do nsb.gg), sem texto, embeds nem botões, aparece como a resposta de um comando de mídia. `true` envia como um anexo ou link normal do Discord. `false` desliga de novo.\n\n`MEDIA_IV_FALLBACK`: quando uma função de imagem (como `{iv}` ou `{image}`) não encontra mídia a partir do argumento, ela executa esta função com o mesmo argumento e usa a URL que ela devolver. Um de `MEDIA_IMAGE_IMAGINE` (ou `imagine`/`imagineurl`, que gera uma imagem e usa a URL temporária dela), `SEARCH_DUCK_DUCK_GO_IMAGES` (ou `SEARCH_DUCKDUCKGO_IMAGES` ou um nome de `search.duckduckgo.images`) ou `SEARCH_GOOGLE_IMAGES` (ou um nome de `search.google.images`).\n\n`MEDIA_AV_FALLBACK`: o mesmo, para funções de áudio/vídeo como `{transcribe}`. Só `SEARCH_YOUTUBE` (ou um nome de `search.youtube`) é permitido.\n\n`ML_IMAGINE_DO_NOT_ERROR`: um valor verdadeiro/falso. Quando verdadeiro, a geração de imagens é instruída a não dar erro.\n\n`ML_IMAGINE_MODEL`: o modelo de geração de imagens, por enquanto só `FLUX_KLEIN` (sem diferenciar maiúsculas).',
    args: {
      SETTING: 'O nome da configuração, da lista acima.',
      value: 'O novo valor da configuração.',
    },
    results: [
      'Usa os argumentos como mídia, ou pesquisa por eles no Google Imagens se não forem mídia',
      'Gera a imagem com o Flux Klein',
      'Deixa todo mundo apertar os botões da tag',
      'Edita a última imagem ou, se não houver nenhuma, uma recém-gerada',
      'Limpa a configuração de modelo de novo',
    ],
    notes: [
      'Não retorna nada quando funciona.',
      'Se não houver exatamente duas partes, ou o nome da configuração for desconhecido, a função fica no resultado como texto normal.',
      'Um valor não reconhecido para `MEDIA_IV_FALLBACK` ou `MEDIA_AV_FALLBACK` é ignorado em silêncio. Nas configurações de verdadeiro/falso, `true`, `yes`, `y` e `+` as ativam; qualquer outra coisa (incluindo `false`) as limpa.',
    ],
  },
  SETTINGS_SET_SERVER: {
    summary: 'Lê ou muda as configurações deste servidor, como o fuso horário ou o provedor de pesquisa. Só o NotSoAI pode usar isto, para membros com Gerenciar servidor.',
    description: 'Sem argumentos, retorna todas as configurações do servidor como um objeto JSON. Só com uma configuração, retorna o valor atual dela. Com um valor, salva e retorna `true`, ou `false` se ela já tinha esse valor. Use `clear` para redefini-la, para que cada pessoa volte à própria configuração e, depois, ao padrão.\n\nAs configurações são `AI_MODEL`, `AI_PERSONALITY`, `IMAGINE_MODEL`, `LOCALE`, `RESPONSE_DISPLAY` (`DEFAULT`/`NO_EMBED`/`LEGACY`), `SEARCH_PROVIDER_IMAGES` e `SEARCH_PROVIDER_WEB` (`GOOGLE`/`DUCK_DUCK_GO`/`BING`/`YANDEX`) e `TIMEZONE`.',
    args: {
      setting: 'Qual configuração, como `TIMEZONE` ou `search provider web`. Omita para retornar todas as configurações.',
      value: 'O novo valor, ou `clear` para redefinir. ' + READ_OR_SET,
    },
    results: [
      '',
      '',
    ],
    notes: [
      'Só o NotSoAI pode usar isto, e só na própria resposta: na tag de um usuário, ou num botão que o NotSoAI criou, a função fica como texto normal. Também fica como texto normal quando o prompt do NotSoAI tinha texto de outra pessoa (uma mensagem de outra pessoa que ele respondeu, um link, um arquivo que não foi enviado pelo próprio usuário ou a opção `url`, também antes na conversa), e em código que só existe durante a execução, como uma resposta do `{ai}` ou o que `{eval}` e `{evalsilent}` executam.',
      'A pessoa que pediu ao NotSoAI precisa da permissão Gerenciar servidor, mesmo que seja só para ler as configurações. Senão, gera um erro.',
      'Só funciona num servidor.',
      'Isto muda de forma permanente as configurações do NotSoBot do servidor para todo mundo, não só nesta execução.',
    ],
  },
  SETTINGS_SET_SERVER_AI_PERSONALITY: {
    summary: 'Lê, define ou limpa a personalidade do NotSoAI deste servidor. Só o NotSoAI pode usar isto, para membros com Gerenciar servidor.',
    description: 'O mesmo que {settings.set.server} com `AI_PERSONALITY`, mas o argumento inteiro é a personalidade, então ela pode conter `|`.',
    args: {
      prompt: 'O prompt de personalidade, ou `clear` para limpá-lo. ' + READ_OR_SET,
    },
    results: [
      '',
    ],
    notes: [
      'Só o NotSoAI pode usar isto, e só na própria resposta: na tag de um usuário, ou num botão que o NotSoAI criou, a função fica como texto normal. A pessoa que pediu precisa da permissão Gerenciar servidor. Também fica como texto normal quando o prompt do NotSoAI tinha texto de outra pessoa (uma mensagem de outra pessoa que ele respondeu, um link, um arquivo que não foi enviado pelo próprio usuário ou a opção `url`, também antes na conversa), e em código que só existe durante a execução, como uma resposta do `{ai}` ou o que `{eval}` e `{evalsilent}` executam.',
      'O NotSoBot filtra a personalidade antes de salvá-la.',
    ],
  },
  SETTINGS_SET_USER: {
    summary: 'Lê ou muda as outras configurações da pessoa que está usando a tag, como as unidades ou o modelo de IA. Só o NotSoAI pode usar isto.',
    description: 'Sem argumentos, retorna todas as configurações (mais `AI_PERSONALITY`, `LOCALE` e `TIMEZONE`) como um objeto JSON. Só com uma configuração, retorna o valor atual dela. Com um valor, salva e retorna `true`, ou `false` se ela já tinha esse valor. Use `clear` para voltá-la ao padrão.\n\nAs configurações são `AI_MEMORY` (`on`/`off`), `AI_MODEL`, `APP_COMMAND_RESPONSE_TYPE` (`AUTOMATIC`/`EPHEMERAL`), `DOWNLOAD_QUALITY` (de `1440p` a `144p`), `FALLBACKS_MEDIA_IMAGE` (`SEARCH_GOOGLE_IMAGES`/`SEARCH_DUCK_DUCK_GO_IMAGES`/`IMAGINE`), `FILE_UPLOAD_THRESHOLD` (`EXCEEDS_DISCORD_LIMIT`/`ALWAYS`/`NEVER`), `FILE_UPLOAD_TYPE` (`AUTOMATIC`/`TEMPORARY`), `FILE_VANITY`, `IMAGINE_MODEL`, `RESPONSE_DISPLAY` (`DEFAULT`/`NO_EMBED`/`LEGACY`), `SEARCH_PROVIDER_IMAGES` e `SEARCH_PROVIDER_WEB` (`GOOGLE`/`DUCK_DUCK_GO`/`BING`/`YANDEX`), `TTS_VOICE` (uma voz embutida como `TIKTOK_EN_US_FEMALE_01`, ou uma das suas vozes clonadas pelo nome) e `UNITS` (`IMPERIAL`/`METRIC`).',
    args: {
      setting: 'Qual configuração, como `UNITS` ou `ai model`. Omita para retornar todas as configurações.',
      value: 'O novo valor, ou `clear` para redefinir. ' + READ_OR_SET,
    },
    results: [
      '',
      '',
      '',
    ],
    notes: [
      ONLY_NOTSOAI,
      PERMANENT_USER,
      'Idioma, fuso horário e personalidade de IA têm funções próprias: {settings.set.user.locale}, {settings.set.user.timezone} e {settings.set.user.ai.personality}.',
      'Gera um erro se a configuração ou o valor não forem reconhecidos, ou se a configuração exigir premium.',
    ],
  },
  SETTINGS_SET_USER_AI_PERSONALITY: {
    summary: 'Lê ou muda a personalidade de IA salva nas configurações da pessoa que está usando a tag. Só o NotSoAI pode usar isto.',
    description: 'Sem argumento, retorna a personalidade de IA atual do usuário (ou nada se ele não tiver). Com um prompt, salva como a personalidade dele e retorna `true`, ou `false` se ela já tinha esse valor. Use `clear` para removê-la.',
    args: {
      prompt: 'O novo prompt de personalidade, ou `clear` para removê-lo. ' + READ_OR_SET,
    },
    results: [
      'O prompt de personalidade atual',
      '',
      'true (ou false se nenhuma estava definida)',
    ],
    notes: [
      'Só o NotSoAI pode usar isto. Na tag de um usuário (ou numa tag que o NotSoAI chama com {tag}) a função fica no resultado como texto normal. Também fica como texto normal quando é executada a partir de um botão ou menu que o NotSoAI criou, já que outra pessoa poderia apertá-lo. Também fica como texto normal quando o prompt do NotSoAI tinha texto de outra pessoa (uma mensagem de outra pessoa que ele respondeu, um link, um arquivo que não foi enviado pelo próprio usuário ou a opção `url`, também antes na conversa), e em código que só existe durante a execução, como uma resposta do `{ai}` ou o que `{eval}` e `{evalsilent}` executam.',
      PERMANENT_USER,
    ],
  },
  SETTINGS_SET_USER_LOCALE: {
    summary: 'Lê ou muda o idioma salvo nas configurações da pessoa que está usando a tag. Só o NotSoAI pode usar isto.',
    description: 'Sem argumento, retorna o idioma atual do usuário (ou nada se ele não tiver). Com um nome ou código de idioma, salva e retorna `true`, ou `false` se ele já tinha esse valor. Use `clear` para removê-lo.',
    args: {
      locale: 'Um nome ou código de idioma como `spanish` ou `es`, ou `clear` para removê-lo. ' + READ_OR_SET,
    },
    results: [
      '',
    ],
    notes: [
      ONLY_NOTSOAI,
      PERMANENT_USER,
      'Gera um erro se o idioma não for reconhecido.',
    ],
  },
  SETTINGS_SET_USER_TIMEZONE: {
    summary: 'Lê ou muda o fuso horário salvo nas configurações da pessoa que está usando a tag. Só o NotSoAI pode usar isto.',
    description: 'O fuso horário é usado ao ler horários de lembretes como "at 4pm". Sem argumento, retorna o fuso horário atual do usuário (ou nada se ele não tiver). Com um fuso horário, salva e retorna `true`, ou `false` se ele já tinha esse valor. Use `clear` para removê-lo.',
    args: {
      timezone: 'Um nome IANA como `America/New_York`, uma abreviação como `EST` ou o nome de uma cidade/região, ou `clear` para removê-lo. ' + READ_OR_SET,
    },
    results: [
      '',
      '',
    ],
    notes: [
      ONLY_NOTSOAI,
      PERMANENT_USER,
      'Gera um erro se o fuso horário não for reconhecido.',
    ],
  },
  STRING_INDEX_OF: {
    summary: 'Retorna a posição da primeira ocorrência de um texto dentro de outro.',
    description: 'As posições começam em 0. Retorna `-1` se o texto não for encontrado. A busca diferencia maiúsculas.',
    args: {
      search: 'O texto a procurar.',
      text: 'O texto onde procurar. Tudo depois do primeiro `|` faz parte dele.',
    },
    results: [
      '',
      '',
    ],
    notes: [
      'Valores simples (sem funções dentro) têm os espaços das pontas removidos.',
      NO_PIPE_OUTPUT,
    ],
  },
  STRING_JSONIFY: {
    summary: 'Transforma texto numa string JSON, com aspas e escape.',
    description: 'Envolve o texto em aspas duplas e faz o escape de aspas, barras invertidas e quebras de linha, para que ele possa ser colocado em JSON com segurança (por exemplo no `{request}` ou no `{pagejson}`).',
    args: {
      text: 'O texto a converter.',
    },
    results: [
      '',
      'Uma página com os argumentos, com escape seguro',
    ],
  },
  STRING_LENGTH: {
    summary: 'Retorna o número de caracteres do texto.',
    args: {
      text: 'O texto a medir.',
    },
    results: [
      '',
      'O tamanho dos argumentos',
    ],
    notes: [
      'Os espaços das pontas são removidos antes de medir. Alguns emojis contam como 2 caracteres.',
    ],
  },
  STRING_LOWER: {
    summary: 'Converte o texto para minúsculas.',
    args: {
      text: 'O texto a converter.',
    },
    results: [
      '',
    ],
  },
  STRING_MARKUP_BOLD: {
    summary: 'Deixa o texto em **negrito**.',
    description: 'Envolve o texto em `**`. Qualquer `**` que já esteja no texto recebe escape.',
    args: {
      text: 'O texto a formatar.',
    },
    results: [
      '',
    ],
    notes: [MARKUP_MENTION, MARKUP_LIMIT],
  },
  STRING_MARKUP_CODEBLOCK: {
    summary: 'Coloca o texto num bloco de código.',
    description: 'Envolve o texto em três crases, cada grupo na própria linha. Três crases dentro do texto são quebradas para não fecharem o bloco antes da hora.',
    args: {
      text: 'O texto a colocar no bloco de código.',
    },
    results: [
      '',
    ],
    notes: [
      'Não dá para escolher uma linguagem para o realce de sintaxe.',
      'Ao contrário da maioria das funções de formatação, as menções não recebem escape. ' + MARKUP_LIMIT,
    ],
  },
  STRING_MARKUP_CODESTRING: {
    summary: 'Formata o texto como código em linha (`inline code`).',
    description: 'Envolve o texto numa crase de cada lado. Se o texto tiver uma crase, são usadas duas no lugar.',
    args: {
      text: 'O texto a formatar.',
    },
    results: [
      '',
    ],
    notes: [MARKUP_MENTION, MARKUP_LIMIT],
  },
  STRING_MARKUP_ESCAPE: {
    summary: 'Faz o escape do markdown do Discord para o texto aparecer exatamente como foi digitado.',
    description: 'Faz o escape de barras invertidas, `*`, `_`, crases, `||`, `~~`, `__`, `>` e `#`/`-#` no começo, e quebra links mascarados. Útil para mostrar o que o usuário digitou sem que seja formatado.',
    args: {
      text: 'O texto a escapar.',
    },
    results: [
      '',
    ],
    notes: [MARKUP_MENTION, MARKUP_LIMIT],
  },
  STRING_MARKUP_HEADER_BIG: {
    summary: 'Transforma o texto num título grande (`# text`).',
    args: {
      text: 'O texto do título.',
    },
    results: [
      '',
    ],
    notes: [MARKUP_SINGLE_LINE, MARKUP_MENTION, HEADER_LINE],
  },
  STRING_MARKUP_HEADER_MEDIUM: {
    summary: 'Transforma o texto num título médio (`## text`).',
    args: {
      text: 'O texto do título.',
    },
    results: [
      '',
    ],
    notes: [MARKUP_SINGLE_LINE, MARKUP_MENTION, HEADER_LINE],
  },
  STRING_MARKUP_HEADER_SMALL: {
    summary: 'Transforma o texto num título pequeno (`### text`).',
    args: {
      text: 'O texto do título.',
    },
    results: [
      '',
    ],
    notes: [MARKUP_SINGLE_LINE, MARKUP_MENTION, HEADER_LINE],
  },
  STRING_MARKUP_ITALICS: {
    summary: 'Deixa o texto em _itálico_.',
    description: 'Envolve o texto em `_`. Qualquer `_` ou `*` do texto recebe escape.',
    args: {
      text: 'O texto a formatar.',
    },
    results: [
      '',
    ],
    notes: [MARKUP_MENTION, MARKUP_LIMIT],
  },
  STRING_MARKUP_LIST_DOTTED: {
    summary: 'Transforma itens separados por `|` numa lista com marcadores.',
    args: {
      items: 'Os itens da lista, separados por `|`.',
    },
    results: [
      '',
    ],
    notes: [
      LIST_ITEM,
      MARKUP_MENTION,
    ],
  },
  STRING_MARKUP_LIST_NUMBERED: {
    summary: 'Transforma itens separados por `|` numa lista numerada.',
    args: {
      items: 'Os itens da lista, separados por `|`.',
    },
    results: [
      '',
    ],
    notes: [
      'A numeração começa em 1.',
      LIST_ITEM,
      MARKUP_MENTION,
    ],
  },
  STRING_MARKUP_QUOTE: {
    summary: 'Transforma o texto numa citação (`> text`).',
    args: {
      text: 'O texto a citar.',
    },
    results: [
      '> (a mensagem respondida)',
    ],
    notes: [MARKUP_SINGLE_LINE, 'Qualquer `>` do texto recebe escape.', MARKUP_MENTION],
  },
  STRING_MARKUP_SPOILER: {
    summary: 'Esconde o texto atrás de um ||spoiler||.',
    args: {
      text: 'O texto a esconder.',
    },
    results: [
      '',
    ],
    notes: ['Qualquer `||` do texto recebe escape.', MARKUP_MENTION, MARKUP_LIMIT],
  },
  STRING_MARKUP_STRIKE: {
    summary: 'Risca o texto com ~~tachado~~.',
    args: {
      text: 'O texto a riscar.',
    },
    results: [
      '',
    ],
    notes: ['Qualquer `~~` do texto recebe escape.', MARKUP_MENTION, MARKUP_LIMIT],
  },
  STRING_MARKUP_SUBTEXT: {
    summary: 'Transforma o texto num subtexto pequeno e cinza (`-# text`).',
    args: {
      text: 'O texto a formatar.',
    },
    results: [
      '',
    ],
    notes: [MARKUP_SINGLE_LINE, MARKUP_MENTION, 'O subtexto só aparece no começo de uma linha.'],
  },
  STRING_MARKUP_TIME: {
    summary: 'Retorna um timestamp do Discord (`<t:...>`) que aparece no fuso horário de cada pessoa que o vê.',
    description: 'O horário pode ser um número de milissegundos desde 1970 ou uma string de data como `2025-01-01T12:00:00Z`. Sem horário, é usado o horário atual.\n\nA última parte pode ser um estilo: `BOTH_LONG` (`F`), `BOTH_SHORT` (`f`), `DATE_LONG` (`D`), `DATE_SHORT` (`d`), `RELATIVE` (`R`), `TIME_LONG` (`T`) ou `TIME_SHORT` (`t`). Os nomes de estilo não diferenciam maiúsculas; as letras sozinhas são as do próprio Discord e diferenciam. Sem estilo, é usado o formato padrão do Discord. Um estilo sozinho (como `{markuptime:RELATIVE}`) usa o horário atual.',
    args: {
      time: 'Milissegundos desde 1970, ou uma string de data. O padrão é agora.',
      style: 'Como o Discord mostra o horário; veja acima.',
    },
    results: [
      '<t:1760313600> (o horário atual)',
      '',
      '<t:1700000000:R> (aparece como algo tipo "há 2 anos")',
      '',
    ],
    notes: [
      'Os números são lidos como milissegundos, não segundos. Um timestamp Unix em segundos vai aparecer como uma data em janeiro de 1970.',
      'Se o horário não puder ser lido como data, a função fica no resultado como texto normal.',
    ],
  },
  STRING_MARKUP_UNDERLINE: {
    summary: 'Sublinha o texto (`__text__`).',
    args: {
      text: 'O texto a sublinhar.',
    },
    results: [
      '',
    ],
    notes: ['Qualquer `__` do texto recebe escape.', MARKUP_MENTION, MARKUP_LIMIT],
  },
  STRING_MARKUP_URL: {
    summary: 'Cria um link mascarado: texto clicável que leva a uma URL.',
    args: {
      text: 'O texto a mostrar.',
      url: 'Para onde o link leva.',
      tooltip: 'Texto mostrado ao passar o mouse sobre o link. Tudo depois do segundo `|` faz parte dele.',
    },
    results: [
      '',
      '',
    ],
    notes: [
      'Qualquer `)` na URL é codificado como `%29` para não quebrar o link.',
      'A URL é obrigatória; omiti-la é um erro.',
    ],
  },
  STRING_ONE_OF: {
    summary: 'Encontra a opção que melhor corresponde a um valor.',
    description: 'Primeiro procura uma opção que contenha o valor (sem diferenciar maiúsculas) e retorna a primeira encontrada. Se nenhuma contiver, usa uma busca aproximada para achar a opção mais parecida, o que é útil para erros de digitação ou entradas incompletas.',
    args: {
      value: 'O texto a comparar.',
      choices: 'As opções possíveis, separadas por `|`.',
    },
    results: [
      '',
      '',
      'A opção mais parecida com o que o usuário digitou',
    ],
    notes: [
      'Não retorna nada se nada corresponder, ou se o valor ou as opções estiverem faltando.',
      'Sem nenhum argumento, a função fica no resultado como texto normal.',
    ],
  },
  STRING_REPEAT: {
    summary: 'Repete um texto várias vezes.',
    args: {
      amount: 'Quantas vezes repetir o texto (um número inteiro).',
      text: 'O texto a repetir. Tudo depois do primeiro `|` faz parte dele, e os espaços das pontas são removidos.',
    },
    results: [
      '',
      '',
    ],
    notes: [
      'Se o resultado fizer a saída passar do tamanho máximo de upload, a tag gera um erro.',
      'Sem um `|`, ou se a quantidade não for um número ou for negativa, a função fica no resultado como texto normal.',
    ],
  },
  STRING_REPLACE: {
    summary: 'Substitui cada ocorrência de uma expressão regular num texto.',
    description: 'A primeira parte é uma expressão regular de JavaScript, que sempre roda com as flags `g` (substituir todas) e `i` (sem diferenciar maiúsculas); não dá para definir outras flags. Uma palavra simples também funciona, já que é só uma regex sem caracteres especiais.\n\nPor padrão a ordem é padrão, substituição e depois o texto. Você também pode rotular as partes com `with:` e `in:` para escrevê-las em qualquer ordem. A substituição pode usar `$1`, `$2`, ... para inserir grupos capturados, e `$&` para a ocorrência inteira.',
    args: {
      pattern: 'A expressão regular a procurar. Faça o escape de qualquer `|` nela como `\\|`.',
      replacement: 'Pelo que substituir cada ocorrência. Pode ter o prefixo `with:`.',
      text: 'O texto onde procurar. Pode ter o prefixo `in:`. Tudo depois do segundo `|` faz parte dele.',
    },
    results: [
      '',
      '',
      '',
    ],
    notes: [
      'Caracteres especiais de regex como `.`, `?`, `(`, `[` e `*` precisam de uma barra invertida se você quiser que correspondam literalmente.',
      'Uma regex inválida, ou que leve mais de 25 ms para rodar, é um erro.',
      'Com menos de três partes, a função fica no resultado como texto normal.',
    ],
  },
  STRING_REVERSE: {
    summary: 'Inverte o texto.',
    args: {
      text: 'O texto a inverter.',
    },
    results: [
      '',
    ],
    notes: [
      'Emojis únicos continuam inteiros, mas emojis formados por várias partes (bandeiras, tons de pele, famílias) podem quebrar ao ser invertidos.',
    ],
  },
  STRING_SUB: {
    summary: 'Retorna uma parte de um texto, por posição.',
    description: 'As posições começam em 0. O resultado começa em `start` e termina logo antes de `end` (ou no fim do texto). Posições negativas contam como 0, e se `start` for maior que `end` os dois são trocados.',
    args: {
      text: 'O texto a cortar. Não pode conter um `|` sem escape.',
      start: 'A posição onde começar.',
      end: 'A posição antes da qual parar. O padrão é o fim do texto.',
    },
    results: [
      '',
      '',
      'O primeiro caractere dos argumentos',
    ],
    notes: [
      'Sem um `|`, com o texto ou o início vazios, ou se start/end não forem números, a função fica no resultado como texto normal.',
    ],
  },
  STRING_TRANSLATE: {
    summary: 'Traduz texto com o Google Tradutor.',
    description: 'Se houver mais de uma parte, a última é verificada como nome ou código de idioma (ex.: `russian`, `ja` ou `random`). Se não for um idioma, é tratada como parte do texto.\n\nSem idioma, o texto é traduzido para o seu idioma: a sua configuração de idioma do NotSoBot, depois o seu idioma do Discord (em comandos de barra), depois a configuração de idioma do servidor, depois o idioma preferido do servidor e, por fim, inglês.',
    args: {
      text: 'O texto a traduzir. O idioma de origem é detectado automaticamente.',
      language: 'O idioma para o qual traduzir. A correspondência é aproximada, então grafias parecidas funcionam.',
    },
    results: [
      '',
      'Hello (se o seu idioma for inglês)',
      'Good morning num idioma aleatório',
    ],
    notes: [
      'Conta como uma requisição de rede, mesmo com texto vazio.',
      'Se a tradução falhar, nada é retornado.',
      'Como a última parte é comparada de forma aproximada com nomes de idioma, num texto que contém um `|` o último pedaço pode ser confundido com um idioma.',
    ],
  },
};
