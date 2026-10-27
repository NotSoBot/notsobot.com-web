// MediaScript commands in Brazilian Portuguese (audio), keyed by command name

import type { TagDocsTranslation } from '../localize';

import { MEDIA } from './mediascriptCommon';


const ONLY_MEDIA = {MEDIA_KEY: MEDIA};
const NO_AUDIO = 'Mídia sem áudio fica como está.';
const BANDS = 'em quantas bandas de frequência a voz é dividida: menos soa mais robótico, mais soa mais claro';
const WITH_VOICE = 'a mídia com a voz (mantém o vídeo dela)';
const PUT = {
  LONGEST: 'fazer o resultado durar o mesmo que o mais longo dos dois',
  LOOP: 'repetir em loop o mais curto para preencher o tempo',
};


export const MEDIASCRIPT_PORTUGUESE_9: TagDocsTranslation['mediaScriptCommands'] = {
  audiobitcrush: {
    summary: 'Aplica bitcrush no áudio: taxa de amostragem e profundidade de bits menores para um som crocante e lo-fi.',
    args: {
      MEDIA_KEY: MEDIA,
      SAMPLES: 'fator de redução da taxa de amostragem; 6 transforma áudio de 48kHz em uns 8kHz',
      BITS: 'profundidade de bits; menor é mais áspero, 4 ou menos é bruto',
      MIX: 'quanto do áudio detonado é usado; 1 é totalmente detonado',
      MODE: '`log` mantém as partes baixas mais limpas, `lin` detona tudo por igual',
    },
    results: [
      'Áudio lo-fi muito detonado e áspero.',
    ],
    notes: [NO_AUDIO],
  },
  audioboostbass: {
    summary: 'Aumenta os graves.',
    args: ONLY_MEDIA,
  },
  audiocompress: {
    summary: 'Diminui a qualidade do áudio de propósito.',
    args: ONLY_MEDIA,
  },
  audiodestroy: {
    summary: 'Distorce o áudio o máximo possível (earrape).',
    args: ONLY_MEDIA,
  },
  audiopaulstretch: {
    summary: 'Estica o áudio até virar um drone ambiente lento e borrado, como o Paulstretch do Audacity. O vídeo é desacelerado para acompanhar.',
    args: {
      MEDIA_KEY: MEDIA,
      STRETCH: 'quantas vezes mais longa a mídia fica',
      RESOLUTION: 'segundos de som borrados juntos de cada vez; maior é mais suave e perde mais do ritmo, valores pequenos soam picotados',
    },
    results: [
      'Duas vezes mais longo, como um manto ambiente lento.',
      'Os padrões do Audacity: dez vezes mais longo.',
    ],
    notes: [
      'Só é usada a parte da mídia que cabe em 10 minutos depois de esticada. Conta para o limite de `ffmpeg`.',
    ],
  },
  audiopitch: {
    summary: 'Sobe ou desce o tom.',
    args: {
      MEDIA_KEY: MEDIA,
      SCALE: 'multiplicador do tom; abaixo de 1 é mais grave',
    },
  },
  multipitch: {
    summary: 'Muda o tom do áudio em semitons sem mudar a velocidade, ou mixa várias cópias com tons diferentes num acorde (como o programa multipitch das tags de efeito).',
    args: {
      MEDIA_KEY: MEDIA,
      SEMITONES: 'um número para mudar o tom, ou vários separados por vírgulas para mixar uma cópia em cada tom (`0` é o original)',
      NORMALIZE: 'abaixar a mixagem para que as cópias não somem até distorcer',
      ENGINE: '`bungee`, `rubberband` ou `signalsmith`, o mudador de tom com que cada cópia é feita (o `--backend` do programa multipitch)',
    },
    results: [
      'Sobe o áudio uma quinta; o vídeo fica igual.',
      'Um acorde: o áudio original, uma quinta acima e uma oitava acima, mixados juntos.',
      'O mesmo acorde feito com rubberband, soando como `rubberband=pitch=` numa linha de `ffmpeg`.',
    ],
    notes: [
      'Usa o Bungee por padrão, o backend padrão do programa multipitch. ENGINE=rubberband e ENGINE=signalsmith equivalem ao `--backend rubberband` e ao `--backend signalsmith` dele. Todos os tons são feitos ao mesmo tempo.',
      'Sem NORMALIZE as cópias se somam, como `--no-normalize` nas tags, então acordes grandes ficam altos. Conta para o limite de `ffmpeg`.',
    ],
  },
  vocoder: {
    summary: 'Faz a voz da sua mídia cantar a música de outra mídia: a música toca moldada pelo som da voz, como o vocoder "autotune" (autotune.exe) das tags de efeito.',
    args: {
      MEDIA_KEY: WITH_VOICE,
      CARRIER_KEY: 'a mídia sobre cujo som a voz é tocada, normalmente música. Ela entra em loop até a duração da voz',
      BANDS: BANDS,
    },
    results: [
      'A voz do clipe cantando a música; o vídeo fica igual.',
      'Um vocoder robótico de 16 bandas.',
    ],
    notes: [
      'Um vocoder de canais como o Zerius Vocoder que o autotune.exe é: janelas de cerca de 1/15 de segundo, divididas em BANDS bandas, com as bandas da música tão altas quanto as da voz e o resultado tão alto quanto a música. Não é correção de tom.',
      'O resultado é mono. Conta para o limite de `ffmpeg`. Fora das tags, o bot tem a mesma coisa no comando `.vocoder` (primeiro a voz, depois a música) e no `/media-av-pitch vocoder`.',
      'Para cantar um acorde sem uma segunda mídia, use `vocoderchord`.',
    ],
  },
  vocoderchord: {
    summary: 'Faz a voz da sua mídia cantar um acorde, sem precisar de música: o acorde é criado para ela e moldado pelo som da voz.',
    args: {
      MEDIA_KEY: WITH_VOICE,
      CHORD: 'até 8 notas separadas por vírgulas: uma letra, `#` ou `b`, e depois a oitava (a oitava 4 tem o dó central), como `A3,C#4,E4`. Frequências em Hz também funcionam',
      SYNTH: 'o som com que o acorde é tocado: `choir` (vozes suaves com vibrato), `robot` (uma onda quadrada), `saw` (brilhante e amplo), `pad` (lento e escuro) ou `organ`',
      BANDS: BANDS,
    },
    results: [
      'A voz do clipe cantando um acorde de dó maior.',
      'Um acorde de lá menor com um pad lento e escuro.',
      'Um vocoder robótico de 16 bandas sobre uma onda quadrada simples.',
    ],
    notes: [
      'Cada nota são algumas vozes levemente desafinadas do som do sintetizador, com um pouco de chiado para que os sons de s e t da voz ainda passem. São sons próprios, não uma cópia dos de nenhum plugin.',
      'O resultado é mono. Conta para o limite de `ffmpeg`. Fora das tags, o bot tem a mesma coisa no comando `.vocoderchord` e no `/media-av-pitch vocoder-chord`.',
    ],
  },
  audiodelay: {
    summary: 'Atrasa o áudio (ou adianta com um número negativo) em relação ao vídeo.',
    args: {
      MEDIA_KEY: MEDIA,
      DELAY: 'segundos; pode ser negativo',
    },
  },
  audioreverse: {
    summary: 'Inverte só o áudio, deixando o vídeo como está.',
    args: ONLY_MEDIA,
  },
  audiovibrato: {
    summary: 'Adiciona vibrato (um tom oscilante).',
    args: {
      MEDIA_KEY: MEDIA,
      FREQUENCY: 'oscilações por segundo',
    },
  },
  audionormalize: {
    summary: 'Normaliza o volume para um nível alto com o loudnorm do ffmpeg.',
    args: {
      MEDIA_KEY: MEDIA,
      STRENGTH: 'o quanto fica alto; 0 é -24 LUFS e 1 é -5 LUFS',
    },
    notes: [
      'O mesmo efeito é o comando `.audio normalize` (`/media-av-effect normalize`).',
    ],
  },
  audiotremolo: {
    summary: 'Adiciona tremolo (um volume pulsante).',
    args: {
      MEDIA_KEY: MEDIA,
      FREQUENCY: 'pulsos por segundo',
    },
  },
  audioreverb: {
    summary: 'Adiciona reverb, como cantar num salão.',
    args: {
      MEDIA_KEY: MEDIA,
      DELAY: 'milissegundos',
    },
  },
  audioflanger: {
    summary: 'Adiciona um flanger (um zumbido de varredura, tipo avião a jato).',
    args: ONLY_MEDIA,
  },
  audioequalizer: {
    summary: 'Ajusta sete bandas de frequência, em decibéis.',
    args: ONLY_MEDIA,
  },
  audionoise: {
    summary: 'Adiciona uma faixa de ruído, mixada com o áudio que já existir.',
    args: {
      MEDIA_KEY: MEDIA,
      COLOR: 'o tipo de ruído; `brown` e `pink` são mais graves, `blue` e `violet` chiam mais',
      AMPLITUDE: 'volume do ruído',
      SAMPLE_RATE: 'amostras por segundo',
    },
    results: [
      'Adiciona um ruído rosa baixinho ao vídeo.',
    ],
    notes: ['Imagens viram um vídeo MP4 com o ruído; uma imagem estática passa a ter 10 segundos.'],
  },
  volume: {
    summary: 'Define o nível de volume.',
    args: {
      MEDIA_KEY: MEDIA,
      AMOUNT: 'nível de volume',
    },
  },
  waveform: {
    summary: 'Desenha a forma de onda do áudio como uma imagem.',
    args: {
      MEDIA_KEY: 'o áudio ou vídeo',
      COLOR: 'a cor da forma de onda',
      SPLIT: 'desenhar cada canal na própria linha',
    },
    notes: ['O resultado é uma imagem com fundo transparente.'],
  },
  audioputconcat: {
    summary: 'Adiciona o áudio de outra mídia depois do áudio desta mídia.',
    args: {
      MEDIA_KEY: MEDIA,
      MEDIA_KEY_2: 'a mídia cujo áudio é adicionado',
      ...PUT,
    },
  },
  audioputmix: {
    summary: 'Mixa o áudio de outra mídia por cima do áudio desta mídia.',
    args: {
      MEDIA_KEY: MEDIA,
      MEDIA_KEY_2: 'a mídia cujo áudio é mixado',
      ...PUT,
    },
  },
  audioputreplace: {
    summary: 'Substitui o áudio desta mídia pelo áudio de outra mídia.',
    args: {
      MEDIA_KEY: MEDIA,
      AUDIO_NAME: 'a chave de mídia cujo áudio é usado',
      ...PUT,
    },
  },
  audiochannelscombine: {
    summary: 'Mixa o áudio para mono.',
    args: ONLY_MEDIA,
    notes: [NO_AUDIO],
  },
  audiochannelsinvert: {
    summary: 'Troca os canais de áudio esquerdo e direito.',
    args: ONLY_MEDIA,
    notes: ['Áudio mono vira estéreo antes. ' + NO_AUDIO],
  },
};
