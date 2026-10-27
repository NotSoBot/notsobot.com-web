// tagDocs/functions/part5.ts in Spanish, keyed by function id

import type { TagDocsTranslation } from '../localize';

import { API_LIMIT } from './common';


const USER_LOOKUP = 'Opcional. Una mención, un ID de usuario o un nombre que buscar entre los miembros del servidor. Si se omite, se usa la persona que usa el tag.';
const USER_LOOKUP_NOTE = 'Buscar a otro usuario cuenta como una petición de red. Si no coincide nadie, no se devuelve nada.';
const RANDOM_DM = 'En MD elige entre la persona que usa el tag y el propio NotSoBot.';
const MEMBER_LIST = 'Si la lista de miembros del servidor todavía no está cargada del todo, NotSoBot la pide primero, lo que puede tardar un poco en servidores grandes.';
const PRESENCE_CACHE = 'Solo elige entre los miembros que NotSoBot tiene en caché con una presencia.';
const VARIABLES_STORAGE_NOTES = [
  'Hace una petición para obtener las variables guardadas del tag actual. Si el tag no se está ejecutando como un tag guardado (así que no hay ningún tag que buscar), devuelve `{}`.',
  'Si el tag es un alias de otro tag, se usan las variables del tag original.',
];
const NOT_SAVED = 'No devuelve nada si no se ejecuta desde un tag guardado.';
const TIME_UNKNOWN = 'Si no se entiende la hora, no se devuelve nada.';
const ONE_REQUEST = 'Cuenta como una petición de red.';


export const FUNCTIONS_SPANISH_5: TagDocsTranslation['functions'] = {
  STRING_UPPER: {
    summary: 'Convierte el texto a MAYÚSCULAS.',
    args: {
      text: 'El texto que convertir.',
    },
    results: [
      '',
      'Tu nombre de usuario en mayúsculas',
    ],
  },
  STRING_URL_ENCODE: {
    summary: 'Codifica el texto para URLs, para poder meterlo sin problemas dentro de un enlace.',
    description: 'Usa la codificación estándar de componentes de URI, así que los espacios pasan a ser `%20`, `&` pasa a ser `%26`, etc.',
    args: {
      text: 'El texto que codificar.',
    },
    results: [
      '',
      'Un enlace de búsqueda de Google con lo que se le haya pasado al tag',
    ],
  },
  TAG: {
    summary: 'Ejecuta otro tag por su ID e inserta su resultado.',
    description: 'La primera parte es el ID del tag que ejecutar, y todo lo que va después del primer `|` se le pasa a ese tag como sus argumentos (lo que devuelve `{args}` dentro de él).\n\nEl tag llamado se ejecuta como si fuera el tag actual, así que funciones como `{tagid}` y `{tagname}` se refieren a él mientras se ejecuta, y su resultado (texto, embeds, archivos, etc.) se une al resultado del tag actual. Las variables que defines en tu tag no se comparten con el tag llamado, y las variables del tag llamado no vuelven al tuyo, salvo que el tag se llame a sí mismo, en cuyo caso se comparten todas las variables. Los límites de uso (peticiones de red, ejecuciones de tags, etc.) se comparten entre los dos.',
    args: {
      tag_id: 'El ID del tag que ejecutar (no su nombre).',
      arguments: 'Texto que se le pasa al tag llamado como sus argumentos. Por defecto, nada.',
    },
    results: [
      'El resultado del tag 123456789012345678, ejecutado sin argumentos',
      'El resultado de ese tag, con `{args}` valiendo "hello world" dentro de él',
    ],
    notes: [
      'El tag tiene que estar en el directorio de tags, o pertenecer al mismo servidor (o a los MD del dueño del tag). Si no, da un error.',
      'Da un error si falta el ID o no es un ID válido.',
      'Cuenta para el límite de ejecuciones de tags (2 por ejecución por defecto) y cuenta como una petición de red.',
      'Llamar al tag también aumenta su contador de usos.',
      'Se ignora (no devuelve nada) cuando se usa dentro del análisis de código o del JSON de componentes hijos.',
      'El tag llamado siempre cuenta como el tag de un usuario, aunque lo llame NotSoAI, así que `{isfromai}` es `false` dentro de él y las funciones exclusivas de NotSoAI no funcionan ahí.',
    ],
  },
  TAG_CONTENT: {
    summary: 'Devuelve el contenido sin procesar ni interpretar del tag actual.',
    description: 'Si el tag es un alias de otro tag, se devuelve el contenido del tag original.',
    results: [
      'Muestra el código del propio tag en un bloque de código',
    ],
    notes: [
      NOT_SAVED,
    ],
  },
  TAG_CREATE: {
    summary: 'Guarda un tag nuevo para la persona que se lo pidió a NotSoAI. Solo NotSoAI puede usar esto.',
    description: 'Crea un tag cuyo dueño es la persona que se lo pidió a NotSoAI, en el servidor actual (o MD), y devuelve su nombre. El contenido se interpreta como cualquier otro argumento, así que envuelve el TagScript en {ignore} para guardar el propio código en lugar de su resultado.',
    args: {
      name: 'El nombre del nuevo tag, de hasta 64 caracteres. Se guarda en minúsculas.',
      content: 'El contenido del tag, de hasta 2000 caracteres. Se usa todo lo que va después del primer `|`.',
    },
    results: [
      '`greet`, y al ejecutar `tag greet` saluda a quien lo ejecute',
    ],
    notes: [
      'Solo NotSoAI puede usar esto, y solo en su propia respuesta: en el tag de un usuario, o en un botón que hizo NotSoAI, la función se deja como texto normal.',
      'Solo crea tags nuevos. Da un error si ya existe un tag con ese nombre en el servidor, aunque sea uno tuyo.',
      'NotSoAI solo puede crear un tag por mensaje.',
      API_LIMIT,
    ],
  },
  TAG_ID: {
    summary: 'Devuelve el ID del tag actual.',
    results: [
      '',
    ],
    notes: [
      'No devuelve nada si no se ejecuta desde un tag guardado. Dentro de un tag llamado con `{tag}`, es el ID del tag llamado.',
    ],
  },
  TAG_NAME: {
    summary: 'Devuelve el nombre del tag actual.',
    results: [
      '',
    ],
    notes: [
      'No devuelve nada si no se ejecuta desde un tag guardado. Dentro de un tag llamado con `{tag}`, es el nombre del tag llamado.',
    ],
  },
  TAG_OWNER_ID: {
    summary: 'Devuelve el ID de usuario del dueño del tag actual.',
    results: [
      '',
      'Menciona al dueño del tag',
    ],
    notes: [
      NOT_SAVED,
    ],
  },
  TEXT: {
    summary: 'Descarga una URL y devuelve su contenido como texto.',
    args: {
      url: 'La URL que descargar.',
    },
    results: [
      'El contenido de file.txt',
      'El campo `name` de un archivo JSON descargado',
    ],
    notes: [
      ONE_REQUEST,
      'Da un error si el texto descargado haría que el resultado del tag superara el tamaño máximo de archivo adjunto del contexto actual.',
    ],
  },
  TEXT_FROM_HTML: {
    summary: 'Descarga una página web y devuelve su texto sin el HTML.',
    args: {
      url: 'La URL de la página que descargar.',
    },
    results: [
      'El texto legible de la página, sin etiquetas HTML',
    ],
    notes: [
      ONE_REQUEST,
      'Da un error si el texto haría que el resultado del tag superara el tamaño máximo de archivo adjunto del contexto actual.',
    ],
  },
  TIME_UNIX: {
    summary: 'Devuelve una marca de tiempo Unix en milisegundos, de ahora o de una hora que describas.',
    description: 'Sin argumento, devuelve la hora actual. Con argumento, lee lenguaje natural como "tomorrow at 5pm" o "in 2 hours", respecto a cuándo se envió el mensaje y usando la zona horaria del usuario.',
    args: {
      time: 'Una hora en palabras, p. ej. "in 3 days" o "next friday at noon".',
    },
    results: [
      '',
      'La marca de tiempo (ms) de dentro de una hora',
    ],
    notes: [
      TIME_UNKNOWN,
    ],
  },
  TIME_UNIX_FROM_SNOWFLAKE: {
    summary: 'Devuelve la fecha de creación (milisegundos Unix) de un ID de Discord.',
    description: 'Cada ID de Discord (usuarios, mensajes, canales, servidores, etc.) lleva incorporada su fecha de creación. Esto la saca.',
    args: {
      id: 'Cualquier ID de Discord.',
    },
    results: [
      'Cuándo se creó tu cuenta, en milisegundos Unix',
    ],
    notes: [
      'No devuelve nada con un argumento vacío.',
      'Si el argumento no es un número, la función se deja en el resultado como texto normal.',
    ],
  },
  TIME_UNIX_SECONDS: {
    summary: 'Devuelve una marca de tiempo Unix en segundos, de ahora o de una hora que describas.',
    description: 'Igual que `{unix}`, pero en segundos (redondeando hacia abajo), que es lo que usan las marcas de tiempo `<t:...>` de Discord.',
    args: {
      time: 'Una hora en palabras, p. ej. "tomorrow at 9am".',
    },
    results: [
      '',
      'Event starts in 5 days (como lo muestra Discord)',
    ],
    notes: [
      TIME_UNKNOWN,
    ],
  },
  TRANSCRIBE: {
    summary: 'Transcribe a texto lo que se habla en un clip de audio o vídeo.',
    description: 'Si no se da ninguna URL, se usa el audio/vídeo más reciente del chat (archivos adjuntos, respuestas, etc.). Si no se encuentra ninguno y el ajuste `MEDIA_AV_FALLBACK` está definido (p. ej. `{settings:MEDIA_AV_FALLBACK|search.youtube}`), se ejecuta esa función con el mismo argumento para buscar una URL.',
    args: {
      url: 'Un enlace a un archivo de audio o vídeo. Por defecto, el último audio/vídeo encontrado.',
    },
    results: [
      'El texto hablado del último audio/vídeo del chat',
      'El texto hablado de clip.mp3',
    ],
    notes: [
      ONE_REQUEST,
      'Si no se encuentra multimedia o la transcripción falla, no se devuelve nada (sin error).',
    ],
  },
  TRAVERSE_JSON: {
    summary: 'Saca un valor de un JSON usando una ruta como `cake[0].test`.',
    description: 'La ruta se divide en claves:\n\n`a.b` entra en la clave `a` y luego en la clave `b`.\n\n`a[0]` entra en la clave `a` y luego en el índice `0` del array.\n\n`a["some.key"]` o `a[\'some.key\']` usa una clave entre comillas, así que los puntos y corchetes de dentro se mantienen (usa `\\` para escapar una comilla).\n\nSi el valor encontrado es un objeto o un array, se devuelve como JSON; si no, se devuelve tal cual.',
    args: {
      path: 'Dónde buscar, p. ej. `data.items[2].name`.',
      json: 'El texto JSON en el que buscar. Todo lo que va después del primer `|`.',
    },
    results: [
      '',
      '',
      '',
    ],
    notes: [
      'Si la ruta no existe, no se devuelve nada.',
      'Un JSON no válido, una ruta vacía o que falte el `|` hace que la función falle.',
    ],
  },
  TYPE: {
    summary: 'Convierte texto en un número, con un valor alternativo opcional.',
    description: 'Los tipos admitidos son `number` (un número entero, leído con parseInt) y `float` (un número decimal, leído con parseFloat). La lectura se detiene en el primer carácter que no forma parte de un número, así que `12abc` pasa a ser `12`.',
    args: {
      type: '`number` o `float` (sin distinguir mayúsculas).',
      value: 'El texto que convertir.',
      default: 'Se usa si el valor no es un número.',
    },
    results: [
      '',
      '',
      '',
    ],
    notes: [
      'Si el valor no es un número y no hay valor por defecto, no se devuelve nada.',
      'Un tipo desconocido, un valor por defecto que no es un número o que falte el `|` hace que la función falle.',
    ],
  },
  USER_AVATAR: {
    summary: 'Devuelve la URL del avatar de un usuario.',
    description: 'Da el avatar global (de la cuenta) del usuario a 1024px.',
    args: {
      user: USER_LOOKUP,
    },
    results: [
      '',
      'Muestra el avatar del usuario dado como argumento',
    ],
    notes: [USER_LOOKUP_NOTE],
  },
  USER_DISCRIMINATOR: {
    summary: 'Devuelve el discriminador de un usuario (el antiguo número #0000).',
    args: {
      user: USER_LOOKUP,
    },
    results: [
      '',
      '',
    ],
    notes: [
      'Los usuarios con el sistema de nombres de usuario nuevo de Discord tienen un discriminador `0`.',
      USER_LOOKUP_NOTE,
    ],
  },
  USER_ID: {
    summary: 'Devuelve el ID de un usuario.',
    args: {
      user: USER_LOOKUP,
    },
    results: [
      '',
      'El ID del usuario dado como argumento',
    ],
    notes: [USER_LOOKUP_NOTE],
  },
  USER_MENTION: {
    summary: 'Devuelve una mención de un usuario.',
    args: {
      user: USER_LOOKUP,
    },
    results: [
      'Hey @tú!',
      'Menciona a un miembro al azar',
    ],
    notes: [USER_LOOKUP_NOTE],
  },
  USER_NAME: {
    summary: 'Devuelve el nombre de usuario de un usuario.',
    args: {
      user: USER_LOOKUP,
    },
    results: [
      '',
      'El nombre de usuario de ese usuario',
    ],
    notes: [
      'Es el nombre de usuario de la cuenta, no el apodo en el servidor. Para eso usa `{nick}`.',
      USER_LOOKUP_NOTE,
    ],
  },
  USER_NICK: {
    summary: 'Devuelve el nombre visible de un usuario, usando su apodo en el servidor si tiene uno.',
    args: {
      user: USER_LOOKUP,
    },
    results: [
      '',
    ],
    notes: [USER_LOOKUP_NOTE],
  },
  USER_RANDOM: {
    summary: 'Devuelve el nombre visible de un miembro del servidor al azar.',
    results: [
      '',
    ],
    notes: [
      MEMBER_LIST,
      RANDOM_DM,
    ],
  },
  USER_RANDOM_ID: {
    summary: 'Devuelve el ID de un miembro del servidor al azar.',
    results: [
      '',
      'Menciona a un miembro al azar',
    ],
    notes: [
      MEMBER_LIST,
      RANDOM_DM,
    ],
  },
  USER_RANDOM_ONLINE: {
    summary: 'Devuelve el nombre visible de un miembro al azar que tenga una presencia (en línea, ausente o no molestar).',
    results: [
      '',
    ],
    notes: [
      PRESENCE_CACHE,
      RANDOM_DM,
    ],
  },
  USER_RANDOM_ONLINE_ID: {
    summary: 'Devuelve el ID de un miembro al azar que tenga una presencia (en línea, ausente o no molestar).',
    results: [
      '',
    ],
    notes: [
      PRESENCE_CACHE,
      RANDOM_DM,
    ],
  },
  USER_RANDOM_ONLINE_TAG: {
    summary: 'Devuelve el tag de usuario completo de un miembro al azar que tenga una presencia (en línea, ausente o no molestar).',
    results: [
      '',
    ],
    notes: [
      PRESENCE_CACHE,
      RANDOM_DM,
    ],
  },
  USER_RANDOM_TAG: {
    summary: 'Devuelve el tag de usuario completo de un miembro del servidor al azar.',
    results: [
      '',
    ],
    notes: [
      MEMBER_LIST,
      RANDOM_DM,
    ],
  },
  USER_STATUS: {
    summary: 'Devuelve el estado de un miembro: online, idle, dnd u offline.',
    args: {
      user: USER_LOOKUP,
    },
    results: [
      '',
      '',
    ],
    notes: [
      'Solo funciona con miembros del servidor actual; no devuelve nada en MD ni con usuarios que no están en el servidor.',
      'Los miembros sin una presencia conocida aparecen como `offline`.',
      USER_LOOKUP_NOTE,
    ],
  },
  USER_TAG: {
    summary: 'Devuelve el tag completo de un usuario (nombre de usuario con discriminador).',
    args: {
      user: USER_LOOKUP,
    },
    results: [
      '',
    ],
    notes: [USER_LOOKUP_NOTE],
  },
  VARIABLES: {
    summary: 'Devuelve todas las variables de la ejecución actual como un objeto JSON.',
    description: 'Útil para depurar. El resultado incluye las variables que defines con `{set}` y también las internas que empiezan por `__` (como `__args` y los contadores de uso).',
    results: [
      '',
    ],
  },
  VARIABLES_CHANNEL: {
    summary: 'Devuelve las variables de canal guardadas del tag (para este canal) como un objeto JSON.',
    results: [
      '',
    ],
    notes: VARIABLES_STORAGE_NOTES,
  },
  VARIABLES_GLOBAL: {
    summary: 'Devuelve las variables globales guardadas del tag como un objeto JSON.',
    results: [
      '',
    ],
    notes: VARIABLES_STORAGE_NOTES,
  },
  VARIABLES_SERVER: {
    summary: 'Devuelve las variables de servidor guardadas del tag (para este servidor) como un objeto JSON.',
    results: [
      '',
    ],
    notes: VARIABLES_STORAGE_NOTES,
  },
  VARIABLES_USER: {
    summary: 'Devuelve las variables de usuario guardadas del tag (para la persona que usa el tag) como un objeto JSON.',
    results: [
      '',
    ],
    notes: VARIABLES_STORAGE_NOTES,
  },
};
