import axios from 'axios';

export const command = ['facebook', 'fb'];
export const category = 'descargas';
export const description = 'Descarga videos de Facebook.';

const API_URL = 'https://api.stellarwa.xyz';
const API_KEY = 'proyectsV2';

export default async function (sock: any, msg: any, extra: any, db: any) {
    const url = extra.args.join(' ').trim();

    if (!url) {
        return msg.reply(
            `🍓 𝙵𝙰𝙲𝙴𝙱𝙾𝙾𝙺\n` +
            `─────── ❀ ───────\n\n` +
            `🪷 𝙴𝙽𝚅Í𝙰 𝙴𝙻 𝙴𝙽𝙻𝙰𝙲𝙴 𝙳𝙴𝙻 𝚅Í𝙳𝙴𝙾\n\n` +
            `🍥 𝙴𝙹𝙴𝙼𝙿𝙻𝙾\n` +
            `> .𝚏𝚊𝚌𝚎𝚋𝚘𝚘𝚔 https://facebook.com/...`
        );
    }

    if (!/facebook\.com|fb\.watch/i.test(url)) {
        return msg.reply(
            `⚠︎ 𝙴𝙻 𝙴𝙽𝙻𝙰𝙲𝙴 𝙽𝙾 𝙿𝙰𝚁𝙴𝙲𝙴 𝚂𝙴𝚁 𝙳𝙴 𝙵𝙰𝙲𝙴𝙱𝙾𝙾𝙺`
        );
    }

    try {
        await msg.reply(
            `🍓 𝙵𝙰𝙲𝙴𝙱𝙾𝙾𝙺\n` +
            `─────── ❀ ───────\n\n` +
            `🪷 𝙿𝚁𝙾𝙲𝙴𝚂𝙰𝙽𝙳𝙾 𝚅Í𝙳𝙴𝙾...`
        );

        const response = await axios.get(
            `${API_URL}/dl/facebook`,
            {
                params: {
                    url,
                    key: API_KEY
                },
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            }
        );

        const data = response.data;

        const downloadUrl =
            data?.data?.hd ||
            data?.data?.sd ||
            data?.data?.url ||
            data?.data?.download ||
            data?.hd ||
            data?.sd ||
            data?.url ||
            data?.download;

        if (!downloadUrl) {
            return msg.reply(
                `⚠︎ 𝙽𝙾 𝙿𝚄𝙳𝙴 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝚅Í𝙳𝙴𝙾\n` +
                `─────── ❀ ───────`
            );
        }

        await msg.reply(
            `🍓 𝙵𝙰𝙲𝙴𝙱𝙾𝙾𝙺\n` +
            `─────── ❀ ───────\n\n` +
            `🪷 𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰𝙽𝙳𝙾 𝚅Í𝙳𝙴𝙾...`
        );

        const videoResponse = await axios.get(downloadUrl, {
            responseType: 'arraybuffer',
            timeout: 120000,
            maxContentLength: 100 * 1024 * 1024,
            maxBodyLength: 100 * 1024 * 1024,
            headers: {
                'User-Agent': 'Mozilla/5.0'
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
                    `🍓 𝙵𝙰𝙲𝙴𝙱𝙾𝙾𝙺\n` +
                    `─────── ❀ ───────`
            },
            {
                quoted: msg
            }
        );
    } catch (error: any) {
        console.error(
            '[FACEBOOK]',
            error?.response?.status || error?.message || error
        );

        await msg.reply(
            `⚠︎ 𝙾𝙲𝚄𝚁𝚁𝙸Ó 𝚄𝙽 𝙴𝚁𝚁𝙾𝚁 𝙰𝙻 𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰𝚁 𝙴𝙻 𝚅Í𝙳𝙴𝙾`
        );
    }
}
