// tagDocs/functions/part2.ts in Spanish, keyed by function id

import type { TagDocsTranslation } from '../localize';


const REPEAT_AMOUNT = 'Opcional. Cuántas veces insertarlo. Tiene que ser un número entero mayor que 0.';

const REPEAT_AMOUNT_NOTES = [
  'Si la cantidad no es un número, la función se deja como texto normal.',
  'Una cantidad de 0 o menos (o una absurdamente grande) da un error.',
];

const STORAGE_TAG = 'Solo funciona al ejecutar un tag guardado. Si el tag es un alias, se usa el almacenamiento del tag original.';

const STORAGE_KEY = 'El nombre de la variable puede tener como mucho 128 caracteres; si no, da un error.';

const IMAGE = 'Opcional. La URL de una imagen, o algo que lleve a una imagen (como un usuario o un emoji). Si se omite, se usa la imagen más reciente del chat.';

const IMAGE_FALLBACK = 'Si no se encuentra ninguna imagen y el ajuste `MEDIA_IV_FALLBACK` está definido (mira `{settings}`), se ejecuta esa función alternativa con el mismo argumento para buscar una imagen.';

const GET_DEFAULT = 'Opcional. Lo que se devuelve si la variable no existe. Solo se evalúa cuando hace falta.';

const STORED_NAME = 'El nombre de la variable guardada. Las funciones de dentro se evalúan, y los espacios de alrededor se recortan.';

const NO_OUTPUT_IGNORED = 'No devuelve nada, y los fallos se ignoran sin avisar.';

const STORED_DELETE = 'El nombre de la variable guardada que eliminar.';

const NO_PIPE = 'Sin un `|`, la función se deja como texto normal.';

const ANOTHER_USER = 'Buscar a otro usuario cuenta como una petición de red.';

const USER_YOU = 'Opcional. Una mención, ID de usuario o nombre. Por defecto, tú.';

const EXIT_NOTES = [
  'También detiene el tag principal cuando se usa dentro de un tag llamado con `{tag}`.',
  '`{iferror}` y `{evalsilent}` no lo capturan: sigue deteniendo todo el tag.',
];


export const FUNCTIONS_SPANISH_2: TagDocsTranslation['functions'] = {
  IGNORE: {
    summary: 'Devuelve su contenido tal cual, sin ejecutar ninguna función de dentro.',
    description: 'Viene bien para mostrar código de TagScript literalmente, o para pasar código a algún sitio que lo ejecutará más tarde (como el script `run` de un componente).',
    args: {
      text: 'El texto que devolver sin tocar. Las llaves de dentro tienen que seguir equilibradas.',
    },
    results: [
      '',
      '',
    ],
  },
  NOTE: {
    summary: 'Un comentario. No devuelve nada y no ejecuta nada de su interior.',
    args: {
      text: 'Lo que quieras; se ignora por completo.',
    },
    results: [
      '',
    ],
  },
  CHANNEL_RANDOM_ID: {
    summary: 'Devuelve el ID de un canal al azar del servidor.',
    results: [
      '',
    ],
    notes: [
      'Elige entre todos los canales del servidor (incluidas categorías y canales de voz).',
      'En MD devuelve el ID del canal actual.',
    ],
  },
  CHANNEL_RANDOM_MENTION: {
    summary: 'Menciona un canal al azar del servidor.',
    results: [
      '',
    ],
    notes: [
      'Elige entre todos los canales del servidor (incluidas categorías y canales de voz).',
      'En MD menciona el canal actual.',
    ],
  },
  EMBED_JSON: {
    summary: 'Añade un embed a la respuesta del tag.',
    description: 'Recibe un objeto de embed de Discord en JSON, p. ej. `title`, `description`, `url`, `color` (un número), `timestamp`, `fields` (objetos con `name`, `value` e `inline`), `author`, `footer`, `image` y `thumbnail` (objetos con una `url`).',
    args: {
      json: 'Un objeto de embed en JSON. Primero se evalúan las funciones de dentro.',
    },
    results: [
      'Añade un embed naranja que saluda al usuario.',
      'Añade un embed que muestra tu avatar.',
    ],
    notes: [
      'Si el JSON no es válido, o el embed no tiene texto ni URL de imagen/miniatura/vídeo, la función se deja como texto normal.',
      '{newline} dentro de un string JSON se convierte en un salto de línea real.',
      'Un tag puede tener como mucho 10 embeds; pasarse da un error.',
    ],
  },
  EVAL: {
    summary: 'Evalúa su argumento una segunda vez.',
    description: 'El argumento se evalúa como cualquier otro argumento de función, y luego el resultado se vuelve a evaluar como TagScript. Así puedes construir código a partir de texto, por ejemplo con `{bracketleft}` y `{bracketright}`.',
    args: {
      code: 'El texto que evaluar.',
    },
    results: [
      'Tu nombre de usuario',
      'Un número al azar del 1 al 10',
    ],
  },
  EVAL_SILENT: {
    summary: 'Evalúa su argumento y se traga cualquier error.',
    description: 'A diferencia de `{eval}`, el argumento solo se evalúa una vez. Si algo de dentro da un error, se descarta el resultado de todo el bloque y el tag sigue adelante.',
    args: {
      code: 'El TagScript que ejecutar.',
    },
    results: [
      'Done (aunque no haya un 5.º archivo)',
    ],
    notes: [
      'Un `{exit}` o `{exitsilent}` de dentro no se traga: sigue deteniendo todo el tag.',
    ],
  },
  EXIT: {
    summary: 'Detiene el tag al momento y sustituye todo el resultado por un mensaje.',
    description: 'Todo lo producido hasta ese momento (texto, embeds, archivos, páginas y componentes) se descarta y la respuesta pasa a ser el mensaje dado.',
    args: {
      message: 'Opcional. El texto con el que responder. Por defecto, `Tag Exited`.',
    },
    results: [
      'Please give me some text! (cuando no se dan argumentos)',
      '',
    ],
    notes: EXIT_NOTES,
  },
  EXIT_SILENT: {
    summary: 'Detiene el tag al momento, conservando todo lo que se ha devuelto hasta entonces.',
    args: {
      message: 'Opcional. Texto que se añade al final del resultado antes de parar.',
    },
    results: [
      '',
    ],
    notes: EXIT_NOTES,
  },
  GUILD: {
    summary: 'Devuelve el nombre del servidor.',
    results: [
      '',
    ],
    notes: [
      'En MD devuelve `Direct Message`.',
    ],
  },
  GUILD_COUNT: {
    summary: 'Devuelve cuántos miembros tiene el servidor.',
    results: [
      '',
    ],
    notes: [
      'En MD devuelve `2`.',
    ],
  },
  GUILD_ID: {
    summary: 'Devuelve el ID del servidor.',
    results: [
      '',
    ],
    notes: [
      'En MD devuelve `0`.',
    ],
  },
  IMAGE_INTERROGATE: {
    summary: 'Describe una imagen con IA, devolviendo un prompt corto con lo que muestra.',
    args: {
      image: IMAGE,
    },
    results: [
      'Una descripción de la última imagen del chat, p. ej. "a cat sitting on a laptop keyboard"',
      'Una descripción de tu avatar',
    ],
    notes: [
      'Cuenta como una petición de red.',
      'Si no se encuentra ninguna imagen o la petición falla, no se devuelve nada.',
      IMAGE_FALLBACK,
    ],
  },
  IMAGE_OCR: {
    summary: 'Lee el texto de una imagen (OCR) y lo devuelve.',
    args: {
      image: IMAGE,
    },
    results: [
      'El texto encontrado en la última imagen del chat',
      'El texto de la leyenda, cuando el bot funciona',
    ],
    notes: [
      'Cuenta como una petición de red.',
      'Si no se encuentra ninguna imagen, no se detecta texto o la petición falla, no se devuelve nada.',
      IMAGE_FALLBACK,
    ],
  },
  INSERT_BRACKET_LEFT: {
    summary: 'Devuelve una `{` literal.',
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
    summary: 'Devuelve una `}` literal.',
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
    summary: 'Devuelve un salto de línea.',
    description: 'Útil donde un salto de línea normal se recortaría, como al principio o al final del argumento de una función.',
    args: {
      amount: REPEAT_AMOUNT,
    },
    results: [
      '',
      'Top, tres saltos de línea y luego Bottom',
    ],
    notes: [
      ...REPEAT_AMOUNT_NOTES,
      'Se inserta como un carácter interno provisional que se convierte en un salto de línea cuando termina el tag, así que sobrevive a los recortes de por medio. Dentro de los strings JSON de {embedjson}, {pagejson} y {componentjson} también se convierte en un salto de línea.',
    ],
  },
  INSERT_SPLITTER_ARGUMENT: {
    summary: 'Devuelve un `|` literal (el separador de argumentos).',
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
    summary: 'Devuelve un `:` literal (el separador de funciones).',
    args: {
      amount: REPEAT_AMOUNT,
    },
    results: [
      '',
    ],
    notes: REPEAT_AMOUNT_NOTES,
  },
  JSON_CHANNEL: {
    summary: 'Devuelve un canal como objeto JSON.',
    description: 'El objeto usa los nombres de campo de Discord, como `id`, `name`, `type`, `guild_id`, `parent_id`, `position`, `nsfw`, `permission_overwrites` y (en canales de texto) `topic`.',
    args: {
      channel: 'Opcional. Un canal de este servidor, por mención, ID o nombre. Por defecto, el canal actual.',
    },
    results: [
      '',
      '',
    ],
    notes: [
      'Si no coincide ningún canal, no se devuelve nada.',
      'Si el canal actual no está en caché, se obtiene, lo que cuenta como una petición de red.',
    ],
  },
  JSON_GUILD: {
    summary: 'Devuelve el servidor actual como objeto JSON.',
    description: 'Incluye los datos del servidor (como `id`, `name`, `owner_id`), junto con sus miembros y una lista `presences` construida a partir de las presencias de los miembros.',
    results: [
      '',
    ],
    notes: [
      'En servidores muy grandes (de más de 10.000 miembros) solo se incluyen en `members` tú, el bot y los miembros que están en canales de voz.',
      'En MD no se devuelve nada.',
    ],
  },
  JSON_MEMBER: {
    summary: 'Devuelve un miembro del servidor como objeto JSON.',
    description: 'El objeto usa los nombres de campo de Discord, como `user`, `nick`, `joined_at`, `premium_since`, `roles` (objetos de rol completos), `hoisted_role`, `communication_disabled_until`, `avatar` y `permissions`.',
    args: {
      user: USER_YOU,
    },
    results: [
      'Tu apodo',
      'El objeto de miembro de Cake',
    ],
    notes: [
      ANOTHER_USER,
      'Si el usuario no es miembro de este servidor (o estás en MD), no se devuelve nada.',
    ],
  },
  JSON_MEMBER_OR_USER: {
    summary: 'Devuelve un miembro como JSON, o un usuario si no está en el servidor.',
    description: 'Da el mismo objeto que `{json.member}` cuando es posible y, si no, usa el objeto de usuario de `{json.user}` (por ejemplo en MD).',
    args: {
      user: USER_YOU,
    },
    results: [
      'Tu objeto de miembro, o tu objeto de usuario en MD',
    ],
    notes: [
      ANOTHER_USER,
      'Si no coincide nadie, no se devuelve nada.',
    ],
  },
  JSON_MESSAGE: {
    summary: 'Devuelve un mensaje como objeto JSON.',
    description: 'El objeto usa los nombres de campo de Discord, como `id`, `content`, `author`, `member`, `attachments`, `embeds`, `components`, `mentions`, `reactions`, `timestamp`, `edited_timestamp` y `referenced_message`.',
    args: {
      messageId: 'Opcional. El ID de un mensaje del canal actual. Por defecto, el mensaje que ejecutó el tag.',
    },
    results: [
      'El contenido del mensaje que ejecutó el tag',
      'El último mensaje del canal como JSON',
    ],
    notes: [
      'Solo se pueden obtener mensajes del canal actual.',
      'Cuando se da un ID, necesitas los permisos Ver canal y Leer el historial de mensajes en el canal, y el bot también; si no, da un error.',
      'Obtener un mensaje que no está en caché cuenta como una petición de red. Si no se encuentra, no se devuelve nada.',
      'Sin ID, no se devuelve nada cuando el tag se ejecutó con un comando de barra.',
    ],
  },
  JSON_MESSAGE_REPLY: {
    summary: 'Devuelve el mensaje al que se responde como objeto JSON.',
    description: 'Con la misma forma que `{json.message}`, pero para el mensaje al que respondió el mensaje del tag.',
    results: [
      'El nombre de usuario de quien escribió el mensaje al que se responde',
    ],
    notes: [
      'No devuelve nada si el mensaje no es una respuesta, o cuando el tag se ejecutó con un comando de barra.',
    ],
  },
  JSON_ROLE: {
    summary: 'Devuelve un rol del servidor como objeto JSON.',
    description: 'El objeto usa los nombres de campo de Discord, como `id`, `name`, `color`, `colors`, `position`, `permissions`, `hoist`, `mentionable`, `managed`, `icon` y `unicode_emoji`, además de `member_count`, cuántos de los miembros del servidor en caché tienen el rol.',
    args: {
      role: 'Opcional. Una mención, ID o nombre de rol. Por defecto, tu rol más alto.',
    },
    results: [
      'El nombre de tu rol más alto',
      'Cuántos miembros tienen el rol Moderator',
    ],
    notes: [
      'Los nombres se comparan primero con el principio del nombre del rol y después con cualquier parte de él.',
      '`member_count` solo cuenta los miembros en caché, así que en servidores grandes puede ser menor que el número real.',
      'No devuelve nada fuera de un servidor, o si no coincide ningún rol.',
    ],
  },
  JSON_USER: {
    summary: 'Devuelve un usuario como objeto JSON.',
    description: 'El objeto usa los nombres de campo de Discord, como `id`, `username`, `global_name`, `discriminator`, `avatar`, `bot`, `system` y `public_flags`.',
    args: {
      user: USER_YOU,
    },
    results: [
      'Tu nombre visible',
      '',
    ],
    notes: [
      ANOTHER_USER,
      'Si no coincide nadie, no se devuelve nada.',
    ],
  },
  LOGICAL_AND: {
    summary: 'Devuelve el último valor solo si ningún valor está vacío.',
    description: 'Cada valor se evalúa en orden. En cuanto uno sale vacío, se detiene y no devuelve nada. Si ninguno está vacío, se devuelve el último.',
    args: {
      'value1|value2|...': 'Dos o más valores, separados por `|`. Se evalúan de izquierda a derecha, solo hasta donde hace falta.',
    },
    results: [
      'You said hi (o nada si no se dieron argumentos)',
      '(nada)',
    ],
    notes: [
      NO_PIPE,
    ],
  },
  LOGICAL_DELETE: {
    summary: 'Elimina una variable definida con `{set}`.',
    args: {
      name: 'El nombre de la variable que eliminar.',
    },
    results: [
      '',
    ],
    notes: [
      'No devuelve nada.',
      'Los nombres que empiezan por `__` son privados y no se pueden eliminar. Los nombres de más de 64 caracteres dan un error.',
    ],
  },
  LOGICAL_DELETE_CHANNEL: {
    summary: 'Elimina una variable guardada para este canal con `{setchannel}`.',
    args: {
      name: STORED_DELETE,
    },
    results: [
      'Quita el "highscore" guardado de este canal.',
    ],
    notes: [
      NO_OUTPUT_IGNORED,
      STORAGE_TAG,
      STORAGE_KEY,
    ],
  },
  LOGICAL_DELETE_SERVER: {
    summary: 'Elimina una variable guardada para este servidor con `{setserver}`.',
    args: {
      name: STORED_DELETE,
    },
    results: [
      'Quita el "counter" guardado de este servidor.',
    ],
    notes: [
      NO_OUTPUT_IGNORED,
      'En MD se usa el canal en lugar del servidor.',
      STORAGE_TAG,
      STORAGE_KEY,
    ],
  },
  LOGICAL_DELETE_USER: {
    summary: 'Elimina una variable guardada para ti con `{setuser}`.',
    args: {
      name: STORED_DELETE,
    },
    results: [
      'Quita tus "coins" guardadas.',
    ],
    notes: [
      NO_OUTPUT_IGNORED,
      'Siempre afecta a la persona que usa el tag.',
      STORAGE_TAG,
      STORAGE_KEY,
    ],
  },
  LOGICAL_FOR_EACH: {
    summary: 'Ejecuta código una vez por cada elemento de una lista, o un número fijo de veces.',
    description: 'Se evalúa el primer valor, y luego:\n\n'
      + '- un número entero ejecuta el código ese número de veces;\n'
      + '- un array JSON lo ejecuta una vez por elemento;\n'
      + '- un objeto JSON lo ejecuta una vez por clave;\n'
      + '- un string JSON se divide en palabras (como los argumentos de un comando; las comillas mantienen palabras juntas) y se ejecuta una vez por palabra.\n\n'
      + 'Dentro del código, `{get:idx}` es el índice actual (o la clave del objeto) y `{get:valuex}` es el elemento actual (los objetos y arrays salen como JSON). El resultado de cada vuelta se une con el resto sin nada entre medias.',
    args: {
      list: 'Un número, o un array/objeto/string JSON que recorrer.',
      code: 'El TagScript que ejecutar por cada elemento. Todo lo que va después del primer `|` forma parte del código.',
    },
    results: [
      '',
      '',
      'x:1 e y:2 en líneas separadas',
    ],
    notes: [
      'Como mucho 200 vueltas; más da un error.',
      'Si la lista es JSON no válido, está vacía o es cualquier otra cosa, no se devuelve nada.',
      NO_PIPE,
    ],
  },
  LOGICAL_GET: {
    summary: 'Devuelve el valor de una variable definida con `{set}`.',
    args: {
      name: 'El nombre de la variable. Las funciones de dentro se evalúan, y los espacios de alrededor se recortan.',
      default: GET_DEFAULT,
    },
    results: [
      '',
      '',
      '[{"filename":"image.png"}] (los archivos adjuntos a la respuesta hasta ahora)',
    ],
    notes: [
      'Los nombres de más de 64 caracteres dan un error.',
      'El nombre especial `__files` devuelve un array JSON con los archivos del tag (`filename` y `description`).',
      'Si la variable no existe y no se da un valor por defecto, no se devuelve nada.',
    ],
  },
  LOGICAL_GET_CHANNEL: {
    summary: 'Devuelve una variable guardada para este canal con `{setchannel}`.',
    description: 'Las variables guardadas se conservan entre usos del tag. Las variables de canal las comparten todos los que usan el tag en este canal.',
    args: {
      name: STORED_NAME,
      default: GET_DEFAULT,
    },
    results: [
      '',
    ],
    notes: [
      STORAGE_TAG + ' Si no, no se devuelve nada.',
      STORAGE_KEY,
    ],
  },
  LOGICAL_GET_FILE_NAME: {
    summary: 'Devuelve el nombre de archivo de uno de los archivos del tag.',
    args: {
      number: 'Qué archivo, empezando por 1 para el primero.',
    },
    results: [
      'El nombre del primer archivo, p. ej. image.png',
    ],
    notes: [
      'Una entrada vacía o que no es un número deja la función como texto normal.',
      'Un número de archivo que no existe da un error.',
    ],
  },
  LOGICAL_GET_GLOBAL: {
    summary: 'Devuelve una variable global guardada con `{setglobal}`.',
    description: 'Las variables globales pertenecen al propio tag y las comparten todos, en todos los servidores.',
    args: {
      name: STORED_NAME,
      default: GET_DEFAULT,
    },
    results: [
      '',
    ],
    notes: [
      STORAGE_TAG + ' Si no, no se devuelve nada.',
      STORAGE_KEY,
    ],
  },
  LOGICAL_GET_SERVER: {
    summary: 'Devuelve una variable guardada para este servidor con `{setserver}`.',
    description: 'Las variables de servidor las comparten todos los que usan el tag en este servidor.',
    args: {
      name: STORED_NAME,
      default: GET_DEFAULT,
    },
    results: [
      '',
    ],
    notes: [
      'En MD se usa el canal en lugar del servidor.',
      STORAGE_TAG + ' Si no, no se devuelve nada.',
      STORAGE_KEY,
    ],
  },
  LOGICAL_GET_USER: {
    summary: 'Devuelve una variable guardada para ti con `{setuser}`.',
    description: 'Las variables de usuario son distintas para cada persona que usa el tag, y la acompañan de un servidor a otro.',
    args: {
      name: STORED_NAME,
      default: GET_DEFAULT,
    },
    results: [
      '',
    ],
    notes: [
      'Siempre lee la variable de la persona que usa el tag.',
      STORAGE_TAG + ' Si no, no se devuelve nada.',
      STORAGE_KEY,
    ],
  },
  LOGICAL_INCLUDES: {
    summary: 'Devuelve `true` si el texto coincide con alguno de los valores dados y, si no, `false`.',
    description: 'El primer valor se compara en orden con cada uno de los demás (coincidencia exacta, distinguiendo mayúsculas).',
    args: {
      'text': 'El texto que buscar. Las funciones de dentro se evalúan, igual que los valores.',
      'value1|value2|...': 'Los valores con los que comparar. Se evalúan uno a uno hasta encontrar una coincidencia.',
    },
    results: [
      '',
      'true cuando los argumentos son "yes" o "Y"',
      '',
    ],
    notes: [
      NO_PIPE,
    ],
  },
  LOGICAL_IF: {
    summary: 'Compara dos valores y ejecuta `then:` o `else:` según el resultado.',
    description: 'Comparaciones: `=` igual, `!=` distinto, `>` `>=` `<` `<=` comparaciones numéricas (se admiten decimales), `~`, que compara números por su valor o texto sin distinguir mayúsculas, y `?`, que comprueba si el primer valor coincide con la regex del segundo valor (sin distinguir mayúsculas).\n\n'
      + 'Después de los dos valores, da hasta tres ramas que empiecen por `then:`, `else:` o `finally:`, en cualquier orden. Solo se evalúa la rama que coincide, y después se evalúa `finally:` (si se da) y se añade detrás.',
    args: {
      'value1': 'El primer valor que comparar.',
      'comparison': 'Uno de `=`, `!=`, `>`, `>=`, `<`, `<=`, `~`, `?`. Escríbelo sin espacios alrededor.',
      'value2': 'El segundo valor que comparar.',
      'then:code': 'Lo que se devuelve cuando la comparación es cierta.',
      'else:code': 'Lo que se devuelve cuando la comparación es falsa.',
      'finally:code': 'Siempre se evalúa y se devuelve después de then/else (sin el prefijo `finally:`).',
    },
    results: [
      'Hi there! (cuando el argumento es "hello")',
      'High o Low',
      '',
      'Hey! (cuando el argumento es "hi" o "Hello")',
      '',
    ],
    notes: [
      '`>`, `>=`, `<` y `<=` son falsos si alguno de los valores no es un número.',
      '`?` coincide en cualquier parte del texto salvo que la regex use `^` y `$`. Escapa `|` como `\\|` dentro de la regex. Una regex no válida, o una que tarda demasiado, da un error.',
      'Hace falta al menos una rama, y cada rama solo puede aparecer una vez (una repetida da un error).',
      'Las ramas tienen que empezar exactamente por `then:`, `else:` o `finally:` (sin espacios delante), y la comparación tiene que ser un operador válido; si no, la función se deja como texto normal.',
    ],
  },
  LOGICAL_IF_ERROR: {
    summary: 'Devuelve el primer valor que no da un error.',
    description: 'Prueba cada valor en orden. Si al evaluar uno hay un error, se descarta su resultado y se prueba el siguiente, con `{get:error}` puesto al mensaje de ese error. Si todos dan error, no se devuelve nada.',
    args: {
      'code1|code2|...': 'Valores que probar, separados por `|`.',
    },
    results: [
      'No third file! (cuando hay menos de 3 archivos)',
      'El error de la descarga, cuando el enlace no funciona',
    ],
    notes: [
      'Con un solo valor (sin `|`), se evalúa y se devuelve, o no se devuelve nada si da error.',
      'Un `{exit}` o `{exitsilent}` de dentro no se captura: sigue deteniendo todo el tag.',
      '`error` solo existe dentro del `{iferror}`; después vuelve a lo que era antes.',
    ],
  },
  LOGICAL_IS_FROM_AI: {
    summary: 'Devuelve `true` si el código lo escribió NotSoAI y, si no, `false`.',
    description: 'Es cierto cuando el código que se ejecuta es la respuesta de NotSoAI (del comando de IA, o una respuesta de `{ai}` que se ejecuta como código), y falso en el tag de un usuario, incluido un tag que NotSoAI llama con `{tag}`. Es la misma comprobación que usan las funciones exclusivas de NotSoAI.',
    results: [
      'false (en el tag de un usuario)',
    ],
  },
  LOGICAL_IS_FROM_COMPONENT: {
    summary: 'Devuelve `true` si el código se ejecuta por un componente (al usar un botón o menú de selección, o porque caducó un componente) y, si no, `false`.',
    results: [
      'Click the button below. (la primera vez que se ejecuta)',
    ],
  },
  LOGICAL_IS_MAIN_TAG: {
    summary: 'Devuelve `true` si este es el tag que se ejecutó directamente, o `false` si se llamó desde otro tag con `{tag}`.',
    results: [
      '',
    ],
  },
  LOGICAL_OR: {
    summary: 'Devuelve el primer valor que no esté vacío.',
    description: 'Cada valor se evalúa en orden y se devuelve el primero que no esté vacío. Los valores posteriores no se evalúan. Si todos están vacíos, no se devuelve nada.',
    args: {
      'value1|value2|...': 'Valores que probar, separados por `|`.',
    },
    results: [
      'Hello stranger! (cuando no se dan argumentos)',
      'La primera de esas variables que esté definida',
    ],
    notes: [
      'Con un solo valor (sin `|`), se evalúa y se devuelve.',
    ],
  },
};
