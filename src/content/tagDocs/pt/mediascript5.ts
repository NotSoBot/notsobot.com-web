// MediaScript commands in Brazilian Portuguese (combine & mask), keyed by command name

import type { TagDocsTranslation } from '../localize';

import { MEDIA } from './mediascriptCommon';


const ONLY_MEDIA = {MEDIA_KEY: MEDIA};
const TOP = 'a mídia a colocar por cima';
const LEFT = 'posição esquerda da mídia de cima';
const UP = 'posição de cima da mídia de cima';
const LOOP_SHORTER = 'repetir em loop a mídia mais curta para ter a duração da mais longa';
const OPACITY_TOP = 'opacidade da mídia de cima';
const FIRST_CHANGED = 'a primeira mídia (é alterada)';
const SIMILAR = 'o quanto uma cor precisa ser parecida para ser removida';
const EDGES = 'o quanto as bordas se misturam suavemente';
const CONVERT = 'um mimetype de imagem ou vídeo para o qual converter';
const VIDEO_BLACK = 'Vídeo não pode ser transparente, então as áreas removidas num vídeo ficam pretas.';
const AI_FACES = 'Usa IA e conta para as 20 requisições de IA que um script pode fazer (compartilhadas com `edit` e `imagine`).';
const STILL_RESULT = 'O resultado é uma imagem estática: um gif ou vídeo dá o primeiro quadro.';
const HAT = 'Fica em cima da cabeça (cabelo volumoso o levanta) e gira junto com ela. Cabeças em que nenhum rosto é encontrado, como anime, desenhos ou a parte de trás de uma cabeça, também ganham um, e em GIFs e vídeos ele segue cada rosto.';
const BIGGEST_FACES = 'quantos dos maiores rostos substituir';
const UP_TO = (count: number, what: string) => `${what}, de até ${count} caracteres`;


export const MEDIASCRIPT_PORTUGUESE_5: TagDocsTranslation['mediaScriptCommands'] = {
  overlay: {
    summary: 'Coloca uma mídia em cima de outra numa posição.',
    args: {
      MEDIA_KEY: 'a mídia de fundo (é alterada)',
      MEDIA_KEY_2: TOP,
      X: LEFT,
      Y: UP,
      COLOR: 'uma cor a remover da mídia de cima (como um chroma key)',
      SIMILARITY: SIMILAR,
      BLEND: 'o quanto as bordas removidas se misturam suavemente',
      LOOP: LOOP_SHORTER,
      OPACITY: OPACITY_TOP,
    },
    results: [
      'Coloca o avatar no meio da imagem.',
      'Sobrepõe um vídeo de tela verde com o verde removido.',
    ],
  },
  blend: {
    summary: 'Coloca uma mídia em cima de outra usando um modo de mesclagem, como os modos de mesclagem de camadas dos editores de imagem.',
    args: {
      MEDIA_KEY: 'a mídia de baixo (é alterada)',
      MEDIA_KEY_2: TOP,
      MODE: 'como a mídia de cima se mistura com a de baixo (`normal` é o mesmo que `overlay`)',
      X: LEFT,
      Y: UP,
      LOOP: LOOP_SHORTER,
      OPACITY: OPACITY_TOP,
    },
    results: [
      'Escurece e tinge a imagem com um gradiente de pôr do sol esticado por cima.',
      'Aplica o avatar em modo screen no canto superior esquerdo de um vídeo, com 60% de opacidade.',
    ],
    notes: ['A mídia de cima não é redimensionada; use `resize` antes para cobrir toda a mídia de baixo. As partes transparentes da mídia de cima ficam fora da mesclagem.'],
  },
  watermark: {
    summary: 'Coloca uma cópia pequena e semitransparente de uma mídia no canto inferior direito de outra.',
    args: {
      MEDIA_KEY: 'a mídia que vai receber a marca d\'água',
      MEDIA_KEY_2: 'a marca d\'água',
      SIZE: 'tamanho da marca d\'água como porcentagem de MEDIA_KEY',
      OPACITY: 'opacidade da marca d\'água',
      MARGIN: 'distância do canto como porcentagem de MEDIA_KEY',
    },
  },
  overlayface: {
    summary: 'Detecta rostos e cola mídia sobre o rosto, os olhos ou a boca.',
    args: {
      MEDIA_KEY: 'a mídia com os rostos',
      FACE_MEDIA: 'chave de mídia com que cobrir cada rosto',
      LEFT_EYE_MEDIA: 'chave de mídia para os olhos esquerdos',
      RIGHT_EYE_MEDIA: 'chave de mídia para os olhos direitos',
      MOUTH_MEDIA: 'chave de mídia para as bocas',
      FACE_SCALE: 'tamanho do que é colado sobre o rosto comparado ao rosto',
      EYE_SCALE: 'tamanho do que é colado sobre os olhos',
    },
  },
  join: {
    summary: 'Coloca duas mídias lado a lado, ou uma em cima da outra.',
    args: {
      MEDIA_KEY: FIRST_CHANGED,
      MEDIA_KEY_2: 'a mídia a adicionar',
      VERTICAL: 'empilhar de cima para baixo em vez de da esquerda para a direita',
      LOOP: LOOP_SHORTER,
      NORESIZE: 'não redimensioná-las para combinar',
    },
  },
  concat: {
    summary: 'Toca uma mídia depois da outra.',
    args: {
      MEDIA_KEY: FIRST_CHANGED,
      MEDIA_KEY_2: 'a mídia a adicionar no fim',
    },
  },
  concatmultiple: {
    summary: 'Toca várias mídias uma depois da outra. Muito mais rápido que encadear `concat`.',
    args: {
      MEDIA_KEY: FIRST_CHANGED,
      MEDIA_KEY_2: 'a próxima mídia',
      MEDIA_KEY_3: 'qualquer número de chaves de mídia a mais',
    },
  },
  interpolate: {
    summary: 'Alterna entre dois vídeos a cada poucos instantes, intercalando trechos de cada um.',
    args: {
      MEDIA_KEY: 'o primeiro vídeo (é alterado)',
      MEDIA_KEY_2: 'o vídeo a intercalar',
      SEGMENT: 'duração de cada trecho em segundos',
      LOOP: 'repetir o mais curto para que os dois durem o tempo todo',
    },
    results: [
      'Alterna entre o vídeo e uma cópia invertida dele a cada meio segundo.',
    ],
    notes: [
      'MEDIA_KEY_2 é redimensionado para caber em MEDIA_KEY.',
      'Feito para dois vídeos; imagens e clipes só de áudio não são suportados.',
    ],
  },
  croptransparency: {
    summary: 'Usa uma mídia como máscara de transparência para outra.',
    args: {
      MEDIA_KEY: MEDIA,
      MEDIA_KEY_2: 'a máscara',
    },
  },
  chromakey: {
    summary: 'Remove uma cor, como uma tela verde.',
    args: {
      MEDIA_KEY: MEDIA,
      COLOR: 'a cor a remover (`mostused` funciona)',
      SIMILARITY: SIMILAR,
      BLEND: EDGES,
      CONVERT: CONVERT,
    },
    notes: [VIDEO_BLACK],
  },
  colorremove: {
    summary: 'Remove a cor mais usada (normalmente o fundo), como o comando de remover cor.',
    args: {
      MEDIA_KEY: MEDIA,
      COLOR: 'a cor a remover',
      SIMILARITY: SIMILAR,
      BLEND: EDGES,
      CONVERT: CONVERT,
    },
    notes: ['`chromakey` com outros padrões. ' + VIDEO_BLACK],
  },
  backgroundremove: {
    summary: 'Remove o fundo com IA, deixando o objeto sobre transparência.',
    args: {
      MEDIA_KEY: MEDIA,
      MODEL: 'qual modelo usar, ex.: `ISNET_ANIME` para desenhos ou `BIREFNET_PORTRAIT` para pessoas',
    },
    notes: [
      'Em GIFs e vídeos, quadros repetidos só contam uma vez. Os modelos `BIREFNET_` e `BRIA_RMBG` aceitam um quadro (imagens estáticas), `ISNET_ANIME`, `ISNET_GENERAL_USE` e `U2NET_CLOTH_SEG` até 128 quadros diferentes, e o resto qualquer quantidade dentro do limite normal de quadros.',
    ],
  },
  overlaypreset: {
    summary: 'Aplica um dos modelos de sobreposição do bot, como `wasted` ou uma bandeira.',
    args: {
      MEDIA_KEY: MEDIA,
      NAME: 'o modelo; hífens, sublinhados e maiúsculas não importam (`flagusa` funciona)',
    },
    results: [
      'A tela de "wasted" do GTA sobre a imagem.',
    ],
  },
  flies: {
    summary: 'Adiciona moscas voando em volta da mídia.',
    args: {
      MEDIA_KEY: MEDIA,
      DEGREES: 'girar a imagem da mosca; none é o ângulo da própria mosca',
      FLY_MEDIA: 'chave de mídia a usar como mosca no lugar da padrão',
    },
    notes: ['Uma imagem estática vira um GIF animado.'],
  },
  rtx: {
    summary: 'Coloca duas mídias lado a lado com os selos RTX OFF e RTX ON.',
    args: {
      MEDIA_KEY: 'o lado "off"; o resultado vai aqui',
      MEDIA_KEY_2: 'o lado "on"',
    },
  },
  achievement: {
    summary: 'Coloca um pop-up de "Conquista desbloqueada" estilo Xbox na mídia.',
    args: {
      MEDIA_KEY: MEDIA,
      GAMERSCORE: 'a pontuação mostrada no pop-up',
      TEXT: UP_TO(100, 'a conquista'),
    },
    results: [
      'A última imagem ou vídeo com um pop-up de conquista "touched grass" de 50G.',
    ],
  },
  snapchat: {
    summary: 'Coloca uma legenda estilo Snapchat na mídia: texto branco numa barra preta semitransparente de largura inteira.',
    args: {
      MEDIA_KEY: MEDIA,
      POSITION: 'onde fica o centro da barra; 0 é o topo e 100 a base',
      TEXT: UP_TO(200, 'a legenda'),
    },
    results: [
      'A última imagem ou vídeo com uma legenda de Snapchat "me at 3am" na parte de baixo.',
    ],
  },
  tiktok: {
    summary: 'Coloca texto estilo TikTok na mídia, cada linha na própria caixa arredondada.',
    args: {
      MEDIA_KEY: MEDIA,
      POSITION: 'onde fica o centro do texto; 0 é o topo e 100 a base',
      DARK: 'caixas pretas com texto branco em vez de caixas brancas com texto preto',
      TEXT: UP_TO(200, 'o texto'),
    },
    results: [
      'A última imagem ou vídeo com texto do TikTok na parte de cima.',
    ],
  },
  subtitle: {
    summary: 'Coloca legendas de filme ao longo da parte de baixo da mídia, em branco com contorno preto.',
    args: {
      MEDIA_KEY: MEDIA,
      YELLOW: 'legendas amarelas estilo DVD em vez de brancas',
      TEXT: UP_TO(200, 'as legendas'),
    },
  },
  news: {
    summary: 'Coloca uma tarja de telejornal na mídia: uma aba vermelha sobre uma barra branca com a manchete, e uma faixa de notícias opcional embaixo.',
    args: {
      MEDIA_KEY: MEDIA,
      LABEL: UP_TO(30, 'a aba vermelha'),
      TEXT: '`headline | ticker`, manchete de até 150 caracteres; a faixa depois do `|` é opcional',
    },
    results: [
      'A última imagem ou vídeo com uma manchete de notícias LIVE e uma faixa de notícias.',
    ],
  },
  notification: {
    summary: 'Coloca um banner de notificação do Mensagens do iPhone ao longo do topo da mídia.',
    args: {
      MEDIA_KEY: MEDIA,
      TEXT: '`title | message`, ou só a mensagem sob o título "Messages"',
    },
  },
  youtube: {
    summary: 'Transforma a mídia numa página de vídeo do YouTube com título, canal e visualizações inventadas.',
    args: {
      MEDIA_KEY: MEDIA,
      CHANNEL: UP_TO(50, 'o nome do canal'),
      TEXT: UP_TO(100, 'o título do vídeo'),
    },
  },
  demotivate: {
    summary: 'Transforma a mídia num pôster desmotivacional: emoldurada sobre preto com um grande título serifado e uma linha embaixo.',
    args: {
      MEDIA_KEY: MEDIA,
      TEXT: '`title | line`; a linha depois do `|` é opcional',
    },
    results: [
      'A última imagem ou vídeo como pôster desmotivacional de TEAMWORK.',
    ],
  },
  watchmojo: {
    summary: 'Transforma a mídia numa miniatura de vídeo do WatchMojo.',
    args: {
      MEDIA_KEY: MEDIA,
      TEXT: UP_TO(100, 'o título do vídeo'),
    },
  },
  eyes: {
    summary: 'Coloca olhos novos sobre cada olho detectado.',
    args: {
      MEDIA_KEY: MEDIA,
      FLIPPED: 'espelhar a imagem do olho',
    },
  },
  drawfaces: {
    summary: 'Coloca um oval translúcido numerado sobre cada rosto encontrado.',
    args: ONLY_MEDIA,
    notes: ['Útil para ver quais rostos os efeitos de rosto vão encontrar.'],
  },
  facehalloweenhat: {
    summary: 'Coloca um chapéu de Halloween em cima de cada cabeça.',
    args: ONLY_MEDIA,
    notes: [HAT],
  },
  facexmascap: {
    summary: 'Coloca um gorro de Papai Noel em cima de cada cabeça.',
    args: ONLY_MEDIA,
    notes: [HAT],
  },
  facejoy: {
    summary: 'Coloca um emoji 😂 sobre cada rosto.',
    args: ONLY_MEDIA,
  },
  faceknight: {
    summary: 'Coloca o maior rosto num cavaleiro com uma espada.',
    args: ONLY_MEDIA,
  },
  facelenin: {
    summary: 'Coloca os rostos numa foto antiga em sépia com o Lenin.',
    args: ONLY_MEDIA,
  },
  facemonalisa: {
    summary: 'Coloca o maior rosto na Mona Lisa.',
    args: ONLY_MEDIA,
  },
  facemountrushmore: {
    summary: 'Esculpe o maior rosto no Monte Rushmore.',
    args: ONLY_MEDIA,
  },
  faceswap: {
    summary: 'Troca os rostos da mídia pelo rosto de outra mídia.',
    args: {
      MEDIA_KEY: 'a mídia cujos rostos são substituídos (o primeiro quadro dela)',
      FACE_MEDIA_KEY: 'a mídia com o rosto a usar (o primeiro quadro dela)',
      MAX_FACES: BIGGEST_FACES,
    },
    notes: [
      STILL_RESULT,
      AI_FACES,
    ],
  },
  faceswappreset: {
    summary: 'Troca os rostos da mídia por um dos rostos do bot.',
    args: {
      MEDIA_KEY: MEDIA,
      NAME: 'o rosto de quem',
      MAX_FACES: BIGGEST_FACES,
    },
    notes: [AI_FACES],
  },
  facefeaturesswap: {
    summary: 'Mantém o rosto, mas o coloca na pose do rosto de outra mídia.',
    args: {
      MEDIA_KEY: 'a mídia cujo rosto muda de pose (o primeiro quadro dela)',
      DRIVING_MEDIA_KEY: 'a mídia com a pose e a expressão a copiar (o primeiro quadro dela)',
      REGIONS: 'quais partes copiar',
      MODE: '`RELATIVE` soma a expressão do rosto de referência à do próprio rosto, `ABSOLUTE` a copia como está',
      MULTIPLIER: 'com que força',
    },
    notes: [
      STILL_RESULT,
      AI_FACES,
    ],
  },
  facemood: {
    summary: 'Dá um humor aos rostos da mídia.',
    args: {
      MEDIA_KEY: MEDIA,
      MAX_FACES: 'quantos dos maiores rostos mudar',
    },
    notes: [AI_FACES],
  },
  bill: {
    summary: 'Grava a mídia numa nota de 100 dólares.',
    args: ONLY_MEDIA,
  },
  burn: {
    summary: 'Desenha a mídia numa foto pegando fogo.',
    args: {
      MEDIA_KEY: MEDIA,
      ANIMATED: 'false dá uma imagem estática',
    },
  },
  instantcamera: {
    summary: 'Transforma a mídia numa foto de câmera instantânea com uma legenda escrita à mão.',
    args: {
      MEDIA_KEY: MEDIA,
      TEXT: 'legenda opcional, de até 40 caracteres',
    },
  },
  latte: {
    summary: 'Desenha a mídia num café com leite.',
    args: ONLY_MEDIA,
  },
  museum: {
    summary: 'Pendura a mídia numa moldura de museu.',
    args: ONLY_MEDIA,
  },
  oldtv: {
    summary: 'Mostra a mídia numa TV antiga.',
    args: {
      MEDIA_KEY: MEDIA,
      ANIMATED: 'false dá uma imagem estática maior',
    },
  },
  spheres: {
    summary: 'Pinta a mídia como a Galateia das Esferas de Dalí.',
    args: ONLY_MEDIA,
  },
  timesquare: {
    summary: 'Coloca a mídia num painel da Times Square.',
    args: ONLY_MEDIA,
  },
  universe: {
    summary: 'Mistura a mídia com o espaço sideral.',
    args: {
      MEDIA_KEY: MEDIA,
      SPACE: 'qual fundo de espaço',
    },
  },
  adhd: {
    summary: 'Empilha gameplay aleatório embaixo da mídia.',
    args: {
      MEDIA_KEY: MEDIA,
      HORIZONTAL: 'colocar o gameplay ao lado da mídia em vez disso',
    },
    notes: ['Funciona com áudio também. O resultado é sempre um vídeo.'],
  },
};
