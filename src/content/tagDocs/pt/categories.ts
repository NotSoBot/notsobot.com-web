import type { TagDocsTranslation } from '../localize';


export const CATEGORIES_PORTUGUESE: TagDocsTranslation['categories'] = {
  arguments: {title: 'Argumentos', description: 'Leia o que foi passado para a tag.'},
  user: {title: 'Usuários', description: 'Quem executa a tag, ou qualquer outra pessoa.'},
  server: {title: 'Servidores e canais', description: 'Informações sobre onde a tag está sendo executada.'},
  message: {title: 'Mensagens', description: 'A mensagem que executou a tag e a mensagem que ela responde.'},
  variables: {title: 'Variáveis e armazenamento', description: 'Lembre valores durante esta execução, ou guarde-os entre execuções.'},
  logic: {title: 'Lógica e controle de fluxo', description: 'Condições, loops e parar antes da hora.'},
  math: {title: 'Matemática', description: 'Aritmética e utilitários para números.'},
  strings: {title: 'Texto', description: 'Altere, pesquise e meça textos.'},
  markup: {title: 'Markdown do Discord', description: 'Envolva textos com a formatação do Discord.'},
  rng: {title: 'Aleatoriedade', description: 'Escolhas, números e IDs aleatórios.'},
  media: {title: 'Mídia', description: 'Encontre, anexe e edite imagens, áudio e vídeo.'},
  ai: {title: 'IA', description: 'Gere textos e imagens, e leia o que há neles.'},
  search: {title: 'Pesquisa', description: 'Pesquise na web a partir de uma tag.'},
  network: {title: 'Rede', description: 'Baixe páginas e chame APIs.'},
  output: {title: 'Saída', description: 'Embeds, botões, páginas e arquivos anexados à resposta.'},
  json: {title: 'JSON', description: 'Objetos do Discord como JSON, e leitura de JSON.'},
  tags: {title: 'Tags', description: 'Execute outras tags e leia informações de tags.'},
  time: {title: 'Tempo', description: 'Timestamps e datas.'},
  meta: {title: 'Diversos', description: 'Todo o resto.'},
};


export const MEDIASCRIPT_CATEGORIES_PORTUGUESE: TagDocsTranslation['mediaScriptCategories'] = {
  io: {title: 'Carregar e renderizar', description: 'Traga mídia, copie, converta e devolva.'},
  flow: {title: 'Lógica, loops e variáveis', description: 'Loops por quadro, condições e números que você pode compartilhar com o TagScript.'},
  generate: {title: 'Criar mídia', description: 'Crie imagens e áudio novos do zero, a partir de texto, com IA ou da web.'},
  text: {title: 'Texto e legendas', description: 'Coloque palavras na mídia.'},
  size: {title: 'Tamanho, corte e rotação', description: 'Redimensione, corte, inverta e reposicione.'},
  time: {title: 'Tempo e quadros', description: 'Corte, repita, acelere, inverta e controle os quadros.'},
  compose: {title: 'Combinar e mascarar', description: 'Sobreponha, junte e recorte mídia.'},
  color: {title: 'Cor', description: 'Brilho, matiz, tons e truques com canais.'},
  filters: {title: 'Filtros', description: 'Desfoques, deepfry, estilos artísticos e glitches.'},
  distort: {title: 'Distorcer e animar', description: 'Deforme, espelhe, gire e sacuda.'},
  audio: {title: 'Áudio', description: 'Tom, efeitos, volume e mixagem de faixas de áudio.'},
};
