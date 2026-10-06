export const command = ['kick', 'remove', 'out'];
export const category = 'admin';
export const description = 'Expulsa a un miembro del grupo.';
export const admin = true;
export const botAdmin = true;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 𝙴𝚂𝚃𝙴 𝙲𝙾𝙼𝙰𝙽𝙳𝙾 𝚂𝙾𝙻𝙾 𝙵𝚄𝙽𝙲𝙸𝙾𝙽𝙰 𝙴𝙽 𝙶𝚁𝚄𝙿𝙾𝚂.');
    }

    const chatId = msg.from || msg.chat || extra?.chat;

    try {
        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata?.participants || [];

        const botRawJid = sock.user?.id || '';
        const botNumber = botRawJid.split(':')[0].split('@')[0];

        const botParticipant = participants.find((p: any) => {
            const id = p.id || '';
            return id.split(':')[0].split('@')[0] === botNumber;
        });

        if (!botParticipant?.admin) {
            return msg.reply(
                `⚠︎ 𝙽𝙾 𝚂𝙾𝚈 𝙰𝙳𝙼𝙸𝙽\n\n` +
                `🍥 𝙽𝙴𝙲𝙴𝚂𝙸𝚃𝙾 𝚂𝙴𝚁 𝙰𝙳𝙼𝙸𝙽 𝙿𝙰𝚁𝙰 𝙴𝙲𝙷𝙰𝚁 𝙰 𝙰𝙻𝙶𝚄𝙸𝙴𝙽.`
            );
        }

        const mentions = msg.mentionedJid || [];
        let targetJid = mentions[0];

        if (!targetJid && msg.quoted) {
            targetJid = msg.quoted.sender;
        }

        if (!targetJid) {
            return msg.reply(
                `🍓 𝚄𝚂𝙾\n\n` +
                `> ${global.prefix[0]}kick @usuario\n` +
                `> Responde a su mensaje`
            );
        }

        const targetParticipant = participants.find((p: any) => p.id === targetJid);

        if (!targetParticipant) {
            return msg.reply('⚠︎ 𝙴𝙻 𝚄𝚂𝚄𝙰𝚁𝙸𝙾 𝙽𝙾 𝙴𝚂𝚃𝙰́ 𝙴𝙽 𝙴𝙻 𝙶𝚁𝚄𝙿𝙾.');
        }

        if (targetParticipant.admin) {
            return msg.reply('⚠︎ 𝙽𝙾 𝙿𝚄𝙴𝙳𝙾 𝙴𝙻𝙸𝙼𝙸𝙽𝙰𝚁 𝙰 𝚄𝙽 𝙰𝙳𝙼𝙸𝙽.');
        }

        await sock.groupParticipantsUpdate(chatId, [targetJid], 'remove');

        const number = targetJid.split('@')[0];

        return sock.sendMessage(
            chatId,
            {
                text:
                    `🍓͜ᩧ𑂳ᰍ  𝙼𝙸𝙴𝙼𝙱𝚁𝙾 𝙴𝚇𝙿𝚄𝙻𝚂𝙰𝙳𝙾\n\n` +
                    `🪷 @${number}`,
                mentions: [targetJid]
            },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error('[KICK ERROR]:', error);

        const status = error?.output?.statusCode || error?.data || error?.status;

        if (status === 401 || status === 403 || status === 500) {
            return msg.reply(
                `⚠︎ 𝙽𝙾 𝙿𝚄𝙳𝙴 𝙴𝙹𝙴𝙲𝚄𝚃𝙰𝚁 𝙻𝙰 𝙰𝙲𝙲𝙸Ó𝙽.\n\n` +
                `🍥 𝚅𝙴𝚁𝙸𝙵𝙸𝙲𝙰 𝚀𝚄𝙴 𝙴𝙻 𝙱𝙾𝚃 𝚂𝙴𝙰 𝙰𝙳𝙼𝙸𝙽.`
            );
        }

        return msg.reply('⚠︎ 𝙾𝙲𝚄𝚁𝚁𝙸Ó 𝚄𝙽 𝙴𝚁𝚁𝙾𝚁 𝙰𝙻 𝙴𝙲𝙷𝙰𝚁 𝙰𝙻 𝚄𝚂𝚄𝙰𝚁𝙸𝙾.');
    }
}
