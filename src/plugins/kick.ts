export const command = ['kick', 'remove', 'out'];
export const category = 'admin';
export const description = 'Expulsa a un miembro del grupo.';
export const admin = true;
export const botAdmin = true;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 Este comando solo funciona en grupos.');
    }

    const chatId = msg.from || msg.chat;

    try {
        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata?.participants || [];

        const botRawJid = sock.user?.id || '';
        const botNumber = botRawJid.split(':')[0].split('@')[0];

        const botParticipant = participants.find((p: any) => {
            const id = p.id || '';
            const pNum = id.split(':')[0].split('@')[0];
            return pNum === botNumber;
        });

        if (!botParticipant || !botParticipant.admin) {
            return msg.reply(
                `⚠️ No soy administrador\n\n` +
                `🍥 Necesito ser administrador para expulsar a alguien.`
            );
        }

        const mentions = msg.mentionedJid || [];
        let targetJid = mentions[0];

        if (!targetJid && msg.quoted) {
            targetJid = msg.quoted.sender;
        }

        if (!targetJid) {
            return msg.reply(
                `🍓 Uso\n\n` +
                `> ${global.prefix?.[0] || '.'}kick @usuario\n` +
                `> O responde a su mensaje`
            );
        }

        const targetParticipant = participants.find((p: any) => p.id === targetJid);

        if (!targetParticipant) {
            return msg.reply('⚠️ Este usuario no está en el grupo.');
        }

        if (targetParticipant.admin) {
            return msg.reply('⚠️ No puedo eliminar a un administrador.');
        }

        await sock.groupParticipantsUpdate(chatId, [targetJid], 'remove');

        const number = targetJid.split('@')[0];

        return sock.sendMessage(
            chatId,
            {
                text:\n                    `✅ *MIEMBRO EXPULSADO*\n\n` +\n                    `🪷 @${number} fue expulsado del grupo.`,\n                mentions: [targetJid]\n            },\n            { quoted: msg }\n        );\n    } catch (error: any) {\n        console.error('[KICK ERROR]:', error);\n\n        const status = error?.output?.statusCode || error?.data || error?.status;\n\n        if (status === 401 || status === 403 || status === 500) {\n            return msg.reply(\n                `⚠️ No pude ejecutar la acción.\n\n` +\n                `🍥 Verifica que el bot sea administrador.`\n            );\n        }\n\n        return msg.reply('⚠️ Ocurrió un error al expulsar al usuario.');\n    }\n}\n