// MediaScript commands in Spanish (time, plus `ffmpeg`), keyed by command name

import type { TagDocsTranslation } from '../localize';

import { MEDIA } from './mediascriptCommon';


export const MEDIASCRIPT_SPANISH_4: TagDocsTranslation['mediaScriptCommands'] = {
  snip: {
    summary: 'Conserva solo una parte de la duración de la multimedia.',
    args: {
      MEDIA_KEY: MEDIA,
      START: 'momento de inicio en segundos; si es negativo, cuenta hacia atrás desde el final',
      END: 'momento de fin en segundos; si es negativo, cuenta hacia atrás desde el final; omítelo para llegar al final',
      LOOP: 'repetir la multimedia en bucle en lugar de parar en su final, así que los momentos más allá del final vuelven a empezar',
    },
    results: [
      'Conserva los últimos 5 segundos.',
      'En un vídeo de 30 segundos, 120 segundos empezando en el segundo 9, volviendo al principio cada vez que termina.',
    ],
    notes: [
      'Con `LOOP`, END sigue siendo un momento y no una duración: `39 159` siempre dura 120 segundos, y solo START da la vuelta. El clip puede durar como mucho 600 segundos.',
      'A diferencia de `repeatduration`, que siempre empieza desde el principio, con `LOOP` cualquier momento de inicio es seguro, incluso uno más allá del final.',
    ],
  },
  clonesnip: {
    summary: 'Copia un tramo de la multimedia en una clave nueva, sin tocar la original.',
    args: {
      MEDIA_KEY: 'la multimedia de la que copiar',
      MEDIA_KEY_2: 'el nombre de la copia recortada',
      START: 'momento de inicio en segundos',
      END: 'momento de fin en segundos; omítelo para llegar al final',
    },
  },
  snipframes: {
    summary: 'Conserva solo un rango de fotogramas.',
    args: {
      MEDIA_KEY: MEDIA,
      START_FRAME: 'primer fotograma que conservar',
      END_FRAME: 'fotograma en el que parar',
    },
  },
  repeat: {
    summary: 'Reproduce la multimedia varias veces seguidas.',
    args: {
      MEDIA_KEY: MEDIA,
      AMOUNT: 'cuántas veces repetirla',
    },
  },
  repeatduration: {
    summary: 'Repite la multimedia en bucle hasta que dure un tiempo concreto.',
    args: {
      MEDIA_KEY: MEDIA,
      DURATION: 'duración total en segundos',
    },
  },
  reverse: {
    summary: 'Reproduce la multimedia al revés.',
    args: {
      MEDIA_KEY: MEDIA,
      AUDIO: 'invertir también el audio',
    },
  },
  speed: {
    summary: 'Acelera o ralentiza la reproducción.',
    args: {
      MEDIA_KEY: MEDIA,
      SPEED: 'el multiplicador de velocidad, p. ej. 2 para el doble de rápido o 0.5 para la mitad; 0 lo deja como está',
    },
  },
  setframecount: {
    summary: 'Duplica o quita fotogramas hasta llegar a un número exacto de fotogramas. Ideal para convertir imágenes fijas en GIFs.',
    args: {
      MEDIA_KEY: MEDIA,
      AMOUNT: 'el número de fotogramas que quieres',
    },
    notes: ['`setframecount img max(10,imgfc)` se asegura de que haya al menos 10 fotogramas.'],
  },
  setfps: {
    summary: 'Fija los fotogramas por segundo.',
    args: {
      MEDIA_KEY: MEDIA,
      AMOUNT: 'fotogramas por segundo',
    },
  },
  setframedelay: {
    summary: 'Fija cuánto tiempo se muestra cada fotograma.',
    args: {
      MEDIA_KEY: MEDIA,
      AMOUNT: 'retardo por fotograma en milisegundos',
    },
  },
  setloop: {
    summary: 'Fija cuántas veces se repite una imagen animada.',
    args: {
      MEDIA_KEY: MEDIA,
      AMOUNT: 'número de repeticiones; 0 se repite para siempre',
    },
    results: [
      'Un GIF del avatar girando que solo se reproduce una vez.',
    ],
    notes: ['Solo hace algo con imágenes (GIF, WebP, APNG); el audio y el vídeo no se tocan.'],
  },
  fadein: {
    summary: 'Hace aparecer la multimedia desde un color al principio.',
    args: {
      MEDIA_KEY: MEDIA,
      DURATION: 'duración del fundido en segundos',
      COLOR: 'color desde el que aparecer',
    },
  },
  ffmpeg: {
    summary: 'Ejecuta filtros y códecs de FFmpeg sobre la multimedia, con las propias opciones de FFmpeg.',
    args: {
      MEDIA_KEY: MEDIA,
      FFMPEG_OPTIONS: 'opciones de salida de FFmpeg, como `-vf`, `-af`, `-filter_complex`, `-c:v`, `-c:a`, `-crf`, `-map`',
    },
    results: [
      'Invierte los colores, cambia el tono de color y sube el tono de audio aproximadamente un semitono.',
      'Usa otra clave de multimedia como segunda entrada, aquí como una Hald CLUT.',
    ],
    notes: [
      'La multimedia es la entrada `0`, y cada `-i MEDIA_KEY` añade otra multimedia como entrada `1`, `2`, ... (como mucho 4).',
      'La salida mantiene el formato de la multimedia, así que `-c:v`/`-c:a` tienen que encajar con él (`flac` en un `video/mp4` funciona, `pcm_s16le` no).',
      'Solo funcionan los filtros, códecs y opciones permitidos. Los filtros que leen o escriben archivos (`movie`, `amovie`, `sendcmd`, `zmq`, `ladspa`, `metadata`...) están bloqueados, y `frei0r` solo admite nombres de plugin conocidos.',
      'El filtro `drawtext` siempre dibuja su texto tal como se escribió (`expansion=none`, sin `%{...}`), y sus `fontsize` (1-500), `borderw` (0-100), `shadowx`/`shadowy` (de -500 a 500) y `boxborderw` (0-500) tienen que ser números simples. El comando `drawtext` es la forma más fácil de poner texto sobre la multimedia.',
      'La salida tiene un máximo de 10 minutos, 2048x2048 y 2 minutos de tiempo de ejecución de FFmpeg.',
      '`lut3d` funciona con LUTs de `loadcube`, como `lut3d=CUBE_KEY.cube` (`applylut` hace lo mismo en una línea).',
    ],
  },
  fadeout: {
    summary: 'Hace desaparecer la multimedia hacia un color al final.',
    args: {
      MEDIA_KEY: MEDIA,
      DURATION: 'duración del fundido en segundos',
      COLOR: 'color hacia el que desaparecer',
    },
  },
  shuffle: {
    summary: 'Corta la multimedia en segmentos y los desordena.',
    args: {
      MEDIA_KEY: MEDIA,
      SEGMENT: 'duración de cada segmento en segundos',
    },
  },
  stammer: {
    summary: 'Reconstruye la multimedia a partir de sus propios fotogramas para que "toque" el audio de otro clip.',
    args: {
      MEDIA_KEY: 'la multimedia portadora cuyos fotogramas de audio y vídeo se trocean',
      MODULATOR_MEDIA_KEY: 'la multimedia cuyo audio se imita',
      MATCHER_MODE: '`basic` usa el fotograma más parecido, `combination` mezcla varios, `unique` usa cada fotograma de la portadora una sola vez, `weighted` compara el audio con ponderación A',
      COLOR_MODE: '`fast_8` es de 8 bits rápido con una paleta por defecto, `full_8` es de 8 bits lento con una paleta propia, `full` es de 16 bits rápido',
    },
    results: [
      'Los propios sonidos del vídeo reordenados para imitar la canción.',
    ],
    notes: ['Las dos multimedia tienen que tener audio.'],
  },
  seesaw: {
    summary: 'Reproduce la multimedia hacia delante y después al revés.',
    args: {
      MEDIA_KEY: MEDIA,
    },
    notes: ['Funciona con audio, GIFs y vídeos.'],
  },
};
