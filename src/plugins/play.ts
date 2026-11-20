import axios from 'axios';
import ytsearch from 'yt-search';
import { LRUCache } from 'lru-cache';
import PQueue from 'p-queue';
import { createWriteStream, rmSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import http from 'node:http';
import https from 'node:https';

export const command = ['play', 'mp3', 'ytmp3', 'ytaudio', 'playaudio'];
export const category = 'descargas';
export const description = 'Busca y descarga canciones de YouTube en formato MP3.';

const MB = 1024 * 1024;
const MAX_AUDIO_BYTES = 40 * MB;
const MAX_CACHE_BYTES = 120 * MB;
const UA = 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36';

interface AudioLink {
    dl: string;
    title?: string;
}

interface AudioFile {
    path: string;
    bytes: number;
    refs: number;
    evicted: boolean;
}

interface VideoInfo {
    videoId: string;
    title?: string;
    author?: { name?: string };
    views?: number;
    seconds?: number;
    timestamp?: string;
    thumbnail?: string;
    image?: string;
}

const client = axios.create({
    httpAgent: new http.Agent({ keepAlive: true, maxSockets: 8 }),
    httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 8 }),
    headers: { 'User-Agent': UA },
    maxRedirects: 4
});

const searchCache = new LRUCache<string, VideoInfo>({ max: 250, ttl: 30 * 60_000 });
const queue = new PQueue({ concurrency: 2 });
const inflight = new Map<string, Promise<AudioFile>>();
let temporaryDirectory: Promise<string> | undefined;
let temporaryPath: string | undefined;

const unlinkQuietly = (file: string) => { void fs.unlink(file).catch(() => {}); };

const audioCache = new LRUCache<string, AudioFile>({
    maxSize: MAX_CACHE_BYTES,
    sizeCalculation: file => file.bytes,
    ttl: 15 * 60_000,
    ttlAutopurge: true,
    dispose: file => {
        file.evicted = true;
        if (file.refs === 0) unlinkQuietly(file.path);
    }
});

async function getTemporaryDirectory(): Promise<string> {
    temporaryDirectory ??= fs.mkdtemp(join(tmpdir(), 'yae-play-')).then(dir => {
        temporaryPath = dir;
        return dir;
    }).catch(error => {
        temporaryDirectory = undefined;
        throw error;
    });
    return temporaryDirectory;
}

process.once('exit', () => {
    if (temporaryPath) {
        try { rmSync(temporaryPath, { recursive: true, force: true }); } catch {}
    }
});

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

function validDownloadUrl(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    try {
        const url = new URL(value);
        if (!['http:', 'https:'].includes(url.protocol)) return false;
        if (url.username || url.password) return false;
        const host = url.hostname.toLowerCase();
        if (host === 'localhost' || host.endsWith('.localhost') || host === '127.0.0.1' || host === '::1' || host === '[::1]') return false;
        return true;
    } catch {
        return false;
    }
}

function cleanTitle(value: string): string {
    return value.replace(/[\\/:*?"<>|\x00-\x1f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100) || 'YouTube Audio';
}

function errorText(error: any): string {
    return error?.response?.status ? `HTTP ${error.response.status}` : String(error?.message || error);
}

function minAudioBytes(seconds?: number): number {
    if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return 32 * 1024;
    return Math.max(32 * 1024, Math.min(MAX_AUDIO_BYTES, Math.floor(seconds * 5200)));
}

function isMp3(bytes: Buffer): boolean {
    if (bytes.subarray(0, 3).toString() === 'ID3') return true;
    for (let i = 0; i < bytes.length - 1; i++) {
        if (bytes[i] === 0xff && (bytes[i + 1] & 0xe0) === 0xe0 && (bytes[i + 1] & 0x18) !== 0x08) return true;
    }
    return false;
}

async function stellar(endpoint: 'ytmp3v2' | 'ytmp3v3', url: string): Promise<AudioLink> {
    const key = String(global.key || '').trim();
    if (!key) throw new Error('global.key no está configurada');

    const { data } = await client.get(`https://api.stellarwa.xyz/dl/${endpoint}`, {
        params: { url, key },
        timeout: 35_000,
        headers: { Accept: 'application/json' }
    });

    const result = data?.data || data?.result || data;
    const dl = [result?.dl, result?.download, result?.downloadUrl, result?.url, data?.dl].find(validDownloadUrl);
    if (data?.status === false || !dl) throw new Error('Stellar no entregó un MP3 válido');
    return { dl, title: result?.title };
}

async function ryuzei(url: string): Promise<AudioLink> {
    const { data } = await client.get('https://api.ryuzei.xyz/download/ytmp3', {
        params: { url },
        timeout: 35_000,
        headers: { Accept: 'application/json' }
    });
    const result = data?.data || data?.result || data;
    const dl = [result?.download, result?.dl, result?.url].find(validDownloadUrl);
    if (data?.status === false || !dl) throw new Error('Ryuzei no entregó un MP3 válido');
    return { dl, title: result?.title };
}

async function downloadMp3(link: string, videoId: string, seconds?: number): Promise<AudioFile> {
    const directory = await getTemporaryDirectory();
    const file = join(directory, `${videoId}-${randomUUID()}.mp3`);
    const response = await client.get(link, {
        responseType: 'stream',
        timeout: 100_000,
        headers: { Accept: 'audio/mpeg,audio/*,*/*' }
    });

    const type = String(response.headers['content-type'] || '').toLowerCase();
    const length = Number(response.headers['content-length'] || 0);
    const stream = response.data;

    if (/text\/|application\/(?:json|xml)|html/.test(type) || length > MAX_AUDIO_BYTES) {
        stream.destroy();
        throw new Error('El servidor devolvió un archivo inválido o demasiado grande');
    }

    let size = 0;
    const limiter = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
            size += chunk.length;
            if (size > MAX_AUDIO_BYTES) callback(new Error('Audio superior a 40 MB'));
            else callback(null, chunk);
        }
    });

    try {
        await pipeline(stream, limiter, createWriteStream(file, { flags: 'wx' }));
        if (size < minAudioBytes(seconds)) throw new Error('Audio incompleto o demasiado pequeño');
        if (length && size !== length) throw new Error('La descarga está incompleta');
        const handle = await fs.open(file, 'r');
        const header = Buffer.alloc(4096);
        let read = 0;
        try {
            const data = await handle.read(header, 0, header.length, 0);
            read = data.bytesRead;
        } finally {
            await handle.close();
        }
        if (!isMp3(header.subarray(0, read))) throw new Error('La descarga no contiene un MP3 válido');
        return { path: file, bytes: size, refs: 0, evicted: false };
    } catch (error) {
        unlinkQuietly(file);
        throw error;
    }
}

async function fetchAudio(videoId: string, seconds?: number): Promise<AudioFile> {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const providers = [
        { name: 'Stellar V2', run: () => stellar('ytmp3v2', url) },
        { name: 'Stellar V3', run: () => stellar('ytmp3v3', url) },
        { name: 'Ryuzei', run: () => ryuzei(url) }
    ];

    for (const provider of providers) {
        try {
            const result = await provider.run();
            const audio = await downloadMp3(result.dl, videoId, seconds);
            console.log(`[PLAY] ${provider.name}: audio listo (${(audio.bytes / MB).toFixed(2)} MB)`);
            return audio;
        } catch (error) {
            console.error(`[PLAY] ${provider.name}: ${errorText(error)}`);
        }
    }

    throw new Error('Stellar V2, Stellar V3 y Ryuzei no lograron descargar el audio');
}

async function acquireAudio(videoId: string, seconds?: number): Promise<AudioFile> {
    const saved = audioCache.get(videoId);
    if (saved && !saved.evicted) {
        saved.refs++;
        return saved;
    }

    let job = inflight.get(videoId);
    if (!job) {
        if (queue.size >= 20) throw new Error('Hay demasiadas descargas pendientes');
        job = queue.add(async () => {
            const audio = await fetchAudio(videoId, seconds);
            audioCache.set(videoId, audio);
            return audio;
        }) as Promise<AudioFile>;
        inflight.set(videoId, job);
        void job.then(
            () => inflight.delete(videoId),
            () => inflight.delete(videoId)
        );
    }

    const audio = await job;
    if (audio.evicted) return acquireAudio(videoId, seconds);
    audio.refs++;
    return audio;
}

function releaseAudio(audio: AudioFile): void {
    audio.refs = Math.max(0, audio.refs - 1);
    if (audio.evicted && audio.refs === 0) unlinkQuietly(audio.path);
}

async function findVideo(query: string): Promise<VideoInfo | null> {
    const id = getVideoId(query);
    const cacheKey = id ? `id:${id}` : `q:${query.toLowerCase()}`;
    const cached = searchCache.get(cacheKey);
    if (cached) return cached;

    let video: VideoInfo | null = null;
    try {
        if (id) {
            const result = await ytsearch({ videoId: id });
            video = result?.videoId ? result as VideoInfo : null;
        } else {
            const result = await ytsearch(query);
            video = result.videos?.[0] as VideoInfo || null;
        }
    } catch (error) {
        if (!id) throw error;
    }

    if (!video && id) {
        video = { videoId: id, title: 'YouTube Audio', thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };
    }
    if (video) searchCache.set(cacheKey, video);
    return video;
}

export default async function (sock: any, msg: any, extra: any, db: any) {
    const text = (extra.args || []).join(' ').trim();

    if (!text) {
        return msg.reply(
            `🍓 𝙴𝚂𝙲𝚁𝙸𝙱𝙴 𝙴𝙻 𝙽𝙾𝙼𝙱𝚁𝙴 𝙾 𝚄𝚁𝙻 𝙳𝙴 𝙻𝙰 𝙲𝙰𝙽𝙲𝙸Ó𝙽\n\n` +
            `𝙴𝙹𝙴𝙼𝙿𝙻𝙾\n` +
            `> ${global.prefix[0]}play Oh Klahoma`
        );
    }

    let audio: AudioFile | undefined;
    try {
        const video = await findVideo(text);
        if (!video?.videoId) {
            return msg.reply(`🍥 𝙽𝙾 𝙴𝙽𝙲𝙾𝙽𝚃𝚁É 𝚅Í𝙳𝙴𝙾𝚂 𝙿𝙰𝚁𝙰 𝙴𝚂𝙰 𝙱Ú𝚂𝚀𝚄𝙴𝙳𝙰 ❀`);
        }

        const job = acquireAudio(video.videoId, video.seconds);
        void job.catch(() => {});

        const title = video.title || 'YouTube Audio';
        const channel = video.author?.name || 'Desconocido';
        const imageUrl = video.thumbnail || video.image || `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;
        const views = typeof video.views === 'number' ? video.views.toLocaleString('es-CO') : 'N/A';
        const infoText =
            `ᅟㅤ 𓈒    |꛱ ᷼ |꛱ ᷼ |ㅤֵㅤ  ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒\n\n` +
            `${global.namebot}\n` +
            `𐴲੭  ˙ 𓂃  🍥  𓂃  ˙\n\n` +
            `🍓͜ᩧ𑂳ᰍ  𝚈𝙾𝚄𝚃𝚄𝙱𝙴\n\n` +
            `🪷 𝚃Í𝚃𝚄𝙻𝙾 ── ${title}\n` +
            `🍥 𝙲𝙰𝙽𝙰𝙻 ── ${channel}\n` +
            `🪷 𝚅𝙸𝚂𝚃𝙰𝚂 ── ${views}\n` +
            `🍥 𝙳𝚄𝚁𝙰𝙲𝙸Ó𝙽 ── ${video.timestamp || 'N/A'}\n` +
            `🪷 𝙵𝙾𝚁𝙼𝙰𝚃𝙾 ── MP3\n\n` +
            `𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰𝙽𝙳𝙾 𝙰𝚄𝙳𝙸𝙾...\n\n` +
            `ꨄ︎ ${global.nmcreador}`;

        try {
            await sock.sendMessage(msg.from, { image: { url: imageUrl }, caption: infoText }, { quoted: msg });
        } catch {
            await msg.reply(infoText).catch(() => {});
        }

        audio = await job;
        await sock.sendMessage(
            msg.from,
            {
                audio: { url: audio.path },
                mimetype: 'audio/mpeg',
                fileName: `${cleanTitle(title)}.mp3`,
                ptt: false
            },
            { quoted: msg }
        );
    } catch (error) {
        console.error('[PLAY] Fallo total:', errorText(error));
        await msg.reply(`⚠︎ 𝙾𝙲𝚄𝚁𝚁𝙸Ó 𝚄𝙽 𝙴𝚁𝚁𝙾𝚁 𝙰𝙻 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝙰𝚄𝙳𝙸𝙾`).catch(() => {});
    } finally {
        if (audio) releaseAudio(audio);
    }
}
