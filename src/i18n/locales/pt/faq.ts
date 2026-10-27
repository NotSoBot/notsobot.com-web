import type { Faq as English } from '../en/faq';


export const Faq: Record<keyof typeof English, string> = {
  'faq.badge': 'Central de ajuda',
  'faq.title': 'Perguntas frequentes',
  'faq.description': 'Tudo sobre adicionar o NotSoBot, usar comandos, configurá-lo no seu servidor, premium e seus dados.',
  'faq.search_placeholder': 'Pesquisar perguntas e respostas...',
  'faq.search_label': 'Pesquisar no FAQ',
  'faq.results_one': '{count} resposta para “{query}”',
  'faq.results_other': '{count} respostas para “{query}”',
  'faq.sections_label': 'Seções do FAQ',
  'faq.sections': 'Seções',
  'faq.empty_title': 'Nenhuma resposta para “{query}”.',
  'faq.empty_description': 'Tente outras palavras, ou pergunte no servidor de suporte abaixo.',
  'faq.stuck_title': 'Ainda com dúvidas?',
  'faq.stuck_description': 'Pergunte no servidor de suporte e alguém vai te ajudar.',
  'faq.join_support': 'Entrar no servidor de suporte',
  'faq.browse_commands': 'Ver comandos',
  'faq.link_copied': 'Link copiado',
  'faq.copy_link': 'Copiar link',
};
