import axios from 'axios';
import ytsearch from 'yt-search';
import crypto from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import { LRUCache } from 'lru-cache';

export const command = ['play', 'mp3', 'ytmp3', 'ytaudio', 'playaudio'];
export const category = 'descargas';
export const description = 'Busca y descarga canciones de YouTube en formato MP3.';

const LEMPI_KEY = process.env.LEMPI_KEY || 'montekey28';
const ANABOT_KEY = process.env.ANABOT_KEY || 'freeApikey';
const SAVETUBE_KEY = 'C5D58EF67A7584E4A29F6C35BBC4EB12';
const UA = 'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36';
const MAX_BYTES = 100 * 1024 * 1024;
const UNKNOWN_DURATION_MIN_BYTES = 300 * 1024;
const BYTES_PER_SECOND_MIN = 6000;

interface Link {
    dl: string;
    title?: string;
}

interface AudioResult {
    buffer: Buffer;
    mimetype: string;
    ext: string;
}

const client = axios.create({
    httpAgent: new http.Agent({ keepAlive: true, maxSockets: 30 }),
    httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 30 }),
    headers: {
        'User-Agent': UA,
        Accept: 'application/json'
    }
});

const searchCache = new LRUCache<string, any>({
    max: 300,
    ttl: 1000 * 60 * 60
});

const audioCache = new LRUCache<string, AudioResult>({
    maxSize: 200 * 1024 * 1024,
    sizeCalculation: (a) => a.buffer.length,
    ttl: 1000 * 60 * 60
});

const inflight = new Map<string, Promise<AudioResult>>();

const cleanTitle = (title: string) =>
    title
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 100);

const formatNumber = (value: any) =>
    typeof value !== 'number' ? 'N/A' : value.toLocaleString('es-CO');

const getVideoId = (text: string) => {
    const raw = text.trim();

    if (/^[\w-]{11}$/.test(raw)) {
        return raw;
    }

    return raw.match(
        /(?:youtu\.be\/|v=|shorts\/|embed\/|live\/|\/v\/)([\w-]{11})/i
    )?.[1] || null;
};

const isLink = (v: any): v is string =>
    typeof v === 'string' && /^https?:\/\//i.test(v);

const minBytesFor = (seconds?: number) =>
    seconds && seconds > 0
        ? Math.max(UNKNOWN_DURATION_MIN_BYTES, seconds * BYTES_PER_SECOND_MIN)
        : UNKNOWN_DURATION_MIN_BYTES;

const PROVIDERS: Record<string, (url: string, query: string) => Promise<Link>> = {
    ryuzei: async (url) => {
        const { data } = await client.get(
            'https://api.stellarwa.xyz/dl/ytmp3v3',
            {
                params: {
                    url,
                    key: 'proyectsV2'
                },
                timeout: 30000
            }
        );

        const download =
            data?.data?.download ||
            data?.data?.url ||
            data?.data?.dl ||
            data?.download ||
            data?.url;

        if (data?.status === false || !isLink(download)) {
            throw new Error(data?.message || 'sin enlace');
        }

        return {
            dl: download,
            title:
                data?.data?.title ||
                data?.data?.filename ||
                data?.title
        };
    },

    lempi: async (url) => {
        const { data } = await client.get(
            'https://api.lempi.lat/dl/yta',
            {
                params: {
                    url,
                    apikey: LEMPI_KEY
                },
                timeout: 30000
            }
        );

        if (!data?.status || !isLink(data?.descarga?.url)) {
            throw new Error('sin enlace');
        }

        return {
            dl: data.descarga.url,
            title: data.descarga.archivo
        };
    },

    puruboy: async (url) => {
        const { data } = await client.post(
            'https://puruboy-api.vercel.app/api/downloader/ytmp3',
            { url },
            { timeout: 30000 }
        );

        const r = data?.result;

        if (!isLink(r?.download_url)) {
            throw new Error('sin enlace');
        }

        return {
            dl: r.download_url,
            title: r.title
        };
    },

    anabotUrl: async (url) => {
        const { data } = await client.get(
            'https://anabot.my.id/api/download/ytmp3',
            {
                params: {
                    url,
                    apikey: ANABOT_KEY
                },
                timeout: 30000
            }
        );

        const r = data?.data?.result;

        if (!r?.success || !isLink(r.urls)) {
            throw new Error('sin enlace');
        }

        return {
            dl: r.urls,
            title: r.metadata?.title
        };
    },

    anabotQuery: async (_url, query) => {
        const { data } = await client.get(
            'https://anabot.my.id/api/download/playmusic',
            {
                params: {
                    query,
                    apikey: ANABOT_KEY
                },
                timeout: 30000
            }
        );

        const r = data?.data?.result;

        if (!r?.success || !isLink(r.urls)) {
            throw new Error('sin enlace');
        }

        return {
            dl: r.urls,
            title: r.metadata?.title
        };
    },

    siputzxV1: async (url) => {
        const { data } = await client.get(
            'https://api.siputzx.my.id/api/d/ytmp3',
            {
                params: { url },
                timeout: 30000
            }
        );

        if (!data?.status || !isLink(data?.result?.downloadUrl)) {
            throw new Error('sin enlace');
        }

        return {
            dl: data.result.downloadUrl,
            title: data.result.title
        };
    },

    siputzxV2: async (url) => {
        const { data } = await client.get(
            'https://api.siputzx.my.id/api/d/ytmp3v2',
            {
                params: { url },
                timeout: 30000
            }
        );

        if (!data?.status || !isLink(data?.data?.dl)) {
            throw new Error('sin enlace');
        }

        return {
            dl: data.data.dl,
            title: data.data.title
        };
    },

    nexevo: async (url) => {
        const { data } = await client.get(
            'https://nexevo-api.vercel.app/download/y',
            {
                params: { url },
                timeout: 30000
            }
        );

        if (!data?.status || !isLink(data?.result?.url)) {
            throw new Error('sin enlace');
        }

        return {
            dl: data.result.url,
            title: data.result.info?.title
        };
    },

    saveTube: async (url) => {
        const id = getVideoId(url);

        if (!id) {
            throw new Error('id invalido');
        }

        const opts = {
            headers: {
                'content-type': 'application/json',
                origin: 'https://yt.savetube.me',
                'user-agent': 'Mozilla/5.0 (Android 15; Mobile; SM-F958; rv:130.0) Gecko/130.0 Firefox/130.0'
            },
            timeout: 30000
        };

        const { data: cdnRes } = await client.get(
            'https://media.savetube.vip/api/random-cdn',
            opts
        );

        const cdn = cdnRes?.cdn;

        if (!cdn) {
            throw new Error('sin cdn');
        }

        const info = await client.post(
            `https://${cdn}/v2/info`,
            {
                url: `https://www.youtube.com/watch?v=${id}`
            },
            opts
        );

        const raw = Buffer.from(info.data.data, 'base64');

        const decipher = crypto.createDecipheriv(
            'aes-128-cbc',
            Buffer.from(SAVETUBE_KEY, 'hex'),
            raw.subarray(0, 16)
        );

        const dec = JSON.parse(
            Buffer.concat([
                decipher.update(raw.subarray(16)),
                decipher.final()
            ]).toString()
        );

        const dl = await client.post(
            `https://${cdn}/download`,
            {
                id,
                downloadType: 'audio',
                quality: '128',
                key: dec.key
            },
            opts
        );

        const link = dl.data?.data?.downloadUrl;

        if (!isLink(link)) {
            throw new Error('sin enlace');
        }

        return {
            dl: link,
            title: dec.title
        };
    },

    cnv: async (url) => {
        const headers = {
            origin: 'https://frame.y2meta-uk.com',
            'user-agent': 'Mozilla/5.0'
        };

        const { data: k } = await client.get(
            'https://cnv.cx/v2/sanity/key',
            {
                headers,
                timeout: 15000
            }
        );

        if (!k?.key) {
            throw new Error('sin key');
        }

        const body = new URLSearchParams({
            link: url,
            format: 'mp3',
            audioBitrate: '128',
            filenameStyle: 'pretty'
        });

        const { data } = await client.post(
            'https://cnv.cx/v2/converter',
            body.toString(),
            {
                headers: {
                    ...headers,
                    key: k.key,
                    'content-type': 'application/x-www-form-urlencoded'
                },
                timeout: 40000
            }
        );

        if (!isLink(data?.url)) {
            throw new Error('sin enlace');
        }

        return {
            dl: data.url,
            title: data.filename
        };
    }
};

async function downloadValidated(
    link: string,
    minBytes: number,
    signal: AbortSignal
): Promise<AudioResult> {
    const res = await client.get(link, {
        responseType: 'stream',
        timeout: 120000,
        signal,
        maxContentLength: MAX_BYTES
    });

    const type = String(res.headers['content-type'] || '');
    const declared = Number(res.headers['content-length'] || 0);

    if (
        /text|json|html/i.test(type) ||
        (declared && declared < minBytes)
    ) {
        res.data.destroy();
        throw new Error(
            `archivo no valido (tipo=${type || '?'}, bytes=${declared || '?'})`
        );
    }

    const chunks: Buffer[] = [];
    let size = 0;

    for await (const chunk of res.data) {
        chunks.push(chunk);
        size += chunk.length;

        if (size > MAX_BYTES) {
            res.data.destroy();
            throw new Error('archivo demasiado grande');
        }
    }

    const buffer = Buffer.concat(chunks);

    if (buffer.length < minBytes) {
        throw new Error(`audio demasiado corto (${buffer.length} bytes)`);
    }

    if (declared && buffer.length < declared) {
        throw new Error(
            `descarga incompleta (${buffer.length} de ${declared} bytes)`
        );
    }

    const isM4a = /mp4|m4a/i.test(type);

    return {
        buffer,
        mimetype: isM4a ? 'audio/mp4' : 'audio/mpeg',
        ext: isM4a ? 'm4a' : 'mp3'
    };
}

function raceProviders(
    url: string,
    query: string,
    minBytes: number
) {
    const controller = new AbortController();

    const race = Promise.any(
        Object.entries(PROVIDERS).map(async ([name, run]) => {
            try {
                const link = await run(url, query);

                const audio = await downloadValidated(
                    link.dl,
                    minBytes,
                    controller.signal
                );

                return {
                    audio,
                    provider: name
                };
            } catch (e: any) {
                if (!controller.signal.aborted) {
                    console.error(
                        `[PLAY] ${name}:`,
                        e?.response?.status
                            ? `HTTP ${e.response.status}`
                            : e?.message || e
                    );
                }

                throw e;
            }
        })
    );

    return race.finally(() => controller.abort());
}

async function fetchAudio(
    videoId: string,
    query: string,
    seconds?: number
): Promise<AudioResult> {
    const url = `https://youtu.be/${videoId}`;
    let lastError: any;

    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const { audio, provider } = await raceProviders(
                url,
                query,
                minBytesFor(seconds)
            );

            console.log(
                `[PLAY] Gano ${provider} (${audio.buffer.length} bytes)`
            );

            return audio;
        } catch (e: any) {
            lastError = e;

            console.error(
                `[PLAY] Intento ${attempt + 1}: todas las APIs fallaron`
            );
        }
    }

    throw lastError;
}

function getAudio(
    videoId: string,
    query: string,
    seconds?: number
): Promise<AudioResult> {
    const cached = audioCache.get(videoId);

    if (cached) {
        return Promise.resolve(cached);
    }

    const running = inflight.get(videoId);

    if (running) {
        return running;
    }

    const job = fetchAudio(videoId, query, seconds)
        .then((audio) => {
            audioCache.set(videoId, audio);
            return audio;
        })
        .finally(() => inflight.delete(videoId));

    inflight.set(videoId, job);

    return job;
}

async function getValidAudio(
    videoId: string,
    query: string,
    seconds: number | undefined,
    first: Promise<AudioResult>
) {
    let audio = await first;

    const enough = (a: AudioResult) =>
        !seconds || a.buffer.length >= seconds * BYTES_PER_SECOND_MIN;

    if (!enough(audio)) {
        console.error(
            `[PLAY] Audio corto: ${audio.buffer.length} bytes para ${seconds} s. Reintentando...`
        );

        audioCache.delete(videoId);

        audio = await getAudio(
            videoId,
            query,
            seconds
        );

        if (!enough(audio)) {
            audioCache.delete(videoId);
            throw new Error('Ninguna API entrego el audio completo');
        }
    }

    return audio;
}

async function findVideo(text: string) {
    const id = getVideoId(text);
    const key = id
        ? `id:${id}`
        : `q:${text.toLowerCase()}`;

    const cached = searchCache.get(key);

    if (cached) {
        return cached;
    }

    let video: any = null;

    if (id) {
        video = await ytsearch({
            videoId: id
        });
    } else {
        const result = await ytsearch(text);
        video = result.videos?.[0] || null;
    }

    if (video) {
        searchCache.set(key, video);
    }

    return video;
}

export default async function (
    sock: any,
    msg: any,
    extra: any,
    db: any
) {
    const text = extra.args.join(' ').trim();

    if (!text) {
        return msg.reply(
            `🍓 𝙴𝚂𝙲𝚁𝙸𝙱𝙴 𝙴𝙻 𝙽𝙾𝙼𝙱𝚁𝙴 𝙾 𝚄𝚁𝙻 𝙳𝙴 𝙻𝙰 𝙲𝙰𝙽𝙲𝙸Ó𝙽\n\n` +
            `𝙴𝙹𝙴𝙼𝙿𝙻𝙾\n` +
            `> ${global.prefix[0]}play Oh Klahoma`
        );
    }

    try {
        const urlId = getVideoId(text);
        const early = urlId
            ? getAudio(urlId, text)
            : null;

        early?.catch(() => {});

        const video = await findVideo(text);

        if (!video?.videoId) {
            return msg.reply(
                `🍥 𝙽𝙾 𝙴𝙽𝙲𝙾𝙽𝚃𝚁É 𝚅Í𝙳𝙴𝙾𝚂 𝙿𝙰𝚁𝙰 𝙴𝚂𝙰 𝙱Ú𝚂𝚀𝚄𝙴𝙳𝙰 ❀`
            );
        }

        const audioPromise =
            early ||
            getAudio(
                video.videoId,
                text,
                video.seconds
            );

        audioPromise.catch(() => {});

        const title = video.title || 'YouTube Audio';
        const channel =
            video.author?.name || 'Desconocido';
        const imageUrl =
            video.thumbnail || video.image || null;

        const infoText =
            `ᅟㅤ 𓈒    |꛱ ᷼ |꛱ ᷼ |ㅤֵㅤ  ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒\n\n` +
            `${global.namebot}\n` +
            `𐴲੭  ˙ 𓂃  🍥  𓂃  ˙\n\n` +
            `🍓͜ᩧ𑂳ᰍ  𝚈𝙾𝚄𝚃𝚄𝙱𝙴\n\n` +
            `🪷 𝚃Í𝚃𝚄𝙻𝙾 ── ${title}\n` +
            `🍥 𝙲𝙰𝙽𝙰𝙻 ── ${channel}\n` +
            `🪷 𝚅𝙸𝚂𝚃𝙰𝚂 ── ${formatNumber(video.views)}\n` +
            `🍥 𝙳𝚄𝚁𝙰𝙲𝙸Ó𝙽 ── ${video.timestamp || 'N/A'}\n` +
            `🪷 𝙵𝙾𝚁𝙼𝙰𝚃𝙾 ── MP3\n\n` +
            `𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰𝙽𝙳𝙾 𝙰𝚄𝙳𝙸𝙾...\n\n` +
            `ꨄ︎ ${global.nmcreador}`;

        try {
            if (imageUrl) {
                await sock.sendMessage(
                    msg.from,
                    {
                        image: {
                            url: imageUrl
                        },
                        caption: infoText
                    },
                    {
                        quoted: msg
                    }
                );
            } else {
                await msg.reply(infoText);
            }
        } catch {
            await msg.reply(infoText).catch(() => {});
        }

        const audio = await getValidAudio(
            video.videoId,
            text,
            video.seconds,
            audioPromise
        );

        await sock.sendMessage(
            msg.from,
            {
                audio: audio.buffer,
                mimetype: audio.mimetype,
                fileName: `${cleanTitle(title)}.${audio.ext}`,
                ptt: false
            },
            {
                quoted: msg
            }
        );
    } catch (error: any) {
        console.error(
            '[PLAY] Fallo total:',
            error?.message || error
        );

        await msg.reply(
            `⚠︎ 𝙾𝙲𝚄𝚁𝚁𝙸Ó 𝚄𝙽 𝙴𝚁𝚁𝙾𝚁 𝙰𝙻 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝙰𝚄𝙳𝙸𝙾`
        );
    }
}
