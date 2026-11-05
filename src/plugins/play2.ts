import ytsearch from 'yt-search';
import axios from 'axios';

export const command = ['play2', 'mp4', 'ytmp4', 'ytvideo', 'playvideo'];
export const category = 'descargas';
export const description = 'Busca y descarga videos de YouTube en formato MP4.';
const VIDEO_FORMAT = '360p';

const DEFAULT_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const processing = new Set<string>();

interface DeliriusVideo {
    title?: string;
    author?: string;
    channel?: string;
    views?: string;
    likes?: string;
    image?: string;
    format?: string;
    download: string;
}

const cleanTitle = (title: string) => {
    return title
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 100);
};

const extractVideoId = (input: string): string | null => {
    if (!input) return null;
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const p of patterns) {
        const m = input.match(p);
        if (m) return m[1];
    }
    return null;
};
const fetchVideoInfo = async (cleanUrl: string): Promise<DeliriusVideo | null> => {
    const apiUrl =
        `https://api.delirius.online/download/ytmp4` +
        `?url=${encodeURIComponent(cleanUrl)}&format=${VIDEO_FORMAT}`;

    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            console.log(`[PLAY2] Delirius intento ${attempt}:`, apiUrl);

            const { data } = await axios.get(apiUrl, {
                timeout: 60000,
                headers: {
                    'User-Agent': DEFAULT_AGENT,
                    'Accept': 'application/json, text/plain, */*'
                }
            });

            if (data?.status && data?.data?.download) {
                return data.data as DeliriusVideo;
            }

            console.log('[PLAY2] Delirius sin descarga válida');
        } catch (err: any) {
            console.log(`[PLAY2] Falló Delirius (intento ${attempt}):`, err?.message || err);
        }
    }

    return null;
};

// Descarga el archivo a buffer (solo se usa si enviar por URL falla)
const downloadBuffer = async (url: string): Promise<Buffer | null> => {
    try {
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 120000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            maxRedirects: 5,
            headers: { 'User-Agent': DEFAULT_AGENT, 'Accept': '*/*' }
        });
        const buffer = Buffer.from(res.data);
        return buffer.length > 10 * 1024 ? buffer : null;
    } catch (err: any) {
        console.log('[PLAY2] Error descargando buffer:', err?.message || err);
        return null;
    }
};

export default async function (sock: any, msg: any, extra: any, db: any) {
    const text = extra.args.join(' ').trim();

    if (!text) {
        return msg.reply(
            `🍓 𝙴𝚂𝙲𝚁𝙸𝙱𝙴 𝙴𝙻 𝙽𝙾𝙼𝙱𝚁𝙴 𝙾 𝚄𝚁𝙻 𝙳𝙴𝙻 𝚅Í𝙳𝙴𝙾\n\n` +
            `𝙴𝙹𝙴𝙼𝙿𝙻𝙾\n` +
            `> ${global.prefix[0]}play2 Oh Klahoma`
        );
    }

    const requestKey = text.toLowerCase();

    if (processing.has(requestKey)) {
        return msg.reply(`𝙴𝚂𝚃𝙰 𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰 𝚈𝙰 𝙴𝚂𝚃Á 𝙴𝙽 𝙿𝚁𝙾𝙲𝙴𝚂𝙾 ❀`);
    }

    processing.add(requestKey);

    try {
        let videoId: string | null = null;
        let searchData: any = null;

        const isYoutubeUrl = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(text);

        if (isYoutubeUrl) {
            videoId = extractVideoId(text);
            if (!videoId) {
                return msg.reply(`🍥 𝙴𝙻 𝙴𝙽𝙻𝙰𝙲𝙴 𝙳𝙴 𝚈𝙾𝚄𝚃𝚄𝙱𝙴 𝙽𝙾 𝙴𝚂 𝚅Á𝙻𝙸𝙳𝙾 ❀`);
            }
        } else {
            const result = await ytsearch(text);
            if (!result.videos?.length) {
                return msg.reply(`🍥 𝙽𝙾 𝙴𝙽𝙲𝙾𝙽𝚃𝚁É 𝚅Í𝙳𝙴𝙾𝚂 𝙿𝙰𝚁𝙰 𝙴𝚂𝙰 𝙱Ú𝚂𝚀𝚄𝙴𝙳𝙰 ❀`);
            }
            searchData = result.videos[0];
            videoId = searchData.videoId || extractVideoId(searchData.url);
        }

        if (!videoId) {
            return msg.reply(`⚠︎ 𝙽𝙾 𝙿𝚄𝙳𝙴 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝙸𝙳 𝙳𝙴𝙻 𝚅Í𝙳𝙴𝙾`);
        }

        const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const thumb =
            searchData?.thumbnail ||
            searchData?.image ||
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

        const quickTitle = searchData?.title || 'YouTube Video';
        const quickAuthor = searchData?.author?.name || 'Desconocido';

        const quickInfo =
            `ᅟㅤ 𓈒    |꛱ ᷼ |꛱ ᷼ |ㅤֵㅤ  ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒\n\n` +
            `${global.namebot}\n` +
            `𐴲੭  ˙ 𓂃  🍥  𓂃  ˙\n\n` +
            `🍓͜ᩧ𑂳ᰍ  𝚈𝙾𝚄𝚃𝚄𝙱𝙴 𝚅𝙸𝙳𝙴𝙾\n\n` +
            `🪷 𝚃Í𝚃𝚄𝙻𝙾 ── ${quickTitle}\n` +
            `🍥 𝙰𝚄𝚃𝙾𝚁 ── ${quickAuthor}\n` +
            `📺 𝙲𝙰𝙻𝙸𝙳𝙰𝙳 ── ${VIDEO_FORMAT}\n\n` +
            `𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰𝙽𝙳𝙾 𝚅Í𝙳𝙴𝙾...\n\n` +
            `ꨄ︎ ${global.nmcreador}`;
        const infoPromise = fetchVideoInfo(cleanUrl);

        try {
            const thumbRes = await axios.get(thumb, { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(
                msg.from,
                { image: Buffer.from(thumbRes.data), caption: quickInfo },
                { quoted: msg }
            );
        } catch {
            await msg.reply(quickInfo);
        }

        const info = await infoPromise;

        if (!info) {
            return msg.reply(`⚠︎ 𝙽𝙾 𝙿𝚄𝙳𝙴 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝚅Í𝙳𝙴𝙾`);
        }

        const title = info.title || quickTitle;
        const fileName = `${cleanTitle(title)}.mp4`;
        try {
            await sock.sendMessage(
                msg.from,
                {
                    video: { url: info.download },
                    mimetype: 'video/mp4',
                    fileName,
                    caption: title
                },
                { quoted: msg }
            );
            return;
        } catch (err: any) {
            console.log('[PLAY2] Envío por URL falló, probando con buffer:', err?.message || err);
        }
        const buffer = await downloadBuffer(info.download);

        if (!buffer) {
            return msg.reply(`⚠︎ 𝙽𝙾 𝙿𝚄𝙳𝙴 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝚅Í𝙳𝙴𝙾`);
        }

        await sock.sendMessage(
            msg.from,
            {
                video: buffer,
                mimetype: 'video/mp4',
                fileName,
                caption: title
            },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error('[PLAY2]', error?.message || error);
        await msg.reply(`⚠︎ 𝙾𝙲𝚄𝚛𝚛𝙸𝚘́ 𝚞𝚗 𝚎𝚛𝚛𝚘𝚛 𝙰𝙻 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝚅Í𝙳𝙴𝙾`);
    } finally {
        processing.delete(requestKey);
    }
}
