// MediaScript commands in Spanish (load & render, flow), keyed by command name

import type { TagDocsTranslation } from '../localize';

import { MEDIA } from './mediascriptCommon';


const LOOP_DISCARD = 'Las variables y las claves de multimedia nuevas creadas dentro se descartan cuando termina. No se permite `render` dentro.';


export const MEDIASCRIPT_SPANISH_1: TagDocsTranslation['mediaScriptCommands'] = {
  load: {
    summary: 'Descarga una imagen, un GIF, un archivo de audio o un vídeo de una URL en una clave de multimedia.',
    args: {
      URL_HERE: 'un enlace directo a multimedia, una función de TagScript como `{iv}` o `{avatar}`, o `FILE_X` / `FILE_X_COPY`',
      MEDIA_KEY: 'el nombre con el que guardar la multimedia',
      AUDIO_PRIORITY: 'preferir el audio cuando el enlace tiene audio y vídeo',
    },
    results: [
      'Devuelve la última imagen o vídeo del chat.',
    ],
    notes: [
      '`FILE_X` carga el archivo adjunto número X del tag hasta ese momento y lo quita de la respuesta; `FILE_X_COPY` lo mantiene adjunto.',
    ],
  },
  loadveg: {
    summary: 'Carga un proyecto de Vegas Pro (.veg) para `vegrender`.',
    args: {
      URL: 'enlace al archivo `.veg`, o `FILE_1`, `FILE_2`... para archivos adjuntos al tag',
      VEG_KEY: 'el nombre con el que usarlo, cualquier nombre como el de una clave de multimedia',
    },
    results: [
      'Reproduce el proyecto adjunto con la última imagen o vídeo.',
    ],
    notes: [
      'Archivos de hasta 32mb (o el límite de descarga del script, si es menor), como mucho 4 por script, y cuentan para el límite de descarga del script. Se rechazan los proyectos con más de 20000 eventos o 512 pistas.',
      'Las claves de veg son independientes de las claves de multimedia. Volver a cargar el mismo enlace en la misma clave (como dentro de `reexport`) se omite.',
      'Solo se lee el proyecto, no la multimedia que usaba. Mira la sección de proyectos de Vegas para saber qué se reconstruye.',
    ],
  },
  vegrender: {
    summary: 'Reproduce un proyecto de Vegas con cada uno de sus vídeos y sonidos sustituido por tu multimedia, como el renderizador de `.veg` de los tags de efectos.',
    args: {
      MEDIA_KEY: MEDIA,
      VEG_KEY: 'un proyecto de `loadveg`',
      CUTOFF: 'un clip que empieza en una pista corta el anterior (false deja que se solapen)',
    },
    results: [
      'El proyecto reconstruido con la última imagen o vídeo en cada clip.',
    ],
    notes: [
      'Se reconstruye: la línea de tiempo (cortes, pistas, mute y solo, velocidad, eventos invertidos y subclips), los cambios de tono (incluido el plugin Pitch Shift), el plugin de audio Distortion, los fundidos de eventos, los zooms, movimientos, giros y volteos de Pan/Crop con las curvas de sus fotogramas clave, el track motion con su 2D Shadow y Glow, los colores sólidos, los tableros de ajedrez, los patrones de prueba, los degradados de color, el ruido, el texto (con su fuente, colores, contorno, sombra, posición, Pan/Crop y fotogramas clave, y VEGAS Titles & Text sin sus animaciones), y estos efectos en eventos, pistas y la salida de vídeo del proyecto: Black and White, Invert, HSL Adjust, Color Corrector (Secondary), Color Curves, Convolution Kernel, Linear Blur, Mirror, Swirl, Pinch/Punch, Spherize, Deform, el Wave clásico, Channel Blend, Gaussian Blur, Pixelate, Threshold, Gradient Map, Glow, Radial Blur, Light Rays, NewBlue Wiggle, Duochrome, Metallic, Ghost y Earthquake, TV Simulator, Cookie Cutter, Chroma Keyer, LAB Adjust, Levels, Brightness and Contrast, Sepia, Unsharp Mask, Sharpen, Bump Map, Add Noise, Median, Min y Max, Vignette, Radial Pixelate, Soft Contrast, Rays, Border, Film Effects, Newsprint, Lens Flare y los NewBlue Dream Glow, Line Drawing, Charcoal, Old TV, Motion/Spin/Zoom Blur, Ripple, Colorize, Video Tune-up, Pastel Sketch, Film Damage, Charcoal, Shear Energy y Tile, Timecode, Defocus, con los fotogramas clave de los plugins antiguos. También funcionan los modos de composición, las curvas de fundido, la velocidad, las envolventes de volumen y panorama de las pistas de audio y la mayoría de plugins de audio de Vegas y ExpressFX. Otros efectos (otros efectos de NewBlue, plugins OFX de otras compañías...), los efectos de transición y las envolventes de opacidad no, así que un proyecto que los use se verá distinto. La lista completa está en la sección de proyectos de Vegas.',
      'Los eventos de vídeo sobre archivos de vídeo y los eventos de audio sobre archivos de vídeo o de sonido reciben tu multimedia; los eventos sobre imágenes fijas muestran tu multimedia congelada en su primer fotograma. Una imagen fija se muestra durante todo el proyecto.',
      'Como en Vegas, una cadena de efectos se detiene en un plugin que Vegas no puede cargar: ese y los efectos que van detrás se omiten.',
      'Como mucho 10 minutos, reducido para caber en 1280x720, con como mucho 32 clips en pantalla (y 32 sonando) a la vez. Cuenta para el límite de `ffmpeg` y tiene que terminar dentro del límite de tiempo del script, que los proyectos largos o con muchos efectos pueden agotar.',
      'Fuera de los tags, el bot tiene lo mismo con el comando `.veg` (primero el .veg adjunto o su URL, y luego la multimedia; `-nocutoff` para `CUTOFF=false`) y con `/media-aiv veg`.',
    ],
  },
  loadwlmp: {
    summary: 'Carga un proyecto de Windows Live Movie Maker (.wlmp) para `wlmprender`.',
    args: {
      URL: 'enlace al archivo `.wlmp`, o `FILE_1`, `FILE_2`... para archivos adjuntos al tag',
      WLMP_KEY: 'el nombre con el que usarlo, cualquier nombre como el de una clave de multimedia',
    },
    results: [
      'Reproduce el proyecto adjunto con la última imagen o vídeo.',
    ],
    notes: [
      'Archivos de hasta 8mb (o el límite de descarga del script, si es menor), como mucho 4 por script, y cuentan para el límite de descarga del script. Se rechazan los proyectos con más de 20000 clips.',
      'Las claves de wlmp son independientes de las claves de multimedia. Volver a cargar el mismo enlace en la misma clave (como dentro de `reexport`) se omite.',
      'Solo se lee el proyecto, no la multimedia que usaba. Mira la sección de proyectos de Movie Maker para saber qué se reconstruye. Un `.veg` va por `loadveg`.',
    ],
  },
  wlmprender: {
    summary: 'Reproduce un proyecto de Movie Maker con cada uno de sus vídeos, imágenes y sonidos sustituido por tu multimedia.',
    args: {
      MEDIA_KEY: MEDIA,
      WLMP_KEY: 'un proyecto de `loadwlmp`',
    },
    results: [
      'El proyecto reconstruido con la última imagen o vídeo en cada clip.',
    ],
    notes: [
      'Se reconstruye: los clips en orden (puntos de inicio y fin, huecos, velocidad), los botones de girar, el volumen y el silencio, la música y la narración, y los efectos Black and White (con sus filtros Orange, Red y Yellow), Cyan, Sepia, Threshold, Posterize, Blur, Brightness, Hue y Spin 360. Edge Detection, Warp, Ripple, Cinematic, las transiciones y los subtítulos se omiten. La lista completa está en la sección de proyectos de Movie Maker.',
      'Un proyecto 4:3 sale a 640x480 y uno 16:9 a 1280x720, como mucho 10 minutos. Cuenta para el límite de `ffmpeg` y tiene que terminar dentro del límite de tiempo del script.',
      'Fuera de los tags, el bot tiene lo mismo con el comando `.wlmp` (primero el .wlmp adjunto o su URL, y luego la multimedia) y con `/media-aiv wlmp`.',
    ],
  },
  loadxyt: {
    summary: 'Carga una plantilla de filtro, fx o marco de VivaVideo (.xyt) para `xytrender`.',
    args: {
      URL: 'enlace al archivo `.xyt`, o `FILE_1`, `FILE_2`... para archivos adjuntos al tag',
      XYT_KEY: 'el nombre con el que usarlo, cualquier nombre como el de una clave de multimedia',
    },
    results: [
      'Aplica la plantilla adjunta a la última imagen o vídeo.',
    ],
    notes: [
      'Archivos de hasta 16mb (o el límite de descarga del script, si es menor), como mucho 10 por script, y cuentan para el límite de descarga del script.',
      'Las claves de xyt son independientes de las claves de multimedia. Volver a cargar el mismo enlace en la misma clave (como dentro de `reexport`) se omite.',
      'Funcionan las plantillas de filtro, fx y marco. Las plantillas de tema, las plantillas de relleno (`_dummy`), los efectos de shader con imágenes propias y los efectos de fotogramas alfa todavía no son compatibles y fallan al cargar.',
    ],
  },
  xytrender: {
    summary: 'Aplica una plantilla de VivaVideo cargada con `loadxyt`: primero sus propios shaders y luego sus marcos.',
    args: {
      MEDIA_KEY: MEDIA,
      XYT_KEY: 'una plantilla de `loadxyt`',
    },
    results: [
      'La última imagen o vídeo pasada por la plantilla.',
    ],
    notes: [
      'Las imágenes, los gifs y los vídeos siguen siendo lo que son (un vídeo mantiene su audio). Los fotogramas clave de la plantilla se reproducen a lo largo de la duración de la multimedia, y una plantilla que se mueve convierte una imagen fija en un gif de una reproducción de ella (como mucho 10 segundos).',
      'Una plantilla de marco dibuja sus imágenes a través de sus máscaras sobre la multimedia, giradas un cuarto de vuelta cuando son verticales sobre multimedia horizontal (o al revés), apareciendo y desapareciendo cada una a su ritmo.',
      'Los shaders tienen que ser GLSL ES 1.00 dentro de sus límites (bucles con contador, índices de array constantes). Uno que no lo sea, o que no compile, da un error con el motivo.',
      'Fuera de los tags, el bot tiene lo mismo con el comando `.xyt` (primero el .xyt adjunto o su URL, y luego la multimedia) y con `/media-iv-filter xyt`.',
    ],
  },
  loadcube: {
    summary: 'Carga una LUT de color 3D `.cube` para `applylut` o para el filtro `lut3d` de la acción `ffmpeg`.',
    args: {
      URL: 'enlace al archivo `.cube`, o `FILE_1`, `FILE_2`... para archivos adjuntos',
      CUBE_KEY: 'el nombre con el que usarlo; solo letras, números y _',
    },
    results: [
      'Etalona el color del vídeo con la LUT.',
    ],
    notes: [
      'Aplícala con `applylut MEDIA_KEY CUBE_KEY`, o como `lut3d=CUBE_KEY.cube` (o `lut3d=file=CUBE_KEY.cube:interp=tetrahedral`) en `ffmpeg`.',
      'Solo LUTs 3D, con `LUT_3D_SIZE` de hasta 65 y archivos de hasta 16mb. Como mucho 10 por script.',
      'Las claves de cube son independientes de las claves de multimedia; un cube no se puede usar como multimedia.',
    ],
  },
  render: {
    summary: 'Termina el script y envía la multimedia como resultado, opcionalmente convertida a otro formato.',
    args: {
      MEDIA_KEY: 'la multimedia que enviar',
      MIMETYPE: 'el formato en el que guardar; omítelo (o usa `default`) para mantener el actual',
      FILENAME: 'nombre opcional para el archivo de salida; escribe `default` como mimetype para mantener el formato y aun así ponerle nombre',
    },
    results: [
      'Envía la multimedia en su propio formato, con el nombre "cake".',
    ],
    notes: [
      'Todo lo que vaya después de `render` se ignora.',
      'Si un script no tiene `render`, la primera clave de multimedia creada se renderiza automáticamente.',
    ],
  },
  convert: {
    summary: 'Convierte la multimedia a otro formato sin terminar el script.',
    args: {
      MEDIA_KEY: MEDIA,
      MIMETYPE: 'el formato al que convertir',
    },
  },
  clone: {
    summary: 'Copia una clave de multimedia en una clave nueva, para que puedas editar una y conservar la original.',
    args: {
      MEDIA_KEY: 'la multimedia que copiar',
      MEDIA_KEY_2: 'el nombre de la copia',
    },
  },
  bitrate: {
    summary: 'Fija la tasa de bits del vídeo y del audio, sobre todo para que los archivos ocupen menos (o se vean más machacados).',
    args: {
      MEDIA_KEY: MEDIA,
      VIDEO: 'tasa de bits del vídeo en bits por segundo',
      AUDIO: 'tasa de bits del audio en bits por segundo',
    },
  },
  togif: {
    summary: 'Convierte la multimedia en un GIF, reduciéndola y bajando los fotogramas por segundo si hace falta.',
    args: {
      MEDIA_KEY: MEDIA,
    },
  },

  foreachframe: {
    summary: 'Ejecuta código de MediaScript una vez por cada fotograma de un rango.',
    args: {
      MEDIA_KEY: 'la multimedia cuyos fotogramas recorrer',
      START: 'primer fotograma (incluido)',
      END: 'se detiene antes de este fotograma (no incluido)',
      MEDIASCRIPTCODE: 'el código que ejecutar, codificado en JSON con `{jsonify:}` si tiene más de una línea',
    },
    results: [
      'Da a cada fotograma del avatar un tono al azar.',
    ],
    notes: [
      'El fotograma actual es la clave de multimedia `MEDIA_KEYx` (p. ej. `pfpx`), e `idx` es el número de fotograma. Usar el propio `MEDIA_KEY` dentro es un error.',
      'No uses dentro del bucle comandos que conviertan una imagen fija en un GIF; cada fotograma tiene que seguir siendo una sola imagen.',
      'Las variables y las claves de multimedia nuevas creadas dentro del bucle se descartan cuando termina. No se permite `render` dentro.',
    ],
  },
  dobetween: {
    summary: 'Ejecuta código de MediaScript solo en un tramo de tiempo, y luego lo vuelve a coser en su sitio.',
    args: {
      MEDIA_KEY: MEDIA,
      START: 'momento de inicio en segundos',
      END: 'momento de fin en segundos',
      MEDIASCRIPTCODE: 'el código que ejecutar, codificado en JSON con `{jsonify:}`',
    },
    results: [
      'Invierte y aplica deepfry solo a los segundos 2 a 4 del vídeo.',
    ],
    notes: [
      'El tramo está disponible como `MEDIA_KEYx`. Usar el propio `MEDIA_KEY` dentro es un error.',
      LOOP_DISCARD,
    ],
  },
  reexport: {
    summary: 'Ejecuta código sobre un clip una y otra vez, cada vez sobre el último resultado, y luego une todos los resultados (exportaciones al estilo IHTX).',
    args: {
      MEDIA_KEY: MEDIA,
      AMOUNT: 'cuántas exportaciones; si es negativo, las une al revés',
      LENGTH: 'segundos desde el principio que usar, y también la duración de cada exportación',
      NO_TRIM: 'conserva las exportaciones que salieron más largas que LENGTH; solo funciona como `NO_TRIM=true`',
      MEDIASCRIPTCODE: 'el código que ejecutar en cada exportación, codificado en JSON con `{jsonify:}`',
    },
    results: [
      '20 exportaciones de los primeros 0,46 segundos, cada una invertida, con el tono de color cambiado y el tono de audio subido respecto a la anterior.',
      '10 exportaciones unidas de la última a la primera.',
    ],
    notes: [
      'La exportación que se está haciendo es `MEDIA_KEYx`, e `idx` es su número (1, 2, 3...). Usar el propio `MEDIA_KEY` dentro es un error.',
      'El audio de cada exportación se corta o se rellena hasta la duración de su vídeo antes de unirlas, así que sigue sincronizado (no hace falta `sync+`).',
      'Las líneas del código cuentan una vez por exportación para el límite de 300 líneas, y cada `ffmpeg` que contenga cuenta para el límite de `ffmpeg`.',
      LOOP_DISCARD,
    ],
  },
  if: {
    summary: 'Ejecuta código de MediaScript solo cuando una comparación es cierta.',
    args: {
      LEFT: 'un número o una ecuación (sin espacios)',
      OPERATOR: 'cómo comparar',
      RIGHT: 'un número o una ecuación (sin espacios)',
      MEDIASCRIPTCODE: 'el código que ejecutar, codificado en JSON con `{jsonify:}` si tiene más de una línea',
    },
    results: [
      'Invierte la multimedia solo si es un vídeo, y la reduce a la mitad si mide más de 1000px de ancho.',
    ],
    notes: [
      'Las dos expresiones y el operador tienen que ir separados por espacios, p. ej. `if 2 == 2`.',
      'Los dos lados se comparan como números decimales.',
    ],
  },
  set: {
    summary: 'Guarda un número en una variable que puedes usar en ecuaciones posteriores.',
    args: {
      VARIABLE_NAME: 'solo letras, dígitos y guiones bajos',
      VALUE: 'un número o una ecuación',
    },
    results: [
      'Recorta la imagen en un cuadrado.',
    ],
  },
  get: {
    summary: 'Copia una propiedad de una clave de multimedia en una variable.',
    args: {
      MEDIA_KEY: 'la multimedia de la que leer',
      PROPERTY: 'qué leer',
      VARIABLE_NAME: 'la variable en la que guardarlo',
    },
    notes: [
      'Normalmente no te hace falta: `KEYw`, `KEYh`, `KEYd` y `KEYfc` siempre están disponibles.',
    ],
  },
  export: {
    summary: 'Envía una variable de MediaScript de vuelta a TagScript, que después se puede leer con `{get:}`.',
    args: {
      VARIABLE_NAME: 'la variable de MediaScript que exportar',
      VARIABLE_NAME_ALIAS: 'el nombre de variable de TagScript que usar en su lugar',
    },
    results: [
      'Muestra cuántos fotogramas tiene la multimedia.',
    ],
  },
  exportmultiple: {
    summary: 'Envía varias variables de MediaScript de vuelta a TagScript a la vez.',
    args: {
      VARIABLE_NAMES: 'nombres de variable separados por espacios',
    },
  },
};
