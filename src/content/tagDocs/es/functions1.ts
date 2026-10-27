// tagDocs/functions/part1.ts in Spanish (AI through COMPONENTS_ON_TIMEOUT), keyed by function id

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


export const FUNCTIONS_SPANISH_1: TagDocsTranslation['functions'] = {
  AI: {
    summary: 'Le hace una pregunta a la IA de NotSoBot y devuelve su respuesta.',
    description: [
      'Envía el texto a la IA y añade la respuesta generada al resultado. El texto puede ir envuelto en un bloque de código, que se quita antes de enviarlo.',
      'Puedes darle multimedia a la IA poniendo líneas `load URL` (o `load URL filename`) al principio del prompt. Los archivos que creaste antes en el tag con {attach} se pueden usar como `FILE_1`, `FILE_2`, etc. Usar `FILE_1` mueve ese archivo a la petición a la IA (ya no se enviará con el mensaje); usa `FILE_1_COPY` para conservarlo.',
      'La personalidad sale de {settings:AI_PERSONALITY|...} si está definida y, si no, de la personalidad de IA de tu usuario o de tu servidor. El modelo se puede elegir con {settings:AI_MODEL|...}.',
    ].join('\n\n'),
    args: {
      prompt: 'Qué preguntar. Puede empezar con líneas opcionales `load URL [filename]`.',
    },
    results: [
      'Un haiku sobre el primer argumento, escrito por la IA.',
      'Una descripción en una frase de la última imagen del canal.',
    ],
    notes: [
      'Cuenta para el límite de ejecuciones de IA (1 por ejecución por defecto) y para el límite de peticiones de red.',
      'El prompt tiene un máximo de 12.000 caracteres (incluida una pequeña cabecera interna con el número de ejecuciones de IA).',
      'Un prompt vacío no devuelve nada.',
      'Dentro de un tag, la respuesta se añade como texto normal. Cuando el script viene de la propia IA, la respuesta se interpreta primero como TagScript (y cuenta como si viniera de NotSoAI para {isfromai} y para las funciones exclusivas de NotSoAI).',
      'Usar un `FILE_N` que no existe da un error.',
    ],
  },
  AI_MEMORY_ADD: {
    summary: 'Guarda en su memoria un dato sobre la persona que usa NotSoAI. Solo NotSoAI puede usar esto.',
    description: 'El dato se le muestra a NotSoAI en todos los prompts futuros de esa persona. Por defecto se recuerda en todas partes; pasa `server` para recordarlo solo en el servidor actual. Devuelve `true` cuando se guarda, o `false` si NotSoAI ya recordaba ese dato (se compara sin distinguir mayúsculas).',
    args: {
      fact: 'El dato que recordar. Se corta a 200 caracteres.',
      server: '`server` para recordarlo solo en este servidor. Se ignora en MD, donde se recuerda en todas partes.',
    },
    results: [
      '',
      'true (solo se recuerda en este servidor)',
    ],
    notes: [
      ONLY_NOTSOAI,
      MEMORY_PERMANENT,
      'Las funciones `ai.memory.*` pueden cambiar la memoria como mucho 3 veces por mensaje; un cambio más da un error. Añadir solo cuenta cuando guarda algo nuevo.',
      NETWORK,
      'Un dato vacío no devuelve nada.',
      'Da un error si la persona desactivó la memoria de NotSoAI, ya tiene 25 recuerdos globales (o 15 para este servidor, con `server`), o el dato parece una contraseña, un token o una clave.',
    ],
  },
  AI_MEMORY_CLEAR: {
    summary: 'Olvida todo lo que NotSoAI recuerda de la persona que lo usa. Solo NotSoAI puede usar esto.',
    description: 'Elimina todos los recuerdos de la persona, incluidos los guardados para otros servidores. Devuelve cuántos recuerdos se olvidaron.',
    results: [
      '',
    ],
    notes: [
      ONLY_NOTSOAI,
      MEMORY_PERMANENT,
      'Las funciones `ai.memory.*` pueden cambiar la memoria como mucho 3 veces por mensaje; un cambio más da un error. Vaciar solo cuenta cuando se olvidó algo.',
      NETWORK,
    ],
  },
  AI_MEMORY_DELETE: {
    summary: 'Olvida uno de los recuerdos de NotSoAI sobre la persona que lo usa, por su posición. Solo NotSoAI puede usar esto.',
    description: 'La posición es el número del recuerdo en la lista de recuerdos que se le muestra a NotSoAI en su prompt, empezando por 1. Devuelve `true` cuando se elimina.',
    args: {
      position: 'El número del recuerdo, empezando por 1.',
    },
    results: [
      '',
    ],
    notes: [
      ONLY_NOTSOAI,
      MEMORY_PERMANENT,
      'Las funciones `ai.memory.*` pueden cambiar la memoria como mucho 3 veces por mensaje; un cambio más da un error.',
      NETWORK,
      EMPTY_ARGUMENT,
      'Da un error si la posición no es un número positivo o no hay ningún recuerdo en esa posición.',
    ],
  },
  AI_MEMORY_EDIT: {
    summary: 'Sustituye uno de los recuerdos de NotSoAI sobre la persona que lo usa, por su posición. Solo NotSoAI puede usar esto.',
    description: 'La posición es el número del recuerdo en la lista de recuerdos que se le muestra a NotSoAI en su prompt, empezando por 1. Devuelve `true` cuando se sustituye.',
    args: {
      position: 'El número del recuerdo, empezando por 1.',
      fact: 'El nuevo dato. Se corta a 200 caracteres.',
    },
    results: [
      '',
    ],
    notes: [
      ONLY_NOTSOAI,
      MEMORY_PERMANENT,
      'Las funciones `ai.memory.*` pueden cambiar la memoria como mucho 3 veces por mensaje; un cambio más da un error.',
      NETWORK,
      'No devuelve nada si la posición o el dato están vacíos.',
      'Da un error si la posición no es un número positivo o no hay ningún recuerdo en esa posición.',
    ],
  },
  API_AUDIO_IDENTIFY: {
    summary: 'Identifica la canción que suena en un audio o vídeo y devuelve las coincidencias como JSON.',
    description: 'Devuelve un array de coincidencias, la mejor primero. Cada una tiene `title`, `artists` (nombres), `album`, `cover_url`, `duration`, `timestamp` (en qué punto de la canción coincidió tu clip), `score` (confianza sobre 100), `genres`, `label`, `release_date` y `urls` con sus enlaces de `apple_music`, `deezer`, `musicbrainz`, `spotify` y `youtube` (`null` cuando no está en alguno). Sin argumento, se usa el último audio o vídeo del chat.',
    args: {
      url: 'La URL de un audio o vídeo. Por defecto, el último audio o vídeo del chat.',
    },
    results: [
      'El nombre de la canción del último audio o vídeo.',
      'El enlace de Spotify de la canción.',
    ],
    notes: [
      'Cuenta dos veces para el límite de peticiones de red, una para encontrar la multimedia y otra para identificarla. Volver a identificar la misma multimedia en una ejecución reutiliza el resultado guardado.',
      '`duration` y `timestamp` están en milisegundos.',
      'Devuelve `[]` si no se reconoció ninguna canción, y da un error si no se encuentra ningún audio ni vídeo.',
    ],
  },
  API_CREATE_REMINDER: {
    summary: 'Crea un recordatorio para el usuario y lo devuelve como JSON. Solo NotSoAI puede usar esto.',
    description: 'La hora se interpreta igual que en el comando de recordatorios (cosas como "in 5 minutes" o "tomorrow at 4pm"). Si no se da ningún texto, se usan las palabras que sobren del texto de la hora. Devuelve un objeto como `{"id": string, "position": number, "content": string, "timestamp_start": string, ...}`.',
    args: {
      time: 'Una hora en lenguaje natural, p. ej. `in 2 hours` o `next friday at 4pm do laundry`.',
      text: 'El texto del recordatorio. Por defecto, las palabras de `time` que no son la hora. Se usa todo lo que va después del primer `|`.',
    },
    results: [
      'Crea el recordatorio y devuelve su JSON.',
    ],
    notes: [
      ONLY_NOTSOAI,
      API_LIMIT,
      'Da un error si no se encuentra ninguna hora en `time`.',
      EMPTY_ARGUMENT,
    ],
  },
  API_DELETE_REMINDER: {
    summary: 'Elimina uno de los recordatorios del usuario por su posición. Solo NotSoAI puede usar esto.',
    description: 'La posición es el campo `position` de {api.fetch.reminders}. Devuelve `true` cuando se elimina.',
    args: {
      position: 'El número de posición del recordatorio.',
    },
    results: [
      '',
    ],
    notes: [
      ONLY_NOTSOAI,
      API_LIMIT,
      'Da un error si la posición no es un número positivo o no existe ningún recordatorio en ella.',
      EMPTY_ARGUMENT,
    ],
  },
  API_EDIT_REMINDER: {
    summary: 'Cambia la hora o el texto (o ambos) de uno de los recordatorios del usuario. Solo NotSoAI puede usar esto.',
    description: 'La posición es el campo `position` de {api.fetch.reminders}. Deja `time` vacío para mantener la hora actual, y omite `text` para mantener el texto actual. Devuelve el recordatorio editado como JSON.',
    args: {
      position: 'El número de posición del recordatorio.',
      time: 'Una nueva hora en lenguaje natural, o vacío para mantener la actual.',
      text: 'El nuevo texto del recordatorio. Se usa todo lo que va después del segundo `|`.',
    },
    results: [
      'Mueve el recordatorio 1 a mañana a las 9 y devuelve su JSON.',
      'Cambia el texto del recordatorio 2 y devuelve su JSON.',
    ],
    notes: [
      ONLY_NOTSOAI,
      API_LIMIT,
      'Da un error si la posición no es un número positivo, no existe ningún recordatorio en ella o la nueva hora ya ha pasado.',
    ],
  },
  API_FETCH_REMINDERS: {
    summary: 'Devuelve los recordatorios del usuario como JSON. Solo NotSoAI puede usar esto.',
    description: 'Devuelve un objeto como `{"count": number, "reminders": [...]}` con los mismos campos de recordatorio que {api.create.reminder}. Solo se listan los recordatorios del servidor actual, salvo que se pase `global`.',
    args: {
      global: 'Pasa `global` para listar los recordatorios de todos los servidores.',
    },
    results: [
      'Cuántos recordatorios tiene el usuario en este servidor.',
    ],
    notes: [
      ONLY_NOTSOAI,
      NETWORK,
    ],
  },
  API_INFO_INVITE: {
    summary: 'Busca una invitación de Discord y devuelve su servidor y su canal como JSON.',
    description: 'Devuelve un objeto con `code`, `url`, `member_count`, `online_count`, `expires_at` (fecha ISO, `null` si nunca caduca), `inviter` (`id` y `username`), `channel` (`id`, `name`, `type`) y `guild` con `id`, `name`, `description`, `created_at`, `features`, `verification_level`, `vanity_url_code`, `icon_url`, `banner_url` y `splash_url` del servidor.',
    args: {
      code: 'El código de invitación, o un enlace de invitación como `discord.gg/code` o `discord.com/invite/code`.',
    },
    results: [
      'El nombre del servidor de la invitación.',
      'Cuántos miembros tiene ese servidor.',
    ],
    notes: [
      'Cuenta para el límite de peticiones de red. Volver a buscar el mismo código en una ejecución reutiliza el resultado guardado.',
      'Da un error si la invitación no existe o ha caducado.',
      'Cualquier cosa que no sea un código o enlace de invitación no devuelve nada.',
    ],
  },
  API_SEARCH_DUCKDUCKGO_IMAGES: {
    summary: 'Busca en DuckDuckGo Imágenes y devuelve los resultados sin procesar como JSON.',
    description: 'Devuelve un objeto como `{"amount": number, "results": [...]}` donde cada resultado tiene campos como `header`, `footer`, `url`, `image.url`, `image.width`, `image.height` y `thumbnail.url`. Combínalo con {traversejson} o {set} para sacar lo que necesites.',
    args: {
      query: QUERY_1024,
    },
    results: [
      'La URL del primer resultado de imagen.',
      'Cuántos resultados se encontraron.',
    ],
    notes: [
      CACHED_QUERY,
      SAFE_SEARCH,
      EMPTY_QUERY,
    ],
  },
  API_SEARCH_IMAGES: {
    summary: 'Busca imágenes con tu proveedor de búsqueda y devuelve los resultados como JSON.',
    description: 'Devuelve un objeto como `{"provider": "GOOGLE", "results": [...]}` con hasta 10 resultados, cada uno con `image` (la URL de la imagen), `title` y `url` (la página donde está). Los campos son los mismos sea cual sea el proveedor.',
    args: {
      query: QUERY_1024,
    },
    results: [
      'La URL del primer resultado de imagen.',
      'Qué buscador se usó, como `BING`.',
    ],
    notes: [
      'Usa el proveedor de búsqueda de imágenes de la persona que ejecuta el tag (`/settings set search-provider`), después el del servidor y, si no, Google.',
      'Cuenta para el límite de peticiones de red. Repetir la misma búsqueda en una ejecución (aquí o en {search.images}) reutiliza el resultado guardado sin volver a contar.',
      SAFE_SEARCH,
      EMPTY_QUERY,
    ],
  },
  API_SEARCH_IMGUR: {
    summary: 'Busca en Imgur y devuelve los resultados sin procesar como JSON.',
    description: 'Devuelve un objeto como `{"amount": number, "results": [...]}` donde cada resultado tiene `id`, `url`, `thumbnail`, `type`, `views`, `likes`, `dislikes` y `points`.',
    args: {
      query: QUERY_1024,
    },
    results: [
      'La URL del primer resultado de Imgur.',
    ],
    notes: [
      CACHED_QUERY,
      EMPTY_QUERY,
    ],
  },
  API_SEARCH_REDDIT: {
    summary: 'Busca publicaciones de Reddit y devuelve los resultados como JSON.',
    description: 'Devuelve un objeto como `{"results": [...]}` donde cada publicación tiene `title`, `author`, `subreddit`, `url` (el enlace a la publicación), `score`, `num_comments`, `created_utc` (segundos unix), `selftext` (cortado a 1000 caracteres), `is_video` y `over_18`.',
    args: {
      query: QUERY_1024,
      subreddit: 'Opcional. Busca solo dentro de este subreddit, con o sin `r/` (hasta 20 caracteres).',
    },
    results: [
      'El título de la publicación principal.',
      'El enlace a la publicación principal de r/discordapp.',
    ],
    notes: [
      'Cuenta para el límite de peticiones de red. Repetir la misma búsqueda en una ejecución reutiliza el resultado guardado sin volver a contar.',
      'Las publicaciones NSFW se omiten salvo que el canal permita contenido NSFW.',
      'No se incluyen enlaces de imágenes ni vídeos; enlaza a la publicación en su lugar.',
      EMPTY_QUERY,
    ],
  },
  API_SEARCH_STEAM: {
    summary: 'Busca usuarios en la comunidad de Steam y devuelve los resultados como JSON.',
    description: 'Devuelve un objeto como `{"count": number, "results": [...]}`, donde `count` es el número total de coincidencias. Cada resultado tiene `username`, `url`, `avatar_url`, `real_name`, `country`, `country_flag_url`, `custom_url`, `past_names`, `steam_id` y `steam_id_64`. Encuentra cuentas, no juegos.',
    args: {
      query: 'El nombre que buscar (solo se usan los primeros 1024 caracteres).',
    },
    results: [
      'El enlace al perfil de la mejor coincidencia.',
    ],
    notes: [
      'Cuenta para el límite de peticiones de red. Repetir la misma búsqueda en una ejecución reutiliza el resultado guardado sin volver a contar.',
      EMPTY_QUERY,
    ],
  },
  API_SEARCH_URBAN: {
    summary: 'Busca las definiciones de una palabra en Urban Dictionary y las devuelve como JSON.',
    description: 'Devuelve un array de definiciones, la principal primero. Cada una tiene `word`, `definition`, `example`, `author`, `thumbs_up`, `thumbs_down`, `written_on`, `permalink`, `defid` y `sound_urls`. Las palabras entre `[brackets]` son enlaces a otras definiciones.',
    args: {
      term: 'Opcional. La palabra que definir (solo se usan los primeros 1024 caracteres). Déjalo vacío para definiciones al azar.',
    },
    results: [
      'La definición principal de "yeet".',
      'Una palabra al azar de Urban Dictionary.',
    ],
    notes: [
      'Cuenta para el límite de peticiones de red. Repetir el mismo término en una ejecución reutiliza el resultado guardado sin volver a contar; las definiciones al azar nunca se guardan.',
      'Devuelve `[]` si no se encontró nada.',
    ],
  },
  API_SEARCH_WEB: {
    summary: 'Busca en la web con tu proveedor de búsqueda y devuelve los resultados como JSON.',
    description: 'Devuelve un objeto como `{"provider": "DUCK_DUCK_GO", "results": [...]}` con hasta 10 resultados, cada uno con `title`, `url` y `description`. Los campos son los mismos sea cual sea el proveedor.',
    args: {
      query: QUERY_1024,
    },
    results: [
      'La URL del primer resultado.',
      'El fragmento del primer resultado.',
    ],
    notes: [
      'Usa el proveedor de búsqueda web de la persona que ejecuta el tag (`/settings set search-provider`), después el del servidor y, si no, DuckDuckGo.',
      'Cuenta para el límite de peticiones de red. Repetir la misma búsqueda en una ejecución (aquí o en {search.web}) reutiliza el resultado guardado sin volver a contar.',
      SAFE_SEARCH,
      EMPTY_QUERY,
    ],
  },
  API_SEARCH_WIKIHOW: {
    summary: 'Busca artículos de wikiHow, u obtiene uno al azar con sus pasos, como JSON.',
    description: 'Con una búsqueda, devuelve un array de artículos con `title`, `url`, `views`, `updated`, `thumbnail` y `badge`. Sin búsqueda, devuelve un artículo al azar con `title`, `description`, `url`, `rating` y `methods`, donde cada método tiene un `title` y sus `steps` (`text`, `image`, `url`).',
    args: {
      query: 'Opcional. La búsqueda (solo se usan los primeros 1024 caracteres). Déjalo vacío para un artículo al azar.',
    },
    results: [
      'El enlace al artículo que mejor coincide.',
      'El primer paso de un artículo al azar.',
    ],
    notes: [
      'Cuenta para el límite de peticiones de red. Repetir la misma búsqueda en una ejecución reutiliza el resultado guardado sin volver a contar; un artículo al azar nunca se guarda.',
    ],
  },
  API_SEARCH_WOLFRAM_ALPHA: {
    summary: 'Le hace una pregunta a WolframAlpha y devuelve su respuesta como JSON.',
    description: 'Devuelve un objeto como `{"fields": [...], "images": [...], "url": string}`. Cada campo es una de las secciones de la respuesta de WolframAlpha, con un `name` y un `value` de texto. La primera suele ser `Input interpretation` y la segunda `Result`. `images` son las secciones renderizadas, y `url` enlaza a la respuesta completa.',
    args: {
      query: 'La pregunta, operación o conversión (solo se usan los primeros 1024 caracteres).',
    },
    results: [
      'La distancia convertida.',
      'La integral, como texto.',
    ],
    notes: [
      CACHED_QUERY,
      '`fields` e `images` están vacíos si WolframAlpha no entendió la búsqueda.',
      EMPTY_QUERY,
    ],
  },
  API_UTILITIES_EXIF: {
    summary: 'Lee los metadatos de una imagen, audio o vídeo y los devuelve como JSON.',
    description: 'Devuelve un objeto como `{"metadata": {...}, "channels": {...}, "exif": [...]}`. `metadata` tiene `mimetype`, `width`, `height`, `size` (bytes), `duration` y `frames`. `channels` tiene las pistas `image`, `video` y `audio` con sus códecs, tasas de bits, fotogramas por segundo y frecuencias de muestreo (y también los `delay` de los fotogramas de una imagen animada, su `loop` y el `comment` de un gif). `exif` son los campos EXIF de la foto, cada uno con `name`, `value` y `description`. Sin argumento, se usa la última multimedia del chat.',
    args: {
      url: 'La URL de una multimedia, un usuario o un emoji. Por defecto, la última multimedia del chat.',
    },
    results: [
      'El tipo de la última multimedia, como `image/png`.',
      'Los fotogramas por segundo del último vídeo.',
    ],
    notes: [
      'Cuenta dos veces para el límite de peticiones de red, una para encontrar la multimedia y otra para leerla. Volver a leer la misma multimedia en una ejecución reutiliza el resultado guardado.',
      'Las duraciones y los retardos de fotograma están en milisegundos.',
      'Da un error si no se encuentra ninguna multimedia.',
    ],
  },
  API_UTILITIES_LOCATIONS: {
    summary: 'Busca lugares que coincidan con una búsqueda y devuelve los resultados como JSON.',
    description: 'Devuelve un objeto como `{"count": number, "results": [...]}`. Cada resultado tiene `name`, `name_official`, `latitude`, `longitude`, `urls` y un objeto `address` (`full`, `city`, `state`, `country`, `country_code`, `zipcode` y más).',
    args: {
      query: 'El lugar que buscar (solo se usan los primeros 1024 caracteres).',
    },
    results: [
      'La dirección completa de la mejor coincidencia.',
    ],
    notes: [
      CACHED_QUERY,
      EMPTY_QUERY,
    ],
  },
  API_UTILITIES_QR_CREATE: {
    summary: 'Adjunta una imagen con un código QR de un texto.',
    description: 'Añade el código QR como archivo adjunto al resultado del tag.',
    args: {
      text: 'El texto o la URL que codificar.',
    },
    results: [
      'Adjunta un código QR que abre la web de NotSoBot.',
    ],
    notes: [
      'Cuenta para el límite de archivos adjuntos y para el límite de peticiones de red.',
      EMPTY_ARGUMENT,
    ],
  },
  API_UTILITIES_QR_SCAN: {
    summary: 'Busca códigos QR en una imagen y devuelve los resultados como JSON.',
    description: 'Devuelve un objeto como `{"results": [{"data": string, "type": string}]}`. Sin argumento, se usa la última imagen del chat.',
    args: {
      url: 'La URL de una imagen, un usuario o un emoji. Por defecto, la última imagen del chat.',
    },
    results: [
      'El contenido del primer código QR encontrado.',
    ],
    notes: [
      NETWORK,
      'Da un error si no se encuentra ninguna imagen.',
    ],
  },
  API_UTILITIES_SCREENSHOT: {
    summary: 'Adjunta una captura de pantalla de una web.',
    description: 'Añade la captura como archivo adjunto al resultado del tag. Las webs NSFW se bloquean salvo que el canal esté marcado como NSFW.',
    args: {
      url: 'La web de la que hacer la captura.',
    },
    results: [
      'Adjunta una captura de la web de NotSoBot.',
    ],
    notes: [
      'Cuenta para el límite de archivos adjuntos y para el límite de peticiones de red.',
      EMPTY_ARGUMENT,
    ],
  },
  API_UTILITIES_WEATHER: {
    summary: 'Obtiene el tiempo de un lugar y devuelve los datos sin procesar como JSON.',
    description: 'Devuelve un objeto con `location` (con la misma forma que un resultado de {api.utilities.locations}), `timezone`, `thumbnail` y `weather`. `weather.current` incluye `temperature`, `feels_like`, `humidity`, `wind`, `conditions` y más, y `weather.daily` contiene la previsión, una entrada por día. El `rain` de cada día es la cantidad de lluvia prevista en milímetros (0 si no llueve). Todas las horas, como `timestamp`, `sunrise` y `sunset`, son marcas de tiempo Unix en segundos.',
    args: {
      query: 'El lugar (solo se usan los primeros 1024 caracteres).',
      units: '`metric` o `imperial` (sin distinguir mayúsculas). Solo se trata como unidades si la última parte tras un `|` es una de estas; si no, sigue formando parte de la búsqueda.',
    },
    results: [
      'La temperatura actual en Londres, en grados Celsius.',
      'Algo como "Clouds".',
    ],
    notes: [
      'Cuenta para el límite de peticiones de red. Repetir la misma búsqueda con las mismas unidades en una ejecución reutiliza el resultado guardado sin volver a contar.',
      EMPTY_ARGUMENT,
    ],
  },
  ARG: {
    summary: 'Devuelve un solo argumento pasado al tag.',
    description: 'Los argumentos son el texto que va después del nombre del tag, separado por espacios. Las palabras entre comillas cuentan como un solo argumento, así que `"hello world"` es un único argumento (sin las comillas).',
    args: {
      index: 'Índice del argumento, empezando desde 0; por defecto 0. Los números negativos cuentan desde el final (-1 es el último argumento).',
    },
    results: [
      'Con `.t mytag apple banana`, devuelve "apple".',
      'Con `.t mytag apple banana`, devuelve "banana".',
      'El último argumento.',
    ],
    notes: [
      OUT_OF_RANGE,
      NOT_A_NUMBER,
    ],
  },
  ARG_SAFE: {
    summary: 'Como {arg}, pero escapa cualquier `|` del argumento para poder pasarlo sin problemas a otras funciones.',
    description: 'Cada `|` sin escapar se convierte en `\\|`, así que si un usuario escribe una barra vertical no dividirá por accidente los argumentos de la función a la que se lo pases.',
    args: {
      index: 'Índice del argumento, empezando desde 0; por defecto 0. Los números negativos cuentan desde el final.',
    },
    results: [
      'Guarda el primer argumento en una variable, aunque contenga `|`.',
    ],
    notes: [
      OUT_OF_RANGE,
      NOT_A_NUMBER,
    ],
  },
  ARGS: {
    summary: 'Devuelve todos los argumentos del tag, o un rango de ellos.',
    description: 'Sin argumento, devuelve el texto de los argumentos exactamente como se escribió. Con un rango, coge un tramo de la lista de argumentos ya separados y lo une con espacios simples.',
    args: {
      start: START_INDEX,
      end: END_INDEX,
    },
    results: [
      'Con `.t mytag one two three`, devuelve "one two three".',
      'Todo menos el primer argumento: "two three".',
      'Todo menos el último argumento: "one two".',
    ],
    notes: [
      'Si `start` no es un número, la función se deja tal cual en el resultado.',
      'Al usar un rango, los argumentos entre comillas pierden sus comillas y los espacios se normalizan a espacios simples.',
    ],
  },
  ARGS_LEN: {
    summary: 'Devuelve cuántos argumentos se pasaron al tag.',
    results: [
      'Con `.t mytag one "two three"`, devuelve "2".',
      'Avisa al usuario cuando no se dan argumentos.',
    ],
    notes: [
      'El texto entre comillas cuenta como un solo argumento.',
    ],
  },
  ARGS_SAFE: {
    summary: 'Como {args}, pero escapa cualquier `|` para poder pasar el texto sin problemas a otras funciones.',
    args: {
      start: START_INDEX,
      end: END_INDEX,
    },
    results: [
      'Guarda todos los argumentos en una variable, aunque contengan `|`.',
      'Todos los argumentos después del primero, con las barras verticales escapadas.',
    ],
    notes: [
      'Si `start` no es un número, la función se deja tal cual en el resultado.',
    ],
  },
  ATTACHMENT: {
    summary: 'Descarga una URL y la adjunta como archivo al mensaje del tag.',
    description: 'Además de URLs normales, puedes pasar una mención o ID de usuario (adjunta su avatar) o un emoji (personalizado o unicode). A las URLs sin `http(s)://` se les añade `https://`.\n\nLos archivos adjuntos se pueden usar después en {ai} y en las funciones de código como `FILE_1`, `FILE_2`, etc.',
    args: {
      url: 'La URL, el usuario o el emoji que descargar.',
      filename: 'Nombre que darle al archivo. Por defecto, el nombre de la descarga.',
      description: 'Texto alternativo del archivo. Se usa todo lo que va después del segundo `|`.',
    },
    results: [
      'Envía cat.png junto con el mensaje.',
      'Adjunta tu avatar como me.png con texto alternativo.',
    ],
    notes: [
      'Cuenta para el límite de peticiones de red. Volver a adjuntar la misma URL en una ejecución reutiliza la descarga sin volver a contar.',
      'Hasta 10 archivos adjuntos por ejecución por defecto; pasarse da un error. Si los archivos adjuntos están desactivados en esta ejecución, la función se deja tal cual.',
      'Cada archivo tiene que caber en el límite de tamaño de subida del servidor/canal; si no, da un error.',
      'Las descargas usan un filtrado parecido a SafeSearch salvo que el canal permita contenido NSFW.',
      'Una URL no válida da un error.',
    ],
  },
  ATTACHMENT_LAST: {
    summary: 'Devuelve la URL de la imagen más reciente.',
    description: 'Busca una imagen primero en el mensaje que lo ejecuta, después en el mensaje al que responde y después en los mensajes recientes del canal. En los comandos de barra, se usa el archivo adjunto.',
    results: [
      'Algo como "https://cdn.discordapp.com/attachments/.../image.png".',
      'Vuelve a subir la última imagen como again.png.',
    ],
    notes: [
      'Siempre cuenta para el límite de peticiones de red.',
      'No devuelve nada si no se encuentra ninguna imagen. Cualquier argumento se ignora.',
    ],
  },
  ATTACHMENT_SPOILER: {
    summary: 'Igual que {attach}, pero el archivo se marca como spoiler.',
    args: {
      url: 'La URL, el usuario o el emoji que descargar.',
      filename: 'Nombre que darle al archivo. Por defecto, el nombre de la descarga.',
      description: 'Texto alternativo del archivo.',
    },
    results: [
      'Envía la imagen oculta tras un spoiler.',
    ],
    notes: [
      'Comparte todos los límites y el comportamiento de {attach}.',
    ],
  },
  ATTACHMENT_TEXT: {
    summary: 'Adjunta el texto dado como archivo .txt.',
    description: 'El primer archivo se llama `content.txt`; si ya hay otros archivos adjuntos, pasa a ser `content.2.txt`, `content.3.txt`, etc. Todo el argumento se usa como contenido del archivo, incluido cualquier `|`.',
    args: {
      text: 'El contenido del archivo de texto.',
    },
    results: [
      'Envía los argumentos como content.txt.',
    ],
    notes: [
      'No usa ninguna petición de red.',
      ATTACHMENT_LIMIT,
      'El texto tiene que caber en el límite de tamaño de subida; si no, da un error.',
    ],
  },
  ATTACHMENT_VOICE: {
    summary: 'Descarga audio o vídeo de una URL y lo adjunta como mensaje de voz de Discord.',
    description: 'Se extrae el audio y se convierte a OGG con una forma de onda, así que aparece como un mensaje de voz.',
    args: {
      url: 'URL del audio o vídeo que usar.',
      filename: 'Nombre que darle al archivo. Se usa todo lo que va después del primer `|`.',
    },
    results: [
      'Envía song.mp3 como mensaje de voz.',
    ],
    notes: [
      'Siempre cuenta para el límite de peticiones de red (no se guarda en caché).',
      ATTACHMENT_LIMIT,
      'El resultado tiene que caber en el límite de tamaño de subida; si no, da un error.',
    ],
  },
  AVATAR: {
    summary: 'Devuelve la URL del avatar de un usuario (1024px).',
    args: {
      user: USER_ARG,
    },
    results: [
      'La URL de tu avatar.',
      'La URL del avatar de ese usuario.',
      'Adjunta el avatar del usuario indicado en el primer argumento.',
    ],
    notes: [
      'Buscar un usuario cuenta para el límite de peticiones de red; usarlo sin argumento no.',
      'No devuelve nada si no se encuentra al usuario.',
    ],
  },
  CHANNEL: {
    summary: 'Devuelve el nombre de un canal.',
    args: {
      channel: CHANNEL_ARG,
    },
    results: [
      'Algo como "general".',
      'El nombre de ese canal.',
    ],
    notes: [
      'En MD (sin argumento), devuelve "Direct Message".',
      'Solo se encuentran canales del servidor actual. Los nombres se comparan sin distinguir mayúsculas (primero los que empiezan por el texto y luego los que lo contienen).',
      NO_CHANNEL,
    ],
  },
  CHANNEL_ID: {
    summary: 'Devuelve el ID de un canal.',
    args: {
      channel: CHANNEL_ARG,
    },
    results: [
      'El ID del canal actual, p. ej. "560595518129045504".',
      'El ID del primer canal que coincide con "general".',
    ],
    notes: [
      CHANNEL_MATCH,
      NO_CHANNEL,
    ],
  },
  CHANNEL_MENTION: {
    summary: 'Devuelve una mención de un canal en la que se puede hacer clic.',
    args: {
      channel: CHANNEL_ARG,
    },
    results: [
      'Una mención del canal actual, como <#560595518129045504>.',
      'Menciona el canal de normas.',
    ],
    notes: [
      CHANNEL_MATCH,
      NO_CHANNEL,
    ],
  },
  CHANNEL_RANDOM: {
    summary: 'Devuelve el nombre de un canal al azar del servidor.',
    results: [
      'Algo como "Go hang out in #memes!".',
    ],
    notes: [
      'Elige entre todos los canales que el bot conoce en el servidor, lo que puede incluir categorías y canales de voz.',
      'En MD, devuelve "Direct Message".',
    ],
  },
  COMPONENT_JSON: {
    summary: 'Añade un componente de mensaje (botones, menús de selección, contenedores, etc.) a partir de JSON.',
    description: 'El argumento es un objeto de componente de Discord en JSON, que puede ir envuelto en un bloque de código. Primero se interpreta el TagScript de dentro, y luego se lee el JSON y se añade al mensaje. Los tipos admitidos incluyen filas de acción, botones, menús de selección, contenedores, secciones, textos, miniaturas, galerías multimedia, archivos y separadores.\n\nLos botones necesitan un `label` o una `url` (una URL lo convierte en un botón de enlace), y pueden tener un string `run` con TagScript que se ejecuta al pulsarlos.',
    args: {
      json: 'Un único objeto de componente en JSON.',
    },
    results: [
      'Añade una fila de acción con un botón.',
      'Añade un botón de enlace.',
    ],
    notes: [
      'Un JSON no válido, o un JSON que no es un objeto, da un error.',
      '{newline} dentro de un string JSON se convierte en un salto de línea real.',
      'Hasta 5 filas de acción o 25 botones sueltos por mensaje, y no puedes mezclar filas de acción con botones sueltos.',
      'Las filas de acción llevan de 1 a 5 componentes; los contenedores, de 1 a 40.',
    ],
  },
  COMPONENTS_ON_TIMEOUT: {
    summary: 'Define TagScript que se ejecuta cuando caducan los componentes del mensaje.',
    description: 'El argumento se guarda tal cual (no se interpreta en ese momento) y se ejecuta cuando los componentes caducan.',
    args: {
      tagscript: 'El TagScript que ejecutar al caducar.',
    },
    results: [
      'Muestra ese texto cuando los botones dejan de funcionar.',
    ],
    notes: [
      'Solo se guarda un script de caducidad; volver a usar esto sustituye al anterior.',
      'Un argumento vacío deja la función tal cual en el resultado.',
    ],
  },
};
