// MediaScript commands in Spanish (audio), keyed by command name

import type { TagDocsTranslation } from '../localize';

import { MEDIA } from './mediascriptCommon';


const ONLY_MEDIA = {MEDIA_KEY: MEDIA};
const NO_AUDIO = 'La multimedia sin audio se queda como está.';
const BANDS = 'en cuántas bandas de frecuencia se divide la voz: menos suena más robótico, más suena más claro';
const WITH_VOICE = 'la multimedia con la voz (mantiene su vídeo)';
const PUT = {
  LONGEST: 'hacer que el resultado dure lo mismo que el más largo de los dos',
  LOOP: 'repetir en bucle el más corto para llenar el tiempo',
};


export const MEDIASCRIPT_SPANISH_9: TagDocsTranslation['mediaScriptCommands'] = {
  audiobitcrush: {
    summary: 'Aplica bitcrush al audio: menos frecuencia de muestreo y profundidad de bits para un sonido crujiente y lo-fi.',
    args: {
      MEDIA_KEY: MEDIA,
      SAMPLES: 'factor de reducción de la frecuencia de muestreo; 6 convierte audio de 48kHz en unos 8kHz',
      BITS: 'profundidad de bits; cuanto más baja, más áspero; 4 o menos es duro',
      MIX: 'cuánto audio machacado se usa; 1 es totalmente machacado',
      MODE: '`log` mantiene más limpias las partes bajas, `lin` lo machaca todo por igual',
    },
    results: [
      'Audio lo-fi muy machacado y áspero.',
    ],
    notes: [NO_AUDIO],
  },
  audioboostbass: {
    summary: 'Potencia los graves.',
    args: ONLY_MEDIA,
  },
  audiocompress: {
    summary: 'Baja la calidad del audio a propósito.',
    args: ONLY_MEDIA,
  },
  audiodestroy: {
    summary: 'Distorsiona el audio todo lo posible (earrape).',
    args: ONLY_MEDIA,
  },
  audiopaulstretch: {
    summary: 'Estira el audio hasta convertirlo en un drone ambiental lento y difuminado, como el Paulstretch de Audacity. El vídeo se ralentiza para coincidir.',
    args: {
      MEDIA_KEY: MEDIA,
      STRETCH: 'cuántas veces más larga se hace la multimedia',
      RESOLUTION: 'segundos de sonido que se difuminan juntos cada vez; más grande es más suave y pierde más ritmo, y los valores pequeños suenan entrecortados',
    },
    results: [
      'El doble de larga, como un manto ambiental lento.',
      'Los valores por defecto de Audacity: diez veces más larga.',
    ],
    notes: [
      'Solo se usa la parte de la multimedia que cabe en 10 minutos una vez estirada. Cuenta para el límite de `ffmpeg`.',
    ],
  },
  audiopitch: {
    summary: 'Sube o baja el tono.',
    args: {
      MEDIA_KEY: MEDIA,
      SCALE: 'multiplicador del tono; por debajo de 1 es más grave',
    },
  },
  multipitch: {
    summary: 'Cambia el tono del audio en semitonos sin cambiar su velocidad, o mezcla varias copias con distintos tonos en un acorde (como el programa multipitch de los tags de efectos).',
    args: {
      MEDIA_KEY: MEDIA,
      SEMITONES: 'un número para cambiar el tono, o varios separados por comas para mezclar una copia en cada tono (`0` es el original)',
      NORMALIZE: 'bajar el volumen de la mezcla para que las copias no se sumen hasta saturar',
      ENGINE: '`bungee`, `rubberband` o `signalsmith`, el cambiador de tono con el que se hace cada copia (el `--backend` del programa multipitch)',
    },
    results: [
      'Sube el audio una quinta; el vídeo se queda igual.',
      'Un acorde: el audio original, una quinta por encima y una octava por encima, mezclados.',
      'El mismo acorde hecho con rubberband, que suena como `rubberband=pitch=` en una línea de `ffmpeg`.',
    ],
    notes: [
      'Usa Bungee por defecto, el backend por defecto del programa multipitch. ENGINE=rubberband y ENGINE=signalsmith equivalen a su `--backend rubberband` y `--backend signalsmith`. Todos los tonos se hacen a la vez.',
      'Sin NORMALIZE las copias se suman, como `--no-normalize` en los tags, así que los acordes grandes suenan fuerte. Cuenta para el límite de `ffmpeg`.',
    ],
  },
  vocoder: {
    summary: 'Hace que la voz de tu multimedia cante la música de otra multimedia: la música suena moldeada por cómo suena la voz, como el vocoder "autotune" (autotune.exe) de los tags de efectos.',
    args: {
      MEDIA_KEY: WITH_VOICE,
      CARRIER_KEY: 'la multimedia sobre cuyo sonido se reproduce la voz, normalmente música. Se repite en bucle hasta la duración de la voz',
      BANDS: BANDS,
    },
    results: [
      'La voz del clip cantando la canción; el vídeo se queda igual.',
      'Un vocoder robótico de 16 bandas.',
    ],
    notes: [
      'Un vocoder de canales como el Zerius Vocoder que es autotune.exe: ventanas de aproximadamente 1/15 de segundo, divididas en BANDS bandas, con las bandas de la música igual de fuertes que las de la voz y el resultado igual de fuerte que la música. No es corrección de tono.',
      'El resultado es mono. Cuenta para el límite de `ffmpeg`. Fuera de los tags, el bot tiene lo mismo con el comando `.vocoder` (primero la voz y luego la música) y con `/media-av-pitch vocoder`.',
      'Para cantar un acorde sin una segunda multimedia, usa `vocoderchord`.',
    ],
  },
  vocoderchord: {
    summary: 'Hace que la voz de tu multimedia cante un acorde, sin necesidad de música: el acorde se crea para ella y se moldea por cómo suena la voz.',
    args: {
      MEDIA_KEY: WITH_VOICE,
      CHORD: 'hasta 8 notas separadas por comas: una letra, `#` o `b`, y luego la octava (en la octava 4 está el do central), como `A3,C#4,E4`. También funcionan las frecuencias en Hz',
      SYNTH: 'el sonido con el que se toca el acorde: `choir` (voces suaves con vibrato), `robot` (una onda cuadrada), `saw` (brillante y amplio), `pad` (lento y oscuro) u `organ`',
      BANDS: BANDS,
    },
    results: [
      'La voz del clip cantando un acorde de do mayor.',
      'Un acorde de la menor con un pad lento y oscuro.',
      'Un vocoder robótico de 16 bandas sobre una onda cuadrada simple.',
    ],
    notes: [
      'Cada nota son unas cuantas voces ligeramente desafinadas del sonido del sintetizador, con un poco de siseo para que se sigan oyendo las s y las t de la voz. Son sonidos propios, no una copia de los de ningún plugin.',
      'El resultado es mono. Cuenta para el límite de `ffmpeg`. Fuera de los tags, el bot tiene lo mismo con el comando `.vocoderchord` y con `/media-av-pitch vocoder-chord`.',
    ],
  },
  audiodelay: {
    summary: 'Retrasa el audio (o lo adelanta con un número negativo) respecto al vídeo.',
    args: {
      MEDIA_KEY: MEDIA,
      DELAY: 'segundos; puede ser negativo',
    },
  },
  audioreverse: {
    summary: 'Invierte solo el audio, dejando el vídeo como está.',
    args: ONLY_MEDIA,
  },
  audiovibrato: {
    summary: 'Añade vibrato (un tono que oscila).',
    args: {
      MEDIA_KEY: MEDIA,
      FREQUENCY: 'oscilaciones por segundo',
    },
  },
  audionormalize: {
    summary: 'Normaliza la sonoridad a un nivel alto con el loudnorm de ffmpeg.',
    args: {
      MEDIA_KEY: MEDIA,
      STRENGTH: 'lo fuerte que queda; 0 es -24 LUFS y 1 es -5 LUFS',
    },
    notes: [
      'El mismo efecto es el comando `.audio normalize` (`/media-av-effect normalize`).',
    ],
  },
  audiotremolo: {
    summary: 'Añade trémolo (un volumen que late).',
    args: {
      MEDIA_KEY: MEDIA,
      FREQUENCY: 'latidos por segundo',
    },
  },
  audioreverb: {
    summary: 'Añade reverberación, como cantar en una sala.',
    args: {
      MEDIA_KEY: MEDIA,
      DELAY: 'milisegundos',
    },
  },
  audioflanger: {
    summary: 'Añade un flanger (un barrido como el de un avión a reacción).',
    args: ONLY_MEDIA,
  },
  audioequalizer: {
    summary: 'Ajusta siete bandas de frecuencia, en decibelios.',
    args: ONLY_MEDIA,
  },
  audionoise: {
    summary: 'Añade una pista de ruido, mezclada con el audio que ya haya.',
    args: {
      MEDIA_KEY: MEDIA,
      COLOR: 'el tipo de ruido; `brown` y `pink` son más graves, `blue` y `violet` sisean más',
      AMPLITUDE: 'volumen del ruido',
      SAMPLE_RATE: 'muestras por segundo',
    },
    results: [
      'Añade un ruido rosa suave al vídeo.',
    ],
    notes: ['Las imágenes se convierten en un vídeo MP4 con el ruido; una imagen fija pasa a durar 10 segundos.'],
  },
  volume: {
    summary: 'Fija el nivel de volumen.',
    args: {
      MEDIA_KEY: MEDIA,
      AMOUNT: 'nivel de volumen',
    },
  },
  waveform: {
    summary: 'Dibuja la forma de onda del audio como una imagen.',
    args: {
      MEDIA_KEY: 'el audio o el vídeo',
      COLOR: 'el color de la forma de onda',
      SPLIT: 'dibujar cada canal en su propia fila',
    },
    notes: ['El resultado es una imagen con el fondo transparente.'],
  },
  audioputconcat: {
    summary: 'Añade el audio de otra multimedia después del audio de esta.',
    args: {
      MEDIA_KEY: MEDIA,
      MEDIA_KEY_2: 'la multimedia cuyo audio se añade',
      ...PUT,
    },
  },
  audioputmix: {
    summary: 'Mezcla el audio de otra multimedia encima del audio de esta.',
    args: {
      MEDIA_KEY: MEDIA,
      MEDIA_KEY_2: 'la multimedia cuyo audio se mezcla',
      ...PUT,
    },
  },
  audioputreplace: {
    summary: 'Sustituye el audio de esta multimedia por el audio de otra.',
    args: {
      MEDIA_KEY: MEDIA,
      AUDIO_NAME: 'la clave de multimedia cuyo audio se usa',
      ...PUT,
    },
  },
  audiochannelscombine: {
    summary: 'Mezcla el audio a mono.',
    args: ONLY_MEDIA,
    notes: [NO_AUDIO],
  },
  audiochannelsinvert: {
    summary: 'Intercambia los canales de audio izquierdo y derecho.',
    args: ONLY_MEDIA,
    notes: ['El audio mono se pasa primero a estéreo. ' + NO_AUDIO],
  },
};
