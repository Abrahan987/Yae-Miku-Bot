export const command = ['demote', 'degradar'];
export const category = 'admin';
export const description = 'Quita el administrador a un miembro del grupo.';
export const admin = true;
export const botAdmin = true;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 Este comando solo funciona en grupos.');
    }

    const chatId = msg.from || msg.chat;
    const targetJid = (msg.mentionedJid || [])[0] || msg.quoted?.sender;

    if (!targetJid) {
        return msg.reply(
            `🍓 Uso\n\n` +
            `> ${(global as any).prefix?.[0] || '.'}demote @usuario\n` +
            `> O responde a su mensaje`
        );
    }

    try {
        const metadata = await sock.groupMetadata(chatId);
        const base = targetJid.split('@')[0];
        const target = (metadata?.participants || []).find(
            (p: any) => p.id?.split('@')[0] === base || p.lid?.split('@')[0] === base
        );

        if (!target) {
            return msg.reply('⚠️ Este usuario no está en el grupo.');
        }

        if (!target.admin) {
            return msg.reply('⚠️ Este usuario no es administrador.');
        }

        if (target.admin === 'superadmin') {
            return msg.reply('⚠️ No puedo degradar al creador del grupo.');
        }

        await sock.groupParticipantsUpdate(chatId, [target.id], 'demote');

        return sock.sendMessage(
            chatId,
            {
                text:
                    `✅ *ADMINISTRADOR REMOVIDO*\n\n` +
                    `🪷 @${base} ya no es administrador.`,
                mentions: [target.id]
            },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error('[DEMOTE ERROR]:', error);
        return msg.reply('⚠️ No pude degradar al usuario. Verifica que el bot sea administrador.');
    }
}
