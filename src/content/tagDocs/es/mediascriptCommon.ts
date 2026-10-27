// Argument descriptions and notes many MediaScript commands share (`media()`, `textStyleArgs()` and
// TEXT_STYLE_NOTES in tagDocs/mediascript.ts).

// the default description of a command's MEDIA_KEY argument
export const MEDIA = 'la multimedia que se cambia';

// the look options `text`, `fittext` and `drawtext` share
export const TEXT_STYLE_ARGS: Readonly<Record<string, string>> = {
  FONT: 'una de las fuentes incluidas',
  SIZE: 'tamaño de la fuente en píxeles',
  COLOR: 'color del texto; `none` para texto hueco (con `STROKE`)',
  WIDTH: 'parte las líneas a este número de píxeles; 0 para partirlas solo en el ancho máximo de la imagen',
  ALIGN: 'cómo se alinean las líneas',
  LINE_SPACING: 'altura de línea, como múltiplo de la normal',
  LETTER_SPACING: 'espacio extra entre letras, en ems (0.1 es una décima parte del tamaño)',
  MARKUP: 'lee las etiquetas `<b>`, `<i>`, `<u>`, `<s>`, `<sub>`, `<sup>`, `<big>`, `<small>`, `<tt>` y `<span>` del texto',
  STROKE: 'color del contorno',
  STROKE_WIDTH: 'grosor del contorno en píxeles',
  SHADOW: 'color de la sombra (RGBA sirve para una semitransparente)',
  SHADOW_X: 'desplazamiento de la sombra hacia la derecha',
  SHADOW_Y: 'desplazamiento de la sombra hacia abajo',
  SHADOW_BLUR: 'suavidad de la sombra en píxeles',
  BACKGROUND: 'color de un recuadro detrás del texto (también `BG`)',
  PADDING: 'espacio entre el texto y el borde del recuadro',
  RADIUS: 'esquinas redondeadas para el recuadro',
  FILL: 'una clave de multimedia con la que rellenar las letras (su primer fotograma), en lugar de `COLOR`',
};

export const TEXT_STYLE_NOTES: ReadonlyArray<string> = [
  'Todo lo que va después de la clave de multimedia y no es `NAME=value` es el texto. Envuélvelo en `{jsonify:}` cuando tenga saltos de línea o comillas, y siempre con `MARKUP=true`: un `<span color="red">` sin envolver se lee como una opción `COLOR=`.',
  'El `<span>` del markup admite `color`, `background`, `alpha`/`bgalpha` (en porcentaje), `font` (uno de los nombres de fuente), `size` (de `10%` a `300%` o de `xx-small` a `xx-large`, `smaller`, `larger`), `weight`, `style`, `variant`, `stretch`, `underline`, `overline`, `strikethrough`, sus `_color`, `letter_spacing` y `text_transform`. El markup puede hacer el texto como mucho 4 veces más grande, y las etiquetas se anidan como mucho 10 niveles.',
  'Los emoji se dibujan en color.',
];
