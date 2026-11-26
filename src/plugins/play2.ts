import axios from 'axios';
import ytsearch from 'yt-search';
import { createWriteStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { setTimeout as delay } from 'node:timers/promises';

export const command = ['play2', 'mp4', 'ytmp4', 'ytvideo', 'playvideo'];
export const category = 'descargas';
export const description = 'Busca y descarga videos de YouTube en formato MP4.';

const MAX_VIDEO = 64 * 1024 * 1024;
const MAX_JSON = 512 * 1024;
const ENDPOINT = 'https://api.stellarwa.xyz/dl/ytmp4';
const processing = new Set<string>();

class Play2Error extends Error {}

function getVideoId(input: string): string | null {
    const text = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(text)) return text;
    try {
        const url = new URL(text);
        const host = url.hostname.toLowerCase();
        if (host === 'youtu.be' || host === 'www.youtu.be') {
            const id = url.pathname.split('/')[1];
            return /^[a-zA-Z0-9_-]{11}$/.test(id || '') ? id : null;
        }
        if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) return null;
        const id = url.searchParams.get('v') || url.pathname.match(/^\/(?:shorts|live|embed|v)\/([\w-]{11})/)?.[1];
        return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    } catch {
        return null;
    }
}

function retryAfterMs(value: unknown): number | undefined {
    if (typeof value !== 'string' && typeof value !== 'number') return;
    const raw = String(value).trim();
    if (/^\d+$/.test(raw)) return Number(raw) * 1000;
    if (!/[a-z]/i.test(raw)) return;
    const date = Date.parse(raw);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
}

async function* limitedBytes(source: Readable, limit: number, errorText: string) {
    let size = 0;
    for await (const chunk of source) {
        const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += data.length;
        if (size > limit) throw new Play2Error(errorText);
        yield data;
    }
    if (!size) throw new Play2Error('StellarWA devolvió una respuesta vacía.');
}

function downloadInfo(body: any) {
    if (body?.status === false || body?.success === false) return;
    const item = body?.data ?? body?.result ?? body;
    const links = typeof item === 'string' ? [item] :
        [item?.dl, item?.download, item?.downloadUrl, item?.download_url, item?.url, body?.dl];
    for (const value of links) {
        if (typeof value !== 'string' || !URL.canParse(value)) continue;
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.username || url.password) continue;
        if (/(^|\.)(youtube\.com|youtu\.be)$/i.test(url.hostname)) continue;
        return { url: url.href, title: typeof item?.title === 'string' ? item.title : undefined };
    }
}

async function getStellarResponse(url: string, key: string) {
    for (let attempt = 1; ; attempt++) {
        try {
            console.log(`[PLAY2] StellarWA intento ${attempt}`);
            return await axios.get<Readable>(ENDPOINT, {
                params: { url, quality: 'auto', key },
                responseType: 'stream',
                timeout: 60_000,
                signal: AbortSignal.timeout(180_000),
                headers: { Accept: 'application/json, video/mp4, */*' }
            });
        } catch (error: any) {
            error.response?.data?.destroy?.();
            const status = error.response?.status;
            if (status === 401 || status === 403) {
                throw new Play2Error('StellarWA rechazó la clave o el acceso a la descarga.');
            }
            if (status === 429) throw new Play2Error('StellarWA alcanzó su límite de solicitudes. Intenta más tarde.');
            const wait = retryAfterMs(error.response?.headers?.['retry-after']) ?? 2000;
            if (status === 503 && (attempt === 2 || wait > 5000)) {
                throw new Play2Error('StellarWA no está disponible por el momento (503). Intenta más tarde.');
            }
            if (attempt === 2 || (status && status < 500) || wait > 5000) throw error;
            await delay(wait);
        }
    }
}

async function saveVideo(source: Readable, file: string, length: unknown) {
    const tooLarge = 'El video supera los 64 MiB.';
    try {
        if (Number(length) > MAX_VIDEO) throw new Play2Error(tooLarge);
        async function* mp4Bytes() {
            let header = Buffer.alloc(0);
            for await (const data of limitedBytes(source, MAX_VIDEO, tooLarge)) {
                if (header.length < 8) {
                    header = Buffer.concat([header, data.subarray(0, 8 - header.length)]);
                    if (header.length === 8 && header.toString('ascii', 4, 8) !== 'ftyp') {
                        throw new Play2Error('La descarga de StellarWA no contiene un MP4 válido.');
                    }
                }
                yield data;
            }
            if (header.length < 8) throw new Play2Error('StellarWA devolvió un video incompleto.');
        }
        await pipeline(mp4Bytes(), createWriteStream(file, { flags: 'wx' }));
    } finally {
        source.destroy();
    }
}

async function downloadVideo(url: string, key: string, file: string) {
    const response = await getStellarResponse(url, key);
    const type = String(response.headers['content-type'] ?? '').toLowerCase().split(';')[0].trim();
    if (type === 'video/mp4' || type === 'application/octet-stream') {
        await saveVideo(response.data, file, response.headers['content-length']);
        return;
    }

    const chunks: Buffer[] = [];
    for await (const chunk of limitedBytes(response.data, MAX_JSON, 'La respuesta de StellarWA es demasiado grande.')) {
        chunks.push(chunk);
    }
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new Play2Error('StellarWA devolvió una respuesta desconocida.'); }
    const info = downloadInfo(body);
    if (!info) throw new Play2Error('StellarWA no devolvió un enlace de descarga para ese video.');

    const media = await axios.get<Readable>(info.url, {
        responseType: 'stream',
        timeout: 60_000,
        signal: AbortSignal.timeout(180_000),
        validateStatus: () => true
    });
    if (media.status < 200 || media.status >= 300) {
        media.data.destroy();
        throw new Play2Error(`El servidor del video rechazó la descarga (HTTP ${media.status}).`);
    }
    await saveVideo(media.data, file, media.headers['content-length']);
    return info.title;
}

export default async function (sock: any, msg: any, extra: any) {
    const text = (extra?.args || []).join(' ').trim();
    if (!text) {
        return msg.reply(
            `🍓 𝙴𝚂𝙲𝚁𝙸𝙱𝙴 𝙴𝙻 𝙽𝙾𝙼𝙱𝚁𝙴 𝙾 𝚄𝚁𝙻 𝙳𝙴𝙻 𝚅Í𝙳𝙴𝙾\n\n` +
            `𝙴𝙹𝙴𝙼𝙿𝙻𝙾\n> ${global.prefix?.[0] ?? '.'}mp4 Oh Klahoma`
        );
    }
    const key = process.env.STELLAR_API_KEY || global.key;
    if (!key) return msg.reply('🍥 Falta configurar la clave de StellarWA en Yae.');

    const isLink = /^(?:https?:\/\/|(?:[\w-]+\.)*(?:youtube\.com|youtube-nocookie\.com|youtu\.be)\/)/i.test(text);
    const input = isLink && !/^https?:\/\//i.test(text) ? 'https://' + text : text;
    let videoId = getVideoId(input);
    if (isLink && !videoId) return msg.reply('🍥 Usa un enlace de YouTube que apunte a un video.');

    const requestKey = JSON.stringify([msg.from, videoId || text.toLowerCase()]);
    if (processing.has(requestKey)) return msg.reply('𝙴𝚂𝚃𝙰 𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰 𝚈𝙰 𝙴𝚂𝚃Á 𝙴𝙽 𝙿𝚁𝙾𝙲𝙴𝚂𝙾 ❀');
    processing.add(requestKey);
    let directory: string | undefined;
    try {
        let searchData;
        if (!videoId) {
            const result = await ytsearch(text);
            searchData = result.videos?.[0];
            if (!searchData) return msg.reply('🍥 𝙽𝙾 𝙴𝙽𝙲𝙾𝙽𝚃𝚁É 𝚅Í𝙳𝙴𝙾𝚂 𝙿𝙰𝚁𝙰 𝙴𝚂𝙰 𝙱Ú𝚂𝚀𝚄𝙴𝙳𝙰 ❀');
            videoId = getVideoId(searchData.videoId || searchData.url || '');
            if (!videoId) return msg.reply('🍥 No pude identificar el video de esa búsqueda.');
        }

        const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const thumb = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        const quickTitle = searchData?.title || 'YouTube Video';
        const quickAuthor = searchData?.author?.name || 'Desconocido';

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

        try {
            const { data } = await axios.get(thumb, {
                responseType: 'arraybuffer', timeout: 2500, maxContentLength: 2 * 1024 * 1024
            });
            await sock.sendMessage(msg.from, { image: Buffer.from(data), caption: quickInfo }, { quoted: msg });
        } catch {
            await msg.reply(quickInfo).catch(() => {});
        }

        directory = await mkdtemp(join(tmpdir(), 'yae-mp4-'));
        const file = join(directory, 'video.mp4');
        const title = (await downloadVideo(cleanUrl, key, file)) || quickTitle;
        const name = title.replace(/[\\/:*?"<>|\x00-\x1f]/g, '').trim().slice(0, 100) || 'YouTube Video';
        await sock.sendMessage(msg.from, {
            video: { url: file }, mimetype: 'video/mp4', fileName: name + '.mp4', caption: title
        }, { quoted: msg, mediaUploadTimeoutMs: 90_000 });
    } catch (error: any) {
        if (error instanceof Play2Error) return msg.reply('🍥 ' + error.message);
        console.error('[PLAY2]', error?.response?.status || error?.code || 'ERROR');
        return msg.reply('🍥 No pude descargar o enviar el video. Intenta de nuevo en un momento.');
    } finally {
        processing.delete(requestKey);
        if (directory) await rm(directory, { recursive: true, force: true }).catch(() => {});
    }
}
