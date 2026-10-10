import { addWarning } from '../lib/database.ts';
import { resolveTarget, isAdminP, num } from '../lib/participants.ts';

export const command = ['warn', 'advertir', 'aviso'];
export const category = 'admin';
export const description = 'Agrega una advertencia a un usuario del grupo.';
export const admin = true;
export const botAdmin = true;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 Este comando solo funciona en grupos.');
    }

    const chatId = msg.from || msg.chat || extra?.chat;

    try {
        const { raw, resolved, target } = await resolveTarget(sock, msg, chatId);

        if (!raw) {
            return msg.reply(
                `🍓 Uso\n\n` +
                `> ${(global as any).prefix?.[0] || '.'}warn @usuario\n` +
                `> Responde a su mensaje`
            );
        }

        if (!target) {
            return msg.reply('⚠️ Este usuario no está en el grupo.');
        }

        if (isAdminP(target)) {
            return msg.reply('⚠️ No puedo advertir a un administrador.');
        }

        // Clave estable para guardar advertencias: el numero de telefono si se pudo resolver.
        const warnKey = String(resolved || '').endsWith('@s.whatsapp.net')
            ? resolved
            : `${num(target.id)}@s.whatsapp.net`;

        const total = addWarning(chatId, warnKey);

        if (total >= 3) {
            await sock.groupParticipantsUpdate(chatId, [target.id], 'remove');

            return sock.sendMessage(
                chatId,
                {
                    text:
                        `🚨 *ADVERTENCIA MÁXIMA ALCANZADA*\n\n` +
                        `🪷 @${num(target.id)} ha recibido 3 advertencias.\n` +
                        `❌ Se ha expulsado automáticamente.`,
                    mentions: [target.id]
                },
                { quoted: msg }
            );
        }

        return sock.sendMessage(
            chatId,
            {
                text:
                    `⚠️ *ADVERTENCIA*\n\n` +
                    `🪷 @${num(target.id)}\n` +
                    `📌 Tiene ${total}/3 advertencias.`,
                mentions: [target.id]
            },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error('[WARN ERROR]:', error);
        return msg.reply('⚠️ Ocurrió un error al registrar la advertencia.');
    }
}
