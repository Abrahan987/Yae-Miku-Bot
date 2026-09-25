import axios from 'axios';

export const command = ['pinterest', 'pin', 'pinterestdl'];
export const category = 'descargas';
export const description = 'Busca imágenes de Pinterest y las envía en álbum.';

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
            `> ${global.prefix[0]}𝚙𝚒𝚗𝚝𝚎𝚛𝚎𝚜𝚝 anime aesthetic`
        );
    }

    try {
        await msg.reply(
            `ᅟㅤ 𓈒    |꛱ ᷼ |꛱ ᷼ |ㅤֵㅤ  ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |ㅤ 𓈒\n\n` +
            `${global.namebot}\n` +
            `𐴲੭  ˙ 𓂃  🍥  𓂃  ˙\n\n` +
            `🍓͜ᩧ𑂳ᰍ  𝙿𝙸𝙽𝚃𝙴𝚁𝙴𝚂𝚃\n\n` +
            `🪷 𝙱𝚄𝚂𝙲𝙰𝙽𝙳𝙾 𝙸𝙼Á𝙶𝙴𝙽𝙴𝚂...`
        );

        const response = await axios.get(
            'https://api.stellarwa.xyz/search/pinterest',
            {
                params: {
                    q: query,
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
            throw new Error('No se encontraron imágenes válidas.');
        }

        const album: any[] = [];

        for (const result of results) {
            const imageUrl = result.hd || result.mini;

            try {
                const imageResponse = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 90000,
                    maxContentLength: 25 * 1024 * 1024,
                    maxBodyLength: 25 * 1024 * 1024,
                    maxRedirects: 10,
                    headers: {
                        'User-Agent': 'Mozilla/5.0',
                        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                        Referer: 'https://www.pinterest.com/'
                    }
                });

                const buffer = Buffer.from(imageResponse.data);

                if (!buffer.length) {
                    continue;
                }

                album.push({
                    image: buffer,
                    caption:
                        `🍓͜ᩧ𑂳ᰍ  𝙿𝙸𝙽𝚃𝙴𝚁𝙴𝚂𝚃\n\n` +
                        `🪷 𝚃Í𝚃𝚄𝙻𝙾 ── ${result.title || '𝚂𝙸𝙽 𝚃Í𝚃𝚄𝙻𝙾'}\n` +
                        `🍥 𝙰𝚄𝚃𝙾𝚁 ── ${result.full_name || '𝙳𝙴𝚂𝙲𝙾𝙽𝙾𝙲𝙸𝙳𝙾'}\n` +
                        `> 𝚄𝚂𝚄𝙰𝚁𝙸𝙾 ── @${result.username || '𝙳𝙴𝚂𝙲𝙾𝙽𝙾𝙲𝙸𝙳𝙾'}\n` +
                        `> 𝙻𝙸𝙺𝙴𝚂 ── ${new Intl.NumberFormat('es-CO').format(Number(result.likes || 0))}\n` +
                        `> 𝚂𝙴𝙶𝚄𝙸𝙳𝙾𝚁𝙴𝚂 ── ${new Intl.NumberFormat('es-CO').format(Number(result.followers || 0))}\n\n` +
                        `ꨄ︎ ${global.nmcreador}`
                });
            } catch (error: any) {
                console.error(
                    '[PINTEREST IMAGE]',
                    error?.response?.status || error?.message || error
                );
            }
        }

        if (album.length === 0) {
            throw new Error('No se pudo descargar ninguna imagen.');
        }

        if (album.length === 1) {
            await sock.sendMessage(
                msg.from,
                {
                    image: album[0].image,
                    caption: album[0].caption
                },
                {
                    quoted: msg
                }
            );

            return;
        }

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
            `⚠︎ 𝙽𝙾 𝚂𝙴 𝙿𝚄𝙳𝙾 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙻𝙰𝚂 𝙸𝙼Á𝙶𝙴𝙽𝙴𝚂`
        );
    }
}
