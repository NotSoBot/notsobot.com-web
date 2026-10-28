// The MediaScript guide (MEDIASCRIPT_GUIDE in tagDocs/mediascript.ts) in Spanish, keyed by section id.
// Table cells left '' keep the English one (syntax, codes, Vegas and Movie Maker effect names).

import { MEDIASCRIPT_GUIDE } from '../mediascript';
import type { TagDocsTranslation } from '../localize';


// the TTS voice descriptions are all built from the same few words, so they're translated by phrase
// (a voice added in English then comes out translated too, as long as it uses the same words)
const VOICE_PHRASES: Array<[RegExp, string]> = [
  [/^Formant synthesizer you can steer with ARPABET phonemes, pitch and voice controls\. See the Klattsch section\.$/, 'Sintetizador de formantes que puedes controlar con fonemas ARPABET, tono y controles de voz. Mira la sección de Klattsch.'],
  [/\. The default voice\.$/, '. La voz por defecto.'],
  [/^Character: /, 'Personaje: '],
  [/^Classic SAPI: /, 'SAPI clásico: '],
  [/\bcreator: /, 'creador: '],
  [/\bEnglish \(US\)/, 'inglés (EE. UU.)'],
  [/\bEnglish \(UK\)/, 'inglés (Reino Unido)'],
  [/\bEnglish \(Australia\)/, 'inglés (Australia)'],
  [/\bEnglish\b/, 'inglés'],
  [/\bPortuguese \(Brazil\)/, 'portugués (Brasil)'],
  [/\bSpanish \(Mexico\)/, 'español (México)'],
  [/\bSpanish \(Latin America\)/, 'español (Latinoamérica)'],
  [/\bSpanish\b/, 'español'],
  [/\bGerman\b/, 'alemán'],
  [/\bFrench\b/, 'francés'],
  [/\bIndonesian\b/, 'indonesio'],
  [/\bJapanese\b/, 'japonés'],
  [/\bKorean\b/, 'coreano'],
  [/\bfemale, emotional\b/, 'mujer, emotiva'],
  [/\bfemale, beauty guru\b/, 'mujer, gurú de belleza'],
  [/\bfemale, rich girl\b/, 'mujer, chica rica'],
  [/\bfemale, empathetic\b/, 'mujer, empática'],
  [/\bmale, serious\b/, 'hombre, serio'],
  [/\bmale, funny\b/, 'hombre, gracioso'],
  [/\bmale, the Grinch\b/, 'hombre, el Grinch'],
  [/\bmale, story narrator\b/, 'hombre, narrador de cuentos'],
  [/\bmale, butler\b/, 'hombre, mayordomo'],
  [/\bmale, neighbor\b/, 'hombre, vecino'],
  [/\bsinging\b/, 'cantando'],
  [/\bfemale\b/, 'mujer'],
  [/\bmale\b/, 'hombre'],
  [/^Personaje: Pirate$/, 'Personaje: Pirata'],
];

function translateVoice(description: string): string {
  let text = description;
  for (const [pattern, replacement] of VOICE_PHRASES) {
    text = text.replace(pattern, replacement);
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const TTS_ROWS = (MEDIASCRIPT_GUIDE.find((section) => section.id === 'ms-tts')?.table?.rows ?? [])
  .map(([, description]) => ['', (description) ? translateVoice(description) : '']);


export const MEDIASCRIPT_GUIDE_SPANISH: TagDocsTranslation['mediaScriptGuide'] = {
  'ms-overview': {
    title: '¿Qué es MediaScript?',
    body: [
      'MediaScript es un pequeño lenguaje de scripts para editar imágenes, GIFs, audio y vídeo dentro de un tag. Lo escribes dentro de una de tres funciones de TagScript, y NotSoBot lo ejecuta en sus servidores de multimedia y te devuelve el archivo terminado.',
      '`{mediascript:CODE}` (también `{mscript}`, `{imagescript}`, `{iscript}`) adjunta el resultado a la respuesta del tag. Cuenta para los 10 archivos adjuntos de la respuesta y solo funciona donde el tag puede adjuntar archivos.',
      '`{mediascripturl:CODE}` (también `{mscripturl}`, `{imagescripturl}`, `{iscripturl}`) sube el resultado y pone su enlace en el texto del tag. El enlace caduca a los 7 días. Úsalo cuando quieras pasar el resultado a otra cosa, como `{attach:}` o la imagen de un embed.',
      '`{mediascriptmaybeurl:CODE}` (también `{mscriptmaybeurl}`, `{imagescriptmaybeurl}`, `{iscriptmaybeurl}`) adjunta el resultado cuando puede, y te da un enlace cuando tiene que subirlo (por ejemplo cuando es demasiado grande para adjuntarlo).',
      'Cada llamada a MediaScript cuenta como una petición de red para el límite de 15 del tag. Un script puede tener como mucho 300 líneas no vacías, y toda la multimedia que tenga a la vez debe quedarse por debajo de 300 MB.',
      'Las reglas de un vistazo: un comando por línea; la primera palabra es el comando y el resto son sus argumentos, separados por espacios; las líneas que empiezan por `#` son comentarios; cualquier texto que pueda tener espacios, saltos de línea o caracteres especiales debería ir envuelto en `{jsonify:...}`.',
    ].join('\n\n'),
    results: [
      'Adjunta una copia invertida de la imagen o el vídeo más reciente.',
      'Sube un avatar con deepfry y lo muestra dentro de un embed.',
    ],
  },

  'ms-media-keys': {
    title: 'Claves de multimedia, cargar y renderizar',
    body: [
      'Cada elemento multimedia de un script vive bajo un nombre que eliges tú, llamado clave de multimedia (media key), como `img`, `pfp` o `background`. `load URL KEY` descarga una imagen, un GIF, un archivo de audio o un vídeo en esa clave. Después, la mayoría de comandos reciben la clave como primer argumento y cambian esa multimedia directamente. Los comandos que crean multimedia nueva (`create`, `tti`, `tts`, `imagine`, `qrcode`, `clone` y compañía) la guardan bajo la clave que les des.',
      'Usa solo letras normales (y dígitos) para las claves. Cada clave recibe automáticamente variables de tamaño con su nombre (mira Variables), así que una clave llamada `img` te da `imgw`, `imgh`, `imgd` y `imgfc`.',
      'La URL de `load` suele ser una función de TagScript como `{iv}`, `{image}`, `{video}`, `{audio}` o `{avatar}`, pero funciona cualquier enlace directo a multimedia. Añade `true` como tercer argumento (`AUDIO_PRIORITY`) para preferir el audio cuando el enlace tiene las dos cosas.',
      'También puedes cargar archivos que el tag ya haya adjuntado, como el resultado de un `{mediascript}` anterior, una ejecución de `{python}` o `{attach:}`. `FILE_1` es el primer archivo adjunto del tag hasta ese momento, `FILE_2` el segundo, y así sucesivamente. `FILE_X` coge el archivo y lo quita de los archivos adjuntos de la respuesta; `FILE_X_COPY` lo usa y además lo mantiene adjunto. TagScript sustituye cada `FILE_X` de tu código antes de que se ejecute, así que evita escribir esa palabra en los subtítulos.',
      '`render KEY MIMETYPE` termina el script y envía `KEY` como resultado. Todo lo que vaya después de `render` se ignora. El mimetype es opcional: omítelo (o escribe `default`) para mantener el formato actual de la multimedia, o elige uno de la tabla para convertirla. También puedes añadir un nombre de archivo después del mimetype. Si un script nunca llama a `render`, la primera clave de multimedia que creó se renderiza automáticamente en su propio formato.',
    ].join('\n\n'),
    table: {
      columns: ['Tipo', 'Mimetypes a los que puedes renderizar'],
      rows: [
        ['', ''],
        ['Imagen', ''],
        ['Vídeo', ''],
      ],
    },
    results: [
      'Coge el avatar adjunto (quitándolo de la respuesta) y en su lugar envía un PNG volteado.',
      'Convierte el último vídeo del chat en un GIF.',
    ],
  },

  'ms-arguments': {
    title: 'Argumentos y ecuaciones',
    body: [
      'Los argumentos se leen en el orden en que los lista el comando, separados por espacios. En esta referencia, `NAME=value` significa que el argumento es opcional y que se usa `value` si lo omites, `NAME?` significa opcional sin un valor por defecto fijo, y `...NAME` significa "el resto de la línea".',
      'También puedes dar un argumento por su nombre con `NAME=value`, usando los nombres de esta referencia. Los nombres ignoran mayúsculas y guiones bajos, así que `SAMPLE_RATE=`, `sample_rate=` y `samplerate=` son lo mismo. Los argumentos sin nombre rellenan, en orden, los que no nombraste. Por ejemplo, para desactivar el recorte circular de `spin` puedes escribir `spin img circle=false` en lugar de `spin img true false`. Un argumento con un nombre que el comando no tiene es un error, y `NAME=` solo mantiene el valor por defecto.',
      'El texto que ocupa el resto de la línea mantiene cualquier `word=value` como texto normal, salvo que la palabra sea el nombre de uno de los argumentos anteriores del comando. Envuelve el texto en `{jsonify:}` (o `text="..."`) para ir sobre seguro. Un string JSON entre comillas como `"two words"` siempre se lee como un solo argumento.',
      'Lo que escribe el usuario, como `{args}`, se pega antes de que se ejecute el script, así que `magik img {args}` deja al usuario dar cualquiera de los argumentos del comando (`2 scale=10` da tanto ITERATIONS como SCALE), aunque cada uno tiene que seguir dentro de su rango. Para limitarlo a un argumento, envuélvelo en `{jsonify:}` y ponle nombre: `magik img iterations={jsonify:{args}}`. Así lo que escriba siempre se queda como un único valor para ese argumento y nunca puede dar otro.',
      'Los argumentos de sí/no aceptan `true`, `yes`, `y`, `+`, `1` o el propio nombre del argumento (como `join a b vertical`) para el sí. Cualquier otra cosa cuenta como no.',
      'Cualquier número también puede ser una ecuación, y las ecuaciones pueden usar variables y funciones. Las ecuaciones no pueden tener espacios, porque un espacio empieza el siguiente argumento: escribe `(imgw/2)-(textw/2)`, no `(imgw / 2) - (textw / 2)`.',
      'Las ecuaciones admiten `+`, `-`, `*`, `/`, paréntesis y números decimales. El motor también entiende `%` (resto) y `^` (potencia).',
    ].join('\n\n'),
    table: {
      columns: ['Operador', 'Significado'],
      rows: [
        ['', 'Sumar, restar'],
        ['', 'Multiplicar, dividir'],
        ['', 'Agrupar partes de una ecuación'],
        ['', 'Resto, p. ej. `idx%7`'],
        ['', 'Potencia, p. ej. `2^3` es 8'],
      ],
    },
    results: [
      'Recorta la mitad central de la imagen.',
      'Gira el avatar sin recortarlo en círculo, sin tener que rellenar antes CLOCKWISE.',
      'Aplica magik a la imagen tantas veces como diga el usuario. Lo que escriba solo puede dar ITERATIONS.',
    ],
  },

  'ms-variables': {
    title: 'Variables',
    body: [
      'Cada clave de multimedia recibe cuatro variables automáticas, con el nombre de la clave seguido de una letra (sin guion bajo): `KEYw`, `KEYh`, `KEYd` y `KEYfc`. Se actualizan cada vez que cambia la multimedia.',
      '`set NAME VALUE` guarda un número (VALUE puede ser una ecuación) y `get KEY PROPERTY NAME` copia una propiedad de una clave de multimedia en una variable. Después, las dos se pueden usar en cualquier ecuación posterior. Los nombres de variable solo pueden usar letras, dígitos y guiones bajos.',
      'Para devolver números a TagScript, usa `export NAME` (o `export NAME ALIAS` para renombrarlo) y `exportmultiple NAME1 NAME2 ...`. Cuando el script termina, cada variable exportada se guarda con el `{set:}` de TagScript, así que después la lees con `{get:NAME}`. Los valores exportados siempre son números. Las exportaciones solo vuelven cuando el script termina correctamente.',
      'Dentro de un bloque `foreachframe` o `dobetween`, la variable `idx` contiene el número del fotograma actual y `time` cuándo empieza ese fotograma, en segundos (solo en foreachframe), y las variables que definas dentro del bloque se descartan cuando termina.',
    ].join('\n\n'),
    table: {
      columns: ['Variable', 'Significado', 'Ejemplo para la clave `img`'],
      rows: [
        ['', 'Ancho en píxeles', ''],
        ['', 'Alto en píxeles', ''],
        ['', 'Duración en segundos', ''],
        ['', 'Número de fotogramas', ''],
        ['', 'Número del fotograma actual dentro de `foreachframe`', ''],
        ['', 'Cuándo empieza el fotograma actual, en segundos, dentro de `foreachframe`', ''],
      ],
    },
    results: [
      'Adjunta la imagen y muestra su ancho, su área y su número de fotogramas.',
    ],
  },

  'ms-functions': {
    title: 'Funciones',
    body: [
      'Las funciones se pueden usar en cualquier sitio donde se admita una ecuación. Como el resto de una ecuación, no pueden tener espacios.',
      'Dentro de MediaScript, mejor `rand()` que el `{range:}` de TagScript: `rand()` se elige de nuevo cada vez que se ejecuta la línea, así que dentro de un `foreachframe` cada fotograma tiene su propio número aleatorio, mientras que `{range:}` se sustituye una sola vez antes incluso de que empiece el script.',
    ].join('\n\n'),
    table: {
      columns: ['Función', 'Qué devuelve', 'Ejemplo'],
      rows: [
        ['', 'Valor absoluto, coseno, seno, tangente (en radianes)', ''],
        ['', 'El número más grande', ''],
        ['', 'El número más pequeño', ''],
        ['', 'Un número aleatorio entre a y b (con un solo número, entre 0 y ese número)', ''],
        ['', 'n redondeado, opcionalmente a un número de decimales', ''],
        ['', 'if_true cuando se cumple la condición, si no if_false. Operadores: `==`, `!=`, `<=`, `>=`, `<`, `>`', ''],
        ['', '1 si la multimedia es de ese tipo, 0 si no. TYPE es `audio`, `image`, `video` o una combinación: `av` (audio o vídeo), `iv` (imagen o vídeo), `aiv` (cualquiera de ellos)', ''],
        ['', 'El color más usado en la multimedia, como número RGB decimal', ''],
      ],
    },
  },

  'ms-colors': {
    title: 'Colores',
    body: [
      'Los comandos que reciben un color aceptan un nombre de color de FFmpeg (como `white`, `red` o `skyblue`), un valor RGBA como `rgba(255,0,0,128)` o `255,0,0`, o un código hexadecimal como `#ff0000`. Nunca pongas espacios dentro de un color.',
      'La mayoría de comandos de efectos (como `chromakey`, `overlay`, `fadein` o `rotate`) también aceptan `mostused`, que significa el color más usado en la propia multimedia. Los comandos de dibujo como `tti` y `createpolygonfill` usan negro en su lugar para `mostused`.',
      'Los números dentro de `rgba(...)` también pueden ser ecuaciones, p. ej. `rgba(255,rand(0,255),0,255)`.',
    ].join('\n\n'),
    results: [
      'Quita el color más común de la imagen (a menudo su fondo).',
    ],
  },

  'ms-loops': {
    title: 'Bucles y condiciones',
    body: [
      'Cuatro comandos ejecutan otro código de MediaScript: `foreachframe` ejecuta código una vez por fotograma, `dobetween` ejecuta código en un tramo de tiempo, `if` ejecuta código solo cuando una comparación es cierta, y `reexport` ejecuta código una y otra vez sobre su propio resultado (mira Efectos de logos). El código va al final de la línea.',
      'Como cada línea es un comando, el código de más de una línea tiene que ir codificado en JSON para que quepa en una sola línea. La forma fácil es `{jsonify:...}`: pon dentro los comandos interiores, cada uno en su propia línea. Un solo comando corto se puede escribir directamente, como `if rand(0,1) <= 0.5 flip img`.',
      'Dentro de `foreachframe KEY START END CODE`, el fotograma actual está disponible como su propia clave de multimedia llamada `KEYx` (así que para `pfp` es `pfpx`), `idx` es el número del fotograma y `time` es cuándo empieza, en segundos (cuentan los retardos propios de cada fotograma de un GIF, así que también funcionan los GIFs irregulares). START está incluido y END no, así que `0 pfpfc` cubre todos los fotogramas. Los comandos de dentro tienen que dejar el fotograma como una sola imagen fija, así que evita dentro del bucle los comandos que convierten imágenes en GIFs (como `spin` o `shake`).',
      '`dobetween KEY START END CODE` funciona igual pero sobre un rango de tiempo en segundos: el tramo está disponible como `KEYx`, y después de ejecutar el código se vuelve a coser entre las partes que no se tocaron.',
      '`if LEFT OPERATOR RIGHT CODE` compara dos ecuaciones. A diferencia de la función `if()`, los dos lados y el operador tienen que ir separados por espacios: `if imgw > 500 ...`.',
      'Las claves de multimedia y las variables creadas dentro de un bucle desaparecen cuando termina; los cambios en claves que ya existían se conservan. No puedes usar `render` desde dentro de un bucle.',
      'Dentro de `foreachframe`, `dobetween` y `reexport`, la propia clave padre está prohibida: usar `pfp` dentro de `foreachframe pfp ...` es un error, solo funciona `pfpx`. Sus variables de tamaño (`pfpw`, `pfpd`...) se pueden seguir leyendo.',
    ].join('\n\n'),
    results: [
      'Crea un GIF del avatar con al menos 10 fotogramas que va pasando por todos los colores.',
      'Voltea e invierte cada fotograma al azar.',
    ],
  },

  'ms-tts': {
    title: 'Voces de texto a voz',
    body: [
      '`tts KEY VOICE TEXT` convierte texto en un clip de audio guardado en KEY. La voz es opcional; sin ella obtienes `TIKTOK_EN_US_FEMALE_01`. Envuelve el texto en `{jsonify:}`. El texto de más de 4096 caracteres se corta.',
      'Combínalo con `audioputreplace`, `audioputmix` o `audioputconcat` para poner la voz en un vídeo, o renderízalo solo como audio.',
    ].join('\n\n'),
    table: {
      columns: ['Voz', 'Descripción'],
      rows: TTS_ROWS,
    },
    results: [
      'Lee en voz alta los argumentos del tag con la voz de Microsoft Sam.',
    ],
  },

  'ms-klattsch': {
    title: 'Sintaxis de fonemas de Klattsch',
    body: [
      'La voz `KLATTSCH` es un sintetizador de voz que puedes controlar a mano. Su texto puede ser palabras normales en inglés, fonemas ARPABET (como `HH AH L OW`), kana japonés o cualquier mezcla de ellos, como `AY+8 M really S AO+10 R IY`. Las palabras y el kana se convierten en fonemas por ti (con entonación en inglés); los fonemas y controles que escribas se mantienen tal cual. Los kanji no se pueden leer, así que escribe el japonés en kana.',
      'Los sufijos de un fonema cambian su tono o su acento: `PH!` lo acentúa (una subida corta y un sonido más largo), `PH+N` / `PH-N` desliza el tono N Hz hacia arriba o hacia abajo y mantiene el nuevo tono para lo que viene después, y `PH(+N)` / `PH(-N)` es un adorno puntual después del cual el tono vuelve a su sitio. Envuelve fonemas en `( P P P )` (con espacios alrededor de los paréntesis) para meterlos en una sola sílaba, lo que viene bien para diptongos y sílabas átonas rápidas.',
      'Pausas: `,` son 100 ms, `;` son 200 ms, `.` son 300 ms y `pN` son exactamente N ms. Las pausas y los paréntesis necesitan espacios alrededor (`D ,`, no `D,`).',
      'Los tokens de estado cambian la voz a partir de ese punto. Cada uno es una letra: `xN` o `x=N` lo fija, `x+N` / `x-N` lo ajusta un poco, y una `x` sola lo devuelve a su valor por defecto. Por defecto es una voz masculina a 120 Hz, que dura 110 ms por fonema.',
      '`[voice=N]` empieza otra voz que suena a la vez que las anteriores, empezando de nuevo con los valores por defecto. Úsalo para acordes, armonías y cánones, como `r600 bC3 AA [voice=1] r600 bE3 AA [voice=2] r600 bG3 AA` para un acorde de do mayor.',
      'Reglas del tono: `!` y `(+N)` solo afectan a un fonema, `+N` / `-N` se mantienen, `bN` salta a un tono absoluto, y una `b` sola vuelve al tono con el que empezó la línea. Por ejemplo, `AY+20 D IH+10 D` deja la última D a +30, mientras que `AY(+20) D IH(+10) D` deja todas las D en el tono base.',
      'Consejos de estilo: las afirmaciones terminan con la última vocal acentuada bajando de 5 a 15 Hz; las preguntas de sí/no terminan subiendo de 15 a 30 Hz; la emoción usa un rango más amplio con `g+0.2 r-20`; la tristeza usa `r+30 h+0.2 t-0.2 v2`; un susurro es `h0.7 g0.2 t-0.3`; una voz femenina es `s1.17 b220` y la de un niño `s1.3 b260`; para cantar usa nombres de notas (`bC4`), vibrato (`vN`, `wN`) y una velocidad más lenta. Usa `!` como mucho una o dos veces por frase, mejor adornos `(+N)` para acentos pequeños, y no repitas los valores por defecto (la voz base es masculina).',
    ].join('\n\n'),
    table: {
      columns: ['Token', 'Controla', 'Ejemplo'],
      rows: [
        ['', 'Tono base en Hz (por defecto 120), o un nombre de nota. Una `b` sola vuelve al tono inicial', ''],
        ['', 'Velocidad en ms por fonema (por defecto 110; más alto es más lento)', ''],
        ['', 'Escala de formantes: 1.0 hombre, 1.17 mujer, 1.3 niño', ''],
        ['', 'Profundidad del vibrato en Hz (0 lo desactiva)', ''],
        ['', 'Velocidad del vibrato en Hz (por defecto 5)', ''],
        ['', 'Profundidad del trémolo, 0..1', ''],
        ['', 'Velocidad del trémolo en Hz (por defecto 5)', ''],
        ['', 'Voz aspirada, 0..1', ''],
        ['', 'Inclinación espectral, de -0.9 (oscuro) a +0.9 (brillante)', ''],
        ['', 'Esfuerzo vocal, de 0 (relajado) a 1 (tenso), por defecto 0.5', ''],
        ['', 'Pausa de exactamente N ms', ''],
        ['', 'Otra voz que suena a la vez, con los valores por defecto', ''],
      ],
    },
    results: [
      '"Hello world" con una pequeña subida en "world".',
      '"Hello world" con voz femenina, escrito como inglés normal.',
      '"I\'m sorry Dave" con el tono ajustado a mano.',
      'El principio de "Happy Birthday", una nota por sílaba.',
      '"Konnichiwa, sekai" con las vocales japonesas.',
    ],
  },

  'ms-logo-effects': {
    title: 'Efectos de logos (Preview 2, Preview 1280, G Major, IHTX)',
    body: [
      'Si haces efectos de logos, hay tres comandos pensados para ti: `ffmpeg` ejecuta filtros y códecs de FFmpeg sobre una clave de multimedia, `reexport` (también `ihtx`) vuelve a exportar un clip una y otra vez y une las exportaciones, y `loadcube` carga LUTs de color `.cube` para `applylut` (o para el `lut3d` de FFmpeg). Sustituyen la mayor parte de lo que hacen los tags de efectos con `{sh:}`, sin la shell y sin `.t sync+` después.',
      '`ffmpeg KEY ...OPTIONS` recibe las propias opciones de salida de FFmpeg: `-vf`, `-af`, `-filter_complex`, `-map`, `-c:v`, `-c:a`, `-crf`, `-qp`, `-preset` y más. KEY es la entrada `0`, y `-i OTHERKEY` añade otra clave de multimedia como entrada `1`, `2`... (hasta 4). El resultado mantiene el formato de KEY y vuelve a KEY. Funcionan la mayoría de filtros de FFmpeg, incluidos `geq`, `displace`, `haldclut`, `curves`, `rubberband` y `frei0r` (con sus plugins integrados como `mirr0r` y `gateweave`). Los filtros que leen o escriben archivos por su cuenta, como `movie`, `amovie` y `sendcmd`, están bloqueados, así que carga los archivos con `load` o `loadcube` y pásalos como entrada.',
      '`reexport KEY AMOUNT LENGTH CODE` coge los primeros LENGTH segundos, ejecuta CODE sobre ellos como `KEYx`, luego vuelve a ejecutar CODE sobre ese resultado, AMOUNT veces, y une todas las exportaciones en orden (al revés si AMOUNT es negativo). Las exportaciones que salen más largas que LENGTH se recortan, salvo que añadas `NO_TRIM=true`. El audio de cada exportación se ajusta a su vídeo antes de unirlas, así que el resultado sigue sincronizado. `idx` es el número de exportación, para los comandos que reciben ecuaciones.',
      'Para cambiar el tono se usa `multipitch KEY SEMITONES`: `multipitch clip 7` sube una quinta, y `multipitch clip 0,7,12` mezcla un acorde igual que lo hace el programa multipitch (con `--no-normalize`). Cuando el tono tiene que ser parte de un único grafo de filtros de `ffmpeg`, por ejemplo encadenado con otros filtros de audio, usa ahí `rubberband=pitch=2^(SEMITONES/12)`, y para un acorde divide el audio con `asplit`, cambia el tono de cada copia y vuelve a mezclarlas con `amix=N:normalize=0` (mira los ejemplos). Un cambio de tono de color es `hue=h=DEGREES`. El `-modulate 100,100,X` de ImageMagick gira el tono de color unos `(X-100)*1.8` grados; si los colores salen al revés, cambia el signo.',
      'Los programas descargados (4orm) y los comandos de shell no se pueden ejecutar en MediaScript; los proyectos `.veg` se reproducen con `loadveg` y `vegrender`, y los proyectos `.wlmp` de Movie Maker con `loadwlmp` y `wlmprender`. La tabla muestra qué usar en su lugar. Límites: hasta 100 ejecuciones de `ffmpeg` por script, cada salida de como mucho 10 minutos y 2048x2048, y cada `ffmpeg` dentro de `reexport` cuenta una vez por exportación.',
    ].join('\n\n'),
    table: {
      columns: ['En un tag con {sh:}', 'En MediaScript'],
      rows: [
        ['', '`hue=h=DEGREES`, o construye la CLUT en el grafo: `haldclutsrc=4,hue=h=54[h];[0:v][h]haldclut`'],
        ['', ''],
        ['', '`multipitch KEY 7 engine=signalsmith` (o `engine=rubberband`)'],
        ['`wine autotune.exe -b 75 voice.wav music.wav out.wav` (el vocoder "autotune")', '`load URL song`, y luego `vocoder KEY song 75`'],
        ['El simulador de TV (`movie=$(curl .../Project%20Name%209.mp4)` + `displace`)', ''],
        ['`movie=$(curl ...)` o un segundo vídeo descargado', '`load URL other`, y luego `ffmpeg KEY -i other -filter_complex "[0:v][1:v]..."`'],
        ['', '`loadcube URL x`, y luego `applylut KEY x` (o `lut3d=x.cube` dentro de `ffmpeg`)'],
        ['un bucle de exportaciones + concat + `.t sync+`', ''],
        ['', ''],
        ['un renderizador de `.veg` (`tvdoubled`/tved) con `--all-media`', '`loadveg URL p`, y luego `vegrender MEDIA_KEY p`'],
        ['4orm y otros programas descargados', 'No compatible'],
      ],
    },
    results: [
      'Un paso de tono de color + tono de audio: los colores giran 45 grados y el audio sube un semitono.',
      'Al estilo IHTX: 20 exportaciones de los primeros 0,46 segundos, cada una invertida, con el tono de color cambiado y el tono de audio subido respecto a la anterior.',
      'El acorde de 5 tonos de los tags de Preview 1280, hecho directamente con `multipitch`.',
      'El mismo tipo de acorde dentro de un único grafo de filtros de `ffmpeg`, aquí con un eco encadenado detrás. Úsalo cuando el acorde tenga que ir entre otros filtros; si no, `multipitch` es más rápido y se parece más a los tags de efectos.',
      'El aspecto de espejo con desplazamiento de los efectos de Preview 1280, con el audio 2 semitonos más bajo.',
      'Etalona el color del clip con una LUT .cube (cambia el enlace por el de tu LUT).',
      'Un temblor de TV con tu propio vídeo de desplazamiento, cargado como su propia clave de multimedia en lugar de con `movie=$(curl ...)`. Para el aspecto habitual del simulador de TV, `tvsimulator clip` hace esto con un mapa integrado. El resultado dura lo mismo que el clip; un vídeo de desplazamiento más corto se queda en su último fotograma.',
      '10 exportaciones que cambian el tono de color y añaden compresión JPEG cada una, unidas desde la última hasta la primera.',
    ],
  },

  'ms-vegas': {
    title: 'Proyectos de Vegas (.veg)',
    body: [
      '`loadveg URL VEG_KEY` lee un proyecto de Vegas Pro, y `vegrender MEDIA_KEY VEG_KEY` lo reproduce con cada vídeo y sonido del proyecto sustituido por tu multimedia, como hacen los renderizadores de `.veg` de los tags de efectos (tved con `--all-media`). El proyecto se reconstruye a partir de lo que Vegas guardó en el `.veg`: su línea de tiempo, fundidos, Pan/Crop y track motion, su multimedia generada y los efectos de vídeo y audio de la tabla (en eventos, en pistas enteras y en la salida de vídeo del proyecto). Vegas en sí nunca se ejecuta: los efectos se redibujan con ffmpeg, así que quedan parecidos a Vegas pero no exactamente iguales, y los efectos que no están en la tabla se omiten sin avisar. Revisa la tabla antes de construir un tag alrededor de un proyecto. También se leen proyectos de versiones antiguas de Vegas (como los collabs de YTP de 2012-2013).',
      'Qué clips reciben tu multimedia: un evento de vídeo cuyo archivo de origen era un vídeo (mp4, mov, mkv, avi, wmv, m4v, mpg, mpeg, mts, m2ts, webm, 3gp, ts o flv), y un evento de audio cuyo origen era un vídeo o un sonido (wav, mp3, m4a, aac, flac, ogg, wma u opus). Los nombres de archivo salen de las rutas guardadas en el proyecto, en cualquier idioma. Los eventos sobre imágenes fijas (png, jpg, bmp, gif) muestran tu multimedia congelada en su primer fotograma. Con una imagen como multimedia, todos los eventos de vídeo la muestran y no hay sonido; con un archivo de audio, solo suenan los eventos de audio (la multimedia generada, como colores sólidos, texto y ruido, se sigue viendo).',
      'Cada evento se reproduce desde el mismo punto de tu multimedia desde el que se reproducía en su propio origen, y tu multimedia se repite en bucle cuando el proyecto va más allá de su final. Con `CUTOFF=true` (por defecto), un evento que empieza en una pista termina el anterior de esa pista, como hace Vegas (salvo bajo un fundido cruzado, donde suenan los dos); `CUTOFF=false` deja que se solapen.',
      'Límites: proyectos de hasta 32mb (y dentro del límite de descarga del script, que suele ser menor), 4 por script, 20000 eventos y 512 pistas. El render dura como mucho 10 minutos (los proyectos largos suelen llegar antes al límite de tiempo del script) y se escala para caber en 1280x720, muestra como mucho 32 clips a la vez (y reproduce 32 sonidos a la vez), y tiene como mucho 1024 clips en cualquier medio segundo. Cuenta como una ejecución de `ffmpeg`, comparte su límite de tiempo y se detiene en cuanto es seguro que el archivo será demasiado grande para enviarlo.',
    ].join('\n\n'),
    table: {
      columns: ['Función de Vegas', 'Se reproduce', 'Cómo'],
      rows: [
        ['Eventos', 'Sí', 'Posición, duración y en qué punto de su origen empieza cada uno'],
        ['Velocidad', 'Sí', 'De 0.01x a 100x'],
        ['Tono', 'Sí', 'Cambios de tono en eventos de audio, manteniendo su duración: el tono propio del evento y su plugin Pitch Shift (en cualquier idioma o marca) se suman. Se cambia como lo hace Vegas (ajustado a un render de Vegas de -24 a +24 semitonos, incluido que un evento con tono empiece un poco antes al subir y un poco tarde al bajar)'],
        ['', 'Sí', 'Zoom, movimiento, rotación y volteos, a través de cada fotograma clave con su curva (linear, fast, slow, smooth, sharp o hold)'],
        ['Track motion', 'Sí', 'Posición, tamaño, volteos y giros, en 2D y 3D, a través de cada fotograma clave (las inclinaciones y la profundidad 3D se ven en perspectiva, ajustadas a un render de Vegas), y su 2D Shadow y 2D Glow (desplazamiento, tamaño, color y desenfoque; no ajustados a un render de Vegas)'],
        ['Mute y solo', 'Sí', 'Las pistas silenciadas se omiten, y una pista en solo omite las demás de su tipo (audio o vídeo)'],
        ['', 'Sí', 'Su color y su transparencia'],
        ['', 'En parte', '(Legacy) Text con su tamaño, fuente (también negrita y cursiva; las fuentes que no tiene el bot se cambian por la más parecida, inclinada cuando no tiene cursiva), alineación, color, fondo, contorno, sombra (desplazamiento, color y desenfoque), posición, escala, interlineado y las deformaciones de arco, onda, inclinación y cizalla (las animadas también se reproducen). El texto con fotogramas clave se mueve y cambia entre ellos, y los fotogramas clave que cambian sus palabras las cambian, ajustado a un render de Vegas; su tracking, las deformaciones animadas y otras deformaciones no se hacen. Funciona cualquier idioma; los emoji solo se ven si la fuente los tiene'],
        ['', 'En parte', 'VEGAS Defocus (tanto el plugin antiguo como el OFX): su desenfoque de lente con la forma del iris (círculo o polígono), el tamaño y el anillo exterior ajustados a un render de Vegas de sus presets. Su bloom todavía no se hace'],
        ['', 'En parte', 'VEGAS Titles & Text con su texto, fuente, tamaño, color, escala, ubicación, fondo e interlineado, ajustado a un render de Vegas de su estilo por defecto. Sus animaciones, contorno, sombra, tracking y las alineaciones que no sean la central todavía no se hacen'],
        ['', 'En parte', 'Estática gris'],
        ['', 'Sí', 'Cuadrados de su color y transparencia con su tamaño de cuadrado, transparentes entre ellos'],
        ['', 'Sí', 'Los 9 patrones (barras SMPTE y de color, NTSC y PAL, porches, PLUGE, rampa y degradado), ajustados a un render de Vegas'],
        ['', 'Sí', 'Degradados lineales, elípticos y rectangulares con sus colores, puntos y ángulo, y sus fotogramas clave, ajustados a un render de Vegas'],
        ['Composición', 'En parte', 'El modo de composición de una pista (Add, Subtract, Multiply, Screen, Overlay, Hard Light, Dodge, Burn, Darken, Lighten, Difference) mezcla sus vídeos y su multimedia generada con lo que hay debajo, y también un compositor personalizado puesto en Difference. Los modos se identifican por su posición en la lista de Vegas, y solo Difference está comprobado con un render. La multimedia generada en una pista con otro compositor personalizado se omite, y los vídeos de esa pista se dibujan con normalidad'],
        ['Fundidos de eventos', 'Sí', 'Fundido de entrada y de salida en vídeo (opacidad, dejando ver lo que hay debajo) y en sonido (volumen), con su curva (linear, fast, slow, smooth o sharp; un sonido entra rápido y sale lento salvo que se cambie)'],
        ['Transiciones', 'En parte', 'Un fundido cruzado se reproduce como el evento siguiente apareciendo sobre el anterior, que sigue sonando debajo (con cualquier `CUTOFF`). Los efectos de transición como las cortinillas no'],
        ['FX de pista', 'Sí', 'Los efectos de una pista entera se aplican a todos sus clips, después de los del propio clip'],
        ['FX de la salida de vídeo', 'Sí', 'Los efectos de vídeo propios del proyecto (los de esta tabla) se aplican a toda la imagen, después de todo lo demás'],
        ['', 'Sí', 'Incluidas las cantidades parciales, el plugin antiguo y el OFX. El gris es la media de rojo, verde y azul, como en Vegas (ajustado a un render de Vegas)'],
        ['', 'Sí', 'Incluidas las cantidades parciales y los fotogramas clave (las inversiones que parpadean se reproducen fotograma a fotograma). En los niveles de estudio de Vegas, así que el blanco queda un poco más brillante que el negro, ajustado a un render de Vegas'],
        ['', 'Sí', 'Tono, saturación y luminancia, ajustados a un render de Vegas de sus presets'],
        ['', 'Sí', 'Rotación de tono, saturación, gamma, ganancia y desplazamiento en los colores que eligen sus límites de luminancia, saturación y tono (suavizados o invertidos), ajustados a un render de Vegas de sus presets. Mostrar la máscara y su alfa no'],
        ['', 'Sí', 'Curvas de rojo, verde y azul, el plugin antiguo y el OFX, en los niveles de estudio de Vegas. Todos los presets OFX ajustados a un render de Vegas con un margen de 2 niveles'],
        ['', 'Sí', 'Cada canal de color mezclado a partir de los demás (RGB a BGR, solo rojo...), con Normalize, el plugin antiguo y el OFX (ajustado a un render de Vegas de sus presets)'],
        ['', 'En parte', 'Los 8 controles: line sync, vertical sync, entrelazado, scan phasing, fosforescencia, aperture grill, estática y detail zoom. Line sync es un temblor aleatorio nuevo en cada fotograma, como en Vegas, así que coincide en intensidad, no fotograma a fotograma'],
        ['', 'Sí', 'El kernel 3x3 con su escala y bias (relieve, bordes, enfoque...) a la escala del proyecto, el plugin antiguo y el OFX (sin rotar; ajustado a un render de Vegas de sus presets)'],
        ['', 'Sí', 'Desenfoque a lo largo de su ángulo y cantidad, ajustado a un render de Vegas de sus presets'],
        ['', 'Sí', 'Con cualquier ángulo, por cualquier punto, con su fondo donde no se refleja nada, el plugin antiguo y el OFX (ajustado a un render de Vegas de sus presets)'],
        ['', 'Sí', 'En sentido horario o antihorario, con su tamaño y alrededor de su centro'],
        ['Pinch/Punch y Spherize', 'Sí', 'Abombando hacia fuera o pellizcando hacia dentro alrededor de su centro, ajustados a renders de Vegas de sus presets: Pinch/Punch con su tamaño y su centro en imágenes 4:3 y 3:2, Spherize con su escala horizontal y vertical'],
        ['', 'Sí', 'Cizalla, aplastamiento, curva, doblez y compresión, coincidiendo con un render de Vegas de cada preset'],
        ['', 'Sí', 'En horizontal y en vertical, en los canales que tenga configurados (ajustado a un render de Vegas de sus presets)'],
        ['', 'Sí', 'En horizontal, en vertical o en ambos, en bloques de 2, 4, 8 o 16 píxeles de salida como Vegas'],
        ['', 'Sí', 'Cada uno de rojo, verde y azul puesto al máximo o apagado según su nivel (ajustado a un render de Vegas de sus presets)'],
        ['', 'En parte', 'El brillo mapeado a lo largo de sus paradas de color y superpuesto según su alfa. Parecido a Vegas, no exacto'],
        ['', 'Sí', 'Su color sobre las zonas claras, tan ancho y fuerte como indiquen su porcentaje, intensidad y supresión (ajustado a un render de Vegas de sus presets)'],
        ['', 'En parte', 'Radio fijo y proporcional, alrededor de su centro, el OFX y el plugin antiguo. Parecido a Vegas; las estelas proporcionales más fuertes salen más cortas'],
        ['', 'En parte', 'Rayos desde las zonas claras, el foco (tamaño, difuminado), su color y la luz ambiental. Parecido a Vegas; la sensibilidad no se usa'],
        ['', 'En parte', 'Rate, Strength, Drift, Crop, Edges y Orientation, ajustados a un render de Vegas de sus presets. Los bordes estirados solo se parecen'],
        ['', 'En parte', 'El brillo mapeado a través de sus colores de tinta y papel, mezclado según su blend. Parecido a Vegas'],
        ['', 'En parte', 'Su color como bandas de metal sobre el brillo, con brillo especular, luces, calibrate y la imagen mezclada de nuevo. Parecido a Vegas'],
        ['', 'En parte', 'La niebla (ancho, color, nivel), el color del brillo y las bandas, mezclados según su blend. Parecido a Vegas; las bandas fuertes solo se parecen y el movimiento no se hace'],
        ['', 'En parte', 'Ampliado y sacudido tan lejos y tan rápido como indiquen su magnitud y velocidad. La sacudida es inventada, como la aleatoria del propio Vegas'],
        ['Wave (clásico)', 'Sí', 'La onda antigua con los presets Small, Medium, Large, Horizontal Only y Vertical Only: filas y columnas dobladas a lo largo de una senoide'],
        ['', 'En parte', 'Todas las formas, repetidas, recortadas hacia dentro o hacia fuera, con su difuminado y su color de borde. Las formas y los tamaños se parecen a Vegas, no son exactos'],
        ['', 'En parte', 'El color clave con su umbral y desenfoque, el OFX y el plugin antiguo, parecido a Vegas'],
        ['', 'Sí', 'La luminosidad, los canales a y b, Invert Luminance y Desaturate'],
        ['', 'En parte', 'Levels en todos los canales (entrada, salida y gamma), brillo y contraste alrededor de su centro (los dos ajustados a un render de Vegas de sus presets), y la saturación, gamma y ganancia de Color Corrector. El Color Corrector antiguo también tiene su desplazamiento y sus ruedas de color de sombras, medios tonos y luces, ajustados a un render de Vegas de sus presets. Levels en un solo canal y las ruedas de color del Color Corrector OFX no'],
        ['', 'En parte', 'El brillo pasado por negro, su color y blanco, mezclado según su intensidad'],
        ['Unsharp Mask y Sharpen', 'Sí', 'Cantidad y radio (Negative, Outline Edges...), a pocos niveles de un render de Vegas de sus presets'],
        ['', 'En parte', 'Su foco o resplandor (ubicación, dirección, intensidad, enfoque, ambiente) y el relieve a partir del brillo de la imagen, ajustados a un render de Vegas de tres presets. El brillo especular (shininess) no se hace'],
        ['', 'En parte', 'Ruido de color o gris a su nivel, en movimiento o fijo'],
        ['Median, Min y Max', 'En parte', 'Cada píxel pasa a ser la mediana, el más oscuro o el más brillante de su alrededor, calculado en una imagen más pequeña cuando el rango es grande. El rango de Min y Max está ajustado a un render de Vegas de sus presets; el de Median todavía no está comprobado, y Circular Area Processing no se hace'],
        ['', 'En parte', 'Su color más allá del radio interior y exterior, su proporción, centro y difuminado, o por dentro con Invert'],
        ['', 'En parte', 'Cuñas o anillos alrededor de su centro, más grandes con la intensidad'],
        ['NewBlue Dream Glow y Line Drawing', 'En parte', 'El color, desenfoque y resplandor de Dream Glow; los colores de papel y tinta, la densidad y el contraste de Line Drawing (solo bordes, sin sombreado). No ajustados a un render de Vegas'],
        ['', 'En parte', 'Detalles, ancho, los colores del carboncillo y de la superficie y el color, ajustados a un render de Vegas de sus presets pero con diferencias notables (sobre todo los presets verde y azul rayado). Su contraste no se dibuja'],
        ['', 'En parte', 'Ruido, croma, tinte, saturación, brillo, contraste, líneas de escaneo, el desplazamiento vertical con su barra vacía, scan phasing, curvatura, borde suave y opacidad del borde, ajustados a un render de Vegas de sus presets, más ghosting (su copia desplazada) y sincronización horizontal (filas desgarradas hacia los lados a ráfagas, tan lejos y tan a menudo como las desgarra Vegas), reproduciendo los ajustes con fotogramas clave. El ruido y la forma de cada desgarro son aleatorios como los del propio plugin, así que coinciden en tipo, no píxel a píxel'],
        ['NewBlue Motion, Spin y Zoom Blur', 'En parte', 'Motion Blur a lo largo de su ángulo (en un sentido o en los dos), Spin Blur alrededor de su centro, Zoom Blur hacia su centro. Sus tamaños son aproximaciones, no ajustados a un render de Vegas'],
        ['', 'En parte', 'Sus anillos con amplitud, frecuencia, velocidad, desvanecimiento, sombreado y deformación, ajustados a un render de Vegas de sus presets. Las deformaciones fuertes solo se parecen'],
        ['', 'Sí', 'El tiempo del evento en cualquiera de sus formatos (SMPTE drop y non-drop, film, segundos, fotogramas, tiempo y fotogramas) en su recuadro, con su alineación y tamaño, ajustado a un render de Vegas de sus presets'],
        ['', 'En parte', 'Su cuadrícula, solapamiento, origen, escala y estiramiento, y el tinte, saturación, brillo, opacidad y desenfoque de cada mosaico, ajustados a un render de Vegas. La variación aleatoria entre mosaicos es aleatoria como la del propio Vegas, así que coincide en tipo, no mosaico a mosaico'],
        ['', 'Sí', 'Sus tres colores, rangos, desplazamiento y saturación, ajustados a un render de Vegas de sus presets'],
        ['', 'Sí', 'Contraste, brillo, saturación y tono, ajustados a un render de Vegas de cada control deslizante y de sus presets'],
        ['', 'En parte', 'Su color de papel mezclado según su blend, y los bordes de la imagen en su color de tinta, tantos como dé su densidad, ajustados a un render de Vegas de sus presets. Las líneas no caen exactamente en los mismos píxeles que en Vegas'],
        ['', 'En parte', 'El desgaste que deslava la imagen (según su patrón), ajustado a un render de Vegas de sus presets, con grano, manchas y arañazos parecidos (aleatorios, así que solo se parecen en tipo). La textura propia del patrón y los colores de los arañazos no'],
        ['', 'En parte', 'Los bordes de la imagen en su color de carboncillo sobre su color de superficie, sus detalles, ancho y color, ajustados a un render de Vegas de sus presets. Solo se parece a grandes rasgos'],
        ['', 'Sí', 'Su cizalla horizontal y vertical, ángulo, dirección, centro, blend y bordes, ajustados a un render de Vegas de cada control y de sus presets'],
        ['Soft Contrast y Rays', 'En parte', 'El estiramiento, los recortes, el contraste difuso, el tinte y la viñeta de Soft Contrast (negra, blanca, desenfocada o transparente); las estelas de Rays desde las zonas claras que pasan su umbral, coloreadas según su tono y barrido. La máscara y el alfa clave de Rays no se hacen'],
        ['', 'En parte', 'Bordes desenfocados, biselados (iluminados desde su ángulo) y sólidos con su color y tamaño'],
        ['', 'En parte', 'Grano, tinte, escala de grises, polvo, pelos, arañazos, parpadeo y temblor, aleatorios como los del propio Vegas (así que no fotograma a fotograma)'],
        ['', 'Sí', 'Puntos de semitono según el tamaño de punto: color, monocromo o color desplazado, el plugin antiguo y el OFX (ajustado a un render de Vegas de sus presets)'],
        ['', 'En parte', 'Los elementos y rayos de los 5 tipos de lente en su luz, ajustados a un render de Vegas de sus presets. El tinte, el tamaño, la perspectiva y las demás intensidades son aproximaciones'],
        ['Fotogramas clave de efectos', 'En parte', 'Los plugins antiguos siguen sus fotogramas clave (Swirl, Wave, Pinch/Punch, Mirror, Deform, el line sync de TV Simulator, la magnitud de Earthquake, Gaussian Blur, HSL Adjust, Linear Blur e Invert), en línea recta de uno al siguiente. Los efectos OFX solo siguen el tono de HSL Adjust y la cantidad de Linear Blur'],
        ['Otros FX de vídeo', 'No', 'Otros efectos de NewBlue, plugins OFX de otras compañías...'],
        ['Envolventes', 'En parte', 'Las envolventes de volumen y panorama de las pistas de audio, y la velocidad de un evento de vídeo como su velocidad media durante el evento (0 congela un fotograma). Las envolventes de opacidad no'],
        ['FX de audio', 'En parte', 'Pitch Shift, Distortion (sus niveles, gráfico y paso bajo; el slew rate solo se parece), Volume, Resonant Filter y Reverb (una sala inventada a partir de su decay, pre-delay y niveles), en eventos y en pistas de audio (los de una pista, sobre su mezcla). También Graphic EQ (sus modos de 10 bandas, 20 bandas y envolvente), Smooth/Enhance, Vibrato, Chorus, Flange/Wah-Wah, Amplitude Modulation y los ExpressFX Delay, Distortion, Chorus, Flange, Amplitude Modulation, Equalization y Reverb, reconstruidos a partir de sus ajustes, así que solo se parecen a Vegas. Los demás (Simple Delay, Multi-Tap Delay, Noise Gate, compresores...) se omiten'],
        ['Reverse', 'Sí', 'Los eventos invertidos se reproducen al revés, también su sonido'],
        ['Subclips', 'Sí', 'Una parte de un archivo cortada en Vegas se reproduce desde su propio punto'],
        ['Takes', 'En parte', 'Un evento con varias tomas usa la que se dejó para reproducir (la última, salvo que se volviera a cambiar), también cuando la toma se renombró en el proyecto'],
        ['Máscaras', 'No', 'Tampoco las pistas padre/hija ni los proyectos anidados'],
      ],
    },
    results: [
      'El proyecto reconstruido con la última imagen o vídeo en cada clip.',
      'Usa un `.veg` adjuntado antes en el tag, dejando que los clips de una pista se solapen.',
    ],
  },

  'ms-moviemaker': {
    title: 'Proyectos de Movie Maker (.wlmp)',
    body: [
      '`loadwlmp URL WLMP_KEY` lee un proyecto de Windows Live Movie Maker, y `wlmprender MEDIA_KEY WLMP_KEY` lo reproduce con cada vídeo, imagen y sonido del proyecto sustituido por tu multimedia. Un `.wlmp` es el archivo de proyecto que guarda Movie Maker (no un vídeo terminado): sus clips se reproducen uno detrás de otro tal como los coloca Movie Maker, cada uno desde el mismo punto de tu multimedia desde el que se reproducía en su propio archivo. Movie Maker en sí nunca se ejecuta: los efectos de la tabla se redibujan con ffmpeg, ajustados a un render de Movie Maker de cada uno, y los efectos que no están en la tabla se omiten.',
      'Cada elemento multimedia del proyecto pasa a ser tu multimedia: los clips de vídeo se reproducen a partir de ella, las imágenes la muestran congelada en su primer fotograma, y la música y la narración reproducen su sonido. Con una imagen como multimedia, todos los clips la muestran y no hay sonido; con un archivo de audio, solo suena el sonido. Un proyecto 4:3 sale a 640x480 y uno 16:9 a 1280x720, como los tamaños de exportación del propio Movie Maker.',
      'Límites: proyectos de hasta 8mb (y dentro del límite de descarga del script), 4 por script, 20000 clips. El render dura como mucho 10 minutos y cuenta como una ejecución de `ffmpeg`, compartiendo su límite de tiempo.',
    ].join('\n\n'),
    table: {
      columns: ['Función de Movie Maker', 'Se reproduce', 'Cómo'],
      rows: [
        ['', 'Sí', 'En orden, con sus puntos de inicio y fin y los huecos que tienen delante'],
        ['Velocidad', 'Sí', 'De 0.01x a 100x, también el sonido'],
        ['Girar a la izquierda/derecha', 'Sí', 'Cuartos de vuelta, con barras a los lados cuando la imagen queda de lado'],
        ['Volumen y silencio', 'Sí', 'Los de cada clip'],
        ['Música y narración', 'En parte', 'Suenan bajo los clips, sin la atenuación automática de audio ni la mezcla de Movie Maker'],
        ['Black and White (y sus filtros Orange, Red y Yellow), Cyan, Sepia', 'Sí', 'Ajustados a un render de Movie Maker'],
        ['', 'Sí', 'Ajustados a un render de Movie Maker'],
        ['', 'En parte', 'Hue hace pasar todos los colores por un mismo tono como Movie Maker; los dos se ajustaron a un único render y pueden desviarse con otros ajustes'],
        ['', 'Sí', 'Gira una vez y vuelve al tamaño completo a lo largo del clip, a partir de la propia plantilla del efecto de Movie Maker'],
        ['', 'Sí', 'Cada fila se balancea hacia los lados siguiendo una onda que se estrecha y se afloja a lo largo del clip, con un píxel de diferencia respecto a Movie Maker'],
        ['', 'No', 'Se omiten'],
        ['Transiciones, subtítulos y títulos', 'No', 'Se omiten'],
      ],
    },
    results: [
      'El proyecto de Movie Maker adjunto reconstruido con la última imagen o vídeo en cada clip.',
    ],
  },

  'ms-examples': {
    title: 'Ejemplos completos',
    body: 'Algunos tags completos que combinan varios comandos. Copia uno en `.tag create` y ajústalo.',
    results: [
      'Pone un subtítulo a la última imagen, GIF o vídeo con lo que el usuario escribió después del nombre del tag.',
      'Crea un GIF del avatar del usuario girando (una imagen fija se convierte en un GIF de 20 fotogramas).',
      'Sustituye el audio del último vídeo por un narrador que lee los argumentos del tag.',
      'Escribe texto blanco en el centro de la imagen.',
      'Dibuja un "sol" amarillo en la esquina superior derecha de una foto de una tarta.',
      'Hace girar el avatar en 3D, como el meme de la cucaracha bailando.',
    ],
  },
};
