import { downloadContentFromMessage, extractMessageContent } from '@whiskeysockets/baileys';

export const command = ['readviewonce', 'read', 'readvo'];
export const category = 'utils';
export const description = 'Convertir imagen/video de una vista a contenido.';

export default async function (sock: any, msg: any) {
    const quoted = msg.quoted;
    if (!quoted) {
        return msg.reply('🪷 *READ*\n\n🍓 Responde a un mensaje de "ver una vez" para ver su contenido.');
    }

    try {
        const content: any = extractMessageContent(quoted.message || quoted);
        if (!content) {
            return msg.reply('🍥 No se pudo extraer el contenido.');
        }

        const messageType = Object.keys(content)[0];
        const mediaMessage = content[messageType];
        const stream = await downloadContentFromMessage(
            mediaMessage,
            messageType.replace('Message', '').toLowerCase() as any
        );

        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        if (/video/i.test(messageType)) {
            return sock.sendMessage(msg.from, { video: buffer, caption: mediaMessage.caption || '', mimetype: 'video/mp4' }, { quoted: msg });
        }
        if (/image/i.test(messageType)) {
            return sock.sendMessage(msg.from, { image: buffer, caption: mediaMessage.caption || '' }, { quoted: msg });
        }
        if (/audio/i.test(messageType)) {
            return sock.sendMessage(msg.from, { audio: buffer, mimetype: 'audio/ogg; codecs=opus', ptt: mediaMessage.ptt || false }, { quoted: msg });
        }

        return msg.reply('🍥 El tipo de contenido no es compatible.');
    } catch (e: any) {
        console.error('[READ]', e);
        return msg.reply(`🍥 Ocurrió un error al leer el contenido.\n🪷 ${e?.message || String(e)}`);
    }
}
