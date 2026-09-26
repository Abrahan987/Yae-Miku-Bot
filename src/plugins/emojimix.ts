import axios from 'axios';

export const command = ['emojimix', 'mixemoji', 'mix'];
export const category = 'herramientas';
export const description = 'Combina dos emojis en uno.';

export default async function (sock: any, msg: any, extra: any, db: any) {
    const args = extra.args || [];
    const emoji1 = args[0];
    const emoji2 = args[1];

    if (!emoji1 || !emoji2) {
        return msg.reply(
            `ᅟㅤ 𓈒    |꛱ ᷼ |꛱ ᷼ |ㅤֵㅤ  ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒\n\n` +
            `${global.namebot}\n` +
            `𐴲੭  ˙ 𓂃  🍥  𓂃  ˙\n\n` +
            `🍓͜ᩧ𑂳ᰍ  𝙴𝙼𝙾𝙹𝙸𝙼𝙸𝚇\n\n` +
            `🪷 𝚄𝚂𝙾\n` +
            `> ${global.prefix[0]}𝚎𝚖𝚘𝚓𝚒𝚖𝚒𝚡 😭 😂\n\n` +
            `🍥 𝙴𝙹𝙴𝙼𝙿𝙻𝙾\n` +
            `> ${global.prefix[0]}𝚎𝚖𝚘𝚓𝚒𝚖𝚒𝚡 🥰 😭\n\n` +
            `ꨄ︎ ${global.nmcreador}`
        );
    }

    try {
        await msg.reply(
            `ᅟㅤ 𓈒    |꛱ ᷼ |꛱ ᷼ |ㅤֵㅤ  ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒\n\n` +
            `${global.namebot}\n` +
            `𐴲੭  ˙ 𓂃  🍥 𓂃  ˙\n\n` +
            `🍓͜ᩧ𑂳ᰍ  𝙴𝙼𝙾𝙹𝙸𝙼𝙸𝚇\n\n` +
            `🪷 𝙲𝙾𝙼𝙱𝙸𝙽𝙰𝙽𝙳𝙾 ── ${emoji1} + ${emoji2}\n\n` +
            `ꨄ︎ ${global.nmcreador}`
        );

        const response = await axios.get(
            'https://api.stellarwa.xyz/tools/emojimix',
            {
                params: {
                    emoji1,
                    emoji2,
                    key: global.key
                },
                responseType: 'arraybuffer',
                timeout: 60000
            }
        );

        const contentType = response.headers['content-type'] || 'image/png';

        await sock.sendMessage(
            msg.from,
            {
                image: Buffer.from(response.data),
                mimetype: contentType,
                caption:
                    `🍓͜ᩧ𑂳ᰍ  𝙴𝙼𝙾𝙹𝙸𝙼𝙸𝚇\n\n` +
                    `🪷 ${emoji1} + ${emoji2}\n\n` +
                    `ꨄ︎ ${global.nmcreador}`
            },
            {
                quoted: msg
            }
        );
    } catch (error: any) {
        console.error(
            '[EMOJIMIX]',
            error?.response?.data || error?.message || error
        );

        await msg.reply(
            `⚠︎ 𝙽𝙾 𝙿𝚄𝙳𝙴 𝙲𝙾𝙼𝙱𝙸𝙽𝙰𝚁 𝙴𝚂𝙾𝚂 𝙴𝙼𝙾𝙹𝙸𝚂`
        );
    }
}
