import { findParticipant, isAdminP } from '../lib/participants.ts';
import { deco } from '../lib/perms.ts';

export const command = ['delete', 'del'];
export const category = 'admin';
export const description = 'Elimina el mensaje al que respondes.';
export const admin = false;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any, _db: any, rawMsg: any) {
    if (!msg.isGroup || !msg.quoted?.key?.id) return;

    try {
        const chatId = msg.from || msg.chat;
        const metadata = await sock.groupMetadata(chatId);
        const participants: any[] = metadata?.participants || [];
        const rawSender = rawMsg?.key?.participant || rawMsg?.key?.participantPn || rawMsg?.key?.participantAlt || msg.sender;
        const sender = findParticipant(participants, msg.sender, rawSender);
        if (!isAdminP(sender)) {
            return msg.reply(deco('𝙰𝙲𝙲𝙴𝚂𝙾 𝙳𝙴𝙽𝙴𝙶𝙰𝙳𝙾', 'Solo los *administradores del grupo* pueden borrar mensajes.'));
        }

        const bot = findParticipant(participants, sock.user?.id, sock.user?.lid);
        if (!isAdminP(bot)) {
            return msg.reply(deco('𝙿𝙴𝚁𝙼𝙸𝚂𝙾𝚂', 'Necesito ser *administrador del grupo* para borrar mensajes.'));
        }

        const quotedKey = msg.quoted.key;
        await sock.sendMessage(chatId, {
            delete: {
                remoteJid: chatId,
                fromMe: Boolean(quotedKey.fromMe),
                id: quotedKey.id,
                ...(quotedKey.participant ? { participant: quotedKey.participant } : {})
            }
        });
    } catch (error) {
        console.error('[DELETE ERROR]:', error);
        return msg.reply('⚠️ No pude borrar el mensaje citado.');
    }
}
