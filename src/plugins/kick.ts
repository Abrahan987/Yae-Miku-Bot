export const command = ['kick', 'remove', 'out'];
export const category = 'admin';
export const description = 'Expulsa a un miembro del grupo.';
export const admin = true;
export const botAdmin = true;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) return;

    const chatId = msg.from || msg.chat || extra?.chat;
    const args = extra?.args || [];

    try {
        const mentions = msg.mentionedJid || [];

        if (mentions.length === 0 && args.length === 0) {
            return msg.reply('✧ Debes mencionar o responder a un mensaje del usuario que deseas expulsar.\n\nUso: *.kick @usuario* o responde al mensaje del usuario.');
        }

        let targetJid = mentions[0];
        if (!targetJid && msg.quoted) {
            targetJid = msg.quoted.sender;
        }

        if (!targetJid) {
            return msg.reply('✧ No se pudo identificar al usuario. Intenta mencionar a alguien o responde a su mensaje.');
        }

        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata?.participants || [];

        const targetParticipant = participants.find((p: any) => p.id === targetJid);
        if (!targetParticipant) {
            return msg.reply('✧ El usuario ya no está en el grupo.');
        }

        if (targetParticipant.admin) {
            return msg.reply('✧ No puedo expulsar a administradores del grupo.');
        }

        await sock.groupParticipantsUpdate(chatId, [targetJid], 'remove');

        return sock.sendMessage(
            chatId,
            {
                text: `✧ @${targetJid.split('@')[0]} ha sido expulsado del grupo.`,
                mentions: [targetJid]
            },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error('[KICK ERROR]:', error);

        if (error?.output?.statusCode === 401 || error?.output?.statusCode === 500 || error?.data === 401) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });

            const rawBotJid = sock.user?.id || '';
            const botNum = rawBotJid.split(':')[0].split('@')[0];
            const botJid = `${botNum}@s.whatsapp.net`;

            return sock.sendMessage(chatId, {
                text: `✧ @${botNum} debe ser administrador del grupo para poder expulsar miembros.`,
                mentions: [botJid]
            }, { quoted: msg });
        }

        return msg.reply('✧ Ocurrió un error al intentar expulsar al usuario.');
    }
}
