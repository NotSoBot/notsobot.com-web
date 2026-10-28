// Notes that many functions share word for word in English, so they read the same in Spanish too.

export const ONLY_NOTSOAI = 'Solo NotSoAI puede usar esto. En el tag de un usuario (o en un tag que NotSoAI llama con {tag}) la función se deja como texto normal. También se deja como texto normal al ejecutarse desde un botón o menú que hizo NotSoAI, ya que otra persona podría pulsarlo. También se deja como texto normal cuando el prompt de NotSoAI tenía texto de otra persona (un mensaje de otro al que respondió, un enlace, un archivo que no subió el propio usuario o la opción `url`, también antes en la conversación), y en código que solo existe al ejecutarse, como una respuesta de `{ai}` o lo que ejecutan `{eval}` y `{evalsilent}`.';
export const MEMORY_PERMANENT = 'Esto cambia de forma permanente lo que NotSoAI recuerda de la persona que se lo pidió, no solo en esta ejecución.';
export const NETWORK = 'Cuenta para el límite de peticiones de red.';
export const API_LIMIT = 'Cuenta para el límite de acciones de la API (1 por ejecución por defecto) y para el límite de peticiones de red.';
export const EMPTY_ARGUMENT = 'Un argumento vacío no devuelve nada.';
export const EMPTY_QUERY = 'Una búsqueda vacía no devuelve nada.';
export const QUERY_1024 = 'La búsqueda (solo se usan los primeros 1024 caracteres).';
export const CACHED_QUERY = 'Cuenta para el límite de peticiones de red. Repetir la misma búsqueda en una ejecución reutiliza el resultado guardado sin volver a contar.';
export const SAFE_SEARCH = 'SafeSearch está activado salvo que el canal permita contenido NSFW.';
export const OUT_OF_RANGE = 'Si el índice está fuera de rango, no se devuelve nada.';
export const NOT_A_NUMBER = 'Si el índice no es un número, la función se deja tal cual en el resultado.';
export const START_INDEX = 'Índice (desde 0) por el que empezar; por defecto 0. Los números negativos cuentan desde el final.';
export const END_INDEX = 'Índice antes del que parar (no incluido); por defecto, el número de argumentos. Los números negativos cuentan desde el final.';
export const CHANNEL_ARG = 'Una mención, ID o nombre de un canal de este servidor. Por defecto, el canal actual.';
export const CHANNEL_MATCH = 'Solo se encuentran canales del servidor actual. Los nombres se comparan sin distinguir mayúsculas.';
export const NO_CHANNEL = 'No devuelve nada si no se encuentra ningún canal.';
export const USER_ARG = 'Una mención, ID o nombre que buscar. Por defecto, quien usó el tag.';
export const ATTACHMENT_LIMIT = 'Cuenta para el límite de archivos adjuntos (10 por ejecución por defecto). Si los archivos adjuntos están desactivados en esta ejecución, la función se deja tal cual.';
