import axios from 'axios';

export const command = ['waifu'];
export const category = 'anime';
export const description = 'Envía una imagen aleatoria de una waifu.';

export default async function (sock: any, msg: any, extra: any, db: any) {
    try {
        const response = await axios.get(
            'https://api.stellarwa.xyz/anime/waifu?key=abrahan',
            {
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        await sock.sendMessage(
            msg.from,
            {
                image: Buffer.from(response.data),
                caption:
                    `𖫨𖫨🪷⃨᪲  ${global.namebot}\n` +
                    `𐴲੭  ˙ 𓂃  🍥  𓂃  ˙\n\n` +
                    `🍓͜ᩧ𑂳ᰍ  𝚆𝙰𝙸𝙵𝚄\n\n` +
                    `🪷 𝙰𝙽𝙸𝙼𝙴 𝚆𝙰𝙸𝙵𝚄\n\n` +
                    `ꨄ︎ ${global.nmcreador}`
            },
            {
                quoted: msg
            }
        );
    } catch (error: any) {
        console.error(
            '[WAIFU]',
            error?.response?.status || error?.message || error
        );

        await msg.reply(
            `⚠︎ 𝙽𝙾 𝚂𝙴 𝙿𝚄𝙳𝙾 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙻𝙰 𝙸𝙼Á𝙶𝙴𝙽`
        );
    }
}
