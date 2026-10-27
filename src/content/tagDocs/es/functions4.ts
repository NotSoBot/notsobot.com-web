// tagDocs/functions/part4.ts in Spanish, keyed by function id

import type { TagDocsTranslation } from '../localize';

import { ONLY_NOTSOAI } from './common';


const MARKUP_MENTION = 'Los signos `@` se escapan con un carácter invisible para que las menciones, `@everyone` y `@here` no notifiquen a nadie.';
const MARKUP_SINGLE_LINE = 'Los saltos de línea del texto se sustituyen por espacios, así que el formato abarca una sola línea.';
const MARKUP_LIMIT = 'El texto se corta a unos 2000 bytes.';
const HEADER_LINE = 'Los encabezados solo se muestran al principio de una línea, así que pon un salto de línea delante si hace falta.';
const LIST_ITEM = 'Cada elemento se mantiene en una línea (los saltos de línea pasan a ser espacios), y los `-` o `*` dentro de un elemento se escapan.';

const MEDIASCRIPT_FILES = 'Usa `FILE_1`, `FILE_2`, ... en el código para referirte a archivos que el tag ya ha adjuntado (en el orden en que se adjuntaron). Los archivos referenciados se le pasan al script y se quitan de los archivos adjuntos del tag; escribe `FILE_1_COPY` en su lugar para mantener también adjunto el original. Referirse a un archivo que no existe es un error.';
const MEDIASCRIPT_ARGUMENTS = 'Si el script devuelve variables, cada una se define como variable del tag (como si usaras `{set}`), así que después puedes leerlas con `{get}`.';
const MEDIASCRIPT_SAFE = 'El modo seguro (filtro NSFW) depende del canal, y el modelo de generación de imágenes sigue el ajuste `ML_IMAGINE_MODEL` de `{settings}`.';
const EMPTY_CODE = 'Con el código vacío, la función se deja en el resultado como texto normal.';

const SEARCH_PAGE = 'Qué resultado usar, empezando por 0, o `random`. Si se omite (o la primera parte no es un número ni `random`), se elige un resultado al azar y todo el argumento es la búsqueda.';
const SEARCH_QUERY = 'Qué buscar. Se corta a 1024 caracteres.';
const SEARCH_CACHE = 'Los resultados se guardan en caché por búsqueda durante el resto de la ejecución, así que repetir la misma búsqueda no cuenta como otra petición de red.';
const ONE_REQUEST = 'Cuenta como una petición de red.';
const SAFE_SEARCH = 'La búsqueda segura está activada salvo que el canal permita contenido NSFW.';
const NO_RESULTS_INDEX = 'No devuelve nada si no hay resultados, si el índice va más allá del final de los resultados o si la búsqueda está vacía.';
const NO_RESULTS = 'No devuelve nada si no hay resultados o si la búsqueda está vacía.';

const PERMANENT_USER = 'Esto cambia de forma permanente los ajustes de NotSoBot de la persona que se lo pidió a NotSoAI, no solo en esta ejecución.';
const READ_OR_SET = 'Déjalo vacío para leer el actual.';
const NO_PIPE_OUTPUT = 'Sin un `|`, la función se deja en el resultado como texto normal.';


export const FUNCTIONS_SPANISH_4: TagDocsTranslation['functions'] = {
  MEDIASCRIPT_MAYBE_URL: {
    summary: 'Ejecuta código de MediaScript y adjunta el resultado, o devuelve una URL a él cuando la API lo sube.',
    description: 'Funciona como `{mediascript}`, pero el archivo de salida no está sujeto al estricto tamaño de subida de Discord. Si la API devuelve una copia subida del resultado, su URL se añade al texto; si no, el archivo resultante se adjunta a la respuesta.',
    args: {
      code: 'El código de MediaScript que ejecutar.',
    },
    results: [
      'La imagen editada, adjunta o como enlace',
    ],
    notes: [
      MEDIASCRIPT_FILES,
      MEDIASCRIPT_ARGUMENTS,
      ONE_REQUEST,
      MEDIASCRIPT_SAFE,
      'Un resultado adjunto más grande que el tamaño máximo de subida es un error. Un error del script se muestra como error.',
      EMPTY_CODE,
    ],
  },
  MEDIASCRIPT_URL: {
    summary: 'Ejecuta código de MediaScript, sube el resultado y devuelve su URL.',
    description: 'Funciona como `{mediascript}`, pero en lugar de adjuntar el resultado a la respuesta, el resultado se sube y su URL del CDN se añade al texto. Viene bien para pasar un resultado a otras funciones o a embeds.',
    args: {
      code: 'El código de MediaScript que ejecutar.',
    },
    results: [
      'Una URL a la imagen editada',
    ],
    notes: [
      'Los resultados subidos caducan a los 7 días.',
      MEDIASCRIPT_FILES,
      MEDIASCRIPT_ARGUMENTS,
      ONE_REQUEST,
      MEDIASCRIPT_SAFE,
      EMPTY_CODE,
    ],
  },
  NSFW: {
    summary: 'Detiene el tag con un error salvo que se esté usando en un sitio donde se permite contenido NSFW.',
    description: 'Ponlo al principio de un tag que solo deba usarse en canales NSFW. No devuelve nada cuando se permite contenido NSFW.\n\nEl contenido NSFW se permite en MD con el bot, en canales con restricción de edad y en servidores cuyo filtro de contenido explícito no se aplica al usuario. No se permite cuando el bot se usa como aplicación instalada por el usuario fuera de un servidor en el que esté.',
    results: [
      'Da un error en un canal normal, y muestra el texto en un canal NSFW',
    ],
  },
  NSFW_FILTER: {
    summary: 'Devuelve el texto solo si un análisis de seguridad no lo marca como inseguro.',
    description: 'El texto se envía a un análisis de moderación. Si lo pasa, se devuelve el texto (cortado a 2000 caracteres); si se marca, no se devuelve nada.',
    args: {
      text: 'El texto que comprobar.',
    },
    results: [
      'Los argumentos, o nada si se marcaron',
    ],
    notes: [
      'Cuenta como una petición de red y una petición de seguridad (se permiten 2 peticiones de seguridad por ejecución por defecto), incluso con el texto vacío.',
      'El análisis es más estricto fuera de los canales NSFW.',
      'Si el servicio de seguridad no está disponible, el texto se trata como inseguro y no se devuelve nada.',
      'El texto se corta a 2000 caracteres.',
    ],
  },
  PAGE_JSON: {
    summary: 'Añade una o más páginas a la respuesta, que se muestran con botones para pasar de página.',
    description: 'Recibe un objeto JSON que describe una página, o un array de ellos. Cada página puede tener:\n\n`content`: un string de texto.\n\n`embed`: un único objeto de embed (tiene que tener algo de contenido, una imagen, una miniatura o un vídeo).\n\n`files`: un array de strings `attachment://filename` que apuntan a archivos que adjuntó el tag.\n\n`components`: un array de componentes de diseño de Components V2 (filas de acción, contenedores, archivos, galerías multimedia, secciones, separadores, textos).\n\nCada página necesita al menos uno de estos.',
    args: {
      json: 'Un objeto de página, o un array de objetos de página.',
    },
    results: [
      'Dos páginas entre las que puedes ir pasando',
      'Añade una página con un embed',
      'Añade una página con un contenedor que tiene algo de texto',
    ],
    notes: [
      'Un JSON no válido, una página que no es un objeto, un embed vacío o una página sin nada utilizable es un error.',
      '{newline} dentro de un string JSON se convierte en un salto de línea real.',
      'Los componentes de las páginas no pueden ser interactivos: los botones tienen que ser botones de enlace y no se permiten menús de selección. Los botones tienen que ir dentro de filas de acción o de secciones.',
      'Cada página puede tener como mucho 33 componentes (contando los anidados).',
      'Un tag puede tener como mucho 1000 páginas.',
    ],
  },
  PREFIX: {
    summary: 'Devuelve el prefijo de comando que se usó para ejecutar el tag.',
    description: 'En los comandos de barra y otras interacciones siempre es `/`.',
    results: [
      'Try .help (si el tag se ejecutó con el prefijo `.`)',
    ],
  },
  REPLY_CONTENT: {
    summary: 'Devuelve el contenido del mensaje al que responde el mensaje que ejecuta el tag.',
    results: [
      'They said: (el texto del mensaje al que se responde)',
    ],
    notes: [
      'Solo funciona cuando el tag se ejecuta desde un mensaje normal que responde a otro mensaje. Si no (incluidos los comandos de barra), no se devuelve nada.',
    ],
  },
  REPLY_USER_ID: {
    summary: 'Devuelve el ID de usuario del autor del mensaje al que se responde.',
    results: [
      '',
    ],
    notes: [
      'Solo funciona cuando el tag se ejecuta desde un mensaje normal que responde a otro mensaje. Si no (incluidos los comandos de barra), no se devuelve nada.',
    ],
  },
  REQUEST: {
    summary: 'Hace una petición HTTP y devuelve la respuesta como JSON.',
    description: 'Recibe un objeto JSON con las opciones de la petición:\n\n`method` (obligatorio): `GET`, `POST`, `PUT`, `PATCH`, `DELETE` o `HEAD` (sin distinguir mayúsculas).\n\n`url` (obligatorio): la URL a la que hacer la petición.\n\n`headers`: un objeto de nombres de cabecera y sus valores.\n\n`query`: un objeto de parámetros de la query string.\n\n`json`: un cuerpo JSON (objeto o array). Solo se usa con `POST`, `PUT` y `PATCH`.\n\n`data`: un cuerpo de formulario, como un objeto plano cuyos valores son strings, números o booleanos. Solo se usa con `POST`, `PUT` y `PATCH`, y no se puede combinar con `json`.\n\nEl resultado es un string JSON como `{"cookies": {...}, "data": ..., "data_is_bytes": false, "headers": {...}, "status": 200, "url": "..."}`, donde `data` es el cuerpo de la respuesta: el JSON ya interpretado si el cuerpo es JSON y, si no, su texto. `data_is_bytes` ahora mismo siempre es `false`.',
    args: {
      json: 'El objeto de opciones de la petición descrito arriba.',
    },
    results: [
      '',
      'Envía los argumentos como cuerpo JSON y devuelve la respuesta',
    ],
    notes: [
      'Cuenta para el límite de peticiones de red.',
      'Usa `{jsonify}` para meter texto de forma segura dentro de las opciones JSON.',
      'Las opciones no válidas dan un error concreto, p. ej. "Request method is invalid.", "Request url is invalid." o "Request cannot have both json and data.". Las opciones que no son JSON válido también son un error.',
      'Si la petición falla, el tag da un error, con los detalles que dé el servicio de peticiones.',
      'La URL se interpreta como otras URLs de multimedia, así que una mención o ID de usuario se convierte en la URL de su avatar y un emoji personalizado en la URL de su imagen.',
    ],
  },
  RNG_CHOOSE: {
    summary: 'Elige al azar una de las opciones dadas.',
    description: 'Solo se evalúa la opción elegida, así que las funciones de las demás opciones nunca se ejecutan. Por eso es seguro poner cosas como `{set}` o llamadas de red en las opciones.',
    args: {
      choices: 'Las opciones entre las que elegir, separadas por `|`. Sin `|`, se devuelve el único valor.',
    },
    results: [
      'heads o tails',
      'Uno de los dos mensajes',
    ],
    notes: [
      'Sin argumento, la función se deja en el resultado como texto normal.',
    ],
  },
  RNG_RANGE: {
    summary: 'Devuelve un número entero al azar dentro de un rango, incluidos los dos extremos.',
    description: 'Con un número, elige entre 0 y ese número. Con dos, elige entre ellos; el orden no importa. Se admiten números muy grandes.',
    args: {
      min: 'El número más bajo. Por defecto, 0.',
      max: 'El número más alto.',
    },
    results: [
      'Un número del 0 al 10, p. ej. 7',
      'Una tirada de dado, p. ej. 4',
      'Un número del -5 al 5',
    ],
    notes: [
      'Los decimales se cortan (`{range:1.9|5.5}` es lo mismo que `{range:1|5}`).',
      'Si alguno de los valores no es un número, o no hay argumento, la función se deja en el resultado como texto normal.',
    ],
  },
  RNG_UUID: {
    summary: 'Genera un UUID al azar.',
    args: {
      version: '`4` (por defecto) para un UUID totalmente aleatorio, o `7` para uno ordenado por tiempo.',
    },
    results: [
      '',
      'Un UUID v7, p. ej. 0192a3e4-5b6c-7d8e-9f01-23456789abcd',
    ],
    notes: [
      'Cualquier otra versión se deja en el resultado como texto normal.',
    ],
  },
  SEARCH_DUCKDUCKGO_IMAGES: {
    summary: 'Busca en DuckDuckGo Imágenes y devuelve la URL de una imagen.',
    args: {
      index: SEARCH_PAGE,
      query: SEARCH_QUERY,
    },
    results: [
      'La URL de una imagen de gato al azar de entre los resultados',
      'La URL del primer resultado',
    ],
    notes: [
      ONE_REQUEST,
      SEARCH_CACHE,
      SAFE_SEARCH,
      NO_RESULTS_INDEX,
    ],
  },
  SEARCH_GOOGLE_IMAGES: {
    summary: 'Busca en Google Imágenes y devuelve la URL de una imagen.',
    args: {
      index: SEARCH_PAGE,
      query: SEARCH_QUERY,
    },
    results: [
      'La URL de una imagen de perro al azar de entre los resultados',
      'La URL del tercer resultado',
      'Una imagen al azar de lo que se le haya pasado al tag',
    ],
    notes: [
      ONE_REQUEST,
      SEARCH_CACHE,
      SAFE_SEARCH,
      NO_RESULTS_INDEX,
    ],
  },
  SEARCH_IMAGES: {
    summary: 'Busca imágenes con tu proveedor de búsqueda y devuelve la URL de una imagen.',
    args: {
      index: SEARCH_PAGE,
      query: SEARCH_QUERY,
    },
    results: [
      'La URL de una imagen de perro al azar de entre los resultados',
      'La URL del primer resultado',
    ],
    notes: [
      'Usa el proveedor de búsqueda de imágenes de la persona que ejecuta el tag (`/settings set search-provider`), después el del servidor y, si no, Google.',
      ONE_REQUEST,
      SEARCH_CACHE,
      SAFE_SEARCH,
      NO_RESULTS,
    ],
  },
  SEARCH_WEB: {
    summary: 'Busca en la web con tu proveedor de búsqueda y devuelve la URL de un resultado.',
    args: {
      index: SEARCH_PAGE,
      query: SEARCH_QUERY,
    },
    results: [
      'La URL del primer resultado',
      'Un resultado al azar de lo que se le haya pasado al tag',
    ],
    notes: [
      'Usa el proveedor de búsqueda web de la persona que ejecuta el tag (`/settings set search-provider`), después el del servidor y, si no, DuckDuckGo.',
      ONE_REQUEST,
      SEARCH_CACHE,
      SAFE_SEARCH,
      NO_RESULTS,
    ],
  },
  SEARCH_YOUTUBE: {
    summary: 'Busca en YouTube y devuelve la URL del primer vídeo.',
    description: 'Los canales y las listas de reproducción de los resultados se saltan; se usa el primer resultado que sea un vídeo.',
    args: {
      query: SEARCH_QUERY,
    },
    results: [
      '',
    ],
    notes: [
      ONE_REQUEST,
      SEARCH_CACHE,
      'No devuelve nada si no se encuentra ningún vídeo o si la búsqueda está vacía.',
    ],
  },
  SETTINGS: {
    summary: 'Cambia cómo se comporta el tag durante el resto de la ejecución.',
    description: 'Recibe exactamente dos partes: el nombre del ajuste (sin distinguir mayúsculas) y su valor. Los espacios alrededor de cualquiera de las partes se ignoran, y un valor vacío quita el ajuste. Los ajustes solo duran la ejecución actual del tag.\n\n`AI_MODEL`: el modelo de IA que usan las funciones de generación de texto (un modelo no válido da un error con la lista de los válidos).\n\n`AI_PERSONALITY`: un prompt de personalidad que usan las funciones de generación de texto, en lugar del del usuario o del servidor.\n\n`ALLOW_COMPONENT_EXECUTIONS_FROM_EVERYONE`: `true` deja que cualquiera use los botones y menús del tag, no solo la persona que ejecutó el tag. `false` lo vuelve a desactivar.\n\n`DISPLAY_MEDIA_AS_NATIVE`: por defecto, una respuesta que es solo un archivo (o solo un enlace de nsb.gg), sin texto, embeds ni botones, se muestra como la respuesta de un comando de multimedia. `true` la envía como un archivo adjunto o enlace normal de Discord. `false` lo vuelve a desactivar.\n\n`MEDIA_IV_FALLBACK`: cuando una función de imagen (como `{iv}` o `{image}`) no encuentra multimedia a partir de su argumento, ejecuta esta función con el mismo argumento y usa la URL que devuelve. Uno de `MEDIA_IMAGE_IMAGINE` (o `imagine`/`imagineurl`, que genera una imagen y usa su URL temporal), `SEARCH_DUCK_DUCK_GO_IMAGES` (o `SEARCH_DUCKDUCKGO_IMAGES` o un nombre de `search.duckduckgo.images`) o `SEARCH_GOOGLE_IMAGES` (o un nombre de `search.google.images`).\n\n`MEDIA_AV_FALLBACK`: lo mismo, para funciones de audio/vídeo como `{transcribe}`. Solo se permite `SEARCH_YOUTUBE` (o un nombre de `search.youtube`).\n\n`ML_IMAGINE_DO_NOT_ERROR`: un valor de verdadero/falso. Cuando es verdadero, se le pide a la generación de imágenes que no dé error.\n\n`ML_IMAGINE_MODEL`: el modelo de generación de imágenes, ahora mismo solo `FLUX_KLEIN` (sin distinguir mayúsculas).',
    args: {
      SETTING: 'El nombre del ajuste, de la lista de arriba.',
      value: 'El nuevo valor del ajuste.',
    },
    results: [
      'Usa los argumentos como multimedia, o los busca en Google Imágenes si no son multimedia',
      'Genera la imagen con Flux Klein',
      'Deja que todos pulsen los botones del tag',
      'Edita la última imagen o, si no hay ninguna, una recién generada',
      'Vuelve a quitar el ajuste del modelo',
    ],
    notes: [
      'No devuelve nada si funciona.',
      'Si no hay exactamente dos partes, o el nombre del ajuste es desconocido, la función se deja en el resultado como texto normal.',
      'Un valor no reconocido para `MEDIA_IV_FALLBACK` o `MEDIA_AV_FALLBACK` se ignora sin avisar. En los ajustes de verdadero/falso, `true`, `yes`, `y` y `+` los activan; cualquier otra cosa (incluido `false`) los quita.',
    ],
  },
  SETTINGS_SET_SERVER: {
    summary: 'Lee o cambia los ajustes de este servidor, como su zona horaria o su proveedor de búsqueda. Solo NotSoAI puede usar esto, para miembros con Gestionar servidor.',
    description: 'Sin argumentos, devuelve todos los ajustes del servidor como un objeto JSON. Solo con un ajuste, devuelve su valor actual. Con un valor, lo guarda y devuelve `true`, o `false` si ya tenía ese valor. Usa `clear` para restablecerlo, de modo que cada uno vuelva a su propio ajuste y, si no, al valor por defecto.\n\nLos ajustes son `AI_MODEL`, `AI_PERSONALITY`, `IMAGINE_MODEL`, `LOCALE`, `RESPONSE_DISPLAY` (`DEFAULT`/`NO_EMBED`/`LEGACY`), `SEARCH_PROVIDER_IMAGES` y `SEARCH_PROVIDER_WEB` (`GOOGLE`/`DUCK_DUCK_GO`/`BING`/`YANDEX`) y `TIMEZONE`.',
    args: {
      setting: 'Qué ajuste, como `TIMEZONE` o `search provider web`. Omítelo para devolver todos los ajustes.',
      value: 'El nuevo valor, o `clear` para restablecerlo. ' + READ_OR_SET,
    },
    results: [
      '',
      '',
    ],
    notes: [
      'Solo NotSoAI puede usar esto, y solo en su propia respuesta: en el tag de un usuario, o en un botón que hizo NotSoAI, la función se deja como texto normal.',
      'La persona que se lo pidió a NotSoAI necesita el permiso Gestionar servidor, aunque solo sea para leer los ajustes. Si no, da un error.',
      'Solo funciona en un servidor.',
      'Esto cambia de forma permanente los ajustes de NotSoBot del servidor para todos, no solo en esta ejecución.',
    ],
  },
  SETTINGS_SET_SERVER_AI_PERSONALITY: {
    summary: 'Lee, define o quita la personalidad de NotSoAI de este servidor. Solo NotSoAI puede usar esto, para miembros con Gestionar servidor.',
    description: 'Lo mismo que {settings.set.server} con `AI_PERSONALITY`, pero todo el argumento es la personalidad, así que puede contener `|`.',
    args: {
      prompt: 'El prompt de personalidad, o `clear` para quitarlo. ' + READ_OR_SET,
    },
    results: [
      '',
    ],
    notes: [
      'Solo NotSoAI puede usar esto, y solo en su propia respuesta: en el tag de un usuario, o en un botón que hizo NotSoAI, la función se deja como texto normal. La persona que se lo pidió necesita el permiso Gestionar servidor.',
      'NotSoBot filtra la personalidad antes de guardarla.',
    ],
  },
  SETTINGS_SET_USER: {
    summary: 'Lee o cambia los demás ajustes de la persona que usa el tag, como sus unidades o su modelo de IA. Solo NotSoAI puede usar esto.',
    description: 'Sin argumentos, devuelve todos los ajustes (además de `AI_PERSONALITY`, `LOCALE` y `TIMEZONE`) como un objeto JSON. Solo con un ajuste, devuelve su valor actual. Con un valor, lo guarda y devuelve `true`, o `false` si ya tenía ese valor. Usa `clear` para devolverlo al valor por defecto.\n\nLos ajustes son `AI_MEMORY` (`on`/`off`), `AI_MODEL`, `APP_COMMAND_RESPONSE_TYPE` (`AUTOMATIC`/`EPHEMERAL`), `DOWNLOAD_QUALITY` (de `1440p` a `144p`), `FALLBACKS_MEDIA_IMAGE` (`SEARCH_GOOGLE_IMAGES`/`SEARCH_DUCK_DUCK_GO_IMAGES`/`IMAGINE`), `FILE_UPLOAD_THRESHOLD` (`EXCEEDS_DISCORD_LIMIT`/`ALWAYS`/`NEVER`), `FILE_UPLOAD_TYPE` (`AUTOMATIC`/`TEMPORARY`), `FILE_VANITY`, `IMAGINE_MODEL`, `RESPONSE_DISPLAY` (`DEFAULT`/`NO_EMBED`/`LEGACY`), `SEARCH_PROVIDER_IMAGES` y `SEARCH_PROVIDER_WEB` (`GOOGLE`/`DUCK_DUCK_GO`/`BING`/`YANDEX`), `TTS_VOICE` (una voz integrada como `TIKTOK_EN_US_FEMALE_01`, o una de tus voces clonadas por su nombre) y `UNITS` (`IMPERIAL`/`METRIC`).',
    args: {
      setting: 'Qué ajuste, como `UNITS` o `ai model`. Omítelo para devolver todos los ajustes.',
      value: 'El nuevo valor, o `clear` para restablecerlo. ' + READ_OR_SET,
    },
    results: [
      '',
      '',
      '',
    ],
    notes: [
      ONLY_NOTSOAI,
      PERMANENT_USER,
      'El idioma, la zona horaria y la personalidad de la IA tienen sus propias funciones: {settings.set.user.locale}, {settings.set.user.timezone} y {settings.set.user.ai.personality}.',
      'Da un error si el ajuste o el valor no se reconocen, o si el ajuste necesita premium.',
    ],
  },
  SETTINGS_SET_USER_AI_PERSONALITY: {
    summary: 'Lee o cambia la personalidad de IA guardada en los ajustes de la persona que usa el tag. Solo NotSoAI puede usar esto.',
    description: 'Sin argumento, devuelve la personalidad de IA actual del usuario (o nada si no tiene). Con un prompt, lo guarda como su personalidad y devuelve `true`, o `false` si ya tenía ese valor. Usa `clear` para quitarla.',
    args: {
      prompt: 'El nuevo prompt de personalidad, o `clear` para quitarlo. ' + READ_OR_SET,
    },
    results: [
      'El prompt de personalidad actual',
      '',
      'true (o false si no había ninguna)',
    ],
    notes: [
      'Solo NotSoAI puede usar esto. En el tag de un usuario (o en un tag que NotSoAI llama con {tag}) la función se deja en el resultado como texto normal. También se deja como texto normal al ejecutarse desde un botón o menú que hizo NotSoAI, ya que otra persona podría pulsarlo.',
      PERMANENT_USER,
    ],
  },
  SETTINGS_SET_USER_LOCALE: {
    summary: 'Lee o cambia el idioma guardado en los ajustes de la persona que usa el tag. Solo NotSoAI puede usar esto.',
    description: 'Sin argumento, devuelve el idioma actual del usuario (o nada si no tiene). Con un nombre o código de idioma, lo guarda y devuelve `true`, o `false` si ya tenía ese valor. Usa `clear` para quitarlo.',
    args: {
      locale: 'Un nombre o código de idioma como `spanish` o `es`, o `clear` para quitarlo. ' + READ_OR_SET,
    },
    results: [
      '',
    ],
    notes: [
      ONLY_NOTSOAI,
      PERMANENT_USER,
      'Da un error si no se reconoce el idioma.',
    ],
  },
  SETTINGS_SET_USER_TIMEZONE: {
    summary: 'Lee o cambia la zona horaria guardada en los ajustes de la persona que usa el tag. Solo NotSoAI puede usar esto.',
    description: 'La zona horaria se usa al leer horas de recordatorios como "at 4pm". Sin argumento, devuelve la zona horaria actual del usuario (o nada si no tiene). Con una zona horaria, la guarda y devuelve `true`, o `false` si ya tenía ese valor. Usa `clear` para quitarla.',
    args: {
      timezone: 'Un nombre IANA como `America/New_York`, una abreviatura como `EST` o el nombre de una ciudad o región, o `clear` para quitarla. ' + READ_OR_SET,
    },
    results: [
      '',
      '',
    ],
    notes: [
      ONLY_NOTSOAI,
      PERMANENT_USER,
      'Da un error si no se reconoce la zona horaria.',
    ],
  },
  STRING_INDEX_OF: {
    summary: 'Devuelve la posición de la primera coincidencia de un texto dentro de otro.',
    description: 'Las posiciones empiezan en 0. Devuelve `-1` si no se encuentra el texto. La búsqueda distingue mayúsculas.',
    args: {
      search: 'El texto que buscar.',
      text: 'El texto en el que buscar. Todo lo que va después del primer `|` forma parte de él.',
    },
    results: [
      '',
      '',
    ],
    notes: [
      'A los valores simples (sin funciones dentro) se les recortan los espacios de alrededor.',
      NO_PIPE_OUTPUT,
    ],
  },
  STRING_JSONIFY: {
    summary: 'Convierte texto en un string JSON, con comillas y escapado.',
    description: 'Envuelve el texto en comillas dobles y escapa las comillas, las barras invertidas y los saltos de línea, para que se pueda meter en JSON de forma segura (por ejemplo en `{request}` o `{pagejson}`).',
    args: {
      text: 'El texto que convertir.',
    },
    results: [
      '',
      'Una página con los argumentos, escapados de forma segura',
    ],
  },
  STRING_LENGTH: {
    summary: 'Devuelve el número de caracteres del texto.',
    args: {
      text: 'El texto que medir.',
    },
    results: [
      '',
      'Lo largos que son los argumentos',
    ],
    notes: [
      'Los espacios de alrededor se recortan antes de medir. Algunos emoji cuentan como 2 caracteres.',
    ],
  },
  STRING_LOWER: {
    summary: 'Convierte el texto a minúsculas.',
    args: {
      text: 'El texto que convertir.',
    },
    results: [
      '',
    ],
  },
  STRING_MARKUP_BOLD: {
    summary: 'Pone el texto en **negrita**.',
    description: 'Envuelve el texto en `**`. Cualquier `**` que ya haya en el texto se escapa.',
    args: {
      text: 'El texto al que dar formato.',
    },
    results: [
      '',
    ],
    notes: [MARKUP_MENTION, MARKUP_LIMIT],
  },
  STRING_MARKUP_CODEBLOCK: {
    summary: 'Pone el texto en un bloque de código.',
    description: 'Envuelve el texto en tres comillas invertidas, cada grupo en su propia línea. Las tres comillas invertidas que haya en el texto se rompen para que no puedan cerrar el bloque antes de tiempo.',
    args: {
      text: 'El texto que poner en el bloque de código.',
    },
    results: [
      '',
    ],
    notes: [
      'No se puede elegir un lenguaje para el resaltado de sintaxis.',
      'A diferencia de la mayoría de funciones de formato, las menciones no se escapan. ' + MARKUP_LIMIT,
    ],
  },
  STRING_MARKUP_CODESTRING: {
    summary: 'Da formato al texto como código en línea (`inline code`).',
    description: 'Envuelve el texto en una comilla invertida a cada lado. Si el texto contiene una comilla invertida, se usan dos en su lugar.',
    args: {
      text: 'El texto al que dar formato.',
    },
    results: [
      '',
    ],
    notes: [MARKUP_MENTION, MARKUP_LIMIT],
  },
  STRING_MARKUP_ESCAPE: {
    summary: 'Escapa el markdown de Discord para que el texto se vea exactamente como se escribió.',
    description: 'Escapa las barras invertidas, `*`, `_`, las comillas invertidas, `||`, `~~`, `__`, `>` y los `#`/`-#` del principio, y rompe los enlaces con texto. Útil para mostrar lo que escribe el usuario sin que se le aplique formato.',
    args: {
      text: 'El texto que escapar.',
    },
    results: [
      '',
    ],
    notes: [MARKUP_MENTION, MARKUP_LIMIT],
  },
  STRING_MARKUP_HEADER_BIG: {
    summary: 'Convierte el texto en un encabezado grande (`# text`).',
    args: {
      text: 'El texto del encabezado.',
    },
    results: [
      '',
    ],
    notes: [MARKUP_SINGLE_LINE, MARKUP_MENTION, HEADER_LINE],
  },
  STRING_MARKUP_HEADER_MEDIUM: {
    summary: 'Convierte el texto en un encabezado mediano (`## text`).',
    args: {
      text: 'El texto del encabezado.',
    },
    results: [
      '',
    ],
    notes: [MARKUP_SINGLE_LINE, MARKUP_MENTION, HEADER_LINE],
  },
  STRING_MARKUP_HEADER_SMALL: {
    summary: 'Convierte el texto en un encabezado pequeño (`### text`).',
    args: {
      text: 'El texto del encabezado.',
    },
    results: [
      '',
    ],
    notes: [MARKUP_SINGLE_LINE, MARKUP_MENTION, HEADER_LINE],
  },
  STRING_MARKUP_ITALICS: {
    summary: 'Pone el texto en _cursiva_.',
    description: 'Envuelve el texto en `_`. Cualquier `_` o `*` del texto se escapa.',
    args: {
      text: 'El texto al que dar formato.',
    },
    results: [
      '',
    ],
    notes: [MARKUP_MENTION, MARKUP_LIMIT],
  },
  STRING_MARKUP_LIST_DOTTED: {
    summary: 'Convierte elementos separados por `|` en una lista con viñetas.',
    args: {
      items: 'Los elementos de la lista, separados por `|`.',
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
    summary: 'Convierte elementos separados por `|` en una lista numerada.',
    args: {
      items: 'Los elementos de la lista, separados por `|`.',
    },
    results: [
      '',
    ],
    notes: [
      'La numeración empieza en 1.',
      LIST_ITEM,
      MARKUP_MENTION,
    ],
  },
  STRING_MARKUP_QUOTE: {
    summary: 'Convierte el texto en una cita (`> text`).',
    args: {
      text: 'El texto que citar.',
    },
    results: [
      '> (el mensaje al que se responde)',
    ],
    notes: [MARKUP_SINGLE_LINE, 'Cualquier `>` del texto se escapa.', MARKUP_MENTION],
  },
  STRING_MARKUP_SPOILER: {
    summary: 'Oculta el texto tras un ||spoiler||.',
    args: {
      text: 'El texto que ocultar.',
    },
    results: [
      '',
    ],
    notes: ['Cualquier `||` del texto se escapa.', MARKUP_MENTION, MARKUP_LIMIT],
  },
  STRING_MARKUP_STRIKE: {
    summary: 'Tacha el texto con ~~tachado~~.',
    args: {
      text: 'El texto que tachar.',
    },
    results: [
      '',
    ],
    notes: ['Cualquier `~~` del texto se escapa.', MARKUP_MENTION, MARKUP_LIMIT],
  },
  STRING_MARKUP_SUBTEXT: {
    summary: 'Convierte el texto en subtexto pequeño y gris (`-# text`).',
    args: {
      text: 'El texto al que dar formato.',
    },
    results: [
      '',
    ],
    notes: [MARKUP_SINGLE_LINE, MARKUP_MENTION, 'El subtexto solo se muestra al principio de una línea.'],
  },
  STRING_MARKUP_TIME: {
    summary: 'Devuelve una marca de tiempo de Discord (`<t:...>`) que se muestra en la zona horaria de cada persona que la ve.',
    description: 'La hora puede ser un número de milisegundos desde 1970 o un string de fecha como `2025-01-01T12:00:00Z`. Sin hora, se usa la hora actual.\n\nLa última parte puede ser un estilo: `BOTH_LONG` (`F`), `BOTH_SHORT` (`f`), `DATE_LONG` (`D`), `DATE_SHORT` (`d`), `RELATIVE` (`R`), `TIME_LONG` (`T`) o `TIME_SHORT` (`t`). Los nombres de estilo no distinguen mayúsculas; las letras sueltas son las propias de Discord y sí las distinguen. Sin estilo, se usa el formato por defecto de Discord. Un estilo solo (como `{markuptime:RELATIVE}`) usa la hora actual.',
    args: {
      time: 'Milisegundos desde 1970, o un string de fecha. Por defecto, ahora.',
      style: 'Cómo muestra Discord la hora; mira arriba.',
    },
    results: [
      '<t:1760313600> (la hora actual)',
      '',
      '<t:1700000000:R> (se ve como algo tipo "hace 2 años")',
      '',
    ],
    notes: [
      'Los números se leen como milisegundos, no como segundos. Una marca de tiempo Unix en segundos se verá como una fecha de enero de 1970.',
      'Si la hora no se puede leer como una fecha, la función se deja en el resultado como texto normal.',
    ],
  },
  STRING_MARKUP_UNDERLINE: {
    summary: 'Subraya el texto (`__text__`).',
    args: {
      text: 'El texto que subrayar.',
    },
    results: [
      '',
    ],
    notes: ['Cualquier `__` del texto se escapa.', MARKUP_MENTION, MARKUP_LIMIT],
  },
  STRING_MARKUP_URL: {
    summary: 'Crea un enlace con texto: texto en el que se puede hacer clic y que lleva a una URL.',
    args: {
      text: 'El texto que mostrar.',
      url: 'Adónde lleva el enlace.',
      tooltip: 'Texto que se muestra al pasar el ratón por encima del enlace. Todo lo que va después del segundo `|` forma parte de él.',
    },
    results: [
      '',
      '',
    ],
    notes: [
      'Cualquier `)` de la URL se codifica como `%29` para que no rompa el enlace.',
      'La URL es obligatoria; omitirla es un error.',
    ],
  },
  STRING_ONE_OF: {
    summary: 'Encuentra la opción que mejor coincide con un valor.',
    description: 'Primero busca una opción que contenga el valor (sin distinguir mayúsculas) y devuelve la primera que encuentra. Si ninguna lo contiene, usa una búsqueda aproximada para encontrar la opción más parecida, lo que viene bien para erratas o textos incompletos.',
    args: {
      value: 'El texto con el que comparar.',
      choices: 'Las opciones posibles, separadas por `|`.',
    },
    results: [
      '',
      '',
      'La opción más parecida a lo que escribió el usuario',
    ],
    notes: [
      'No devuelve nada si no coincide nada, o si faltan el valor o las opciones.',
      'Sin ningún argumento, la función se deja en el resultado como texto normal.',
    ],
  },
  STRING_REPEAT: {
    summary: 'Repite un texto varias veces.',
    args: {
      amount: 'Cuántas veces repetir el texto (un número entero).',
      text: 'El texto que repetir. Todo lo que va después del primer `|` forma parte de él, y se recorta.',
    },
    results: [
      '',
      '',
    ],
    notes: [
      'Si el resultado haría que la salida superara el tamaño máximo de subida, el tag da un error.',
      'Sin un `|`, o si la cantidad no es un número o es negativa, la función se deja en el resultado como texto normal.',
    ],
  },
  STRING_REPLACE: {
    summary: 'Sustituye cada coincidencia de una expresión regular en un texto.',
    description: 'La primera parte es una expresión regular de JavaScript, que siempre se ejecuta con los flags `g` (sustituir todas) e `i` (sin distinguir mayúsculas); no se pueden poner otros flags. Una palabra normal también sirve, ya que es simplemente una regex sin caracteres especiales.\n\nPor defecto el orden es patrón, sustitución y después el texto. También puedes etiquetar las partes con `with:` e `in:` para escribirlas en cualquier orden. La sustitución puede usar `$1`, `$2`, ... para insertar grupos capturados, y `$&` para toda la coincidencia.',
    args: {
      pattern: 'La expresión regular que buscar. Escapa cualquier `|` que tenga como `\\|`.',
      replacement: 'Por qué sustituir cada coincidencia. Puede llevar delante `with:`.',
      text: 'El texto en el que buscar. Puede llevar delante `in:`. Todo lo que va después del segundo `|` forma parte de él.',
    },
    results: [
      '',
      '',
      '',
    ],
    notes: [
      'Los caracteres especiales de regex como `.`, `?`, `(`, `[` y `*` necesitan una barra invertida si quieres que coincidan literalmente.',
      'Una regex no válida, o una que tarda más de 25 ms en ejecutarse, es un error.',
      'Con menos de tres partes, la función se deja en el resultado como texto normal.',
    ],
  },
  STRING_REVERSE: {
    summary: 'Invierte el texto.',
    args: {
      text: 'El texto que invertir.',
    },
    results: [
      '',
    ],
    notes: [
      'Los emoji sueltos se mantienen enteros, pero los emoji formados por varias partes (banderas, tonos de piel, familias) pueden romperse al invertirlos.',
    ],
  },
  STRING_SUB: {
    summary: 'Devuelve una parte de un texto, por posición.',
    description: 'Las posiciones empiezan en 0. El resultado empieza en `start` y termina justo antes de `end` (o al final del texto). Las posiciones negativas cuentan como 0, y si `start` es mayor que `end` se intercambian.',
    args: {
      text: 'El texto que cortar. No puede contener un `|` sin escapar.',
      start: 'La posición en la que empezar.',
      end: 'La posición antes de la que parar. Por defecto, el final del texto.',
    },
    results: [
      '',
      '',
      'El primer carácter de los argumentos',
    ],
    notes: [
      'Sin un `|`, con el texto o el inicio vacíos, o si start/end no son números, la función se deja en el resultado como texto normal.',
    ],
  },
  STRING_TRANSLATE: {
    summary: 'Traduce texto con Google Translate.',
    description: 'Si hay más de una parte, se comprueba si la última es un nombre o código de idioma (p. ej. `russian`, `ja` o `random`). Si no es un idioma, se trata como parte del texto.\n\nSin idioma, el texto se traduce a tu idioma: tu ajuste de idioma de NotSoBot, después tu idioma de Discord (en comandos de barra), después el ajuste de idioma del servidor, después el idioma preferido del servidor y, si no, inglés.',
    args: {
      text: 'El texto que traducir. El idioma de origen se detecta automáticamente.',
      language: 'El idioma al que traducir. La comparación es aproximada, así que funcionan escrituras parecidas.',
    },
    results: [
      '',
      'Hello (si tu idioma es el inglés)',
      'Good morning en un idioma al azar',
    ],
    notes: [
      'Cuenta como una petición de red, incluso con el texto vacío.',
      'Si la traducción falla, no se devuelve nada.',
      'Como la última parte se compara de forma aproximada con nombres de idioma, en un texto que contiene un `|` el último trozo puede confundirse con un idioma.',
    ],
  },
};
