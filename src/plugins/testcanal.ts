export const command = ['testcanal'];
export const category = 'owner';
export const description = 'Prueba el envío al canal.';

export default async function (sock: any, msg: any, extra: any, db: any) {
    const jid = global.rcanal;

    if (!jid) {
        return msg.reply('⚠︎ 𝙽𝙾 𝙴𝚇𝙸𝚂𝚃𝙴 𝙶𝙻𝙾𝙱𝙰𝙻.𝚁𝙲𝙰𝙽𝙰𝙻');
    }

    console.log('[CANAL] JID:', jid);

    try {
        const metadata = await sock.newsletterMetadata('jid', jid);

        console.log('[CANAL] METADATA:', metadata);

        await sock.sendMessage(jid, {
            text: `🍓 𝙿𝚁𝚄𝙴𝙱𝙰 𝙳𝙴 𝙲𝙰𝙽𝙰𝙻\n\n${global.namebot}\n${global.nmcreador}`
        });

        await msg.reply('ꨄ︎ 𝙼𝙴𝙽𝚂𝙰𝙹𝙴 𝙴𝙽𝚅𝙸𝙰𝙳𝙾 𝙰𝙻 𝙲𝙰𝙽𝙰𝙻');
    } catch (error: any) {
        console.error(
            '[CANAL ERROR]',
            error?.stack || error?.message || error
        );

        await msg.reply(
            `⚠︎ 𝙴𝚁𝚁𝙾𝚁 𝙰𝙻 𝙴𝙽𝚅𝙸𝙰𝚁\n\n${error?.message || error}`
        );
    }
}
