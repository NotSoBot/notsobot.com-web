// The TagScript guide (tagDocs/guide.ts) in Spanish, keyed by section id. Table cells left '' keep the English one.

import type { TagDocsTranslation } from '../localize';


export const GUIDE_SPANISH: TagDocsTranslation['guide'] = {
  'what-are-tags': {
    title: '¿Qué son los tags?',
    body: [
      'Un tag es un mensaje guardado que puedes volver a mostrar con un nombre corto. Los tags pueden ser texto normal, pero también pueden contener TagScript: pequeñas `{functions}` entre llaves que se ejecutan cada vez que se muestra el tag. Así un mismo tag puede saludar a quien lo use, elegir una respuesta al azar, recordar una puntuación, buscar una imagen o incluso ejecutar Python.',
      'Crea un tag con `.tag create <name> <content>` y muéstralo con `.tag <name>` (o con el más corto `.t <name>`, o con `/tag show`). Todo lo que escribas después del nombre del tag se le pasa como sus argumentos. Los nombres de tag con espacios van entre comillas, como `.tag create "my tag" hello!`.',
      'Cambia un tag con `.tag edit <name> <new content>` y mira su código sin procesar con `.tag raw <name>` (un alias de `.tag info`). Quien gestiona el servidor puede convertir un tag en un comando personalizado con `.tag commands add <name>`, para que los miembros lo usen directamente como `.<name>`.',
      'Si creas un tag sin texto pero adjuntas un archivo al mensaje, el tag se guarda como `{attach:URL}`, así que el archivo se envía cada vez que se ejecuta el tag.',
    ].join('\n\n'),
    results: [
      'Crea un tag llamado `greet`.',
      '',
    ],
  },

  'syntax': {
    title: 'Sintaxis',
    body: [
      'Una función se escribe como `{name}` o `{name:argument}`. El nombre termina en el primer `:`, y todo lo que va después, hasta la `}` que le corresponde, es el argumento. Los nombres de función no distinguen mayúsculas de minúsculas, así que `{UPPER:hi}` y `{upper:hi}` son lo mismo.',
      'Las funciones que reciben varios argumentos los separan con `|`, como `{range:1|10}`. Un `|` dentro de una función anidada no divide la de fuera, así que `{choose:a|{upper:b|c}}` tiene dos opciones, no tres.',
      'Las funciones se pueden anidar. En la mayoría de funciones primero se evalúa el argumento (de dentro hacia fuera) y luego la función trabaja con el texto ya terminado: en `{upper:{user}}`, `{user}` se convierte en `cake` y después `upper` lo convierte en `CAKE`.',
      'Algunas funciones evalúan sus argumentos de forma perezosa, ejecutando solo las partes que de verdad necesitan: `if`, `and`, `or`, `iferror`, `choose`, `foreach`, `set` y `get` (en todos los ámbitos de almacenamiento), `includes`, `indexof`, `substring`, `setfilename`, `componentjson`, `componentsontimeout` y `evalsilent`. Por eso `{if}` solo ejecuta la rama que coincide y `{choose}` solo ejecuta la opción que eligió.',
      'Los espacios justo dentro de las llaves se recortan, así que `{ user }` funciona, pero el nombre en sí tiene que escribirse sin espacios antes del `:` (`{upper :hi}` no se reconoce). Los argumentos simples también se recortan.',
      'Si un nombre no es una función conocida, o a una función se le dan argumentos que no puede usar, el texto se deja en el resultado tal como se escribió (con las funciones anidadas ya sustituidas). Una `{` sin su `}` correspondiente también se muestra como texto normal.',
    ].join('\n\n'),
    results: [
      '',
      'You won gold! (o silver; solo se ejecuta el `set` elegido)',
      '',
    ],
  },

  'escaping': {
    title: 'Escapar y comentarios',
    body: [
      'Para mostrar TagScript sin ejecutarlo, envuélvelo en `{ignore:...}`. El argumento se muestra exactamente como se escribió y no se evalúa nada de su interior. Sus llaves tienen que seguir estando equilibradas.',
      '`{note:...}` es un comentario: su contenido nunca se evalúa y no muestra nada, lo cual viene bien para dejarte notas en tags largos.',
      'Para mostrar un solo símbolo que de otro modo se leería como sintaxis, usa las funciones de inserción: `{bracketleft}` para `{`, `{bracketright}` para `}`, `{splitterargument}` para `|`, `{splitterfunction}` para `:` y `{newline}` para un salto de línea. Todas aceptan una cantidad, como `{newline:3}`.',
      'Una barra invertida `\\` antes de `{`, `}` o `|` la escapa. En el texto propio del tag (fuera de cualquier función) la barra invertida se quita y el carácter se muestra tal cual, así que `\\{user}` muestra `{user}` sin ejecutarlo. Dentro del argumento de una función, `\\{` y `\\}` impiden que una llave abra o cierre una función y `\\|` impide que un `|` separe argumentos, pero ahí la barra invertida antes de una llave se queda en el resultado, así que dentro de funciones suele ser más limpio usar `{ignore}` y las funciones de inserción.',
      'Ten en cuenta que las funciones de inserción producen caracteres reales: si se usan dentro de una función que evalúa primero su argumento, esa función ve un `|` insertado como un separador.',
    ].join('\n\n'),
    results: [
      '',
      '',
      '',
    ],
  },

  'arguments': {
    title: 'Argumentos',
    body: [
      'Todo lo que se escribe después del nombre del tag se convierte en sus argumentos. `{args}` los devuelve todos tal como se escribieron, y `{arg:N}` devuelve un solo argumento por su posición, empezando desde 0 (`{arg}` sin más es el primero). Las posiciones negativas cuentan desde el final, así que `{arg:-1}` es el último argumento. `{argslen}` devuelve cuántos argumentos hay, y `{args:start|end}` devuelve un rango unido con espacios.',
      'Los argumentos se separan por espacios. Poner palabras entre comillas las mantiene juntas como un solo argumento, así que `.tag rate "pizza with pineapple"` tiene un argumento. Funcionan las comillas rectas y la mayoría de pares de comillas tipográficas e internacionales.',
      'Los argumentos se insertan en tu tag como texto, así que si alguien escribe un `|` puede que la función donde acaba lo lea como separador. `{argsafe}` y `{argssafe}` funcionan como `{arg}` y `{args}`, pero antes escapan cualquier `|`.',
      'Cuando un tag ejecuta otro con `{tag:id|arguments}`, el tag interior recibe sus propios argumentos, y los argumentos del tag exterior se restauran cuando termina.',
    ].join('\n\n'),
    results: [
      'Crea un tag que puntúa su primer argumento.',
      '',
      'Con los argumentos `a b c`: You gave 3 arguments, the last one was c',
    ],
  },

  'variables-and-storage': {
    title: 'Variables y almacenamiento',
    body: [
      'Las variables permiten a un tag recordar valores mientras se ejecuta. `{set:name|value}` guarda un valor y `{get:name}` lo vuelve a leer. `{get:name|fallback}` devuelve la alternativa cuando la variable no se ha definido nunca, y `{delete:name}` la elimina. Los valores se recortan al guardarse.',
      'Las variables solo duran una ejecución del tag (y los clics en botones de ese mismo mensaje). Un tag puede tener hasta 100 variables, los nombres pueden tener hasta 64 caracteres y los valores de más de 1 MB se cortan.',
      'Los nombres que empiezan por `__` están reservados para las variables privadas del propio motor, así que no se pueden definir ni eliminar, aunque algunas se pueden leer con `{get}`: `{get:__args}` da los argumentos ya separados como un array JSON, `{get:__argsString}` los argumentos exactamente como se escribieron, y `{get:__files}` una lista JSON (nombre de archivo y descripción) de los archivos adjuntados a la respuesta hasta ahora.',
      'Para guardar datos entre ejecuciones, usa el almacenamiento persistente. Hay cuatro ámbitos, cada uno con sus propias funciones de set, get y delete: el de usuario (`{setuser}`, `{getuser}`, `{deleteuser}`) es distinto para cada persona, el de canal (`{setchannel}`...) para cada canal, el de servidor (`{setserver}`...) para cada servidor (en MD, el canal del MD cuenta como el servidor), y el global (`{setglobal}`, `{getglobal}`) lo comparten todos los que usan el tag en cualquier sitio.',
      'El almacenamiento pertenece al tag, así que dos tags distintos nunca ven los datos del otro, mientras que los alias de un tag lo comparten. El almacenamiento solo funciona al ejecutar un tag guardado. Las claves de almacenamiento pueden tener hasta 128 caracteres y los valores hasta 16.384 caracteres. Cada ámbito guarda como mucho 5 claves; guardar una 6.ª da un error, y guardar un valor vacío elimina la clave. `{variablesuser}`, `{variableschannel}`, `{variablesserver}` y `{variablesglobal}` devuelven las claves y valores guardados de un ámbito como JSON.',
      'El código que se ejecuta desde un tag (Python, Node.js, Bun y Lua) también puede leer y cambiar las variables y el almacenamiento, a través del objeto `discord`. El código además tiene acceso a blobs: un valor más grande por ámbito (usuario, canal, servidor y global), de hasta 256 KB cada uno, que solo el código puede leer y escribir. El mismo límite de 5 claves por ámbito se aplica tanto si el almacenamiento se escribe con `{setuser}` y compañía como desde código. Mira "El objeto `discord`" para los detalles.',
      'En resumen: las variables guardan hasta 1 MB cada una y se borran después de cada ejecución, los valores de almacenamiento guardan hasta 16.384 caracteres cada uno y se conservan entre ejecuciones, y los blobs guardan hasta 256 KB cada uno y se conservan entre ejecuciones.',
    ].join('\n\n'),
    results: [
      '',
      '',
      '',
    ],
  },

  'conditions': {
    title: 'Condiciones',
    body: [
      '`{if:value|operator|value|then:...|else:...|finally:...}` compara dos valores y ejecuta la rama que corresponde. `then:`, `else:` y `finally:` pueden ir en cualquier orden y se puede omitir cualquiera de ellas (hace falta al menos una). Solo se evalúa la rama que coincide; `finally:` se evalúa siempre después y se añade detrás.',
      'Primero se evalúan los dos valores y luego se comparan. Escribe el operador sin espacios alrededor (`|=|`, no `| = |`); si no, no se reconoce y todo el `{if}` se muestra como texto. Los espacios que dejes alrededor de los valores también cuentan como parte de ellos.',
      '`=` y `!=` comparan texto exactamente, distinguiendo mayúsculas y minúsculas. `>`, `>=`, `<` y `<=` comparan números (se admiten decimales, y un valor vacío cuenta como 0); si alguno de los valores no es un número, la comparación es falsa. `~` es un igual flexible: los números se comparan por su valor, así que `1.50` coincide con `1.5`, y todo lo demás se compara como texto sin distinguir mayúsculas, así que `Yes` coincide con `yes`. `?` trata el segundo valor como una regex y comprueba si coincide en cualquier parte del primer valor, sin distinguir mayúsculas (usa `^` y `$` para que coincida con todo el valor, y `\\|` para un `|` literal en la regex).',
      'Para combinar comprobaciones, `{and:a|b|c}` ejecuta cada parte en orden y se detiene en la primera que salga vacía. Si ninguna está vacía, devuelve la última parte. `{or:a|b|c}` devuelve la primera parte que no esté vacía. Las dos van de izquierda a derecha y se saltan el resto en cuanto tienen una respuesta. Con una sola parte (sin `|`), `{or}` simplemente la evalúa y la devuelve.',
    ].join('\n\n'),
    table: {
      columns: ['Operador', 'Significado', 'Compara'],
      rows: [
        ['', 'Igual', 'Texto, coincidencia exacta'],
        ['', 'Distinto', 'Texto, coincidencia exacta'],
        ['', 'Mayor que', 'Números'],
        ['', 'Mayor o igual que', 'Números'],
        ['', 'Menor que', 'Números'],
        ['', 'Menor o igual que', 'Números'],
        ['', 'Igual flexible', 'Números por su valor; si no, texto sin distinguir mayúsculas'],
        ['', 'Coincidencia de regex', 'Texto, con la regex del segundo valor, sin distinguir mayúsculas'],
      ],
    },
    results: [
      'Con el argumento `YES`: Great!',
      'Critical hit! (más o menos 1 de cada 10 veces)',
      'El apodo guardado, o tu nombre de usuario si no hay ninguno.',
    ],
  },

  'code-execution': {
    title: 'Ejecutar código',
    body: [
      'Los tags pueden ejecutar código real en un entorno aislado (sandbox): usa un lenguaje de programación como nombre de función, como `{python:print("hi")}` o `{js:console.log(1 + 1)}`. Lo que imprima el programa se añade al resultado del tag en ese punto, así que puedes mezclar libremente código y TagScript normal.',
      'El código también se puede envolver en un bloque de código ``` dentro de la función (`{python:```py ... ```}`). El lenguaje escrito después de las comillas invertidas de apertura se ignora; el lenguaje lo decide el nombre de la función. Una función vacía no hace nada.',
      'Los nombres de lenguaje no distinguen mayúsculas, y los nombres internos también funcionan (`{node:...}`, `{golang:...}`, `{c_plus_plus:...}`). Se puede pedir una versión concreta después de un guion, como `{python-3.12.15:...}` o `{node-26.12.1:...}`; tiene que ser una de las versiones de la tabla, escrita completa. Sin ella, se usa la versión por defecto.',
      'Cada ejecución de código cuenta como una petición de red (los archivos cargados con líneas `load` no cuestan más). Desde dentro del código no se pueden ejecutar otros tags: un `{tag}` dentro de una función de código se deja como texto normal.',
      'La tabla muestra todos los lenguajes y los nombres con los que puedes llamarlos. Python, Node.js, Bun y Lua además reciben un objeto `discord` ya preparado con el contexto, las variables y el almacenamiento del tag (mira "El objeto `discord`" más abajo).',
    ].join('\n\n'),
    table: {
      columns: ['Lenguaje', 'Nombres que puedes usar', 'Notas'],
      rows: [
        ['', '', 'ffmpeg e ImageMagick están instalados.'],
        ['', '', ''],
        ['', '', 'Versión 1.4.3. Ejecuta JavaScript y TypeScript, con los mismos paquetes y el mismo objeto `discord` que Node.js.'],
        ['', '', 'Versiones 17.0.0 (C17) y 23.0.0 (C23, por defecto).'],
        ['', '', 'Versiones 20.0.0 (C++20) y 23.0.0 (C++23, por defecto).'],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        ['', '', 'Sin objeto `discord`.'],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        ['', '', 'Versiones 25.0.4 y 27.0.0 (por defecto).'],
        ['', '', ''],
        ['', '', ''],
        ['', '', 'Versiones 5.4.9 y 5.5.1 (por defecto), con dkjson y base64. Tiene el objeto `discord`.'],
        ['NASM (32 bits)', '', ''],
        ['NASM (64 bits)', '', ''],
        ['', '', 'Versiones 22.23.3, 24.22.0 (por defecto) y 26.12.1. Tiene el objeto `discord`.'],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        ['', '', 'Versiones 3.11.17, 3.12.15, 3.13.16 y 3.14.8 (por defecto). Tiene el objeto `discord`.'],
        ['', '', 'Versión 2.7.18. Tiene el objeto `discord`.'],
        ['', '', ''],
        ['', '', ''],
        ['', '', 'Ejecuta el código como SQL en una base de datos nueva en memoria.'],
        ['', '', ''],
        ['', '', 'Los mismos paquetes que Node.js, pero sin objeto `discord`.'],
      ],
    },
    results: [
      '',
      '',
      '',
    ],
  },

  'code-tagscript-first': {
    title: 'El TagScript dentro del código se ejecuta primero',
    body: [
      'Antes de que tu código se envíe al sandbox, todo el argumento se evalúa como TagScript. Eso es útil, porque `{python:print("{user}")}` imprime tu nombre de usuario, pero también significa que cada `{...}` de tu código se lee como una posible función de TagScript.',
      'En el código hay llaves por todas partes: diccionarios, sets y f-strings de Python, objetos, bloques y plantillas `${}` de JavaScript, y los cuerpos de las funciones de C, Java, Rust y Go. Si el texto entre las llaves coincide con el nombre de una función (`{name}`, `{id}`, `{user}`, `{text}`, `{e}`, `{pi}`, `{args}`...) se sustituye, y el programa falla de formas confusas. Las llaves que no coinciden con un nombre de función se dejan como están, pero lo que haya dentro se sigue evaluando y puede gastar el límite de iteraciones.',
      'La solución es envolver el código en `{ignore:...}`, que lo pasa exactamente como se escribió. Puedes dejar fuera del `{ignore}` las partes de TagScript que sí quieras, por ejemplo las líneas `load` o un valor que insertes al principio. Las llaves dentro de `{ignore}` tienen que seguir equilibradas, así que una `{` suelta dentro de un string debería escribirse de otra forma (como `chr(123)` en Python).',
      'Para pasar al código lo que escribe el usuario de forma segura, insértalo con `{jsonify:...}`. Convierte cualquier texto en un string literal entre comillas y escapado, válido tanto en Python como en JavaScript, así que las comillas o saltos de línea del texto no pueden romper tu código.',
    ].join('\n\n'),
    results: [
      '',
      'Con los argumentos `Ana "the great"`: Hello Ana "the great", your name has 15 letters',
      'Hi cake (no Bob): `{name}` es una función de TagScript, así que se sustituyó por tu nombre de usuario antes de que Python se ejecutara. Envolver el código en `{ignore}` lo arregla.',
    ],
  },

  'code-environment': {
    title: 'Qué puede usar el código',
    body: [
      'Cada ejecución empieza en un sandbox nuevo y vacío, con su carpeta de trabajo en `/home/notsocoder`. No se conserva nada entre ejecuciones salvo lo que guardes en el almacenamiento, los blobs y las variables del objeto `discord`.',
      'El código tiene acceso a internet, limitado a unos 20 Mbps y 3 peticiones por segundo, así que puede llamar a APIs web (por ejemplo con `requests` en Python o `fetch` en Node.js). Una ejecución puede durar unos 15 segundos antes de que se detenga, algo más para usuarios premium.',
      'Las herramientas de línea de comandos `ffmpeg`, `ffprobe` e ImageMagick están instaladas para todos los lenguajes, así que hasta un tag `{bash}` puede convertir multimedia. Los paquetes de la tabla de abajo vienen preinstalados; no se puede instalar nada más.',
      'Cualquier cosa que un programa escriba en su salida de errores (stderr) detiene el tag con ese texto como error, aunque solo sea un aviso. Silencia los avisos o escribe en stdout. La única excepción es ffmpeg, que imprime su cabecera de versión en stderr aunque funcione: si la salida de errores empieza por esa cabecera o menciona `Input`, el tag continúa siempre que el programa haya generado archivos de salida. Pasar `-hide_banner -loglevel error` a ffmpeg evita el problema por completo.',
    ].join('\n\n'),
    table: {
      columns: ['Lenguaje', 'Paquetes de terceros'],
      rows: [],
    },
    results: [
      '',
      '[1, 2, 3] (los avisos se silencian para que no puedan detener el tag)',
    ],
  },

  'code-output': {
    title: 'Qué devuelve el código',
    body: [
      'El texto impreso en stdout se añade al resultado del tag, sin los espacios de alrededor. El texto impreso de hasta 16.000 caracteres se comprueba por si es JSON (embeds, componentes, páginas); el texto más largo siempre se añade como texto normal. El mensaje final se sigue cortando a la longitud normal de un mensaje.',
      'Si el programa imprime un único objeto JSON, algunas claves se convierten en partes reales del mensaje en lugar de texto:',
      '- `embed` (un objeto de embed) y `embeds` (una lista de ellos) añaden embeds, hasta 10 en total.\n- `components` (una lista de botones, menús de selección o filas de acción, en el mismo formato que `{componentjson}`) añade componentes; un string opcional `componentsOnTimeout` es TagScript que se ejecuta cuando caducan.\n- `pages` añade páginas al paginador en el mismo formato que `{pagejson}`, pero solo cuando es la única clave del objeto.',
      'Cuando el JSON tiene `embed`, `embeds` o `components`, no se muestra nada del texto impreso, y las demás claves (como `content`) se ignoran. Imprime una línea de texto normal, o usa `{embedjson}` fuera del código, si necesitas las dos cosas.',
      'Los archivos que el programa guarda en `/home/notsocoder/output` (o `./output`) se adjuntan a la respuesta, hasta 10 por ejecución. Los archivos más grandes que el límite de subida del canal se omiten, y la respuesta en conjunto sigue pudiendo llevar solo 10 archivos adjuntos. Las imágenes y vídeos de salida pasan por el mismo filtro de contenido que el resto de multimedia, así que los resultados NSFW se bloquean fuera de los canales NSFW. Estos archivos se pueden pasar después a otro código, a `{ai}` o a MediaScript con `load FILE_X` (mira "Cargar archivos con `load`").',
    ].join('\n\n'),
    results: [
      'Un embed de color blurple titulado "Hello from Python" (el JSON en sí no se muestra).',
      'Un gráfico de líneas adjunto como chart.png.',
      'done, con numbers.txt adjunto.',
    ],
  },

  'code-discord-object': {
    title: 'El objeto `discord`',
    body: [
      'En Python (3 y 2), Node.js (JavaScript), Bun y Lua, un objeto global `discord` contiene el contexto de la ejecución del tag. En Python es un dict (`discord["user"]["id"]`), en Node.js y Bun un objeto (`discord.user.id`) y en Lua una tabla (`discord.user.id`). Deno, TypeScript y los demás lenguajes no lo reciben.',
      'La mayoría de campos son copias de solo lectura: cambiarlos no hace nada. Solo `variables`, `storage` y `blobs` se vuelven a guardar cuando el programa termina con normalidad. En Node.js eso pasa en el evento `beforeExit`, así que llamar a `process.exit()` o que el programa falle se salta el guardado; en Python pasa al salir, así que `os._exit()` se lo salta. Cambiar la carpeta de trabajo también puede hacer que no se encuentre lo que hay que guardar.',
      '`variables` contiene las variables del tag en el momento en que empezó el código (incluidas las privadas como `__args` y `__files`). Después de la ejecución, cada clave que no empiece por `__` se define como variable de TagScript, convertida a texto y cortada a 1 MB, siguiendo las reglas normales de las variables (nombres de hasta 64 caracteres, hasta 100 variables). Quitar una clave en el código no elimina la variable de TagScript; usa `{delete}` para eso.',
      '`storage` contiene el almacenamiento persistente del tag para los ámbitos actuales de `user`, `channel`, `server` y `global`, los mismos datos que leen `{getuser}`, `{getchannel}`, `{getserver}` y `{getglobal}`. Cada ámbito se guarda entero: las claves que borres se eliminan, y poner un ámbito a `{}` (o a `None`/`null` en Python y Node.js) lo vacía. Los valores se guardan como texto: un número `5` pasa a ser `"5"`, y un dict, lista u objeto se guarda como su texto JSON (vuelve a interpretarlo cuando lo leas).',
      'El almacenamiento escrito desde código tiene reglas extra: cada ámbito puede guardar como mucho 5 claves, las claves pueden tener hasta 128 caracteres y los valores hasta 16.384 caracteres. Saltarse una detiene el tag con un error. `{setuser}` y compañía aplican el mismo límite de 5 claves, así que el almacenamiento escrito fuera del código nunca puede bloquear una ejecución de código. Los valores vacíos no cuentan para el límite.',
      '`blobs` guardan un valor más grande por ámbito (`user`, `channel`, `server`, `global`), de hasta 256 KB cada uno, y solo se pueden usar desde código. Un blob llega como `bytes` en Python, un `Buffer` en Node.js y un string en Lua, o como `None`/`null` cuando está vacío. Puedes asignar bytes, un string o cualquier otro valor (que se guarda como texto JSON); ponlo a `None`/`null` para vaciarlo. En Lua, poner un blob o un ámbito de almacenamiento a `nil` conserva el valor anterior, así que asigna un string o una tabla vacíos.',
      'El almacenamiento y los blobs solo existen al ejecutar un tag guardado. Los alias comparten los datos de su tag principal. Cuando el código se ejecuta fuera de un tag guardado, los dos empiezan vacíos y los cambios se descartan.',
    ].join('\n\n'),
    table: {
      columns: ['Campo', 'Qué contiene', 'Modificable'],
      rows: [
        ['', 'El usuario que ejecutó el tag (id, username, avatar...).', 'No'],
        ['', 'Los datos de miembro del servidor de ese usuario (nick, roles, joined_at...). Null fuera de servidores.', 'No'],
        ['', 'El canal donde se ejecutó el tag, y su id.', 'No'],
        ['', 'El servidor y su id. Null en MD. En servidores con más de 10.000 miembros, solo se incluyen el bot, el usuario y los miembros que están en canales de voz.', 'No'],
        ['', 'El mensaje que ejecutó el tag. Null en comandos de barra y clics en botones.', 'No'],
        ['', 'El tag guardado: id, name, content, uses, nsfw, locked, created, edited, user (el dueño) y más. Null fuera de tags guardados.', 'No'],
        ['', 'Los datos de usuario y de miembro del propio bot.', 'No'],
        ['', 'Las variables del tag. Las claves que no empiezan por `__` se copian de vuelta como variables de TagScript.', 'Sí'],
        ['', 'Objetos `user`, `channel`, `server` y `global` de almacenamiento persistente clave/valor.', 'Sí'],
        ['', 'Valores binarios `user`, `channel`, `server` y `global`, de hasta 256 KB cada uno.', 'Sí'],
      ],
    },
    results: [
      '',
      'You have run this tag 3 times (el contador es el mismo que lee `{getuser:runs}`)',
      '',
      '',
    ],
  },

  'code-files': {
    title: 'Archivos en el código',
    body: [
      'Los archivos que le pasas al programa con líneas `load` (explicadas en la siguiente sección) se guardan en `/home/notsocoder/input` (también accesible como `./input`), con el nombre que les diste o el de la descarga. Los nombres de archivo se limpian, así que los espacios y los caracteres poco habituales pueden sustituirse. Se pueden cargar hasta 10 archivos en una ejecución.',
      'La ruta completa de cada archivo cargado también se pone en una variable de entorno: `FILE_1`, `FILE_2` y así sucesivamente. Léela con `os.environ["FILE_1"]` en Python, `process.env.FILE_1` en Node.js o `$FILE_1` en Bash. Esta numeración solo cuenta los archivos cargados en esta ejecución, y es independiente de los números `FILE_X` que se usan en las líneas `load`.',
      'Las variables de entorno se numeran poniendo primero los archivos reutilizados de antes en el tag (`load FILE_X`) y después los descargados de URLs web, cada grupo en el orden de sus líneas `load`. Si solo cargas de un tipo, es simplemente el orden de las líneas. Al mezclar los dos, dar un nombre a cada archivo y abrirlo desde `/home/notsocoder/input/NAME` evita cualquier confusión.',
      'Todo lo que se guarde en `/home/notsocoder/output` (o `./output`) se adjunta a la respuesta cuando termina el programa. No intentes usar `{attach}` con esas rutas; solo existen dentro del sandbox.',
    ].join('\n\n'),
    results: [
      '',
      'La última imagen o vídeo del chat con los colores invertidos.',
    ],
  },

  'loading-files': {
    title: 'Cargar archivos con `load`',
    body: [
      'Al código, a `{ai}` y a MediaScript se les pueden dar archivos empezando su contenido con líneas `load`. En el código y en `{ai}`, la línea es `load URL` o `load URL FILENAME`; en MediaScript es `load URL MEDIA_KEY`, donde la tercera palabra da nombre a la multimedia dentro del script.',
      'Las reglas para el código y `{ai}`:',
      '- Pon una línea `load` por archivo al principio del todo, antes de cualquier otro código o texto. Las líneas en blanco entre ellas no son problema.\n- La primera línea que no sea una línea `load` termina la lista, y todo lo que viene a partir de ahí es tu código o tu prompt. Una línea `load` más abajo se trata simplemente como código.\n- La URL no puede contener espacios, y todo lo que vaya después de `##` en una línea `load` es un comentario. `load` no distingue mayúsculas.\n- La URL suele ser TagScript, como `{image}`, `{avatar}` o `{iv}`, que se sustituye antes de que se ejecute el código.\n- Da un nombre distinto a cada archivo: si dos líneas `load` tienen el mismo nombre de archivo, solo se queda la última.',
      'En lugar de una URL web puedes escribir `FILE_X` para reutilizar un archivo que esta ejecución del tag ya haya producido: cualquier cosa añadida con `{attach}`, `{attachtext}`, `{mediascript}`, o archivos escritos por código anterior. `FILE_1` es el primer archivo adjunto a la respuesta en ese momento, `FILE_2` el segundo, y así sucesivamente, en el orden en que se añadieron. `{get:__files}` muestra la lista actual si no estás seguro.',
      '`FILE_X` mueve el archivo: se entrega y se quita de los archivos adjuntos de la respuesta, que es lo que quieres cuando el archivo era solo un paso intermedio. `FILE_X_COPY` entrega una copia y deja el original adjunto. Un archivo cargado con `FILE_X` mantiene su nombre a menos que le des uno nuevo.',
      'Como `FILE_X` quita archivos, los números de los archivos que van detrás bajan una vez que termina la función. Si la respuesta tiene los archivos 1, 2 y 3 y el código carga `FILE_1`, el antiguo archivo 2 es `FILE_1` para la siguiente función. Dentro de una misma función todos los números se refieren a la lista tal como estaba antes de que empezara esa función, así que `load FILE_1` y `load FILE_2` juntos cogen los dos primeros archivos. Los archivos de salida nuevos se añaden al final de la lista.',
      'En MediaScript, `FILE_X` y `FILE_X_COPY` funcionan igual, pero se sustituyen en cualquier parte del script, no solo en las líneas `load`.',
    ].join('\n\n'),
    table: {
      columns: ['Escribe', 'Qué pasa'],
      rows: [
        ['', 'Descarga la URL y la pasa (con el nombre de la descarga).'],
        ['', 'Lo mismo, guardado como name.png.'],
        ['', 'Pasa el 2.º archivo adjuntado hasta ahora y lo quita de la respuesta.'],
        ['', 'Pasa el 2.º archivo adjuntado hasta ahora y lo mantiene en la respuesta.'],
        ['', 'Mueve el 2.º archivo, renombrado a new.png.'],
      ],
    },
    results: [
      'Inverted!, con la última imagen del chat adjunta como inverted.png, con los colores invertidos.',
      'Con el argumento `@friend`: tu avatar y el de tu amigo uno al lado del otro.',
      'La descripción que hace la IA de la última imagen del chat (gasta tu única llamada a `{ai}`).',
      'The inverted image is 512x512. El resultado de MediaScript se movió a Python, así que no se adjunta.',
      'Python crea un cuadrado rojo, MediaScript lo hace girar, y solo se envía el GIF que gira.',
      'b1.png is 39702 bytes, con b1.png todavía adjunto gracias a `_COPY`.',
    ],
  },

  'settings': {
    title: 'Ajustes',
    body: [
      '`{settings:SETTING|value}` cambia cómo se comporta el resto del tag. Los nombres de ajuste no distinguen mayúsculas. Los ajustes solo afectan a la ejecución actual y se aplican a las funciones que se ejecutan después de ellos, así que ponlos al principio del tag.',
      'Los espacios alrededor del ajuste y del valor se ignoran, y un valor vacío quita el ajuste. Un nombre de ajuste desconocido, o una llamada sin exactamente un `|`, se deja en el resultado como texto.',
    ].join('\n\n'),
    table: {
      columns: ['Ajuste', 'Valor', 'Qué hace'],
      rows: [
        ['', 'Un nombre de modelo, p. ej. ANTHROPIC_CLAUDE_HAIKU_5_5', 'Qué modelo usa `{ai}`. Un modelo desconocido da un error con la lista de opciones válidas.'],
        ['', 'Cualquier texto', 'La personalidad que usa `{ai}` en lugar de la que tengas guardada.'],
        ['', 'true o false', 'Permite a cualquiera usar los botones y menús de selección del tag. Por defecto solo puede la persona que ejecutó el tag.'],
        ['', 'true o false', 'Por defecto, una respuesta que es solo un archivo (o solo un enlace de nsb.gg) se muestra como la respuesta de un comando de multimedia, con su tamaño y quién lo ejecutó. `true` la envía como un archivo adjunto o enlace normal de Discord.'],
        ['', 'SEARCH_YOUTUBE o search.youtube (o un alias como s.yt)', 'Cuando `{transcribe}` no encuentra audio ni vídeo, busca en YouTube con su argumento.'],
        ['', 'MEDIA_IMAGE_IMAGINE, SEARCH_GOOGLE_IMAGES o SEARCH_DUCK_DUCK_GO_IMAGES (o los nombres de función, como imagine, y sus alias)', 'Cuando funciones de imagen como `{image}`, `{iv}`, `{ocr}` o `{edit}` no encuentran ninguna imagen, genera una (como URL temporal) o busca una usando su argumento.'],
        ['', 'true o false', 'Se pasa a la generación de imágenes como su opción "do not error" (no dar error).'],
        ['', '', 'Qué modelo usa la generación de imágenes (`{imagine}`, `{edit}`, scripts de multimedia).'],
      ],
    },
    results: [
      'La última imagen del chat o, si no hay ninguna, un resultado de Google Imágenes para los argumentos.',
      'Una imagen generada con Flux Klein.',
    ],
  },

  'limits': {
    title: 'Límites',
    body: [
      'Para que todo vaya rápido y sea justo, cada ejecución de un tag tiene límites. Pasarse de uno detiene el tag con un error, salvo el límite de iteraciones (explicado abajo). Estos límites son los mismos para todos, con premium o sin él, excepto cuánto tiempo pueden ejecutarse el tag y su código. Los tags verificados del directorio de tags siempre se ejecutan con los límites de premium, los use quien los use. Cada clic en un botón o menú de selección del mensaje de un tag empieza con los límites a cero.',
      'El límite de iteraciones cuenta cuántas veces el motor analiza un trozo de texto: una vez para el propio tag y una vez por cada argumento que contiene una función. Cuando se agota, el resto del tag se muestra como texto normal sin evaluar.',
    ].join('\n\n'),
    table: {
      columns: ['Límite', 'Por defecto', 'Qué cubre'],
      rows: [
        ['Tiempo de ejecución', '40 segundos', 'Cuánto puede durar toda la ejecución, incluido todo lo que llama: 60 segundos en un servidor premium, 70 con Premium, 100 con Plus y 130 con Plus AI.'],
        ['Iteraciones', '', 'Veces que se analiza texto por ejecución. Cuando se agotan, el texto restante se muestra sin evaluar.'],
        ['Peticiones de red', '', 'Funciones que acceden a internet: descargas, búsquedas, archivos adjuntos, ejecuciones de código, buscar usuarios, etc.'],
        ['Peticiones de IA', '', 'Llamadas a `{ai}`.'],
        ['Peticiones de aprendizaje automático', '', 'Generación y edición de imágenes (`{imagine}`, `{edit}` y sus versiones de URL).'],
        ['Comprobaciones de seguridad', '', 'Llamadas a `{nsfwfilter}`.'],
        ['Acciones de la API', '', 'Funciones que crean algo, como `{api.create.reminder}`.'],
        ['Llamadas a tags', '', 'Otros tags ejecutados con `{tag}`.'],
        ['Ejecuciones de componentes', '', 'Veces que el tag puede volver a ejecutarse por clics en botones, menús de selección o `{componentsontimeout}`.'],
        ['Archivos adjuntos', '', 'Archivos adjuntos a la respuesta.'],
        ['Embeds', '', 'Embeds en la respuesta.'],
        ['Páginas', '1.000', 'Páginas añadidas con `{pagejson}` o desde código.'],
        ['Variables', '', 'Variables definidas durante una ejecución.'],
        ['Longitud del nombre de variable', '64 caracteres', 'Longitud del nombre de una variable.'],
        ['Longitud del valor de variable', '', 'Los valores más largos se cortan.'],
        ['Longitud de la clave de almacenamiento', '128 caracteres', 'Longitud de una clave de almacenamiento persistente.'],
        ['Longitud del valor de almacenamiento', '16.384 caracteres', 'Longitud de un valor de almacenamiento persistente.'],
        ['Claves de almacenamiento por ámbito', '', 'Claves que un ámbito (usuario, canal, servidor, global) puede guardar por tag, desde funciones set o desde código. Los valores vacíos no cuentan.'],
        ['Tamaño del blob', '', 'Tamaño del blob de cada ámbito, escrito desde código.'],
        ['Tiempo de ejecución del código', 'Unos 15 segundos', 'Cuánto puede durar una ejecución de código antes de que se detenga: 20 segundos en un servidor premium, 30 con Premium y 45 con Plus.'],
        ['Comprobación de JSON en la salida del código', '16.000 caracteres', 'La salida impresa más larga que esto nunca se lee como JSON de embeds, componentes o páginas, solo como texto.'],
        ['Archivos cargados en el código', '', 'Archivos de líneas `load` en una ejecución de código.'],
        ['Archivos desde el código', '', 'Archivos guardados en la carpeta de salida en una ejecución (la respuesta sigue llevando 10 archivos adjuntos en total).'],
        ['Red del código', '', 'Velocidad de internet dentro del sandbox, con unas 3 peticiones por segundo.'],
        ['Longitud del prompt de IA', '12.000 caracteres', 'Los prompts de `{ai}` más largos se cortan.'],
        ['Tiempo de regex', '', 'Cuánto tiempo puede dedicar `{replace}` a una expresión regular.'],
        ['Tamaño del bucle', '', 'Elementos que `{foreach}` puede recorrer.'],
      ],
    },
  },

  'output': {
    title: 'Salida',
    body: [
      'Cuando el tag termina, todo el texto que ha producido se recorta y se envía como mensaje. El texto se corta a 2.000 caracteres (o 4.000 cuando el mensaje usa los diseños de componentes más nuevos). Los saltos de `{newline}` sobreviven a este recorte.',
      'Los archivos añadidos con `{attach}` (y los escritos por código) se envían como archivos adjuntos, hasta 10. Los embeds de `{embedjson}` se envían junto con el texto, también hasta 10. Si el tag no produce nada en absoluto, el bot responde con "Tag returned no content".',
      'Se pueden añadir botones y menús de selección con `{componentjson}`. Dale a un botón o menú de selección un campo `run` con TagScript, y ese código se ejecuta al hacer clic, manteniendo las mismas variables. El JSON en sí se evalúa al crear el componente, así que envuelve el código de `run` en `{ignore:...}` si solo debe ejecutarse al hacer clic. Las opciones elegidas en un menú de selección están disponibles como JSON en `{get:__values}`. Un mensaje puede tener hasta 5 filas de acción o hasta 25 botones sueltos, pero no las dos cosas. Los componentes dejan de funcionar después de un minuto, y `{componentsontimeout:...}` puede ejecutar TagScript cuando eso pasa.',
      'Las páginas de `{pagejson}` convierten la respuesta en un paginador que puedes ir pasando. Cuando un tag tiene páginas, la respuesta está formada solo por esas páginas, y el resto del texto y los embeds no se muestran. No se pueden añadir páginas desde un clic en un botón.',
      'Antes de enviarse, el texto, los embeds y los componentes pasan por un filtro de contenido, y un mensaje con 150 saltos de línea o más se sustituye por un aviso de spam. Mientras se ejecuta, el texto de un tag tampoco puede superar el límite de tamaño de subida del canal.',
    ].join('\n\n'),
    results: [
      'Un embed rojo titulado "Hello cake".',
      'El texto "Look at this!" con la imagen adjunta como bot.png.',
      'Un botón "Roll" que saca un número nuevo cada vez que se hace clic en él.',
    ],
  },

  'errors': {
    title: 'Errores',
    body: [
      'Cuando una función falla (por ejemplo una descarga que no funciona, al llegar a un límite o al definir una variable que empieza por `__`), todo el tag se detiene y el bot responde con un mensaje "Command Error" que explica qué ha ido mal. No se envía nada más del tag.',
      'No todos los fallos son errores. Los nombres de función desconocidos, y las funciones a las que se les dan argumentos que no pueden usar, se dejan en el resultado como texto normal, lo que hace fácil detectar erratas.',
      'Para gestionar los errores tú mismo, `{iferror:a|b|c}` prueba cada parte en orden y devuelve la primera que no falle (dentro de una parte posterior, `{get:error}` es el mensaje del error anterior), y `{evalsilent:...}` ejecuta su contenido y simplemente descarta cualquier error. Para detener un tag a propósito, `{exit:message}` descarta todo lo producido hasta ese momento y envía solo el mensaje, mientras que `{exitsilent:message}` se detiene pero conserva lo que ya se había producido. Un exit dentro de `{iferror}` o `{evalsilent}` no se captura: sigue deteniendo todo el tag.',
    ].join('\n\n'),
    results: [
      'Adjunta el archivo, o dice "That link didn\'t work!" si no se puede descargar.',
      'Adjunta el archivo, o dice por qué no se pudo descargar.',
      'Sin argumentos: Please give me something to rate!',
    ],
  },
};
