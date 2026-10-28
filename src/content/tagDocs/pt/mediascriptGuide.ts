// The MediaScript guide (MEDIASCRIPT_GUIDE in tagDocs/mediascript.ts) in Brazilian Portuguese, keyed by section id.
// Table cells left '' keep the English one (syntax, codes, Vegas and Movie Maker effect names).

import { MEDIASCRIPT_GUIDE } from '../mediascript';
import type { TagDocsTranslation } from '../localize';


// the TTS voice descriptions are all built from the same few words, so they're translated by phrase
// (a voice added in English then comes out translated too, as long as it uses the same words)
const VOICE_PHRASES: Array<[RegExp, string]> = [
  [/^Formant synthesizer you can steer with ARPABET phonemes, pitch and voice controls\. See the Klattsch section\.$/, 'Sintetizador de formantes que você pode controlar com fonemas ARPABET, tom e controles de voz. Veja a seção do Klattsch.'],
  [/\. The default voice\.$/, '. A voz padrão.'],
  [/^Character: /, 'Personagem: '],
  [/^Classic SAPI: /, 'SAPI clássico: '],
  [/\bcreator: /, 'criador: '],
  [/\bEnglish \(US\)/, 'inglês (EUA)'],
  [/\bEnglish \(UK\)/, 'inglês (Reino Unido)'],
  [/\bEnglish \(Australia\)/, 'inglês (Austrália)'],
  [/\bEnglish\b/, 'inglês'],
  [/\bPortuguese \(Brazil\)/, 'português (Brasil)'],
  [/\bSpanish \(Mexico\)/, 'espanhol (México)'],
  [/\bSpanish \(Latin America\)/, 'espanhol (América Latina)'],
  [/\bSpanish\b/, 'espanhol'],
  [/\bGerman\b/, 'alemão'],
  [/\bFrench\b/, 'francês'],
  [/\bIndonesian\b/, 'indonésio'],
  [/\bJapanese\b/, 'japonês'],
  [/\bKorean\b/, 'coreano'],
  [/\bfemale, emotional\b/, 'feminina, emotiva'],
  [/\bfemale, beauty guru\b/, 'feminina, guru de beleza'],
  [/\bfemale, rich girl\b/, 'feminina, patricinha'],
  [/\bfemale, empathetic\b/, 'feminina, empática'],
  [/\bmale, serious\b/, 'masculina, séria'],
  [/\bmale, funny\b/, 'masculina, engraçada'],
  [/\bmale, the Grinch\b/, 'masculina, o Grinch'],
  [/\bmale, story narrator\b/, 'masculina, narrador de histórias'],
  [/\bmale, butler\b/, 'masculina, mordomo'],
  [/\bmale, neighbor\b/, 'masculina, vizinho'],
  [/\bsinging\b/, 'cantando'],
  [/\bfemale\b/, 'feminina'],
  [/\bmale\b/, 'masculina'],
  [/^Personagem: Pirate$/, 'Personagem: Pirata'],
];

function translateVoice(description: string): string {
  let text = description;
  for (const [pattern, replacement] of VOICE_PHRASES) {
    text = text.replace(pattern, replacement);
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const TTS_ROWS = (MEDIASCRIPT_GUIDE.find((section) => section.id === 'ms-tts')?.table?.rows ?? [])
  .map(([, description]) => ['', (description) ? translateVoice(description) : '']);


export const MEDIASCRIPT_GUIDE_PORTUGUESE: TagDocsTranslation['mediaScriptGuide'] = {
  'ms-overview': {
    title: 'O que é o MediaScript?',
    body: [
      'O MediaScript é uma pequena linguagem de script para editar imagens, GIFs, áudio e vídeo dentro de uma tag. Você o escreve dentro de uma de três funções de TagScript, e o NotSoBot o executa nos servidores de mídia dele e te devolve o arquivo pronto.',
      '`{mediascript:CODE}` (também `{mscript}`, `{imagescript}`, `{iscript}`) anexa o resultado à resposta da tag. Conta para os 10 anexos da resposta e só funciona onde a tag pode anexar arquivos.',
      '`{mediascripturl:CODE}` (também `{mscripturl}`, `{imagescripturl}`, `{iscripturl}`) faz upload do resultado e coloca o link no texto da tag. O link expira em 7 dias. Use quando quiser passar o resultado para outra coisa, como `{attach:}` ou a imagem de um embed.',
      '`{mediascriptmaybeurl:CODE}` (também `{mscriptmaybeurl}`, `{imagescriptmaybeurl}`, `{iscriptmaybeurl}`) anexa o resultado quando pode, e te dá um link quando precisa fazer upload (por exemplo quando é grande demais para anexar).',
      'Cada chamada de MediaScript conta como uma requisição de rede para o limite de 15 da tag. Um script pode ter no máximo 300 linhas não vazias, e toda a mídia que ele guarda ao mesmo tempo precisa ficar abaixo de 300 MB.',
      'As regras de uma vez só: um comando por linha; a primeira palavra é o comando e o resto são os argumentos, separados por espaços; linhas que começam com `#` são comentários; qualquer texto que possa ter espaços, quebras de linha ou caracteres especiais deve ir envolto em `{jsonify:...}`.',
    ].join('\n\n'),
    results: [
      'Anexa uma cópia invertida da imagem ou vídeo mais recente.',
      'Faz upload de um avatar com deepfry e o mostra dentro de um embed.',
    ],
  },

  'ms-media-keys': {
    title: 'Chaves de mídia, carregar e renderizar',
    body: [
      'Cada mídia de um script fica sob um nome escolhido por você, chamado chave de mídia (media key), como `img`, `pfp` ou `background`. `load URL KEY` baixa uma imagem, GIF, arquivo de áudio ou vídeo para essa chave. Depois, a maioria dos comandos recebe a chave como primeiro argumento e altera essa mídia diretamente. Comandos que criam mídia nova (`create`, `tti`, `tts`, `imagine`, `qrcode`, `clone` e afins) a guardam sob a chave que você der.',
      'Use só letras simples (e dígitos) nas chaves. Cada chave ganha automaticamente variáveis de tamanho com o nome dela (veja Variáveis), então uma chave chamada `img` te dá `imgw`, `imgh`, `imgd` e `imgfc`.',
      'A URL do `load` costuma ser uma função de TagScript como `{iv}`, `{image}`, `{video}`, `{audio}` ou `{avatar}`, mas qualquer link direto de mídia funciona. Adicione `true` como terceiro argumento (`AUDIO_PRIORITY`) para preferir o áudio quando o link tiver os dois.',
      'Você também pode carregar arquivos que a tag já anexou, como o resultado de um `{mediascript}` anterior, uma execução de `{python}` ou `{attach:}`. `FILE_1` é o primeiro anexo da tag até ali, `FILE_2` o segundo, e assim por diante. `FILE_X` pega o arquivo e o remove dos anexos da resposta; `FILE_X_COPY` usa o arquivo e também o mantém anexado. O TagScript substitui cada `FILE_X` do seu código antes de ele rodar, então evite escrever essa palavra em legendas.',
      '`render KEY MIMETYPE` encerra o script e envia `KEY` como resultado. Tudo depois do `render` é ignorado. O mimetype é opcional: omita (ou escreva `default`) para manter o formato atual da mídia, ou escolha um da tabela para convertê-la. Você também pode adicionar um nome de arquivo depois do mimetype. Se um script nunca chamar `render`, a primeira chave de mídia que ele criou é renderizada automaticamente no próprio formato.',
    ].join('\n\n'),
    table: {
      columns: ['Tipo', 'Mimetypes para os quais você pode renderizar'],
      rows: [
        ['Áudio', ''],
        ['Imagem', ''],
        ['Vídeo', ''],
      ],
    },
    results: [
      'Pega o avatar anexado (removendo-o da resposta) e envia um PNG invertido no lugar.',
      'Transforma o último vídeo do chat num GIF.',
    ],
  },

  'ms-arguments': {
    title: 'Argumentos e equações',
    body: [
      'Os argumentos são lidos na ordem em que o comando os lista, separados por espaços. Nesta referência, `NAME=value` significa que o argumento é opcional e que `value` é usado se você o omitir, `NAME?` significa opcional sem um padrão fixo, e `...NAME` significa "o resto da linha".',
      'Você também pode definir um argumento pelo nome com `NAME=value`, usando os nomes desta referência. Os nomes ignoram maiúsculas e sublinhados, então `SAMPLE_RATE=`, `sample_rate=` e `samplerate=` são a mesma coisa. Argumentos sem nome preenchem, em ordem, os que você não nomeou. Por exemplo, para desativar o corte em círculo do `spin` você pode escrever `spin img circle=false` em vez de `spin img true false`. Um argumento com um nome que o comando não tem é um erro, e `NAME=` sozinho mantém o padrão.',
      'O texto que ocupa o resto da linha mantém qualquer `word=value` como texto normal, a não ser que a palavra seja o nome de um dos argumentos anteriores do comando. Envolva o texto em `{jsonify:}` (ou `text="..."`) para garantir. Uma string JSON entre aspas como `"two words"` é sempre lida como um argumento só.',
      'O que o usuário digita, como `{args}`, é colado antes de o script rodar, então `magik img {args}` deixa o usuário definir qualquer argumento do comando (`2 scale=10` define tanto ITERATIONS quanto SCALE), embora cada um ainda precise estar dentro do intervalo. Para limitar a um argumento, envolva em `{jsonify:}` e dê o nome: `magik img iterations={jsonify:{args}}`. Assim o que for digitado sempre fica como um único valor para esse argumento e nunca consegue definir outro.',
      'Argumentos de sim/não aceitam `true`, `yes`, `y`, `+`, `1` ou o próprio nome do argumento (como `join a b vertical`) para sim. Qualquer outra coisa conta como não.',
      'Qualquer número também pode ser uma equação, e as equações podem usar variáveis e funções. As equações não podem ter espaços, já que um espaço começa o próximo argumento: escreva `(imgw/2)-(textw/2)`, não `(imgw / 2) - (textw / 2)`.',
      'As equações aceitam `+`, `-`, `*`, `/`, parênteses e números decimais. O motor também entende `%` (resto) e `^` (potência).',
    ].join('\n\n'),
    table: {
      columns: ['Operador', 'Significado'],
      rows: [
        ['', 'Somar, subtrair'],
        ['', 'Multiplicar, dividir'],
        ['', 'Agrupar partes de uma equação'],
        ['', 'Resto, ex.: `idx%7`'],
        ['', 'Potência, ex.: `2^3` é 8'],
      ],
    },
    results: [
      'Corta a metade central da imagem.',
      'Gira o avatar sem cortá-lo em círculo, sem precisar preencher CLOCKWISE antes.',
      'Aplica magik na imagem quantas vezes o usuário disser. O que for digitado só consegue definir ITERATIONS.',
    ],
  },

  'ms-variables': {
    title: 'Variáveis',
    body: [
      'Cada chave de mídia ganha quatro variáveis automáticas, com o nome da chave seguido de uma letra (sem sublinhado): `KEYw`, `KEYh`, `KEYd` e `KEYfc`. Elas são atualizadas sempre que a mídia muda.',
      '`set NAME VALUE` guarda um número (VALUE pode ser uma equação) e `get KEY PROPERTY NAME` copia uma propriedade de uma chave de mídia para uma variável. Depois, as duas podem ser usadas em qualquer equação seguinte. Os nomes de variável só podem usar letras, dígitos e sublinhados.',
      'Para devolver números ao TagScript, use `export NAME` (ou `export NAME ALIAS` para renomear) e `exportmultiple NAME1 NAME2 ...`. Quando o script termina, cada variável exportada é salva com o `{set:}` do TagScript, então você a lê depois com `{get:NAME}`. Valores exportados são sempre números. As exportações só voltam quando o script termina com sucesso.',
      'Dentro de um bloco `foreachframe` ou `dobetween`, a variável `idx` guarda o número do quadro atual e `time` quando esse quadro começa, em segundos (só no foreachframe), e as variáveis que você definir dentro do bloco são descartadas quando ele termina.',
    ].join('\n\n'),
    table: {
      columns: ['Variável', 'Significado', 'Exemplo para a chave `img`'],
      rows: [
        ['', 'Largura em pixels', ''],
        ['', 'Altura em pixels', ''],
        ['', 'Duração em segundos', ''],
        ['', 'Número de quadros', ''],
        ['', 'Número do quadro atual dentro do `foreachframe`', ''],
        ['', 'Quando o quadro atual começa, em segundos, dentro do `foreachframe`', ''],
      ],
    },
    results: [
      'Anexa a imagem e mostra a largura, a área e o número de quadros dela.',
    ],
  },

  'ms-functions': {
    title: 'Funções',
    body: [
      'As funções podem ser usadas em qualquer lugar onde uma equação é permitida. Como o resto de uma equação, elas não podem ter espaços.',
      'Dentro do MediaScript, prefira `rand()` ao `{range:}` do TagScript: `rand()` é sorteado de novo toda vez que a linha roda, então dentro de um `foreachframe` cada quadro ganha o próprio número aleatório, enquanto `{range:}` é substituído uma vez só, antes mesmo de o script começar.',
    ].join('\n\n'),
    table: {
      columns: ['Função', 'O que retorna', 'Exemplo'],
      rows: [
        ['', 'Valor absoluto, cosseno, seno, tangente (em radianos)', ''],
        ['', 'O maior número', ''],
        ['', 'O menor número', ''],
        ['', 'Um número aleatório entre a e b (com um número só, entre 0 e ele)', ''],
        ['', 'n arredondado, opcionalmente para um número de casas decimais', ''],
        ['', 'if_true quando a condição é verdadeira, senão if_false. Operadores: `==`, `!=`, `<=`, `>=`, `<`, `>`', ''],
        ['', '1 se a mídia for desse tipo, 0 se não. TYPE é `audio`, `image`, `video` ou uma combinação: `av` (áudio ou vídeo), `iv` (imagem ou vídeo), `aiv` (qualquer um deles)', ''],
        ['', 'A cor mais usada na mídia, como número RGB decimal', ''],
      ],
    },
  },

  'ms-colors': {
    title: 'Cores',
    body: [
      'Comandos que recebem uma cor aceitam um nome de cor do FFmpeg (como `white`, `red` ou `skyblue`), um valor RGBA como `rgba(255,0,0,128)` ou `255,0,0`, ou um código hexadecimal como `#ff0000`. Nunca coloque espaços dentro de uma cor.',
      'A maioria dos comandos de efeito (como `chromakey`, `overlay`, `fadein` ou `rotate`) também aceita `mostused`, que significa a cor mais usada na própria mídia. Comandos de desenho como `tti` e `createpolygonfill` usam preto para `mostused`.',
      'Os números dentro de `rgba(...)` também podem ser equações, ex.: `rgba(255,rand(0,255),0,255)`.',
    ].join('\n\n'),
    results: [
      'Remove a cor mais comum da imagem (muitas vezes o fundo).',
    ],
  },

  'ms-loops': {
    title: 'Loops e condições',
    body: [
      'Quatro comandos executam outro código de MediaScript: `foreachframe` executa código uma vez por quadro, `dobetween` executa código num trecho de tempo, `if` executa código só quando uma comparação é verdadeira, e `reexport` executa código várias vezes sobre o próprio resultado (veja Efeitos de logo). O código vai no fim da linha.',
      'Como cada linha é um comando, código com mais de uma linha precisa ser codificado em JSON para caber numa linha só. O jeito fácil é `{jsonify:...}`: coloque os comandos de dentro, cada um na sua linha, dentro dele. Um único comando curto pode ser escrito direto, como `if rand(0,1) <= 0.5 flip img`.',
      'Dentro de `foreachframe KEY START END CODE`, o quadro atual fica disponível como uma chave de mídia própria chamada `KEYx` (então para `pfp` é `pfpx`), `idx` é o número do quadro e `time` é quando ele começa, em segundos (os atrasos próprios de cada quadro de um GIF contam, então GIFs irregulares também funcionam). START é incluído e END não, então `0 pfpfc` cobre todos os quadros. Os comandos de dentro precisam manter o quadro como uma única imagem estática, então evite dentro do loop comandos que transformam imagens em GIFs (como `spin` ou `shake`).',
      '`dobetween KEY START END CODE` funciona do mesmo jeito, mas num intervalo de tempo em segundos: o trecho fica disponível como `KEYx`, e depois que o código roda ele é encaixado de volta entre as partes que não foram mexidas.',
      '`if LEFT OPERATOR RIGHT CODE` compara duas equações. Ao contrário da função `if()`, os dois lados e o operador precisam estar separados por espaços: `if imgw > 500 ...`.',
      'Chaves de mídia e variáveis criadas dentro de um loop desaparecem quando ele termina; mudanças em chaves que já existiam são mantidas. Não dá para usar `render` de dentro de um loop.',
      'Dentro de `foreachframe`, `dobetween` e `reexport`, a própria chave pai é proibida: usar `pfp` dentro de `foreachframe pfp ...` é um erro, só `pfpx` funciona. As variáveis de tamanho dela (`pfpw`, `pfpd`...) ainda podem ser lidas.',
    ].join('\n\n'),
    results: [
      'Cria um GIF do avatar com pelo menos 10 quadros que passa por todas as cores.',
      'Inverte e espelha cada quadro aleatoriamente.',
    ],
  },

  'ms-tts': {
    title: 'Vozes de texto para fala',
    body: [
      '`tts KEY VOICE TEXT` transforma texto num clipe de áudio guardado em KEY. A voz é opcional; sem ela você recebe `TIKTOK_EN_US_FEMALE_01`. Envolva o texto em `{jsonify:}`. Texto com mais de 4096 caracteres é cortado.',
      'Combine com `audioputreplace`, `audioputmix` ou `audioputconcat` para colocar a fala num vídeo, ou renderize sozinho como áudio.',
    ].join('\n\n'),
    table: {
      columns: ['Voz', 'Descrição'],
      rows: TTS_ROWS,
    },
    results: [
      'Lê em voz alta os argumentos da tag com a voz do Microsoft Sam.',
    ],
  },

  'ms-klattsch': {
    title: 'Sintaxe de fonemas do Klattsch',
    body: [
      'A voz `KLATTSCH` é um sintetizador de voz que você pode controlar na mão. O texto pode ser palavras normais em inglês, fonemas ARPABET (como `HH AH L OW`), kana japonês ou qualquer mistura deles, como `AY+8 M really S AO+10 R IY`. Palavras e kana são convertidos em fonemas para você (com entonação para o inglês); fonemas e controles que você escrever são mantidos como estão. Kanji não pode ser lido, então escreva o japonês em kana.',
      'Sufixos num fonema mudam o tom ou a tônica: `PH!` dá ênfase (uma subida curta e um som mais longo), `PH+N` / `PH-N` desliza o tom N Hz para cima ou para baixo e mantém o novo tom para o que vem depois, e `PH(+N)` / `PH(-N)` é um enfeite pontual em que o tom volta depois. Envolva fonemas em `( P P P )` (com espaços em volta dos parênteses) para encaixá-los numa só sílaba, o que é útil para ditongos e sílabas átonas rápidas.',
      'Pausas: `,` é 100 ms, `;` é 200 ms, `.` é 300 ms e `pN` é exatamente N ms. Pausas e parênteses precisam de espaços em volta (`D ,`, não `D,`).',
      'Tokens de estado mudam a voz a partir daquele ponto. Cada um é uma letra: `xN` ou `x=N` define, `x+N` / `x-N` ajusta um pouco, e um `x` sozinho volta ao padrão. O padrão é uma voz masculina a 120 Hz, falando 110 ms por fonema.',
      '`[voice=N]` começa outra voz que toca ao mesmo tempo que as anteriores, recomeçando dos padrões. Use para acordes, harmonias e cânones, como `r600 bC3 AA [voice=1] r600 bE3 AA [voice=2] r600 bG3 AA` para um acorde de dó maior.',
      'Regras de tom: `!` e `(+N)` só afetam um fonema, `+N` / `-N` ficam, `bN` pula para um tom absoluto, e um `b` sozinho volta ao tom em que a linha começou. Por exemplo, `AY+20 D IH+10 D` deixa o último D em +30, enquanto `AY(+20) D IH(+10) D` deixa todos os D no tom base.',
      'Dicas de estilo: afirmações terminam com a última vogal tônica caindo de 5 a 15 Hz; perguntas de sim/não terminam subindo de 15 a 30 Hz; empolgação usa uma faixa maior com `g+0.2 r-20`; tristeza usa `r+30 h+0.2 t-0.2 v2`; um sussurro é `h0.7 g0.2 t-0.3`; uma voz feminina é `s1.17 b220` e a de uma criança `s1.3 b260`; para cantar use nomes de notas (`bC4`), vibrato (`vN`, `wN`) e uma velocidade mais lenta. Use `!` no máximo uma ou duas vezes por frase, prefira enfeites `(+N)` para acentos pequenos, e não repita os padrões (a voz base é masculina).',
    ].join('\n\n'),
    table: {
      columns: ['Token', 'Controla', 'Exemplo'],
      rows: [
        ['', 'Tom base em Hz (padrão 120), ou um nome de nota. Um `b` sozinho volta ao tom inicial', ''],
        ['', 'Velocidade em ms por fonema (padrão 110; maior é mais lento)', ''],
        ['', 'Escala de formantes: 1.0 masculina, 1.17 feminina, 1.3 criança', ''],
        ['', 'Profundidade do vibrato em Hz (0 desativa)', ''],
        ['', 'Velocidade do vibrato em Hz (padrão 5)', ''],
        ['', 'Profundidade do tremolo, 0..1', ''],
        ['', 'Velocidade do tremolo em Hz (padrão 5)', ''],
        ['', 'Soprosidade, 0..1', ''],
        ['', 'Inclinação espectral, de -0.9 (escuro) a +0.9 (brilhante)', ''],
        ['', 'Esforço vocal, de 0 (relaxado) a 1 (tenso), padrão 0.5', ''],
        ['', 'Pausa de exatamente N ms', ''],
        ['', 'Outra voz tocando ao mesmo tempo, a partir dos padrões', ''],
      ],
    },
    results: [
      '"Hello world" com uma pequena subida em "world".',
      '"Hello world" com voz feminina, escrito como inglês normal.',
      '"I\'m sorry Dave" com o tom ajustado na mão.',
      'O começo de "Happy Birthday", uma nota por sílaba.',
      '"Konnichiwa, sekai" com as vogais japonesas.',
    ],
  },

  'ms-logo-effects': {
    title: 'Efeitos de logo (Preview 2, Preview 1280, G Major, IHTX)',
    body: [
      'Se você faz efeitos de logo, três comandos foram feitos para você: `ffmpeg` executa filtros e codecs do FFmpeg numa chave de mídia, `reexport` (também `ihtx`) reexporta um clipe várias vezes e junta as exportações, e `loadcube` carrega LUTs de cor `.cube` para o `applylut` (ou para o `lut3d` do FFmpeg). Eles substituem a maior parte do que as tags de efeito com `{sh:}` fazem, sem o shell e sem `.t sync+` depois.',
      '`ffmpeg KEY ...OPTIONS` recebe as próprias opções de saída do FFmpeg: `-vf`, `-af`, `-filter_complex`, `-map`, `-c:v`, `-c:a`, `-crf`, `-qp`, `-preset` e mais. KEY é a entrada `0`, e `-i OTHERKEY` adiciona outra chave de mídia como entrada `1`, `2`... (até 4). O resultado mantém o formato de KEY e volta para KEY. A maioria dos filtros do FFmpeg funciona, incluindo `geq`, `displace`, `haldclut`, `curves`, `rubberband` e `frei0r` (com os plugins embutidos como `mirr0r` e `gateweave`). Filtros que leem ou escrevem arquivos por conta própria, como `movie`, `amovie` e `sendcmd`, são bloqueados, então carregue os arquivos com `load` ou `loadcube` e passe-os como entrada.',
      '`reexport KEY AMOUNT LENGTH CODE` pega os primeiros LENGTH segundos, executa CODE neles como `KEYx`, depois executa CODE de novo sobre esse resultado, AMOUNT vezes, e junta todas as exportações em ordem (de trás para frente se AMOUNT for negativo). Exportações que saem mais longas que LENGTH são cortadas, a não ser que você adicione `NO_TRIM=true`. O áudio de cada exportação é ajustado ao vídeo dela antes de juntar, então o resultado continua sincronizado. `idx` é o número da exportação, para comandos que recebem equações.',
      'Mudar o tom é `multipitch KEY SEMITONES`: `multipitch clip 7` sobe uma quinta, e `multipitch clip 0,7,12` mixa um acorde do mesmo jeito que o programa multipitch (com `--no-normalize`). Quando o tom precisa fazer parte de um único grafo de filtros do `ffmpeg`, por exemplo encadeado com outros filtros de áudio, use ali `rubberband=pitch=2^(SEMITONES/12)`, e para um acorde divida o áudio com `asplit`, mude o tom de cada cópia e mixe de volta com `amix=N:normalize=0` (veja os exemplos). Uma mudança de matiz é `hue=h=DEGREES`. O `-modulate 100,100,X` do ImageMagick gira o matiz em cerca de `(X-100)*1.8` graus; se as cores saírem espelhadas, inverta o sinal.',
      'Programas baixados (4orm) e comandos de shell não podem rodar no MediaScript; projetos `.veg` são reproduzidos com `loadveg` e `vegrender`, e projetos `.wlmp` do Movie Maker com `loadwlmp` e `wlmprender`. A tabela mostra o que usar no lugar. Limites: até 100 execuções de `ffmpeg` por script, cada saída com no máximo 10 minutos e 2048x2048, e cada `ffmpeg` dentro de `reexport` conta uma vez por exportação.',
    ].join('\n\n'),
    table: {
      columns: ['Numa tag com {sh:}', 'No MediaScript'],
      rows: [
        ['', '`hue=h=DEGREES`, ou monte a CLUT no grafo: `haldclutsrc=4,hue=h=54[h];[0:v][h]haldclut`'],
        ['', ''],
        ['', '`multipitch KEY 7 engine=signalsmith` (ou `engine=rubberband`)'],
        ['`wine autotune.exe -b 75 voice.wav music.wav out.wav` (o vocoder "autotune")', '`load URL song`, e depois `vocoder KEY song 75`'],
        ['O simulador de TV (`movie=$(curl .../Project%20Name%209.mp4)` + `displace`)', ''],
        ['`movie=$(curl ...)` ou um segundo vídeo baixado', '`load URL other`, e depois `ffmpeg KEY -i other -filter_complex "[0:v][1:v]..."`'],
        ['', '`loadcube URL x`, e depois `applylut KEY x` (ou `lut3d=x.cube` dentro do `ffmpeg`)'],
        ['um loop de exportações + concat + `.t sync+`', ''],
        ['', ''],
        ['um renderizador de `.veg` (`tvdoubled`/tved) com `--all-media`', '`loadveg URL p`, e depois `vegrender MEDIA_KEY p`'],
        ['4orm e outros programas baixados', 'Não suportado'],
      ],
    },
    results: [
      'Um passo de matiz + tom: as cores giram 45 graus e o áudio sobe um semitom.',
      'Estilo IHTX: 20 exportações dos primeiros 0,46 segundos, cada uma invertida, com o matiz alterado e o tom aumentado em relação à anterior.',
      'O acorde de 5 tons das tags de Preview 1280, feito direto com `multipitch`.',
      'O mesmo tipo de acorde dentro de um único grafo de filtros do `ffmpeg`, aqui com um eco encadeado depois. Use quando o acorde precisar ficar entre outros filtros; senão, `multipitch` é mais rápido e mais parecido com as tags de efeito.',
      'O visual de espelho rolando dos efeitos de Preview 1280, com o áudio 2 semitons abaixo.',
      'Faz a correção de cor do clipe com uma LUT .cube em tons de azul-petróleo e laranja, com o áudio 2 semitons abaixo.',
      'Uma tremida de TV a partir de um vídeo de deslocamento, carregado como uma chave de mídia própria em vez de `movie=$(curl ...)`. Para o visual normal do simulador de TV, `tvsimulator clip` faz isso com um mapa embutido. O resultado tem a duração do clipe; um vídeo de deslocamento mais curto fica parado no último quadro.',
      '10 exportações que mudam o matiz e adicionam compressão JPEG cada uma, juntadas da última até a primeira.',
    ],
  },

  'ms-vegas': {
    title: 'Projetos do Vegas (.veg)',
    body: [
      '`loadveg URL VEG_KEY` lê um projeto do Vegas Pro, e `vegrender MEDIA_KEY VEG_KEY` o reproduz com cada vídeo e som dele substituído pela sua mídia, do jeito que os renderizadores de `.veg` das tags de efeito fazem (tved com `--all-media`). O projeto é reconstruído a partir do que o Vegas salvou no `.veg`: a linha do tempo, fades, Pan/Crop e track motion, a mídia gerada e os efeitos de vídeo e áudio da tabela (em eventos, em faixas inteiras e na saída de vídeo do projeto). O Vegas em si nunca roda: os efeitos são redesenhados com ffmpeg, então ficam parecidos com o Vegas, mas não exatamente iguais, e efeitos que não estão na tabela são pulados sem aviso. Confira a tabela antes de montar uma tag em volta de um projeto. Projetos de versões antigas do Vegas (como os collabs de YTP de 2012-2013) também são lidos.',
      'Quais clipes recebem sua mídia: um evento de vídeo cujo arquivo de origem era um vídeo (mp4, mov, mkv, avi, wmv, m4v, mpg, mpeg, mts, m2ts, webm, 3gp, ts ou flv), e um evento de áudio cuja origem era um vídeo ou um som (wav, mp3, m4a, aac, flac, ogg, wma ou opus). Os nomes de arquivo vêm dos caminhos salvos no projeto, em qualquer idioma. Eventos em imagens estáticas (png, jpg, bmp, gif) mostram sua mídia parada no primeiro quadro. Com uma imagem como mídia, todo evento de vídeo a mostra e não há som; com um arquivo de áudio, só os eventos de áudio tocam (mídia gerada, como cores sólidas, texto e ruído, continua aparecendo).',
      'Cada evento toca a partir do mesmo ponto da sua mídia de onde tocava na própria origem, e sua mídia entra em loop quando o projeto passa do fim dela. Com `CUTOFF=true` (o padrão), um evento que começa numa faixa encerra o anterior dessa faixa, como o Vegas faz (exceto sob um crossfade, onde os dois tocam); `CUTOFF=false` deixa que se sobreponham.',
      'Limites: projetos de até 32mb (e dentro do limite de download do script, que costuma ser menor), 4 por script, 20000 eventos e 512 faixas. O render tem no máximo 10 minutos (projetos longos costumam bater antes no limite de tempo do script) e é reduzido para caber em 1280x720, mostra no máximo 32 clipes ao mesmo tempo (e toca 32 sons ao mesmo tempo), e tem no máximo 1024 clipes em qualquer meio segundo. Conta como uma execução de `ffmpeg`, compartilha o limite de tempo dela e para assim que é certo que o arquivo ficará grande demais para enviar.',
    ].join('\n\n'),
    table: {
      columns: ['Recurso do Vegas', 'Reproduzido', 'Como'],
      rows: [
        ['Eventos', 'Sim', 'Posição, duração e em que ponto da origem cada um começa'],
        ['Velocidade', 'Sim', 'De 0.01x a 100x'],
        ['Tom', 'Sim', 'Mudanças de tom em eventos de áudio, mantendo a duração: o tom do próprio evento e o plugin Pitch Shift dele (em qualquer idioma ou marca) se somam. Alterado como o Vegas faz (ajustado a um render do Vegas de -24 a +24 semitons, incluindo um evento com tom começando um pouco antes ao subir e um pouco depois ao descer)'],
        ['', 'Sim', 'Zoom, movimento, rotação e espelhamentos, passando por cada keyframe com a curva dele (linear, fast, slow, smooth, sharp ou hold)'],
        ['Track motion', 'Sim', 'Posição, tamanho, espelhamentos e giros, em 2D e 3D, passando por cada keyframe (inclinações e profundidade 3D vistas em perspectiva, ajustadas a um render do Vegas), e o 2D Shadow e 2D Glow dele (deslocamento, tamanho, cor e desfoque; não ajustados a um render do Vegas)'],
        ['Mute e solo', 'Sim', 'Faixas mudas ficam de fora, e uma faixa em solo deixa de fora as outras do mesmo tipo (áudio ou vídeo)'],
        ['', 'Sim', 'A cor e a transparência dele'],
        ['', 'Em parte', '(Legacy) Text com tamanho, fonte (negrito e itálico também; fontes que o bot não tem viram a mais parecida, inclinada quando não há itálico), alinhamento, cor, fundo, contorno, sombra (deslocamento, cor e desfoque), posição, escala, espaçamento entre linhas e as deformações de arco, onda, inclinação e cisalhamento (as animadas também tocam). Texto com keyframes se move e muda entre eles, e keyframes que mudam as palavras as mudam, ajustado a um render do Vegas; o tracking, as deformações animadas e outras deformações não são feitos. Qualquer idioma funciona; emojis só aparecem se a fonte os tiver'],
        ['', 'Em parte', 'VEGAS Defocus (tanto o plugin antigo quanto o OFX): o desfoque de lente com o formato da íris (círculo ou polígono), o tamanho e o anel externo ajustados a um render do Vegas dos presets dele. O bloom ainda não é feito'],
        ['', 'Em parte', 'VEGAS Titles & Text com texto, fonte, tamanho, cor, escala, posição, fundo e espaçamento entre linhas, ajustado a um render do Vegas do estilo padrão. As animações, o contorno, a sombra, o tracking e os alinhamentos que não sejam o central ainda não são feitos'],
        ['', 'Em parte', 'Estática cinza'],
        ['', 'Sim', 'Quadrados da cor e da transparência dele no tamanho de quadrado dele, transparentes entre si'],
        ['', 'Sim', 'Os 9 padrões (barras SMPTE e de cor, NTSC e PAL, porches, PLUGE, rampa e gradiente), ajustados a um render do Vegas'],
        ['', 'Sim', 'Gradientes lineares, elípticos e retangulares com as cores, pontos e ângulo, e os keyframes, ajustados a um render do Vegas'],
        ['Composição', 'Em parte', 'O modo de composição de uma faixa (Add, Subtract, Multiply, Screen, Overlay, Hard Light, Dodge, Burn, Darken, Lighten, Difference) mistura os vídeos e a mídia gerada dela com o que está embaixo, e um compositor personalizado em Difference também. Os modos são identificados pela posição na lista do Vegas, e só o Difference é conferido com um render. Mídia gerada numa faixa com outro compositor personalizado fica de fora, e os vídeos dessa faixa são desenhados normalmente'],
        ['Fades de eventos', 'Sim', 'Fade in e fade out no vídeo (opacidade, mostrando o que está embaixo) e no som (volume), com a curva (linear, fast, slow, smooth ou sharp; um som entra rápido e sai devagar, a não ser que seja alterado)'],
        ['Transições', 'Em parte', 'Um crossfade toca como o próximo evento aparecendo sobre o anterior, que continua tocando embaixo (com qualquer `CUTOFF`). Efeitos de transição como wipes não'],
        ['FX de faixa', 'Sim', 'Efeitos numa faixa inteira são aplicados em todos os clipes dela, depois dos efeitos do próprio clipe'],
        ['FX da saída de vídeo', 'Sim', 'Os efeitos de vídeo do próprio projeto (os desta tabela) são aplicados na imagem toda, depois de todo o resto'],
        ['', 'Sim', 'Incluindo quantidades parciais, o plugin antigo e o OFX. O cinza é a média de vermelho, verde e azul, como no Vegas (ajustado a um render do Vegas)'],
        ['', 'Sim', 'Incluindo quantidades parciais e keyframes (inversões piscando tocam quadro a quadro). Nos níveis de estúdio do Vegas, então o branco fica um pouco mais claro que o preto, ajustado a um render do Vegas'],
        ['', 'Sim', 'Matiz, saturação e luminância, ajustados a um render do Vegas dos presets dele'],
        ['', 'Sim', 'Rotação de matiz, saturação, gama, ganho e offset nas cores escolhidas pelos limites de luminância, saturação e matiz dele (suavizados, ou invertidos), ajustados a um render do Vegas dos presets dele. Mostrar a máscara e o alfa dela não'],
        ['', 'Sim', 'Curvas de vermelho, verde e azul, o plugin antigo e o OFX, nos níveis de estúdio do Vegas. Todos os presets OFX ajustados a um render do Vegas com margem de 2 níveis'],
        ['', 'Sim', 'Cada canal de cor misturado a partir dos outros (RGB para BGR, só vermelho...), com Normalize, o plugin antigo e o OFX (ajustado a um render do Vegas dos presets dele)'],
        ['', 'Em parte', 'Os 8 controles: line sync, vertical sync, entrelaçamento, scan phasing, fosforescência, aperture grill, estática e detail zoom. O line sync é uma tremida aleatória nova a cada quadro, como no Vegas, então corresponde em intensidade, não quadro a quadro'],
        ['', 'Sim', 'O kernel 3x3 com a escala e o bias dele (relevo, bordas, nitidez...) na escala do projeto, o plugin antigo e o OFX (sem rotação; ajustado a um render do Vegas dos presets dele)'],
        ['', 'Sim', 'Desfoque ao longo do ângulo e da quantidade dele, ajustado a um render do Vegas dos presets dele'],
        ['', 'Sim', 'Em qualquer ângulo, por qualquer ponto, com o fundo dele onde nada é refletido, o plugin antigo e o OFX (ajustado a um render do Vegas dos presets dele)'],
        ['', 'Sim', 'No sentido horário ou anti-horário, com o tamanho dele e em volta do centro dele'],
        ['Pinch/Punch e Spherize', 'Sim', 'Inflando para fora ou beliscando para dentro em volta do centro, ajustados a renders do Vegas dos presets deles: Pinch/Punch com tamanho e centro em imagens 4:3 e 3:2, Spherize com a escala horizontal e vertical'],
        ['', 'Sim', 'Cisalhamento, achatamento, curva, dobra e compressão, batendo com um render do Vegas de cada preset'],
        ['', 'Sim', 'Na horizontal e na vertical, nos canais em que estiver configurado (ajustado a um render do Vegas dos presets dele)'],
        ['', 'Sim', 'Na horizontal, na vertical ou nos dois, em blocos de 2, 4, 8 ou 16 pixels de saída como o Vegas'],
        ['', 'Sim', 'Cada um de vermelho, verde e azul ligado no máximo ou desligado conforme o nível dele (ajustado a um render do Vegas dos presets dele)'],
        ['', 'Em parte', 'O brilho mapeado ao longo das paradas de cor dele e sobreposto conforme o alfa delas. Parecido com o Vegas, não exato'],
        ['', 'Sim', 'A cor dele sobre as partes claras, tão larga e forte quanto o percentual, a intensidade e a supressão dele indicarem (ajustado a um render do Vegas dos presets dele)'],
        ['', 'Em parte', 'Raio fixo e proporcional, em volta do centro dele, o OFX e o plugin antigo. Parecido com o Vegas; os rastros proporcionais mais fortes saem mais curtos'],
        ['', 'Em parte', 'Raios a partir das partes claras, o holofote (tamanho, suavização), a cor e a luz ambiente dele. Parecido com o Vegas; a sensibilidade não é usada'],
        ['', 'Em parte', 'Rate, Strength, Drift, Crop, Edges e Orientation, ajustados a um render do Vegas dos presets dele. As bordas esticadas só se parecem'],
        ['', 'Em parte', 'O brilho mapeado pelas cores de tinta e papel dele, misturado conforme o blend dele. Parecido com o Vegas'],
        ['', 'Em parte', 'A cor dele como faixas de metal sobre o brilho, com brilho especular, realces, calibrate e a imagem misturada de volta. Parecido com o Vegas'],
        ['', 'Em parte', 'A névoa (largura, cor, nível), a cor do brilho e as faixas, misturadas conforme o blend dele. Parecido com o Vegas; faixas fortes só se parecem e o movimento não é feito'],
        ['', 'Em parte', 'Ampliado e sacudido tão longe e tão rápido quanto a magnitude e a velocidade dele indicarem. A sacudida é inventada, como a aleatória do próprio Vegas'],
        ['Wave (clássico)', 'Sim', 'A onda antiga com os presets Small, Medium, Large, Horizontal Only e Vertical Only: linhas e colunas dobradas ao longo de uma senoide'],
        ['', 'Em parte', 'Todos os formatos, repetidos, recortados para dentro ou para fora, com a suavização e a cor de borda dele. Formatos e tamanhos parecidos com o Vegas, não exatos'],
        ['', 'Em parte', 'A cor-chave com o limiar e o desfoque dela, o OFX e o plugin antigo, parecido com o Vegas'],
        ['', 'Sim', 'A luminosidade, os canais a e b, Invert Luminance e Desaturate'],
        ['', 'Em parte', 'Levels em todos os canais (entrada, saída e gama), brilho e contraste em volta do centro (os dois ajustados a um render do Vegas dos presets deles), e a saturação, gama e ganho do Color Corrector. O Color Corrector antigo também tem o offset e as rodas de cor de sombras, meios-tons e realces, ajustados a um render do Vegas dos presets dele. Levels num só canal e as rodas de cor do Color Corrector OFX não'],
        ['', 'Em parte', 'O brilho passado por preto, a cor dele e branco, misturado conforme a intensidade dele'],
        ['Unsharp Mask e Sharpen', 'Sim', 'Quantidade e raio (Negative, Outline Edges...), a poucos níveis de um render do Vegas dos presets dele'],
        ['', 'Em parte', 'O holofote ou brilho dele (posição, direção, intensidade, foco, ambiente) e o relevo a partir do brilho da imagem, ajustados a um render do Vegas de três presets. O brilho especular (shininess) não é feito'],
        ['', 'Em parte', 'Ruído colorido ou cinza no nível dele, em movimento ou parado'],
        ['Median, Min e Max', 'Em parte', 'Cada pixel vira a mediana, o mais escuro ou o mais claro em volta dele, calculado numa imagem menor quando o intervalo é grande. O intervalo de Min e Max está ajustado a um render do Vegas dos presets deles; o do Median ainda não foi conferido, e o Circular Area Processing não é feito'],
        ['', 'Em parte', 'A cor dele além do raio interno e externo, a proporção, o centro e a suavização, ou por dentro com Invert'],
        ['', 'Em parte', 'Fatias ou anéis em volta do centro dele, maiores com a intensidade'],
        ['NewBlue Dream Glow e Line Drawing', 'Em parte', 'A cor, o desfoque e o brilho do Dream Glow; as cores de papel e tinta, a densidade e o contraste do Line Drawing (só bordas, sem sombreamento). Não ajustados a um render do Vegas'],
        ['', 'Em parte', 'Detalhes, largura, as cores do carvão e da superfície e a cor, ajustados a um render do Vegas dos presets dele, mas com diferenças visíveis (principalmente os presets verde e azul riscado). O contraste dele não é desenhado'],
        ['', 'Em parte', 'Ruído, croma, tom, saturação, brilho, contraste, linhas de varredura, a rolagem vertical com a barra vazia, scan phasing, curvatura, borda suave e opacidade da borda, ajustados a um render do Vegas dos presets dele, mais ghosting (a cópia deslocada dele) e sincronização horizontal (linhas rasgadas para os lados em rajadas, tão longe e tão frequentes quanto o Vegas as rasga), com as configurações em keyframes tocadas. O ruído e o formato de cada rasgo são aleatórios como os do próprio plugin, então correspondem no tipo, não pixel a pixel'],
        ['NewBlue Motion, Spin e Zoom Blur', 'Em parte', 'Motion Blur ao longo do ângulo dele (num sentido ou nos dois), Spin Blur em volta do centro, Zoom Blur em direção ao centro. Os tamanhos são estimativas, não ajustados a um render do Vegas'],
        ['', 'Em parte', 'Os anéis dele com amplitude, frequência, velocidade, desvanecimento, sombreamento e deformação, ajustados a um render do Vegas dos presets dele. Deformações fortes só se parecem'],
        ['', 'Sim', 'O tempo do evento em qualquer um dos formatos dele (SMPTE drop e non-drop, film, segundos, quadros, tempo e quadros) na caixa dele, com o alinhamento e o tamanho, ajustado a um render do Vegas dos presets dele'],
        ['', 'Em parte', 'A grade, a sobreposição, a origem, a escala e o esticamento dele, e o tom, a saturação, o brilho, a opacidade e o desfoque de cada bloco, ajustados a um render do Vegas. A variação aleatória entre blocos é aleatória como a do próprio Vegas, então corresponde no tipo, não bloco a bloco'],
        ['', 'Sim', 'As três cores, intervalos, deslocamento e saturação dele, ajustados a um render do Vegas dos presets dele'],
        ['', 'Sim', 'Contraste, brilho, saturação e matiz, ajustados a um render do Vegas de cada controle deslizante e dos presets dele'],
        ['', 'Em parte', 'A cor de papel dele misturada conforme o blend, e as bordas da imagem na cor de tinta dele, tantas quanto a densidade dele der, ajustadas a um render do Vegas dos presets dele. As linhas não caem exatamente nos mesmos pixels que no Vegas'],
        ['', 'Em parte', 'O desgaste desbotando a imagem (conforme o padrão dele), ajustado a um render do Vegas dos presets dele, com granulação, manchas e arranhões parecidos (aleatórios, então só parecidos no tipo). A textura do próprio padrão e as cores dos arranhões não'],
        ['', 'Em parte', 'As bordas da imagem na cor de carvão dele sobre a cor de superfície, os detalhes, a largura e a cor dele, ajustados a um render do Vegas dos presets dele. Só parecido de forma geral'],
        ['', 'Sim', 'O cisalhamento horizontal e vertical, o ângulo, a direção, o centro, o blend e as bordas dele, ajustados a um render do Vegas de cada controle e dos presets dele'],
        ['Soft Contrast e Rays', 'Em parte', 'O esticamento, os cortes, o contraste difuso, o tom e a vinheta do Soft Contrast (preta, branca, desfocada ou transparente); os rastros do Rays a partir das partes claras acima do limiar dele, coloridos conforme o matiz e a varredura dele. A máscara e o alfa-chave do Rays não são feitos'],
        ['', 'Em parte', 'Bordas desfocadas, chanfradas (iluminadas a partir do ângulo dela) e sólidas na cor e no tamanho dela'],
        ['', 'Em parte', 'Granulação, tom, escala de cinza, poeira, fios, arranhões, cintilação e tremor, aleatórios como os do próprio Vegas (então não quadro a quadro)'],
        ['', 'Sim', 'Pontos de meio-tom conforme o tamanho do ponto: cor, monocromático ou cor deslocada, o plugin antigo e o OFX (ajustado a um render do Vegas dos presets dele)'],
        ['', 'Em parte', 'Os elementos e raios dos 5 tipos de lente na luz dele, ajustados a um render do Vegas dos presets dele. Tom, tamanho, perspectiva e as outras intensidades são estimativas'],
        ['Keyframes de efeitos', 'Em parte', 'Os plugins antigos seguem os keyframes deles (Swirl, Wave, Pinch/Punch, Mirror, Deform, o line sync do TV Simulator, a magnitude do Earthquake, Gaussian Blur, HSL Adjust, Linear Blur e Invert), em linha reta de um para o próximo. Os efeitos OFX só seguem o matiz do HSL Adjust e a quantidade do Linear Blur'],
        ['Outros FX de vídeo', 'Não', 'Outros efeitos da NewBlue, plugins OFX de outras empresas...'],
        ['Envelopes', 'Em parte', 'Os envelopes de volume e pan das faixas de áudio, e a velocidade de um evento de vídeo como a velocidade média dele ao longo do evento (0 congela um quadro). Envelopes de opacidade não'],
        ['FX de áudio', 'Em parte', 'Pitch Shift, Distortion (os níveis, o gráfico e o passa-baixa dele; o slew rate só parecido), Volume, Resonant Filter e Reverb (uma sala inventada a partir do decay, pre-delay e níveis dele), em eventos e em faixas de áudio (os de uma faixa, sobre a mixagem dela). Também Graphic EQ (os modos de 10 bandas, 20 bandas e envelope), Smooth/Enhance, Vibrato, Chorus, Flange/Wah-Wah, Amplitude Modulation e os ExpressFX Delay, Distortion, Chorus, Flange, Amplitude Modulation, Equalization e Reverb, reconstruídos a partir das configurações deles, então só parecidos com o Vegas. Os outros (Simple Delay, Multi-Tap Delay, Noise Gate, compressores...) são pulados'],
        ['Reverse', 'Sim', 'Eventos invertidos tocam de trás para frente, o som também'],
        ['Subclips', 'Sim', 'Uma parte de um arquivo cortada no Vegas toca a partir do próprio ponto'],
        ['Takes', 'Em parte', 'Um evento com vários takes usa o que foi deixado para tocar (o último, a não ser que tenha sido trocado de volta), também quando o take foi renomeado no projeto'],
        ['Máscaras', 'Não', 'Nem faixas pai/filho nem projetos aninhados'],
      ],
    },
    results: [
      'O projeto reconstruído com a última imagem ou vídeo em cada clipe.',
      'Usa um `.veg` anexado antes na tag, deixando os clipes de uma faixa se sobreporem.',
    ],
  },

  'ms-moviemaker': {
    title: 'Projetos do Movie Maker (.wlmp)',
    body: [
      '`loadwlmp URL WLMP_KEY` lê um projeto do Windows Live Movie Maker, e `wlmprender MEDIA_KEY WLMP_KEY` o reproduz com cada vídeo, imagem e som dele substituído pela sua mídia. Um `.wlmp` é o arquivo de projeto que o Movie Maker salva (não um vídeo pronto): os clipes tocam um depois do outro do jeito que o Movie Maker os organiza, cada um a partir do mesmo ponto da sua mídia de onde tocava no próprio arquivo. O Movie Maker em si nunca roda: os efeitos da tabela são redesenhados com ffmpeg, ajustados a um render do Movie Maker de cada um, e efeitos que não estão na tabela são pulados.',
      'Cada mídia do projeto vira a sua mídia: clipes de vídeo tocam a partir dela, imagens a mostram parada no primeiro quadro, e a música e a narração tocam o som dela. Com uma imagem como mídia, todo clipe a mostra e não há som; com um arquivo de áudio, só o som toca. Um projeto 4:3 sai em 640x480 e um 16:9 em 1280x720, como os tamanhos de exportação do próprio Movie Maker.',
      'Limites: projetos de até 8mb (e dentro do limite de download do script), 4 por script, 20000 clipes. O render tem no máximo 10 minutos e conta como uma execução de `ffmpeg`, compartilhando o limite de tempo dela.',
    ].join('\n\n'),
    table: {
      columns: ['Recurso do Movie Maker', 'Reproduzido', 'Como'],
      rows: [
        ['Clipes', 'Sim', 'Em ordem, com os pontos de início e fim e os intervalos antes deles'],
        ['Velocidade', 'Sim', 'De 0.01x a 100x, o som também'],
        ['Girar para a esquerda/direita', 'Sim', 'Quartos de volta, com barras nas laterais quando a imagem fica deitada'],
        ['Volume e mudo', 'Sim', 'Os de cada clipe'],
        ['Música e narração', 'Em parte', 'Tocam sob os clipes, sem a redução automática de áudio e a mixagem do Movie Maker'],
        ['Black and White (e os filtros Orange, Red e Yellow dele), Cyan, Sepia', 'Sim', 'Ajustados a um render do Movie Maker'],
        ['', 'Sim', 'Ajustados a um render do Movie Maker'],
        ['', 'Em parte', 'O Hue faz todas as cores passarem por um só matiz como o Movie Maker; os dois foram ajustados a um único render e podem ficar diferentes com outras configurações'],
        ['', 'Sim', 'Gira uma vez e volta ao tamanho total ao longo do clipe, a partir do próprio modelo de efeito do Movie Maker'],
        ['', 'Sim', 'Cada linha balança para os lados seguindo uma onda que aperta e afrouxa ao longo do clipe, com um pixel de diferença do Movie Maker'],
        ['', 'Não', 'Pulados'],
        ['Transições, legendas e títulos', 'Não', 'Pulados'],
      ],
    },
    results: [
      'O projeto do Movie Maker anexado reconstruído com a última imagem ou vídeo em cada clipe.',
    ],
  },

  'ms-examples': {
    title: 'Exemplos completos',
    body: 'Algumas tags completas que combinam vários comandos. Copie uma para o `.tag create` e ajuste.',
    results: [
      'Coloca uma legenda na última imagem, GIF ou vídeo com o que o usuário digitou depois do nome da tag.',
      'Cria um GIF do avatar do usuário girando (uma imagem estática vira um GIF de 20 quadros).',
      'Substitui o áudio do último vídeo por um narrador lendo os argumentos da tag.',
      'Escreve um texto branco no meio da imagem.',
      'Desenha um "sol" amarelo no canto superior direito de uma foto de bolo.',
      'Gira o avatar em 3D, como o meme da barata dançando.',
    ],
  },
};
