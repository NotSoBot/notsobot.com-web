// MediaScript commands in Brazilian Portuguese (text, size), keyed by command name

import type { TagDocsTranslation } from '../localize';

import { MEDIA, TEXT_STYLE_ARGS, TEXT_STYLE_NOTES } from './mediascriptCommon';


const TEXT_IMAGE = 'o nome da imagem de texto';
const TTI_ARGS = {
  MEDIA_KEY: TEXT_IMAGE,
  FONT_SIZE: 'tamanho do texto',
  WRAP_WIDTH: 'largura em pixels em que quebrar as linhas',
  COLOR: 'nome de cor, RGBA ou #HEX, sem espaços',
  TEXT: 'o texto, envolto em `{jsonify:}`',
};
const BOX = {
  MEDIA_KEY: MEDIA,
  WIDTH: 'largura da caixa em pixels',
  HEIGHT: 'altura da caixa em pixels',
};
const ONLY_MEDIA = {MEDIA_KEY: MEDIA};
const CROP_BACK = 'cortar de volta ao tamanho original';


export const MEDIASCRIPT_PORTUGUESE_3: TagDocsTranslation['mediaScriptCommands'] = {
  caption: {
    summary: 'Adiciona uma barra branca com texto acima da mídia, como o meme clássico de legenda.',
    args: {
      MEDIA_KEY: MEDIA,
      TEXT: 'a legenda; separe o texto de cima e o de baixo com `|`',
    },
  },
  meme: {
    summary: 'Adiciona texto de meme no estilo Impact em cima da mídia.',
    args: {
      MEDIA_KEY: MEDIA,
      TEXT: 'o texto; separe o texto de cima e o de baixo com `|`',
    },
  },
  text: {
    summary: 'Cria uma imagem transparente de texto estilizado: qualquer fonte incluída, contorno, sombra, caixa de fundo, markup e emojis.',
    args: {
      ...TEXT_STYLE_ARGS,
      MEDIA_KEY: TEXT_IMAGE,
      TEXT: 'o texto',
    },
    results: [
      'Coloca um texto Impact branco com contorno preto ao longo da parte de cima da imagem.',
      'Uma etiqueta amarela arredondada com "NEW" em negrito.',
    ],
    notes: [
      'A imagem só é do tamanho do texto (mais o contorno, a sombra e a caixa), então use `KEYw` / `KEYh` para posicioná-la com `overlay`, ou use `drawtext` para escrever direto na mídia.',
      'O jeito antigo de escrever, `text MEDIA_KEY FONT_SIZE WRAP_WIDTH COLOR ...TEXT` (dois números e uma cor antes do texto), ainda funciona e faz o mesmo que o `tti`.',
      ...TEXT_STYLE_NOTES,
    ],
  },
  fittext: {
    summary: 'Escreve o texto o maior possível dentro de uma caixa, para modelos de meme e balões de fala.',
    args: {
      ...TEXT_STYLE_ARGS,
      MEDIA_KEY: TEXT_IMAGE,
      WIDTH: 'largura da caixa em pixels',
      HEIGHT: 'altura da caixa em pixels',
      TEXT: 'o texto',
      MIN_SIZE: 'o menor tamanho de fonte a tentar',
      MAX_SIZE: 'o maior tamanho de fonte a tentar',
      VALIGN: 'onde o texto fica na vertical dentro da caixa',
      WRAP: 'quebrar as linhas para caber na caixa (false mantém nas linhas que você escreveu)',
    },
    results: [
      'Encaixa os argumentos da tag no quarto de cima da imagem, estilo meme.',
      'Duas caixas com o mesmo tamanho de fonte, a segunda limitada ao tamanho que a primeira escolheu.',
    ],
    notes: [
      'A imagem tem exatamente `WIDTH`x`HEIGHT`, com o texto posicionado conforme `ALIGN` e `VALIGN`, então sobreponha-a no canto superior esquerdo da caixa.',
      'O tamanho escolhido é salvo na variável `KEYfs` (ex.: `afs`), útil para fazer várias caixas combinarem.',
      'Texto que não cabe nem com `MIN_SIZE` é cortado na borda da caixa.',
      ...TEXT_STYLE_NOTES,
    ],
  },
  drawtext: {
    summary: 'Escreve texto estilizado direto numa imagem, GIF ou vídeo, podendo se mover ao longo do tempo.',
    args: {
      ...TEXT_STYLE_ARGS,
      MEDIA_KEY: MEDIA,
      TEXT: 'o texto',
      X: 'borda esquerda do texto, uma expressão que pode mudar a cada quadro (veja as observações)',
      Y: 'borda de cima do texto, igual ao `X`',
      START: 'segundo em que o texto aparece',
      END: 'segundo em que o texto some; 0 para o fim',
    },
    results: [
      'Coloca "subscribe" no canto inferior direito.',
      'Uma faixa vermelha de notícias entra rolando pela direita depois de um segundo.',
      'Um texto que sobe e desce em cada quadro de um GIF.',
    ],
    notes: [
      '`X` e `Y` são expressões normais com alguns nomes extras: `w`/`h` (o tamanho da mídia), `tw`/`th` (o tamanho do texto), `t` (o tempo do quadro em segundos) e `n` (o número do quadro). Além das funções de sempre, aceitam `floor`, `ceil`, `sqrt` e `clip(x,min,max)`, e `rand()` dá um número novo a cada quadro.',
      'As linhas quebram na largura da mídia, a não ser que `WIDTH` seja dado.',
      'Vídeos contam para os usos de `ffmpeg` do script. O áudio é mantido como está.',
      ...TEXT_STYLE_NOTES,
    ],
  },
  tti: {
    summary: 'Cria uma imagem transparente com texto centralizado.',
    args: TTI_ARGS,
    results: [
      'Escreve "hello" no meio da imagem.',
    ],
    notes: ['A imagem só é do tamanho do texto, então use `textw` / `texth` para posicioná-la com `overlay`.'],
  },
  ttil: {
    summary: 'Igual ao `tti`, mas o texto fica alinhado à esquerda.',
    args: TTI_ARGS,
  },
  ttir: {
    summary: 'Igual ao `tti`, mas o texto fica alinhado à direita.',
    args: TTI_ARGS,
  },
  asciitext: {
    summary: 'Cria uma imagem com letras grandes de arte ASCII a partir de um texto.',
    args: {
      MEDIA_KEY: 'o nome da nova imagem',
      TEXT: 'o texto, envolto em `{jsonify:}` (quebras de linha permitidas)',
    },
  },
  labeltriggered2: {
    summary: 'Redimensiona a mídia para 256 pixels de largura e adiciona uma etiqueta de "triggered" embaixo.',
    args: ONLY_MEDIA,
  },
  labeltriggered3: {
    summary: 'Igual ao `labeltriggered2`, com outra etiqueta de "triggered".',
    args: ONLY_MEDIA,
  },
  labelanalysis: {
    summary: 'Adiciona um painel de "Kowalski, analysis" embaixo da mídia.',
    args: ONLY_MEDIA,
  },
  labelexcuse: {
    summary: 'Adiciona um painel de "excuse me, what?" embaixo da mídia.',
    args: ONLY_MEDIA,
  },
  labelifunny: {
    summary: 'Adiciona a barra com a marca d\'água do iFunny.',
    args: ONLY_MEDIA,
  },
  labelkirby: {
    summary: 'Adiciona um painel de "Kirby\'s Calling the Police" embaixo da mídia.',
    args: ONLY_MEDIA,
  },
  labelperfection: {
    summary: 'Adiciona uma definição de dicionário de "perfection" acima da mídia.',
    args: ONLY_MEDIA,
  },

  resize: {
    summary: 'Redimensiona para uma largura e altura exatas (esticando se precisar).',
    args: {
      MEDIA_KEY: MEDIA,
      WIDTH: 'nova largura em pixels',
      HEIGHT: 'nova altura em pixels',
      KERNEL: 'método de reamostragem, ex.: `NEAREST` para pixel art nítida',
    },
  },
  contain: {
    summary: 'Encaixa a mídia dentro de uma caixa e preenche o espaço vazio com transparência.',
    args: BOX,
  },
  cover: {
    summary: 'Preenche uma caixa por completo, cortando o que sobrar.',
    args: BOX,
  },
  fit: {
    summary: 'Diminui ou aumenta a mídia para caber dentro de uma caixa, mantendo a proporção.',
    args: BOX,
  },
  scale: {
    summary: 'Redimensiona por um multiplicador, ex.: 0.5 para metade do tamanho ou 2 para o dobro.',
    args: {
      MEDIA_KEY: MEDIA,
      SCALE: 'o multiplicador',
    },
  },
  stretch: {
    summary: 'Estica a largura e/ou a altura por um multiplicador.',
    args: {
      MEDIA_KEY: MEDIA,
      WIDTH: 'multiplicador da largura',
      HEIGHT: 'multiplicador da altura',
      CROP: CROP_BACK,
    },
  },
  crop: {
    summary: 'Recorta um retângulo da mídia.',
    args: {
      MEDIA_KEY: MEDIA,
      WIDTH: 'largura da área a manter',
      HEIGHT: 'altura da área a manter',
      X: 'borda esquerda da área',
      Y: 'borda de cima da área',
    },
  },
  cropauto: {
    summary: 'Recorta automaticamente para a parte mais interessante da mídia.',
    args: ONLY_MEDIA,
  },
  cropcircle: {
    summary: 'Recorta a mídia num círculo com o lado de fora transparente.',
    args: ONLY_MEDIA,
  },
  cropface: {
    summary: 'Recorta a mídia em um rosto e o segue de quadro em quadro.',
    args: {
      MEDIA_KEY: MEDIA,
      FACE: 'o número que o `drawfaces` coloca no rosto, no primeiro quadro em que ele aparece',
    },
    results: [
      'Segue o primeiro rosto encontrado no vídeo.',
      'Recorta no segundo rosto (o que o `drawfaces` numera 1).',
    ],
    notes: [
      'Todo quadro é recortado no mesmo tamanho, o maior que o rosto chega a ter (com uma folga em volta), e centralizado nele, então acompanha o rosto mas nunca dá zoom. Nos quadros em que ele não é encontrado, a posição vem dos quadros ao redor.',
    ],
  },
  cropnft: {
    summary: 'Recorta a mídia num hexágono, como os avatares NFT do Twitter.',
    args: ONLY_MEDIA,
  },
  croptriangle: {
    summary: 'Recorta a mídia num triângulo com o lado de fora transparente.',
    args: ONLY_MEDIA,
  },
  trim: {
    summary: 'Remove as bordas pretas em volta da mídia.',
    args: {
      MEDIA_KEY: MEDIA,
      THRESHOLD: 'o quanto uma borda precisa ser escura para contar como preta',
    },
  },
  uncaption: {
    summary: 'Corta uma barra de legenda que fica acima da mídia.',
    args: {
      MEDIA_KEY: MEDIA,
      TOLERANCE: 'o quanto o fundo da legenda pode se afastar do branco',
    },
  },
  flip: {
    summary: 'Deixa a mídia de cabeça para baixo (inversão vertical).',
    args: ONLY_MEDIA,
  },
  flop: {
    summary: 'Espelha a mídia da esquerda para a direita (inversão horizontal).',
    args: ONLY_MEDIA,
  },
  rotate: {
    summary: 'Gira a mídia por um número de graus.',
    args: {
      MEDIA_KEY: MEDIA,
      DEGREES: 'quanto girar',
      FILLCOLOR: 'cor para os cantos que ficam descobertos, como `image_color|video_color` ou uma cor só para os dois',
      CROP: CROP_BACK,
    },
    results: [
      'Inclina a imagem 45 graus sobre um fundo branco.',
    ],
    notes: ['Por padrão, imagens ficam com os cantos transparentes e vídeos com cantos pretos, já que vídeo não pode ser transparente.'],
  },
  offset: {
    summary: 'Desloca a imagem dentro da tela em X e/ou Y pixels.',
    args: {
      MEDIA_KEY: MEDIA,
      X: 'deslocamento horizontal',
      Y: 'deslocamento vertical',
    },
  },
};
