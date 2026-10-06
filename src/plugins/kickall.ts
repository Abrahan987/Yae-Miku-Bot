export const command = ['kickall', 'purgegroup', 'limpiargrupo'];
export const category = 'admin';
export const description = 'Expulsa a todos del grupo excepto al owner.';
export const admin = true;
export const botAdmin = true;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 𝙴𝚂𝚃𝙴 𝙲𝙾𝙼𝙰𝙽𝙳𝙾 𝚂𝙾𝙻𝙾 𝙵𝚄𝙽𝙲𝙸𝙾𝙽𝙰 𝙴𝙽 𝙶𝚁𝚄𝙿𝙾𝚂.');
    }

    const chatId = msg.from || msg.chat || extra?.chat;

    try {
        msg.react('⏳');

        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata?.participants || [];
        const groupOwner = metadata?.owner;

        if (!groupOwner) {
            msg.react('❌');
            return msg.reply('⚠︎ 𝙽𝙾 𝚂𝙴 𝙿𝚄𝙳𝙾 𝙰𝚄𝚒𝚃𝚎𝚗𝚝𝚒𝚏𝚒𝚌𝚊𝚛 𝚊𝚕 𝚙𝚞𝚎𝚢𝚍𝚞𝚛𝚎𝚘𝚍𝚎𝚕𝚘𝚞𝚎𝚣𝚞𝚎𝚕𝚘.');
        }

        const toRemove: string[] = [];
        const botJid = sock.user?.id || '';

        for (const participant of participants) {
            const isOwner = participant.id === groupOwner;
            const isBot = participant.id === botJid;
            const isSender = participant.id === msg.sender;

            if (!isOwner && !isBot && !isSender) {
                toRemove.push(participant.id);
            }
        }

        if (toRemove.length === 0) {
            msg.react('ℹ️');
            return msg.reply('✧ 𝙽𝙰 𝙷𝙰𝚢 𝙿𝙴𝚁𝙱𝚂𝙰𝚂𝙿𝙰𝚁𝙰 𝙰𝚂𝙰𝙻𝚊𝚛.');
        }

        await sock.sendMessage(
            chatId,
            {
                text: `✧ 𝚃𝙾 𝙰𝙺𝙰́𝙽𝙿𝙿𝙿𝚊𝚛 𝙰 ${toRemove.length} 𝚌𝚘𝚠𝚊𝚢𝚘𝚜...\n\n` +
                    `⏳ 𝙿𝚘𝚘𝙿𝚞𝚃𝚃𝙴𝙼𝙾𝚂 𝙿𝚕𝙿𝙰́𝙼𝙿𝚘𝚞𝚊𝚜...`
            },
            { quoted: msg }
        );

        const batchSize = 50;
        for (let i = 0; i < toRemove.length; i += batchSize) {
            const batch = toRemove.slice(i, i + batchSize);
            try {
                await sock.groupParticipantsUpdate(chatId, batch, 'remove');
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error: any) {
                console.error('[KICKALL BATCH ERROR]:', error);
            }
        }

        msg.react('✅');

        return sock.sendMessage(
            chatId,
            {
                text: `✅ 𝙻𝚒𝚖𝚙𝚒𝚎𝚣𝚊 𝚌𝚘𝚖𝚙𝚕𝚎𝚝𝚊𝚍𝚊\n\n` +
                    `🗑️ 𝚂𝙴 𝙰𝙲𝙿𝙷𝚄𝙻𝚂𝖔𝚗 ${toRemove.length} 𝚖𝚒𝚎𝚖𝚋𝚛𝚘𝚜\n` +
                    `👥 𝚂𝙾𝙻𝙾 𝚀𝚞𝙴𝚍𝚊: 𝙾𝚠𝙽𝙴𝚁 𝚢 𝙰𝚍𝚖𝚒𝚗𝚎𝚜\n\n` +
                    `ꨄ︎ ${global.nmcreador}`
            },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error('[KICKALL ERROR]:', error);
        msg.react('❌');

        if (error?.output?.statusCode === 401 || error?.output?.statusCode === 500 || error?.data === 401) {
            return msg.reply(
                '✧ 𝙴𝙻 𝙱𝚘𝚝 𝚗𝚎𝚌𝚎𝚜𝚒𝚝𝚊 𝚜𝚎𝚛 𝙰𝚍𝚖𝚒𝚗𝚒𝚜𝚝𝚛𝚊𝚍𝚘𝚛 𝙿𝙰𝙾𝚊 𝚀𝚞𝙰𝚒𝚡𝚊𝚛 𝚖𝚒𝚎𝚖𝚋𝚛𝚘𝚜.'
            );
        }

        return msg.reply('⚠︎ 𝙾𝚌𝚞𝚛𝚛𝚒ó 𝚞𝚗 𝚎𝚛𝚛𝚘𝚛 𝚊𝚕 𝚕𝚒𝚖𝚙𝚒𝚊𝚛 𝚎𝚕 𝚐𝚛𝚞𝚙𝚘.');
    }
}
