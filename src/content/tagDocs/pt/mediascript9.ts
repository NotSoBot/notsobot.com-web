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
      SEMITONES: 'um número para mudar o tom, ou vários separados por vírgulas (ou por espaços entre aspas) para mixar uma cópia em cada tom (`0` é o original). Um nome de acorde equivale às suas notas, e `@VOLUME` depois de um valor define o volume dessa cópia (de 0 a 4, como `7@0.5`)',
      NORMALIZE: 'abaixar a mixagem para que as cópias não somem até distorcer',
      ENGINE: '`bungee`, `rubberband`, `signalsmith`, `a17` ou `elastique`, o mudador de tom com que cada cópia é feita (os três primeiros são o `--backend` do programa multipitch)',
      FORMANTS: 'manter uma voz soando como a mesma pessoa em vez de um esquilo ou um gigante, só com `elastique` e `rubberband`',
    },
    results: [
      'Sobe o áudio uma quinta; o vídeo fica igual.',
      'Um acorde: o áudio original, uma quinta acima e uma oitava acima, mixados juntos.',
      'O mesmo acorde feito com rubberband, soando como `rubberband=pitch=` numa linha de `ffmpeg`.',
      'Abaixa o áudio 5 semitons com os cortes metálicos e zumbidos do A17.',
      'Um acorde de quatro vozes com élastique em que cada cópia ainda soa como a mesma pessoa.',
      'Um acorde maior (0, 4 e 7) mais uma oitava mais suave em cima.',
    ],
    notes: [
      'Usa o Bungee por padrão, o backend padrão do programa multipitch. ENGINE=rubberband e ENGINE=signalsmith equivalem ao `--backend rubberband` e ao `--backend signalsmith` dele. ENGINE=a17 é o antigo pitch shift "A17 Drums (minimum echo)": o som é cortado em pedaços de 25 ms que são acelerados ou desacelerados e unidos com fades curtos, então o ritmo fica firme e as notas longas ganham um zumbido metálico. ENGINE=elastique é o élastique Pro do Vegas, um pitch shift limpo que mantém as batidas da bateria nítidas. Todos os tons são feitos ao mesmo tempo.',
      'Nomes de acorde: `major`, `minor`, `power`, `octave`, `sus2`, `sus4`, `dim`, `aug`, `maj7`, `min7`, `dom7` (também `maj`, `min` e `octaves`). Cada nota conta para os 12 tons, e um tom repetido só é feito uma vez.',
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
      SYNTH: 'o som com que o acorde é tocado: `choir` (vozes suaves com vibrato), `robot` (uma onda quadrada), `saw` (brilhante e amplo), `pad` (lento e escuro), `organ` ou `power` (um lead grande e zumbidor no estilo do carrier Power do Vocodex)',
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
  audiosentencemix: {
    summary: 'Sentence mixing: faz a mídia dizer uma frase juntando as palavras ditas nela.',
    args: {
      MEDIA_KEY: 'a mídia com as palavras (o vídeo dela é cortado junto)',
      SENTENCE: 'o que ela deve dizer, todas as palavras que sobram depois dos outros argumentos',
      SKIP_MISSING: 'pular as palavras que não são ditas em vez de falhar',
      GAP: 'milissegundos de silêncio (e o último quadro) entre os pedaços, não é usado com `BPM`',
      BPM: 'encaixa cada palavra numa batida neste andamento (`0`: desligado)',
    },
    results: [
      'O clipe dizendo "I can do that", cortado das próprias palavras.',
      'O clipe dizendo "I want donuts", com "donuts" montado com sons das outras palavras dele.',
      'As mesmas palavras numa batida de 120 bpm, cada uma um pouco mais aguda e a última segurada por duas batidas.',
    ],
    notes: [
      'As palavras são encontradas com reconhecimento de fala. As ditas em sequência ficam num só pedaço, e uma palavra que não é dita é montada com duas ou três que são (`hotdog` com `hot` e `dog`), ou então com os sons delas (`notsobot` com `not so` e os sons de outras palavras). Sem `SKIP_MISSING` falha e lista as palavras que não encontrou.',
      'Uma palavra pode terminar com marcas: `word^3` sobe 3 semitons (`^-2` desce, até 24 para cada lado), `word*2` deixa ela com o dobro da duração sem mudar o tom (de `0.25` a `4`), e as duas vão juntas como `word^3*2`. Um `_` sozinho é uma pausa de um quarto de segundo (`_*2` o dobro). Uma palavra com marcas é cortada sozinha em vez de como parte de uma frase.',
      'Uma palavra pode ser escrita com os sons dela entre barras, separados por `-`: `/d-ow-n-ah-t-s/` é "donuts". Ela é montada com esses sons das palavras que são ditas, como uma palavra que não é dita, e também aceita marcas (`/d-ow-n-ah-t-s/^3`). Os sons são códigos ARPAbet (`aa` `ae` `ah` `ao` `aw` `ax` `ay` `b` `ch` `d` `dh` `eh` `er` `ey` `f` `g` `hh` `ih` `iy` `jh` `k` `l` `m` `n` `ng` `ow` `oy` `p` `r` `s` `sh` `t` `th` `uh` `uw` `v` `w` `y` `z` `zh`) ou símbolos do AFI.',
      'Com `BPM` cada palavra ocupa uma batida: ela é esticada ou acelerada para preencher (no máximo até o dobro da duração, o resto da batida é silêncio), `word*2` passa a significar duas batidas (de `0.125` a `16`) e `_` é uma pausa de uma batida. O que cai na batida é a vogal da palavra, as consoantes antes dela (o `tr` de `try`) tocam logo antes. O vídeo fica mais lento e mais rápido junto com as palavras.',
      'Só os primeiros 15 minutos são ouvidos. O resultado é um mp4, ou um mp3 sem vídeo, de no máximo 10 minutos. Conta para o limite de `ffmpeg`.',
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
  audiochorus: {
    summary: 'Adiciona um chorus como o VEGAS Chorus: cópias do som cantando junto um pouco fora de tempo.',
    args: {
      MEDIA_KEY: MEDIA,
      VOICES: 'quantas cópias cantam junto, uma sim, uma não invertida',
      DELAY: 'quanto as cópias atrasam, em milissegundos',
      RATE: 'oscilações por segundo',
      DEPTH: 'quanto as cópias oscilam, em porcentagem do atraso (100 oscila tanto quanto o atraso)',
      MIX: 'quanto das cópias é usado, o resto é o original',
    },
    results: [
      'Uma só cópia oscilando rápido e nada do original: uma voz trêmula e enjoada.',
    ],
    notes: [NO_AUDIO],
  },
  audiodistortion: {
    summary: 'Distorce o áudio como o VEGAS ExpressFX Distortion: aumentado e cortado no talo.',
    args: {
      MEDIA_KEY: MEDIA,
      DRIVE: 'quanto o áudio é empurrado para a saturação; 100 aumenta 40 dB',
      MIX: 'quanto do áudio distorcido é usado, o resto é o original',
      LOWPASS: 'corta o som acima de tantos Hz depois, 0 para desligado',
    },
    results: [
      'Áudio totalmente saturado sem o chiado agudo, como um alto-falante estourado.',
    ],
    notes: [NO_AUDIO],
  },
  audiogapper: {
    summary: 'Gapper/Snipper: coloca lacunas de silêncio no áudio, ou corta pedaços dele.',
    args: {
      MEDIA_KEY: MEDIA,
      FREQUENCY: 'lacunas por segundo',
      LENGTH: 'quanto dura cada lacuna, em milissegundos',
      SNIP: 'cortar esse tanto de áudio em vez de colocar silêncio',
    },
    results: [
      'Uma voz picotada, 40% mais curta.',
    ],
    notes: [
      'Lacunas deixam o áudio mais longo e cortes o deixam mais curto; um vídeo é desacelerado ou acelerado para continuar sincronizado.',
      'Uma lacuna dura no máximo 3 vezes o tempo entre lacunas, e um corte no máximo 95% dele.',
      NO_AUDIO,
    ],
  },
  audiowahwah: {
    summary: 'Adiciona um wah-wah: uma faixa do som mais alta, varrendo para cima e para baixo.',
    args: {
      MEDIA_KEY: MEDIA,
      RATE: 'varreduras por segundo',
      DEPTH: 'quão larga é a varredura; começa em 350 Hz e 100 sobe 4 oitavas',
    },
    notes: [NO_AUDIO],
  },
  vocodermelody: {
    summary: 'Faz a voz da sua mídia cantar uma melodia: notas uma após a outra, em loop até o fim da voz.',
    args: {
      MEDIA_KEY: WITH_VOICE,
      NOTES: 'passos separados por vírgulas: uma nota (`C4`, `F#3`), um acorde unido com `+` (`C4+E4+G4`) ou `r` para uma pausa. Cada um dura uma batida, a não ser que termine em `:BATIDAS` (`G4:2`, `r:0.5`). No máximo 1024 passos',
      BPM: 'batidas por minuto',
      SYNTH: 'o som com que a melodia é tocada, como no `vocoderchord`',
      BANDS: BANDS,
    },
    results: [
      'A voz cantando um arpejo que sobe e desce de volta.',
      'Dois acordes grandes e zumbidores, de quatro batidas cada.',
    ],
    notes: [
      'Fora das tags, `.vocodermelody` e `/media-av-pitch vocoder-melody` também aceitam um arquivo MIDI (.mid) no lugar das notas: todas as faixas menos a bateria, as 8 notas mais agudas por vez.',
      'O resultado é mono. Conta para o limite de `ffmpeg`.',
    ],
  },
  audioautotune: {
    summary: 'Aplica autotune a uma voz: cada nota é puxada para a nota mais próxima de um tom e o ritmo não muda.',
    args: {
      MEDIA_KEY: MEDIA,
      KEY: 'o tom: uma nota com `#` ou `b` para maior (`C`, `F#`), adicione `m` ou `minor` para menor (`Am`, `Bb minor`), ou `chromatic` para todas as notas',
      STRENGTH: 'quanto cada nota é puxada; 1 afina por completo para o som robótico',
    },
    results: [
      'A voz afinada em lá menor.',
    ],
    notes: [
      'Feito para uma voz só. Acordes e música por baixo saem trêmulos, e sons sem tom (s, t, respirações) ficam como estão.',
      NO_AUDIO,
    ],
  },
  audiopingpong: {
    summary: 'Corta o áudio em pedaços que tocam para frente e depois ao contrário.',
    args: {
      MEDIA_KEY: MEDIA,
      LENGTH: 'quanto dura cada pedaço, em milissegundos',
      KEEP_LENGTH: 'tocar ao contrário um pedaço sim, um não, assim a duração não muda',
    },
    results: [
      'Uma voz gaguejando para frente e para trás, com o dobro da duração.',
    ],
    notes: [
      'Sem `KEEP_LENGTH` o áudio fica com o dobro da duração e um vídeo é desacelerado para acompanhar. `seesaw` toca a mídia inteira para frente e depois ao contrário uma vez.',
      NO_AUDIO,
    ],
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
