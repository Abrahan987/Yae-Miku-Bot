import { setGroupUserMuted } from '../lib/database.ts';
import { findParticipant, isAdminP, resolveTarget } from '../lib/participants.ts';
import { deco } from '../lib/perms.ts';

export const command = ['mute', 'unmute'];
export const category = 'admin';
export const description = 'Silencia o permite nuevamente los mensajes de un usuario del grupo.';
export const admin = false;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any, _db: any, rawMsg: any) {
    if (!msg.isGroup) return msg.reply('🍓 Este comando solo funciona en grupos.');

    const chatId = msg.from || msg.chat;
    const shouldMute = extra.command === 'mute';

    try {
        const metadata = await sock.groupMetadata(chatId);
        const participants: any[] = metadata?.participants || [];
        const rawSender = rawMsg?.key?.participant || rawMsg?.key?.participantPn || rawMsg?.key?.participantAlt || msg.sender;
        const sender = findParticipant(participants, msg.sender, rawSender);
        if (!isAdminP(sender)) return msg.reply(deco('𝙰𝙲𝙲𝙴𝚂𝙾 𝙳𝙴𝙽𝙴𝙶𝙰𝙳𝙾', 'Solo los *administradores del grupo* pueden usar este comando.'));

        const bot = findParticipant(participants, sock.user?.id, sock.user?.lid);
        if (!isAdminP(bot)) return msg.reply(deco('𝙿𝙴𝚁𝙼𝙸𝚂𝙾𝚂', 'Necesito ser *administrador del grupo* para borrar mensajes.'));

        const { raw, target } = await resolveTarget(sock, msg, chatId);
        if (!raw) {
            return msg.reply(`🍓 Responde al usuario o usa *.${extra.command} @usuario*.`);
        }
        if (!target) return msg.reply('⚠️ Ese usuario no pertenece al grupo.');
        if (isAdminP(target)) return msg.reply('⚠️ No puedes silenciar a un administrador del grupo.');

        const targetIds = [target.id, target.lid, target.phoneNumber, raw].filter(
            (jid): jid is string => typeof jid === 'string' && Boolean(jid)
        );
        setGroupUserMuted(chatId, targetIds, shouldMute);
        return msg.reply(deco(
            shouldMute ? '𝙼𝚄𝚃𝙴' : '𝚄𝙽𝙼𝚄𝚃𝙴',
            shouldMute ? 'El usuario ya no puede enviar mensajes en este grupo.' : 'El usuario puede volver a enviar mensajes.'
        ));
    } catch (error) {
        console.error(`[${shouldMute ? 'MUTE' : 'UNMUTE'} ERROR]:`, error);
        return msg.reply('⚠️ No pude actualizar el mute. Inténtalo de nuevo.');
    }
}
