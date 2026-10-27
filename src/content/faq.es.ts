// The Spanish FAQ, keyed by the ids in faq.ts (same markup). A question missing here shows in English.

import type { FaqTranslation } from './faq';


export const FAQ_SPANISH: FaqTranslation = {
  sections: {
    start: {title: 'Primeros pasos', description: 'Añadir el bot y usar tu primer comando.'},
    commands: {title: 'Comandos y multimedia', description: 'Imágenes, vídeos, descargas y límites de archivos.'},
    server: {title: 'Configurar el servidor', description: 'Prefijos, permisos, restricciones y registros.'},
    premium: {title: 'Premium e IA', description: 'Los niveles de NotSoPremium y NotSoAI.'},
    privacy: {title: 'Privacidad y soporte', description: 'Tus datos y dónde pedir ayuda.'},
  },
  questions: {
    // primeros pasos
    'add-to-server': {
      question: '¿Cómo añado NotSoBot a mi servidor?',
      answer: 'Usa el botón [Añadir a Discord](/invite) y elige tu servidor. Necesitas el permiso **Gestionar servidor** en ese servidor para añadir bots.\n\nCuando entre, prueba `.help` o escribe `/` en cualquier canal para ver sus comandos de barra.',
    },
    'use-without-server': {
      question: '¿Puedo usar NotSoBot sin añadirlo a un servidor?',
      answer: 'Sí. Puedes añadir NotSoBot a tu cuenta de Discord en lugar de a un servidor. Sus comandos de barra y los del menú del clic derecho (como **Download** u **OCR** en un mensaje) funcionarán en MD y en servidores que permitan aplicaciones externas.\n\nLos comandos con prefijo como `.magik` solo funcionan en servidores donde se ha añadido el bot.',
    },
    'how-to-run-commands': {
      question: '¿Cómo uso un comando?',
      answer: 'Hay tres formas:\n\n- Escribe el prefijo y el nombre del comando, como `.magik` (el prefijo por defecto es `.`)\n- Menciona al bot en lugar de usar un prefijo, como `@NotSoBot magik`\n- Usa los comandos de barra escribiendo `/` y eligiendo uno\n\nLa [lista de comandos](/commands) muestra todos los comandos, cómo se usan y ejemplos.',
    },
    'not-responding': {
      question: 'El bot no responde a mis comandos. ¿Qué pasa?',
      answer: 'Normalmente es una de estas cosas:\n\n- **Faltan permisos.** NotSoBot necesita Ver canal, Enviar mensajes, Insertar enlaces, Adjuntar archivos y Leer el historial de mensajes en ese canal. Usa `/help-permissions-check` para ver qué falta.\n- **Otro prefijo.** Puede que el servidor haya puesto un prefijo personalizado, que sustituye a `.`. Menciona al bot (`@NotSoBot prefixes`) para ver cuáles están activos.\n- **El canal, tu rol o el comando están restringidos.** Los administradores pueden limitar dónde y quién usa el bot (mira [Configurar el servidor](#section-server)).',
    },

    // comandos y multimedia
    'image-input': {
      question: '¿Cómo uso un comando de imagen con una foto concreta?',
      answer: 'Los comandos de imagen y vídeo cogen lo que van a editar de aquí, por orden de preferencia:\n\n- Un archivo adjunto a tu mensaje\n- Un mensaje al que estés respondiendo\n- Un enlace, un emoji personalizado o un usuario (para su avatar), como `.magik @alguien`\n\nSi no le das nada, NotSoBot usa la imagen o el vídeo más reciente del canal.',
    },
    'chain-effects': {
      question: '¿Puedo aplicar varios efectos a la vez?',
      answer: 'Sí, con `.pipe`. Separa los comandos con punto y coma, por ejemplo `.pipe flip; flop`. Se pueden encadenar hasta 5 comandos, y cada uno se aplica sobre el resultado del anterior.',
    },
    'download-videos': {
      question: '¿Cómo descargo un vídeo de TikTok, Instagram, YouTube, etc.?',
      answer: 'Usa `.download <url>` o `/download`. También puedes hacer clic derecho (o mantener pulsado) en un mensaje con un enlace y elegir **Aplicaciones → Download**.\n\nPara cambiar la calidad de vídeo por defecto de tus descargas, usa `/settings set download-quality`.',
    },
    'files-as-links': {
      question: '¿Por qué recibí un enlace en lugar de un archivo?',
      answer: 'Cuando un resultado es más grande de lo que Discord deja subir al bot, NotSoBot lo aloja en [nsb.gg](https://nsb.gg) y te manda un enlace. Esos enlaces son temporales: duran 14 días, o 28 con NotSoPremium.\n\nPuedes controlar cuándo pasa esto con `/settings set file-upload-threshold` y `/settings set file-upload-type`.',
    },
    'undo': {
      question: '¿Cómo borro la respuesta del bot a mi comando?',
      answer: 'Usa `.undo` en el mismo canal para quitar las respuestas del bot a tu último comando, o `.undo 5` para los últimos cinco.',
    },
    'nsfw': {
      question: '¿Por qué se bloqueó mi resultado, o por qué no puedo usar comandos NSFW?',
      answer: 'Los comandos NSFW solo funcionan en canales marcados como **con restricción de edad**. En los demás canales, NotSoBot revisa lo que genera y bloquea cualquier cosa que pueda ser NSFW. Las búsquedas usan SafeSearch salvo que el canal tenga restricción de edad.\n\nPara permitir resultados NSFW, un administrador tiene que marcar el canal con restricción de edad en los ajustes del canal.',
    },

    // configurar el servidor
    'change-prefix': {
      question: '¿Cómo cambio el prefijo del bot?',
      answer: 'Usa `.prefixes add <prefijo>` para añadir uno, `.prefixes replace <prefijo>` para cambiarlos todos por uno nuevo y `.prefixes remove <prefijo>` para quitar uno. Necesitan el permiso **Gestionar servidor**.\n\nEn cuanto un servidor tiene prefijos personalizados, el `.` por defecto deja de funcionar allí. Mencionar al bot siempre funciona, así que `@NotSoBot prefixes` muestra cuáles están activos.',
    },
    'restrict-channels': {
      question: '¿Cómo limito NotSoBot a ciertos canales, roles o usuarios?',
      answer: 'Usa reglas (`.rules` o `/server rules`). Las reglas que cubren todos los comandos necesitan **Administrador**:\n\n- `.rules block everything` y luego `.rules allow everything -channels bot-commands`: el bot solo responde en #bot-commands\n- `.rules block everything -channels general -roles Muted`: el bot ignora #general y el rol Muted\n\nGana la regla más específica: un usuario gana a un rol, un rol gana a un canal y un canal gana a todo el servidor. Usa `.rules` para verlas todas, o `.rules check <comando>` para ver qué regla decide.',
    },
    'disable-command': {
      question: '¿Cómo desactivo un comando o una categoría concreta?',
      answer: 'Usa `.rules block <comando o categoría>`, por ejemplo `.rules block rule34` o `.rules block category:fun`. Añade `-channels` para desactivarlo solo en ciertos canales, y `-message` para decirle a la gente adónde ir: `.rules block fun -channels general -message Los comandos de diversión van en #bots`. Necesita el permiso **Gestionar servidor**.',
    },
    'loggers': {
      question: '¿Puede NotSoBot registrar lo que pasa en mi servidor?',
      answer: 'Sí. Configura registros de baneos, canales, miembros, mensajes, roles, usuarios y voz, por ejemplo `.loggers add messages -channel message-logs`. Usa `.loggers` para ver qué se está registrando y dónde.',
    },
    'language': {
      question: '¿Puede NotSoBot responder en mi idioma?',
      answer: 'Sí, está disponible en 33 idiomas. Usa `/settings set locale` para elegir el tuyo, o `/settings-server set locale` para poner el idioma por defecto del servidor.',
    },

    // premium e ia
    'premium': {
      question: '¿Qué es NotSoPremium?',
      answer: 'NotSoPremium es una suscripción opcional que se compra a través de Discord, en el perfil de NotSoBot. Tiene tres niveles:\n\n- **NotSoPremium**: archivos más grandes, más tiempo para cada comando y tus propios comandos personalizados\n- **NotSoPremium Plus**: todo lo anterior, y además 2 espacios de servidor premium y clonación de voz\n- **NotSoPremium Plus AI**: todo lo anterior, y además NotSoAI\n\nCon **NotSoPremium Plus** puedes darle tu premium a hasta 2 servidores (o MD grupales) con `/settings premium-servers add` o desde la página Premium del panel, para que algunos comandos premium funcionen allí para todos. Ser dueño de un servidor no le da premium por sí solo.',
    },
    'notsoai': {
      question: '¿Cómo hablo con NotSoAI?',
      answer: 'Menciona al bot con un mensaje, o responde a uno de sus mensajes, y NotSoAI contestará. Necesita **NotSoPremium Plus AI**, ya sea el tuyo o el de un miembro que le haya dado su premium al servidor. Puedes elegir su personalidad con `/settings set ai-personality`.',
    },

    // privacidad y soporte
    'data': {
      question: '¿Qué datos guarda NotSoBot sobre mí?',
      answer: 'Tu perfil básico de Discord (ID, nombre de usuario, avatar), los ajustes que elijas, los tags que crees y registros de qué comandos usas. La [Política de privacidad](/legal/privacy) tiene los detalles.',
    },
    'delete-data': {
      question: '¿Cómo hago que borren mis datos?',
      answer: 'Inicia sesión en el [panel](/dashboard/settings#your-data) y usa **Borrar mis datos** al final de tus ajustes. También puedes escribir a [privacy@notsocompany.com](mailto:privacy@notsocompany.com) desde una dirección que puedas verificar, incluyendo tu ID de usuario de Discord.',
    },
    'support': {
      question: '¿Dónde reporto un error o pido más ayuda?',
      answer: 'Únete al [servidor de soporte](/support) y pregunta allí. Incluye el comando que usaste y qué pasó, y una captura si puedes.',
    },
    'created': {
      question: '¿Cuándo se creó NotSoBot?',
      answer: 'El 16 de abril de 2016.',
    },
  },
};
