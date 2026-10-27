// The Portuguese (Brazil) FAQ, keyed by the ids in faq.ts (same markup). A question missing here shows in English.

import type { FaqTranslation } from './faq';


export const FAQ_PORTUGUESE: FaqTranslation = {
  sections: {
    start: {title: 'Primeiros passos', description: 'Adicionar o bot e usar seu primeiro comando.'},
    commands: {title: 'Comandos e mídia', description: 'Imagens, vídeos, downloads e limites de arquivos.'},
    server: {title: 'Configurar o servidor', description: 'Prefixos, permissões, restrições e registros.'},
    premium: {title: 'Premium e IA', description: 'Os planos do NotSoPremium e o NotSoAI.'},
    privacy: {title: 'Privacidade e suporte', description: 'Seus dados e onde pedir ajuda.'},
  },
  questions: {
    // primeiros passos
    'add-to-server': {
      question: 'Como adiciono o NotSoBot ao meu servidor?',
      answer: 'Use o botão [Adicionar ao Discord](/invite) e escolha seu servidor. Você precisa da permissão **Gerenciar servidor** nesse servidor para adicionar bots.\n\nDepois que ele entrar, teste `.help` ou digite `/` em qualquer canal para ver os comandos de barra dele.',
    },
    'use-without-server': {
      question: 'Posso usar o NotSoBot sem adicioná-lo a um servidor?',
      answer: 'Sim. Você pode adicionar o NotSoBot à sua conta do Discord em vez de a um servidor. Os comandos de barra e os do menu do botão direito (como **Download** ou **OCR** numa mensagem) vão funcionar em DMs e em servidores que permitem apps externos.\n\nComandos com prefixo como `.magik` só funcionam em servidores onde o bot foi adicionado.',
    },
    'how-to-run-commands': {
      question: 'Como uso um comando?',
      answer: 'Tem três jeitos:\n\n- Digite o prefixo e o nome do comando, como `.magik` (o prefixo padrão é `.`)\n- Mencione o bot em vez de usar um prefixo, como `@NotSoBot magik`\n- Use os comandos de barra digitando `/` e escolhendo um\n\nA [lista de comandos](/commands) mostra todos os comandos, como usá-los e exemplos.',
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
      answer: 'Sim, com `.pipe`. Separe os comandos com ponto e vírgula, por exemplo `.pipe flip; flop`. Dá para encadear até 5 comandos, e cada um é aplicado sobre o resultado do anterior.',
    },
    'download-videos': {
      question: 'Como baixo um vídeo do TikTok, Instagram, YouTube etc.?',
      answer: 'Use `.download <url>` ou `/download`. Você também pode clicar com o botão direito (ou segurar) numa mensagem com um link e escolher **Apps → Download**.\n\nPara mudar a qualidade de vídeo padrão dos seus downloads, use `/settings set download-quality`.',
    },
    'files-as-links': {
      question: 'Por que recebi um link em vez de um arquivo?',
      answer: 'Quando um resultado é maior do que o Discord deixa o bot enviar, o NotSoBot hospeda ele no [nsb.gg](https://nsb.gg) e te manda um link. Esses links são temporários: duram 14 dias, ou 28 com o NotSoPremium.\n\nVocê pode controlar quando isso acontece com `/settings set file-upload-threshold` e `/settings set file-upload-type`.',
    },
    'undo': {
      question: 'Como apago a resposta do bot ao meu comando?',
      answer: 'Use `.undo` no mesmo canal para tirar as respostas do bot ao seu último comando, ou `.undo 5` para os últimos cinco.',
    },
    'nsfw': {
      question: 'Por que meu resultado foi bloqueado, ou por que não posso usar comandos NSFW?',
      answer: 'Os comandos NSFW só funcionam em canais marcados como **com restrição de idade**. Nos outros canais, o NotSoBot verifica o que gera e bloqueia qualquer coisa que possa ser NSFW. As pesquisas usam o SafeSearch, a não ser que o canal tenha restrição de idade.\n\nPara permitir resultados NSFW, um administrador precisa marcar o canal com restrição de idade nas configurações do canal.',
    },

    // configurar o servidor
    'change-prefix': {
      question: 'Como mudo o prefixo do bot?',
      answer: 'Use `.prefixes add <prefixo>` para adicionar um, `.prefixes replace <prefixo>` para trocar todos por um novo e `.prefixes remove <prefixo>` para tirar um. Eles precisam da permissão **Gerenciar servidor**.\n\nAssim que um servidor tem prefixos personalizados, o `.` padrão para de funcionar lá. Mencionar o bot sempre funciona, então `@NotSoBot prefixes` mostra quais estão ativos.',
    },
    'restrict-channels': {
      question: 'Como limito o NotSoBot a certos canais, cargos ou usuários?',
      answer: 'Use regras (`.rules` ou `/server rules`). As regras que cobrem todos os comandos precisam de **Administrador**:\n\n- `.rules block everything` e depois `.rules allow everything -channels bot-commands`: o bot só responde no #bot-commands\n- `.rules block everything -channels general -roles Muted`: o bot ignora o #general e o cargo Muted\n\nA regra mais específica vence: um usuário vence um cargo, um cargo vence um canal e um canal vence o servidor inteiro. Use `.rules` para ver todas, ou `.rules check <comando>` para ver qual regra decide.',
    },
    'disable-command': {
      question: 'Como desativo um comando ou uma categoria específica?',
      answer: 'Use `.rules block <comando ou categoria>`, por exemplo `.rules block rule34` ou `.rules block category:fun`. Adicione `-channels` para desativar só em certos canais, e `-message` para dizer às pessoas aonde ir: `.rules block fun -channels general -message Os comandos de diversão vão no #bots`. Precisa da permissão **Gerenciar servidor**.',
    },
    'loggers': {
      question: 'O NotSoBot pode registrar o que acontece no meu servidor?',
      answer: 'Sim. Configure registros de banimentos, canais, membros, mensagens, cargos, usuários e voz, por exemplo `.loggers add messages -channel message-logs`. Use `.loggers` para ver o que está sendo registrado e onde.',
    },
    'language': {
      question: 'O NotSoBot pode responder no meu idioma?',
      answer: 'Sim, ele está disponível em 33 idiomas. Use `/settings set locale` para escolher o seu, ou `/settings-server set locale` para definir o idioma padrão do servidor.',
    },

    // premium e ia
    'premium': {
      question: 'O que é o NotSoPremium?',
      answer: 'O NotSoPremium é uma assinatura opcional comprada pelo Discord, no perfil do NotSoBot. Ele tem três planos:\n\n- **NotSoPremium**: arquivos maiores, mais tempo para cada comando e seus próprios comandos personalizados\n- **NotSoPremium Plus**: tudo isso, e mais 2 vagas de servidor premium e clonagem de voz\n- **NotSoPremium Plus AI**: tudo isso, e mais o NotSoAI\n\nCom o **NotSoPremium Plus** você pode dar o seu premium para até 2 servidores (ou DMs em grupo) com `/settings premium-servers add` ou pela página Premium do painel, para alguns comandos premium funcionarem lá para todos. Ser dono de um servidor não dá premium a ele por si só.',
    },
    'notsoai': {
      question: 'Como converso com o NotSoAI?',
      answer: 'Mencione o bot com uma mensagem, ou responda a uma das mensagens dele, e o NotSoAI vai responder. Precisa do **NotSoPremium Plus AI**, seja o seu ou o de um membro que deu o premium dele ao servidor. Você pode escolher a personalidade dele com `/settings set ai-personality`.',
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
