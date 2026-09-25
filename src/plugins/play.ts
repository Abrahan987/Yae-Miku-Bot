import ytsearch from 'yt-search';
import axios from 'axios';

export const command = ['play', 'mp3', 'ytmp3', 'ytaudio', 'playaudio'];
export const category = 'descargas';
export const description = 'Busca y descarga canciones de YouTube en formato MP3.';

const API_URL = 'https://api.stellarwa.xyz';
const processing = new Set<string>();

const cleanTitle = (title: string) => {
    return title
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 100);
};

export default async function (sock: any, msg: any, extra: any, db: any) {
    const text = extra?.args?.join(' ').trim() || '';

    if (!text) {
        return await msg.reply(
            `${global.namebot}

🍓 𝙴𝚂𝙲𝚁𝙸𝙱𝙴 𝙴𝙻 𝙽𝙾𝙼𝙱𝚁𝙴 𝙾 𝚄𝚁𝙻 𝙳𝙴 𝙻𝙰 𝙲𝙰𝙽𝙲𝙸Ó𝙽

🪷 𝙴𝙹𝙴𝙼𝙿𝙻𝙾
> ${global.prefix[0]}play Oh Klahoma

ꨄ︎ ${global.nmcreador}`
        );
    }

    const requestKey = text.toLowerCase();

    if (processing.has(requestKey)) {
        return await msg.reply(
            `🍓 𝙴𝚂𝚃𝙰 𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰 𝚈𝙰 𝙴𝚂𝚃Á 𝙴𝙽 𝙿𝚁𝙾𝙲𝙴𝚂𝙾 ❀`
        );
    }

    processing.add(requestKey);

    try {
        let video: any;

        if (/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(text)) {
            const result = await ytsearch(text);

            if (result.videos?.length) {
                video = result.videos[0];
            } else {
                video = {
                    url: text,
                    title: 'YouTube Audio',
                    author: { name: 'Desconocido' },
                    timestamp: 'N/A',
                    thumbnail: ''
                };
            }
        } else {
            const result = await ytsearch(text);

            if (!result.videos?.length) {
                return await msg.reply(
                    `🍥 𝙽𝙾 𝙴𝙽𝙲𝙾𝙽𝚃𝚁É 𝚅Í𝙳𝙴𝙾𝚂 𝙿𝙰𝚁𝙰 𝙴𝚂𝙰 𝙱Ú𝚂𝚀𝚄𝙴𝙳𝙰 ❀`
                );
            }

            video = result.videos[0];
        }

        const title = video.title || 'Desconocido';
        const author = video.author?.name || 'Desconocido';
        const duration = video.timestamp || 'N/A';
        const views = video.views
            ? video.views.toLocaleString()
            : 'N/A';

        const infoText =
            `${global.namebot}

🍓͜ᩧ𑂳ᰍ  𝙿𝙻𝙰𝚈

🪷 𝚃Í𝚃𝚄𝙻𝙾 ── ${title}
🍥 𝙰𝚁𝚃𝙸𝚂𝚃𝙰 ── ${author}
> 𝙳𝚄𝚁𝙰𝙲𝙸Ó𝙽 ── ${duration}
> 𝚅𝙸𝚂𝚃𝙰𝚂 ── ${views}

🪷 𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰𝙽𝙳𝙾 𝙰𝚄𝙳𝙸𝙾...

ꨄ︎ ${global.nmcreador}`;

        if (video.thumbnail) {
            try {
                const image = await axios.get(video.thumbnail, {
                    responseType: 'arraybuffer',
                    timeout: 20000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0'
                    }
                });

                await sock.sendMessage(
                    msg.from,
                    {
                        image: Buffer.from(image.data),
                        caption: infoText
                    },
                    { quoted: msg }
                );
            } catch {
                await msg.reply(infoText);
            }
        } else {
            await msg.reply(infoText);
        }

        const response = await axios.get(`${API_URL}/dl/ytmp3`, {
            params: {
                url: video.url,
                key: global.key
            },
            timeout: 60000
        });

        const data = response.data;

        if (!data?.status || !data?.data?.dl) {
            return await msg.reply(
                `⚠︎ 𝙽𝙾 𝙿𝚄𝙳𝙴 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝙰𝚄𝙳𝙸𝙾`
            );
        }

        const downloadUrl = data.data.dl;
        const finalTitle = data.data.title || title;
        const fileName = `${cleanTitle(finalTitle)}.mp3`;

        await sock.sendMessage(
            msg.from,
            {
                audio: { url: downloadUrl },
                mimetype: 'audio/mpeg',
                fileName,
                ptt: false
            },
            { quoted: msg }
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
