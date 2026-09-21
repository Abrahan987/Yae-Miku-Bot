import ytsearch from 'yt-search';

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

const fetchWithTimeout = async (url: string, timeout = 30000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return response;
    } finally {
        clearTimeout(timer);
    }
};

export default async function (sock: any, msg: any, extra: any) {
    const text = extra.args.join(' ').trim();

    if (!text) {
        return msg.reply(
            `𝙴𝚂𝙲𝚁𝙸𝙱𝙴 𝙴𝙻 𝙽𝙾𝙼𝙱𝚁𝙴 𝙾 𝚄𝚁𝙻 𝙳𝙴 𝙻𝙰 𝙲𝙰𝙽𝙲𝙸Ó𝙽\n\n𝙴𝙹𝙴𝙼𝙿𝙻𝙾\n> .𝚙𝚕𝚊𝚢 𝙱𝚒𝚕𝚕𝚒𝚎 𝙴𝚒𝚕𝚒𝚜𝚑 𝙱𝚒𝚛𝚍𝚜 𝙾𝚏 𝙰 𝙵𝚎𝚊𝚝𝚑𝚎𝚛`
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
        let video: any;

        if (/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(text)) {
            video = {
                url: text
            };
        } else {
            const result = await ytsearch(text);

            if (!result.videos?.length) {
                return msg.reply(
                    `𝙽𝙾 𝙴𝙽𝙲𝙾𝙽𝚃𝚁É 𝚅Í𝙳𝙴𝙾𝚂 𝙿𝙰𝚁𝙰 𝙴𝚂𝙰 𝙱Ú𝚂𝚀𝚄𝙴𝙳𝙰 ❀`
                );
            }

            video = result.videos[0];
        }

        const endpoint =
            `${API_URL}/dl/ytmp3` +
            `?url=${encodeURIComponent(video.url)}` +
            `&key=${encodeURIComponent(API_KEY)}`;

        const response = await fetchWithTimeout(endpoint, 45000);
        const data = await response.json();

        if (!data?.status || !data?.data?.dl) {
            return msg.reply(
                `𝙽𝙾 𝙿𝚄𝙳𝙴 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝙰𝚄𝙳𝙸𝙾 ⚠︎`
            );
        }

        const title = data.data.title || video.title || 'Audio';
        const author = data.data.author || video.author?.name || 'Desconocido';
        const downloadUrl = data.data.dl;

        await msg.reply(
            `ఌ︎ 𝙿𝙻𝙰𝚈\n\n` +
            `𝚃Í𝚃𝚄𝙻𝙾 ── ${title}\n` +
            `𝙰𝚁𝚃𝙸𝚂𝚃𝙰 ── ${author}\n` +
            `𝙲𝙰𝙻𝙸𝙳𝙰𝙳 ── ${data.data.quality || '128k'}\n\n` +
            `𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰𝙽𝙳𝙾 𝙰𝚄𝙳𝙸𝙾...`
        );

        const audioResponse = await fetchWithTimeout(downloadUrl, 120000);
        const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

        if (!audioBuffer.length) {
            throw new Error('Audio vacío');
        }

        const fileName = `${cleanTitle(title)}.mp3`;

        await sock.sendMessage(
            msg.chat,
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
        if (error?.name === 'AbortError') {
            await msg.reply(
                `𝚃𝙸𝙴𝙼𝙿𝙾 𝙳𝙴 𝙴𝚂𝙿𝙴𝚁𝙰 𝙰𝙶𝙾𝚃𝙰𝙳𝙾 ⚠︎`
            );
        } else {
            await msg.reply(
                `𝙾𝙲𝚄𝚁𝚁𝙸Ó 𝚄𝙽 𝙴𝚁𝚁𝙾𝚁 𝙰𝙻 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝙰𝚄𝙳𝙸𝙾.`
            );
        }
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
