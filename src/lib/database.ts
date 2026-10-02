import ytsearch from 'yt-search';

export const command = ['play2', 'mp4', 'ytmp4', 'ytvideo', 'playvideo'];
export const category = 'descargas';
export const description = 'Busca y descarga videos de YouTube en formato MP4.';

const processing = new Set<string>();
const cache = new Map<string, any>();

const cleanTitle = (title: string) => {
    return title.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100);
};

const getCached = (key: string) => {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.time < 3600000) return cached.data;
    cache.delete(key);
    return null;
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

export default async function (sock: any, msg: any, extra: any, db: any) {
    const text = extra.args.join(' ').trim();

    if (!text) {
        return msg.reply(
            `🍓 𝙴𝚂𝙲𝚁𝙸𝙱𝙴 𝚄𝙽 𝚅Í𝙳𝙴𝙾\n\n` +
            `> ${global.prefix[0]}play2 Oh Klahoma`
        );
    }

    const requestKey = text.toLowerCase();

    if (processing.has(requestKey)) {
        return msg.reply(`⏳ 𝙴𝚂𝚃𝙰 𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰 𝚈𝙰 𝙴𝚂𝚃Á 𝙰𝙲𝚃𝙸𝚅𝙰`);
    }

    processing.add(requestKey);
    msg.react('⏳');

    try {
        let videoId: string | null = null;
        let searchData: any = getCached(requestKey);

        const isYoutubeUrl = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(text);

        if (isYoutubeUrl) {
            videoId = extractVideoId(text);
            if (!videoId) {
                msg.react('❌');
                return msg.reply(`🍥 𝙴𝙽𝙻𝙰𝙲𝙴 𝙸𝙽𝚅Á𝙻𝙸𝙳𝙾`);
            }
        } else if (!searchData) {
            try {
                const result = await ytsearch(text);
                if (!result.videos?.length) {
                    msg.react('❌');
                    return msg.reply(`🍥 𝙽𝙾 𝙷𝙰𝙱Í𝙰 𝚅𝙸𝙳𝙴𝙾𝚂`);
                }
                searchData = result.videos[0];
                cache.set(requestKey, { data: searchData, time: Date.now() });
                videoId = searchData.videoId || extractVideoId(searchData.url);
            } catch {
                msg.react('❌');
                return msg.reply(`⚠︎ 𝙴𝚁𝚁𝙾𝚁 𝙴𝙽 𝙱𝚄𝚂𝚀𝚄𝙴𝙳𝙰`);
            }
        } else {
            videoId = searchData.videoId || extractVideoId(searchData.url);
        }

        if (!videoId) {
            msg.react('❌');
            return msg.reply(`⚠︎ 𝙰𝙽𝙾 𝙿𝚄𝙳𝙴 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙸𝙳`);
        }

        msg.react('📥');

        const cleanUrl = `https://youtu.be/${videoId}`;
        const thumb = searchData?.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        const quickTitle = searchData?.title || 'Video';
        const quickInfo = `🍓͜ᩧ𑂳ᰍ  𝚈𝙾𝚄𝚃𝚄𝙱𝙴\n🪷 ${quickTitle}\n\n⏬ 𝙳𝚎𝚜𝚌𝚊𝚛𝚐𝚊𝚗𝚍𝚘...`;

        msg.react('⏬');

        const thumbPromise = fetch(thumb)
            .then(r => r.arrayBuffer())
            .then(b => sock.sendMessage(msg.from, { image: Buffer.from(b), caption: quickInfo }, { quoted: msg }))
            .catch(() => msg.reply(quickInfo));

        const videoPromise = (async () => {
            const apiUrl = `https://api.ryuzei.xyz/download/ytvideo/v4?url=${encodeURIComponent(cleanUrl)}`;
            const data = await fetch(apiUrl).then(r => r.json());

            if (!data?.status || !data?.data?.download) {
                throw new Error('Sin datos de descarga');
            }

            const info = data.data;
            const title = info.title || quickTitle;
            const fileName = `${cleanTitle(title)}.mp4`;

            const videoRes = await fetch(info.download);
            const videoBuffer = await videoRes.arrayBuffer();

            return { buffer: videoBuffer, fileName, title };
        })();

        await Promise.all([thumbPromise, videoPromise]).then(async ([_, videoData]: any) => {
            if (videoData) {
                await sock.sendMessage(
                    msg.from,
                    {
                        video: Buffer.from(videoData.buffer),
                        mimetype: 'video/mp4',
                        fileName: videoData.fileName,
                        caption: videoData.title
                    },
                    { quoted: msg }
                );
                msg.react('✅');
            }
        }).catch((error) => {
            console.error('[PLAY2 ERROR]:', error);
            msg.react('❌');
            msg.reply(`⚠︎ 𝙾𝚌𝚞𝚛𝚛𝚒ó 𝚞𝚗 𝚎𝚛𝚛𝚘𝚛`);
        });

    } catch (error: any) {
        console.error('[PLAY2]', error.message);
        msg.react('❌');
        await msg.reply(`⚠︎ 𝙴𝚛𝚛𝚘𝚛`);
    } finally {
        processing.delete(requestKey);
    }
}
