import axios from 'axios';

export const command = ['pinterest', 'pin', 'pinterestdl'];
export const category = 'descargas';
export const description = 'Busca 5 imágenes de Pinterest y las envía en álbum.';

export default async function (sock: any, msg: any, extra: any, db: any) {
    const query = extra.args.join(' ').trim();

    if (!query) {
        return msg.reply(
            `ᅟㅤ 𓈒    |꛱ ᷼ |꛱ ᷼ |ㅤֵㅤ  ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒\n\n` +
            `${global.namebot}\n` +
            `𐴲੭  ˙ 𓂃  🍥  𓂃  ˙\n\n` +
            `🍓͜ᩧ𑂳ᰍ  𝙿𝙸𝙽𝚃𝙴𝚁𝙴𝚂𝚃\n\n` +
            `🪷 𝙸𝙽𝙶𝚁𝙴𝚂𝙰 𝚄𝙽 𝚃É𝚁𝙼𝙸𝙽𝙾 𝙳𝙴 𝙱Ú𝚂𝚀𝚄𝙴𝙳𝙰\n\n` +
            `🍥 𝙴𝙹𝙴𝙼𝙿𝙻𝙾\n` +
            `> ${global.prefix[0]}𝚙𝚒𝚗𝚝𝚎𝚛𝚎𝚜𝚝 rizadas`
        );
    }

    try {
        await msg.reply(
            `ᅟㅤ 𓈒    |꛱ ᷼ |꛱ ᷼ |ㅤֵㅤ  ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒\n\n` +
            `${global.namebot}\n` +
            `𐴲੭  ˙ 𓂃  🍥  𓂃  ˙\n\n` +
            `🍓͜ᩧ𑂳ᰍ  𝙿𝙸𝙽𝚃𝙴𝚁𝙴𝚂𝚃\n\n` +
            `🪷 𝙱𝚄𝚂𝙲𝙰𝙽𝙳𝙾 𝙸𝙼Á𝙶𝙴𝙽𝙴𝚂...`
        );

        const response = await axios.get(
            'https://api.stellarwa.xyz/search/pinterest',
            {
                params: {
                    query,
                    key: global.key
                },
                timeout: 90000,
                headers: {
                    Accept: 'application/json',
                    'User-Agent': 'Mozilla/5.0'
                }
            }
        );

        const data = response.data;

        if (
            data?.status !== true ||
            !Array.isArray(data?.data) ||
            data.data.length === 0
        ) {
            throw new Error(
                data?.message || 'No se encontraron resultados.'
            );
        }

        const results = data.data
            .filter((item: any) => item?.hd || item?.mini)
            .slice(0, 5);

        if (results.length === 0) {
            throw new Error('No hay imágenes disponibles.');
        }

        const album = results.map((item: any) => ({
            image: {
                url: item.hd || item.mini
            }
        }));

        await sock.sendMessage(
            msg.from,
            {
                album
            },
            {
                quoted: msg
            }
        );
    } catch (error: any) {
        console.error(
            '[PINTEREST]',
            error?.response?.status || '',
            error?.response?.data || error?.message || error
        );

        await msg.reply(
            `⚠︎ 𝙽𝙾 𝚂𝙴 𝙿𝚄𝙳𝙸𝙴𝚁𝙾𝙽 𝙴𝙽𝚅𝙸𝙰𝚁 𝙻𝙰𝚂 𝙸𝙼Á𝙶𝙴𝙽𝙴𝚂`
        );
    }
}
