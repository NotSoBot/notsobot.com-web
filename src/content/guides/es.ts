// The Spanish guides, following en.ts (same section ids and facts). Button names match the Activity's and the bot's
// Spanish strings, command names stay in English like the FAQ's. "Flag Guesser" and "Letter Trail" stay as names.

import type { GuideBook } from './types';


export const GUIDES_SPANISH: GuideBook = {
  opening: {
    id: 'opening',
    title: 'Abrir la Actividad',
    blocks: [
      {kind: 'text', text: 'La Actividad de Discord de NotSoBot tiene el editor multimedia y los juegos. Se abre dentro de un canal y todos los que estén ahí pueden unirse.'},
      {kind: 'list', items: [
        'Usa `/games play` para ir directo a los juegos, o `/editor` para el editor multimedia.',
        'O ábrela desde NotSoBot en el lanzador de apps de Discord y elige **Editar multimedia** o **Juegos**.',
        '¿Alguien ya está dentro? Pulsa **Unirse** en el mensaje que NotSoBot publica en el canal.',
      ]},
      {kind: 'tip', text: 'Cada juego y el editor multimedia tienen un botón con un signo de interrogación que abre su guía dentro de la Actividad.'},
    ],
  },

  guides: {
    'flag-guesser': {
      title: 'Flag Guesser',
      summary: 'Di de qué país es cada bandera antes de que se acabe el tiempo, juntos en la Actividad o en el chat.',
      quick: [
        'Todos ven la misma bandera. Di el país antes de que se acabe el tiempo.',
        'Juega en una sala con otros, o pulsa **Jugar solo** para una partida solo para ti.',
        'Una bandera vale 3 puntos, 2 tras la primera pista y 1 tras la segunda.',
        'Quien acierta primero gana +1, y 3 o más seguidas suman +1 más.',
        'Escribiendo: adivina todas las veces que quieras. Cuatro opciones: un intento por bandera.',
        'Las erratas pequeñas cuentan, y si te acercas te avisa para que revises cómo se escribe.',
        'Tu puntuación va a tus [puntos de juego](guide:game-points) cuando termina la partida.',
      ],
      sections: [
        {
          id: 'starting',
          title: 'Empezar una partida',
          blocks: [
            {kind: 'text', text: 'Flag Guesser se juega en salas dentro de la Actividad de Discord de NotSoBot. También hay una versión más rápida en el chat, de una bandera cada vez.'},
            {kind: 'steps', items: [
              'Usa `/games play` en un canal, o abre NotSoBot desde el lanzador de apps de Discord y elige **Juegos**.',
              'En la pestaña Juegos, elige **Flag Guesser**.',
              'Pulsa **Jugar** o **Mirar** en una sala, usa **Partida rápida**, crea la tuya con **Nueva sala**, o pulsa **Jugar solo** para jugar sin nadie más.',
              'Espera a los demás en la sala, y el anfitrión pulsa **Empezar juego**. Antes de la primera bandera hay una cuenta atrás de 3 segundos (3, 2, 1), y no se puede responder hasta que termina.',
            ]},
            {kind: 'text', text: '¿Estás solo en la sala? Te ofrece **Invita a tus amigos**: comparte un enlace o publica una invitación en el canal. O empieza igual, una partida funciona con un solo jugador.'},
            {kind: 'text', text: 'NotSoBot suele publicar también un mensaje en el canal con un botón **Unirse**, para que otros entren.'},
            {kind: 'tip', text: '¿Jugando a `/games flag-guesser` en el chat? Su botón **Abrir en la Actividad** abre una sala que sigue la misma partida: primero sale la bandera que estaba en pantalla, con la misma dificultad, respuestas escritas y un minuto por bandera. Las puntuaciones empiezan de cero.'},
          ],
        },
        {
          id: 'solo',
          title: 'Jugar solo',
          blocks: [
            {kind: 'text', text: '**Jugar solo** en la lista de salas empieza una partida solo para ti. Nadie más ve la sala ni puede entrar.'},
            {kind: 'list', items: [
              'Empieza enseguida, con los ajustes con los que jugaste solo la última vez en este dispositivo. La primera vez usa los ajustes por defecto.',
              'No hay cuenta atrás: la primera bandera sale en cuanto se abre la sala.',
              'Al final, **Jugar otra vez** empieza otra partida con los mismos ajustes. **Cambiar ajustes** te lleva a la sala de espera para cambiarlos antes.',
              'Una partida en solitario no tiene espectadores, invitaciones ni ajustes de sala. Empezar una nueva cierra la anterior.',
              'Tus puntos cuentan para tu total como en cualquier otra partida.',
            ]},
          ],
        },
        {
          id: 'rooms',
          title: 'Salas',
          blocks: [
            {kind: 'text', text: 'Cada partida se juega en una sala. La lista de salas tiene dos pestañas, cada una con cuántas salas tiene:'},
            {kind: 'list', items: [
              '**Este servidor**: las salas creadas en tu servidor, las mismas en la Actividad de cada canal. En un MD, las salas creadas en ese MD.',
              '**Global**: salas que salen en la Actividad de todos los servidores. La gente de otros servidores ve tu nombre y avatar de Discord, y tú los suyos.',
            ]},
            {kind: 'text', text: 'Busca salas por nombre, elige un juego y ordénalas por **Llenándose**, **Jugando ahora** o **Más nuevas**.'},
            {kind: 'text', text: '**Partida rápida** te mete en la sala de espera con más jugadores de la pestaña en la que estás. Se salta las salas con contraseña, las de solo mirar, las salas de las que te expulsaron y las partidas en solitario. Si no hay ninguna, crea una nueva para ti.'},
            {kind: 'text', text: 'Al crear una sala con **Nueva sala** eliges:'},
            {kind: 'list', items: [
              'Un nombre. Si lo dejas vacío, lleva el tuyo.',
              '**Quién puede encontrarla**: **Este servidor** o **Global**. Empieza en la pestaña en la que estás. Quien la crea puede cambiarlo después en **Ajustes de la sala**, pero solo mientras la sala espera para empezar.',
              '**Todos** o **Contraseña**. Con contraseña, solo quien la sepa puede jugar o mirar.',
              '**Solo mirar**: quien entre a partir de ese momento solo mira. Tú y quienes ya estén jugando seguís jugando.',
            ]},
            {kind: 'tip', text: 'Puedes tener 2 salas abiertas en un servidor y 1 sala global a la vez, y en un servidor caben 20. Las partidas en solitario no cuentan. Una sala desaparece unos 10 minutos después de que todos se van.'},
          ],
        },
        {
          id: 'host',
          title: 'El anfitrión y quien crea la sala',
          blocks: [
            {kind: 'list', items: [
              'El **anfitrión** elige los ajustes, empieza la partida y puede terminarla antes. Quien creó la sala es el anfitrión mientras juega. Si no, lo es el primero en entrar, y pasa al siguiente cuando el anfitrión se va.',
              'Quien **crea** la sala puede cambiarle el nombre y la contraseña, activar o quitar solo mirar, expulsar gente y cerrarla.',
              'En una sala del servidor, los moderadores del servidor también pueden expulsar gente y cerrarla. Las salas globales las moderan quien las crea y el equipo de NotSoBot, no los moderadores del servidor.',
              'Quien ha sido expulsado no puede volver a esa sala. Cerrar una sala termina su partida y manda a todos a la lista de salas.',
            ]},
            {kind: 'tip', text: 'Terminar una partida antes devuelve a todos a la sala de espera. Los puntos que cada uno llevaba igual se suman a su total.'},
          ],
        },
        {
          id: 'settings',
          title: 'Ajustes',
          blocks: [
            {kind: 'text', text: 'Solo el anfitrión los cambia, antes de empezar una partida o cuando termina.'},
            {kind: 'facts', items: [
              {label: 'Responder', value: '**Escribiendo** (por defecto): escribe el nombre del país. **Cuatro opciones**: elige uno de cuatro nombres, un intento por bandera.'},
              {label: 'Dificultad', value: '**Fácil**: banderas que casi todos conocen. **Media** (por defecto): la mayoría de los países del mundo. **Difícil**: todos los países, y también territorios con bandera propia.'},
              {label: 'Banderas', value: 'De 5 a 20 por partida, 10 por defecto.'},
              {label: 'Segundos cada una', value: 'De 10 a 60 por bandera, 20 por defecto.'},
            ]},
            {kind: 'tip', text: 'Con cuatro opciones, las respuestas incorrectas suelen ser de la misma parte del mundo, así que se parecen.'},
          ],
        },
        {
          id: 'scoring',
          title: 'Puntuación',
          blocks: [
            {kind: 'facts', items: [
              {label: 'Antes de cualquier pista', value: '3 puntos'},
              {label: 'Tras la pista de la región', value: '2 puntos'},
              {label: 'Tras la pista de las letras', value: '1 punto'},
              {label: 'El primero en acertar', value: '+1'},
              {label: '3 o más seguidas', value: '+1 por cada bandera'},
            ]},
            {kind: 'text', text: 'Una racha cuenta las banderas que aciertas una tras otra. Si fallas una, vuelve a empezar.'},
            {kind: 'text', text: 'Una bandera termina antes cuando todos los que juegan han respondido. Luego se ve la respuesta unos segundos, con quién acertó. Tras la última bandera llegan las puntuaciones finales, y cuántos puntos sumó tu partida a tu total.'},
          ],
        },
        {
          id: 'hints',
          title: 'Pistas y casi aciertos',
          blocks: [
            {kind: 'list', items: [
              'Cuando pasa un tercio del tiempo, aparece la **región**, como Europa o Sudamérica.',
              'A dos tercios del tiempo aparecen las **letras**: la primera letra de cada palabra y cuánto mide, como `F _ _ _ _ _`.',
              'Cada pista quita un punto a lo que vale la bandera.',
            ]},
            {kind: 'text', text: 'Al escribir, las erratas pequeñas cuentan. Si te alejas un poco más, te avisa de que estás cerca para que revises cómo se escribe. Una errata que se parece igual a otro país no cuenta. Fallar no cuesta nada.'},
            {kind: 'text', text: 'Los nombres de países en español, inglés y portugués valen todos, juegues en el idioma que juegues.'},
          ],
        },
        {
          id: 'watching',
          title: 'Mirar',
          blocks: [
            {kind: 'list', items: [
              'Quien mira ve toda la partida en directo, pero no responde. Pulsa **Mirar** en una sala, o **Solo mirar** entre partidas.',
              'Quien mira puede pulsar **Unirme** para jugar desde la siguiente bandera, salvo que la sala sea de solo mirar.',
              'No se espera a quienes miran, así que una bandera termina antes igual cuando todos los jugadores han respondido.',
            ]},
          ],
        },
        {
          id: 'invites',
          title: 'Invitaciones',
          blocks: [
            {kind: 'text', text: 'Cualquiera en una sala puede pulsar **Invitar**. **Compartir enlace** la manda por Discord, y **Publicar en este canal** la publica con un botón para unirse. La invitación abre la Actividad directamente en la sala.'},
            {kind: 'list', items: [
              'Deja entrar en una sala con contraseña sin la contraseña.',
              'Quien fue expulsado de la sala se queda fuera.',
              'Dura 24 horas. La invitación de una sala global funciona desde cualquier servidor, la de una sala del servidor solo en ese servidor.',
            ]},
          ],
        },
        {
          id: 'chat',
          title: 'Flag Guesser en el chat',
          blocks: [
            {kind: 'text', text: 'Usa `/games flag-guesser` en un canal, con una dificultad si quieres (Fácil por defecto).'},
            {kind: 'list', items: [
              'Una bandera por mensaje. Escribe el país en el chat, o pulsa **Adivinar** y escríbelo en el cuadro.',
              'Tienes 60 segundos, en tres tramos de 20: la región aparece a los 20 segundos y las letras a los 40.',
              'Vale 3 puntos, luego 2, luego 1. Si la misma persona acierta 3 o más seguidas, gana +1 cada vez. Si acierta otra persona, se salta la bandera o se acaba el tiempo, la racha vuelve a empezar.',
              'Solo va una bandera a la vez en cada canal. Quien la empezó puede pulsar **Saltar**.',
              'Cuando termina, cualquiera puede pulsar **Jugar otra vez** para la siguiente bandera, durante 15 minutos. Las puntuaciones siguen con Jugar otra vez.',
              'Cada bandera que aciertas suma sus puntos a tu total al momento.',
            ]},
            {kind: 'tip', text: '¿Prefieres rondas con amigos? **Abrir en la Actividad** lleva la partida a una sala.'},
          ],
        },
      ],
    },

    'letter-trail': {
      title: 'Letter Trail',
      summary: 'Forma palabras con letras que se tocan en una cuadrícula que todos juegan a la vez. Las palabras que nadie más encuentra dan puntos extra.',
      quick: [
        'Todos en la sala juegan la misma cuadrícula de letras al mismo tiempo.',
        'Arrastra por letras que se tocan, también en diagonal, para formar una palabra. Cada casilla, una vez por palabra.',
        'Las palabras necesitan al menos 3 letras. Las más largas valen mucho más.',
        'Una casilla está marcada con ×2: una palabra que pasa por ella vale el doble.',
        'Una palabra que nadie más en la sala encontró gana 2 puntos más al final de la ronda.',
        'Ves cuántas palabras tiene cada uno, nunca cuáles.',
        'Tu puntuación va a tus [puntos de juego](guide:game-points) cuando termina la partida, una cuarta parte redondeada hacia arriba.',
      ],
      sections: [
        {
          id: 'starting',
          title: 'Empezar una partida',
          blocks: [
            {kind: 'text', text: 'Letter Trail se juega en salas en la Actividad de Discord de NotSoBot, como [Flag Guesser](guide:flag-guesser).'},
            {kind: 'steps', items: [
              'Usa `/games play` en un canal, o pulsa **Launch** en NotSoBot en el lanzador de apps de Discord y elige **Juegos**.',
              'En la pestaña Juegos, elige **Letter Trail**.',
              'Pulsa **Jugar** o **Mirar** en una sala, usa **Partida rápida**, crea la tuya con **Nueva sala**, o pulsa **Jugar solo** para jugar sin nadie más.',
              'Espera en la sala a los demás y el anfitrión pulsa **Empezar juego**. Con más de un jugador hay primero una cuenta atrás de 3 segundos, y las letras aparecen cuando termina.',
            ]},
            {kind: 'text', text: 'Por ahora las palabras son en inglés, en cualquier idioma que uses la Actividad.'},
          ],
        },
        {
          id: 'playing',
          title: 'Formar palabras',
          blocks: [
            {kind: 'list', items: [
              '**Arrastrar:** pon el dedo (o el ratón) en la primera letra y deslízalo por las demás. Al soltar se envía la palabra. Vuelve a la letra anterior para deshacer un paso.',
              '**Tocar:** toca las letras una a una, cada una junto a la anterior. Toca otra vez la última, o pulsa **Enviar**, para enviarla. Toca fuera de la cuadrícula para empezar de nuevo.',
              '**Teclado:** escribe una palabra y la cuadrícula ilumina una forma de formarla, si la hay. **Enter** la envía, **Retroceso** quita una letra y **Esc** la borra.',
            ]},
            {kind: 'text', text: 'Las letras se tocan de lado y en diagonal. Cada casilla solo se usa una vez por palabra. La casilla **Qu** son dos letras, Q y U juntas.'},
            {kind: 'text', text: 'Una palabra que cuenta se ilumina en verde y va a tu lista, la más nueva primero. Una que no cuenta tiembla y dice por qué: muy corta, no está en la lista de palabras, letras que no se tocan o una que ya tienes. Las palabras que fallan no cuestan nada.'},
            {kind: 'tip', text: 'Mientras dura una ronda, todos ven cuántas palabras tiene cada jugador, pero nunca cuáles. Esas se ven al final de la ronda.'},
          ],
        },
        {
          id: 'scoring',
          title: 'Puntuación',
          blocks: [
            {kind: 'facts', items: [
              {label: '3 letras', value: '1 punto'},
              {label: '4 letras', value: '2 puntos'},
              {label: '5 letras', value: '4 puntos'},
              {label: '6 letras', value: '6 puntos'},
              {label: '7 letras', value: '9 puntos'},
              {label: '8 letras o más', value: '12 puntos'},
            ]},
            {kind: 'text', text: 'Tu puntuación de una ronda es la suma de tus palabras, con la casilla ×2 y los puntos de solo tú que se explican abajo. Tu puntuación de la partida es la suma de tus rondas.'},
          ],
        },
        {
          id: 'only-you',
          title: 'Solo tú',
          blocks: [
            {kind: 'text', text: 'Al terminar una ronda, cada palabra que solo tú encontraste en la sala gana **2 puntos más**. Una palabra que alguien más también encontró vale lo normal. Así que conviene buscar la palabra que nadie más ve, aunque sea corta.'},
            {kind: 'text', text: 'El final de la ronda muestra las palabras de todos una al lado de otra, con las de **solo tú** marcadas, y las palabras más largas de la cuadrícula que nadie encontró. Toca una palabra para ver dónde estaba.'},
            {kind: 'tip', text: 'En una partida en solitario no hay nadie con quien competir por una palabra, así que no hay puntos de solo tú.'},
          ],
        },
        {
          id: 'bonus',
          title: 'La casilla ×2',
          blocks: [
            {kind: 'text', text: 'Cada cuadrícula tiene una casilla marcada con **×2**. Cualquier palabra que pase por ella vale el doble, y tu lista la marca con ×2. Nunca es la casilla Qu.'},
            {kind: 'text', text: 'Primero la casilla duplica la palabra y después se suman los 2 puntos de solo tú. Una palabra de 5 letras que pasa por la casilla ×2 y que solo tú encontraste vale 4 × 2 + 2 = 10 puntos.'},
          ],
        },
        {
          id: 'settings',
          title: 'Ajustes',
          blocks: [
            {kind: 'text', text: 'Solo el anfitrión los cambia, antes de empezar una partida o cuando termina.'},
            {kind: 'facts', items: [
              {label: 'Cuadrícula', value: '**4×4** (por defecto) o **5×5**. Una más grande tiene más palabras, y más largas.'},
              {label: 'Tiempo por ronda', value: '60, 80 (por defecto) o 120 segundos.'},
              {label: 'Rondas', value: 'De 1 a 5 por partida, 3 por defecto.'},
            ]},
            {kind: 'text', text: 'Las cuadrículas se eligen para tener muchas palabras: normalmente 30 o más en una de 4×4 y 60 o más en una de 5×5.'},
            {kind: 'text', text: 'Tras una ronda, sus palabras se ven durante 10 segundos antes de la siguiente. El anfitrión puede pulsar **Siguiente ronda** para seguir antes.'},
          ],
        },
        {
          id: 'solo',
          title: 'Jugar solo',
          blocks: [
            {kind: 'text', text: '**Jugar solo** en la lista de salas empieza una partida solo para ti. Nadie más ve la sala ni puede entrar.'},
            {kind: 'list', items: [
              'Empieza al momento, sin cuenta atrás, con los ajustes con los que jugaste Letter Trail solo la última vez en este dispositivo.',
              'Al final, **Jugar otra vez** empieza otra partida con los mismos ajustes. **Cambiar ajustes** te lleva antes a la sala.',
              'Tus puntos cuentan para tu total como en cualquier otra partida.',
            ]},
          ],
        },
        {
          id: 'rooms',
          title: 'Salas, mirar y puntos',
          blocks: [
            {kind: 'text', text: 'Las salas funcionan igual que las de Flag Guesser: de este servidor o globales, con contraseña o solo para mirar, el anfitrión y el creador, expulsar gente e invitaciones. Mira [las salas de Flag Guesser](guide:flag-guesser#rooms) para los detalles.'},
            {kind: 'list', items: [
              'Quienes miran ven la cuadrícula y cuántas palabras tiene cada uno en directo, y las palabras de todos al final de cada ronda.',
              'Cuando termina la partida, una cuarta parte de tu puntuación (redondeada hacia arriba) va a tus [puntos de juego](guide:game-points): una partida de 50 suma 13. Cada juego cuenta hasta 300 puntos al día.',
            ]},
          ],
        },
      ],
    },

    'game-points': {
      title: 'Puntos de juego',
      summary: 'Un solo total de puntos para todos los juegos de NotSoBot, con clasificaciones del servidor y globales.',
      quick: [
        'Los puntos de todos los juegos de NotSoBot se suman en un solo total.',
        'Los de Flag Guesser cuentan uno a uno: una bandera que vale 3 suma 3. Letter Trail suma una cuarta parte de su puntuación, redondeada hacia arriba.',
        'Cada juego cuenta hasta 300 puntos al día.',
        'En el chat cuentan al acertar, en la Actividad cuando termina la partida.',
        '`/games points` muestra tu total, `/games leaderboard` los mejores jugadores.',
      ],
      sections: [
        {
          id: 'earning',
          title: 'Ganar puntos',
          blocks: [
            {kind: 'text', text: 'Todos los juegos suman al mismo total. Los puntos de [Flag Guesser](guide:flag-guesser) cuentan uno a uno. En [Letter Trail](guide:letter-trail) se puntúa más en el mismo tiempo, así que cuenta una cuarta parte de su puntuación, redondeada hacia arriba: una partida de 50 suma 13.'},
            {kind: 'list', items: [
              '**En el chat:** cada bandera que aciertas en `/games flag-guesser` cuenta al momento.',
              '**En la Actividad:** tu puntuación cuenta cuando termina la partida, tras la última bandera o ronda, o cuando el anfitrión la termina antes. Todos los que tienen puntos los reciben, incluso alguien expulsado a mitad.',
              'Los puntos ganados en un servidor cuentan para la clasificación de ese servidor. Los de una sala global o un MD solo cuentan para la clasificación global.',
            ]},
            {kind: 'tip', text: 'Las puntuaciones finales de una partida en la Actividad dicen cuántos puntos sumó a tu total.'},
          ],
        },
        {
          id: 'daily-limit',
          title: 'El límite diario',
          blocks: [
            {kind: 'text', text: 'Cada juego cuenta hasta 300 puntos por persona al día. El día empieza a medianoche UTC. Pasado el límite, el resto no cuenta. En la Actividad, las puntuaciones finales avisan cuando se llega al límite diario.'},
            {kind: 'text', text: 'Son unas 100 banderas con todos los puntos, o partidas de Letter Trail que suman una puntuación de 1200: de sobra para jugar mucho, y las clasificaciones siguen siendo justas.'},
          ],
        },
        {
          id: 'commands',
          title: 'Ver los puntos en el chat',
          blocks: [
            {kind: 'facts', items: [
              {label: '`/games points`', value: 'El total de alguien, sus puntos por juego, los de esta semana y su puesto en el servidor y en el mundo. Sin elegir usuario, ves los tuyos.'},
              {label: '`/games leaderboard`', value: 'Los 10 mejores. Elige **dónde**: Servidor (por defecto) o Global, y el **periodo**: Todo el tiempo (por defecto) o Esta semana. Tu puesto sale debajo si no estás entre los 10.'},
            ]},
            {kind: 'text', text: 'En un MD, la clasificación del servidor muestra la global. Las semanas empiezan el lunes a medianoche UTC.'},
          ],
        },
        {
          id: 'activity',
          title: 'Los puntos en la Actividad',
          blocks: [
            {kind: 'list', items: [
              '**Tus puntos** está arriba en la pestaña Juegos: tu total, los puntos de esta semana y tu puesto en el servidor (tu puesto global en un MD).',
              'La **Clasificación** bajo los juegos muestra los mejores jugadores del servidor (de todos en un MD), de esta semana o de siempre.',
            ]},
          ],
        },
      ],
    },

    'media-editor': {
      title: 'Editor multimedia',
      summary: 'Edita imágenes, GIFs, vídeos y sonidos dentro de Discord, tú solo o en una sala con más gente.',
      quick: [
        'Ábrelo con `/editor`, con **Editar multimedia** o **Editar avatar**, o desde el lanzador de apps.',
        'Elige **Solo yo** para editar solo, o **Todos** o **Contraseña** para crear una sala.',
        'Hasta 10 personas editan una sala juntas y ven los cursores de los demás.',
        'Un paso que alguien está ajustando es suyo hasta que lo suelta.',
        'Renderiza a calidad completa al terminar y publícalo en el canal.',
        'Guarda tus efectos como plantilla, o prueba una de la Galería de plantillas.',
      ],
      sections: [
        {
          id: 'opening',
          title: 'Abrir el editor',
          blocks: [
            {kind: 'list', items: [
              '`/editor` lo abre en el canal. Si adjuntas un archivo o un enlace, se abre con ese archivo. Sin nada, se abre en las salas del editor.',
              '**Editar multimedia** en un mensaje (en su menú Apps) abre el editor con la imagen, GIF, vídeo o sonido de ese mensaje. **Editar avatar** en una persona hace lo mismo con su avatar.',
              'Abre NotSoBot desde el lanzador de apps de Discord y elige **Editar multimedia**.',
              '`/editor template:` con el enlace o el código de una plantilla lo abre con esa plantilla lista.',
            ]},
            {kind: 'text', text: 'NotSoBot suele publicar también un mensaje en el canal con un botón **Unirse**, para que otros editen contigo.'},
            {kind: 'tip', text: 'El editor también está en la web, en [notsobot.com/editor](/editor). Las plantillas funcionan en los dos.'},
          ],
        },
        {
          id: 'start-screen',
          title: 'La pantalla de inicio',
          blocks: [
            {kind: 'text', text: 'Desde el lanzador de apps, la Actividad primero te pregunta qué quieres hacer: **Editar multimedia** o **Juegos**. Cada opción muestra cuánta gente está editando o cuántas partidas se están jugando ahora, y puedes cambiar cuando quieras.'},
            {kind: 'text', text: 'Para empezar a editar, elige un archivo (súbelo, arrástralo o pega un enlace), una de tus ediciones recientes, o empieza desde **O crea uno**: un lienzo en blanco, un código QR o una de las plantillas de texto del bot. Valen imágenes, GIFs, vídeos y audio de hasta 10 minutos.'},
          ],
        },
        {
          id: 'who',
          title: 'Solo yo, Todos o Contraseña',
          blocks: [
            {kind: 'text', text: 'Antes de empezar, elige para quién es la edición:'},
            {kind: 'facts', items: [
              {label: 'Solo yo', value: 'Tu propia edición. Nadie más en la Actividad la ve.'},
              {label: 'Todos', value: 'Una sala nueva en la que puede entrar cualquiera de la Actividad, hasta 10 personas a la vez.'},
              {label: 'Contraseña', value: 'Una sala nueva en la que solo entra quien tenga la contraseña. Necesita al menos 4 caracteres.'},
            ]},
            {kind: 'text', text: 'Una sala puede tener nombre y puede ser de solo mirar. En un servidor, la Actividad de cada canal comparte las mismas salas. Una sala se queda hasta que se cierra o pasa una semana sin cambios.'},
            {kind: 'tip', text: '**Bifurcar** copia el archivo y sus efectos, tal como están, a una sala nueva o a tu propia edición. El original no cambia.'},
          ],
        },
        {
          id: 'together',
          title: 'Editar juntos',
          blocks: [
            {kind: 'list', items: [
              'Hasta 10 personas pueden estar en una sala a la vez, contando a quienes miran.',
              'Todos ven cada cambio en directo, en la misma vista previa.',
              '**Cursores en directo:** flechas de colores con nombres muestran dónde apunta cada uno, en la vista previa, en los efectos y en los pasos.',
              '**Pasos bloqueados:** mientras alguien ajusta un paso, es suyo hasta que lo suelta, y los demás ven quién lo está ajustando.',
              'Un renderizado pausa la edición para todos hasta que termina.',
              'La cabecera muestra quién está en la sala. Tócala para ver la lista completa.',
            ]},
            {kind: 'text', text: 'En la lista de salas puedes buscar salas, personas o efectos, y filtrar por visibilidad, tipo de archivo, salas con hueco o las tuyas.'},
          ],
        },
        {
          id: 'watch-only',
          title: 'Salas de solo mirar',
          blocks: [
            {kind: 'text', text: 'En una sala de solo mirar, solo quien la creó cambia cosas. Los demás miran en directo y pueden **Bifurcar** su propia copia para editarla. Elígelo al crear la sala, o actívalo o quítalo en **Ajustes de la sala**.'},
            {kind: 'text', text: 'Quien mira puede igualmente renderizar, copiar el MediaScript y guardar una plantilla.'},
          ],
        },
        {
          id: 'managing',
          title: 'Gestionar una sala',
          blocks: [
            {kind: 'list', items: [
              'Quien crea la sala puede cambiarle el nombre y la contraseña, y activar o quitar solo mirar, en **Ajustes de la sala**. Quienes ya están dentro se quedan.',
              'Quien la crea y los moderadores del servidor pueden expulsar gente, y cerrar o eliminar la sala.',
              '**Cerrar** manda a todos a la lista de salas y nadie puede volver a entrar, pero quien la creó se queda con la edición. **Eliminar** borra la edición para todos.',
              'Quien fue expulsado de una sala no puede volver a entrar.',
            ]},
          ],
        },
        {
          id: 'invites',
          title: 'Invitaciones',
          blocks: [
            {kind: 'text', text: 'En una sala, pulsa **Invitar**. **Compartir enlace** la manda por Discord, y **Publicar en este canal** la publica con un botón para unirse. Abre la Actividad directamente en la sala.'},
            {kind: 'list', items: [
              'Deja entrar en una sala con contraseña sin la contraseña.',
              'Quien fue expulsado de la sala se queda fuera.',
              'Dura 24 horas.',
            ]},
          ],
        },
        {
          id: 'templates',
          title: 'Plantillas',
          blocks: [
            {kind: 'list', items: [
              '**Guardar como plantilla** guarda tus efectos, nunca tu archivo, como un enlace que cualquiera puede usar con su propio archivo. Ponle contraseña para que solo la use quien la sepa.',
              '**Pedir a la gente…** elige ajustes que la gente rellena al usarla, como su propio texto.',
              '**Plantillas** en la cabecera carga una de las tuyas en el archivo que tienes abierto. Deshacer recupera lo que tenías.',
              '**Compartir en el chat** publica una tarjeta con los efectos de la plantilla, un ejemplo y un botón para probarla.',
              'La **Galería de plantillas** tiene las plantillas que la gente ha publicado. Abre **Explorar plantillas** en la pantalla de inicio, o [notsobot.com/editor/hub](/editor/hub). **Probarla** empieza una edición con ella.',
              'Para publicar una tuya, pulsa **Publicar** en tu lista de plantillas. Antes se revisan su texto, sus dibujos y un renderizado de prueba. Las plantillas con contraseña no se pueden publicar.',
            ]},
          ],
        },
        {
          id: 'posting',
          title: 'Renderizar y publicar',
          blocks: [
            {kind: 'steps', items: [
              'Pulsa **Renderizar a calidad completa**. Se hace con el archivo original. Elige un formato, o déjalo en Automático.',
              'Cuando esté listo, **Compartir en el canal** lo publica con quién lo hizo, sus efectos y un botón para editarlo.',
              'Donde NotSoBot no puede publicar (como un MD, o un canal donde no puedes enviar archivos), se abre la opción de compartir de Discord.',
            ]},
            {kind: 'tip', text: '**MediaScript** en la cabecera copia tus efectos como un tag, o como líneas para un script tuyo.'},
          ],
        },
        {
          id: 'premium',
          title: 'Qué cambia con Premium',
          blocks: [
            {kind: 'text', text: 'Editar, las salas, las invitaciones y las plantillas son gratis. [Premium](/premium) sube algunos límites:'},
            {kind: 'facts', items: [
              {label: 'Duración del renderizado', value: 'Hasta 1.080 fotogramas con Free, 2.160 con Premium.'},
              {label: 'Premium del servidor', value: 'Los renderizados en las salas de un servidor usan también el Premium del servidor.'},
              {label: 'Plantillas guardadas', value: '50 con Free, 200 con Premium.'},
              {label: 'En la galería', value: '10 publicadas a la vez con Free, 50 con Premium.'},
            ]},
          ],
        },
      ],
    },
  },

  upcoming: {},
};
