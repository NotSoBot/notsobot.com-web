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
      SYNTH: 'el sonido con el que se toca el acorde: `choir` (voces suaves con vibrato), `robot` (una onda cuadrada), `saw` (brillante y amplio), `pad` (lento y oscuro), `organ` o `power` (un lead grande y zumbón al estilo del carrier Power de Vocodex)',
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
  audiosentencemix: {
    summary: 'Sentence mixing: hace que la multimedia diga una frase uniendo las palabras que se dicen en ella.',
    args: {
      MEDIA_KEY: 'la multimedia con las palabras (su vídeo se corta junto con ellas)',
      SENTENCE: 'lo que quieres que diga, todas las palabras que quedan tras los demás argumentos',
      SKIP_MISSING: 'omitir las palabras que no se dicen en vez de fallar',
      GAP: 'milisegundos de silencio (y el último fotograma) entre los trozos, no se usa con `BPM`',
      BPM: 'ajusta cada palabra a un pulso a este tempo (`0`: desactivado)',
    },
    results: [
      'El clip diciendo "I can do that", cortado de sus propias palabras.',
      'El clip diciendo "I want donuts", con "donuts" armado con sonidos de sus otras palabras.',
      'Las mismas palabras sobre un pulso de 120 bpm, cada una un poco más aguda y la última sostenida durante dos pulsos.',
    ],
    notes: [
      'Las palabras se encuentran con reconocimiento de voz. Las que se dicen seguidas quedan en un solo trozo, y una palabra que no se dice se arma con dos o tres que sí (`hotdog` con `hot` y `dog`), o si no con sus sonidos (`notsobot` con `not so` y los sonidos de otras palabras). Sin `SKIP_MISSING` falla y lista las palabras que no encontró.',
      'Una palabra puede terminar con marcas: `word^3` la sube 3 semitonos (`^-2` la baja, hasta 24 en cada dirección), `word*2` la hace el doble de larga sin cambiar su tono (de `0.25` a `4`), y las dos van juntas como `word^3*2`. Un `_` solo es un silencio de un cuarto de segundo (`_*2` el doble). Una palabra con marcas se corta sola en vez de como parte de una frase.',
      'Una palabra se puede escribir con sus sonidos entre barras, separados por `-`: `/d-ow-n-ah-t-s/` es "donuts". Se arma con esos sonidos de las palabras que sí se dicen, como una palabra que no se dice, y también acepta marcas (`/d-ow-n-ah-t-s/^3`). Los sonidos son códigos ARPAbet (`aa` `ae` `ah` `ao` `aw` `ax` `ay` `b` `ch` `d` `dh` `eh` `er` `ey` `f` `g` `hh` `ih` `iy` `jh` `k` `l` `m` `n` `ng` `ow` `oy` `p` `r` `s` `sh` `t` `th` `uh` `uw` `v` `w` `y` `z` `zh`) o símbolos del AFI.',
      'Con `BPM` cada palabra ocupa un pulso: se estira o se acelera para llenarlo (como mucho al doble de su duración, el resto del pulso es silencio), `word*2` pasa a significar dos pulsos (de `0.125` a `16`) y `_` es un silencio de un pulso. Lo que cae en el pulso es la vocal de la palabra, las consonantes de antes (el `tr` de `try`) suenan justo antes. El vídeo se ralentiza y se acelera junto con las palabras.',
      'Solo se escuchan los primeros 15 minutos. El resultado es un mp4, o un mp3 sin vídeo, de 10 minutos como máximo. Cuenta para el límite de `ffmpeg`.',
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
  audiochorus: {
    summary: 'Añade un chorus como VEGAS Chorus: copias del sonido cantando un poco desfasadas.',
    args: {
      MEDIA_KEY: MEDIA,
      VOICES: 'cuántas copias cantan a la vez, una de cada dos invertida',
      DELAY: 'cuánto se retrasan las copias, en milisegundos',
      RATE: 'oscilaciones por segundo',
      DEPTH: 'cuánto oscilan las copias, en porcentaje del retraso (100 oscila tanto como el retraso)',
      MIX: 'cuánto de las copias se usa, el resto es el original',
    },
    results: [
      'Una sola copia oscilando rápido y nada del original: una voz temblorosa y mareada.',
    ],
    notes: [NO_AUDIO],
  },
  audiodistortion: {
    summary: 'Distorsiona el audio como VEGAS ExpressFX Distortion: lo sube y lo recorta a lo bruto.',
    args: {
      MEDIA_KEY: MEDIA,
      DRIVE: 'cuánto se empuja el audio a la saturación; 100 lo sube 40 dB',
      MIX: 'cuánto del audio distorsionado se usa, el resto es el original',
      LOWPASS: 'corta el sonido por encima de estos Hz después, 0 para desactivar',
    },
    results: [
      'Audio totalmente saturado sin el siseo agudo, como un altavoz reventado.',
    ],
    notes: [NO_AUDIO],
  },
  audiogapper: {
    summary: 'Gapper/Snipper: pone huecos de silencio en el audio, o le recorta trozos.',
    args: {
      MEDIA_KEY: MEDIA,
      FREQUENCY: 'huecos por segundo',
      LENGTH: 'cuánto dura cada hueco, en milisegundos',
      SNIP: 'recortar ese tanto de audio en vez de poner silencio',
    },
    results: [
      'Una voz entrecortada, un 40% más corta.',
    ],
    notes: [
      'Los huecos alargan el audio y los recortes lo acortan; un vídeo se ralentiza o se acelera para seguir sincronizado.',
      'Un hueco dura como mucho 3 veces el tiempo entre huecos, y un recorte como mucho el 95%.',
      NO_AUDIO,
    ],
  },
  audiowahwah: {
    summary: 'Añade un wah-wah: una banda del sonido subida de volumen que barre arriba y abajo.',
    args: {
      MEDIA_KEY: MEDIA,
      RATE: 'barridos por segundo',
      DEPTH: 'qué tan amplio es el barrido; empieza en 350 Hz y 100 sube 4 octavas',
    },
    notes: [NO_AUDIO],
  },
  vocodermelody: {
    summary: 'Hace que la voz de tu multimedia cante una melodía: notas una tras otra, en bucle hasta lo que dure la voz.',
    args: {
      MEDIA_KEY: WITH_VOICE,
      NOTES: 'pasos separados por comas: una nota (`C4`, `F#3`), un acorde unido con `+` (`C4+E4+G4`) o `r` para un silencio. Cada uno dura un pulso salvo que termine en `:PULSOS` (`G4:2`, `r:0.5`). Como mucho 1024 pasos',
      BPM: 'pulsos por minuto',
      SYNTH: 'el sonido con el que se toca la melodía, como en `vocoderchord`',
      BANDS: BANDS,
    },
    results: [
      'La voz cantando un arpegio que sube y vuelve a bajar.',
      'Dos acordes grandes y zumbones, de cuatro pulsos cada uno.',
    ],
    notes: [
      'Fuera de los tags, `.vocodermelody` y `/media-av-pitch vocoder-melody` también aceptan un archivo MIDI (.mid) en vez de las notas: todas las pistas menos la batería, las 8 notas más agudas a la vez.',
      'El resultado es mono. Cuenta para el límite de `ffmpeg`.',
    ],
  },
  audioautotune: {
    summary: 'Aplica autotune a una voz: cada nota se lleva a la nota más cercana de una tonalidad y el ritmo no cambia.',
    args: {
      MEDIA_KEY: MEDIA,
      KEY: 'la tonalidad: una nota con `#` o `b` para mayor (`C`, `F#`), añade `m` o `minor` para menor (`Am`, `Bb minor`), o `chromatic` para todas las notas',
      STRENGTH: 'cuánto se lleva cada nota; 1 la ajusta del todo para el sonido robótico',
    },
    results: [
      'La voz ajustada a la menor.',
    ],
    notes: [
      'Pensado para una sola voz. Los acordes y la música de fondo salen temblorosos, y los sonidos sin tono (s, t, respiraciones) se quedan como están.',
      NO_AUDIO,
    ],
  },
  audiopingpong: {
    summary: 'Corta el audio en trozos que suenan hacia delante y luego al revés.',
    args: {
      MEDIA_KEY: MEDIA,
      LENGTH: 'cuánto dura cada trozo, en milisegundos',
      KEEP_LENGTH: 'poner al revés uno de cada dos trozos, así la duración no cambia',
    },
    results: [
      'Una voz que tartamudea adelante y atrás, el doble de larga.',
    ],
    notes: [
      'Sin `KEEP_LENGTH` el audio dura el doble y un vídeo se ralentiza para seguirlo. `seesaw` reproduce toda la multimedia hacia delante y luego al revés una vez.',
      NO_AUDIO,
    ],
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
