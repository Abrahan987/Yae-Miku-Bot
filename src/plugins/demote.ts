import { resolveTarget, isAdminP, num } from '../lib/participants.ts';

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

    try {
        const { raw, target } = await resolveTarget(sock, msg, chatId);

        if (!raw) {
            return msg.reply(
                `🍓 Uso\n\n` +
                `> ${(global as any).prefix?.[0] || '.'}demote @usuario\n` +
                `> O responde a su mensaje`
            );
        }

        if (!target) {
            return msg.reply('⚠️ Este usuario no está en el grupo.');
        }

        if (!isAdminP(target)) {
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
                    `🪷 @${num(target.id)} ya no es administrador.`,
                mentions: [target.id]
            },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error('[DEMOTE ERROR]:', error);
        return msg.reply('⚠️ No pude degradar al usuario. Verifica que el bot sea administrador.');
    }
}
