// The Portuguese (Brazil) FAQ, keyed by the ids in faq.ts (same markup). A question missing here shows in English.

import type { FaqTranslation } from './faq';


export const FAQ_PORTUGUESE: FaqTranslation = {
  sections: {
    start: {title: 'Primeiros passos', description: 'Adicionar o bot e usar seu primeiro comando.'},
    commands: {title: 'Comandos e mídia', description: 'Imagens, vídeos, downloads e limites de arquivos.'},
    server: {title: 'Configurar o servidor', description: 'Prefixos, permissões, restrições e registros.'},
    limits: {title: 'Limites', description: 'Quantas tags, lembretes e configurações de servidor você pode ter.'},
    premium: {title: 'Premium e IA', description: 'Os planos do NotSoPremium e o NotSoAI.'},
    privacy: {title: 'Privacidade e suporte', description: 'Seus dados e onde pedir ajuda.'},
  },
  questions: {
    // primeiros passos
    'add-to-server': {
      question: 'Como adiciono o NotSoBot ao meu servidor?',
      answer: 'Use o botão [Adicionar ao Discord](/invite?src=faq) e escolha seu servidor. Você precisa da permissão **Gerenciar servidor** nesse servidor para adicionar bots.\n\nDepois que ele entrar, digite `/` em qualquer canal para ver os comandos de barra dele, ou teste `@NotSoBot help`.',
    },
    'use-without-server': {
      question: 'Posso usar o NotSoBot sem adicioná-lo a um servidor?',
      answer: 'Sim. Você pode adicionar o NotSoBot à sua conta do Discord em vez de a um servidor. Os comandos de barra e os do menu do botão direito (como **Download** ou **OCR** numa mensagem) vão funcionar em DMs e em servidores que permitem apps externos.\n\nComandos com prefixo como `.magik` só funcionam em servidores onde o bot foi adicionado e nas suas DMs com o NotSoBot.',
    },
    'how-to-run-commands': {
      question: 'Como uso um comando?',
      answer: 'Tem três jeitos:\n\n- Use os comandos de barra digitando `/` e escolhendo um\n- Mencione o bot, como `@NotSoBot magik`\n- Digite o prefixo e o nome do comando, como `.magik` (o prefixo padrão é `.`). Os comandos com prefixo acabam em 1º de janeiro de 2027, porque o Discord exige que bots usem comandos de barra; os outros dois jeitos continuam funcionando\n\nA [lista de comandos](/commands) mostra todos os comandos, como usá-los e exemplos.',
    },
    'not-responding': {
      question: 'O bot não responde aos meus comandos. O que houve?',
      answer: 'Normalmente é uma destas coisas:\n\n- **Faltam permissões.** O NotSoBot precisa de Ver canal, Enviar mensagens, Inserir links, Anexar arquivos e Ver histórico de mensagens nesse canal. Use `/help-permissions-check` para ver o que falta.\n- **Outro prefixo.** O servidor pode ter definido um prefixo personalizado, que substitui o `.`. Mencione o bot (`@NotSoBot prefixes`) para ver quais estão ativos.\n- **O canal, seu cargo ou o comando estão restritos.** Os administradores podem limitar onde e quem usa o bot (veja [Configurar o servidor](#section-server)).',
    },

    // comandos e mídia
    'image-input': {
      question: 'Como uso um comando de imagem com uma foto específica?',
      answer: 'Os comandos de imagem e vídeo pegam o que vão editar daqui, nesta ordem de preferência:\n\n- Um arquivo anexado à sua mensagem\n- Uma mensagem que você está respondendo\n- Um link, um emoji personalizado ou um usuário (para o avatar dele), como `.magik @alguem`\n\nSe você não passar nada, o NotSoBot usa a imagem ou o vídeo mais recente do canal.',
    },
    'chain-effects': {
      question: 'Posso aplicar vários efeitos de uma vez?',
      answer: 'Sim, com `/media-aiv pipe` (ou `.pipe`). Separe os comandos com ponto e vírgula, por exemplo `/media-aiv pipe commands:flip; flop` ou `.pipe flip; flop`. Dá para encadear até 10 comandos, ou 5 se algum precisar rodar sozinho, e cada um é aplicado sobre o resultado do anterior.',
    },
    'download-videos': {
      question: 'Como baixo um vídeo do TikTok, Instagram, YouTube etc.?',
      answer: 'Use `/download` com o link, ou clique com o botão direito (ou segure) numa mensagem com um link e escolha **Apps → Download**. Com prefixo é `.download <url>`.\n\nPara mudar a qualidade de vídeo padrão dos seus downloads, use `/settings set download-quality`.',
    },
    'files-as-links': {
      question: 'Por que recebi um link em vez de um arquivo?',
      answer: 'Quando um resultado é maior do que o Discord deixa o bot enviar, o NotSoBot hospeda ele no [nsb.gg](https://nsb.gg) e te manda um link. Esses links são temporários: duram 14 dias, ou até 28 com o NotSoPremium.\n\nVocê pode controlar quando isso acontece com `/settings set file-upload-threshold` e `/settings set file-upload-type`.',
    },
    'undo': {
      question: 'Como apago a resposta do bot ao meu comando?',
      answer: 'Use `/undo` no mesmo canal para tirar as respostas do bot ao seu último comando, ou `/undo amount:5` para os últimos cinco. Com prefixo é `.undo` (ou `.undo 5`).',
    },
    'nsfw': {
      question: 'Por que meu resultado foi bloqueado, ou por que não posso usar comandos NSFW?',
      answer: 'O NotSoBot verifica o que gera em todos os canais, incluindo os com restrição de idade e as DMs, e bloqueia qualquer coisa que possa ser NSFW. As pesquisas sempre usam o SafeSearch.\n\nOs comandos NSFW foram removidos, então marcar um canal com restrição de idade não muda mais isso. Se você acha que um resultado foi bloqueado por engano, conte para a gente no [servidor de suporte](/support).',
    },

    // configurar o servidor
    'change-prefix': {
      question: 'Como mudo o prefixo do bot?',
      answer: 'Use `/server prefixes add` para adicionar um, `/server prefixes replace` para trocar todos por um novo e `/server prefixes remove` para tirar um. Eles precisam da permissão **Gerenciar servidor**. Com prefixo são `.prefixes add <prefixo>`, `.prefixes replace <prefixo>` e `.prefixes remove <prefixo>`.\n\nAssim que um servidor tem prefixos personalizados, o `.` padrão para de funcionar lá. `/server prefixes list` e `@NotSoBot prefixes` mostram quais estão ativos.\n\nTodos os prefixos, inclusive os personalizados, param de funcionar em 1º de janeiro de 2027, porque o Discord exige que bots usem comandos de barra. Os comandos de barra e mencionar o bot continuam funcionando depois disso.',
    },
    'restrict-channels': {
      question: 'Como limito o NotSoBot a certos canais, cargos ou usuários?',
      answer: 'Use regras, com `/server-rules` (ou `.rules`). As regras que cobrem todos os comandos precisam de **Administrador**:\n\n- `/server-rules add action:Block target:everything` e depois `/server-rules add action:Allow target:everything channels:#bot-commands`: o bot só responde no #bot-commands. Com prefixo: `.rules block everything` e depois `.rules allow everything -channels bot-commands`\n- `/server-rules add action:Block target:everything channels:#general roles:@Muted`: o bot ignora o #general e o cargo Muted. Com prefixo: `.rules block everything -channels general -roles Muted`\n\nA regra mais específica vence: um usuário vence um cargo, um cargo vence um canal e um canal vence o servidor inteiro. Use `/server-rules list` (ou `.rules`) para ver todas, ou `/server-rules check` (ou `.rules check <comando>`) para ver qual regra decide.',
    },
    'disable-command': {
      question: 'Como desativo um comando ou uma categoria específica?',
      answer: 'Use `/server-rules add` com a ação Block e o comando ou a categoria como alvo, por exemplo `/server-rules add action:Block target:magik` ou `/server-rules add action:Block target:category:fun`. Preencha `channels` para desativar só em certos canais, e `message` para dizer às pessoas aonde ir. Precisa da permissão **Gerenciar servidor**.\n\nCom prefixo é `.rules block <comando ou categoria>`, por exemplo `.rules block magik` ou `.rules block category:fun`, com `-channels` e `-message` para o mesmo: `.rules block fun -channels general -message Os comandos de diversão vão no #bots`.',
    },
    'loggers': {
      question: 'O NotSoBot pode registrar o que acontece no meu servidor?',
      answer: 'Sim. Configure registros de banimentos, canais, membros, mensagens, cargos, usuários, voz, moderação (advertências), denúncias e do canal isca, por exemplo `/server loggers add type:Messages channel:#message-logs` (ou `.loggers add messages -channel message-logs`). Use `/server loggers list` (ou `.loggers`) para ver o que está sendo registrado e onde.',
    },
    'language': {
      question: 'O NotSoBot pode responder no meu idioma?',
      answer: 'Sim, ele está disponível em 33 idiomas. Use `/settings set locale` para escolher o seu, ou `/server set locale` para definir o idioma padrão do servidor.',
    },

    // limites
    'limit-tags': {
      question: 'Quantas tags posso criar?',
      answer: 'Você pode ter até **100.000** tags no total, e até **10.000** delas em um mesmo servidor. Um servidor pode ter até **500.000** tags de todos os seus membros, e até **300** delas podem ser comandos personalizados.\n\nCada tag também pode guardar até **5** variáveis e **1** blob (de no máximo 256 KB) por escopo: global, servidor, canal e usuário.',
    },
    'limit-reminders': {
      question: 'Quantos lembretes posso ter?',
      answer: 'Até **300** ao mesmo tempo, e até **100** deles em um mesmo servidor.\n\nVocê só pode criar **10** lembretes para mais ou menos o mesmo horário (com menos de um minuto entre eles), e **5** em um mesmo servidor.',
    },
    'limit-server': {
      question: 'Quais são os limites das configurações do servidor?',
      answer: '- **Prefixos:** 10\n- **Regras:** 500\n- **Registros:** 3 de cada tipo (2 de mensagens e 2 de usuários), 25 no total\n- **Comandos personalizados:** 300\n- **Advertências:** 100 ativas por membro, e até 10 membros em um só `warn`\n- **Ações de advertência:** 10 etapas\n- **Regras de advertência automática:** 20\n- **Banimentos temporários:** 200 esperando para serem removidos',
    },
    'limit-premium': {
      question: 'O premium aumenta esses limites?',
      answer: 'Não, os limites acima são iguais para todos. O NotSoPremium aumenta os de mídia: tamanho de arquivo, tempo por comando, quadros animados e fontes salvas. O NotSoPremium Plus e o Max dão mais vozes clonadas, e um servidor com uma vaga de servidor premium tem uma fila de música maior. A [página do Premium](/premium) mostra cada um por nível.',
    },

    // premium e ia
    'premium': {
      question: 'O que é o NotSoPremium?',
      answer: 'O NotSoPremium é uma assinatura opcional comprada pelo Discord, no perfil do NotSoBot. Ele tem três planos:\n\n- **NotSoPremium**: arquivos maiores, mais tempo para cada comando e seus próprios comandos personalizados\n- **NotSoPremium Plus**: tudo isso, e mais 2 vagas de servidor premium, mais vozes clonadas e NotSoCredits toda semana para o NotSoAI\n- **NotSoPremium Max**: tudo isso, com o dobro de NotSoCredits, e os que você não usar acumulam\n\nCom o **NotSoPremium Plus** ou o **Max** você pode dar o seu premium para até 2 servidores (ou DMs em grupo) com `/settings premium-servers add` ou pela página Premium do painel, para alguns comandos premium funcionarem lá para todos. Ser dono de um servidor não dá premium a ele por si só.\n\nA [página do Premium](/premium) compara todos os planos.',
    },
    'notsoai': {
      question: 'Como converso com o NotSoAI?',
      answer: 'Mencione o bot com uma mensagem, ou responda a uma das mensagens dele, e o NotSoAI vai responder. Ele funciona com NotSoCredits: o **NotSoPremium Plus** e o **Max** vêm com alguns toda semana (o Max, com o dobro), um servidor recebe alguns de cada vaga de servidor premium Max nele, e qualquer um pode comprar um pacote de créditos na loja para usar sem assinar (ou dar alguns a um servidor com `/settings credits give`). Veja a [página do Premium](/premium) para saber quanto eles rendem. Você pode escolher a personalidade dele com `/settings set ai-personality`.',
    },

    // privacidade e suporte
    'data': {
      question: 'Que dados o NotSoBot guarda sobre mim?',
      answer: 'Seu perfil básico do Discord (ID, nome de usuário, avatar), as configurações que você escolher, as tags que você criar e registros de quais comandos você usa. A [Política de privacidade](/legal/privacy) tem os detalhes.',
    },
    'delete-data': {
      question: 'Como faço para apagarem meus dados?',
      answer: 'Entre no [painel](/dashboard/settings#your-data) e use **Excluir meus dados** no fim das suas configurações. Você também pode escrever para [privacy@notsocompany.com](mailto:privacy@notsocompany.com) de um endereço que você possa verificar, incluindo o seu ID de usuário do Discord.',
    },
    'support': {
      question: 'Onde reporto um bug ou peço mais ajuda?',
      answer: 'Entre no [servidor de suporte](/support) e pergunte lá. Inclua o comando que você usou e o que aconteceu, e uma captura de tela se puder.',
    },
    'created': {
      question: 'Quando o NotSoBot foi criado?',
      answer: 'Em 16 de abril de 2016.',
    },
  },
};
