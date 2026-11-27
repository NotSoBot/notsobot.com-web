// The Portuguese guides, following en.ts (same section ids and facts). Button names match the Activity's and the bot's
// Portuguese strings, command names stay in English like the FAQ's. "Flag Guesser" and "Letter Trail" stay as names.

import type { GuideBook } from './types';


export const GUIDES_PORTUGUESE: GuideBook = {
  opening: {
    id: 'opening',
    title: 'Abrir a Atividade',
    blocks: [
      {kind: 'text', text: 'A Atividade do Discord do NotSoBot tem o editor de mídia e os jogos. Ela abre dentro de um canal, e todo mundo ali pode entrar.'},
      {kind: 'list', items: [
        'Use `/games play` para ir direto aos jogos, ou `/editor` para o editor de mídia.',
        'Ou abra o NotSoBot pelo inicializador de apps do Discord e escolha **Editar mídia** ou **Jogos**.',
        'Alguém já está nela? Aperte **Entrar** na mensagem que o NotSoBot publica no canal.',
      ]},
      {kind: 'tip', text: 'Cada jogo e o editor de mídia têm um botão de ponto de interrogação que abre o guia dentro da Atividade.'},
    ],
  },

  guides: {
    'flag-guesser': {
      title: 'Flag Guesser',
      summary: 'Diga de que país é cada bandeira antes que o tempo acabe, juntos na Atividade ou no chat.',
      quick: [
        'Todo mundo vê a mesma bandeira. Diga o país antes que o tempo acabe.',
        'Jogue em uma sala com outras pessoas, ou aperte **Jogar sozinho** para uma partida só sua.',
        'Uma bandeira vale 3 pontos, 2 depois da primeira dica e 1 depois da segunda.',
        'Quem acerta primeiro ganha +1, e 3 ou mais seguidas somam +1.',
        'Digitando: chute quantas vezes quiser. Quatro opções: uma tentativa por bandeira.',
        'Erros de digitação pequenos contam, e um chute perto avisa para conferir a grafia.',
        'Sua pontuação vai para os seus [pontos de jogo](guide:game-points) quando o jogo acaba.',
      ],
      sections: [
        {
          id: 'starting',
          title: 'Começar um jogo',
          blocks: [
            {kind: 'text', text: 'O Flag Guesser é jogado em salas na Atividade do Discord do NotSoBot. Também tem uma versão mais rápida no chat, uma bandeira por vez.'},
            {kind: 'steps', items: [
              'Use `/games play` em um canal, ou abra o NotSoBot pelo inicializador de apps do Discord e escolha **Jogos**.',
              'Na aba Jogos, escolha **Flag Guesser**.',
              'Aperte **Jogar** ou **Assistir** em uma sala, use **Jogo rápido**, crie a sua com **Nova sala**, ou aperte **Jogar sozinho** para jogar sem mais ninguém.',
              'Espere os outros na sala, e o anfitrião aperta **Começar jogo**. Antes da primeira bandeira tem uma contagem de 3 segundos (3, 2, 1), e não dá para responder até ela acabar.',
            ]},
            {kind: 'text', text: 'Está sozinho na sala? Ela oferece **Convide seus amigos**: compartilhe um link ou publique um convite no canal. Ou comece assim mesmo, uma partida funciona com um jogador só.'},
            {kind: 'text', text: 'O NotSoBot costuma publicar também uma mensagem no canal com um botão **Entrar**, para os outros entrarem.'},
            {kind: 'tip', text: 'Jogando `/games flag-guesser` no chat? O botão **Abrir na Atividade** abre uma sala que continua o mesmo jogo: primeiro vem a bandeira que estava na tela, com a mesma dificuldade, respostas digitadas e um minuto por bandeira. As pontuações começam do zero. A rodada no chat termina ali, e a mensagem dela diz quem levou a bandeira.'},
          ],
        },
        {
          id: 'solo',
          title: 'Jogar sozinho',
          blocks: [
            {kind: 'text', text: '**Jogar sozinho** na lista de salas começa uma partida só sua. Ninguém mais vê a sala nem pode entrar.'},
            {kind: 'list', items: [
              'Começa na hora, com as configurações que você usou da última vez que jogou sozinho neste dispositivo. Na primeira vez, usa as configurações padrão.',
              'Não tem contagem: a primeira bandeira aparece assim que a sala abre.',
              'No fim, **Jogar de novo** começa outra partida com as mesmas configurações. **Mudar configurações** leva você para a sala de espera para mudá-las antes.',
              'Uma partida solo não tem espectadores, convites nem configurações de sala. Começar uma nova fecha a anterior.',
              'Seus pontos contam para o seu total como em qualquer outra partida.',
            ]},
          ],
        },
        {
          id: 'rooms',
          title: 'Salas',
          blocks: [
            {kind: 'text', text: 'Todo jogo acontece em uma sala. A lista de salas tem duas abas, cada uma mostrando quantas salas tem:'},
            {kind: 'list', items: [
              '**Este servidor**: as salas criadas no seu servidor, as mesmas na Atividade de cada canal. Em uma DM, as salas criadas nessa DM.',
              '**Global**: salas que aparecem na Atividade de todos os servidores. As pessoas de outros servidores veem seu nome e avatar do Discord, e você vê os delas.',
            ]},
            {kind: 'text', text: 'Busque salas pelo nome, escolha um jogo e ordene por **Enchendo**, **Jogando agora** ou **Mais novas**.'},
            {kind: 'text', text: '**Jogo rápido** coloca você na sala de espera com mais jogadores da aba em que você está. Ele pula salas com senha, salas de só assistir, salas das quais você foi removido e partidas solo. Se não houver nenhuma, cria uma nova para você.'},
            {kind: 'text', text: 'Ao criar uma sala com **Nova sala**, você escolhe:'},
            {kind: 'list', items: [
              'Um nome. Se deixar vazio, ela leva o seu.',
              '**Quem pode achar**: **Este servidor** ou **Global**. Começa na aba em que você está. Quem cria pode trocar depois em **Configurações da sala**, mas só enquanto a sala espera para começar.',
              '**Todos** ou **Senha**. Com senha, só quem sabe a senha pode jogar ou assistir.',
              '**Só assistir**: quem entrar a partir daí só assiste. Você e quem já está jogando continuam jogando.',
            ]},
            {kind: 'tip', text: 'Você pode ter 2 salas abertas em um servidor e 1 sala global ao mesmo tempo, e um servidor tem espaço para 20. Partidas solo não contam. Uma sala some uns 10 minutos depois que todo mundo sai.'},
          ],
        },
        {
          id: 'host',
          title: 'O anfitrião e quem cria a sala',
          blocks: [
            {kind: 'list', items: [
              'O **anfitrião** escolhe as configurações, começa o jogo e pode encerrá-lo antes. Quem criou a sala é o anfitrião enquanto está jogando. Senão, é o primeiro a entrar, e passa para o próximo quando o anfitrião sai.',
              'Quem **cria** a sala pode mudar o nome e a senha, ligar ou desligar só assistir, remover pessoas e fechar a sala.',
              'Em uma sala do servidor, os moderadores do servidor também podem remover pessoas e fechá-la. As salas globais são moderadas por quem as criou e pela equipe do NotSoBot, não pelos moderadores do servidor.',
              'Quem foi removido não pode voltar para aquela sala. Fechar uma sala encerra o jogo e manda todo mundo para a lista de salas.',
            ]},
            {kind: 'tip', text: 'Encerrar um jogo antes leva todo mundo de volta para a sala de espera. Os pontos que cada um já tinha ainda vão para o total.'},
          ],
        },
        {
          id: 'settings',
          title: 'Configurações',
          blocks: [
            {kind: 'text', text: 'Só o anfitrião muda, antes de um jogo começar ou depois que ele acaba.'},
            {kind: 'facts', items: [
              {label: 'Responder', value: '**Digitando** (o padrão): digite o nome do país. **Quatro opções**: escolha um de quatro nomes, uma tentativa por bandeira.'},
              {label: 'Dificuldade', value: '**Fácil**: bandeiras que quase todo mundo conhece. **Média** (o padrão): a maioria dos países do mundo. **Difícil**: todos os países, e também territórios com bandeira própria.'},
              {label: 'Bandeiras', value: 'De 5 a 20 por jogo, 10 por padrão.'},
              {label: 'Segundos cada', value: 'De 10 a 60 por bandeira, 20 por padrão.'},
            ]},
            {kind: 'tip', text: 'Com quatro opções, as respostas erradas costumam ser da mesma parte do mundo, então se parecem.'},
          ],
        },
        {
          id: 'scoring',
          title: 'Pontuação',
          blocks: [
            {kind: 'facts', items: [
              {label: 'Antes de qualquer dica', value: '3 pontos'},
              {label: 'Depois da dica da região', value: '2 pontos'},
              {label: 'Depois da dica das letras', value: '1 ponto'},
              {label: 'O primeiro a acertar', value: '+1'},
              {label: '3 ou mais seguidas', value: '+1 por bandeira'},
            ]},
            {kind: 'text', text: 'Uma sequência conta as bandeiras que você acerta uma atrás da outra. Errou uma, ela recomeça.'},
            {kind: 'text', text: 'Uma bandeira acaba antes quando todos que estão jogando já responderam. Aí a resposta aparece por alguns segundos, com quem acertou. Depois da última bandeira vêm as pontuações finais, e quantos pontos o jogo somou ao seu total.'},
          ],
        },
        {
          id: 'hints',
          title: 'Dicas e chutes perto',
          blocks: [
            {kind: 'list', items: [
              'Quando passa um terço do tempo, aparece a **região**, como Europa ou América do Sul.',
              'Com dois terços do tempo, aparecem as **letras**: a primeira letra de cada palavra e o tamanho dela, como `F _ _ _ _ _`.',
              'Cada dica tira um ponto do que a bandeira vale.',
            ]},
            {kind: 'text', text: 'Digitando, erros pequenos ainda contam. Um chute um pouco mais longe avisa que está perto, para você conferir a grafia. Um erro que fica tão perto de outro país não conta. Errar não custa nada.'},
            {kind: 'text', text: 'Nomes de países em português, inglês e espanhol valem todos, seja qual for o idioma em que você joga.'},
          ],
        },
        {
          id: 'watching',
          title: 'Assistir',
          blocks: [
            {kind: 'list', items: [
              'Quem assiste vê o jogo todo ao vivo, mas não responde. Aperte **Assistir** em uma sala, ou **Só assistir** entre jogos.',
              'Quem assiste pode apertar **Entrar no jogo** para jogar a partir da próxima bandeira, a não ser que a sala seja só para assistir.',
              'Ninguém espera quem assiste, então uma bandeira ainda acaba antes quando todos os jogadores responderam.',
            ]},
          ],
        },
        {
          id: 'invites',
          title: 'Convites',
          blocks: [
            {kind: 'text', text: 'Qualquer um em uma sala pode apertar **Convidar**. **Compartilhar link** manda pelo Discord, e **Publicar neste canal** publica com um botão para entrar. O convite abre a Atividade direto na sala.'},
            {kind: 'list', items: [
              'Ele deixa entrar em uma sala com senha sem a senha.',
              'Quem foi removido da sala continua de fora.',
              'Dura 24 horas. O convite de uma sala global funciona em qualquer servidor, o de uma sala do servidor só nesse servidor.',
            ]},
          ],
        },
        {
          id: 'chat',
          title: 'Flag Guesser no chat',
          blocks: [
            {kind: 'text', text: 'Use `/games flag-guesser` em um canal, com uma dificuldade se quiser (Fácil por padrão).'},
            {kind: 'list', items: [
              'Uma bandeira por mensagem. Diga o país no chat, ou aperte **Adivinhar** e digite na caixa.',
              'Você tem 60 segundos, em três partes de 20: a região aparece aos 20 segundos e as letras aos 40.',
              'Vale 3 pontos, depois 2, depois 1. Se a mesma pessoa acertar 3 ou mais seguidas, ganha +1 a cada vez. Se outra pessoa acertar, a bandeira for pulada ou o tempo acabar, a sequência recomeça.',
              'Só roda uma bandeira por vez em cada canal. Quem começou pode apertar **Pular**.',
              'Quando acaba, qualquer um pode apertar **Jogar de novo** para a próxima bandeira, por 15 minutos. As pontuações continuam com Jogar de novo.',
              'Cada bandeira que você acerta soma os pontos ao seu total na hora.',
            ]},
            {kind: 'tip', text: 'Prefere rodadas com os amigos? **Abrir na Atividade** leva o jogo para uma sala.'},
          ],
        },
      ],
    },

    'letter-trail': {
      title: 'Letter Trail',
      summary: 'Forme palavras com letras que se tocam numa grade que todo mundo joga ao mesmo tempo. Palavras que mais ninguém acha dão pontos extras.',
      quick: [
        'Todo mundo na sala joga a mesma grade de letras ao mesmo tempo.',
        'Arraste por letras que se tocam, na diagonal também, para formar uma palavra. Cada casa, uma vez por palavra.',
        'As palavras precisam de pelo menos 3 letras. As mais longas valem muito mais.',
        'Uma casa é marcada com ×2: uma palavra que passa por ela vale o dobro.',
        'Uma palavra que mais ninguém na sala achou ganha 2 pontos a mais no fim da rodada.',
        'Você vê quantas palavras cada um tem, nunca quais.',
        'Sua pontuação vai para os seus [pontos de jogo](guide:game-points) quando o jogo acaba, um quarto dela arredondado para cima.',
      ],
      sections: [
        {
          id: 'starting',
          title: 'Começar um jogo',
          blocks: [
            {kind: 'text', text: 'Letter Trail é jogado em salas na Atividade do Discord do NotSoBot, como o [Flag Guesser](guide:flag-guesser).'},
            {kind: 'steps', items: [
              'Use `/games play` em um canal, ou toque em **Zoar** no NotSoBot no lançador de apps do Discord e escolha **Jogos**.',
              'Na aba Jogos, escolha **Letter Trail**.',
              'Toque em **Jogar** ou **Assistir** em uma sala, use **Jogo rápido**, crie a sua com **Nova sala**, ou toque em **Jogar sozinho** para jogar só você.',
              'Espere os outros na sala e o anfitrião toca em **Começar jogo**. Com mais de um jogador vem antes uma contagem de 3 segundos, e as letras aparecem quando ela acaba.',
            ]},
            {kind: 'text', text: 'Por enquanto as palavras são em inglês, em qualquer idioma que você use a Atividade.'},
          ],
        },
        {
          id: 'playing',
          title: 'Formar palavras',
          blocks: [
            {kind: 'list', items: [
              '**Arrastar:** ponha o dedo (ou o mouse) na primeira letra e deslize pelas outras. Ao soltar, a palavra é enviada. Volte para a letra anterior para desfazer um passo.',
              '**Tocar:** toque nas letras uma por uma, cada uma encostada na anterior. Toque de novo na última, ou em **Enviar**, para enviar. Toque fora da grade para recomeçar.',
              '**Teclado:** digite uma palavra e a grade acende um jeito de formá-la, se houver. **Enter** envia, **Backspace** tira uma letra e **Esc** limpa.',
            ]},
            {kind: 'text', text: 'As letras se tocam de lado e na diagonal. Cada casa só pode ser usada uma vez por palavra. A casa **Qu** são duas letras, Q e U juntas.'},
            {kind: 'text', text: 'Uma palavra que conta pisca em verde e vai para a sua lista, a mais nova primeiro. Uma que não conta treme e diz por quê: curta demais, fora da lista de palavras, letras que não se tocam ou uma que você já tem. Palavras erradas não custam nada.'},
            {kind: 'tip', text: 'Enquanto uma rodada rola, todo mundo vê quantas palavras cada jogador tem, mas nunca quais. Elas aparecem no fim da rodada.'},
          ],
        },
        {
          id: 'scoring',
          title: 'Pontuação',
          blocks: [
            {kind: 'facts', items: [
              {label: '3 letras', value: '1 ponto'},
              {label: '4 letras', value: '2 pontos'},
              {label: '5 letras', value: '4 pontos'},
              {label: '6 letras', value: '6 pontos'},
              {label: '7 letras', value: '9 pontos'},
              {label: '8 letras ou mais', value: '12 pontos'},
            ]},
            {kind: 'text', text: 'Sua pontuação numa rodada é a soma das suas palavras, com a casa ×2 e os pontos de só você explicados abaixo. Sua pontuação no jogo é a soma das rodadas.'},
          ],
        },
        {
          id: 'only-you',
          title: 'Só você',
          blocks: [
            {kind: 'text', text: 'Quando uma rodada acaba, cada palavra que só você achou na sala ganha **2 pontos a mais**. Uma palavra que outra pessoa também achou vale o normal. Então vale a pena caçar a palavra que ninguém mais vê, mesmo uma curta.'},
            {kind: 'text', text: 'O fim da rodada mostra as palavras de todo mundo lado a lado, com as de **só você** marcadas, e as palavras mais longas da grade que ninguém achou. Toque numa palavra para ver onde ela estava.'},
            {kind: 'tip', text: 'Num jogo sozinho não há com quem disputar uma palavra, então não há pontos de só você.'},
          ],
        },
        {
          id: 'bonus',
          title: 'A casa ×2',
          blocks: [
            {kind: 'text', text: 'Toda grade tem uma casa marcada com **×2**. Qualquer palavra que passe por ela vale o dobro, e a sua lista marca com ×2. Nunca é a casa Qu.'},
            {kind: 'text', text: 'Primeiro a casa dobra a palavra, depois somam-se os 2 pontos de só você. Uma palavra de 5 letras que passa pela casa ×2 e que só você achou vale 4 × 2 + 2 = 10 pontos.'},
          ],
        },
        {
          id: 'settings',
          title: 'Configurações',
          blocks: [
            {kind: 'text', text: 'Só o anfitrião muda isso, antes de um jogo começar ou depois que ele acaba.'},
            {kind: 'facts', items: [
              {label: 'Grade', value: '**4×4** (o padrão) ou **5×5**. Uma grade maior tem mais palavras, e mais longas.'},
              {label: 'Tempo por rodada', value: '60, 80 (o padrão) ou 120 segundos.'},
              {label: 'Rodadas', value: 'De 1 a 5 por jogo, 1 por padrão.'},
            ]},
            {kind: 'text', text: 'As grades são escolhidas para ter bastante palavras: em geral 30 ou mais numa 4×4 e 60 ou mais numa 5×5.'},
            {kind: 'text', text: 'Depois de uma rodada, as palavras dela aparecem por 10 segundos antes da próxima. O anfitrião pode tocar em **Próxima rodada** para seguir antes.'},
          ],
        },
        {
          id: 'solo',
          title: 'Jogar sozinho',
          blocks: [
            {kind: 'text', text: '**Jogar sozinho** na lista de salas começa um jogo só para você. Ninguém mais vê a sala nem pode entrar.'},
            {kind: 'list', items: [
              'Começa na hora, sem contagem, com as configurações com que você jogou Letter Trail sozinho da última vez neste aparelho.',
              'No fim, **Jogar de novo** começa outro jogo com as mesmas configurações. **Mudar configurações** leva você antes para a sala.',
              'Seus pontos contam para o seu total como em qualquer outro jogo.',
            ]},
          ],
        },
        {
          id: 'rooms',
          title: 'Salas, assistir e pontos',
          blocks: [
            {kind: 'text', text: 'As salas funcionam como as do Flag Guesser: deste servidor ou globais, com senha ou só para assistir, o anfitrião e o criador, remover pessoas e convites. Veja [as salas do Flag Guesser](guide:flag-guesser#rooms) para os detalhes.'},
            {kind: 'list', items: [
              'Quem assiste vê a grade e quantas palavras cada um tem ao vivo, e as palavras de todo mundo no fim de cada rodada.',
              'Quando o jogo acaba, um quarto da sua pontuação (arredondado para cima) vai para os seus [pontos de jogo](guide:game-points): um jogo de 50 soma 13. Cada jogo conta até 300 pontos por dia.',
            ]},
          ],
        },
      ],
    },

    'game-points': {
      title: 'Pontos de jogo',
      summary: 'Um total de pontos para todos os jogos do NotSoBot, com rankings do servidor e globais.',
      quick: [
        'Os pontos de todos os jogos do NotSoBot somam um total só.',
        'Os do Flag Guesser contam um para um: uma bandeira que vale 3 soma 3. O Letter Trail soma um quarto da pontuação, arredondado para cima.',
        'Cada jogo conta até 300 pontos por dia.',
        'No chat contam quando você acerta, na Atividade quando o jogo acaba.',
        '`/games points` mostra seu total, `/games leaderboard` os melhores jogadores.',
      ],
      sections: [
        {
          id: 'earning',
          title: 'Ganhar pontos',
          blocks: [
            {kind: 'text', text: 'Todos os jogos somam no mesmo total. Os pontos do [Flag Guesser](guide:flag-guesser) contam um para um. No [Letter Trail](guide:letter-trail) se marca mais no mesmo tempo, então conta um quarto da pontuação, arredondado para cima: um jogo de 50 soma 13.'},
            {kind: 'list', items: [
              '**No chat:** cada bandeira que você acerta no `/games flag-guesser` conta na hora.',
              '**Na Atividade:** sua pontuação conta quando o jogo acaba, depois da última bandeira ou rodada, ou quando o anfitrião encerra antes. Todos que têm pontos recebem, até quem foi removido no meio.',
              'Pontos ganhos em um servidor contam para o ranking desse servidor. Os de uma sala global ou de uma DM só contam para o ranking global.',
            ]},
            {kind: 'tip', text: 'As pontuações finais de um jogo na Atividade dizem quantos pontos ele somou ao seu total.'},
          ],
        },
        {
          id: 'daily-limit',
          title: 'O limite diário',
          blocks: [
            {kind: 'text', text: 'Cada jogo conta até 300 pontos por pessoa por dia. O dia começa à meia-noite UTC. Passando do limite, o resto não conta. Na Atividade, as pontuações finais avisam quando o limite diário é atingido.'},
            {kind: 'text', text: 'São umas 100 bandeiras com todos os pontos, ou jogos de Letter Trail que somam uma pontuação de 1.200: o bastante para jogar muito, e os rankings continuam justos.'},
          ],
        },
        {
          id: 'commands',
          title: 'Ver os pontos no chat',
          blocks: [
            {kind: 'facts', items: [
              {label: '`/games points`', value: 'O total de alguém, os pontos por jogo, os desta semana, a posição no servidor e no mundo, e o histórico em cada jogo de salas (vitórias, derrotas, empates, partidas abandonadas, sequência e melhores estatísticas). Sem escolher um usuário, você vê os seus.'},
              {label: '`/games leaderboard`', value: 'Os 10 melhores. Escolha **onde**: Servidor (o padrão) ou Global, e o **período**: Todo o período (o padrão) ou Esta semana. Sua posição aparece embaixo se você não estiver entre os 10.'},
            ]},
            {kind: 'text', text: 'Em uma DM, o ranking do servidor mostra o global. As semanas começam na segunda-feira à meia-noite UTC.'},
          ],
        },
        {
          id: 'activity',
          title: 'Os pontos na Atividade',
          blocks: [
            {kind: 'list', items: [
              '**Seus pontos** fica no topo da aba Jogos: seu total, os pontos desta semana e sua posição no servidor (sua posição global em uma DM).',
              'O **Ranking** embaixo dos jogos mostra os melhores jogadores do servidor (de todo mundo em uma DM), desta semana ou de sempre.',
            ]},
          ],
        },
      ],
    },

    'media-editor': {
      title: 'Editor de mídia',
      summary: 'Edite imagens, GIFs, vídeos e sons dentro do Discord, sozinho ou junto em uma sala.',
      quick: [
        'Abra com `/editor`, com **Editar mídia** ou **Editar avatar**, ou pelo inicializador de apps.',
        'Escolha **Só eu** para editar sozinho, ou **Todos** ou **Senha** para criar uma sala.',
        'Até 10 pessoas editam uma sala juntas e veem os cursores umas das outras.',
        'Um passo que alguém está ajustando é dessa pessoa até ela soltar.',
        'Renderize em qualidade total no final e publique no canal.',
        'Salve seus efeitos como modelo, ou experimente um da Galeria de modelos.',
      ],
      sections: [
        {
          id: 'opening',
          title: 'Abrir o editor',
          blocks: [
            {kind: 'list', items: [
              '`/editor` abre no canal. Anexe um arquivo ou um link e ele abre com essa mídia. Sem nada, abre nas salas do editor.',
              '**Editar mídia** em uma mensagem (no menu Apps dela) abre o editor com a imagem, GIF, vídeo ou som dessa mensagem. **Editar avatar** em uma pessoa faz o mesmo com o avatar dela.',
              'Abra o NotSoBot pelo inicializador de apps do Discord e escolha **Editar mídia**.',
              '`/editor template:` com o link ou o código de um modelo abre com esse modelo pronto.',
            ]},
            {kind: 'text', text: 'O NotSoBot costuma publicar também uma mensagem no canal com um botão **Entrar**, para os outros editarem com você.'},
            {kind: 'tip', text: 'O editor também está na web, em [notsobot.com/editor](/editor). Os modelos funcionam nos dois.'},
          ],
        },
        {
          id: 'start-screen',
          title: 'A tela inicial',
          blocks: [
            {kind: 'text', text: 'Pelo inicializador de apps, a Atividade primeiro pergunta o que você quer fazer: **Editar mídia** ou **Jogos**. Cada opção mostra quantas pessoas estão editando ou quantos jogos estão rolando agora, e dá para trocar quando quiser. Se tiver gente numa sala do editor ou numa sala de jogo, **Entre junto com alguém** mostra essas pessoas com um botão **Entrar** que leva direto à sala delas. Se você tocou em **Entrar** na mensagem de Zoar de alguém, essa pessoa aparece primeiro.'},
            {kind: 'text', text: 'Para começar uma edição, escolha um arquivo (envie, arraste ou cole um link), uma das suas edições recentes, ou comece por **Ou crie um**: uma tela em branco, um QR code ou um dos modelos de texto do bot. Imagens, GIFs, vídeos e áudio de até 10 minutos funcionam.'},
          ],
        },
        {
          id: 'who',
          title: 'Só eu, Todos ou Senha',
          blocks: [
            {kind: 'text', text: 'Antes de começar, escolha para quem é a edição:'},
            {kind: 'facts', items: [
              {label: 'Só eu', value: 'Sua própria edição. Ninguém mais na Atividade vê.'},
              {label: 'Todos', value: 'Uma sala nova em que qualquer um na Atividade pode entrar, até 10 pessoas por vez.'},
              {label: 'Senha', value: 'Uma sala nova em que só entra quem tem a senha. Ela precisa de pelo menos 4 caracteres.'},
            ]},
            {kind: 'text', text: 'Uma sala pode ter nome e pode ser só para assistir. Em um servidor, a Atividade de cada canal compartilha as mesmas salas. Uma sala fica até ser fechada ou passar uma semana sem edições.'},
            {kind: 'tip', text: '**Bifurcar** copia a mídia e os efeitos, do jeito que estão, para uma sala nova ou para a sua própria edição. Nada muda no original.'},
          ],
        },
        {
          id: 'together',
          title: 'Editar junto',
          blocks: [
            {kind: 'list', items: [
              'Até 10 pessoas podem estar em uma sala ao mesmo tempo, contando quem assiste.',
              'Todo mundo vê cada mudança ao vivo, na mesma prévia.',
              '**Cursores ao vivo:** setas coloridas com nomes mostram para onde cada um está apontando, na prévia, nos efeitos e nos passos.',
              '**Passos travados:** enquanto alguém ajusta um passo, ele é dessa pessoa até ela soltar, e os outros veem quem está ajustando.',
              'Uma renderização pausa a edição para todos até terminar.',
              'O cabeçalho mostra quem está na sala. Toque nele para ver a lista toda.',
            ]},
            {kind: 'text', text: 'Na lista de salas dá para buscar salas, pessoas ou efeitos, e filtrar por visibilidade, tipo de mídia, salas com vaga ou as suas.'},
          ],
        },
        {
          id: 'watch-only',
          title: 'Salas só para assistir',
          blocks: [
            {kind: 'text', text: 'Em uma sala só para assistir, só quem criou muda as coisas. Os outros assistem ao vivo e podem **Bifurcar** a própria cópia para editar. Escolha ao criar a sala, ou ligue e desligue em **Configurações da sala**.'},
            {kind: 'text', text: 'Quem assiste ainda pode renderizar, copiar o MediaScript e salvar um modelo.'},
          ],
        },
        {
          id: 'managing',
          title: 'Gerenciar uma sala',
          blocks: [
            {kind: 'list', items: [
              'Quem cria a sala pode mudar o nome e a senha, e ligar ou desligar só assistir, em **Configurações da sala**. Quem já está dentro continua.',
              'Quem cria e os moderadores do servidor podem remover pessoas, e fechar ou excluir a sala.',
              '**Fechar** manda todo mundo para a lista de salas e ninguém consegue entrar de novo, mas quem criou fica com a edição. **Excluir** apaga a edição para todos.',
              'Quem foi removido de uma sala não pode entrar nela de novo.',
            ]},
          ],
        },
        {
          id: 'invites',
          title: 'Convites',
          blocks: [
            {kind: 'text', text: 'Em uma sala, aperte **Convidar**. **Compartilhar link** manda pelo Discord, e **Publicar neste canal** publica com um botão para entrar. Ele abre a Atividade direto na sala.'},
            {kind: 'list', items: [
              'Ele deixa entrar em uma sala com senha sem a senha.',
              'Quem foi removido da sala continua de fora.',
              'Dura 24 horas.',
            ]},
          ],
        },
        {
          id: 'templates',
          title: 'Modelos',
          blocks: [
            {kind: 'list', items: [
              '**Salvar como modelo** salva seus efeitos, nunca a sua mídia, como um link que qualquer um pode usar no próprio arquivo. Coloque uma senha para que só quem sabe use.',
              '**Pedir às pessoas…** escolhe configurações que as pessoas preenchem ao usar, como a própria legenda.',
              '**Modelos** no cabeçalho carrega um dos seus na mídia aberta. Desfazer traz de volta o que você tinha.',
              '**Compartilhar no chat** publica um cartão com os efeitos do modelo, um exemplo e um botão para experimentar.',
              'A **Galeria de modelos** tem os modelos que as pessoas publicaram. Abra **Explorar modelos** na tela inicial, ou [notsobot.com/editor/hub](/editor/hub). **Experimentar** começa uma edição com ele.',
              'Para publicar um seu, aperte **Publicar** na sua lista de modelos. Antes, o texto, os desenhos e uma renderização de teste são verificados. Modelos com senha não podem ser publicados.',
            ]},
          ],
        },
        {
          id: 'posting',
          title: 'Renderizar e publicar',
          blocks: [
            {kind: 'steps', items: [
              'Aperte **Renderizar em qualidade total**. Roda no arquivo original. Escolha um formato, ou deixe em Automático.',
              'Quando estiver pronto, **Compartilhar no canal** publica com quem fez, os efeitos e um botão para editar.',
              'Onde o NotSoBot não pode publicar (como uma DM, ou um canal em que você não pode enviar arquivos), abre o compartilhamento do próprio Discord.',
            ]},
            {kind: 'tip', text: '**MediaScript** no cabeçalho copia seus efeitos como uma tag, ou como linhas para um script seu.'},
          ],
        },
        {
          id: 'premium',
          title: 'O que muda com o Premium',
          blocks: [
            {kind: 'text', text: 'Editar, as salas, os convites e os modelos são grátis. O [Premium](/premium) aumenta alguns limites:'},
            {kind: 'facts', items: [
              {label: 'Tamanho da renderização', value: 'Até 1.080 quadros no Free, 2.160 com Premium.'},
              {label: 'Premium do servidor', value: 'As renderizações nas salas de um servidor usam também o Premium do servidor.'},
              {label: 'Modelos salvos', value: '50 no Free, 200 com Premium.'},
              {label: 'Na galeria', value: '10 publicados ao mesmo tempo no Free, 50 com Premium.'},
            ]},
          ],
        },
      ],
    },
  },

  upcoming: {},
};
