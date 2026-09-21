import ytsearch from 'yt-search';
import axios from 'axios';

const API_URL = 'https://api.stellarwa.xyz';
const API_KEY = 'proyectsV2';

const processing = new Set<string>();

const cleanTitle = (title: string) => {
    return title
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 100);
};

export default async function (sock: any, msg: any, extra: any) {
    const text = extra.args.join(' ').trim();

    if (!text) {
        return msg.reply(
            `🍓 𝙴𝚂𝙲𝚁𝙸𝙱𝙴 𝙴𝙻 𝙽𝙾𝙼𝙱𝚁𝙴 𝙾 𝚄𝚁𝙻 𝙳𝙴 𝙻𝙰 𝙲𝙰𝙽𝙲𝙸Ó𝙽\n\n` +
            `𝙴𝙹𝙴𝙼𝙿𝙻𝙾\n` +
            `> .𝚙𝚕𝚊𝚢 𝙾𝚑 𝙺𝚕𝚊𝚑𝚘𝚖𝚊`
        );
    }

    const requestKey = text.toLowerCase();

    if (processing.has(requestKey)) {
        return msg.reply(
            `𝙴𝚂𝚃𝙰 𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰 𝚈𝙰 𝙴𝚂𝚃Á 𝙴𝙽 𝙿𝚁𝙾𝙲𝙴𝚂𝙾 ❀`
        );
    }

    processing.add(requestKey);

    try {
        await msg.reply(
            `🍓 𝙿𝙻𝙰𝚈\n` +
            `─────── ❀ ───────\n\n` +
            `🪷 𝙱𝚄𝚂𝙲𝙰𝙽𝙳𝙾 𝙲𝙰𝙽𝙲𝙸Ó𝙽...`
        );

        let video: any;

        if (/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(text)) {
            video = {
                url: text,
                title: 'YouTube Audio'
            };
        } else {
            const result = await ytsearch(text);

            if (!result.videos?.length) {
                return msg.reply(
                    `🍥 𝙽𝙾 𝙴𝙽𝙲𝙾𝙽𝚃𝚁É 𝚅Í𝙳𝙴𝙾𝚂 𝙿𝙰𝚁𝙰 𝙴𝚂𝙰 𝙱Ú𝚂𝚀𝚄𝙴𝙳𝙰 ❀`
                );
            }

            video = result.videos[0];
        }

        const response = await axios.get(`${API_URL}/dl/ytmp3`, {
            params: {
                url: video.url,
                key: API_KEY
            },
            timeout: 45000
        });

        const data = response.data;

        if (!data?.status || !data?.data?.dl) {
            return msg.reply(
                `⚠︎ 𝙽𝙾 𝙿𝚄𝙳𝙴 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝙰𝚄𝙳𝙸𝙾`
            );
        }

        const title = data.data.title || video.title || 'Audio';
        const author = data.data.author || video.author?.name || 'Desconocido';
        const quality = data.data.quality || '128k';
        const downloadUrl = data.data.dl;

        await msg.reply(
            `🍓 𝙿𝙻𝙰𝚈\n` +
            `─────── ❀ ───────\n\n` +
            `🪷 𝚃Í𝚃𝚄𝙻𝙾 ── ${title}\n` +
            `🍥 𝙰𝚁𝚃𝙸𝚂𝚃𝙰 ── ${author}\n` +
            `🪷 𝙲𝙰𝙻𝙸𝙳𝙰𝙳 ── ${quality}\n\n` +
            `𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰𝙽𝙳𝙾 𝙰𝚄𝙳𝙸𝙾...\n\n` +
            `─────── ❀ ───────`
        );

        const audioResponse = await axios.get(downloadUrl, {
            responseType: 'arraybuffer',
            timeout: 120000,
            maxContentLength: 50 * 1024 * 1024,
            maxBodyLength: 50 * 1024 * 1024,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36',
                'Accept': 'audio/mpeg,audio/*,*/*',
                'Referer': 'https://savetube.vip/'
            }
        });

        const audioBuffer = Buffer.from(audioResponse.data);

        if (!audioBuffer.length) {
            throw new Error('Audio vacío');
        }

        const fileName = `${cleanTitle(title)}.mp3`;

        await sock.sendMessage(
            msg.from,
            {
                audio: audioBuffer,
                mimetype: 'audio/mpeg',
                fileName,
                ptt: false
            },
            {
                quoted: msg
            }
        );
    } catch (error: any) {
        console.error(
            '[PLAY]',
            error?.response?.status || error?.message || error
        );

        await msg.reply(
            `⚠︎ 𝙾𝙲𝚄𝚁𝚁𝙸Ó 𝚄𝙽 𝙴𝚁𝚁𝙾𝚁 𝙰𝙻 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝙰𝚄𝙳𝙸𝙾`
        );
    } finally {
        processing.delete(requestKey);
    }
}

export const command = [
    'play',
    'mp3',
    'ytmp3',
    'ytaudio',
    'playaudio'
];
