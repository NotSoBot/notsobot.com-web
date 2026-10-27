// tagDocs/functions/part3.ts in Spanish, keyed by function id

import type { TagDocsTranslation } from '../localize';


const LAST_MEDIA_DESCRIPTION = [
  'Sin argumento, el bot busca la multimedia más reciente que coincida en este orden: un archivo adjunto de un comando de barra, el mensaje que ejecutó el tag (archivos adjuntos, embeds, stickers), el mensaje al que responde y, por último, los últimos 25 mensajes del canal (primero los que el bot tiene en caché, y después los que obtiene si puede leer el historial de mensajes).',
  'Con argumento, los archivos adjuntos del mensaje que ejecutó el tag y del mensaje al que responde siguen yendo primero. Después, el argumento se lee como: `^` (la última multimedia, igual que sin argumento), una URL o un enlace a un mensaje de Discord (coge la multimedia de ese mensaje), una mención de usuario, un ID, `@name` o `name#0000` (el avatar de ese usuario), un emoji personalizado (su imagen), un emoji unicode (su imagen de Twemoji), o una búsqueda por nombre de miembro (su avatar).',
].join('\n\n');

const LAST_MEDIA = 'Cuenta como 1 petición de red, aunque no se encuentre nada.';
const NOTHING_FOUND = 'No devuelve nada si no se encuentra ninguna multimedia que coincida.';
const IV_FALLBACK = 'Si no se encuentra nada, se ejecuta en su lugar la alternativa definida con `{settings:MEDIA_IV_FALLBACK|...}`, con el mismo argumento (por ejemplo `search.google.images`, `search.ddg.images` o `imagine`, que genera una imagen y usa su URL temporal).';
const STORAGE_NOTES = [
  'Las claves pueden tener hasta 128 caracteres y los valores hasta 16.384 caracteres; si no, el tag da un error.',
  'Cada tag puede guardar hasta 5 claves por almacenamiento de canal, servidor, usuario o global; guardar una 6.ª clave da un error. Un valor vacío elimina la clave.',
  'El almacenamiento pertenece al tag (los alias comparten el almacenamiento del tag original). No se guarda nada salvo que el código se esté ejecutando como un tag guardado.',
  'Tanto la clave como el valor pueden contener otras funciones; se ejecutan antes de guardar.',
  'Sin un `|`, la función se deja como texto normal.',
];
const MESSAGE_PERMISSION = 'Necesitas los permisos Ver canal y Leer el historial de mensajes en ese canal, y el bot tiene que poder leer su historial; si no, el tag da un error.';

const STORAGE_ARGS = {
  name: 'La clave de almacenamiento.',
  value: 'El valor que guardar.',
};
const NOT_A_NUMBER = 'Se deja como texto normal si el argumento no es un número.';
const RADIANS = 'El ángulo en radianes; se admiten decimales.';
const WHOLE_NUMBERS = 'Uno o más números separados por `|`. Se quitan las partes decimales, y los números muy grandes se tratan con exactitud.';
const AI_REQUEST = 'Cuenta como 1 petición de red y 1 petición de IA (5 peticiones de IA por ejecución por defecto).';
const SAFE_MODE = 'Siempre se ejecuta en modo seguro.';
const IMAGINE_MODEL = 'Usa el modelo elegido con `{settings:ML_IMAGINE_MODEL|...}` (ahora mismo solo `FLUX_KLEIN`); también se pasa `{settings:ML_IMAGINE_DO_NOT_ERROR|true}`.';
const IMAGINE_MODEL_SHORT = 'Usa el modelo elegido con `{settings:ML_IMAGINE_MODEL|...}`.';
const LINK_EXPIRES = 'El enlace subido caduca a los 7 días.';
const MAX_ATTACHMENTS = 'Da un error si el tag ya tiene el máximo de archivos adjuntos (10), o si el resultado es más grande que el límite de subida.';
const PROMPT_BEFORE_PIPE = 'Qué cambiar. Si hay un `|`, todo lo que va antes del último `|` es el prompt.';
const CHANNEL_LOOK = 'El canal donde buscar (ID, mención o nombre). Por defecto, el canal actual.';
const CHANNEL_MESSAGE = 'El canal donde está el mensaje (ID, mención o nombre). Por defecto, el canal actual.';
const LOOKUP_CHANNEL_MESSAGE = 'Buscar un canal cuenta como 1 petición de red, igual que obtener un mensaje que el bot no tiene en caché.';
const MESSAGE_NOT_FOUND = 'No devuelve nada si no se encuentra el mensaje o el canal, si el mensaje está en otro canal, o si es un mensaje efímero de otra persona.';
const NO_MESSAGES = 'No devuelve nada si no hay mensajes entre los que elegir.';


export const FUNCTIONS_SPANISH_3: TagDocsTranslation['functions'] = {
  LOGICAL_SET: {
    summary: 'Define una variable para esta ejecución del tag.',
    description: 'Guarda un valor bajo un nombre para que puedas leerlo después con `{get:name}`. Las variables solo duran la ejecución actual; usa `{setserver}`, `{setuser}`, `{setchannel}` o `{setglobal}` para conservar valores entre ejecuciones.',
    args: {
      name: 'El nombre de la variable. No puede empezar por `__` (esos están reservados).',
      value: 'El valor que guardar. Se usa todo lo que va después del primer `|`, así que puede contener más caracteres `|`. Los espacios del principio y del final se recortan.',
    },
    results: [
      '',
      '',
    ],
    notes: [
      'Los nombres pueden tener hasta 64 caracteres y puedes tener hasta 100 variables por ejecución.',
      'Los valores de más de 1 MiB se cortan.',
      'Definir un nombre que ya existe lo sobrescribe.',
      'El nombre y el valor pueden contener otras funciones; se ejecutan antes de guardar.',
      'Sin un `|`, la función se deja como texto normal.',
    ],
  },
  LOGICAL_SET_CHANNEL: {
    summary: 'Guarda un valor para este tag, compartido por todos en el canal actual.',
    description: 'Conserva el valor entre ejecuciones. Vuelve a leerlo con `{getchannel:name}`.',
    args: STORAGE_ARGS,
    results: [
      'Saved! (y te recuerda como el último usuario de este canal)',
    ],
    notes: STORAGE_NOTES,
  },
  LOGICAL_SET_FILE_NAME: {
    summary: 'Cambia el nombre de un archivo que el tag va a adjuntar.',
    description: 'Cambia el nombre de archivo (y, si quieres, la extensión) de uno de los archivos que el tag ya ha adjuntado, como uno añadido con `{attach}`, `{imagine}` o `{mediascript}`.',
    args: {
      'file number': 'Qué archivo adjunto renombrar, empezando por 1.',
      'name': 'El nuevo nombre, sin la extensión. Déjalo vacío para mantener el nombre anterior.',
      'extension': 'La nueva extensión, sin el punto. Si se omite del todo, se mantiene la extensión anterior; si se da pero está vacía, el archivo se queda sin extensión.',
    },
    results: [
      'Cambia el nombre del primer archivo a myfile, manteniendo su extensión (p. ej. myfile.png)',
      'Cambia el nombre del primer archivo a notes.txt',
      'Mantiene el nombre pero cambia la extensión a .gif',
    ],
    notes: [
      'Da un error si no hay ningún archivo adjunto con ese número.',
      'Se deja como texto normal si no hay ningún `|` o el número de archivo no es un número.',
      'Esto solo cambia el nombre del archivo; no lo convierte.',
    ],
  },
  LOGICAL_SET_GLOBAL: {
    summary: 'Guarda un valor para este tag, compartido en todos los sitios donde se usa.',
    description: 'Conserva el valor entre ejecuciones, en todos los servidores, canales y usuarios. Vuelve a leerlo con `{getglobal:name}`.',
    args: STORAGE_ARGS,
    results: [
      'Cuenta cada uso del tag, en cualquier sitio',
    ],
    notes: STORAGE_NOTES,
  },
  LOGICAL_SET_SERVER: {
    summary: 'Guarda un valor para este tag, compartido por todos en el servidor actual.',
    description: 'Conserva el valor entre ejecuciones. Vuelve a leerlo con `{getserver:name}`. En MD se usa el canal en lugar de un servidor.',
    args: STORAGE_ARGS,
    results: [
      'Guarda un mensaje del día para este servidor',
    ],
    notes: STORAGE_NOTES,
  },
  LOGICAL_SET_USER: {
    summary: 'Guarda un valor para este tag, privado para la persona que lo ejecuta.',
    description: 'Conserva el valor entre ejecuciones para el usuario que ejecuta el tag, en cualquier servidor. Vuelve a leerlo con `{getuser:name}`.',
    args: STORAGE_ARGS,
    results: [
      'Recuerda el color solo para ti',
    ],
    notes: STORAGE_NOTES,
  },

  MATH: {
    summary: 'Evalúa una expresión matemática.',
    description: 'Usa un analizador de math.js con números de alta precisión (BigNumber), así que cosas como `0.1+0.2` dan `0.3`. Admite `+ - * / % ^`, paréntesis, `**` (se trata como `^`), comparaciones, funciones como `sqrt`, `round`, `floor`, `ceil`, `abs`, `min`, `max`, `log`, `pow`, `sin`/`cos`/`tan`, constantes como `pi` y `e`, conversiones de unidades como `5 inch to cm`, y cambios de base con `base(number, base)` y `frombase("digits", base)` para bases de 2 a 36 (`0-9` y luego `a-z`).\n\nSe entienden los números con separadores de miles como `1,000,000`. Los resultados periódicos se redondean a 2 decimales, y se quitan los ceros del final.',
    args: {
      expression: 'La expresión que evaluar. Los espacios de alrededor se recortan.',
    },
    results: [
      '',
      '',
      '',
      '',
      '',
    ],
    notes: [
      'Cada expresión tiene un límite de tiempo de 750 ms; las expresiones lentas dan un error por tiempo agotado.',
      'Las expresiones no válidas hacen que el tag dé un error con el mensaje de error matemático.',
      'Las conversiones de unidades solo devuelven el número, sin el nombre de la unidad.',
      'Dentro de una ejecución, las variables asignadas en una expresión (como `x = 5`) se pueden reutilizar en llamadas posteriores a `{math}`, siempre que esas llamadas usen el nombre de la variable.',
    ],
  },
  MATH_ABS: {
    summary: 'Valor absoluto de un número.',
    args: {
      number: 'Un número; se admiten decimales.',
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
    summary: 'Coseno de un ángulo en radianes.',
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
    summary: 'El número de Euler.',
    results: [
      '',
    ],
  },
  MATH_MAX: {
    summary: 'El mayor de una lista de números enteros.',
    args: {
      numbers: WHOLE_NUMBERS,
    },
    results: [
      '',
      '',
    ],
    notes: [
      'Se deja como texto normal si el argumento está vacío o algún valor no es un número.',
    ],
  },
  MATH_MIN: {
    summary: 'El menor de una lista de números enteros.',
    args: {
      numbers: WHOLE_NUMBERS,
    },
    results: [
      '',
      '',
    ],
    notes: [
      'Se deja como texto normal si el argumento está vacío o algún valor no es un número.',
    ],
  },
  MATH_PI: {
    summary: 'El número pi.',
    results: [
      '',
    ],
  },
  MATH_SIN: {
    summary: 'Seno de un ángulo en radianes.',
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
    summary: 'Tangente de un ángulo en radianes.',
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
    summary: 'Obtiene la URL de una imagen, un vídeo o un archivo de audio.',
    description: LAST_MEDIA_DESCRIPTION,
    args: {
      query: 'Una URL, un enlace a un mensaje, un usuario, un emoji o `^`. Déjalo vacío para usar la última multimedia del canal.',
    },
    results: [
      '',
      'Multimedia a partir de lo que pasó el usuario (una URL, el avatar de un usuario, un emoji, ...)',
    ],
    notes: [LAST_MEDIA, NOTHING_FOUND],
  },
  MEDIA_AUDIO: {
    summary: 'Obtiene la URL de un archivo de audio.',
    description: 'Funciona como `{media}`, pero solo coincide con audio.\n\n' + LAST_MEDIA_DESCRIPTION,
    args: {
      query: 'Una URL, un enlace a un mensaje o `^`. Déjalo vacío para usar el último audio del canal.',
    },
    results: [
      '',
    ],
    notes: [LAST_MEDIA, NOTHING_FOUND],
  },
  MEDIA_AUDIO_OR_VIDEO: {
    summary: 'Obtiene la URL de un archivo de audio o de vídeo.',
    description: 'Funciona como `{media}`, pero se salta las imágenes.\n\n' + LAST_MEDIA_DESCRIPTION,
    args: {
      query: 'Una URL, un enlace a un mensaje o `^`. Déjalo vacío para usar el último audio/vídeo del canal.',
    },
    results: [
      '',
    ],
    notes: [LAST_MEDIA, NOTHING_FOUND],
  },
  MEDIA_IMAGE: {
    summary: 'Obtiene la URL de una imagen.',
    description: 'Funciona como `{media}`, pero solo coincide con imágenes.\n\n' + LAST_MEDIA_DESCRIPTION,
    args: {
      query: 'Una URL, un enlace a un mensaje, un usuario, un emoji o `^`. Déjalo vacío para usar la última imagen del canal.',
    },
    results: [
      '',
      'La URL de tu avatar',
      'Una imagen a partir de los argumentos o, si no se encuentra ninguna, un resultado de Google Imágenes para ellos',
    ],
    notes: [LAST_MEDIA, IV_FALLBACK, NOTHING_FOUND],
  },
  MEDIA_IMAGE_EDIT: {
    summary: 'Edita una imagen con IA a partir de un prompt de texto y adjunta el resultado.',
    description: 'Busca una imagen (igual que `{image}`) y le pide al editor de imágenes con IA que la cambie según tu prompt. La imagen editada se adjunta a la respuesta del tag. Si el prompt está vacío, se inventa uno automáticamente.',
    args: {
      prompt: PROMPT_BEFORE_PIPE,
      image: 'Dónde encontrar la imagen (URL, usuario, emoji, `^`...). Solo se lee si hay un `|`; si no, se usa la última imagen.',
    },
    results: [
      'Adjunta una versión editada de la última imagen',
      'Adjunta tu avatar con un gorro de fiesta',
      'Adjunta una edición de la imagen dada con un prompt automático',
    ],
    notes: [
      AI_REQUEST,
      SAFE_MODE,
      IMAGINE_MODEL,
      IV_FALLBACK,
      'Se deja como texto normal si no se encuentra ninguna imagen, o si aquí no se permiten archivos adjuntos.',
      MAX_ATTACHMENTS,
    ],
  },
  MEDIA_IMAGE_EDIT_URL: {
    summary: 'Edita una imagen con IA y devuelve un enlace al resultado.',
    description: 'Igual que `{edit}`, pero en lugar de adjuntar la imagen la sube y devuelve la URL, para que puedas usarla en embeds o pasarla a otras funciones.',
    args: {
      prompt: PROMPT_BEFORE_PIPE,
      image: 'Dónde encontrar la imagen. Solo se lee si hay un `|`; si no, se usa la última imagen.',
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
      'No devuelve nada si no se encuentra ninguna imagen.',
    ],
  },
  MEDIA_IMAGE_IMAGINE: {
    summary: 'Genera una imagen con IA y la adjunta.',
    description: 'Crea una imagen totalmente nueva a partir de un prompt de texto y la adjunta a la respuesta del tag. Si el prompt está vacío, se inventa uno automáticamente.',
    args: {
      prompt: 'Lo que debería mostrar la imagen.',
    },
    results: [
      'Adjunta una imagen generada de un gato con corona',
      'Adjunta una imagen a partir de un prompt al azar',
      'Genera con el modelo Flux Klein',
    ],
    notes: [
      AI_REQUEST,
      SAFE_MODE,
      IMAGINE_MODEL,
      'Se deja como texto normal si aquí no se permiten archivos adjuntos.',
      MAX_ATTACHMENTS,
    ],
  },
  MEDIA_IMAGE_IMAGINE_URL: {
    summary: 'Genera una imagen con IA y devuelve un enlace a ella.',
    description: 'Igual que `{imagine}`, pero sube la imagen y devuelve su URL en lugar de adjuntarla.',
    args: {
      prompt: 'Lo que debería mostrar la imagen.',
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
    summary: 'Obtiene la URL de una imagen o un vídeo.',
    description: 'Funciona como `{media}`, pero se salta el audio.\n\n' + LAST_MEDIA_DESCRIPTION,
    args: {
      query: 'Una URL, un enlace a un mensaje, un usuario, un emoji o `^`. Déjalo vacío para usar la última imagen/vídeo del canal.',
    },
    results: [
      '',
    ],
    notes: [LAST_MEDIA, IV_FALLBACK, NOTHING_FOUND],
  },
  MEDIA_LIST: {
    summary: 'Obtiene las URLs de varios elementos multimedia como un array JSON.',
    description: 'Reúne multimedia en este orden: archivos adjuntos de un comando de barra, el mensaje que ejecutó el tag (archivos adjuntos, stickers), el mensaje al que responde y, por último, el argumento de texto. Se detiene cuando tiene `max` URLs.\n\nA diferencia de `{media}`, no busca en los mensajes anteriores del canal, así que la lista es solo lo que se envió o se indicó. Pon `^` en el texto para añadir la última multimedia del canal.\n\nEl texto se lee como el argumento de `{media}`: URLs, enlaces a mensajes de Discord, menciones de usuario, IDs, `@name` (su avatar), emojis y búsquedas por nombre de miembro. Úsalo con `{foreach}` para recorrer cada URL, o con `{traversejson}` para elegirlas o contarlas.',
    args: {
      type: '`media` (por defecto), `image`, `video`, `audio`, `av` (audio o vídeo) o `iv` (imagen o vídeo).',
      max: 'El máximo de URLs que devolver, de 1 a 10. Por defecto, 10.',
      text: 'Multimedia extra que buscar, como `{args}`.',
    },
    results: [
      '',
      'Hasta dos imágenes del mensaje, de la respuesta y de los argumentos',
      'Vuelve a subir cada imagen del mensaje',
      '',
    ],
    notes: [
      LAST_MEDIA,
      'Devuelve `[]` si no se encuentra ninguna multimedia que coincida.',
      'Un tipo desconocido, o un `max` que no es un número, deja la función como texto normal.',
    ],
  },
  MEDIA_VIDEO: {
    summary: 'Obtiene la URL de un vídeo.',
    description: 'Funciona como `{media}`, pero solo coincide con vídeos.\n\n' + LAST_MEDIA_DESCRIPTION,
    args: {
      query: 'Una URL, un enlace a un mensaje o `^`. Déjalo vacío para usar el último vídeo del canal.',
    },
    results: [
      '',
    ],
    notes: [LAST_MEDIA, NOTHING_FOUND],
  },

  MESSAGE_CONTENT: {
    summary: 'Obtiene el texto de un mensaje.',
    description: 'Sin argumento, devuelve el contenido del mensaje que ejecutó el tag (solo con comandos de prefijo). Con un ID de mensaje, devuelve el contenido de ese mensaje.',
    args: {
      'message id': 'El ID del mensaje que leer.',
      'channel': CHANNEL_MESSAGE,
    },
    results: [
      'El texto completo del mensaje que ejecutó el tag',
      'El texto del mensaje anterior del canal',
    ],
    notes: [
      LOOKUP_CHANNEL_MESSAGE,
      MESSAGE_PERMISSION,
      MESSAGE_NOT_FOUND,
    ],
  },
  MESSAGE_LAST_ID: {
    summary: 'Obtiene el ID de un mensaje reciente de un canal.',
    description: 'Repasa los mensajes recientes del canal (saltándose el que ejecutó el tag) y devuelve el ID del que está en la posición dada. `0` es el más reciente.',
    args: {
      position: 'Cuánto retroceder, de `0` (el más nuevo) a `99`, o `random` para uno al azar de los últimos 100. Por defecto, `0`; cualquier cosa que no sea un número se trata como `0`.',
      channel: CHANNEL_LOOK,
    },
    results: [
      '1234567890123456789 (el mensaje anterior)',
      'El ID del tercer mensaje más reciente',
      'El autor de un mensaje reciente al azar',
    ],
    notes: [
      'Da un error si la posición es 100 o más.',
      'Buscar un canal cuenta como 1 petición de red, igual que obtener el historial cuando el bot no tiene suficientes mensajes en caché.',
      MESSAGE_PERMISSION,
      'Se saltan los mensajes efímeros de otras personas.',
      NO_MESSAGES,
    ],
  },
  MESSAGE_RANDOM_ID: {
    summary: 'Obtiene el ID de un mensaje al azar de los últimos 100 de un canal.',
    args: {
      channel: CHANNEL_LOOK,
    },
    results: [
      '',
      'Cita un mensaje reciente al azar',
    ],
    notes: [
      'Se saltan el mensaje que ejecutó el tag y los mensajes efímeros de otras personas.',
      'Buscar un canal cuenta como 1 petición de red, igual que obtener el historial cuando el bot no tiene 100 mensajes en caché.',
      MESSAGE_PERMISSION,
      NO_MESSAGES,
    ],
  },
  MESSAGE_USER_ID: {
    summary: 'Obtiene el ID del autor de un mensaje.',
    description: 'Sin argumento, devuelve el ID de quien envió el mensaje que ejecutó el tag (solo con comandos de prefijo). Con un ID de mensaje, devuelve el ID del autor de ese mensaje.',
    args: {
      'message id': 'El ID del mensaje.',
      'channel': CHANNEL_MESSAGE,
    },
    results: [
      'Tu ID de usuario',
      'Menciona a quien envió el mensaje anterior',
    ],
    notes: [
      LOOKUP_CHANNEL_MESSAGE,
      MESSAGE_PERMISSION,
      MESSAGE_NOT_FOUND,
    ],
  },

  MEDIASCRIPT: {
    summary: 'Ejecuta un programa de MediaScript y adjunta el archivo que produce.',
    description: 'MediaScript es el lenguaje de scripts de NotSoBot para crear y editar imágenes, vídeo y audio. El código se ejecuta en los servidores de NotSoBot y el archivo de salida se adjunta a la respuesta del tag.\n\nPuedes pasarle al script archivos que el tag ya haya adjuntado escribiendo `FILE_1`, `FILE_2`, y así sucesivamente (numerados en el orden en que se adjuntaron). Usar `FILE_1` mueve ese archivo al script, así que se quita de la respuesta; usa `FILE_1_COPY` para mantener también adjunto el original. Los archivos adjuntos que son solo un enlace se sustituyen por su URL.',
    args: {
      code: 'El código de MediaScript que ejecutar. Los espacios de alrededor se recortan.',
    },
    results: [
      'Adjunta la imagen procesada en lugar de la original',
    ],
    notes: [
      'Cuenta como 1 petición de red.',
      'El modo seguro está activado salvo que el canal sea NSFW (o un MD), siguiendo las reglas NSFW habituales.',
      'Cualquier generación de imágenes dentro del script usa el modelo elegido con `{settings:ML_IMAGINE_MODEL|...}`.',
      'Los valores que el script devuelve como argumentos se guardan como variables del tag, como si se definieran con `{set}`.',
      'Las salidas de texto (como .txt) se adjuntan como archivos de texto.',
      'Se deja como texto normal si el código está vacío o aquí no se permiten archivos adjuntos.',
      'Da un error si `FILE_n` se refiere a un archivo que no existe, si el script da un error, si el tag ya tiene el máximo de archivos adjuntos (10), o si el resultado es más grande que el límite de subida.',
    ],
  },
};
