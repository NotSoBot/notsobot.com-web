// MediaScript commands in Brazilian Portuguese (create media), keyed by command name

import type { TagDocsTranslation } from '../localize';

import { MEDIA } from './mediascriptCommon';


const NEW_IMAGE = 'o nome da nova imagem';
const POLYGON_COLOR = 'RGBA ou #HEX, sem espaços';
const POLYGON_POINTS = 'pontos `x,y` separados por espaços';
const ONLY_BY_NAME = 'só pelo nome';
const UP_TO = (count: number) => `até ${count} caracteres`;
const TWO_LINES = (count: number) => `uma ou duas linhas (\`line 1 | line 2\`), de até ${count} caracteres cada`;


export const MEDIASCRIPT_PORTUGUESE_2: TagDocsTranslation['mediaScriptCommands'] = {
  create: {
    summary: 'Cria uma imagem em branco: totalmente transparente, ou de uma cor sólida se você der uma.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      WIDTH: 'largura em pixels',
      HEIGHT: 'altura em pixels',
      ALPHA: 'opacidade: 0 é invisível e 255 é sólido; omita para ficar totalmente opaca quando uma cor é dada, ou totalmente transparente quando nenhuma é',
    },
    results: [
      'Um quadrado azul-celeste de 500x500.',
      'Uma imagem de 500x500 totalmente transparente.',
    ],
    notes: [
      'Sem RED, GREEN nem BLUE, a imagem é totalmente transparente (alfa 0). Dar qualquer um deles cria uma cor sólida, com os que faltarem em 0 e ALPHA em 255, a não ser que você o defina.',
    ],
  },
  createpolygonfill: {
    summary: 'Desenha um polígono preenchido a partir de uma lista de pontos.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      COLOR: POLYGON_COLOR,
      POINTS: POLYGON_POINTS,
    },
    results: [
      'Um triângulo vermelho numa imagem transparente de 300x300.',
    ],
    notes: ['O tamanho da imagem é definido pelo maior X e pelo maior Y entre os pontos.'],
  },
  createpolygonstroke: {
    summary: 'Desenha só o contorno de um polígono a partir de uma lista de pontos.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      COLOR: POLYGON_COLOR,
      POINTS: POLYGON_POINTS,
    },
    notes: ['Igual ao `createpolygonfill`, mas com contorno em vez de preenchimento.'],
  },
  loadsvg: {
    summary: 'Transforma código SVG numa imagem.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      SVG_TEXT: 'o código SVG, envolto em `{jsonify:}`',
    },
    results: [
      'Um círculo vermelho.',
    ],
  },
  imagine: {
    summary: 'Gera uma imagem com IA a partir de um prompt de texto.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      PROMPT: 'o que desenhar; se estiver vazio, é usado um prompt aleatório',
    },
    results: [
      'Um carro feito com IA, com vaporwave.',
    ],
  },
  reimagine: {
    summary: 'Substitui a mídia por uma nova imagem feita com IA do que ela mostra, como o `.reimagine`.',
    args: {
      MEDIA_KEY: MEDIA,
      ADD: 'palavras extras colocadas no fim da descrição da imagem',
    },
    results: [
      'Uma nova imagem do que o avatar mostra, em pixel art.',
    ],
    notes: [
      'Primeiro a IA descreve a imagem, e o que é desenhado é essa descrição (mais `ADD`), então o resultado é uma imagem nova, não uma edição.',
      'Vídeos usam o primeiro quadro, e o resultado é sempre uma imagem estática.',
    ],
  },
  screenshot: {
    summary: 'Tira uma captura de tela de uma página web.',
    args: {
      URL: 'a página a capturar',
      MEDIA_KEY: 'o nome da captura',
      TIMEOUT: 'segundos a esperar a página carregar',
      WIDTH: 'largura do navegador em pixels',
      HEIGHT: 'altura do navegador em pixels',
      WAIT: 'segundos extras a esperar depois de carregar',
      DARKMODE: 'pedir à página o tema escuro dela',
    },
    results: [
      'Uma captura de 1280x720 do site.',
    ],
  },
  qrcode: {
    summary: 'Cria uma imagem de QR code.',
    args: {
      MEDIA_KEY: 'o nome do QR code',
      WIDTH: 'largura em pixels; 512 é uma boa escolha',
      HEIGHT: 'altura em pixels; 512 é uma boa escolha',
      MARGIN: 'borda vazia em volta do código, normalmente 1',
      TEXT: 'o texto ou link a codificar',
    },
    results: [
      'Um QR code escaneável para o site.',
    ],
  },
  wordcloud: {
    summary: 'Cria uma nuvem de palavras a partir de uma lista de palavras ou mensagens.',
    args: {
      MEDIA_KEY: 'o nome da nuvem de palavras',
      WIDTH: 'largura em pixels; 0 usa o padrão',
      HEIGHT: 'altura em pixels; 0 usa o padrão',
      THEME: 'cores, ' + ONLY_BY_NAME + ': `FIRE`, `FOREST`, `IMAGE` (as cores da máscara; o padrão quando há uma), `MONO`, `NEON`, `OCEAN`, `PASTEL`, `RAINBOW` ou `SUNSET`',
      SHAPE: ONLY_BY_NAME + ': `CIRCLE`, `CLOUD`, `HEART`, `RECTANGLE` ou `STAR`',
      BACKGROUND: ONLY_BY_NAME + ': um código hexadecimal, `r,g,b(,a)`, um nome de cor ou `transparent`',
      MASK: ONLY_BY_NAME + ': uma imagem que as palavras preenchem (as partes brancas ou transparentes dela ficam vazias) e da qual pegam as cores',
      SEED: ONLY_BY_NAME + ': a mesma semente com as mesmas palavras dá a mesma nuvem',
      WORDS: 'as palavras ou mensagens, cada linha separada (envolva em `{jsonify:}`)',
    },
    results: [
      'Uma nuvem de palavras em que "cake" é a maior palavra.',
      'As palavras que você der, num coração com cores de pôr do sol sobre branco.',
      'As palavras preenchendo seu avatar, com as cores dele.',
    ],
    notes: [
      'O tamanho fica entre 512 e 2048 pixels; com um formato, o padrão é 1024x1024, e com uma máscara ele se ajusta para caber a máscara.',
      'Palavras comuns (como "the", "lol") ficam de fora, e duas palavras que aparecem juntas toda hora viram uma só.',
    ],
  },
  song: {
    summary: 'Faz uma música a partir de acordes, com baixo e bateria.',
    args: {
      MEDIA_KEY: 'o nome sob o qual guardar a música',
      BPM: 'batidas por minuto',
      BARS: 'quantos compassos, um acorde por compasso. none toca os acordes duas vezes',
      SOUND: 'em que os acordes são tocados',
      DRUMS: 'tocar a bateria',
      CHORDS: 'nomes de acordes como `C Am F G7 F#m7 Bbsus4`, ou notas como `C4,E4,G4`',
    },
    results: [
      'Quatro acordes num pad a 90 bpm, duas vezes.',
    ],
    notes: ['As opções só pelo nome; os acordes ficam com todo o resto. As músicas podem ter no máximo 60 segundos.'],
  },
  tts: {
    summary: 'Gera um clipe de áudio de texto para fala.',
    args: {
      MEDIA_KEY: 'o nome do áudio',
      VOICE: 'uma das vozes da tabela de vozes de texto para fala, ou o nome ou ID de uma das suas vozes clonadas',
      TEXT: 'o que falar, envolto em `{jsonify:}`',
    },
    results: [
      'Um MP3 do Ghostface fazendo a pergunta.',
      'Mixa sua voz padrão lendo os argumentos sobre o último vídeo.',
    ],
    notes: [
      'Texto com mais de 4096 caracteres é cortado. Veja a seção do Klattsch para a voz de fonemas `KLATTSCH`.',
      'Com o NotSoPremium você pode usar suas próprias vozes clonadas (do `tts voice create` ou do `/tts voice create`): `VOICE="my voice"` pelo nome (sem diferenciar maiúsculas) ou ID, ou `VOICE=CLONED` para a mais recente. Elas são sempre as vozes de quem executa o script, e uma voz embutida tem prioridade sobre uma voz clonada com o mesmo nome.',
      'Sem `VOICE`, é usada a voz de TTS padrão de quem executa o script (`/settings set tts-voice`, ou a seção de texto para fala das configurações do seu painel), ou `TIKTOK_EN_US_FEMALE_01` se a pessoa não tiver escolhido nenhuma. Uma voz clonada padrão precisa do NotSoPremium; sem ele, é usada a alternativa.',
    ],
  },
  createaudionoise: {
    summary: 'Cria um clipe MP3 de ruído puro, como estática ou chuva.',
    args: {
      MEDIA_KEY: 'o nome do novo áudio',
      DURATION: 'duração em segundos',
      COLOR: 'o tipo de ruído; `brown` e `pink` são mais graves, `blue` e `violet` chiam mais',
      AMPLITUDE: 'volume',
      SAMPLE_RATE: 'amostras por segundo',
    },
    results: [
      '30 segundos de ruído marrom suave.',
    ],
  },
  einstein: {
    summary: 'Faz o Einstein escrever um texto num quadro-negro.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      TEXT: UP_TO(15),
    },
  },
  foggywindow: {
    summary: 'Escreve um texto numa janela embaçada.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      TEXT: UP_TO(20),
      BACKGROUND: 'qual janela; só pelo nome, já que o texto fica com o resto da linha',
    },
  },
  hacker: {
    summary: 'Coloca um texto na tela de um hacker.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      TEXT: UP_TO(1000),
      TEMPLATE: 'qual hacker; só pelo nome',
    },
  },
  neon: {
    summary: 'Escreve um texto como um letreiro de neon.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      TEXT: TWO_LINES(20),
    },
    results: [
      'Um letreiro de neon escrito "open" em cima de "24/7".',
    ],
  },
  presidential: {
    summary: 'Cria um Alerta Presidencial de iPhone com o texto.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      TEXT: UP_TO(250),
      TIME: 'o horário mostrado, como `12:00`; só pelo nome. none é o horário UTC atual',
      DATE: 'a data mostrada; só pelo nome. none é hoje (UTC)',
    },
  },
  realfact: {
    summary: 'Coloca um texto numa tampinha "Real Fact" da Snapple.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      TEXT: UP_TO(200),
    },
  },
  retrowave: {
    summary: 'Cria uma imagem de título retrowave dos anos 80.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      TEXT: 'até três linhas, `top | middle | bottom`',
      BACKGROUND: ONLY_BY_NAME,
      TEXT_STYLE: 'como a linha do meio é desenhada; só pelo nome',
    },
  },
  snowwriting: {
    summary: 'Escreve um texto na neve.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      TEXT: TWO_LINES(15),
    },
  },
  sonic: {
    summary: 'Faz o Sonic falar o texto.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      TEXT: UP_TO(200),
    },
  },
  soup: {
    summary: 'Escreve o texto com sopa de letrinhas.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      TEXT: UP_TO(14),
    },
  },
  thonkify: {
    summary: 'Escreve o texto com a fonte do emoji pensativo.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      TEXT: UP_TO(70),
    },
  },
  tombstone: {
    summary: 'Escreve um texto numa lápide.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      TEXT: 'até cinco linhas, separadas por `|`',
    },
  },
  treecarving: {
    summary: 'Entalha um texto numa árvore.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      TEXT: 'uma ou duas linhas (`line 1 | line 2`), de até 15 e 12 caracteres',
    },
  },
  woodensign: {
    summary: 'Entalha um texto numa placa de madeira.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      TEXT: UP_TO(25),
    },
  },
  yacht: {
    summary: 'Escreve um texto na lateral de um iate.',
    args: {
      MEDIA_KEY: NEW_IMAGE,
      TEXT: UP_TO(25),
    },
  },
};
