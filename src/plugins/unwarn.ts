import { removeWarning } from '../lib/database.ts';

export const command = ['unwarn', 'quitarwarn', 'desadvertir'];
export const category = 'admin';
export const description = 'Quita una advertencia a un usuario del grupo.';
export const admin = true;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 𝙴𝚂𝚃𝙴 𝙲𝙾𝙼𝙰𝙽𝙳𝙾 𝚂𝙾𝙻𝙾 𝙵𝚄𝙽𝙲𝙸𝙾𝙽𝙰 𝙴𝙽 𝙶𝚁𝚄𝙿𝙾𝚂.');
    }

    const chatId = msg.from || msg.chat || extra?.chat;

    try {
        const mentions = msg.mentionedJid || [];
        let targetJid = mentions[0];

        if (!targetJid && msg.quoted) {
            targetJid = msg.quoted.sender;
        }

        if (!targetJid) {
            return msg.reply(
                `🍓 𝚄𝚂𝙾\n\n` +
                `> ${global.prefix[0]}unwarn @usuario\n` +
                `> Responde a su mensaje`
            );
        }

        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata?.participants || [];
        const targetParticipant = participants.find((p: any) => p.id === targetJid);

        if (!targetParticipant) {
            return msg.reply('⚠︎ 𝙴𝙻 𝚄𝚂𝚄𝙰𝚁𝙸𝙾 𝙽𝙾 𝙴𝚂𝚃𝙰́ 𝙴𝙽 𝙴𝙻 𝙶𝚁𝚄𝙿𝙾.');
        }

        const remaining = removeWarning(chatId, targetJid);

        if (remaining <= 0) {
            return sock.sendMessage(
                chatId,
                {
                    text:
                        `✅ 𝙰𝙳𝚅𝙴𝚁𝚃𝙴𝙽𝙲𝙸𝙰𝚂 𝙻𝙸𝙼𝙿𝙸𝙰𝚂\n\n` +
                        `🪷 @${targetJid.split('@')[0]} 𝚢𝚊 𝚗��� 𝚝𝚒𝚎𝚗𝚎 𝚊𝚍𝚟𝚎𝚛𝚝𝚎𝚗𝚌𝚒𝚊𝚜.`,
                    mentions: [targetJid]
                },
                { quoted: msg }
            );
        }

        return sock.sendMessage(
            chatId,
            {
                text:
                    `✅ 𝚂𝙴 𝚀𝚄𝙸𝚃𝙾 𝟷 𝙰𝙳𝚅𝙴𝚁𝚃𝙴𝙽𝙲𝙸𝙰\n\n` +
                    `🪷 @${targetJid.split('@')[0]}\n` +
                    `📌 𝚁𝚎𝚜𝚝𝚊𝚗 ${remaining}/3`,
                mentions: [targetJid]
            },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error('[UNWARN ERROR]:', error);
        return msg.reply('⚠︎ 𝙾𝙲𝚄𝚁𝚁𝙸Ó 𝚄𝙽 𝙴𝚁𝚁𝙾𝚁 𝙰𝙻 𝚀𝚄𝙸𝚃𝙰𝚁 𝙻𝙰 𝙰𝙳𝚅𝙴𝚁𝚃𝙴𝙽𝙲𝙸𝙰.');
    }
}
