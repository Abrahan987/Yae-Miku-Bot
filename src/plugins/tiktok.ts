import axios from 'axios';

export const command = ['tiktok', 'tt', 'ttdl'];
export const category = 'descargas';
export const description = 'Descarga videos de TikTok.';

export default async function (sock: any, msg: any, extra: any, db: any) {
    const url = extra.args.join(' ').trim();

    if (!url) {
        return msg.reply(
            `ᅟㅤ 𓈒    |꛱ ᷼ |꛱ ᷼ |ㅤֵㅤ  ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒\n\n` +
            `𖫨𖫨🪷⃨᪲  𖫨𖫨🪷⃨᪲  ${global.namebot}\n` +
            `𐴲੭  ˙ 𓂃  🍥  𓂃  ˙\n\n` +
            `🍓͜ᩧ𑂳ᰍ  𝚃𝙸𝙺𝚃𝙾𝙺\n\n` +
            `🪷 𝙴𝙽𝚅Í𝙰 𝙴𝙻 𝙴𝙽𝙻𝙰𝙲𝙴 𝙳𝙴𝙻 𝚅Í𝙳𝙴𝙾\n\n` +
            `🍥 𝙴𝙹𝙴𝙼𝙿𝙻𝙾\n` +
            `> ${global.prefix[0]}𝚝𝚒𝚔𝚝𝚘𝚔 https://vt.tiktok.com/...`
        );
    }

    if (!/tiktok\.com/i.test(url)) {
        return msg.reply(
            `⚠︎ 𝙴𝙻 𝙴𝙽𝙻𝙰𝙲𝙴 𝙽𝙾 𝙿𝙰𝚁𝙴𝙲𝙴 𝚂𝙴𝚁 𝙳𝙴 𝚃𝙸𝙺𝚃𝙾𝙺`
        );
    }

    try {
        await msg.reply(
            `ᅟㅤ 𓈒    |꛱ ᷼ |꛱ ᷼ |ㅤֵㅤ  ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒\n\n` +
            `𖫨𖫨🪷⃨᪲  𖫨𖫨🪷⃨᪲  ${global.namebot}\n` +
            `𐴲੭  ˙ 𓂃  🍥  𓂃  ˙\n\n` +
            `🍓͜ᩧ𑂳ᰍ  𝚃𝙸𝙺𝚃𝙾𝙺\n\n` +
            `🪷 𝙱𝚄𝚂𝙲𝙰𝙽𝙳𝙾 𝙸𝙽𝙵𝙾𝚁𝙼𝙰𝙲𝙸Ó𝙽...`
        );

        const response = await axios.get(
            'https://api.stellarwa.xyz/dl/tiktok',
            {
                params: {
                    url,
                    key: global.key
                },
                timeout: 60000,
                headers: {
                    Accept: 'application/json'
                }
            }
        );

        const data = response.data;

        if (data?.status !== true || !data?.data?.dl) {
            throw new Error(
                data?.message || 'La API no devolvió información válida'
            );
        }

        const info = data.data;

        const title = info.title || '𝚂𝙸𝙽 𝚃Í𝚃𝚄𝙻𝙾';
        const duration = info.duration || '𝙳𝙴𝚂𝙲𝙾𝙽𝙾𝙲𝙸𝙳𝙰';
        const nickname = info.author?.nickname || '𝙳𝙴𝚂𝙲𝙾𝙽𝙾𝙲𝙸𝙳𝙾';

        const plays = Number(info.stats?.plays || 0);
        const likes = Number(info.stats?.likes || 0);
        const comments = Number(info.stats?.comments || 0);
        const shares = Number(info.stats?.shares || 0);

        const formatNumber = (number: number) =>
            new Intl.NumberFormat('es-CO').format(number);

        const videoResponse = await axios.get(info.dl, {
            responseType: 'arraybuffer',
            timeout: 180000,
            maxContentLength: 150 * 1024 * 1024,
            maxBodyLength: 150 * 1024 * 1024,
            maxRedirects: 10,
            headers: {
                'User-Agent': 'Mozilla/5.0',
                Accept: 'video/mp4,video/*,*/*'
            }
        });

        const videoBuffer = Buffer.from(videoResponse.data);

        if (!videoBuffer.length) {
            throw new Error('Video vacío');
        }

        await sock.sendMessage(
            msg.from,
            {
                video: videoBuffer,
                mimetype: 'video/mp4',
                caption:
                    `🍓͜ᩧ𑂳ᰍ  𝚅Í𝙳𝙴𝙾 𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰𝙳𝙾\n\n\n` +
                    `🪷 𝚃Í𝚃𝚄𝙻𝙾 ── ${title}\n` +
                    `🍥 𝙰𝚄𝚃𝙾𝚁 ── ${nickname}\n` +
                    `> 𝙳𝚄𝚁𝙰𝙲𝙸Ó𝙽 ── ${duration}\n` +
                    `> 𝚅𝙸𝚂𝚃𝙰𝚂 ── ${formatNumber(plays)}\n` +
                    `> 𝙻𝙸𝙺𝙴𝚂 ── ${formatNumber(likes)}\n` +
                    `> 𝙲𝙾𝙼𝙴𝙽𝚃𝙰𝚁𝙸𝙾𝚂 ── ${formatNumber(comments)}\n` +
                    `> 𝙲𝙾𝙼𝙿𝙰𝚁𝚃𝙸𝙳𝙾𝚂 ── ${formatNumber(shares)}\n\n` +
                    `ꨄ︎ ${global.nmcreador}`
            },
            {
                quoted: msg
            }
        );
    } catch (error: any) {
        console.error(
            '[TIKTOK]',
            error?.response?.status ||
            error?.response?.data ||
            error?.message ||
            error
        );

        await msg.reply(
            `⚠︎ 𝙾𝙲𝚄𝚁𝚁𝙸Ó 𝚄𝙽 𝙴𝚁𝚁𝙾𝚁 𝙰𝙻 𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰𝚁 𝙴𝙻 𝚅Í𝙳𝙴𝙾`
        );
    }
}
