// MediaScript commands in Brazilian Portuguese (color, plus `hidden`), keyed by command name

import type { TagDocsTranslation } from '../localize';

import { MEDIA } from './mediascriptCommon';


const ONLY_MEDIA = {MEDIA_KEY: MEDIA};
const HUE_DEGREES = 'graus para girar o matiz';


export const MEDIASCRIPT_PORTUGUESE_6: TagDocsTranslation['mediaScriptCommands'] = {
  brightness: {
    summary: 'Deixa a mídia mais clara (ou mais escura com números negativos).',
    args: ONLY_MEDIA,
  },
  darken: {
    summary: 'Deixa a mídia mais escura (ou mais clara com números negativos).',
    args: ONLY_MEDIA,
  },
  contrast: {
    summary: 'Aumenta ou diminui o contraste.',
    args: ONLY_MEDIA,
  },
  contrastmultiply: {
    summary: 'Multiplica o contraste de brilho, mantendo as cores. 1 deixa igual, 0 é um cinza chapado e negativos invertem o brilho.',
    args: ONLY_MEDIA,
  },
  grayscale: {
    summary: 'Remove toda a cor.',
    args: ONLY_MEDIA,
  },
  hidden: {
    summary: 'Esconde a mídia num tabuleiro xadrez; ela só aparece de longe ou com o zoom afastado.',
    args: {
      MEDIA_KEY: MEDIA,
      SHARE: 'quanto da mídia é misturado',
      SIZE: 'o tamanho das casas em pixels; none escolhe um pelo tamanho da mídia',
    },
  },
  sepia: {
    summary: 'Dá à mídia um tom marrom de foto antiga.',
    args: ONLY_MEDIA,
  },
  invert: {
    summary: 'Inverte todas as cores, como o negativo de uma foto.',
    args: ONLY_MEDIA,
  },
  invertlab: {
    summary: 'Inverte canais CIELAB: troca claro e escuro mantendo as cores, ou troca verde/vermelho e azul/amarelo.',
    args: {
      MEDIA_KEY: MEDIA,
      LIGHTNESS: '1 troca claro e escuro, mantendo as cores',
      A: '1 troca verde e vermelho',
      B: '1 troca azul e amarelo',
    },
  },
  invertrgba: {
    summary: 'Inverte só os canais de cor que você escolher.',
    args: {
      MEDIA_KEY: MEDIA,
      RED: '1 inverte, 0 deixa como está',
    },
  },
  opacity: {
    summary: 'Deixa a mídia transparente.',
    args: {
      MEDIA_KEY: MEDIA,
      PERCENTAGE: '100 é totalmente visível, 0 é invisível',
    },
  },
  hueshifthsv: {
    summary: 'Muda o matiz, a saturação e o brilho em HSV.',
    args: {
      MEDIA_KEY: MEDIA,
      HUE: HUE_DEGREES,
      SATURATION: 'mudança de saturação em porcentagem',
      BRIGHTNESS: 'mudança de brilho em porcentagem',
    },
    notes: ['Diminuir a saturação leva as cores para o branco (o cinza do canal mais claro delas); aumentar o brilho as mantém coloridas. Veja `hueshifthsl` para a versão HSL.'],
  },
  hueshifthsl: {
    summary: 'Muda o matiz, a saturação e a luminosidade em HSL.',
    args: {
      MEDIA_KEY: MEDIA,
      HUE: HUE_DEGREES,
      SATURATION: 'mudança de saturação em porcentagem',
      LIGHTNESS: 'mudança de luminosidade em porcentagem',
    },
    notes: ['Diminuir a saturação leva as cores para o cinza; aumentar a luminosidade as mistura com branco. Mudando só o matiz, fica igual ao `hueshifthsv`.'],
  },
  hueshifthsvffmpeg: {
    summary: 'Como o `hueshifthsv`, mas feito com FFmpeg em vez de ImageMagick (muitas vezes mais rápido em vídeo).',
    args: {
      MEDIA_KEY: MEDIA,
      HUE: HUE_DEGREES,
      SATURATION: 'multiplicador de saturação (1 deixa igual)',
      BRIGHTNESS: 'mudança de brilho',
    },
    notes: ['Aqui a saturação é um multiplicador, então omiti-la mantém a saturação original.'],
  },
  applylut: {
    summary: 'Faz a correção de cor da mídia com uma LUT `.cube` carregada pelo `loadcube`, opcionalmente misturada com a original.',
    args: {
      MEDIA_KEY: MEDIA,
      CUBE_KEY: 'o nome da LUT no `loadcube`',
      STRENGTH: 'quanto do visual corrigido usar; `0.5` é metade corrigido e metade original',
      INTERP: 'como as cores entre os pontos da LUT são calculadas',
    },
    results: [
      'Faz a correção de cor da imagem ou vídeo com o arquivo `.cube` anexado.',
      'Faz a correção de cor do clipe com 60% de intensidade.',
    ],
    notes: [
      'É o mesmo que `ffmpeg MEDIA_KEY -vf lut3d=CUBE_KEY.cube`, e conta para o mesmo limite de execuções de `ffmpeg`. O mesmo efeito é o comando `.lut` (`/media-iv-color lut`).',
      'Só imagens e vídeo; o áudio fica como está. A transparência é mantida.',
    ],
  },
  hueshiftrgb: {
    summary: 'Desloca os canais vermelho, verde e azul.',
    args: {
      MEDIA_KEY: MEDIA,
      RED: 'normalmente -255..255',
    },
  },
  huecurvergba: {
    summary: 'Remapeia um canal de cor com uma curva, como a ferramenta Curvas dos editores de foto.',
    args: {
      MEDIA_KEY: MEDIA,
      CHANNEL: 'qual canal mudar',
      TEXT: 'pontos da curva separados por espaços, como `x,y` ou só `y`, todos entre 0 e 1; `x` precisa ser crescente',
    },
    results: [
      'Uma curva em V: sombras e luzes ficam claras, e os meios-tons ficam escuros.',
      'Aumenta ou corta aleatoriamente os meios-tons do vermelho.',
    ],
  },
  gradientmap: {
    summary: 'Recolore a mídia pelo brilho ao longo de um gradiente, como o Gradient Map do VEGAS: as partes mais escuras recebem a primeira cor e as mais claras a última.',
    args: {
      MEDIA_KEY: MEDIA,
      STOPS: 'as cores do gradiente separadas por espaços, cada uma como `COLOR` ou `COLOR,POSITION` (posição de 0 a 1); paradas sem posição são distribuídas por igual entre as vizinhas',
    },
    results: [
      'Sombras azul-marinho, laranja a partir de 70% de brilho e luzes brancas.',
      'As partes escuras continuam escuras e as claras ganham um tom vermelho com metade da força.',
    ],
    notes: [
      'As cores são códigos hexadecimais, nomes de cor ou `rgb(R,G,B)`/`rgba(R,G,B,A)`. O alfa de uma cor é o quanto ela cobre a mídia, então uma parada semitransparente deixa a original aparecer. No máximo 32 paradas.',
      'Uma parada nunca é colocada antes da anterior, como nos gradientes de CSS.',
    ],
  },
  swaprgba: {
    summary: 'Reordena os canais vermelho, verde, azul e alfa.',
    args: {
      MEDIA_KEY: MEDIA,
      CHANNELS: '3 ou 4 letras entre `r`, `g`, `b`, `a`, `0` (canal vazio) e `1` (canal cheio), ex.: `bgra`',
    },
  },
  blurple: {
    summary: 'Tinge a mídia com o blurple do Discord.',
    args: ONLY_MEDIA,
  },
  gold: {
    summary: 'Dá à mídia um tom dourado.',
    args: ONLY_MEDIA,
  },
  rain: {
    summary: 'Aplica um tom estilo arco-íris.',
    args: ONLY_MEDIA,
  },
  derain: {
    summary: 'Aplica o contrário do tom do `rain`.',
    args: ONLY_MEDIA,
  },
  raingold: {
    summary: 'Combina os tons de arco-íris e dourado.',
    args: ONLY_MEDIA,
  },
  recolor: {
    summary: 'Recolore a mídia com cores vaporwave fortes.',
    args: ONLY_MEDIA,
  },
  solarize: {
    summary: 'Inverte tudo que for mais claro que um limiar, para um visual de foto solarizada.',
    args: ONLY_MEDIA,
  },
  acid: {
    summary: 'Embaralha a paleta de cores, como a tabela de cores de um GIF corrompido.',
    args: {
      MEDIA_KEY: MEDIA,
      AMOUNT: 'porcentagem das cores da paleta trocadas por cores aleatórias',
      LEVELS: 'degraus de cor por canal; a paleta tem LEVELS³ cores',
      SEED: 'a mesma semente dá o mesmo resultado; none é aleatório',
    },
  },
  hueshiftccs: {
    summary: 'Gira o matiz e ajusta saturação, gama, ganho e offset de uma vez.',
    args: {
      MEDIA_KEY: MEDIA,
      HUE: HUE_DEGREES,
    },
  },
  hueshiftyiq: {
    summary: 'Gira o matiz no espaço de cor YIQ (NTSC), mantendo o brilho.',
    args: {
      MEDIA_KEY: MEDIA,
      HUE: HUE_DEGREES,
    },
  },
  rainbow: {
    summary: 'Faz a mídia passar por tons das cores do arco-íris.',
    args: ONLY_MEDIA,
    notes: ['Uma imagem estática vira um GIF animado.'],
  },
  rgbsplit: {
    summary: 'Separa os canais vermelho, verde e azul.',
    args: {
      MEDIA_KEY: MEDIA,
      OFFSET: 'o quanto os canais se afastam',
    },
  },
  swapcolors: {
    summary: 'Embaralha os canais RGBA de cada pixel.',
    args: ONLY_MEDIA,
  },
};
