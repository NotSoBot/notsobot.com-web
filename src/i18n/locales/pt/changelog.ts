import type { Changelog as English } from '../en/changelog';


export const Changelog: Record<keyof typeof English, string> = {
  'changelog.badge': 'Novidades',
  'changelog.description': 'Comandos novos, melhorias e correções no NotSoBot e no notsobot.com, dia a dia.',
  'changelog.english_only': 'As mudanças em si estão escritas em inglês.',
  'changelog.search_placeholder': 'Pesquisar mudanças, como .zoom ou {foreach}...',
  'changelog.search_label': 'Pesquisar nas novidades',
  'changelog.show_changes': 'Mostrar mudanças',
  'changelog.kind.new': 'Novo',
  'changelog.kind.improved': 'Melhorado',
  'changelog.kind.fixed': 'Corrigido',
  'changelog.kind.removed': 'Removido',
  'changelog.up_to': 'Até',
  'changelog.all_dates': 'Todas as datas',
  'changelog.results_one': '{count} mudança para “{query}”',
  'changelog.results_other': '{count} mudanças para “{query}”',
  'changelog.empty_title': 'Nenhuma mudança com esses filtros.',
  'changelog.empty_description': 'Tente outras palavras, outro tipo ou uma data mais recente.',
  'changelog.idea_title': 'Achou um bug ou tem uma ideia?',
  'changelog.idea_description': 'Use <code>.bot report bug</code> ou fale com a gente no servidor de suporte.',
  'legal.effective': 'Em vigor: {date}',
  'legal.updated': 'Última atualização: {date}',
  'legal.english_only': 'Este documento só está disponível em inglês.',
  'legal.questions': 'Dúvidas? Mande um e-mail para <email>{email}</email>',
};
