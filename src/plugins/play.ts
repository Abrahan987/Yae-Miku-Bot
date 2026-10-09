import axios from 'axios';
import ytsearch from 'yt-search';

export const command = ['play', 'mp3', 'ytmp3', 'ytaudio', 'playaudio'];
export const category = 'descargas';
export const description = 'Busca y descarga canciones de YouTube en formato MP3 con visualización interactiva.';

const processing = new Set<string>();
const playerCache = new Map<string, any>();

const cleanTitle = (title: string) => {
    return title
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 100);
};

const formatNumber = (value: any) => {
    if (typeof value !== 'number') return 'N/A';
    return value.toLocaleString('es-CO');
};

const formatSeconds = (seconds: number | string): string => {
    if (typeof seconds === 'string') {
        const parts = seconds.split(':');
        if (parts.length >= 2) {
            return seconds;
        }
        const secs = parseInt(seconds);
        const min = Math.floor(secs / 60);
        const sec = secs % 60;
        return `${min}:${String(sec).padStart(2, '0')}`;
    }
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${String(sec).padStart(2, '0')}`;
};

const makeProgressBar = (current: number, total: number): string => {
    const dur = typeof total === 'string' 
        ? parseInt(total.split(':')[0]) * 60 + parseInt(total.split(':')[1])
        : total;
    const cur = typeof current === 'string'
        ? parseInt(current.split(':')[0]) * 60 + parseInt(current.split(':')[1])
        : current;
    
    if (dur <= 0) return '░░░░░░░░░░░░░░░░░░░░';
    
    const ratio = Math.max(0, Math.min(1, cur / dur));
    const filled = Math.round(ratio * 20);
    return '█'.repeat(filled) + '░'.repeat(20 - filled);
};

const buildPlayerCard = (title: string, author: string, duration: string, currentTime: number = 0): string => {
    const progress = makeProgressBar(currentTime, duration);
    const elapsed = formatSeconds(currentTime);
    
    return (
        `╔════════════════════════════════════════════╗\n` +
        `║       🎵 PLAYING WITH MANCOS MUSIC 🎵    ║\n` +
        `╚════════════════════════════════════════════╝\n\n` +
        `┌────────────────────────────────────────────┐\n` +
        `│                                            │\n` +
        `│         ▄▀▄  ▀▄▄▀▀  ▄▀▀▀▀▄   ▀▄▄▀▀      │\n` +
        `│        █   █  █     █     █   █         │\n` +
        `│         ▀▄▀   █     █     █   █         │\n` +
        `│                                            │\n` +
        `└────────────────────────────────────────────┘\n\n` +
        `🎤 *${author}*\n` +
        `🎵 *${title}*\n\n` +
        `[${progress}]\n` +
        `${elapsed} / ${duration}\n\n` +
        `⏮️  ⏪  ⏸️  ⏩  ⏭️  ↩️\n\n` +
        `💚 #playing #youtube`
    );
};

export default async function (sock: any, msg: any, extra: any, db: any) {
    const text = extra.args.join(' ').trim();

    if (!text) {
        return msg.reply(
            `🍓 𝙴𝚂𝙲𝚁𝙸𝙱𝙴 𝙴𝙻 𝙽𝙾𝙼𝙱𝚁𝙴 𝙾 𝚄𝚁𝙻 𝙳𝙴 𝙻𝙰 𝙲𝙰𝙽𝙲𝙸Ó𝙽\n\n` +
            `𝙴𝙹𝙴𝙼𝙿𝙻𝙾\n` +
            `> ${(global as any).prefix?.[0] || '.'}play Oh Klahoma`
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
        let videoUrl = text;
        let searchData: any = null;

        const isYoutubeUrl = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(text);

        if (isYoutubeUrl) {
            const result = await ytsearch({ videoId: text });

            if (result) {
                searchData = result;
            }
        } else {
            const result = await ytsearch(text);

            if (!result.videos?.length) {
                return msg.reply(
                    `🍥 𝙽𝙾 𝙴𝙽𝙲𝙾𝙽𝚃𝚁É 𝚅Í𝙳𝙴𝙾𝚂 𝙿𝙰𝚁𝙰 𝙴𝚂𝙰 𝙱Ú𝚂𝚀𝚄𝙴𝙳𝙰 ❀`
                );
            }

            searchData = result.videos[0];
            videoUrl = searchData.url;
        }

        const apiUrl = `https://api.delirius.online/download/ytmp3?url=${encodeURIComponent(videoUrl)}`;

        const response = await axios.get(apiUrl, {
            timeout: 60000
        });

        const data = response.data;

        if (!data?.status || !data?.data?.download) {
            return msg.reply(
                `⚠︎ 𝙽𝙾 𝙿𝚄𝙳𝙴 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝙰𝚄𝙳𝙸𝙾`
            );
        }

        const info = data.data;

        const title =
            searchData?.title ||
            (info.title && info.title !== '-' ? info.title : null) ||
            'YouTube Audio';

        const author =
            searchData?.author?.name ||
            (info.author && info.author !== '-' ? info.author : null) ||
            'Desconocido';

        const channel =
            searchData?.author?.name ||
            (info.channel && info.channel !== '-' ? info.channel : null) ||
            author;

        const views =
            searchData?.views ??
            (info.views > 0 ? info.views : null);

        const likes =
            searchData?.likes ??
            (info.likes > 0 ? info.likes : null);

        const duration =
            searchData?.timestamp ||
            searchData?.duration ||
            'N/A';

        const imageUrl =
            searchData?.thumbnail ||
            searchData?.image ||
            null;

        // Crear card visual del reproductor
        const playerCard = buildPlayerCard(title, author, duration, 0);

        const chatId = msg.from || msg.chat;

        // Guardar en cache
        playerCache.set(chatId, {
            title,
            author,
            channel,
            duration,
            views,
            likes,
            imageUrl,
            downloadUrl: info.download,
            timestamp: Date.now()
        });

        // Enviar card visual
        if (imageUrl) {
            try {
                const image = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 15000
                });

                await sock.sendMessage(
                    chatId,
                    {
                        image: Buffer.from(image.data),
                        caption: playerCard
                    },
                    {
                        quoted: msg
                    }
                );
            } catch {
                await sock.sendMessage(
                    chatId,
                    { text: playerCard },
                    { quoted: msg }
                );
            }
        } else {
            await sock.sendMessage(
                chatId,
                { text: playerCard },
                { quoted: msg }
            );
        }

        // Descargar y enviar audio
        const audio = await axios.get(info.download, {
            responseType: 'arraybuffer',
            timeout: 120000
        });

        const fileName = `${cleanTitle(title)}.mp3`;

        await sock.sendMessage(
            chatId,
            {
                audio: Buffer.from(audio.data),
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
            error?.response?.data ||
            error?.response?.status ||
            error?.message ||
            error
        );

        await msg.reply(
            `⚠︎ 𝙾𝙲𝚄𝚁𝚁𝙸Ó 𝚄𝙽 𝙴𝚁𝚁𝙾𝚁 𝙰𝙻 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝙰𝚄𝙳𝙸𝙾`
        );
    } finally {
        processing.delete(requestKey);
    }
}
