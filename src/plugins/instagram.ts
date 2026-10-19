import axios from 'axios';

export const command = ['instagram', 'ig', 'igdl'];
export const category = 'descargas';
export const description = 'Descarga videos de Instagram.';

const API_URL = 'https://api.stellarwa.xyz';

export default async function (sock: any, msg: any, extra: any, db: any) {
    const url = extra.args.join(' ').trim();

    if (!url) {
        return msg.reply(
            `🍓 𝙸𝙽𝚂𝚃𝙰𝙶𝚁𝙰𝙼\n` +
            `─────── ❀ ───────\n\n` +
            `🪷 𝙴𝙽𝚅Í𝙰 𝙴𝙻 𝙴𝙽𝙻𝙰𝙲𝙴 𝙳𝙴𝙻 𝚅Í𝙳𝙴𝙾\n\n` +
            `🍥 𝙴𝙹𝙴𝙼𝙿𝙻𝙾\n` +
            `> .𝚒𝚐 https://instagram.com/reel/...`
        );
    }

    if (!/instagram\.com/i.test(url)) {
        return msg.reply(
            `⚠︎ 𝙴𝙻 𝙴𝙽𝙻𝙰𝙲𝙴 𝙽𝙾 𝙿𝙰𝚁𝙴𝙲𝙴 𝚂𝙴𝚁 𝙳𝙴 𝙸𝙽𝚂𝚃𝙰𝙶𝚁𝙰𝙼`
        );
    }

    try {
        await msg.reply(
            `🍓 𝙸𝙽𝚂𝚃𝙰𝙶𝚁𝙰𝙼\n` +
            `─────── ❀ ───────\n\n` +
            `🪷 𝙿𝚁𝙾𝙲𝙴𝚂𝙰𝙽𝙳𝙾 𝚅Í𝙳𝙴𝙾...`
        );

        const response = await axios.get(
            `${API_URL}/dl/instagram`,
            {
                params: {
                    url,
                    key: global.key
                },
                timeout: 60000,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        const data = response.data;

        if (!data?.status || !Array.isArray(data?.result) || !data.result.length) {
            return msg.reply(
                `⚠︎ 𝙽𝙾 𝙿𝚄𝙳𝙴 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝚅Í𝙳𝙴𝙾`
            );
        }

        const video = data.result.find(
            (item: any) => item.type === 'video'
        );

        if (!video?.url) {
            return msg.reply(
                `⚠︎ 𝙻𝙰 𝙰𝙿𝙸 𝙽𝙾 𝙳𝙴𝚅𝙾𝙻𝚅𝙸Ó 𝚄𝙽 𝚅Í𝙳𝙴𝙾`
            );
        }

        await msg.reply(
            `🍓 𝙸𝙽𝚂𝚃𝙰𝙶𝚁𝙰𝙼\n` +
            `─────── ❀ ───────\n\n` +
            `🪷 𝙰𝚄𝚃𝙾𝚁 ── ${data.author || 'Desconocido'}\n` +
            `🍥 𝚃𝙸𝙿𝙾 ── 𝚅Í𝙳𝙴𝙾\n\n` +
            `𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰𝙽𝙳𝙾 𝚅Í𝙳𝙴𝙾...`
        );

        const videoResponse = await axios.get(video.url, {
            responseType: 'arraybuffer',
            timeout: 120000,
            maxContentLength: 100 * 1024 * 1024,
            maxBodyLength: 100 * 1024 * 1024,
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'video/mp4,video/*,*/*'
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
                    `🍓 𝙸𝙽𝚂𝚃𝙰𝙶𝚁𝙰𝙼\n` +
                    `─────── ❀ ───────\n\n` +
                    `🪷 𝚅Í𝙳𝙴𝙾 𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰𝙳𝙾`
            },
            {
                quoted: msg
            }
        );
    } catch (error: any) {
        console.error(
            '[INSTAGRAM]',
            error?.response?.status || error?.message || error
        );

        await msg.reply(
            `⚠︎ 𝙾𝙲𝚄𝚁𝚁𝙸Ó 𝚄𝙽 𝙴𝚁𝚁𝙾𝚁 𝙰𝙻 𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰𝚁 𝙴𝙻 𝚅Í𝙳𝙴𝙾`
        );
    }
}
