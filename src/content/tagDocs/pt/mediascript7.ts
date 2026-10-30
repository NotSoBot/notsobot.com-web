// MediaScript commands in Brazilian Portuguese (filters, plus `dance`), keyed by command name

import type { TagDocsTranslation } from '../localize';

import { MEDIA } from './mediascriptCommon';


const ONLY_MEDIA = {MEDIA_KEY: MEDIA};
const ANIMATED_GIF = 'Uma imagem estática vira um GIF animado.';
const AUTO = '0 escolhe automaticamente';
const SAME_SEED = 'a mesma semente dá o mesmo resultado; none é aleatório';
const STILL_PNG = 'Vídeos usam o primeiro quadro, e o resultado é sempre um PNG estático.';


export const MEDIASCRIPT_PORTUGUESE_7: TagDocsTranslation['mediaScriptCommands'] = {
  ascii: {
    summary: 'Redesenha uma imagem ou vídeo como arte ASCII.',
    args: {
      MEDIA_KEY: MEDIA,
      INVERT: 'inverter o brilho',
    },
  },
  blur: {
    summary: 'Desfoca a mídia.',
    args: {
      MEDIA_KEY: MEDIA,
      SCALE: 'força do desfoque',
    },
  },
  motionblur: {
    summary: 'Desfoca numa direção só, como se a câmera tivesse se mexido.',
    args: {
      MEDIA_KEY: MEDIA,
      VERTICAL: 'desfocar para cima/baixo em vez de esquerda/direita',
    },
  },
  zoomblur: {
    summary: 'Desfoca para fora a partir do centro, como dar zoom durante uma longa exposição.',
    args: ONLY_MEDIA,
  },
  sharpen: {
    summary: 'Aumenta a nitidez da mídia (números negativos a suavizam).',
    args: ONLY_MEDIA,
  },
  deepfry: {
    summary: 'Aplica deepfry na mídia: cores detonadas, supersaturada e crocante.',
    args: {
      MEDIA_KEY: MEDIA,
      SCALE: 'o quanto fritar',
    },
  },
  jpeg: {
    summary: 'Adiciona artefatos de compressão JPEG ("needs more jpeg").',
    args: {
      MEDIA_KEY: MEDIA,
      QUALITY: 'qualidade da imagem; quanto menor, mais crocante',
    },
  },
  android: {
    summary: 'Faz a mídia parecer enviada de um Android antigo: áudio comprimido, imagem pixelada e 2 fps.',
    args: ONLY_MEDIA,
  },
  magik: {
    summary: 'Aplica a clássica distorção "magik" de redimensionamento líquido.',
    args: {
      MEDIA_KEY: MEDIA,
      ITERATIONS: 'quantas vezes aplicar',
      SCALE: 'o quanto cada passada amassa a imagem',
    },
  },
  pixelate: {
    summary: 'Pixeliza a mídia.',
    args: {
      MEDIA_KEY: MEDIA,
      PIXEL_WIDTH: 'tamanho de cada bloco (`PIXEL_SIZE=` também funciona)',
      NO_LINES: 'esconder as linhas da grade entre os blocos',
    },
  },
  trace: {
    summary: 'Encontra e destaca as bordas (detecção de bordas de Prewitt).',
    args: ONLY_MEDIA,
  },
  edgedetect: {
    summary: 'Encontra as bordas e as mistura de volta na mídia, com vários modos de mesclagem.',
    args: {
      MEDIA_KEY: MEDIA,
      METHOD: 'como as bordas são compostas sobre a mídia',
      MIX: 'quanto do efeito aplicar',
    },
    notes: ['Usa detecção de bordas de Sobel em 8 direções.'],
  },
  emboss: {
    summary: 'Faz a mídia parecer em relevo ou carimbada.',
    args: {
      MEDIA_KEY: MEDIA,
      AZIMUTH: 'direção da luz',
      ELEVATION: 'altura da luz',
      COMPOSE: 'mesclar o relevo de volta com a original',
      GRAY: '`none`, ou um número que define o nível de cinza das áreas planas (só no método GIMP)',
    },
  },
  paint: {
    summary: 'Faz a mídia parecer uma pintura a óleo.',
    args: {
      MEDIA_KEY: MEDIA,
      RADIUS: 'tamanho do pincel',
    },
  },
  watercolor: {
    summary: 'Faz a mídia parecer uma aquarela.',
    args: ONLY_MEDIA,
  },
  cartoon: {
    summary: 'Faz a mídia parecer um desenho animado com cores chapadas e bordas com tinta.',
    args: {
      MEDIA_KEY: MEDIA,
      LEVELS: 'número de níveis de cor',
      METHOD: 'como as bordas são encontradas',
    },
  },
  exo: {
    summary: 'Aplica um filtro com cara de alienígena.',
    args: {
      MEDIA_KEY: MEDIA,
      SWIRL: 'adicionar um redemoinho',
      RAIN: 'adicionar o tom de arco-íris',
    },
    notes: [
      'O efeito `kek` do bot é `exo MEDIA_KEY true`.',
      'O efeito `kek2` do bot é `exo MEDIA_KEY true true`.',
    ],
  },
  glitch: {
    summary: 'Aplica um efeito de glitch pesado.',
    args: {
      MEDIA_KEY: MEDIA,
      AMOUNT: AUTO,
      ITERATIONS: AUTO,
      SEED: 'use a mesma semente para ter o mesmo glitch; 0 é aleatório',
    },
  },
  dance: {
    summary: 'Recorta o objeto e o faz amassar e esticar no ritmo sobre o fundo preenchido.',
    args: {
      MEDIA_KEY: MEDIA,
      AMOUNT: 'o quanto ele amassa e estica, em porcentagem da altura',
      BPM: 'batidas por minuto; ele muda de pose a cada batida',
      MODEL: 'o modelo de remoção de fundo que encontra o objeto',
    },
    notes: [
      'Sempre cria um GIF em loop de um quique a partir do primeiro quadro: GIFs e vídeos usam o primeiro quadro, então o fundo só é removido uma vez.',
    ],
  },
  datamosh: {
    summary: 'Duplica os P-frames do vídeo para um glitch borrado de datamosh.',
    args: ONLY_MEDIA,
  },
  grain: {
    summary: 'Adiciona granulação de filme.',
    args: {
      MEDIA_KEY: MEDIA,
      FLAGS: 'de 1 a 4 letras entre `a`, `p`, `t`, `u` (flags de ruído do FFmpeg: média, padrão, temporal, uniforme)',
    },
  },
  glow: {
    summary: 'Adiciona um brilho colocando sobre a mídia uma cópia desfocada e com as cores invertidas, com 50% de opacidade.',
    args: ONLY_MEDIA,
  },
  vaporwave: {
    summary: 'Dá à mídia uma estética vaporwave, opcionalmente com texto.',
    args: {
      MEDIA_KEY: MEDIA,
      TEXT: 'texto opcional a adicionar',
    },
  },
  phosimp: {
    summary: 'Aplica filtros do PhoSimp, um depois do outro.',
    args: {
      MEDIA_KEY: MEDIA,
      FILTERS: 'números de filtro separados por espaços, aplicados em ordem',
    },
    results: [
      'Clareia as cores, mescla a imagem com o reflexo dela e a gira no sentido horário.',
    ],
    notes: [
      'No máximo 300 filtros. Funciona com imagens e vídeo.',
      'Alguns para começar: `1` negativo (inverter), `2` multiplicar RGB por 2, `3` dividir RGB por 2, `7` / `8` girar no sentido anti-horário / horário, `9` mescla com reflexo, `10` duplicar em quatro quadrados. Há mais de mil, então tente números aleatórios.',
    ],
  },
  edit: {
    summary: 'Edita uma imagem com IA conforme um prompt, opcionalmente usando outras mídias como imagens de referência.',
    args: {
      MEDIA_KEY: MEDIA,
      MEDIA_KEYS: 'até 5 chaves de outras imagens ou vídeos, escritas antes do prompt, para usar como imagens de referência',
      PROMPT: 'o que mudar; se estiver vazio, é usado um prompt aleatório',
    },
    results: [
      '',
      'Coloca o chapéu da última imagem do chat no avatar.',
    ],
    notes: [
      'Funciona melhor com edições simples.',
      'Palavras no começo do prompt que coincidem com uma chave de mídia são usadas como imagens de referência, então envolva o prompt em `{jsonify:}` se ele puder começar com um dos nomes das suas chaves.',
      STILL_PNG,
    ],
  },
  mashup: {
    summary: 'Edita a primeira mídia com IA para parecer as duas mídias misturadas, como o `.mashup`.',
    args: {
      MEDIA_KEY: MEDIA,
      MEDIA_KEY_2: 'a mídia a misturar',
    },
    results: [
      'O avatar misturado com a última imagem do chat.',
    ],
    notes: [
      'Primeiro a IA descreve as duas, e a primeira é editada para parecer as duas descrições.',
      STILL_PNG,
    ],
  },
  artistic: {
    summary: 'Transforma a mídia numa pintura em relevo.',
    args: ONLY_MEDIA,
  },
  charcoal: {
    summary: 'Faz a mídia parecer um desenho a carvão.',
    args: ONLY_MEDIA,
  },
  charcoalanimated: {
    summary: 'Um efeito de desenho a carvão que vai ficando mais forte aos poucos.',
    args: {
      MEDIA_KEY: MEDIA,
      RADIUS: 'o raio mais forte a que ele chega',
    },
    notes: [ANIMATED_GIF],
  },
  circle: {
    summary: 'Aplica um desfoque radial (giratório).',
    args: {
      MEDIA_KEY: MEDIA,
      SCALE: 'força do desfoque',
    },
  },
  emojimosaic: {
    summary: 'Reconstrói a mídia com emojis.',
    args: {
      MEDIA_KEY: MEDIA,
      SIZE: 'quantos emojis ao longo do lado maior; none é um a cada 16 pixels',
    },
  },
  glass: {
    summary: 'Coloca a mídia atrás de um vidro estilhaçado.',
    args: ONLY_MEDIA,
  },
  glitchanimated: {
    summary: 'Aplica o efeito `glitch`, mudando a cada quadro.',
    args: {
      MEDIA_KEY: MEDIA,
      AMOUNT: AUTO,
      ITERATIONS: AUTO,
      SEED: '0 é aleatório',
    },
    notes: [ANIMATED_GIF],
  },
  legofy: {
    summary: 'Reconstrói a mídia com peças de LEGO.',
    args: {
      MEDIA_KEY: MEDIA,
      SIZE: 'peças ao longo do lado maior; none escolhe automaticamente',
      PALETTE: 'limitar as cores a cores reais de LEGO',
      DITHER: 'aplicar dithering nas cores (usa a paleta ALL se nenhuma for escolhida)',
    },
  },
  lightrays: {
    summary: 'Estica as partes claras da mídia a partir do centro em raios de luz, como o Light Rays do VEGAS.',
    args: {
      MEDIA_KEY: MEDIA,
      SENSITIVITY: 'quanto do brilho forma raios: `1` é cada pixel (como o Vegas), `0.5` só a metade mais clara',
      STRENGTH: 'quão longos e brilhantes são os raios; `1` é o mais forte do Vegas',
    },
    results: [
      'Raios a partir das partes mais claras.',
      'A imagem toda brilhando para fora em raios longos.',
    ],
    notes: [
      'Como um `zoomblur` só dos realces: os raios têm o mesmo comprimento em toda parte e, em mídia transparente, saem pelas bordas.',
    ],
  },
  magikanimated: {
    summary: 'Aplica o `magik` (redimensionamento líquido) cada vez mais ao longo dos quadros.',
    args: {
      MEDIA_KEY: MEDIA,
      BOOMERANG: 'tocar de trás para frente depois',
    },
    notes: [ANIMATED_GIF],
  },
  paintanimated: {
    summary: 'Um efeito de pintura a óleo que vai ficando mais forte aos poucos.',
    args: ONLY_MEDIA,
    notes: [ANIMATED_GIF],
  },
  paper: {
    summary: 'Transforma a mídia numa polaroid inclinada e a dobra como uma folha de papel.',
    args: {
      MEDIA_KEY: MEDIA,
      ANGLE: 'o quanto inclinar; none escolhe um ângulo aleatório',
    },
  },
  pix2pix: {
    summary: 'Redesenha a mídia com um modelo pix2pix.',
    args: {
      MEDIA_KEY: MEDIA,
      MODEL: 'EDGES transforma a mídia em desenho de linhas; EMOJI e FLESH a redesenham a partir desse desenho de linhas',
      RESIZE: 'ampliar o resultado de volta ao tamanho da mídia (mais lento); imagens estáticas sempre são',
    },
  },
  pixelsort: {
    summary: 'Ordena faixas de pixels para um visual listrado de glitch art.',
    args: {
      MEDIA_KEY: MEDIA,
      ANGLE: 'direção da ordenação',
      INTERVAL: 'como as faixas são escolhidas; IMAGE ordena todos os pixels como uma faixa só',
      SORT_BY: 'COLOR agrupa pela cor dominante e depois pelo brilho',
      LOWER: 'THRESHOLD só ordena os pixels entre LOWER e UPPER',
      LENGTH: 'comprimento das faixas para RANDOM e WAVES',
      RANDOMNESS: 'porcentagem de faixas deixadas sem ordenar (pixels com IMAGE)',
      SEED: SAME_SEED,
    },
  },
  popart: {
    summary: 'Cria uma grade de pop art estilo Warhol com cópias tingidas.',
    args: ONLY_MEDIA,
  },
  quadart: {
    summary: 'Redesenha a mídia como uma quadtree de círculos ou quadrados.',
    args: ONLY_MEDIA,
  },
  smile: {
    summary: 'Faz os rostos da mídia sorrirem, como o comando smile.',
    args: {
      MEDIA_KEY: MEDIA,
      LEVEL: 'de um sorriso de boca fechada até um sorriso radiante',
      MAX_FACES: 'quantos dos maiores rostos mudar',
    },
    notes: [
      'Só os rostos mudam; o resto da mídia fica como está.',
      'Usa IA e conta para as 20 requisições de IA que um script pode fazer (compartilhadas com `edit` e `imagine`).',
    ],
  },
  swappixels: {
    summary: 'Embaralha todos os pixels.',
    args: ONLY_MEDIA,
  },
  vhs: {
    summary: 'Faz a mídia parecer uma fita VHS antiga.',
    args: ONLY_MEDIA,
  },
};
