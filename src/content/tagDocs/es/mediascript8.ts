// MediaScript commands in Spanish (distort & animate), keyed by command name

import type { TagDocsTranslation } from '../localize';

import { MEDIA } from './mediascriptCommon';


const ONLY_MEDIA = {MEDIA_KEY: MEDIA};
const ANIMATED_GIF = 'Una imagen fija se convierte en un GIF animado.';
const WAVE = {
  AMPLITUDE: 'altura de la onda',
  WAVE_LENGTH: 'distancia entre ondas',
};
const DELAY = {
  MEDIA_KEY: MEDIA,
  DELAY: 'milisegundos por fotograma',
};
const SAME_SEED = 'la misma semilla da el mismo resultado; none es al azar';
const GIF_FRAMES = (frames: number) => `Convierte una imagen fija en un GIF de ${frames} fotogramas.`;


export const MEDIASCRIPT_SPANISH_8: TagDocsTranslation['mediaScriptCommands'] = {
  distort: {
    summary: 'Aplica una distorsión de ImageMagick con tus propios números.',
    args: {
      MEDIA_KEY: MEDIA,
      METHOD: 'la distorsión',
      ARGUMENTS: 'los números que espera ese método, separados por espacios (mira la documentación de -distort de ImageMagick)',
    },
    results: [
      'Dobla la imagen hasta formar un círculo completo.',
      'Un abombamiento en barril al estilo ojo de pez.',
    ],
    notes: ['Se usan como mucho 32 números.'],
  },
  implode: {
    summary: 'Absorbe hacia dentro el centro de la multimedia.',
    args: ONLY_MEDIA,
  },
  explode: {
    summary: 'Empuja hacia fuera el centro de la multimedia (lo contrario de `implode`).',
    args: ONLY_MEDIA,
  },
  fisheye: {
    summary: 'Abomba el centro de la multimedia como una lente de ojo de pez.',
    args: ONLY_MEDIA,
  },
  swirl: {
    summary: 'Retuerce la multimedia en un remolino.',
    args: {
      MEDIA_KEY: MEDIA,
      DEGREES: 'cuánto retorcer; si es negativo, va en el otro sentido',
    },
  },
  pinchpunch: {
    summary: 'Pellizca la multimedia hacia dentro o la abomba hacia fuera alrededor de un punto, como el Pinch/Punch de VEGAS.',
    args: {
      MEDIA_KEY: MEDIA,
      INTENSITY: 'si es positivo, abomba el centro hacia fuera (hasta 5 veces más grande); si es negativo, lo pellizca hacia dentro',
      X: 'el centro en horizontal, como fracción del ancho',
      Y: 'el centro en vertical, como fracción del alto',
      X_SCALE: 'lo ancha que es la zona afectada, como fracción de la mitad del ancho',
      Y_SCALE: 'lo alta que es la zona afectada, como fracción de la mitad del alto',
    },
    results: [
      'El centro se abomba hacia fuera todo lo posible.',
      'Una zona pequeña encima del centro se pellizca hacia dentro.',
    ],
    notes: [
      'Las partes que se traen desde más allá del borde quedan transparentes (negras en los vídeos).',
    ],
  },
  tvsimulator: {
    summary: 'Una tele analógica que pierde la sincronización de línea: la imagen se desgarra y tiembla hacia los lados, o arriba y abajo (el simulador de TV de los efectos de Preview 1280).',
    args: {
      MEDIA_KEY: MEDIA,
      LINE_SYNC: 'lo bien que mantiene la tele la imagen; 1 es limpia y cuanto más bajo, más se desgarra',
      DETAIL_ZOOM: 'amplía la distorsión; más alto da ondas más grandes y lentas',
      VERTICAL: 'desgarra la imagen arriba y abajo en lugar de hacia los lados',
    },
    results: [
      'Un temblor de TV suave.',
      'Una tele muy mal sintonizada con desgarros grandes y lentos.',
      'La imagen se desplaza y se desgarra arriba y abajo en su lugar.',
    ],
    notes: [
      'Usa un vídeo de desplazamiento integrado que se repite en bucle en clips de más de sus 60 segundos. El audio se mantiene tal cual.',
      'Funciona con vídeos, GIFs e imágenes (una imagen fija recibe un fotograma del temblor). El mismo efecto es el comando `.tvsimulator` (`/media-iv-glitch tv-simulator`).',
      'Para usar tu propio vídeo de desplazamiento, cárgalo con `load` y usa `displace` dentro de `ffmpeg` (mira Efectos de logos).',
    ],
  },
  tunnel: {
    summary: 'Envuelve la multimedia en un túnel radial o en espiral.',
    args: ONLY_MEDIA,
  },
  detunnel: {
    summary: 'Desenvuelve un túnel radial o en espiral (lo contrario de `tunnel`).',
    args: ONLY_MEDIA,
  },
  wave: {
    summary: 'Dobla la multimedia a lo largo de una onda senoidal.',
    args: {
      MEDIA_KEY: MEDIA,
      ...WAVE,
    },
  },
  waves: {
    summary: 'Ondas animadas en movimiento.',
    args: {
      MEDIA_KEY: MEDIA,
      ...WAVE,
    },
  },
  vegastimecode: {
    summary: 'Escribe el tiempo de la multimedia sobre ella en un recuadro negro, como el efecto Timecode de VEGAS (Sony).',
    args: {
      MEDIA_KEY: MEDIA,
      X: 'dónde va en horizontal, dentro de un margen de seguridad del 10%',
      Y: 'dónde va en vertical, dentro de un margen de seguridad del 10%',
      TYPE: 'cómo se escribe el tiempo: `time` 00:00:01,335, `seconds` 1,335, `timeframes` 00:00:01,10, `frames` 40,000, `feet16`/`feet35` 1+00, SMPTE `ivtc` (23.976), `film` (24), `ebu` (25), `nondrop` (29.97), `drop` 00:00:01;10 y `smpte30`',
    },
    results: [
      'Timecode drop frame en la esquina inferior derecha, como el predeterminado de Vegas.',
      'Timecode de cine a 24 fps en la esquina superior izquierda.',
    ],
    notes: [
      'El tiempo empieza en 0 en el primer fotograma, así que una imagen fija siempre muestra 0. Los tipos SMPTE cuentan los fotogramas a su propia velocidad, no a la de la multimedia. Su tamaño sigue la altura de la multimedia y el audio se mantiene igual.',
    ],
  },
  vegaswave: {
    summary: 'Dobla la multimedia con ondas en horizontal y en vertical, como el Wave de VEGAS, y puede moverlas.',
    args: {
      MEDIA_KEY: MEDIA,
      X_SPEED: 'lo rápido que se mueve la onda lateral, en radianes por segundo (`6.28` es una onda por segundo)',
      X_FREQUENCY: 'cuántas medias ondas recorren la multimedia de arriba abajo para la onda lateral (`2` es una onda entera)',
      X_INTENSITY: 'cuánto se mueve la multimedia hacia los lados, como fracción del ancho',
      X_PHASE: 'dónde empieza la onda lateral, en radianes (`3.14` es media onda)',
      Y_SPEED: 'lo rápido que se mueve la onda vertical, en radianes por segundo',
      Y_FREQUENCY: 'cuántas medias ondas recorren la multimedia de lado a lado para la onda vertical',
      Y_INTENSITY: 'cuánto se mueve la multimedia arriba y abajo, como fracción del alto',
      Y_PHASE: 'dónde empieza la onda vertical, en radianes',
    },
    results: [
      'Una ondulación fija en los dos sentidos.',
      'Una onda lateral que se mueve una vez por segundo; una imagen fija se convierte en un gif.',
    ],
    notes: [
      'Una onda en movimiento convierte una imagen fija en un gif en bucle del ciclo de la onda más lenta (como mucho 10 segundos), con las velocidades ligeramente redondeadas para que el bucle sea suave. Los gifs y los vídeos mantienen sus propios fotogramas y tiempos.',
    ],
  },
  wiggle: {
    summary: 'Añade un meneo en movimiento.',
    args: {
      MEDIA_KEY: MEDIA,
      LOOP: 'menearse de forma continua en lugar de reiniciarse, para un bucle suave',
    },
  },
  wobble: {
    summary: 'Hace que la multimedia se tambalee como gelatina: sus lados se encogen y su centro se arrastra de un lado a otro.',
    args: {
      MEDIA_KEY: MEDIA,
      AMOUNT: 'cuánto se tambalea, en porcentaje del tamaño',
      WOBBLES: 'tambaleos por segundo',
      DURATION: 'segundos, para imágenes fijas',
    },
    notes: [
      'Una imagen fija (o un GIF o video de un solo fotograma) se convierte en DURATION segundos a 25 fotogramas por segundo que vuelven a la original entre tambaleos; una imagen fija, en un GIF en bucle.',
      'Los GIF animados y los videos se tambalean todo el tiempo y vuelven a la original en el último fotograma.',
    ],
  },
  skew: {
    summary: 'Inclina la multimedia hacia un lado (o arriba y abajo).',
    args: {
      MEDIA_KEY: MEDIA,
      AMOUNT: 'ángulo de cizalla en grados',
    },
  },
  zoom: {
    summary: 'Hace zoom al centro de la multimedia.',
    args: ONLY_MEDIA,
  },
  mirrorbottom: {
    summary: 'Refleja la mitad de abajo sobre la mitad de arriba (hooh).',
    args: ONLY_MEDIA,
  },
  mirrorleft: {
    summary: 'Refleja la mitad izquierda sobre la mitad derecha (haah).',
    args: ONLY_MEDIA,
  },
  mirrorright: {
    summary: 'Refleja la mitad derecha sobre la mitad izquierda (waaw).',
    args: ONLY_MEDIA,
  },
  mirrortop: {
    summary: 'Refleja la mitad de arriba sobre la mitad de abajo (woow).',
    args: ONLY_MEDIA,
  },
  mandalascope: {
    summary: 'Convierte la multimedia en un caleidoscopio con aspecto de mandala.',
    args: {
      MEDIA_KEY: MEDIA,
      AMOUNT: 'número de porciones reflejadas',
    },
  },
  rotate3d: {
    summary: 'Gira la multimedia en el espacio 3D (pan, tilt y roll).',
    args: {
      MEDIA_KEY: MEDIA,
      PAN: 'girar a la izquierda/derecha',
      TILT: 'inclinar hacia delante/atrás',
      ROLL: 'girar como una rueda',
      ORDER: 'de 1 a 3 letras de entre `p`, `t`, `r` que dan el orden de rotación; p. ej. `ptr` es pan, luego tilt y luego roll',
    },
    results: [
      'Gira la imagen como si se viera desde un ángulo.',
      'Un giro 3D completo en 36 fotogramas.',
    ],
  },
  spin: {
    summary: 'Hace girar la multimedia.',
    args: {
      MEDIA_KEY: MEDIA,
      CIRCLE: 'recortar primero en un círculo',
    },
    notes: [GIF_FRAMES(20)],
  },
  spin3d: {
    summary: 'Hace girar la multimedia en el espacio 3D.',
    args: ONLY_MEDIA,
    notes: [GIF_FRAMES(37)],
  },
  orb: {
    summary: 'Envuelve la multimedia alrededor de un orbe o globo que gira.',
    args: ONLY_MEDIA,
    notes: [GIF_FRAMES(30)],
  },
  prism: {
    summary: 'Envuelve la multimedia alrededor de una pirámide que gira, como el prisma de Obama, con fondo transparente recortado a la pirámide.',
    args: {
      MEDIA_KEY: MEDIA,
      ANGLE: 'cuánto está girada, con el centro de la multimedia en la cara de delante: donde empieza el giro, o la pose con STILL',
      TILT: 'cuánto mira la cámara hacia abajo, 0 a su altura y 90 justo sobre la punta',
      REPEAT: 'poner la multimedia entera en cada cara en lugar de envolverla una vez por las cuatro, como el original',
      STILL: 'no girar, mantener la pose de ANGLE (una animación se sigue reproduciendo encima)',
    },
    notes: ['Convierte una imagen fija en un GIF de 60 fotogramas (30 con REPEAT), o en un solo fotograma con STILL.'],
  },
  globe: {
    summary: 'Envuelve la multimedia sobre una esfera, como un globo de ojo de pez.',
    args: {
      MEDIA_KEY: MEDIA,
      TILED: 'reducir la multimedia y repetirla en mosaico por la esfera en lugar de estirar una sola copia',
    },
    results: [
      'El avatar como un globo redondo.',
    ],
    notes: ['El resultado se recorta en un cuadrado con el exterior transparente. A diferencia de `orb`, no gira.'],
  },
  shake: {
    summary: 'Sacude la multimedia.',
    args: ONLY_MEDIA,
    notes: [GIF_FRAMES(15)],
  },
  shaketriggered: {
    summary: 'El meme de "triggered" temblando, con la etiqueta debajo.',
    args: ONLY_MEDIA,
    notes: [GIF_FRAMES(4)],
  },
  bounce: {
    summary: 'Hace que la multimedia rebote como un webm que rebota, cada fotograma con su propio tamaño.',
    args: {
      MEDIA_KEY: MEDIA,
      AXIS: 'qué lado rebota',
      STYLE: 'bounce baja y vuelve a subir de golpe, wave es suave, random es cualquier tamaño en cada fotograma',
      BOUNCES: 'rebotes por segundo',
      MINIMUM: 'el tamaño más pequeño, en porcentaje del original',
      DURATION: 'segundos, para imágenes fijas',
    },
    notes: [
      'Siempre es un webm, el único formato en el que cada fotograma puede tener su propio tamaño. Hazlo lo último: las acciones posteriores vuelven a poner todos los fotogramas del mismo tamaño.',
      'Discord solo muestra el rebote cuando el enlace se pega en un mensaje; el archivo subido se reproduce con el tamaño del primer fotograma.',
    ],
  },
  slide: {
    summary: 'Desplaza la multimedia de forma continua en una dirección, dando la vuelta.',
    args: ONLY_MEDIA,
  },
  wall: {
    summary: 'Repite la multimedia en mosaico sobre una pared inclinada.',
    args: ONLY_MEDIA,
  },
  dice: {
    summary: 'Corta la multimedia en baldosas y gira cada una al azar.',
    args: {
      MEDIA_KEY: MEDIA,
      GRID: 'baldosas por lado',
      SEED: SAME_SEED,
    },
  },
  explodeanimated: {
    summary: 'Un efecto de explode que se va haciendo más fuerte poco a poco.',
    args: ONLY_MEDIA,
    notes: [ANIMATED_GIF],
  },
  implodeanimated: {
    summary: 'Un efecto de implode que se va haciendo más fuerte poco a poco.',
    args: ONLY_MEDIA,
    notes: [ANIMATED_GIF],
  },
  flash: {
    summary: 'Parpadea entre la multimedia normal y la invertida.',
    args: DELAY,
  },
  inout: {
    summary: 'Hace zoom hacia dentro de la multimedia a través de copias de sí misma, y luego vuelve hacia fuera.',
    args: DELAY,
  },
  outin: {
    summary: 'Hace zoom hacia fuera de la multimedia a través de copias de sí misma, y luego vuelve hacia dentro.',
    args: DELAY,
  },
  sidetoside: {
    summary: 'Voltea la multimedia en horizontal una y otra vez.',
    args: DELAY,
  },
  uptodown: {
    summary: 'Voltea la multimedia en vertical una y otra vez.',
    args: DELAY,
  },
  layer: {
    summary: 'Repite la multimedia en mosaico con copias reflejadas y volteadas.',
    args: ONLY_MEDIA,
  },
  multiply: {
    summary: 'Repite la multimedia en una cuadrícula.',
    args: {
      MEDIA_KEY: MEDIA,
      GRID: 'copias por lado',
      ROTATE: 'girar cada copia al azar',
      SEED: SAME_SEED,
    },
  },
  scramble: {
    summary: 'Desordena baldosas de la multimedia.',
    args: {
      MEDIA_KEY: MEDIA,
      GRID: 'baldosas por lado',
      ROTATE: 'girar también cada baldosa al azar',
      SEED: SAME_SEED,
    },
  },
  ripple: {
    summary: 'Añade ondas de agua que se extienden desde el centro.',
    args: {
      MEDIA_KEY: MEDIA,
      AMPLITUDE: 'altura de las ondas',
      WIDTH: 'distancia entre ondas',
      POWER: 'lo rápido que se desvanecen las ondas',
      RMIN: 'radio alrededor del centro que se deja plano',
    },
  },
  facealien: {
    summary: 'Deforma la cara más grande hasta convertirla en un alienígena.',
    args: {
      MEDIA_KEY: MEDIA,
      SKIN: 'poner también la piel verde y todo lo demás en azul frío',
    },
  },
  faceanime: {
    summary: 'Le pone a la cara más grande unos ojos grandes de anime.',
    args: {
      MEDIA_KEY: MEDIA,
      EYES: 'color de ojos',
    },
  },
  faceclown: {
    summary: 'Maquilla de payaso la cara más grande.',
    args: ONLY_MEDIA,
  },
  facefat: {
    summary: 'Engorda la cara más grande.',
    args: ONLY_MEDIA,
  },
  faceforehead: {
    summary: 'Hace más alta la frente de la cara más grande; SMOOTHBRAIN la aplasta en su lugar.',
    args: ONLY_MEDIA,
  },
};
