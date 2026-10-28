// MediaScript commands in Brazilian Portuguese (distort & animate), keyed by command name

import type { TagDocsTranslation } from '../localize';

import { MEDIA } from './mediascriptCommon';


const ONLY_MEDIA = {MEDIA_KEY: MEDIA};
const ANIMATED_GIF = 'Uma imagem estática vira um GIF animado.';
const WAVE = {
  AMPLITUDE: 'altura da onda',
  WAVE_LENGTH: 'distância entre as ondas',
};
const DELAY = {
  MEDIA_KEY: MEDIA,
  DELAY: 'milissegundos por quadro',
};
const SAME_SEED = 'a mesma semente dá o mesmo resultado; none é aleatório';
const GIF_FRAMES = (frames: number) => `Transforma uma imagem estática num GIF de ${frames} quadros.`;


export const MEDIASCRIPT_PORTUGUESE_8: TagDocsTranslation['mediaScriptCommands'] = {
  distort: {
    summary: 'Aplica uma distorção do ImageMagick com os seus próprios números.',
    args: {
      MEDIA_KEY: MEDIA,
      METHOD: 'a distorção',
      ARGUMENTS: 'os números que esse método espera, separados por espaços (veja a documentação do -distort do ImageMagick)',
    },
    results: [
      'Dobra a imagem num círculo completo.',
      'Um abaulamento em barril estilo olho de peixe.',
    ],
    notes: ['No máximo 32 números são usados.'],
  },
  implode: {
    summary: 'Suga o meio da mídia para dentro.',
    args: ONLY_MEDIA,
  },
  explode: {
    summary: 'Empurra o meio da mídia para fora (o contrário do `implode`).',
    args: ONLY_MEDIA,
  },
  fisheye: {
    summary: 'Infla o meio da mídia como uma lente olho de peixe.',
    args: ONLY_MEDIA,
  },
  swirl: {
    summary: 'Torce a mídia num redemoinho.',
    args: {
      MEDIA_KEY: MEDIA,
      DEGREES: 'o quanto torcer; negativo vai no outro sentido',
    },
  },
  pinchpunch: {
    summary: 'Belisca a mídia para dentro ou a infla para fora em volta de um ponto, como o Pinch/Punch do VEGAS.',
    args: {
      MEDIA_KEY: MEDIA,
      INTENSITY: 'positivo infla o meio para fora (até 5 vezes maior), negativo o belisca para dentro',
      X: 'o centro na horizontal, como fração da largura',
      Y: 'o centro na vertical, como fração da altura',
      X_SCALE: 'a largura da área afetada, como fração da metade da largura',
      Y_SCALE: 'a altura da área afetada, como fração da metade da altura',
    },
    results: [
      'O meio infla para fora o máximo possível.',
      'Uma área pequena acima do meio é beliscada para dentro.',
    ],
    notes: [
      'As partes puxadas de além da borda ficam transparentes (pretas em vídeos).',
    ],
  },
  tvsimulator: {
    summary: 'Uma TV analógica perdendo a sincronia de linha: a imagem rasga e treme para os lados, ou para cima e para baixo (o simulador de TV dos efeitos de Preview 1280).',
    args: {
      MEDIA_KEY: MEDIA,
      LINE_SYNC: 'o quanto a TV segura a imagem; 1 é limpo e menos rasga mais',
      DETAIL_ZOOM: 'dá zoom na distorção; mais alto dá ondas maiores e mais lentas',
      VERTICAL: 'rasga a imagem para cima e para baixo em vez de para os lados',
    },
    results: [
      'Uma tremida de TV leve.',
      'Uma TV muito mal sintonizada com rasgos grandes e lentos.',
      'A imagem rola e rasga para cima e para baixo em vez disso.',
    ],
    notes: [
      'Usa um vídeo de deslocamento embutido que entra em loop em clipes com mais de 60 segundos. O áudio é mantido como está.',
      'Funciona com vídeos, GIFs e imagens (uma imagem estática ganha um quadro da tremida). O mesmo efeito é o comando `.tvsimulator` (`/media-iv-glitch tv-simulator`).',
      'Para usar o seu próprio vídeo de deslocamento, carregue-o com `load` e use `displace` dentro do `ffmpeg` (veja Efeitos de logo).',
    ],
  },
  tunnel: {
    summary: 'Envolve a mídia num túnel radial ou em espiral.',
    args: ONLY_MEDIA,
  },
  detunnel: {
    summary: 'Desenrola um túnel radial ou em espiral (o contrário do `tunnel`).',
    args: ONLY_MEDIA,
  },
  wave: {
    summary: 'Dobra a mídia ao longo de uma onda senoidal.',
    args: {
      MEDIA_KEY: MEDIA,
      ...WAVE,
    },
  },
  waves: {
    summary: 'Ondas animadas em movimento.',
    args: {
      MEDIA_KEY: MEDIA,
      ...WAVE,
    },
  },
  vegastimecode: {
    summary: 'Escreve o tempo da mídia sobre ela numa caixa preta, como o efeito Timecode do VEGAS (Sony).',
    args: {
      MEDIA_KEY: MEDIA,
      X: 'onde fica na horizontal, dentro de uma margem de segurança de 10%',
      Y: 'onde fica na vertical, dentro de uma margem de segurança de 10%',
      TYPE: 'como o tempo é escrito: `time` 00:00:01,335, `seconds` 1,335, `timeframes` 00:00:01,10, `frames` 40,000, `feet16`/`feet35` 1+00, SMPTE `ivtc` (23.976), `film` (24), `ebu` (25), `nondrop` (29.97), `drop` 00:00:01;10 e `smpte30`',
    },
    results: [
      'Timecode drop frame no canto inferior direito, como o padrão do Vegas.',
      'Timecode de cinema a 24 fps no canto superior esquerdo.',
    ],
    notes: [
      'O tempo começa em 0 no primeiro quadro, então uma imagem parada sempre mostra 0. Os tipos SMPTE contam os quadros na própria taxa, não na da mídia. O tamanho acompanha a altura da mídia e o áudio é mantido como está.',
    ],
  },
  vegaswave: {
    summary: 'Dobra a mídia com ondas na horizontal e na vertical, como o Wave do VEGAS, e pode movê-las.',
    args: {
      MEDIA_KEY: MEDIA,
      X_SPEED: 'a velocidade da onda lateral, em radianos por segundo (`6.28` é uma onda por segundo)',
      X_FREQUENCY: 'quantas meias ondas descem pela mídia na onda lateral (`2` é uma onda inteira)',
      X_INTENSITY: 'o quanto a mídia se move para os lados, como fração da largura',
      X_PHASE: 'onde a onda lateral começa, em radianos (`3.14` é meia onda)',
      Y_SPEED: 'a velocidade da onda vertical, em radianos por segundo',
      Y_FREQUENCY: 'quantas meias ondas atravessam a mídia na onda vertical',
      Y_INTENSITY: 'o quanto a mídia se move para cima e para baixo, como fração da altura',
      Y_PHASE: 'onde a onda vertical começa, em radianos',
    },
    results: [
      'Uma ondulação parada nos dois sentidos.',
      'Uma onda lateral se movendo uma vez por segundo; uma imagem estática vira um gif.',
    ],
    notes: [
      'Uma onda em movimento transforma uma imagem estática num gif em loop do ciclo da onda mais lenta (no máximo 10 segundos), com as velocidades levemente arredondadas para o loop ficar suave. Gifs e vídeos mantêm os próprios quadros e tempos.',
    ],
  },
  wiggle: {
    summary: 'Adiciona um balanço em movimento.',
    args: {
      MEDIA_KEY: MEDIA,
      LOOP: 'balançar continuamente em vez de recomeçar, para um loop suave',
    },
  },
  skew: {
    summary: 'Inclina a mídia para o lado (ou para cima e para baixo).',
    args: {
      MEDIA_KEY: MEDIA,
      AMOUNT: 'ângulo de cisalhamento em graus',
    },
  },
  zoom: {
    summary: 'Dá zoom no centro da mídia.',
    args: ONLY_MEDIA,
  },
  mirrorbottom: {
    summary: 'Espelha a metade de baixo sobre a metade de cima (hooh).',
    args: ONLY_MEDIA,
  },
  mirrorleft: {
    summary: 'Espelha a metade esquerda sobre a metade direita (haah).',
    args: ONLY_MEDIA,
  },
  mirrorright: {
    summary: 'Espelha a metade direita sobre a metade esquerda (waaw).',
    args: ONLY_MEDIA,
  },
  mirrortop: {
    summary: 'Espelha a metade de cima sobre a metade de baixo (woow).',
    args: ONLY_MEDIA,
  },
  mandalascope: {
    summary: 'Transforma a mídia num caleidoscópio com cara de mandala.',
    args: {
      MEDIA_KEY: MEDIA,
      AMOUNT: 'número de fatias espelhadas',
    },
  },
  rotate3d: {
    summary: 'Gira a mídia no espaço 3D (pan, tilt e roll).',
    args: {
      MEDIA_KEY: MEDIA,
      PAN: 'virar para a esquerda/direita',
      TILT: 'inclinar para frente/trás',
      ROLL: 'girar como uma roda',
      ORDER: 'de 1 a 3 letras entre `p`, `t`, `r` dando a ordem de rotação; ex.: `ptr` é pan, depois tilt, depois roll',
    },
    results: [
      'Vira a imagem como se fosse vista de um ângulo.',
      'Uma volta 3D completa em 36 quadros.',
    ],
  },
  spin: {
    summary: 'Faz a mídia girar.',
    args: {
      MEDIA_KEY: MEDIA,
      CIRCLE: 'cortar num círculo antes',
    },
    notes: [GIF_FRAMES(20)],
  },
  spin3d: {
    summary: 'Gira a mídia no espaço 3D.',
    args: ONLY_MEDIA,
    notes: [GIF_FRAMES(37)],
  },
  orb: {
    summary: 'Envolve a mídia em volta de um orbe ou globo girando.',
    args: ONLY_MEDIA,
    notes: [GIF_FRAMES(30)],
  },
  prism: {
    summary: 'Envolve a mídia em volta de uma pirâmide girando, como o prisma do Obama, com fundo transparente recortado na pirâmide.',
    args: {
      MEDIA_KEY: MEDIA,
      ANGLE: 'quanto ela está virada, com o meio da mídia na face da frente: onde o giro começa, ou a pose com STILL',
      TILT: 'quanto a câmera olha para baixo, 0 na altura dela e 90 bem em cima da ponta',
      REPEAT: 'colocar a mídia inteira em cada face em vez de envolvê-la uma vez pelas quatro, como o original',
      STILL: 'não girar, manter a pose de ANGLE (uma animação continua tocando nela)',
    },
    notes: ['Transforma uma imagem parada num GIF de 60 quadros (30 com REPEAT), ou num quadro só com STILL.'],
  },
  globe: {
    summary: 'Envolve a mídia numa esfera, como um globo olho de peixe.',
    args: {
      MEDIA_KEY: MEDIA,
      TILED: 'diminuir e repetir a mídia em mosaico pela esfera em vez de esticar uma cópia só',
    },
    results: [
      'O avatar como um globo redondo.',
    ],
    notes: ['O resultado é cortado num quadrado com o lado de fora transparente. Ao contrário do `orb`, ele não gira.'],
  },
  shake: {
    summary: 'Sacode a mídia.',
    args: ONLY_MEDIA,
    notes: [GIF_FRAMES(15)],
  },
  shaketriggered: {
    summary: 'O meme de "triggered" tremendo, com a etiqueta embaixo.',
    args: ONLY_MEDIA,
    notes: [GIF_FRAMES(4)],
  },
  bounce: {
    summary: 'Faz a mídia quicar como um webm que quica, cada quadro com o próprio tamanho.',
    args: {
      MEDIA_KEY: MEDIA,
      AXIS: 'qual lado quica',
      STYLE: 'bounce cai e volta de uma vez, wave é suave, random é qualquer tamanho a cada quadro',
      BOUNCES: 'quiques por segundo',
      MINIMUM: 'o menor tamanho, em porcentagem do original',
      DURATION: 'segundos, para imagens estáticas',
    },
    notes: [
      'Sempre um webm, o único formato em que cada quadro pode ter o próprio tamanho. Faça por último: ações posteriores deixam os quadros do mesmo tamanho de novo.',
      'O Discord só mostra o quique quando o link é colado numa mensagem; o arquivo enviado toca no tamanho do primeiro quadro.',
    ],
  },
  slide: {
    summary: 'Rola a mídia continuamente numa direção, dando a volta.',
    args: ONLY_MEDIA,
  },
  wall: {
    summary: 'Repete a mídia em mosaico numa parede inclinada.',
    args: ONLY_MEDIA,
  },
  dice: {
    summary: 'Corta a mídia em blocos e gira cada um aleatoriamente.',
    args: {
      MEDIA_KEY: MEDIA,
      GRID: 'blocos por lado',
      SEED: SAME_SEED,
    },
  },
  explodeanimated: {
    summary: 'Um efeito de explode que vai ficando mais forte aos poucos.',
    args: ONLY_MEDIA,
    notes: [ANIMATED_GIF],
  },
  implodeanimated: {
    summary: 'Um efeito de implode que vai ficando mais forte aos poucos.',
    args: ONLY_MEDIA,
    notes: [ANIMATED_GIF],
  },
  flash: {
    summary: 'Pisca entre a mídia normal e a invertida.',
    args: DELAY,
  },
  inout: {
    summary: 'Dá zoom para dentro da mídia através de cópias dela mesma, e depois volta para fora.',
    args: DELAY,
  },
  outin: {
    summary: 'Dá zoom para fora da mídia através de cópias dela mesma, e depois volta para dentro.',
    args: DELAY,
  },
  sidetoside: {
    summary: 'Inverte a mídia na horizontal de um lado para o outro.',
    args: DELAY,
  },
  uptodown: {
    summary: 'Inverte a mídia na vertical de um lado para o outro.',
    args: DELAY,
  },
  layer: {
    summary: 'Repete a mídia em mosaico com cópias espelhadas e invertidas.',
    args: ONLY_MEDIA,
  },
  multiply: {
    summary: 'Repete a mídia numa grade.',
    args: {
      MEDIA_KEY: MEDIA,
      GRID: 'cópias por lado',
      ROTATE: 'girar cada cópia aleatoriamente',
      SEED: SAME_SEED,
    },
  },
  scramble: {
    summary: 'Embaralha blocos da mídia.',
    args: {
      MEDIA_KEY: MEDIA,
      GRID: 'blocos por lado',
      ROTATE: 'também girar cada bloco aleatoriamente',
      SEED: SAME_SEED,
    },
  },
  ripple: {
    summary: 'Adiciona ondulações de água se espalhando a partir do centro.',
    args: {
      MEDIA_KEY: MEDIA,
      AMPLITUDE: 'altura das ondulações',
      WIDTH: 'distância entre as ondulações',
      POWER: 'a rapidez com que as ondulações somem',
      RMIN: 'raio em volta do centro que fica liso',
    },
  },
  facealien: {
    summary: 'Deforma o maior rosto até virar um alienígena.',
    args: {
      MEDIA_KEY: MEDIA,
      SKIN: 'deixar também a pele verde e todo o resto em azul frio',
    },
  },
  faceanime: {
    summary: 'Dá ao maior rosto olhos grandes de anime.',
    args: {
      MEDIA_KEY: MEDIA,
      EYES: 'cor dos olhos',
    },
  },
  faceclown: {
    summary: 'Dá ao maior rosto uma maquiagem de palhaço.',
    args: ONLY_MEDIA,
  },
  facefat: {
    summary: 'Engorda o maior rosto.',
    args: ONLY_MEDIA,
  },
  faceforehead: {
    summary: 'Deixa a testa do maior rosto mais alta; SMOOTHBRAIN a amassa em vez disso.',
    args: ONLY_MEDIA,
  },
};
