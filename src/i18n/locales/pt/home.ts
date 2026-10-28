import type { Home as English } from '../en/home';


export const Home: Record<keyof typeof English, string> = {
  'home.hero.title_1': 'Edição de mídia,',
  'home.hero.title_2': 'direto no Discord',
  'home.hero.description': 'O NotSoBot distorce, frita, coloca legenda, converte e remixa tudo o que você mandar. Ele também toca música, modera seu servidor, conversa com IA e fala em canais de voz.',
  'home.hero.quote': '"Simplesmente funciona" - kyle',
  'home.view_commands': 'Ver comandos',
  'home.compare.label': 'Efeito para visualizar',

  'home.features.title': 'O que ele faz?',
  'home.features.description': 'Se é uma imagem, um gif, um vídeo ou um som, tem um comando para bagunçar com ele.',
  'home.gallery.alt': 'Resultado de {command}',
  'home.gallery.more': 'Mostrar outros comandos',
  'home.features.audio.title': 'Áudio',
  'home.features.audio.description': 'Aumente o grave, mude o tom, desacelere, extraia o áudio de vídeos ou coloque uma trilha nova num clipe.',
  'home.features.conversion.title': 'Conversão',
  'home.features.conversion.description': 'Transforme vídeos em gifs e gifs em vídeos, redimensione, corte e comprima mídia para caber nos limites de envio do Discord.',
  'home.features.search.title': 'Pesquisa',
  'home.features.search.description': 'Busque imagens e resultados no Google, YouTube, Urban Dictionary, Wolfram Alpha e mais sem sair do chat.',
  'home.features.tags.title': 'Tags personalizadas',
  'home.features.tags.description': 'Encadeie comandos nas suas próprias tags, ou pegue tags feitas pela comunidade no diretório de tags.',
  'home.features.music.title': 'Música',
  'home.features.music.description': 'Toque músicas e links em canais de voz com uma fila compartilhada, efeitos ao vivo, modo DJ e votação para pular. Grátis em todos os servidores.',
  'home.features.moderation.title': 'Moderação',
  'home.features.moderation.description': 'Advirta, silencie, expulse e bana, limpe o chat, registre o que acontece, receba denúncias dos membros e decida quem pode usar cada comando.',
  'home.features.ai.title': 'IA',
  'home.features.ai.description': 'Pergunte qualquer coisa ao NotSoAI (ele lembra do que você conta), crie e edite imagens, e transcreva ou traduza áudio e texto.',
  'home.features.tts.title': 'Texto para fala',
  'home.features.tts.description': 'Faça o NotSoBot ler texto no seu canal de voz, com a voz que você escolher.',
  'home.features.voices.title': 'Clonagem de voz',
  'home.features.voices.description': 'Clone uma voz a partir de um clipe de áudio ou vídeo e faça o NotSoBot falar com ela no texto para fala.',
  // tier names, same as the dashboard's `premium_type.*` (not loaded on this page)
  'home.features.premium_plus': 'Premium+',
  'home.features.premium_plus_ai': 'Premium+ AI',

  'home.steps.title': 'Como funciona',
  'home.steps.post.title': 'Mande uma mídia',
  'home.steps.post.description': 'Envie uma imagem, gif ou vídeo, cole um link ou mencione um usuário para usar o avatar dele.',
  'home.steps.run.title': 'Use um comando',
  'home.steps.run.description': 'Use um comando com prefixo ou de barra, ou clique com o botão direito numa mensagem e escolha um efeito no menu de apps.',
  'home.steps.result.title': 'Receba o resultado',
  'home.steps.result.description': 'O NotSoBot responde com o resultado em segundos, pronto para postar, salvar ou passar por outro efeito.',

  'home.stats.servers': 'Servidores',
  'home.stats.users': 'Usuários',
  'home.stats.commands': 'Comandos',

  'home.cta.title': 'Adicione o NotSoBot ao seu servidor',
  'home.cta.description': 'Edite imagens, gifs e vídeos sem sair do chat. A configuração leva uns dez segundos.',
};
