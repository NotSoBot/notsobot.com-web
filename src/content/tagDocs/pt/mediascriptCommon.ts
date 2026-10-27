// Argument descriptions and notes many MediaScript commands share (`media()`, `textStyleArgs()` and
// TEXT_STYLE_NOTES in tagDocs/mediascript.ts).

// the default description of a command's MEDIA_KEY argument
export const MEDIA = 'a mídia a alterar';

// the look options `text`, `fittext` and `drawtext` share
export const TEXT_STYLE_ARGS: Readonly<Record<string, string>> = {
  FONT: 'uma das fontes incluídas',
  SIZE: 'tamanho da fonte em pixels',
  COLOR: 'cor do texto; `none` para texto vazado (com `STROKE`)',
  WIDTH: 'quebra as linhas neste número de pixels; 0 para quebrar só na largura máxima da imagem',
  ALIGN: 'como as linhas se alinham',
  LINE_SPACING: 'altura da linha, como múltiplo da normal',
  LETTER_SPACING: 'espaço extra entre as letras, em ems (0.1 é um décimo do tamanho)',
  MARKUP: 'lê as tags `<b>`, `<i>`, `<u>`, `<s>`, `<sub>`, `<sup>`, `<big>`, `<small>`, `<tt>` e `<span>` do texto',
  STROKE: 'cor do contorno',
  STROKE_WIDTH: 'espessura do contorno em pixels',
  SHADOW: 'cor da sombra (RGBA serve para uma semitransparente)',
  SHADOW_X: 'deslocamento da sombra para a direita',
  SHADOW_Y: 'deslocamento da sombra para baixo',
  SHADOW_BLUR: 'suavidade da sombra em pixels',
  BACKGROUND: 'cor de uma caixa atrás do texto (também `BG`)',
  PADDING: 'espaço entre o texto e a borda da caixa',
  RADIUS: 'cantos arredondados para a caixa',
  FILL: 'uma chave de mídia para preencher as letras (o primeiro quadro dela), no lugar de `COLOR`',
};

export const TEXT_STYLE_NOTES: ReadonlyArray<string> = [
  'Tudo depois da chave de mídia que não for `NAME=value` é o texto. Envolva em `{jsonify:}` quando ele tiver quebras de linha ou aspas, e sempre com `MARKUP=true`: um `<span color="red">` sem envolver é lido como uma opção `COLOR=`.',
  'O `<span>` do markup aceita `color`, `background`, `alpha`/`bgalpha` (em porcentagem), `font` (um dos nomes de fonte), `size` (de `10%` a `300%` ou de `xx-small` a `xx-large`, `smaller`, `larger`), `weight`, `style`, `variant`, `stretch`, `underline`, `overline`, `strikethrough`, os `_color` deles, `letter_spacing` e `text_transform`. O markup pode deixar o texto no máximo 4 vezes maior, e as tags se aninham no máximo 10 níveis.',
  'Os emojis são desenhados em cores.',
];
