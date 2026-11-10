import { resolveTarget, isAdminP, num } from '../lib/participants.ts';
import { decodeJid, UserJid, rememberParticipants } from '#simple';
import { isOwner, warn } from '../lib/perms.ts';

export const command = ['promote', 'promover', 'autoadmin'];
export const category = 'admin';
export const description = 'Da administrador a un miembro del grupo.';
export const menu = [
    { command: ['promote', 'promover'], description: 'Da administrador a un miembro del grupo.' },
    { command: ['autoadmin'], description: 'El owner obtiene administrador en el grupo.' }
];
export const admin = false;
export const botAdmin = true;

export default async function (sock: any, msg: any, extra: any, _db: any, rawMsg: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 Este comando solo funciona en grupos.');
    }

    const chatId = msg.from || msg.chat;

    try {
        if (extra.command === 'autoadmin') {
            if (!isOwner(sock, msg, rawMsg)) return msg.reply(warn.owner());

            const metadata = await sock.groupMetadata(chatId);
            const participants: any[] = metadata?.participants || [];
            rememberParticipants(participants);
            const key = rawMsg?.key || {};
            const senderIds = key.fromMe
                ? [sock.user?.id, sock.user?.lid]
                : [key.participant, key.participantPn, key.participantAlt];
            const canonical = (id: any): string[] => {
                if (typeof id !== 'string' || !id) return [];
                const normalized = decodeJid(id);
                return [normalized, UserJid(sock, chatId, normalized)].filter(Boolean);
            };
            const sender = new Set(senderIds.flatMap(canonical));
            const target = participants.find((p: any) =>
                [p.id, p.lid, p.phoneNumber].flatMap(canonical).some((id: string) => sender.has(id))
            );
            if (!target?.id) return msg.reply('⚠️ No pude identificar al owner en este grupo.');
            if (isAdminP(target)) return msg.reply('🪷 Ya eres administrador de este grupo.');

            const result = await sock.groupParticipantsUpdate(chatId, [target.id], 'promote');
            if (!Array.isArray(result) || !result.length || result.some((item: any) => item.status !== '200')) {
                console.error('[AUTOADMIN ERROR]:', result);
                return msg.reply('⚠️ WhatsApp no confirmó la promoción. Verifica los permisos del bot.');
            }
            extra.invalidateGroupCache?.(chatId);
            return sock.sendMessage(chatId, {
                text: `✅ *NUEVO ADMINISTRADOR*\n\n🪷 @${num(target.id)} ahora es administrador del grupo.`,
                mentions: [target.id]
            }, { quoted: msg });
        }

        if (!extra?.isAdmin) return msg.reply(warn.admin());
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
