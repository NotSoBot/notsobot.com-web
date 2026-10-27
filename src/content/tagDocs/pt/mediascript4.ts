// MediaScript commands in Brazilian Portuguese (time, plus `ffmpeg`), keyed by command name

import type { TagDocsTranslation } from '../localize';

import { MEDIA } from './mediascriptCommon';


export const MEDIASCRIPT_PORTUGUESE_4: TagDocsTranslation['mediaScriptCommands'] = {
  snip: {
    summary: 'Mantém só uma parte da duração da mídia.',
    args: {
      MEDIA_KEY: MEDIA,
      START: 'tempo de início em segundos; negativo conta de trás para frente a partir do fim',
      END: 'tempo de fim em segundos; negativo conta de trás para frente a partir do fim; omita para ir até o fim',
      LOOP: 'repetir a mídia em loop em vez de parar no fim, então tempos depois do fim voltam ao começo',
    },
    results: [
      'Mantém os últimos 5 segundos.',
      'Num vídeo de 30 segundos, 120 segundos começando aos 9 segundos, voltando ao início cada vez que ele termina.',
    ],
    notes: [
      'Com `LOOP`, END continua sendo um tempo e não uma duração: `39 159` sempre dura 120 segundos, e só o START dá a volta. O clipe pode ter no máximo 600 segundos.',
      'Ao contrário do `repeatduration`, que sempre começa do início, com `LOOP` qualquer tempo de início é seguro, mesmo um depois do fim.',
    ],
  },
  clonesnip: {
    summary: 'Copia um trecho da mídia para uma chave nova, sem mexer na original.',
    args: {
      MEDIA_KEY: 'a mídia de onde copiar',
      MEDIA_KEY_2: 'o nome da cópia cortada',
      START: 'tempo de início em segundos',
      END: 'tempo de fim em segundos; omita para ir até o fim',
    },
  },
  snipframes: {
    summary: 'Mantém só um intervalo de quadros.',
    args: {
      MEDIA_KEY: MEDIA,
      START_FRAME: 'primeiro quadro a manter',
      END_FRAME: 'quadro em que parar',
    },
  },
  repeat: {
    summary: 'Toca a mídia várias vezes seguidas.',
    args: {
      MEDIA_KEY: MEDIA,
      AMOUNT: 'quantas vezes repetir',
    },
  },
  repeatduration: {
    summary: 'Repete a mídia em loop até ela ter uma certa duração.',
    args: {
      MEDIA_KEY: MEDIA,
      DURATION: 'duração total em segundos',
    },
  },
  reverse: {
    summary: 'Toca a mídia de trás para frente.',
    args: {
      MEDIA_KEY: MEDIA,
      AUDIO: 'inverter o áudio também',
    },
  },
  speed: {
    summary: 'Acelera ou desacelera a reprodução.',
    args: {
      MEDIA_KEY: MEDIA,
      SPEED: 'o multiplicador de velocidade, ex.: 2 para o dobro da velocidade ou 0.5 para a metade; 0 deixa como está',
    },
  },
  setframecount: {
    summary: 'Duplica ou remove quadros até chegar a um número exato de quadros. Ótimo para transformar imagens estáticas em GIFs.',
    args: {
      MEDIA_KEY: MEDIA,
      AMOUNT: 'o número de quadros que você quer',
    },
    notes: ['`setframecount img max(10,imgfc)` garante que haja pelo menos 10 quadros.'],
  },
  setfps: {
    summary: 'Define os quadros por segundo.',
    args: {
      MEDIA_KEY: MEDIA,
      AMOUNT: 'quadros por segundo',
    },
  },
  setframedelay: {
    summary: 'Define por quanto tempo cada quadro é mostrado.',
    args: {
      MEDIA_KEY: MEDIA,
      AMOUNT: 'atraso por quadro em milissegundos',
    },
  },
  setloop: {
    summary: 'Define quantas vezes uma imagem animada se repete.',
    args: {
      MEDIA_KEY: MEDIA,
      AMOUNT: 'número de repetições; 0 repete para sempre',
    },
    results: [
      'Um GIF do avatar girando que só toca uma vez.',
    ],
    notes: ['Só faz algo com imagens (GIF, WebP, APNG); áudio e vídeo ficam como estão.'],
  },
  fadein: {
    summary: 'Faz a mídia surgir a partir de uma cor no começo.',
    args: {
      MEDIA_KEY: MEDIA,
      DURATION: 'duração do fade em segundos',
      COLOR: 'cor a partir da qual surgir',
    },
  },
  ffmpeg: {
    summary: 'Executa filtros e codecs do FFmpeg na mídia, usando as próprias opções do FFmpeg.',
    args: {
      MEDIA_KEY: MEDIA,
      FFMPEG_OPTIONS: 'opções de saída do FFmpeg, como `-vf`, `-af`, `-filter_complex`, `-c:v`, `-c:a`, `-crf`, `-map`',
    },
    results: [
      'Inverte as cores, muda o matiz e sobe o tom em cerca de um semitom.',
      'Usa outra chave de mídia como segunda entrada, aqui como uma Hald CLUT.',
    ],
    notes: [
      'A mídia é a entrada `0`, e cada `-i MEDIA_KEY` adiciona outra mídia como entrada `1`, `2`, ... (no máximo 4).',
      'A saída mantém o formato da mídia, então `-c:v`/`-c:a` precisam combinar com ele (`flac` num `video/mp4` funciona, `pcm_s16le` não).',
      'Só filtros, codecs e opções permitidos funcionam. Filtros que leem ou escrevem arquivos (`movie`, `amovie`, `sendcmd`, `zmq`, `ladspa`, `metadata`...) são bloqueados, e o `frei0r` só aceita nomes de plugin conhecidos.',
      'O filtro `drawtext` sempre desenha o texto como foi escrito (`expansion=none`, sem `%{...}`), e os `fontsize` (1-500), `borderw` (0-100), `shadowx`/`shadowy` (-500 a 500) e `boxborderw` (0-500) dele precisam ser números simples. O comando `drawtext` é o jeito mais fácil de colocar texto na mídia.',
      'A saída tem limite de 10 minutos, 2048x2048 e 2 minutos de tempo de execução do FFmpeg.',
      '`lut3d` funciona com LUTs do `loadcube`, como `lut3d=CUBE_KEY.cube` (o `applylut` faz o mesmo numa linha).',
    ],
  },
  fadeout: {
    summary: 'Faz a mídia sumir para uma cor no fim.',
    args: {
      MEDIA_KEY: MEDIA,
      DURATION: 'duração do fade em segundos',
      COLOR: 'cor para a qual sumir',
    },
  },
  shuffle: {
    summary: 'Corta a mídia em segmentos e embaralha a ordem deles.',
    args: {
      MEDIA_KEY: MEDIA,
      SEGMENT: 'duração de cada segmento em segundos',
    },
  },
  stammer: {
    summary: 'Reconstrói a mídia a partir dos próprios quadros para que ela "toque" o áudio de outro clipe.',
    args: {
      MEDIA_KEY: 'a mídia portadora cujos quadros de áudio e vídeo são picotados',
      MODULATOR_MEDIA_KEY: 'a mídia cujo áudio é imitado',
      MATCHER_MODE: '`basic` usa o quadro mais parecido, `combination` mistura vários, `unique` usa cada quadro da portadora uma vez só, `weighted` compara o áudio com ponderação A',
      COLOR_MODE: '`fast_8` é 8 bits rápido com uma paleta padrão, `full_8` é 8 bits lento com uma paleta própria, `full` é 16 bits rápido',
    },
    results: [
      'Os próprios sons do vídeo reorganizados para imitar a música.',
    ],
    notes: ['As duas mídias precisam ter áudio.'],
  },
  seesaw: {
    summary: 'Toca a mídia para frente e depois de trás para frente.',
    args: {
      MEDIA_KEY: MEDIA,
    },
    notes: ['Funciona com áudio, GIFs e vídeos.'],
  },
};
