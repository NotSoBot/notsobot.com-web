// MediaScript commands in Brazilian Portuguese (load & render, flow), keyed by command name

import type { TagDocsTranslation } from '../localize';

import { MEDIA } from './mediascriptCommon';


const LOOP_DISCARD = 'Variáveis e chaves de mídia novas criadas dentro são descartadas quando termina. `render` não é permitido dentro.';
const ATTACHED_FILES = (extension: string) => `link para o arquivo \`${extension}\`, ou \`FILE_1\`, \`FILE_2\`... para arquivos anexados à tag`;
const KEY_NAME = 'o nome pelo qual usá-lo, qualquer nome como o de uma chave de mídia';


export const MEDIASCRIPT_PORTUGUESE_1: TagDocsTranslation['mediaScriptCommands'] = {
  load: {
    summary: 'Baixa uma imagem, GIF, arquivo de áudio ou vídeo de uma URL para uma chave de mídia.',
    args: {
      URL_HERE: 'um link direto de mídia, uma função de TagScript como `{iv}` ou `{avatar}`, ou `FILE_X` / `FILE_X_COPY`',
      MEDIA_KEY: 'o nome sob o qual guardar a mídia',
      AUDIO_PRIORITY: 'preferir o áudio quando o link tiver áudio e vídeo',
    },
    results: [
      'Devolve a última imagem ou vídeo do chat.',
    ],
    notes: [
      '`FILE_X` carrega o X-ésimo anexo da tag até ali e o remove da resposta; `FILE_X_COPY` o mantém anexado.',
    ],
  },
  loadveg: {
    summary: 'Carrega um projeto do Vegas Pro (.veg) para o `vegrender`.',
    args: {
      URL: ATTACHED_FILES('.veg'),
      VEG_KEY: KEY_NAME,
    },
    results: [
      'Reproduz o projeto anexado com a última imagem ou vídeo.',
    ],
    notes: [
      'Arquivos de até 32mb (ou o limite de download do script, se for menor), no máximo 4 por script, e eles contam para o limite de download do script. Projetos com mais de 20000 eventos ou 512 faixas são recusados.',
      'Chaves de veg são separadas das chaves de mídia. Carregar o mesmo link na mesma chave de novo (como dentro de `reexport`) é pulado.',
      'Só o projeto é lido, não a mídia que ele usava. Veja a seção de projetos do Vegas para saber o que é reconstruído.',
    ],
  },
  vegrender: {
    summary: 'Reproduz um projeto do Vegas com cada um dos vídeos e sons dele substituído pela sua mídia, como o renderizador de `.veg` das tags de efeito.',
    args: {
      MEDIA_KEY: MEDIA,
      VEG_KEY: 'um projeto do `loadveg`',
      CUTOFF: 'um clipe que começa numa faixa corta o anterior (false deixa que se sobreponham)',
    },
    results: [
      'O projeto reconstruído com a última imagem ou vídeo em cada clipe.',
    ],
    notes: [
      'Reconstruído: a linha do tempo (cortes, faixas, mute e solo, velocidade, eventos invertidos e subclips), mudanças de tom (incluindo o plugin Pitch Shift), o plugin de áudio Distortion, fades de eventos, zooms, movimentos, giros e espelhamentos do Pan/Crop com as curvas dos keyframes, track motion com o 2D Shadow e Glow dele, cores sólidas, tabuleiros, padrões de teste, gradientes de cor, ruído, texto (com fonte, cores, contorno, sombra, posição, Pan/Crop e keyframes, e VEGAS Titles & Text sem as animações), e estes efeitos em eventos, faixas e na saída de vídeo do projeto: Black and White, Invert, HSL Adjust, Color Corrector (Secondary), Color Curves, Convolution Kernel, Linear Blur, Mirror, Swirl, Pinch/Punch, Spherize, Deform, o Wave clássico, Channel Blend, Gaussian Blur, Pixelate, Threshold, Gradient Map, Glow, Radial Blur, Light Rays, NewBlue Wiggle, Duochrome, Metallic, Ghost e Earthquake, TV Simulator, Cookie Cutter, Chroma Keyer, LAB Adjust, Levels, Brightness and Contrast, Sepia, Unsharp Mask, Sharpen, Bump Map, Add Noise, Median, Min e Max, Vignette, Radial Pixelate, Soft Contrast, Rays, Border, Film Effects, Newsprint, Lens Flare e os NewBlue Dream Glow, Line Drawing, Charcoal, Old TV, Motion/Spin/Zoom Blur, Ripple, Colorize, Video Tune-up, Pastel Sketch, Film Damage, Charcoal, Shear Energy e Tile, Timecode, Defocus, com os keyframes dos plugins antigos. Modos de composição, curvas de fade, velocidade, envelopes de volume e pan das faixas de áudio e a maioria dos plugins de áudio do Vegas e do ExpressFX também tocam. Outros efeitos (outros efeitos da NewBlue, plugins OFX de outras empresas...), efeitos de transição e envelopes de opacidade não, então um projeto que os use vai ficar diferente. A lista completa está na seção de projetos do Vegas.',
      'Eventos de vídeo em arquivos de vídeo e eventos de áudio em arquivos de vídeo ou de som recebem sua mídia; eventos em imagens estáticas mostram sua mídia parada no primeiro quadro. Uma imagem estática é mostrada durante o projeto inteiro.',
      'Como no Vegas, uma cadeia de efeitos para num plugin que o Vegas não consegue carregar: ele e os efeitos depois dele são pulados.',
      'No máximo 10 minutos, reduzido para caber em 1280x720, com no máximo 32 clipes na tela (e 32 tocando) ao mesmo tempo. Conta para o limite de `ffmpeg` e precisa terminar dentro do limite de tempo do script, que projetos longos ou cheios de efeitos podem esgotar.',
      'Fora das tags, o bot tem a mesma coisa no comando `.veg` (primeiro o .veg anexado ou a URL dele, depois a mídia; `-nocutoff` para `CUTOFF=false`) e no `/media-aiv veg`.',
    ],
  },
  loadwlmp: {
    summary: 'Carrega um projeto do Windows Live Movie Maker (.wlmp) para o `wlmprender`.',
    args: {
      URL: ATTACHED_FILES('.wlmp'),
      WLMP_KEY: KEY_NAME,
    },
    results: [
      'Reproduz o projeto anexado com a última imagem ou vídeo.',
    ],
    notes: [
      'Arquivos de até 8mb (ou o limite de download do script, se for menor), no máximo 4 por script, e eles contam para o limite de download do script. Projetos com mais de 20000 clipes são recusados.',
      'Chaves de wlmp são separadas das chaves de mídia. Carregar o mesmo link na mesma chave de novo (como dentro de `reexport`) é pulado.',
      'Só o projeto é lido, não a mídia que ele usava. Veja a seção de projetos do Movie Maker para saber o que é reconstruído. Um `.veg` vai pelo `loadveg`.',
    ],
  },
  wlmprender: {
    summary: 'Reproduz um projeto do Movie Maker com cada um dos vídeos, imagens e sons dele substituído pela sua mídia.',
    args: {
      MEDIA_KEY: MEDIA,
      WLMP_KEY: 'um projeto do `loadwlmp`',
    },
    results: [
      'O projeto reconstruído com a última imagem ou vídeo em cada clipe.',
    ],
    notes: [
      'Reconstruído: os clipes em ordem (pontos de início e fim, intervalos, velocidade), os botões de girar, volume e mudo, a música e a narração, e os efeitos Black and White (com os filtros Orange, Red e Yellow), Cyan, Sepia, Threshold, Posterize, Blur, Brightness, Hue e Spin 360. Edge Detection, Warp, Ripple, Cinematic, transições e legendas são pulados. A lista completa está na seção de projetos do Movie Maker.',
      'Um projeto 4:3 sai em 640x480 e um 16:9 em 1280x720, no máximo 10 minutos. Conta para o limite de `ffmpeg` e precisa terminar dentro do limite de tempo do script.',
      'Fora das tags, o bot tem a mesma coisa no comando `.wlmp` (primeiro o .wlmp anexado ou a URL dele, depois a mídia) e no `/media-aiv wlmp`.',
    ],
  },
  loadxyt: {
    summary: 'Carrega um modelo de filtro, fx ou moldura do VivaVideo (.xyt) para o `xytrender`.',
    args: {
      URL: ATTACHED_FILES('.xyt'),
      XYT_KEY: KEY_NAME,
    },
    results: [
      'Aplica o modelo anexado à última imagem ou vídeo.',
    ],
    notes: [
      'Arquivos de até 16mb (ou o limite de download do script, se for menor), no máximo 10 por script, e eles contam para o limite de download do script.',
      'Chaves de xyt são separadas das chaves de mídia. Carregar o mesmo link na mesma chave de novo (como dentro de `reexport`) é pulado.',
      'Modelos de filtro, fx e moldura funcionam. Modelos de tema, modelos de preenchimento (`_dummy`), efeitos de shader com imagens próprias e efeitos de quadros alfa ainda não são suportados e falham ao carregar.',
    ],
  },
  xytrender: {
    summary: 'Aplica um modelo do VivaVideo carregado pelo `loadxyt`: primeiro os shaders dele, depois as molduras.',
    args: {
      MEDIA_KEY: MEDIA,
      XYT_KEY: 'um modelo do `loadxyt`',
    },
    results: [
      'A última imagem ou vídeo passada pelo modelo.',
    ],
    notes: [
      'Imagens, gifs e vídeos continuam sendo o que são (um vídeo mantém o áudio). Os keyframes do modelo tocam ao longo da duração da mídia, e um modelo que se move transforma uma imagem estática num gif de uma reprodução dele (no máximo 10 segundos).',
      'Um modelo de moldura desenha as imagens dele através das máscaras sobre a mídia, giradas um quarto de volta quando são verticais sobre mídia horizontal (ou o contrário), aparecendo e sumindo cada uma no próprio ritmo.',
      'Os shaders precisam ser GLSL ES 1.00 dentro dos limites dele (loops com contador, índices de array constantes). Um que não seja, ou que não compile, gera um erro com o motivo.',
      'Fora das tags, o bot tem a mesma coisa no comando `.xyt` (primeiro o .xyt anexado ou a URL dele, depois a mídia) e no `/media-iv-filter xyt`.',
    ],
  },
  loadcube: {
    summary: 'Carrega uma LUT de cor 3D `.cube` para o `applylut` ou para o filtro `lut3d` da ação `ffmpeg`.',
    args: {
      URL: 'link para o arquivo `.cube`, ou `FILE_1`, `FILE_2`... para arquivos anexados',
      CUBE_KEY: 'o nome pelo qual usá-la; só letras, números e _',
    },
    results: [
      'Faz a correção de cor do vídeo com a LUT.',
    ],
    notes: [
      'Aplique com `applylut MEDIA_KEY CUBE_KEY`, ou como `lut3d=CUBE_KEY.cube` (ou `lut3d=file=CUBE_KEY.cube:interp=tetrahedral`) no `ffmpeg`.',
      'Só LUTs 3D, com `LUT_3D_SIZE` de até 65 e arquivos de até 16mb. No máximo 10 por script.',
      'Chaves de cube são separadas das chaves de mídia; um cube não pode ser usado como mídia.',
    ],
  },
  render: {
    summary: 'Encerra o script e envia a mídia como resultado, opcionalmente convertida para outro formato.',
    args: {
      MEDIA_KEY: 'a mídia a enviar',
      MIMETYPE: 'o formato em que salvar; omita (ou use `default`) para manter o atual',
      FILENAME: 'nome opcional para o arquivo de saída; escreva `default` como mimetype para manter o formato e ainda assim dar um nome',
    },
    results: [
      'Envia a mídia no próprio formato, com o nome "cake".',
    ],
    notes: [
      'Tudo depois do `render` é ignorado.',
      'Se um script não tiver `render`, a primeira chave de mídia criada é renderizada automaticamente.',
    ],
  },
  convert: {
    summary: 'Converte a mídia para outro formato sem encerrar o script.',
    args: {
      MEDIA_KEY: MEDIA,
      MIMETYPE: 'o formato para o qual converter',
    },
  },
  clone: {
    summary: 'Copia uma chave de mídia para uma chave nova, para você editar uma e manter a original.',
    args: {
      MEDIA_KEY: 'a mídia a copiar',
      MEDIA_KEY_2: 'o nome da cópia',
    },
  },
  bitrate: {
    summary: 'Define a taxa de bits do vídeo e do áudio, principalmente para deixar os arquivos menores (ou mais detonados).',
    args: {
      MEDIA_KEY: MEDIA,
      VIDEO: 'taxa de bits do vídeo em bits por segundo',
      AUDIO: 'taxa de bits do áudio em bits por segundo',
    },
  },
  togif: {
    summary: 'Converte a mídia num GIF, diminuindo o tamanho e os quadros por segundo se precisar.',
    args: {
      MEDIA_KEY: MEDIA,
    },
  },

  foreachframe: {
    summary: 'Executa código de MediaScript uma vez para cada quadro de um intervalo.',
    args: {
      MEDIA_KEY: 'a mídia cujos quadros percorrer',
      START: 'primeiro quadro (incluído)',
      END: 'para antes deste quadro (não incluído)',
      MEDIASCRIPTCODE: 'o código a executar, codificado em JSON com `{jsonify:}` se tiver mais de uma linha',
    },
    results: [
      'Dá um matiz aleatório para cada quadro do avatar.',
    ],
    notes: [
      'O quadro atual é a chave de mídia `MEDIA_KEYx` (ex.: `pfpx`), e `idx` é o número do quadro. Usar o próprio `MEDIA_KEY` dentro é um erro.',
      'Não use dentro do loop comandos que transformam uma imagem estática num GIF; cada quadro precisa continuar sendo uma única imagem.',
      'Variáveis e chaves de mídia novas criadas dentro do loop são descartadas quando ele termina. `render` não é permitido dentro.',
    ],
  },
  dobetween: {
    summary: 'Executa código de MediaScript só num trecho de tempo, e depois o encaixa de volta.',
    args: {
      MEDIA_KEY: MEDIA,
      START: 'tempo de início em segundos',
      END: 'tempo de fim em segundos',
      MEDIASCRIPTCODE: 'o código a executar, codificado em JSON com `{jsonify:}`',
    },
    results: [
      'Inverte e aplica deepfry só nos segundos 2 a 4 do vídeo.',
    ],
    notes: [
      'O trecho fica disponível como `MEDIA_KEYx`. Usar o próprio `MEDIA_KEY` dentro é um erro.',
      LOOP_DISCARD,
    ],
  },
  reexport: {
    summary: 'Executa código num clipe várias vezes, cada vez sobre o último resultado, e depois junta todos os resultados (exportações estilo IHTX).',
    args: {
      MEDIA_KEY: MEDIA,
      AMOUNT: 'quantas exportações; negativo junta de trás para frente',
      LENGTH: 'segundos a usar desde o começo, e também a duração de cada exportação',
      NO_TRIM: 'mantém exportações que ficaram mais longas que LENGTH; só funciona como `NO_TRIM=true`',
      MEDIASCRIPTCODE: 'o código a executar em cada exportação, codificado em JSON com `{jsonify:}`',
    },
    results: [
      '20 exportações dos primeiros 0,46 segundos, cada uma invertida, com o matiz alterado e o tom aumentado em relação à anterior.',
      '10 exportações juntadas da última para a primeira.',
    ],
    notes: [
      'A exportação sendo feita é `MEDIA_KEYx`, e `idx` é o número dela (1, 2, 3...). Usar o próprio `MEDIA_KEY` dentro é um erro.',
      'O áudio de cada exportação é cortado ou preenchido até a duração do vídeo dela antes de juntar, então continua sincronizado (não precisa de `sync+`).',
      'As linhas do código contam uma vez por exportação para o limite de 300 linhas, e cada `ffmpeg` dentro dele conta para o limite de `ffmpeg`.',
      LOOP_DISCARD,
    ],
  },
  if: {
    summary: 'Executa código de MediaScript só quando uma comparação é verdadeira.',
    args: {
      LEFT: 'um número ou equação (sem espaços)',
      OPERATOR: 'como comparar',
      RIGHT: 'um número ou equação (sem espaços)',
      MEDIASCRIPTCODE: 'o código a executar, codificado em JSON com `{jsonify:}` se tiver mais de uma linha',
    },
    results: [
      'Inverte a mídia só se ela for um vídeo, e a reduz pela metade se tiver mais de 1000px de largura.',
    ],
    notes: [
      'As duas expressões e o operador precisam estar separados por espaços, ex.: `if 2 == 2`.',
      'Os dois lados são comparados como números decimais.',
    ],
  },
  set: {
    summary: 'Guarda um número numa variável que você pode usar em equações seguintes.',
    args: {
      VARIABLE_NAME: 'só letras, dígitos e sublinhados',
      VALUE: 'um número ou equação',
    },
    results: [
      'Corta a imagem num quadrado.',
    ],
  },
  get: {
    summary: 'Copia uma propriedade de uma chave de mídia para uma variável.',
    args: {
      MEDIA_KEY: 'a mídia de onde ler',
      PROPERTY: 'o que ler',
      VARIABLE_NAME: 'a variável onde guardar',
    },
    notes: [
      'Normalmente você não precisa disto: `KEYw`, `KEYh`, `KEYd` e `KEYfc` estão sempre disponíveis.',
    ],
  },
  export: {
    summary: 'Envia uma variável de MediaScript de volta para o TagScript, para ser lida depois com `{get:}`.',
    args: {
      VARIABLE_NAME: 'a variável de MediaScript a exportar',
      VARIABLE_NAME_ALIAS: 'o nome de variável de TagScript a usar no lugar',
    },
    results: [
      'Mostra quantos quadros a mídia tem.',
    ],
  },
  exportmultiple: {
    summary: 'Envia várias variáveis de MediaScript de volta para o TagScript de uma vez.',
    args: {
      VARIABLE_NAMES: 'nomes de variáveis separados por espaços',
    },
  },
};
