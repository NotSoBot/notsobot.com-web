// The Portuguese guides, following en.ts (same section ids and facts). Button names match the Activity's and the bot's
// Portuguese strings, command names stay in English like the FAQ's. "Flag Guesser", "Letter Trail", "Hold the Line",
// "Loose Ends" and "Retro" stay as names.

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
              {label: 'Dificuldade', value: '**Fácil** (o padrão): bandeiras conhecidas que não se parecem entre si, com opções de qualquer lugar. **Média**: países de que quase todo mundo já ouviu falar, com opções da mesma região. **Difícil**: países pequenos, territórios e bandeiras parecidas, e as opções são as bandeiras parecidas. Cada nível tem suas próprias bandeiras.'},
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

    'hold-the-line': {
      title: 'Hold the Line',
      summary: 'Desenhe linhas para proteger o Pip, o sapinho, de abelhas, bombas, pedras, espinhos e lava até o tempo acabar.',
      quick: [
        'Desenhe linhas no tabuleiro e aperte **Começar**. O Pip precisa aguentar até o tempo acabar.',
        'As linhas gastam a tinta da barra acima do tabuleiro. **Desfazer** tira a última linha e devolve a tinta dela.',
        'Depois de Começar, suas linhas caem. Uma linha num parafuso balança nele, e uma com um parafuso em cada ponta fica parada.',
        'O Pip tem 3 corações. Uma ferroada de abelha tira 1 e uma bomba tira 2, a não ser que tenha algo sólido no caminho.',
        'Espinhos, minas, lava, uma pedra rolando ou cair do tabuleiro encerram a tentativa na hora.',
        'Estrelas: uma por aguentar, uma por não perder corações e uma por usar metade da tinta ou menos.',
        'Ganhe uma estrela numa fase para abrir a próxima. São 12.',
      ],
      sections: [
        {
          id: 'starting',
          title: 'Começar uma fase',
          blocks: [
            {kind: 'text', text: 'Hold the Line é um quebra-cabeça para jogar sozinho. Não tem salas, e não soma nos seus [pontos de jogo](guide:game-points).'},
            {kind: 'list', items: [
              '**No notsogames.com:** abra o **Hold the Line** na página inicial, ou vá para `notsogames.com/hold-the-line`.',
              '**Na Atividade:** use `/games play` (ou toque em **Zoar** no NotSoBot no lançador de apps do Discord e escolha **Jogos**) e escolha **Hold the Line** na aba Jogos.',
            ]},
            {kind: 'text', text: 'Escolha uma fase. São 12, todas feitas à mão. Uma fase abre quando você tem uma estrela na anterior. Quando uma fase traz algo novo, uma dica acima do tabuleiro explica o que é.'},
          ],
        },
        {
          id: 'drawing',
          title: 'Desenhar linhas',
          blocks: [
            {kind: 'list', items: [
              'Toque no tabuleiro e arraste para desenhar uma linha, com o mouse, o dedo ou uma caneta. Solte para terminar.',
              'Desenhe quantas linhas quiser enquanto houver tinta. A barra acima do tabuleiro mostra quanto sobra.',
              'Uma linha não atravessa o chão, outra linha nem o Pip. Ela para onde tiver algo no caminho.',
              'Dá para desenhar por cima da lava, mas uma linha que encosta nela queima assim que você aperta Começar.',
              '**Desfazer** tira a última linha e devolve a tinta dela. **Recomeçar** limpa o tabuleiro e começa a fase de novo.',
            ]},
            {kind: 'tip', text: 'No teclado, **Espaço** ou **Enter** é Começar, **Z** é Desfazer e **R** é Recomeçar.'},
          ],
        },
        {
          id: 'go',
          title: 'Apertar Começar',
          blocks: [
            {kind: 'text', text: 'Nada se mexe enquanto você desenha. **Começar** dispara o relógio no canto superior direito, e tudo ganha vida:'},
            {kind: 'list', items: [
              'Suas linhas ficam sólidas e caem, a não ser que um parafuso as segure.',
              'As abelhas saem da colmeia e voam direto para o Pip.',
              'Cada bomba faz a contagem regressiva do número que tem e depois explode.',
              'As pedras rolam, algumas caem lá de cima depois de um tempinho, e caixas e minas soltas tombam.',
            ]},
            {kind: 'text', text: 'O Pip consegue se ainda tiver um coração quando o relógio chegar a zero. Depois de Começar, suas linhas não mudam mais: para refazer, aperte **Recomeçar**, ou **Tentar de novo** quando a tentativa acabar.'},
          ],
        },
        {
          id: 'bolts',
          title: 'Parafusos',
          blocks: [
            {kind: 'text', text: 'Algumas fases têm parafusos, pequenos pinos presos no tabuleiro.'},
            {kind: 'list', items: [
              'Comece ou termine uma linha perto de um parafuso e ela se prende nele.',
              'Uma linha num parafuso gira em volta dele, mas não cai.',
              'Uma linha com um parafuso em cada ponta fica presa nos dois e não sai do lugar: uma ponte ou um muro fixo.',
              'Um parafuso segura mais de uma linha.',
            ]},
          ],
        },
        {
          id: 'hearts',
          title: 'Corações',
          blocks: [
            {kind: 'text', text: 'O Pip começa toda tentativa com 3 corações, no canto superior esquerdo. Se perder todos, a tentativa acaba.'},
            {kind: 'facts', items: [
              {label: 'Ferroada de abelha', value: '1 coração. Depois de um golpe, o Pip pisca por um instante, e enquanto isso não leva outra ferroada.'},
              {label: 'Explosão de bomba', value: '2 corações, a não ser que tenha algo sólido entre a bomba e o Pip, como uma linha. O círculo tracejado em volta da bomba mostra o alcance dela.'},
              {label: 'Uma pancada forte', value: '1 coração, quando uma caixa, uma bomba ou uma das suas linhas cai rápido em cima do Pip.'},
            ]},
            {kind: 'text', text: 'A explosão também empurra tudo que está perto, o Pip inclusive, só que menos atrás de uma linha.'},
          ],
        },
        {
          id: 'dangers',
          title: 'O que encerra uma tentativa',
          blocks: [
            {kind: 'text', text: 'Isto encerra a tentativa na hora, não importa quantos corações o Pip ainda tenha:'},
            {kind: 'list', items: [
              'Encostar em espinhos ou numa mina com espinhos (elas machucam de qualquer lado).',
              'Cair na lava.',
              'Uma pedra rolando. Uma que já parou do lado do Pip não faz mal.',
              'Cair pela parte de baixo do tabuleiro.',
            ]},
            {kind: 'tip', text: 'A lava também ajuda: abelhas que entram nela somem, pedras, caixas e minas afundam, e uma bomba que cai nela explode ali mesmo.'},
          ],
        },
        {
          id: 'stars',
          title: 'Estrelas',
          blocks: [
            {kind: 'facts', items: [
              {label: 'Aguentou', value: 'O Pip ainda tem um coração quando o tempo acaba.'},
              {label: 'Sem perder corações', value: 'O Pip termina com os 3 corações.'},
              {label: 'Metade da tinta ou menos', value: 'Suas linhas usaram metade da tinta da fase ou menos.'},
            ]},
            {kind: 'text', text: 'Suas melhores estrelas em cada fase ficam guardadas, e a lista de fases mostra o seu total. Uma estrela basta para abrir a próxima fase, então dá para voltar depois atrás das outras.'},
          ],
        },
        {
          id: 'progress',
          title: 'Onde fica o seu progresso',
          blocks: [
            {kind: 'list', items: [
              '**Com login:** suas estrelas ficam na sua conta, então vão com você para outros dispositivos e entre o notsogames.com e a Atividade. Na Atividade você está sempre logado.',
              '**Sem login:** ficam neste navegador. Se depois você entrar na sua conta nele, elas passam para a conta.',
            ]},
          ],
        },
      ],
    },

    'loose-ends': {
      title: 'Loose Ends',
      summary: 'Ligue cada par de botões iguais com linha e cubra todos os quadrados. Tabuleiros sem fim e um desafio novo todo dia.',
      quick: [
        'Arraste de um botão até o outro botão da mesma cor para costurar os dois.',
        'As linhas vão para cima, para baixo, para a esquerda e para a direita, um quadrado por vez, e nunca se cruzam.',
        'O quebra-cabeça termina quando todos os pares estão ligados e todo quadrado tem uma linha passando.',
        'Se você passar por cima de uma linha, ela é cortada. Volte antes de soltar e ela reaparece.',
        'Os tabuleiros vão de 5×5 a 9×9, cada um com fases sem fim que ficam mais difíceis, além de um Desafio do dia de 8×8.',
        'Estrelas: uma por resolver, uma por não usar dicas e uma por desenhar cada linha de uma vez.',
      ],
      sections: [
        {
          id: 'starting',
          title: 'Começar um quebra-cabeça',
          blocks: [
            {kind: 'text', text: 'Loose Ends é um quebra-cabeça para jogar sozinho. Não tem salas, e não soma nos seus [pontos de jogo](guide:game-points).'},
            {kind: 'list', items: [
              '**No notsogames.com:** abra o **Loose Ends** na página inicial, ou vá para `notsogames.com/loose-ends`.',
              '**Na Atividade:** use `/games play` (ou toque em **Zoar** no NotSoBot no lançador de apps do Discord e escolha **Jogos**) e escolha **Loose Ends** na aba Jogos.',
            ]},
            {kind: 'text', text: 'Depois jogue o **Desafio do dia**, ou escolha um tamanho em **Tabuleiros** para jogar a próxima fase dele.'},
          ],
        },
        {
          id: 'threads',
          title: 'Costurar as linhas',
          blocks: [
            {kind: 'list', items: [
              'Toque num botão e arraste até o outro botão da mesma cor. A linha vai atrás de você quadrado por quadrado: para cima, para baixo, para a esquerda ou para a direita, nunca na diagonal.',
              'Uma linha não passa por um botão de outra cor, e para quando chega ao par dela.',
              'Arraste de volta por uma linha para encurtá-la.',
              'Toque numa linha para continuar daquele quadrado. Arraste a partir de um dos botões dela para refazê-la dali, ou só toque no botão para apagá-la.',
            ]},
            {kind: 'text', text: 'O quebra-cabeça está resolvido quando todos os pares estão ligados e todo quadrado tem uma linha passando. A maioria dos tabuleiros tem mais de uma solução, e qualquer uma vale. O texto acima do tabuleiro mostra quantos pares estão ligados e quanto está coberto.'},
            {kind: 'tip', text: 'Um botão não cobre o próprio quadrado até a linha dele sair dali.'},
          ],
        },
        {
          id: 'crossing',
          title: 'Quando as linhas se encontram',
          blocks: [
            {kind: 'text', text: 'As linhas nunca se cruzam. Arraste uma por cima de outra e a outra é cortada logo antes do ponto onde você cruzou.'},
            {kind: 'text', text: 'Mudou de ideia? Volte antes de soltar e a linha cortada reaparece. Depois que você solta, o corte fica.'},
          ],
        },
        {
          id: 'stars',
          title: 'Estrelas',
          blocks: [
            {kind: 'facts', items: [
              {label: 'Resolvido', value: 'Todos os pares ligados e todos os quadrados cobertos.'},
              {label: 'Sem dicas', value: 'Resolvido sem apertar **Dica**.'},
              {label: 'Cada linha de uma vez', value: 'Desenhe uma linha e passe para a próxima. Pode ajustar a que você acabou de desenhar, mas voltar a uma que você já deixou tira esta estrela.'},
            ]},
            {kind: 'text', text: '**Recomeçar** limpa o tabuleiro e te dá uma nova chance nas três. Suas melhores estrelas em cada fase ficam guardadas.'},
          ],
        },
        {
          id: 'hints',
          title: 'Dicas',
          blocks: [
            {kind: 'text', text: '**Dica** coloca uma linha da solução do próprio quebra-cabeça, a do primeiro par que ainda não está ligado. Linhas no caminho são cortadas, e como a maioria dos tabuleiros tem mais de uma solução, ela pode não bater com a que você está montando. Use quantas precisar: qualquer dica tira a estrela de sem dicas nessa tentativa.'},
          ],
        },
        {
          id: 'boards',
          title: 'Tabuleiros e fases',
          blocks: [
            {kind: 'list', items: [
              'São cinco tamanhos de tabuleiro, de 5×5 a 9×9.',
              'Cada tamanho tem suas próprias fases, e elas nunca acabam. O botão dele abre a fase seguinte à mais alta que você já resolveu.',
              'Cada tamanho começa fácil, com muitas linhas curtas, e vai ficando mais difícil até mais ou menos a fase 40. Tabuleiros difíceis têm menos linhas, mais compridas, e menos jogadas forçadas.',
              'Depois da fase 40, todas as fases continuam difíceis, cada uma do seu jeito.',
              'Não há limite de tempo nem de jogadas, recomeços ou dicas. Uma dica só custa a estrela Sem dicas.',
              'Cada fase é o mesmo quebra-cabeça para todo mundo que joga.',
              'Quando você resolve uma, **Próxima fase** leva direto para a seguinte.',
            ]},
          ],
        },
        {
          id: 'daily',
          title: 'O Desafio do dia',
          blocks: [
            {kind: 'list', items: [
              'Todo dia tem um quebra-cabeça de 8×8, razoavelmente difícil e o mesmo para todo mundo.',
              'Um novo chega à meia-noite UTC.',
              'Depois de resolver, suas estrelas aparecem do lado dele, e **Jogar de novo** deixa você ir atrás de mais.',
            ]},
          ],
        },
        {
          id: 'progress',
          title: 'Onde fica o seu progresso',
          blocks: [
            {kind: 'list', items: [
              '**Com login:** suas fases, estrelas e desafios do dia ficam na sua conta, então vão com você para outros dispositivos e entre o notsogames.com e a Atividade. Na Atividade você está sempre logado.',
              '**Sem login:** ficam neste navegador. Se depois você entrar na sua conta nele, eles passam para a conta.',
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

    'retro': {
      title: 'Retro',
      summary: 'Jogue jogos de consoles clássicos a partir dos seus próprios arquivos, sozinho, no notsogames.com ou na Atividade.',
      quick: [
        'Escolha ou solte um arquivo de jogo seu, ou um .zip com ele dentro, e o jogo começa.',
        'Os jogos que você carrega ficam em **Seus jogos** neste dispositivo para a próxima vez.',
        'As setas movem, X é A, Z é B e Enter é Start. Esc abre o menu.',
        'Controles de videogame também funcionam, e telas sensíveis ao toque ganham botões na tela.',
        'O menu tem 4 espaços de estados salvos, seus controles e o som.',
        'Seus jogos e saves nunca saem do seu dispositivo. Nada é enviado.',
        'Jogue só jogos que você tenha o direito de usar.',
      ],
      sections: [
        {
          id: 'starting',
          title: 'Abrir o Retro',
          blocks: [
            {kind: 'text', text: 'O Retro roda jogos a partir de arquivos que você já tem, direto no navegador. É só você e o jogo: não tem salas, e não soma nos seus pontos de jogo.'},
            {kind: 'list', items: [
              '**No notsogames.com:** abra o **Retro** na página inicial, ou vá para `notsogames.com/retro`.',
              '**Na Atividade:** use `/games play` (ou toque em **Zoar** no NotSoBot no lançador de apps do Discord e escolha **Jogos**) e escolha **Retro** na aba Jogos.',
            ]},
            {kind: 'tip', text: 'O Retro não vem com nenhum jogo, quem traz é você. Jogue só jogos que você tenha o direito de usar.'},
          ],
        },
        {
          id: 'loading',
          title: 'Carregar um jogo',
          blocks: [
            {kind: 'steps', items: [
              'Toque em **Escolher um arquivo de jogo**, ou solte um arquivo na caixa embaixo.',
              'O jogo começa na hora e entra em **Seus jogos**.',
            ]},
            {kind: 'text', text: 'O Retro roda jogos de NES, SNES, Game Boy, Game Boy Color e Game Boy Advance.'},
            {kind: 'list', items: [
              'Ele lê o próprio arquivo para saber de qual console é, então o nome não importa.',
              'Um .zip também serve: o Retro abre e roda o primeiro jogo que achar dentro.',
              'Um arquivo que não é um jogo que o Retro roda é recusado, com uma linha dizendo por quê.',
            ]},
          ],
        },
        {
          id: 'your-games',
          title: 'Seus jogos',
          blocks: [
            {kind: 'list', items: [
              'Todo jogo que você carrega aparece em **Seus jogos**, com o console e o tamanho. Toque em um para jogar de novo.',
              'Ele mantém o nome do próprio arquivo. O mesmo arquivo carregado duas vezes é um jogo só, seja qual for o nome.',
              '**Remover** (a lixeira ao lado de um jogo) apaga o jogo e todos os saves dele deste dispositivo.',
            ]},
          ],
        },
        {
          id: 'controls',
          title: 'Controles',
          blocks: [
            {kind: 'text', text: 'No teclado, estas são as teclas padrão:'},
            {kind: 'facts', items: [
              {label: 'Mover', value: 'Setas'},
              {label: 'A e B', value: '**X** e **Z**'},
              {label: 'Start', value: '**Enter**'},
              {label: 'Select', value: '**Shift direito** ou **Backspace**'},
              {label: 'Menu', value: '**Esc**'},
            ]},
            {kind: 'text', text: 'Consoles com mais botões, como L e R ou X e Y, têm teclas para eles também. **Controles**, no menu, mostra cada botão do console do jogo com as teclas dele.'},
            {kind: 'text', text: 'Para trocar uma tecla, abra o menu, clique em **Trocar** ao lado de um botão e aperte a tecla nova. Se outro botão tinha essa tecla, ela passa para este. **Teclas padrão** restaura todas. O Esc não pode ser trocado: ele sempre abre o menu. Suas teclas ficam neste dispositivo, para todos os jogos.'},
            {kind: 'text', text: '**Controles de videogame** também funcionam: conecte um e aperte um botão. O Retro segue a posição dos botões, então o botão frontal de baixo é B e o da direita é A, com X e Y no de cima e no da esquerda nos consoles que têm esses botões. O direcional ou o analógico esquerdo movem, os botões superiores são L e R, Start ou Menu é Start, e Back ou Exibir é Select. Só as teclas do teclado podem ser trocadas.'},
          ],
        },
        {
          id: 'touch',
          title: 'Controles de toque',
          blocks: [
            {kind: 'text', text: 'Numa tela sensível ao toque, um direcional e botões aparecem embaixo do jogo.'},
            {kind: 'list', items: [
              'Toque entre duas setas do direcional para ir na diagonal.',
              'Deslize de um botão para outro sem tirar o dedo.',
              'Botões extras, como L e R, só aparecem quando o console do jogo tem esses botões.',
              'Vire o celular de lado e os controles vão para os lados da tela.',
            ]},
            {kind: 'text', text: 'No menu, **Controles de toque** pode ficar em **Auto** (só em telas sensíveis ao toque, o padrão), **Ligados** ou **Desligados**.'},
          ],
        },
        {
          id: 'menu',
          title: 'O menu de pausa',
          blocks: [
            {kind: 'text', text: 'Aperte **Esc**, ou o botão de menu no canto de cima à direita, para pausar. O jogo espera até você tocar em **Continuar**.'},
            {kind: 'list', items: [
              '**Estados salvos:** salve e carregue seus 4 espaços.',
              '**Controles:** suas teclas, os botões do controle e os controles de toque.',
              '**Saves do jogo:** exporte e importe o save do próprio jogo, no notsogames.com.',
              '**Som:** **Sem som** e **Volume**, guardados neste dispositivo.',
              '**Reiniciar jogo:** começa de novo. Tudo o que você fez depois do último save do jogo se perde; seus estados salvos continuam.',
            ]},
            {kind: 'tip', text: 'O X no canto de cima à esquerda fecha o jogo e volta para Seus jogos. Antes, ele guarda o save do próprio jogo.'},
          ],
        },
        {
          id: 'saves',
          title: 'Estados salvos e saves do jogo',
          blocks: [
            {kind: 'text', text: 'O Retro guarda dois tipos de save, os dois neste dispositivo:'},
            {kind: 'facts', items: [
              {label: 'Estados salvos', value: 'Uma captura do jogo como está agora, feita pelo menu. Cada jogo tem 4 espaços, cada um com uma imagem da tela e quando foi salvo. **Salvar** preenche um espaço (substituindo o que tinha nele), **Carregar** leva você de volta a ele.'},
              {label: 'Saves do jogo', value: 'Os saves que o próprio jogo faz, nos jogos que salvam. O Retro guarda esses saves automaticamente cada vez que o jogo salva, e eles estão lá da próxima vez que você abrir o jogo.'},
            ]},
            {kind: 'text', text: 'No notsogames.com, **Exportar save** baixa o save do próprio jogo como um arquivo .sav, e **Importar save** carrega um: o jogo reinicia com ele, e ele substitui o que estava guardado aqui. A Atividade não tem exportar nem importar.'},
          ],
        },
        {
          id: 'storage',
          title: 'Onde fica guardado',
          blocks: [
            {kind: 'text', text: 'Seus jogos, saves, estados salvos e configurações ficam neste navegador, neste dispositivo. Nunca são enviados, então ninguém vê, nem a gente.'},
            {kind: 'list', items: [
              'O notsogames.com e a Atividade guardam cada um o seu. Um jogo carregado em um não está no outro.',
              'Saves feitos na Atividade ficam no Discord, nesse dispositivo. Ainda não dá para levá-los para o notsogames.com.',
              'Outro dispositivo ou navegador começa vazio.',
              'Uma janela anônima esquece tudo quando é fechada, e limpar os dados do site apaga tudo. O Retro avisa quando este navegador não está guardando nada.',
            ]},
            {kind: 'tip', text: 'Quer uma cópia do seu progresso? No notsogames.com, exporte o save do jogo e guarde o arquivo.'},
          ],
        },
        {
          id: 'sound',
          title: 'Som',
          blocks: [
            {kind: 'text', text: 'Alguns celulares e navegadores só tocam som depois que você toca na página. Se um jogo começar sem som, toque nele uma vez.'},
            {kind: 'text', text: '**Sem som** e **Volume** ficam no menu, em **Som**.'},
          ],
        },
        {
          id: 'source',
          title: 'Emuladores e código',
          blocks: [
            {kind: 'text', text: 'O Retro usa emuladores de código aberto no seu navegador. **Emuladores e código**, no fim da tela do Retro, mostra quais são, com as licenças.'},
            {kind: 'text', text: 'O código do player, com cada mudança que fizemos nos emuladores, está no [GitHub](https://github.com/NotSoBot/notsogames.retro).'},
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
