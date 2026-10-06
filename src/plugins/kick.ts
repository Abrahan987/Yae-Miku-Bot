export const command = ['kick', 'remove', 'out'];
export const category = 'admin';
export const description = 'Expulsa a un miembro del grupo.';
export const admin = false;
export const botAdmin = false;

const num = (x: any): string =>
    String(x || '').split('@')[0].split(':')[0].replace(/[^\d]/g, '');

function ids(p: any): string[] {
    return [p?.id, p?.lid, p?.phoneNumber].map(num).filter(Boolean);
}

function findParticipant(participants: any[], ...jids: any[]): any {
    const wanted = jids.map(num).filter(Boolean);
    if (!wanted.length) return null;
    return participants.find((p: any) => ids(p).some((i) => wanted.includes(i))) || null;
}

const isAdminP = (p: any) => p?.admin === 'admin' || p?.admin === 'superadmin';

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 Este comando solo funciona en grupos.');
    }

    const chatId = msg.from || msg.chat;

    try {
        const metadata = await sock.groupMetadata(chatId);
        const participants: any[] = metadata?.participants || [];

        const rawSender = msg.key?.participant || msg.sender;
        const senderP = findParticipant(participants, msg.sender, rawSender);
        const ownerNum = num((global as any).owner);
        const esOwner = !!ownerNum && [msg.sender, rawSender].map(num).includes(ownerNum);

        if (!isAdminP(senderP) && !extra?.isAdmin && !esOwner) {
            return msg.reply('⚠️ Necesitas ser administrador del grupo para usar este comando.');
        }

        const botP = findParticipant(participants, sock.user?.id, sock.user?.lid);

        if (!isAdminP(botP) && !extra?.isBotAdmin) {
            return msg.reply(
                `⚠️ No soy administrador\n\n` +
                `🍥 Necesito ser administrador para expulsar a alguien.`
            );
        }

        let targetJid = (msg.mentionedJid || [])[0];

        if (!targetJid && msg.quoted) {
            targetJid = msg.quoted.sender;
        }

        if (!targetJid) {
            return msg.reply(
                `🍓 Uso\n\n` +
                `> ${(global as any).prefix?.[0] || '.'}kick @usuario\n` +
                `> O responde a su mensaje`
            );
        }

        const targetP = findParticipant(participants, targetJid);

        if (!targetP) {
            return msg.reply('⚠️ Este usuario no está en el grupo.');
        }

        if (isAdminP(targetP)) {
            return msg.reply('⚠️ No puedo eliminar a un administrador.');
        }

        const removeJid = targetP.id || targetJid;
        const nombre = targetP.pushName || `@${num(removeJid)}`;

        await sock.groupParticipantsUpdate(chatId, [removeJid], 'remove');

        return sock.sendMessage(
            chatId,
            {
                text:
                    `✅ *MIEMBRO EXPULSADO*\n\n` +
                    `🪷 ${nombre} fue expulsado del grupo.`,
                mentions: [removeJid]
            },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error('[KICK ERROR]:', error);

        const status = error?.output?.statusCode || error?.data || error?.status;

        if (status === 401 || status === 403 || status === 500) {
            return msg.reply(
                `⚠️ No pude ejecutar la acción.\n\n` +
                `🍥 Verifica que el bot sea administrador.`
            );
        }

        return msg.reply('⚠️ Ocurrió un error al expulsar al usuario.');
    }
}
