import { resolveTarget, isAdminP, num } from '../lib/participants.ts';

export const command = ['promote', 'promover'];
export const category = 'admin';
export const description = 'Da administrador a un miembro del grupo.';
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
                `> ${(global as any).prefix?.[0] || '.'}promote @usuario\n` +
                `> O responde a su mensaje`
            );
        }

        if (!target) {
            return msg.reply('⚠️ Este usuario no está en el grupo.');
        }

        if (isAdminP(target)) {
            return msg.reply('⚠️ Este usuario ya es administrador.');
        }

        await sock.groupParticipantsUpdate(chatId, [target.id], 'promote');

        return sock.sendMessage(
            chatId,
            {
                text:
                    `✅ *NUEVO ADMINISTRADOR*\n\n` +
                    `🪷 @${num(target.id)} ahora es administrador del grupo.`,
                mentions: [target.id]
            },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error('[PROMOTE ERROR]:', error);
        return msg.reply('⚠️ No pude promover al usuario. Verifica que el bot sea administrador.');
    }
}
