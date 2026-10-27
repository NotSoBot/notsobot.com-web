import type { Changelog as English } from '../en/changelog';


export const Changelog: Record<keyof typeof English, string> = {
  'changelog.badge': 'Novedades',
  'changelog.description': 'Comandos nuevos, mejoras y arreglos de NotSoBot y notsobot.com, día a día.',
  'changelog.english_only': 'Los cambios en sí están escritos en inglés.',
  'changelog.search_placeholder': 'Busca cambios, como .zoom o {foreach}...',
  'changelog.search_label': 'Buscar en las novedades',
  'changelog.show_changes': 'Mostrar cambios',
  'changelog.kind.new': 'Nuevo',
  'changelog.kind.improved': 'Mejorado',
  'changelog.kind.fixed': 'Arreglado',
  'changelog.kind.removed': 'Eliminado',
  'changelog.up_to': 'Hasta',
  'changelog.all_dates': 'Todas las fechas',
  'changelog.results_one': '{count} cambio para “{query}”',
  'changelog.results_other': '{count} cambios para “{query}”',
  'changelog.empty_title': 'Ningún cambio coincide con estos filtros.',
  'changelog.empty_description': 'Prueba otras palabras, otro tipo o una fecha posterior.',
  'changelog.idea_title': '¿Encontraste un error o tienes una idea?',
  'changelog.idea_description': 'Usa <code>.bot report bug</code> o cuéntanoslo en el servidor de soporte.',
  'legal.effective': 'En vigor: {date}',
  'legal.updated': 'Última actualización: {date}',
  'legal.english_only': 'Este documento solo está disponible en inglés.',
  'legal.questions': '¿Preguntas? Escríbenos a <email>{email}</email>',
};
