import type { TagDocsTranslation } from '../localize';


export const CATEGORIES_SPANISH: TagDocsTranslation['categories'] = {
  arguments: {title: 'Argumentos', description: 'Lee lo que se le pasó al tag.'},
  user: {title: 'Usuarios', description: 'Quien ejecuta el tag, o cualquier otra persona.'},
  server: {title: 'Servidores y canales', description: 'Información sobre dónde se está ejecutando el tag.'},
  message: {title: 'Mensajes', description: 'El mensaje que ejecuta el tag y el mensaje al que responde.'},
  variables: {title: 'Variables y almacenamiento', description: 'Recuerda valores durante esta ejecución o guárdalos entre ejecuciones.'},
  logic: {title: 'Lógica y control de flujo', description: 'Condiciones, bucles y terminar antes de tiempo.'},
  math: {title: 'Matemáticas', description: 'Aritmética y utilidades para números.'},
  strings: {title: 'Texto', description: 'Cambia, busca y mide texto.'},
  markup: {title: 'Markdown de Discord', description: 'Envuelve texto con el formato de Discord.'},
  rng: {title: 'Aleatoriedad', description: 'Elecciones, números e IDs al azar.'},
  media: {title: 'Multimedia', description: 'Busca, adjunta y edita imágenes, audio y vídeo.'},
  ai: {title: 'IA', description: 'Genera texto e imágenes, y lee lo que contienen.'},
  search: {title: 'Búsqueda', description: 'Busca en la web desde un tag.'},
  network: {title: 'Red', description: 'Descarga páginas y llama a APIs.'},
  output: {title: 'Salida', description: 'Embeds, botones, páginas y archivos adjuntos a la respuesta.'},
  json: {title: 'JSON', description: 'Objetos de Discord como JSON, y lectura de JSON.'},
  tags: {title: 'Tags', description: 'Ejecuta otros tags y lee información de tags.'},
  time: {title: 'Tiempo', description: 'Marcas de tiempo y fechas.'},
  meta: {title: 'Varios', description: 'Todo lo demás.'},
};


export const MEDIASCRIPT_CATEGORIES_SPANISH: TagDocsTranslation['mediaScriptCategories'] = {
  io: {title: 'Cargar y renderizar', description: 'Trae multimedia, cópiala, conviértela y devuélvela.'},
  flow: {title: 'Lógica, bucles y variables', description: 'Bucles por fotograma, condiciones y números que puedes compartir con TagScript.'},
  generate: {title: 'Crear multimedia', description: 'Crea imágenes y audio nuevos desde cero, a partir de texto, con IA o desde la web.'},
  text: {title: 'Texto y subtítulos', description: 'Pon palabras sobre la multimedia.'},
  size: {title: 'Tamaño, recorte y rotación', description: 'Redimensiona, recorta, voltea y recoloca.'},
  time: {title: 'Tiempo y fotogramas', description: 'Recorta, repite, acelera, invierte y controla los fotogramas.'},
  compose: {title: 'Combinar y enmascarar', description: 'Superpón, une y recorta multimedia.'},
  color: {title: 'Color', description: 'Brillo, tono, tintes y trucos con canales.'},
  filters: {title: 'Filtros', description: 'Desenfoques, deepfry, estilos artísticos y glitches.'},
  distort: {title: 'Distorsionar y animar', description: 'Deforma, refleja, gira y sacude.'},
  audio: {title: 'Audio', description: 'Tono, efectos, volumen y mezcla de pistas de audio.'},
};
