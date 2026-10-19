export const command = ['owner', 'creador', 'creator'];
export const category = 'info';
export const description = 'Muestra la información del owner/creador del bot.';
export const admin = false;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any) {
    const ownerNumber = String((global as any).owner || '573237649689').replace(/\D/g, '');
    const ownerName = (global as any).nmcreador || '𝞯𝞯🪷 𝐀𝐁𝐑𝐀𝐇𝐀𝐍-𝐌 ˙';
    const botName = (global as any).namebot || '𖫨𖫨🪷⃨᪲  𝐘𝐀𝐄 𝐌𝐈𝐊𝐔 𝗕𝗢𝗧˙ᰨᰍ';

    const chatId = msg.from || msg.chat;

    try {
        // El parametro waid es lo que hace que WhatsApp reconozca el numero
        // y muestre "Enviar mensaje" en lugar de "Invitar".
        const vcard = [
            'BEGIN:VCARD',
            'VERSION:3.0',
            `N:;${ownerName};;;`,
            `FN:${ownerName}`,
            `ORG:${botName}`,
            'TITLE:Creador del bot',
            `item1.TEL;waid=${ownerNumber}:+${ownerNumber}`,
            'item1.X-ABLabel:Celular',
            'NOTE:Contacta para soporte, reportes o sugerencias.',
            'END:VCARD'
        ].join('\n');

        await sock.sendMessage(
            chatId,
            {
                contacts: {
                    displayName: ownerName,
                    contacts: [{ vcard }]
                }
            },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error('[OWNER ERROR]:', error);
        return msg.reply('⚠️ Ocurrió un error al enviar la información del creador.');
    }
}
