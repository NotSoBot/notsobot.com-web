// Notes that many functions share word for word in English, so they read the same in Portuguese too.

export const ONLY_NOTSOAI = 'Só o NotSoAI pode usar isto. Na tag de um usuário (ou numa tag que o NotSoAI chama com {tag}) a função fica como texto normal. Também fica como texto normal quando é executada a partir de um botão ou menu que o NotSoAI criou, já que outra pessoa poderia apertá-lo. Também fica como texto normal quando o prompt do NotSoAI tinha texto de outra pessoa (uma mensagem de outra pessoa que ele respondeu, um link, um arquivo que não foi enviado pelo próprio usuário ou a opção `url`, também antes na conversa), e em código que só existe durante a execução, como uma resposta do `{ai}` ou o que `{eval}` e `{evalsilent}` executam.';
export const MEMORY_PERMANENT = 'Isto muda de forma permanente o que o NotSoAI lembra da pessoa que pediu, não só nesta execução.';
export const NETWORK = 'Conta para o limite de requisições de rede.';
export const API_LIMIT = 'Conta para o limite de ações da API (1 por execução por padrão) e para o limite de requisições de rede.';
export const EMPTY_ARGUMENT = 'Um argumento vazio não retorna nada.';
export const EMPTY_QUERY = 'Uma pesquisa vazia não retorna nada.';
export const QUERY_1024 = 'A pesquisa (só os primeiros 1024 caracteres são usados).';
export const CACHED_QUERY = 'Conta para o limite de requisições de rede. Repetir a mesma pesquisa numa execução reaproveita o resultado guardado sem contar de novo.';
export const SAFE_SEARCH = 'O SafeSearch fica ativado, a não ser que o canal permita conteúdo NSFW.';
export const OUT_OF_RANGE = 'Se o índice estiver fora do intervalo, nada é retornado.';
export const NOT_A_NUMBER = 'Se o índice não for um número, a função fica como está no resultado.';
export const START_INDEX = 'Índice (a partir de 0) por onde começar; o padrão é 0. Números negativos contam a partir do final.';
export const END_INDEX = 'Índice antes do qual parar (não incluído); o padrão é o número de argumentos. Números negativos contam a partir do final.';
export const CHANNEL_ARG = 'Uma menção, ID ou nome de um canal deste servidor. O padrão é o canal atual.';
export const CHANNEL_MATCH = 'Só são encontrados canais do servidor atual. Os nomes são comparados sem diferenciar maiúsculas de minúsculas.';
export const NO_CHANNEL = 'Não retorna nada se nenhum canal for encontrado.';
export const USER_ARG = 'Uma menção, ID ou nome para procurar. O padrão é quem usou a tag.';
export const ATTACHMENT_LIMIT = 'Conta para o limite de anexos (10 por execução por padrão). Se os anexos estiverem desativados nesta execução, a função fica como está.';
