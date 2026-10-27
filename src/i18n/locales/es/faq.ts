import type { Faq as English } from '../en/faq';


export const Faq: Record<keyof typeof English, string> = {
  'faq.badge': 'Centro de ayuda',
  'faq.title': 'Preguntas frecuentes',
  'faq.description': 'Todo sobre añadir NotSoBot, usar comandos, configurarlo en tu servidor, premium y tus datos.',
  'faq.search_placeholder': 'Busca en preguntas y respuestas...',
  'faq.search_label': 'Buscar en las preguntas frecuentes',
  'faq.results_one': '{count} respuesta para “{query}”',
  'faq.results_other': '{count} respuestas para “{query}”',
  'faq.sections_label': 'Secciones de preguntas',
  'faq.sections': 'Secciones',
  'faq.empty_title': 'Ninguna respuesta coincide con “{query}”.',
  'faq.empty_description': 'Prueba con otras palabras, o pregunta en el servidor de soporte de abajo.',
  'faq.stuck_title': '¿Sigues atascado?',
  'faq.stuck_description': 'Pregunta en el servidor de soporte y alguien te ayudará.',
  'faq.join_support': 'Unirse al servidor de soporte',
  'faq.browse_commands': 'Ver comandos',
  'faq.link_copied': 'Enlace copiado',
  'faq.copy_link': 'Copiar enlace',
};
