import axios from 'axios';
import ytsearch from 'yt-search';

export const command = ['play', 'mp3', 'ytmp3', 'ytaudio', 'playaudio'];
export const category = 'descargas';
export const description = 'Busca y descarga canciones de YouTube en formato MP3.';

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

const axiosInstance = axios.create({
    timeout: 30000,
    maxRedirects: 5,
});

export default async function (sock: any, msg: any, extra: any, db: any) {
    const text = extra.args.join(' ').trim();

    if (!text) {
        return msg.reply(
            `🍓 𝙴𝚂𝙲𝚁𝙸𝙱𝙴 𝙴𝙻 𝙽𝙾𝙼𝙱𝚁𝙴 𝙾 𝚄𝚁𝙻\n\n` +
            `> ${global.prefix[0]}play Oh Klahoma`
        );
    }

    const requestKey = text.toLowerCase();

    if (processing.has(requestKey)) {
        return msg.reply(`⏳ 𝙴𝚂𝚃𝙰 𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰 𝚈𝙰 𝙴𝚂𝚃Á 𝙰𝙲𝚃𝙸𝚅𝙰`);
    }

    processing.add(requestKey);
    msg.react('⏳');

    try {
        let videoUrl = text;
        let searchData: any = getCached(requestKey);
        const isYoutubeUrl = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(text);

        if (!isYoutubeUrl && !searchData) {
            try {
                const result = await ytsearch(text);
                if (!result.videos?.length) {
                    msg.react('❌');
                    return msg.reply(`🍥 𝙽𝙾 𝙴𝙽𝙲𝙾𝙽𝚃𝚁É 𝚁𝙴𝚂𝚄𝙻𝚃𝙰𝙳𝙾𝚂`);
                }
                searchData = result.videos[0];
                cache.set(requestKey, { data: searchData, time: Date.now() });
                videoUrl = searchData.url;
            } catch {
                msg.react('❌');
                return msg.reply(`⚠︎ 𝙴𝚁𝚁𝙾𝚁 𝙴𝙽 𝙻𝙰 𝙱𝚄𝚂𝚀𝚄𝙴𝙳𝙰`);
            }
        }

        msg.react('📥');

        const apiUrl = `https://api.delirius.online/download/ytmp3?url=${encodeURIComponent(videoUrl)}`;
        const response = await axiosInstance.get(apiUrl);
        const data = response.data;

        if (!data?.status || !data?.data?.download) {
            msg.react('❌');
            return msg.reply(`⚠︎ 𝙽𝙾 𝙿𝚄𝙳𝙴 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝙰𝚄𝙳𝙸𝙾`);
        }

        const info = data.data;
        const title = info.title || searchData?.title || 'YouTube Audio';
        const author = info.author || searchData?.author?.name || 'Desconocido';
        const imageUrl = info.image || searchData?.thumbnail;

        const infoText =
            `🍓͜ᩧ𑂳ᰍ  𝚈𝙾𝚄𝚃𝚄𝙱𝙴\n\n` +
            `🪷 ${title}\n` +
            `🍥 ${author}\n\n` +
            `📥 𝙳𝚎𝚜𝚌𝚊𝚛𝚐𝚊𝚗𝚍𝚘...`;

        msg.react('⏬');

        const audioPromise = axiosInstance.get(info.download, {
            responseType: 'arraybuffer',
            timeout: 90000
        });

        const imagePromise = imageUrl ? axiosInstance.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 10000
        }).catch(() => null) : Promise.resolve(null);

        const [audioRes, imageRes] = await Promise.all([audioPromise, imagePromise]);

        if (imageRes?.data) {
            await sock.sendMessage(
                msg.from,
                {
                    image: Buffer.from(imageRes.data),
                    caption: infoText
                },
                { quoted: msg }
            ).catch(() => msg.reply(infoText));
        } else {
            await msg.reply(infoText);
        }

        const fileName = `${cleanTitle(title)}.mp3`;

        await sock.sendMessage(
            msg.from,
            {
                audio: Buffer.from(audioRes.data),
                mimetype: 'audio/mpeg',
                fileName,
                ptt: false
            },
            { quoted: msg }
        );

        msg.react('✅');

    } catch (error: any) {
        console.error('[PLAY ERROR]:', error.message);
        msg.react('❌');
        await msg.reply(`⚠︎ 𝙾𝙲𝚄𝚁𝚁𝙸Ó 𝚄𝙽 𝙴𝚁𝚁𝙾𝚁`);
    } finally {
        processing.delete(requestKey);
    }
}
