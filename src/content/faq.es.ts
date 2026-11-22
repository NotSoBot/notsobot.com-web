// The Spanish FAQ, keyed by the ids in faq.ts (same markup). A question missing here shows in English.

import type { FaqTranslation } from './faq';


export const FAQ_SPANISH: FaqTranslation = {
  sections: {
    start: {title: 'Primeros pasos', description: 'Añadir el bot y usar tu primer comando.'},
    commands: {title: 'Comandos y multimedia', description: 'Imágenes, vídeos, descargas y límites de archivos.'},
    server: {title: 'Configurar el servidor', description: 'Prefijos, permisos, restricciones y registros.'},
    limits: {title: 'Límites', description: 'Cuántos tags, recordatorios y ajustes de servidor puedes tener.'},
    premium: {title: 'Premium e IA', description: 'Los niveles de NotSoPremium y NotSoAI.'},
    privacy: {title: 'Privacidad y soporte', description: 'Tus datos y dónde pedir ayuda.'},
  },
  questions: {
    // primeros pasos
    'add-to-server': {
      question: '¿Cómo añado NotSoBot a mi servidor?',
      answer: 'Usa el botón [Añadir a Discord](/invite?src=faq) y elige tu servidor. Necesitas el permiso **Gestionar servidor** en ese servidor para añadir bots.\n\nCuando entre, escribe `/` en cualquier canal para ver sus comandos de barra, o prueba `@NotSoBot help`.',
    },
    'use-without-server': {
      question: '¿Puedo usar NotSoBot sin añadirlo a un servidor?',
      answer: 'Sí. Puedes añadir NotSoBot a tu cuenta de Discord en lugar de a un servidor. Sus comandos de barra y los del menú del clic derecho (como **Download** u **OCR** en un mensaje) funcionarán en MD y en servidores que permitan aplicaciones externas.\n\nLos comandos con prefijo como `.magik` solo funcionan en servidores donde se ha añadido el bot y en tus MD con NotSoBot.',
    },
    'how-to-run-commands': {
      question: '¿Cómo uso un comando?',
      answer: 'Hay tres formas:\n\n- Usa los comandos de barra escribiendo `/` y eligiendo uno\n- Menciona al bot, como `@NotSoBot magik`\n- Escribe el prefijo y el nombre del comando, como `.magik` (el prefijo por defecto es `.`). Los comandos con prefijo terminan el 1 de enero de 2027, porque Discord exige que los bots usen comandos de barra; las otras dos formas siguen funcionando\n\nLa [lista de comandos](/commands) muestra todos los comandos, cómo se usan y ejemplos.',
    },
    'not-responding': {
      question: 'El bot no responde a mis comandos. ¿Qué pasa?',
      answer: 'Normalmente es una de estas cosas:\n\n- **Faltan permisos.** NotSoBot necesita Ver canal, Enviar mensajes, Insertar enlaces, Adjuntar archivos y Leer el historial de mensajes en ese canal. Usa `/help-permissions-check` para ver qué falta.\n- **Otro prefijo.** Puede que el servidor haya puesto un prefijo personalizado, que sustituye a `.`. Menciona al bot (`@NotSoBot prefixes`) para ver cuáles están activos.\n- **El canal, tu rol o el comando están restringidos.** Los administradores pueden limitar dónde y quién usa el bot (mira [Configurar el servidor](#section-server)).',
    },

    // comandos y multimedia
    'image-input': {
      question: '¿Cómo uso un comando de imagen con una foto concreta?',
      answer: 'Los comandos de imagen y vídeo toman lo que van a editar de aquí, por orden de preferencia:\n\n- Un archivo adjunto a tu mensaje\n- Un mensaje al que estés respondiendo\n- Un enlace, un emoji personalizado o un usuario (para su avatar), como `.magik @alguien`\n\nSi no le das nada, NotSoBot usa la imagen o el vídeo más reciente del canal.',
    },
    'chain-effects': {
      question: '¿Puedo aplicar varios efectos a la vez?',
      answer: 'Sí, con `/media-aiv pipe` (o `.pipe`). Separa los comandos con punto y coma, por ejemplo `/media-aiv pipe commands:flip; flop` o `.pipe flip; flop`. Se pueden encadenar hasta 10 comandos, o 5 si alguno tiene que ejecutarse por separado, y cada uno se aplica sobre el resultado del anterior.',
    },
    'download-videos': {
      question: '¿Cómo descargo un vídeo de TikTok, Instagram, YouTube, etc.?',
      answer: 'Usa `/download` con el enlace, o haz clic derecho (o mantén presionado) en un mensaje con un enlace y elige **Aplicaciones → Download**. Con prefijo es `.download <url>`.\n\nPara cambiar la calidad de vídeo por defecto de tus descargas, usa `/settings set download-quality`.',
    },
    'files-as-links': {
      question: '¿Por qué recibí un enlace en lugar de un archivo?',
      answer: 'Cuando un resultado es más grande de lo que Discord deja subir al bot, NotSoBot lo aloja en [nsb.gg](https://nsb.gg) y te manda un enlace. Esos enlaces son temporales: duran 14 días, o hasta 28 con NotSoPremium.\n\nPuedes controlar cuándo pasa esto con `/settings set file-upload-threshold` y `/settings set file-upload-type`.',
    },
    'undo': {
      question: '¿Cómo borro la respuesta del bot a mi comando?',
      answer: 'Usa `/undo` en el mismo canal para quitar las respuestas del bot a tu último comando, o `/undo amount:5` para los últimos cinco. Con prefijo es `.undo` (o `.undo 5`).',
    },
    'nsfw': {
      question: '¿Por qué se bloqueó mi resultado, o por qué no puedo usar comandos NSFW?',
      answer: 'NotSoBot revisa lo que genera en todos los canales, incluidos los que tienen restricción de edad y los MD, y bloquea cualquier cosa que pueda ser NSFW. Las búsquedas siempre usan SafeSearch.\n\nLos comandos NSFW se eliminaron, así que marcar un canal con restricción de edad ya no cambia esto. Si crees que un resultado se bloqueó por error, cuéntanoslo en el [servidor de soporte](/support).',
    },

    // configurar el servidor
    'change-prefix': {
      question: '¿Cómo cambio el prefijo del bot?',
      answer: 'Usa `/server prefixes add` para añadir uno, `/server prefixes replace` para cambiarlos todos por uno nuevo y `/server prefixes remove` para quitar uno. Necesitan el permiso **Gestionar servidor**. Con prefijo son `.prefixes add <prefijo>`, `.prefixes replace <prefijo>` y `.prefixes remove <prefijo>`.\n\nEn cuanto un servidor tiene prefijos personalizados, el `.` por defecto deja de funcionar allí. `/server prefixes list` y `@NotSoBot prefixes` muestran cuáles están activos.\n\nTodos los prefijos, también los personalizados, dejan de funcionar el 1 de enero de 2027, porque Discord exige que los bots usen comandos de barra. Los comandos de barra y mencionar al bot siguen funcionando después.',
    },
    'restrict-channels': {
      question: '¿Cómo limito NotSoBot a ciertos canales, roles o usuarios?',
      answer: 'Usa reglas, con `/server-rules` (o `.rules`). Las reglas que cubren todos los comandos necesitan **Administrador**:\n\n- `/server-rules add action:Block target:everything` y luego `/server-rules add action:Allow target:everything channels:#bot-commands`: el bot solo responde en #bot-commands. Con prefijo: `.rules block everything` y luego `.rules allow everything -channels bot-commands`\n- `/server-rules add action:Block target:everything channels:#general roles:@Muted`: el bot ignora #general y el rol Muted. Con prefijo: `.rules block everything -channels general -roles Muted`\n\nGana la regla más específica: un usuario gana a un rol, un rol gana a un canal y un canal gana a todo el servidor. Usa `/server-rules list` (o `.rules`) para verlas todas, o `/server-rules check` (o `.rules check <comando>`) para ver qué regla decide.',
    },
    'disable-command': {
      question: '¿Cómo desactivo un comando o una categoría concreta?',
      answer: 'Usa `/server-rules add` con la acción Block y el comando o la categoría como objetivo, por ejemplo `/server-rules add action:Block target:magik` o `/server-rules add action:Block target:category:fun`. Rellena `channels` para desactivarlo solo en ciertos canales, y `message` para decirle a la gente adónde ir. Necesita el permiso **Gestionar servidor**.\n\nCon prefijo es `.rules block <comando o categoría>`, por ejemplo `.rules block magik` o `.rules block category:fun`, con `-channels` y `-message` para lo mismo: `.rules block fun -channels general -message Los comandos de diversión van en #bots`.',
    },
    'loggers': {
      question: '¿Puede NotSoBot registrar lo que pasa en mi servidor?',
      answer: 'Sí. Configura registros de baneos, canales, miembros, mensajes, roles, usuarios, voz, moderación (advertencias), reportes y del canal señuelo, por ejemplo `/server loggers add type:Messages channel:#message-logs` (o `.loggers add messages -channel message-logs`). Usa `/server loggers list` (o `.loggers`) para ver qué se está registrando y dónde.',
    },
    'language': {
      question: '¿Puede NotSoBot responder en mi idioma?',
      answer: 'Sí, está disponible en 33 idiomas. Usa `/settings set locale` para elegir el tuyo, o `/server set locale` para poner el idioma por defecto del servidor.',
    },

    // límites
    'limit-tags': {
      question: '¿Cuántos tags puedo crear?',
      answer: 'Puedes tener hasta **100.000** tags en total, y hasta **10.000** de ellos en un mismo servidor. Un servidor puede tener hasta **500.000** tags de todos sus miembros, y hasta **300** de ellos pueden ser comandos personalizados.\n\nCada tag también puede guardar hasta **5** variables y **1** blob (de 256 KB como máximo) por ámbito: global, servidor, canal y usuario.',
    },
    'limit-reminders': {
      question: '¿Cuántos recordatorios puedo tener?',
      answer: 'Hasta **300** a la vez, y hasta **100** de ellos en un mismo servidor.\n\nSolo puedes poner **10** recordatorios para más o menos la misma hora (a menos de un minuto entre sí), y **5** en un mismo servidor.',
    },
    'limit-server': {
      question: '¿Qué límites tienen los ajustes del servidor?',
      answer: '- **Prefijos:** 10\n- **Reglas:** 500\n- **Registros:** 3 de cada tipo (2 de mensajes y 2 de usuarios), 25 en total\n- **Comandos personalizados:** 300\n- **Advertencias:** 100 activas por miembro, y hasta 10 miembros en un solo `warn`\n- **Acciones de advertencia:** 10 pasos\n- **Reglas de advertencia automática:** 20\n- **Baneos temporales:** 200 pendientes de levantarse',
    },
    'limit-premium': {
      question: '¿Premium sube estos límites?',
      answer: 'No, los límites de arriba son iguales para todos. NotSoPremium sube los de multimedia: tamaño de archivo, tiempo por comando, fotogramas animados y fuentes guardadas. NotSoPremium Plus y Max añaden más voces clonadas, y un servidor con un espacio de servidor premium tiene una cola de música más grande. La [página de Premium](/premium) los muestra para cada nivel.',
    },

    // premium e ia
    'premium': {
      question: '¿Qué es NotSoPremium?',
      answer: 'NotSoPremium es una suscripción opcional que se compra a través de Discord, en el perfil de NotSoBot. Tiene tres niveles:\n\n- **NotSoPremium**: archivos más grandes, más tiempo para cada comando y tus propios comandos personalizados\n- **NotSoPremium Plus**: todo lo anterior, y además 2 espacios de servidor premium, más voces clonadas y NotSoCredits cada semana para NotSoAI\n- **NotSoPremium Max**: todo lo anterior, con el doble de NotSoCredits, y los que no uses se acumulan\n\nCon **NotSoPremium Plus** o **Max** puedes darle tu premium a hasta 2 servidores (o MD grupales) con `/settings premium-servers add` o desde la página Premium del panel, para que algunos comandos premium funcionen allí para todos. Ser dueño de un servidor no le da premium por sí solo.\n\nLa [página de Premium](/premium) compara todos los niveles.',
    },
    'notsoai': {
      question: '¿Cómo hablo con NotSoAI?',
      answer: 'Menciona al bot con un mensaje, o responde a uno de sus mensajes, y NotSoAI contestará. Funciona con NotSoCredits: **NotSoPremium Plus** y **Max** traen algunos cada semana (Max, el doble), un servidor recibe algunos por cada espacio de servidor premium Max que tenga, y cualquiera puede comprar un paquete de créditos en la tienda para usarlo sin suscribirse (o darle algunos a un servidor con `/settings credits give`). Mira la [página de Premium](/premium) para ver cuánto rinden. Puedes elegir su personalidad con `/settings set ai-personality`.',
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
