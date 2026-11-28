// The Spanish guides, following en.ts (same section ids and facts). Button names match the Activity's and the bot's
// Spanish strings, command names stay in English like the FAQ's. "Flag Guesser", "Letter Trail", "Hold the Line",
// "Loose Ends" and "Retro" stay as names.

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
            {kind: 'tip', text: '¿Jugando a `/games flag-guesser` en el chat? Su botón **Abrir en la Actividad** abre una sala que sigue la misma partida: primero sale la bandera que estaba en pantalla, con la misma dificultad, respuestas escritas y un minuto por bandera. Las puntuaciones empiezan de cero. La ronda del chat termina ahí, y su mensaje dice quién se llevó la bandera.'},
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
              {label: 'Dificultad', value: '**Fácil** (por defecto): banderas conocidas que no se parecen entre sí, con opciones de cualquier parte. **Media**: países de los que casi todos han oído hablar, con opciones de la misma región. **Difícil**: países pequeños, territorios y banderas que se parecen, y las opciones son las banderas parecidas. Cada nivel tiene sus propias banderas.'},
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
              'Usa `/games play` en un canal, o pulsa **Trastear** en NotSoBot en el lanzador de apps de Discord y elige **Juegos**.',
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
              {label: 'Rondas', value: 'De 1 a 5 por partida, 1 por defecto.'},
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

    'hold-the-line': {
      title: 'Hold the Line',
      summary: 'Dibuja líneas para proteger a Pip, la rana, de abejas, bombas, rocas, pinchos y lava hasta que se acabe el tiempo.',
      quick: [
        'Dibuja líneas en el tablero y pulsa **Empezar**. Pip tiene que aguantar hasta que se acabe el tiempo.',
        'Las líneas gastan la tinta de la barra que hay sobre el tablero. **Deshacer** quita la última línea y te devuelve su tinta.',
        'Al empezar, tus líneas caen. Una línea en un perno se balancea en él, y una con un perno en cada punta no se mueve.',
        'Pip tiene 3 corazones. Una picadura de abeja le quita 1 y una bomba 2, salvo que haya algo sólido en medio.',
        'Los pinchos, las minas, la lava, una roca rodando o caerse del tablero acaban con el intento al momento.',
        'Estrellas: una por aguantar, otra por no perder corazones y otra por usar la mitad de la tinta o menos.',
        'Consigue una estrella en un nivel para abrir el siguiente. Hay 12.',
      ],
      sections: [
        {
          id: 'starting',
          title: 'Empezar un nivel',
          blocks: [
            {kind: 'text', text: 'Hold the Line es un rompecabezas para jugar a solas. No hay salas y no suma a tus [puntos de juego](guide:game-points).'},
            {kind: 'list', items: [
              '**En notsogames.com:** abre **Hold the Line** en la página de inicio, o ve a `notsogames.com/hold-the-line`.',
              '**En la Actividad:** usa `/games play` (o pulsa **Trastear** en NotSoBot en el lanzador de apps de Discord y elige **Juegos**) y elige **Hold the Line** en la pestaña Juegos.',
            ]},
            {kind: 'text', text: 'Elige un nivel. Hay 12, todos hechos a mano. Cada uno se abre cuando tienes una estrella en el anterior. Cuando un nivel trae algo nuevo, un consejo sobre el tablero te cuenta qué hace.'},
          ],
        },
        {
          id: 'drawing',
          title: 'Dibujar líneas',
          blocks: [
            {kind: 'list', items: [
              'Pulsa en el tablero y arrastra para dibujar una línea, con el ratón, el dedo o un lápiz. Suelta para terminarla.',
              'Dibuja todas las líneas que quieras mientras te quede tinta. La barra sobre el tablero muestra cuánta queda.',
              'Una línea no atraviesa el suelo, otra línea ni a Pip. Se para donde algo le corta el paso.',
              'Puedes dibujar sobre la lava, pero una línea que la toca se quema en cuanto pulsas Empezar.',
              '**Deshacer** quita la última línea y te devuelve su tinta. **Reiniciar** borra el tablero y empieza el nivel de nuevo.',
            ]},
            {kind: 'tip', text: 'Con teclado, **Espacio** o **Intro** es Empezar, **Z** es Deshacer y **R** es Reiniciar.'},
          ],
        },
        {
          id: 'go',
          title: 'Pulsar Empezar',
          blocks: [
            {kind: 'text', text: 'Mientras dibujas, nada se mueve. **Empezar** pone en marcha el reloj de la esquina superior derecha y todo cobra vida:'},
            {kind: 'list', items: [
              'Tus líneas se vuelven sólidas y caen, salvo que las sujete un perno.',
              'Las abejas salen de su colmena y van directas a por Pip.',
              'Cada bomba hace la cuenta atrás del número que lleva y luego explota.',
              'Las rocas ruedan, algunas caen desde arriba al rato, y las cajas y las minas sueltas se vienen abajo.',
            ]},
            {kind: 'text', text: 'Pip lo logra si le queda algún corazón cuando el reloj llega a cero. Después de Empezar, tus líneas ya no cambian: para rehacerlas, pulsa **Reiniciar**, o **Reintentar** cuando acabe el intento.'},
          ],
        },
        {
          id: 'bolts',
          title: 'Pernos',
          blocks: [
            {kind: 'text', text: 'Algunos niveles tienen pernos, pequeños tornillos clavados en el tablero.'},
            {kind: 'list', items: [
              'Empieza o termina una línea cerca de un perno y se engancha a él.',
              'Una línea en un perno gira alrededor de él, pero no cae.',
              'Una línea con un perno en cada punta queda sujeta por los dos y no se mueve: un puente o una pared fija.',
              'Un perno puede sujetar más de una línea.',
            ]},
          ],
        },
        {
          id: 'hearts',
          title: 'Corazones',
          blocks: [
            {kind: 'text', text: 'Pip empieza cada intento con 3 corazones, en la esquina superior izquierda. Si los pierde todos, se acaba el intento.'},
            {kind: 'facts', items: [
              {label: 'Picadura de abeja', value: '1 corazón. Después de un golpe, Pip parpadea un momento y mientras tanto no le pueden volver a picar.'},
              {label: 'Explosión de bomba', value: '2 corazones, salvo que haya algo sólido entre la bomba y Pip, como una línea. El círculo discontinuo alrededor de una bomba muestra su alcance.'},
              {label: 'Un golpe fuerte', value: '1 corazón, cuando una caja, una bomba o una de tus líneas cae rápido sobre Pip.'},
            ]},
            {kind: 'text', text: 'Una explosión también aparta todo lo que tiene cerca, Pip incluido, aunque menos si está detrás de una línea.'},
          ],
        },
        {
          id: 'dangers',
          title: 'Qué acaba con un intento',
          blocks: [
            {kind: 'text', text: 'Esto acaba con el intento al momento, da igual cuántos corazones le queden a Pip:'},
            {kind: 'list', items: [
              'Tocar pinchos o una mina con pinchos (pinchan por todos lados).',
              'Caer en la lava.',
              'Una roca rodando. Una que ya se paró junto a Pip no hace daño.',
              'Caerse por abajo del tablero.',
            ]},
            {kind: 'tip', text: 'La lava también ayuda: las abejas que entran en ella desaparecen, las rocas, las cajas y las minas se hunden, y una bomba que cae dentro explota ahí mismo.'},
          ],
        },
        {
          id: 'stars',
          title: 'Estrellas',
          blocks: [
            {kind: 'facts', items: [
              {label: 'Aguantó', value: 'A Pip le queda algún corazón cuando se acaba el tiempo.'},
              {label: 'Sin perder corazones', value: 'Pip termina con los 3 corazones.'},
              {label: 'La mitad de la tinta o menos', value: 'Tus líneas usaron la mitad de la tinta del nivel o menos.'},
            ]},
            {kind: 'text', text: 'Se guardan tus mejores estrellas de cada nivel, y la lista de niveles muestra tu total. Con una estrella basta para abrir el siguiente, así que puedes volver a por las demás más tarde.'},
          ],
        },
        {
          id: 'progress',
          title: 'Dónde se guarda tu progreso',
          blocks: [
            {kind: 'list', items: [
              '**Con la sesión iniciada:** tus estrellas se guardan en tu cuenta, así que te siguen a otros dispositivos y entre notsogames.com y la Actividad. En la Actividad siempre tienes la sesión iniciada.',
              '**Sin iniciar sesión:** se guardan en este navegador. Si luego inicias sesión en él, pasan a tu cuenta.',
            ]},
          ],
        },
      ],
    },

    'loose-ends': {
      title: 'Loose Ends',
      summary: 'Une cada par de botones iguales con hilo y cubre todos los cuadros. Tableros sin fin y un puzle nuevo cada día.',
      quick: [
        'Arrastra desde un botón hasta el otro botón del mismo color para coserlos.',
        'Los hilos van arriba, abajo, a la izquierda y a la derecha, cuadro a cuadro, y nunca se cruzan.',
        'El puzle está resuelto cuando todos los pares están unidos y por cada cuadro pasa un hilo.',
        'Si pasas por encima de un hilo, lo cortas. Si retrocedes antes de soltar, vuelve.',
        'Hay tableros de 5×5 a 9×9, cada uno con niveles sin fin que se vuelven más difíciles, y un Puzle del día de 8×8.',
        'Estrellas: una por resolverlo, otra por no usar pistas y otra por dibujar cada hilo de una vez.',
      ],
      sections: [
        {
          id: 'starting',
          title: 'Empezar un puzle',
          blocks: [
            {kind: 'text', text: 'Loose Ends es un puzle para jugar a solas. No hay salas y no suma a tus [puntos de juego](guide:game-points).'},
            {kind: 'list', items: [
              '**En notsogames.com:** abre **Loose Ends** en la página de inicio, o ve a `notsogames.com/loose-ends`.',
              '**En la Actividad:** usa `/games play` (o pulsa **Trastear** en NotSoBot en el lanzador de apps de Discord y elige **Juegos**) y elige **Loose Ends** en la pestaña Juegos.',
            ]},
            {kind: 'text', text: 'Después juega el **Puzle del día**, o elige un tamaño en **Tableros** para jugar su siguiente nivel.'},
          ],
        },
        {
          id: 'threads',
          title: 'Coser hilos',
          blocks: [
            {kind: 'list', items: [
              'Pulsa en un botón y arrastra hasta el otro botón del mismo color. El hilo te sigue cuadro a cuadro: arriba, abajo, a la izquierda o a la derecha, nunca en diagonal.',
              'Un hilo no puede pasar por un botón de otro color, y se para al llegar a su pareja.',
              'Arrastra hacia atrás por un hilo para acortarlo.',
              'Pulsa en un hilo para seguir desde ese cuadro. Arrastra desde uno de sus botones para rehacerlo desde ahí, o toca el botón sin más para borrarlo.',
            ]},
            {kind: 'text', text: 'El puzle se resuelve cuando todos los pares están unidos y por cada cuadro pasa un hilo. Casi todos los tableros tienen más de una solución, y vale cualquiera. El texto sobre el tablero muestra cuántos pares están unidos y cuánto está cubierto.'},
            {kind: 'tip', text: 'Un botón no cubre su propio cuadro hasta que su hilo sale de él.'},
          ],
        },
        {
          id: 'crossing',
          title: 'Cuando los hilos se encuentran',
          blocks: [
            {kind: 'text', text: 'Los hilos nunca se cruzan. Pasa uno por encima de otro y el otro se corta justo antes del punto por donde lo cruzaste.'},
            {kind: 'text', text: '¿Cambiaste de idea? Retrocede antes de soltar y el hilo cortado vuelve. Una vez que sueltas, el corte se queda.'},
          ],
        },
        {
          id: 'stars',
          title: 'Estrellas',
          blocks: [
            {kind: 'facts', items: [
              {label: 'Resuelto', value: 'Todos los pares unidos y todos los cuadros cubiertos.'},
              {label: 'Sin pistas', value: 'Resuelto sin pulsar **Pista**.'},
              {label: 'Cada hilo de una vez', value: 'Dibuja un hilo y pasa al siguiente. Corregir el que acabas de dibujar está bien, pero volver a uno que ya dejaste te quita esta estrella.'},
            ]},
            {kind: 'text', text: '**Reiniciar** borra el tablero y te da otra oportunidad de conseguir las tres. Se guardan tus mejores estrellas de cada nivel.'},
          ],
        },
        {
          id: 'hints',
          title: 'Pistas',
          blocks: [
            {kind: 'text', text: '**Pista** coloca un hilo de la solución del propio puzle, el del primer par que aún no está unido. Los hilos que estorban se cortan, y como casi todos los tableros tienen más de una solución, puede que no coincida con la que estás armando. Usa todas las que necesites: cualquier pista te quita la estrella de sin pistas en ese intento.'},
          ],
        },
        {
          id: 'boards',
          title: 'Tableros y niveles',
          blocks: [
            {kind: 'list', items: [
              'Hay cinco tamaños de tablero, de 5×5 a 9×9.',
              'Cada tamaño tiene sus propios niveles, y nunca se acaban. Su botón abre el nivel siguiente al más alto que hayas resuelto.',
              'Cada tamaño empieza fácil, con muchos hilos cortos, y se vuelve más difícil hasta más o menos el nivel 40. Los tableros difíciles tienen menos hilos, más largos, y menos jugadas obligadas.',
              'A partir del nivel 40, todos los niveles siguen siendo difíciles, cada uno a su manera.',
              'No hay límite de tiempo ni de movimientos, reinicios o pistas. Una pista solo cuesta la estrella Sin pistas.',
              'Cada nivel es el mismo puzle para todos los que lo juegan.',
              'Cuando resuelves uno, **Siguiente nivel** te lleva directo al próximo.',
            ]},
          ],
        },
        {
          id: 'daily',
          title: 'El Puzle del día',
          blocks: [
            {kind: 'list', items: [
              'Cada día hay un puzle de 8×8, más bien difícil y el mismo para todos.',
              'Llega uno nuevo a medianoche UTC.',
              'Cuando lo resuelves, tus estrellas aparecen a su lado, y **Jugar otra vez** te deja ir a por más.',
            ]},
          ],
        },
        {
          id: 'progress',
          title: 'Dónde se guarda tu progreso',
          blocks: [
            {kind: 'list', items: [
              '**Con la sesión iniciada:** tus niveles, estrellas y puzles del día se guardan en tu cuenta, así que te siguen a otros dispositivos y entre notsogames.com y la Actividad. En la Actividad siempre tienes la sesión iniciada.',
              '**Sin iniciar sesión:** se guardan en este navegador. Si luego inicias sesión en él, pasan a tu cuenta.',
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
              {label: '`/games points`', value: 'El total de alguien, sus puntos por juego, los de esta semana, su puesto en el servidor y en el mundo, y su historial en cada juego de salas (victorias, derrotas, empates, partidas abandonadas, racha y mejores estadísticas). Sin elegir usuario, ves los tuyos.'},
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

    'retro': {
      title: 'Retro',
      summary: 'Juega a clásicos de consola con tus propios archivos, a solas, en notsogames.com o en la Actividad.',
      quick: [
        'Elige o suelta un archivo de juego tuyo, o un .zip que lo tenga dentro, y empieza.',
        'Los juegos que cargas se quedan en **Tus juegos** en este dispositivo para la próxima vez.',
        'Las flechas mueven, X es A, Z es B e Intro es Start. Esc abre el menú.',
        'También funcionan los mandos, y las pantallas táctiles tienen botones en pantalla.',
        'El menú tiene 4 espacios de estados guardados, tus controles y el sonido.',
        'Tus juegos y partidas nunca salen de tu dispositivo. No se sube nada.',
        'Juega solo a juegos que tengas derecho a usar.',
      ],
      sections: [
        {
          id: 'starting',
          title: 'Abrir Retro',
          blocks: [
            {kind: 'text', text: 'Retro carga juegos desde archivos que ya tienes, directamente en tu navegador. Juegas a solas: no hay salas y no suma a tus puntos de juego.'},
            {kind: 'list', items: [
              '**En notsogames.com:** abre **Retro** en la página de inicio, o ve a `notsogames.com/retro`.',
              '**En la Actividad:** usa `/games play` (o pulsa **Trastear** en NotSoBot en el lanzador de apps de Discord y elige **Juegos**) y elige **Retro** en la pestaña Juegos.',
            ]},
            {kind: 'tip', text: 'Retro no trae ningún juego, los pones tú. Juega solo a juegos que tengas derecho a usar.'},
          ],
        },
        {
          id: 'loading',
          title: 'Cargar un juego',
          blocks: [
            {kind: 'steps', items: [
              'Pulsa **Elige un archivo de juego**, o suelta un archivo en el recuadro de debajo.',
              'El juego empieza al momento y se añade a **Tus juegos**.',
            ]},
            {kind: 'text', text: 'Retro admite juegos de NES, SNES, Game Boy, Game Boy Color y Game Boy Advance.'},
            {kind: 'list', items: [
              'Lee el propio archivo para saber de qué consola es, así que el nombre da igual.',
              'Un .zip también vale: Retro lo abre y carga el primer juego que encuentra dentro.',
              'Si un archivo no es un juego que Retro pueda abrir, se rechaza con una línea que explica por qué.',
            ]},
          ],
        },
        {
          id: 'your-games',
          title: 'Tus juegos',
          blocks: [
            {kind: 'list', items: [
              'Cada juego que cargas aparece en **Tus juegos**, con su consola y su tamaño. Pulsa uno para volver a jugarlo.',
              'Conserva el nombre del propio archivo. El mismo archivo cargado dos veces es un solo juego, se llame como se llame.',
              '**Quitar** (la papelera junto a un juego) lo borra de este dispositivo con todas sus partidas.',
            ]},
          ],
        },
        {
          id: 'controls',
          title: 'Controles',
          blocks: [
            {kind: 'text', text: 'Con teclado, estas son las teclas por defecto:'},
            {kind: 'facts', items: [
              {label: 'Moverse', value: 'Flechas'},
              {label: 'A y B', value: '**X** y **Z**'},
              {label: 'Start', value: '**Intro**'},
              {label: 'Select', value: '**Mayús derecha** o **Retroceso**'},
              {label: 'Menú', value: '**Esc**'},
            ]},
            {kind: 'text', text: 'Las consolas con más botones, como L y R o X e Y, también tienen teclas para ellos. **Controles**, en el menú, muestra cada botón de la consola del juego con sus teclas.'},
            {kind: 'text', text: 'Para cambiar una tecla, abre el menú, pulsa **Cambiar** junto a un botón y luego la tecla nueva. Si otro botón tenía esa tecla, pasa a este. **Teclas por defecto** las restablece todas. Esc no se puede cambiar: siempre abre el menú. Tus teclas se guardan en este dispositivo, para todos los juegos.'},
            {kind: 'text', text: 'Los **mandos** también funcionan: conecta uno y pulsa un botón. Retro se guía por dónde está cada botón, así que el botón frontal inferior es B y el derecho es A, con X e Y en el superior y el izquierdo en las consolas que los tienen. La cruceta o el stick izquierdo mueven, los botones superiores son L y R, Start o Menú es Start, y Back o Vista es Select. Solo se pueden cambiar las teclas del teclado.'},
          ],
        },
        {
          id: 'touch',
          title: 'Controles táctiles',
          blocks: [
            {kind: 'text', text: 'En una pantalla táctil, una cruceta y unos botones aparecen bajo el juego.'},
            {kind: 'list', items: [
              'Pulsa entre dos flechas de la cruceta para ir en diagonal.',
              'Desliza de un botón a otro sin levantar el dedo.',
              'Los botones extra, como L y R, solo aparecen cuando la consola del juego los tiene.',
              'Pon el móvil en horizontal y los controles pasan a los lados de la pantalla.',
            ]},
            {kind: 'text', text: 'En el menú, **Controles táctiles** puede ser **Auto** (solo en pantallas táctiles, por defecto), **Sí** o **No**.'},
          ],
        },
        {
          id: 'menu',
          title: 'El menú de pausa',
          blocks: [
            {kind: 'text', text: 'Pulsa **Esc**, o el botón de menú arriba a la derecha, para pausar. El juego espera hasta que pulses **Seguir**.'},
            {kind: 'list', items: [
              '**Estados guardados:** guarda y carga tus 4 espacios.',
              '**Controles:** tus teclas, los botones del mando y los controles táctiles.',
              '**Partidas del juego:** exporta e importa la partida del propio juego, en notsogames.com.',
              '**Sonido:** **Silenciar** y **Volumen**, guardados en este dispositivo.',
              '**Reiniciar juego:** empieza de nuevo. Se pierde todo lo que hayas hecho desde la última vez que el juego guardó; tus estados guardados se mantienen.',
            ]},
            {kind: 'tip', text: 'La X de arriba a la izquierda cierra el juego y te lleva a Tus juegos. Antes guarda la partida del propio juego.'},
          ],
        },
        {
          id: 'saves',
          title: 'Estados guardados y partidas del juego',
          blocks: [
            {kind: 'text', text: 'Retro guarda dos tipos de partidas, las dos en este dispositivo:'},
            {kind: 'facts', items: [
              {label: 'Estados guardados', value: 'Una instantánea del juego tal como está ahora, hecha desde el menú. Cada juego tiene 4 espacios, cada uno con una imagen de la pantalla y cuándo se guardó. **Guardar** llena un espacio (y sustituye lo que tenía), **Cargar** te devuelve a él.'},
              {label: 'Partidas del juego', value: 'Las partidas que guarda el propio juego, en los juegos que pueden guardar. Retro las guarda automáticamente cada vez que el juego guarda, y siguen ahí la próxima vez que empiezas el juego.'},
            ]},
            {kind: 'text', text: 'En notsogames.com, **Exportar partida** descarga la partida del propio juego como un archivo .sav, e **Importar partida** carga una: el juego se reinicia con ella, y sustituye a la que había aquí. La Actividad no tiene exportar ni importar.'},
          ],
        },
        {
          id: 'storage',
          title: 'Dónde se guarda',
          blocks: [
            {kind: 'text', text: 'Tus juegos, partidas, estados guardados y ajustes se guardan en este navegador, en este dispositivo. Nunca se suben, así que nadie los ve, ni siquiera nosotros.'},
            {kind: 'list', items: [
              'notsogames.com y la Actividad guardan cada uno lo suyo. Un juego cargado en uno no está en el otro.',
              'Las partidas hechas en la Actividad se quedan en Discord, en ese dispositivo. Aún no se pueden pasar a notsogames.com.',
              'Otro dispositivo u otro navegador empieza vacío.',
              'Una ventana privada lo olvida todo al cerrarse, y borrar los datos del sitio lo elimina todo. Retro te avisa cuando este navegador no guarda nada.',
            ]},
            {kind: 'tip', text: '¿Quieres una copia de tu progreso? En notsogames.com, exporta la partida del juego y guarda el archivo.'},
          ],
        },
        {
          id: 'sound',
          title: 'Sonido',
          blocks: [
            {kind: 'text', text: 'Algunos móviles y navegadores solo reproducen sonido después de que toques la página. Si un juego empieza sin sonido, tócalo una vez.'},
            {kind: 'text', text: '**Silenciar** y **Volumen** están en el menú, en **Sonido**.'},
          ],
        },
        {
          id: 'source',
          title: 'Emuladores y código',
          blocks: [
            {kind: 'text', text: 'Retro usa emuladores de código abierto en tu navegador. **Emuladores y código**, abajo del todo en Retro, los muestra con sus licencias.'},
            {kind: 'text', text: 'El código del reproductor, con cada cambio que les hicimos a los emuladores, está en [GitHub](https://github.com/NotSoBot/notsogames.retro).'},
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
            {kind: 'text', text: 'Desde el lanzador de apps, la Actividad primero te pregunta qué quieres hacer: **Editar multimedia** o **Juegos**. Cada opción muestra cuánta gente está editando o cuántas partidas se están jugando ahora, y puedes cambiar cuando quieras. Si hay gente en una sala del editor o en una sala de juego, **Únete a alguien** los muestra con un botón **Unirse** que te lleva directo a su sala. Si pulsaste **Unirse** en el mensaje de Trastear de alguien, esa persona aparece primero.'},
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
