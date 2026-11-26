import ytsearch from 'yt-search';
import axios from 'axios';
import { setTimeout as delay } from 'node:timers/promises';

export const command = ['play2', 'mp4', 'ytmp4', 'ytvideo', 'playvideo'];
export const category = 'descargas';
export const description = 'Busca y descarga videos de YouTube en formato MP4.';

const VIDEO_FORMAT = 'auto';

const DEFAULT_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const processing = new Set<string>();

class StellarUnavailable extends Error {}

// Retry-After puede ser una cantidad de segundos o una fecha HTTP.
function retryAfterMs(value: unknown): number | undefined {
    if (typeof value !== 'string' && typeof value !== 'number') return;
    const raw = String(value).trim();
    if (/^\d+$/.test(raw)) return Number(raw) * 1000;
    if (!/[a-z]/i.test(raw)) return;
    const date = Date.parse(raw);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
}

interface StellarVideo {
    title?: string;
    author?: string;
    duration?: string;
    date?: string;
    thumbnail?: string;
    quality?: string;
    dl: string;
}

const cleanTitle = (title: string): string => {
    return title
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 100) || 'YouTube Video';
};

const extractVideoId = (input: string): string | null => {
    if (!input) return null;

    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match) return match[1];
    }

    return null;
};

const fetchVideoInfo = async (
    cleanUrl: string
): Promise<StellarVideo | null> => {
    const key = process.env.STELLAR_API_KEY || global.key;

    if (!key) {
        console.error('[PLAY2] API Key de Stellar no configurada.');
        return null;
    }

    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            console.log(`[PLAY2] StellarWA intento ${attempt}`);

            const { data } = await axios.get(
                'https://api.stellarwa.xyz/dl/ytmp4v3',
                {
                    params: {
                        url: cleanUrl,
                        quality: VIDEO_FORMAT,
                        key
                    },
                    timeout: 60000,
                    maxContentLength: 512 * 1024,
                    headers: {
                        'User-Agent': DEFAULT_AGENT,
                        'Accept': 'application/json, text/plain, */*'
                    }
                }
            );

            if (data?.status === true && typeof data?.data?.dl === 'string') {
                const url = new URL(data.data.dl);

                if (url.protocol === 'https:' && !url.username && !url.password) {
                    return data.data as StellarVideo;
                }
            }

            console.log('[PLAY2] StellarWA sin descarga válida.');
            return null;

        } catch (error: any) {
            const status = error?.response?.status;
            console.log(
                `[PLAY2] Falló StellarWA (intento ${attempt}):`,
                error?.response?.status || error?.code || 'Error desconocido'
                status || error?.code || 'Error desconocido'
            );
            if (status === 503) {
                const advised = retryAfterMs(error.response.headers?.['retry-after']);
                const wait = advised ?? 2000;
                if (attempt === 2 || wait > 5000) {
                    const hint = advised && Number.isFinite(advised)
                        ? `Vuelve a intentarlo en ${Math.ceil(advised / 1000)} s.`
                        : 'Vuelve a intentarlo más tarde.';
                    throw new StellarUnavailable(`StellarWA no está disponible por el momento (503). ${hint}`);
                }
                console.log(`[PLAY2] Reintento de StellarWA en ${wait} ms.`);
                await delay(wait);
                continue;
            }
            if (status && status < 500) return null;
        }
    }

    return null;
};

// Respaldo mediante buffer si falla el envío por URL.
const downloadBuffer = async (url: string): Promise<Buffer | null> => {
    try {
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 120000,
            maxContentLength: 64 * 1024 * 1024,
            maxBodyLength: 64 * 1024 * 1024,
            maxRedirects: 5,
            headers: {
                'User-Agent': DEFAULT_AGENT,
                'Accept': '*/*'
            }
        });

        const buffer = Buffer.isBuffer(res.data) ? res.data : Buffer.from(res.data);

        return buffer.length > 10 * 1024 ? buffer : null;

    } catch (error: any) {
        console.log(
            '[PLAY2] Error descargando buffer:',
            error?.code || 'ERROR'
        );

        return null;
    }
};

export default async function (
    sock: any,
    msg: any,
    extra: any,
    db: any
) {
    const text = (extra?.args || []).join(' ').trim();

    if (!text) {
        return msg.reply(
            `🍓 𝙴𝚂𝙲𝚁𝙸𝙱𝙴 𝙴𝙻 𝙽𝙾𝙼𝙱𝚁𝙴 𝙾 𝚄𝚁𝙻 𝙳𝙴𝙻 𝚅Í𝙳𝙴𝙾\n\n` +
            `𝙴𝙹𝙴𝙼𝙿𝙻𝙾\n` +
            `> ${global.prefix[0]}play2 Oh Klahoma`
        );
    }

    const requestKey = extractVideoId(text) || text.toLowerCase();

    if (processing.has(requestKey)) {
        return msg.reply(
            `𝙴𝚂𝚃𝙰 𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰 𝚈𝙰 𝙴𝚂𝚃Á 𝙴𝙽 𝙿𝚁𝙾𝙲𝙴𝚂𝙾 ❀`
        );
    }

    processing.add(requestKey);
    let finished = false;

    try {
        let videoId: string | null = null;
        let searchData: any = null;

        const isYoutubeUrl =
            /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(text);

        if (isYoutubeUrl || /^[a-zA-Z0-9_-]{11}$/.test(text)) {
            videoId = extractVideoId(text);

            if (!videoId) {
                return msg.reply(
                    `🍥 𝙴𝙻 𝙴𝙽𝙻𝙰𝙲𝙴 𝙳𝙴 𝚈𝙾𝚄𝚃𝚄𝙱𝙴 𝙽𝙾 𝙴𝚂 𝚅Á𝙻𝙸𝙳𝙾 ❀`
                );
            }

        } else {
            const result = await ytsearch(text);

            if (!result.videos?.length) {
                return msg.reply(
                    `🍥 𝙽𝙾 𝙴𝙽𝙲𝙾𝙽𝚃𝚁É 𝚅Í𝙳𝙴𝙾𝚂 𝙿𝙰𝚁𝙰 𝙴𝚂𝙰 𝙱Ú𝚂𝚀𝚄𝙴𝙳𝙰 ❀`
                );
            }

            searchData = result.videos[0];

            videoId =
                searchData.videoId ||
                extractVideoId(searchData.url);
        }

        if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
            return msg.reply(
                `⚠︎ 𝙽𝙾 𝙿𝚄𝙳𝙴 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝙸𝙳 𝙳𝙴𝙻 𝚅Í𝙳𝙴𝙾`
            );
        }

        const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;

        const thumb =
            searchData?.thumbnail ||
            searchData?.image ||
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

        const quickTitle =
            searchData?.title || 'YouTube Video';

        const quickAuthor =
            searchData?.author?.name || 'Desconocido';

        const quickInfo =
            `ᅟㅤ 𓈒    |꛱ ᷼ |꛱ ᷼ |ㅤֵㅤ  ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒\n\n` +
            `${global.namebot}\n` +
            `𐴲੭  ˙ 𓂃  🍥  𓂃  ˙\n\n` +
            `🍓͜ᩧ𑂳ᰍ  𝚈𝙾𝚄𝚃𝚄𝙱𝙴 𝚅𝙸𝙳𝙴𝙾\n\n` +
            `🪷 𝚃Í𝚃𝚄𝙻𝙾 ── ${quickTitle}\n` +
            `🍥 𝙰𝚄𝚃𝙾𝚁 ── ${quickAuthor}\n` +
            `📺 𝙲𝙰𝙻𝙸𝙳𝙰𝙳 ── Automática\n\n` +
            `𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰𝙽𝙳𝙾 𝚅Í𝙳𝙴𝙾...\n\n` +
            `ꨄ︎ ${global.nmcreador}`;

        // Consultar Stellar mientras se envía la tarjeta.
        const infoPromise = fetchVideoInfo(cleanUrl);
        const thumbAbort = new AbortController();
        let jpegThumbnail: Buffer | undefined;
        const preview = (async () => {
            try {
                const { data } = await axios.get(thumb, {
                    responseType: 'arraybuffer',
                    timeout: 2500,
                    signal: thumbAbort.signal,
                    maxContentLength: 2 * 1024 * 1024
                });
                if (finished) return;
                const image = Buffer.isBuffer(data) ? data : Buffer.from(data);
                if (image.length <= 16 * 1024 && image[0] === 0xff && image[1] === 0xd8) {
                    jpegThumbnail = image;
                }
                await sock.sendMessage(msg.from, {
                    image,
                    caption: quickInfo
                }, { quoted: msg });
            } catch {
                if (!finished) await msg.reply(quickInfo);
            }
        })().catch(() => {});

        let info: StellarVideo | null;
        try {
        const info = await infoPromise;
            info = await infoPromise;
        } catch (error) {
            finished = true;
            thumbAbort.abort();
            if (error instanceof StellarUnavailable) return msg.reply('🍥 ' + error.message);
            throw error;
        }

        if (!info) {
            finished = true;
            thumbAbort.abort();
            return msg.reply(
                `⚠︎ 𝙽𝙾 𝙿𝚄𝙳𝙴 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝚅Í𝙳𝙴𝙾`
            );
        }

        // Dar prioridad a la tarjeta sin retener el MP4 por una miniatura lenta.
        await Promise.race([preview, delay(350, undefined, { ref: false })]);
        thumbAbort.abort();

        const title = typeof info.title === 'string' && info.title
            ? info.title
            : quickTitle;

        const fileName = `${cleanTitle(title)}.mp4`;

        // Primer método: envío directo mediante URL.
        try {
            await sock.sendMessage(
                msg.from,
                {
                    video: { url: info.dl },
                    jpegThumbnail,
                    mimetype: 'video/mp4',
                    fileName,
                    caption: title
                },
                { quoted: msg }
            );

            return;

        } catch (error: any) {
            const status = error?.response?.status ?? error?.statusCode ?? error?.output?.statusCode;
            if (status === 401 || status === 403) {
                console.warn('[PLAY2] Envío por URL rechazado:', status);
                return msg.reply(`⚠︎ El envío del video fue rechazado (HTTP ${status}).`);
            }
            console.log(
                '[PLAY2] Envío por URL falló, probando con buffer:',
                error?.code || 'ERROR'
            );
        }

        // Segundo método: descarga mediante buffer.
        const buffer = await downloadBuffer(info.dl);

        if (!buffer) {
            return msg.reply(
                `⚠︎ 𝙽𝙾 𝙿𝚄𝙳𝙴 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝚅Í𝙳𝙴𝙾`
            );
        }

        await sock.sendMessage(
            msg.from,
            {
                video: buffer,
                jpegThumbnail,
                mimetype: 'video/mp4',
                fileName,
                caption: title
            },
            { quoted: msg }
        );

    } catch (error: any) {
        console.error('[PLAY2]', error?.code || 'ERROR');

        await msg.reply(
            `⚠︎ 𝙾𝙲𝚄𝚁𝚁𝙸𝙾́ 𝚞𝚗 𝚎𝚛𝚛𝚘𝚛 𝙰𝙻 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝚅Í𝙳𝙴𝙾`
        );

    } finally {
        finished = true;
        processing.delete(requestKey);
    }
}
