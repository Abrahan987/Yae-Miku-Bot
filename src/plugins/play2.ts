import axios from 'axios';
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
        return msg.reply(
            `𝙴𝚂𝚃𝙰 𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰 𝚈𝙰 𝙴𝚂𝚃Á 𝙴𝙽 𝙿𝚁𝙾𝙲𝙴𝚂𝙾 ❀`
        );
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
                return msg.reply(
                    `🍥 𝙽𝙾 𝙴𝙽𝙲𝙾𝙽𝚃𝚁É 𝚅Í𝙳𝙴𝙾𝚂 𝙿𝙰𝚁𝙰 𝙴𝚂𝙰 𝙱Ú𝚂𝚀𝚄𝙴𝙳𝙰 ❀`
                );
            }

            searchData = result.videos[0];
            videoId = searchData.videoId || extractVideoId(searchData.url);
        }

        if (!videoId) {
            return msg.reply(`⚠︎ 𝙽𝙾 𝙿𝚄𝙳𝙴 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝙸𝙳 𝙳𝙴𝙻 𝚅Í𝙳𝙴𝙾`);
        }

        const cleanUrl = `https://youtu.be/${videoId}`;

        console.log('[PLAY2] videoId:', videoId);
        console.log('[PLAY2] cleanUrl:', cleanUrl);

        const apiUrl = `https://api.ryuzei.xyz/download/ytvideo/v4?url=${encodeURIComponent(cleanUrl)}`;

        console.log('[PLAY2] apiUrl:', apiUrl);

        const response = await axios.get(apiUrl, { timeout: 60000 });
        const data = response.data;

        if (!data?.status || !data?.data?.download) {
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
            `🍥 𝙻𝙸𝙺𝙴𝚂 ── ${info.likes || 'N/A'}\n` +
            `🪷 𝙵𝙾𝚁𝙼𝙰𝚃𝙾 ── ${info.format || 'MP4'}\n\n` +
            `𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰𝙽𝙳𝙾 𝚅Í𝙳𝙴𝙾...\n\n` +
            `ꨄ︎ ${global.nmcreador}`;

        if (imageUrl) {
            try {
                const image = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 15000
                });
                await sock.sendMessage(
                    msg.from,
                    { image: Buffer.from(image.data), caption: infoText },
                    { quoted: msg }
                );
            } catch {
                await msg.reply(infoText);
            }
        } else {
            await msg.reply(infoText);
        }

        const video = await axios.get(info.download, {
            responseType: 'arraybuffer',
            timeout: 180000
        });

        const fileName = `${cleanTitle(title)}.mp4`;

        await sock.sendMessage(
            msg.from,
            {
                video: Buffer.from(video.data),
                mimetype: 'video/mp4',
                fileName,
                caption: title
            },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error(
            '[PLAY2]',
            error?.response?.data || error?.response?.status || error?.message || error
        );
        await msg.reply(`⚠︎ 𝙾𝙲𝚄𝚁𝚁𝙸𝙾́ 𝚄𝙽 𝙴𝚁𝚁𝙾𝚁 𝙰𝙻 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝚅𝙸́𝙳𝙴𝙾`);
    } finally {
        processing.delete(requestKey);
    }
}
