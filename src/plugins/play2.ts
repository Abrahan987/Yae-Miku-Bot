import ytsearch from 'yt-search';
import axios from 'axios';

export const command = ['play2', 'mp4', 'ytmp4', 'ytvideo', 'playvideo'];
export const category = 'descargas';
export const description = 'Busca y descarga videos de YouTube en formato MP4.';

const processing = new Set<string>();

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

const ANDROID_WEB_AGENT =
    'Mozilla/5.0 (Linux; Android 14; SM-S928B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.122 Mobile Safari/537.36 [FBAN/EMA;FBLC/es_LA;FBAV/442.0.0.30.112]';

const DEFAULT_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const getApiCandidates = (cleanUrl: string) => [
    {
        url: `https://api.ryuzei.xyz/download/ytvideo?url=${encodeURIComponent(cleanUrl)}`,
        agent: DEFAULT_AGENT
    },
    {
        url: `https://api.ryuzei.xyz/download/ytvideo/v4?url=${encodeURIComponent(cleanUrl)}`,
        agent: ANDROID_WEB_AGENT
    },
    {
        url: `https://api.ryuzei.xyz/ytvideo/v2?url=${encodeURIComponent(cleanUrl)}`,
        agent: DEFAULT_AGENT
    }
];

const isVideoBuffer = (buffer: Buffer): boolean => {
    if (!buffer || buffer.length < 10 * 1024) return false;
    const hex = buffer.subarray(0, 12).toString('hex');
    if (hex.startsWith('00000018') || hex.startsWith('0000001c') || hex.startsWith('00000020')) return true;
    if (buffer.subarray(4, 8).toString('ascii') === 'ftyp') return true;
    if (hex.startsWith('1a45dfa3')) return true;
    if (hex.startsWith('52494646')) return true;
    if (hex.startsWith('4f676753')) return true;
    return buffer.length > 100 * 1024;
};

const resolveDownload = async (
    downloadUrl: string,
    agent: string
): Promise<{ buffer: Buffer } | { redirectUrl: string } | null> => {
    try {
        const res = await axios.get(downloadUrl, {
            responseType: 'arraybuffer',
            timeout: 120000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            maxRedirects: 5,
            validateStatus: () => true,
            headers: {
                'User-Agent': agent,
                'Accept': '*/*',
                'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
                'X-Requested-With': 'com.android.chrome'
            }
        });

        const contentType = String(res.headers['content-type'] || '').toLowerCase();
        const finalUrl = res.request?.res?.responseUrl || downloadUrl;
        const buffer = Buffer.from(res.data);

        if (contentType.includes('application/json') || contentType.includes('text/html') || contentType.includes('text/plain')) {
            try {
                const parsed = JSON.parse(buffer.toString('utf8'));
                const nextUrl = parsed?.data?.download || parsed?.download || parsed?.url || parsed?.data?.url;
                if (nextUrl && typeof nextUrl === 'string' && nextUrl !== downloadUrl) {
                    return { redirectUrl: nextUrl };
                }
            } catch {
                const match = buffer.toString('utf8').match(/https?:\/\/[^\s"'<>]+/);
                if (match && match[0] !== downloadUrl) {
                    return { redirectUrl: match[0] };
                }
            }
            if (finalUrl && finalUrl !== downloadUrl) {
                return { redirectUrl: finalUrl };
            }
            return null;
        }

        if (isVideoBuffer(buffer)) {
            return { buffer };
        }

        if (finalUrl && finalUrl !== downloadUrl) {
            return { redirectUrl: finalUrl };
        }

        return null;
    } catch (err: any) {
        console.log('[PLAY2] Error resolviendo download:', err?.message || err);
        return null;
    }
};

const fetchVideoBuffer = async (
    cleanUrl: string
): Promise<{ buffer: Buffer; title?: string; image?: string; author?: string } | null> => {
    const apis = getApiCandidates(cleanUrl);

    for (const api of apis) {
        try {
            console.log('[PLAY2] Probando API:', api.url);

            const { data } = await axios.get(api.url, {
                timeout: 30000,
                headers: {
                    'User-Agent': api.agent,
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8'
                }
            });

            if (!data?.status || !data?.data?.download) {
                console.log('[PLAY2] API sin descarga válida:', api.url);
                continue;
            }

            const info = data.data;

            let resolved = await resolveDownload(info.download, api.agent);

            let attempts = 0;
            while (resolved && 'redirectUrl' in resolved && attempts < 3) {
                console.log('[PLAY2] Redirigiendo a:', resolved.redirectUrl);
                resolved = await resolveDownload(resolved.redirectUrl, api.agent);
                attempts++;
            }

            if (!resolved || !('buffer' in resolved)) {
                console.log('[PLAY2] No se pudo obtener buffer desde:', api.url);
                continue;
            }

            console.log('[PLAY2] Descarga exitosa desde:', api.url);
            return {
                buffer: resolved.buffer,
                title: info.title,
                image: info.image,
                author: info.author
            };
        } catch (err: any) {
            console.log('[PLAY2] Falló API:', api.url, '-', err?.message || err);
            continue;
        }
    }

    return null;
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

        const cleanUrl = `https://youtu.be/${videoId}`;
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
            `🍥 𝙰𝚄𝚃𝙾𝚁 ── ${quickAuthor}\n\n` +
            `𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰𝙽𝙳𝙾 𝚅Í𝙳𝙴𝙾...\n\n` +
            `ꨄ︎ ${global.nmcreador}`;

        if (thumb) {
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
        } else {
            await msg.reply(quickInfo);
        }

        const result = await fetchVideoBuffer(cleanUrl);

        if (!result) {
            return msg.reply(`⚠︎ 𝙽𝙾 𝙿𝚄𝙳𝙴 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝚅Í𝙳𝙴𝙾`);
        }

        const title = result.title || quickTitle;
        const fileName = `${cleanTitle(title)}.mp4`;

        await sock.sendMessage(
            msg.from,
            {
                video: result.buffer,
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
