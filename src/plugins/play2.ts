import ytsearch from 'yt-search';

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

const buildApis = (cleanUrl: string) => {
    const enc = encodeURIComponent(cleanUrl);
    return [
        `https://api.ryuzei.xyz/download/ytvideo/v4?url=${enc}`,
        `https://api.ryuzei.xyz/download/ytvideo/v3?url=${enc}`,
        `https://api.ryuzei.xyz/ytvideo/v2?url=${enc}`,
        `https://api.ryuzei.xyz/download/ytvideo?url=${enc}`
    ];
};

const raceApi = async (apis: string[]): Promise<any | null> => {
    return new Promise((resolve) => {
        let resolved = false;
        let failed = 0;
        for (const url of apis) {
            fetch(url)
                .then(r => r.json())
                .then((data: any) => {
                    if (resolved) return;
                    if (data?.status && data?.data?.download) {
                        resolved = true;
                        resolve(data);
                    } else {
                        failed++;
                        if (failed === apis.length) resolve(null);
                    }
                })
                .catch(() => {
                    failed++;
                    if (failed === apis.length && !resolved) resolve(null);
                });
        }
    });
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
        const apis = buildApis(cleanUrl);

        const data = await raceApi(apis);

        if (!data) {
            return msg.reply(`⚠︎ 𝙽𝙾 𝙿𝚄𝙳𝙴 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝚅Í𝙳𝙴𝙾`);
        }

        const info = data.data;

        const title = info.title || searchData?.title || 'YouTube Video';
        const author = info.author || info.channel || searchData?.author?.name || 'Desconocido';
        const imageUrl = info.image || searchData?.thumbnail;

        const infoText =
            `ᅟㅤ 𓈒    |꛱ ᷼ |꛱ ᷼ |ㅤֵㅤ  ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒\n\n` +
            `${global.namebot}\n` +
            `𐴲੭  ˙ 𓂃  🍥  𓂃  ˙\n\n` +
            `🍓͜ᩧ𑂳ᰍ  𝚈𝙾𝚄𝚃𝚄𝙱𝙴 𝚅𝙸𝙳𝙴𝙾\n\n` +
            `🪷 𝚃Í𝚃𝚄𝙻𝙾 ── ${title}\n` +
            `🍥 𝙰𝚄𝚃𝙾𝚁 ── ${author}\n` +
            `🪷 𝚅𝙸𝚂𝚃𝙰𝚂 ── ${info.views || 'N/A'}\n` +
            `🪷 𝙵𝙾𝚁𝙼𝙰𝚃𝙾 ── ${info.format || 'MP4'}\n\n` +
            `𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰𝙽𝙳𝙾 𝚅Í𝙳𝙴𝙾...\n\n` +
            `ꨄ︎ ${global.nmcreador}`;

        const videoPromise = fetch(info.download)
            .then(r => r.arrayBuffer())
            .then(b => Buffer.from(b));

        if (imageUrl) {
            fetch(imageUrl)
                .then(r => r.arrayBuffer())
                .then(b => sock.sendMessage(
                    msg.from,
                    { image: Buffer.from(b), caption: infoText },
                    { quoted: msg }
                ))
                .catch(() => msg.reply(infoText));
        } else {
            msg.reply(infoText);
        }

        const videoBuffer = await videoPromise;
        const fileName = `${cleanTitle(title)}.mp4`;

        await sock.sendMessage(
            msg.from,
            {
                video: videoBuffer,
                mimetype: 'video/mp4',
                fileName,
                caption: title
            },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error('[PLAY2]', error?.message || error);
        await msg.reply(`⚠︎ 𝙾𝙲𝚄𝚁𝚁𝙸𝙾́ 𝚄𝙽 𝙴𝚁𝚁𝙾𝚁 𝙰𝙻 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝚅𝙸́𝙳𝙴𝙾`);
    } finally {
        processing.delete(requestKey);
    }
}
