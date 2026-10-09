export const command = ['owner', 'creador', 'creator'];
export const category = 'info';
export const description = 'Muestra la información del owner/creador del bot.';
export const admin = false;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any) {
    const ownerNumber = (global as any).owner || '573237649689';
    const ownerName = (global as any).nmcreador || '𝞯𝞯🪷 𝐀𝐁𝐑𝐀𝐇𝐀𝐍-𝐌 ˙';
    const botName = (global as any).namebot || '𖫨𖫨🪷⃨᪲  𝐘𝐀𝐄 𝐌𝐈𝐊𝐔 𝗕𝗢𝗧˙ᰨᰍ';

    const chatId = msg.from || msg.chat;

    try {
        const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${ownerName}
TEL:+${ownerNumber}
END:VCARD`;

        await sock.sendMessage(
            chatId,
            {
                contacts: {
                    displayName: ownerName,
                    contacts: [
                        {
                            vcard: vcard
                        }
                    ]
                }
            },
            { quoted: msg }
        );

        await sock.sendMessage(
            chatId,
            {
                text:
                    `🪷 *CREADOR DEL BOT*\n` +
                    `─────── ❀ ───────\n\n` +
                    `👤 *Nombre:* ${ownerName}\n` +
                    `📱 *Número:* +${ownerNumber}\n` +
                    `🤖 *Bot:* ${botName}\n\n` +
                    `📌 Contacta al creador para soporte, reportes o sugerencias.\n` +
                    `─────── ❀ ───────`
            },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error('[OWNER ERROR]:', error);
        return msg.reply('⚠️ Ocurrió un error al enviar la información del creador.');
    }
}
