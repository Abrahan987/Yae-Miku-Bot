import axios from 'axios';
import ytsearch from 'yt-search';
import { randomUUID } from 'node:crypto';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { setTimeout as delay } from 'node:timers/promises';

export const command = ['play2', 'mp4', 'ytmp4', 'ytvideo', 'playvideo'];
export const category = 'descargas';
export const description = 'Busca y descarga videos de YouTube en formato MP4.';

const API = 'https://api.stellarwa.xyz/dl/ytmp4v3';
const LIMIT = 64 * 1024 * 1024;
const ID = /^[\w-]{11}$/;
const active = new Set<string>();

function inputId(text: string): string | null {
    if (ID.test(text)) return text;
    if (!/^(?:https?:\/\/|(?:[\w-]+\.)*(?:youtube\.com|youtu\.be)\/)/i.test(text)) return null;
    try {
        const u = new URL(/^https?:\/\//i.test(text) ? text : 'https://' + text);
        const host = u.hostname.toLowerCase().replace(/^(?:www|m|music)\./, '');
        const [, route, part] = u.pathname.split('/');
        const id = host === 'youtu.be' ? route : host !== 'youtube.com' ? '' :
            route === 'watch' ? u.searchParams.get('v') :
            ['shorts', 'embed', 'v', 'live'].includes(route) ? part : '';
        if (id && ID.test(id)) return id;
    } catch {}
    throw new Error('Usa un enlace de video de YouTube válido.');
}

type Trace = (event: string) => void;

async function stellar(id: string, trace: Trace, renewal = false) {
    const key = process.env.STELLAR_API_KEY || global.key;
    if (!key) throw new Error('Falta configurar la clave de StellarWA.');
    const phase = renewal ? 'renovación' : 'preparación';
    const budget = renewal ? 45_000 : 60_000;
    const signal = AbortSignal.timeout(budget);
    for (let n = 0; ; n++) {
        const start = performance.now();
        try {
            const { data } = await axios.get(API, {
                params: { url: 'https://www.youtube.com/watch?v=' + id, quality: 'auto', key },
                signal, timeout: budget, maxContentLength: 512 * 1024
            });
            const v = data?.data;
            if (data?.status !== true || typeof v?.dl !== 'string' || !/^https:\/\//i.test(v.dl)) {
                throw new Error('StellarWA no devolvió un enlace de video.');
            }
            trace(`StellarWA ${phase} OK intento=${n + 1} ms=${Math.round(performance.now() - start)}`);
            return { url: v.dl as string, title: String(v.title || ''), author: String(v.author || '') };
        } catch (e) {
            if (!axios.isAxiosError(e)) throw e;
            const status = e.response?.status;
            trace(`StellarWA ${phase} código=${status || e.code || 'SIN_RESPUESTA'} intento=${n + 1} ms=${Math.round(performance.now() - start)}`);
            if (signal.aborted || e.code === 'ECONNABORTED' || e.code === 'ETIMEDOUT') {
                throw new Error(renewal
                    ? 'StellarWA tardó demasiado en renovar el enlace después del 403.'
                    : 'StellarWA tardó demasiado en preparar el enlace del video.');
            }
            const transient = status ? [502, 503, 504].includes(status) :
                ['ECONNRESET', 'EAI_AGAIN'].includes(e.code || '');
            if (!renewal && n === 0 && transient && !signal.aborted) {
                await delay(350);
                continue;
            }
            throw new Error(status === 401 || status === 403 ? 'StellarWA rechazó la clave o el acceso.' :
                status === 429 ? 'StellarWA está limitando las solicitudes. Intenta más tarde.' :
                'StellarWA no pudo preparar el video. Intenta de nuevo en un momento.');
        }
    }
}

async function openMedia(id: string, originalUrl: string, trace: Trace) {
    let url = originalUrl;
    for (let attempt = 1; ; attempt++) {
        const start = performance.now();
        try {
            const result = await axios.get(url, {
                responseType: 'stream', timeout: 20_000, signal: AbortSignal.timeout(120_000),
                maxRedirects: 5, headers: { Accept: 'video/mp4, application/octet-stream, */*' }
            });
            trace(`MP4 cabeceras HTTP=${result.status} intento=${attempt} ms=${Math.round(performance.now() - start)}`);
            return result;
        } catch (e) {
            if (!axios.isAxiosError(e)) throw e;
            const response = e.response;
            response?.data?.destroy?.();
            if (response?.status !== 403) throw e;

            // Los enlaces pueden contener firmas. Registrar solo el host.
            const host = new URL(response.data?.responseUrl || url).hostname;
            trace(`descarga 403 host=${host} intento=${attempt} ms=${Math.round(performance.now() - start)}`);
            if (attempt === 2) {
                throw new Error('StellarWA entregó otro enlace, pero la descarga también devolvió 403.');
            }
            const fresh = await stellar(id, trace, true);
            if (fresh.url === url) {
                throw new Error('StellarWA volvió a entregar el mismo enlace que devolvió 403.');
            }
            url = fresh.url;
        }
    }
}

async function thumbnail(id: string): Promise<Buffer | undefined> {
    try {
        const r = await axios.get(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`, {
            responseType: 'arraybuffer', signal: AbortSignal.timeout(2000), maxContentLength: 256 * 1024
        });
        const b = Buffer.from(r.data);
        if (b[0] === 0xff && b[1] === 0xd8) return b;
    } catch {}
}

export default async function (sock: any, msg: any, extra: any) {
    const text = (extra?.args || []).join(' ').trim();
    if (!text) return msg.reply(`🍓 𝙴𝚂𝙲𝚁𝙸𝙱𝙴 𝙴𝙻 𝙽𝙾𝙼𝙱𝚁𝙴 𝙾 𝚄𝚁𝙻 𝙳𝙴𝙻 𝚅Í𝙳𝙴𝙾\n\n𝙴𝙹𝙴𝙼𝙿𝙻𝙾\n> ${global.prefix[0]}play2 Oh Klahoma`);

    let id: string | null;
    try { id = inputId(text); }
    catch { return msg.reply('🍥 Usa un enlace de video de YouTube válido.'); }
    const request = id || text.toLowerCase();
    if (active.has(request)) return msg.reply('🍥 Esta descarga ya está en proceso ❀');
    active.add(request);
    const run = randomUUID().slice(0, 8);
    const trace: Trace = event => console.info(`[PLAY2 ${run}] ${event}`);
    let stage = 'búsqueda';
    try {
        let hit;
        if (!id) {
            let timer: ReturnType<typeof setTimeout> | undefined;
            try {
                const result = await Promise.race([
                    ytsearch(text),
                    new Promise<never>((_, reject) => {
                        timer = setTimeout(() => reject(new Error('La búsqueda tardó demasiado.')), 15_000);
                    })
                ]);
                hit = result.videos?.[0];
            } finally { clearTimeout(timer); }
            id = hit?.videoId || (hit?.url && inputId(hit.url));
        }
        if (!id || !ID.test(id)) return msg.reply('🍥 No encontré ese video ❀');

        stage = 'StellarWA';
        const photo = thumbnail(id);
        const info = await stellar(id, trace);
        const title = info.title || hit?.title || 'YouTube Video';
        const caption =
            `ᅟㅤ 𓈒    |꛱ ᷼ |꛱ ᷼ |ㅤֵㅤ  ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒\n\n` +
            `${global.namebot}\n𐴲੭  ˙ 𓂃  🍥  𓂃  ˙\n\n` +
            `🍓͜ᩧ𑂳ᰍ  𝚈𝙾𝚄𝚃𝚄𝙱𝙴 𝚅𝙸𝙳𝙴𝙾\n\n` +
            `🪷 𝚃Í𝚃𝚄𝙻𝙾 ── ${title}\n🍥 𝙰𝚄𝚃𝙾𝚁 ── ${info.author || hit?.author?.name || 'Desconocido'}\n` +
            `📺 𝙲𝙰𝙻𝙸𝙳𝙰𝙳 ── Automática\n\n𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰𝙽𝙳𝙾 𝚅Í𝙳𝙴𝙾...\n\nꨄ︎ ${global.nmcreador}`;
        const quoted = { quoted: msg };
        let sendingVideo = false;
        let jpegThumbnail: Buffer | undefined;
        const preview = photo.then(async image => {
            if (sendingVideo) return;
            if (image) {
                if (image.length <= 16 * 1024) jpegThumbnail = image;
                try {
                    await sock.sendMessage(msg.from, { image, caption }, { ...quoted, mediaUploadTimeoutMs: 5000 });
                    return;
                } catch {}
            }
            if (!sendingVideo) await msg.reply(caption);
        }).catch(() => {});

        stage = 'descarga';
        const r = await openMedia(id, info.url, trace);
        const readStart = performance.now();
        const size = Number(r.headers['content-length']);
        const type = String(r.headers['content-type'] || '');
        if (size > LIMIT || /^(text\/|application\/(?:json|xml))/i.test(type)) {
            r.data.destroy();
            throw new Error(size > LIMIT ? 'El video supera los 64 MiB.' : 'StellarWA devolvió una página en lugar del video.');
        }

        let bytes = 0;
        const stream = new Transform({
            transform(chunk: Buffer, _, next) {
                bytes += chunk.length;
                next(bytes > LIMIT ? new Error('El video supera los 64 MiB.') : null, chunk);
            },
            flush(next) {
                if (bytes) trace(`MP4 leído bytes=${bytes} ms=${Math.round(performance.now() - readStart)}`);
                next(bytes ? null : new Error('StellarWA devolvió un archivo vacío.'));
            }
        });
        const transfer = pipeline(r.data, stream);
        const send = async () => {
            // La tarjeta tiene prioridad breve. Una subida lenta no bloquea el MP4.
            await Promise.race([preview, delay(1200, undefined, { ref: false })]);
            if (stream.destroyed && stream.errored) throw stream.errored;
            sendingVideo = true;
            stage = 'envío';
            const fileName = (title.replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 100) || 'Video') + '.mp4';
            await sock.sendMessage(msg.from, { video: { stream }, mimetype: 'video/mp4', fileName, caption: title, jpegThumbnail },
                { ...quoted, mediaUploadTimeoutMs: 90_000 });
        };
        try {
            await Promise.all([transfer, send()]);
        } finally {
            stream.destroy();
            r.data.destroy();
        }
    } catch (e) {
        const code = axios.isAxiosError(e) ? e.response?.status || e.code : undefined;
        const reason = !axios.isAxiosError(e) && e instanceof Error &&
            /^(StellarWA|El video supera|Falta configurar|La búsqueda tardó)/.test(e.message)
            ? e.message : `Falló la etapa de ${stage}. Intenta de nuevo en un momento.`;
        trace(`fin: ${reason}${code ? ' (' + code + ')' : ''}`);
        await msg.reply('⚠︎ ' + reason);
    } finally {
        active.delete(request);
    }
}
