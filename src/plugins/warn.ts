import { addWarning } from '../lib/database.ts';

export const command = ['warn', 'advertir', 'aviso'];
export const category = 'admin';
export const description = 'Agrega una advertencia a un usuario del grupo.';
export const admin = true;
export const botAdmin = true;

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
                `> ${global.prefix[0]}warn @usuario\n` +
                `> Responde a su mensaje`
            );
        }

        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata?.participants || [];
        const targetParticipant = participants.find((p: any) => p.id === targetJid);

        if (!targetParticipant) {
            return msg.reply('⚠︎ 𝙴𝙻 𝚄𝚂𝚄𝙰𝚁𝙸𝙾 𝙽𝙾 𝙴𝚂𝚃𝙰́ 𝙴𝙽 𝙴𝙻 𝙶𝚁𝚄𝙿𝙾.');
        }

        if (targetParticipant.admin) {
            return msg.reply('⚠︎ 𝙽𝙾 𝙿𝚄𝙴𝙳𝙾 𝙰𝙳𝚅𝙴𝚁𝚃𝙸𝚁 𝙰 𝚄𝙽 𝙰𝙳𝙼𝙸𝙽.');
        }

        const total = addWarning(chatId, targetJid);

        if (total >= 3) {
            await sock.groupParticipantsUpdate(chatId, [targetJid], 'remove');

            return sock.sendMessage(
                chatId,
                {
                    text:
                        `🚨 𝙰𝙳𝚅𝙴𝚁𝚃𝙴𝙽𝙲𝙸𝙰 𝙼𝙰𝚇𝙸𝙼𝙰 𝙰𝙻𝙲𝙰𝙽𝚉𝙰𝙳𝙰\n\n` +
                        `🪷 @${targetJid.split('@')[0]} 𝚑𝚊 𝚛𝚎𝚌𝚒𝚋𝚒𝚍𝚘 𝟹 𝚊𝚍𝚟𝚎𝚛𝚝𝚎𝚗𝚌𝚒𝚊𝚜.\n` +
                        `❌ 𝚂𝚎 𝚑𝚊 𝚎𝚡𝚙𝚞𝚕𝚜𝚊𝚍𝚘 𝚊𝚞𝚝𝚘𝚖𝚊́𝚝𝚒𝚌𝚊𝚖𝚎𝚗𝚝𝚎.`,
                    mentions: [targetJid]
                },
                { quoted: msg }
            );
        }

        return sock.sendMessage(
            chatId,
            {
                text:
                    `⚠️ 𝙰𝙳𝚅𝙴𝚁𝚃𝙴𝙽𝙲𝙸𝙰\n\n` +
                    `🪷 @${targetJid.split('@')[0]}\n` +
                    `📌 𝚃𝚒𝚎𝚗𝚎 ${total}/3 𝚊𝚍𝚟𝚎𝚛𝚝𝚎𝚗𝚌𝚒𝚊𝚜.`,
                mentions: [targetJid]
            },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error('[WARN ERROR]:', error);
        return msg.reply('⚠︎ 𝙾𝙲𝚄𝚁𝚁𝙸Ó 𝚄𝙽 𝙴𝚁𝚁𝙾𝚁 𝙰𝙻 𝚁𝙴𝙶𝙸𝚂𝚃𝚁𝙰𝚁 𝙻𝙰 𝙰𝙳𝚅𝙴𝚁𝚃𝙴𝙽𝙲𝙸𝙰.');
    }
}
