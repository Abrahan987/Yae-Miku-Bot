import axios from 'axios';
import ytsearch from 'yt-search';

export const command = ['play', 'mp3', 'ytmp3', 'ytaudio', 'playaudio'];
export const category = 'descargas';
export const description = 'Busca y descarga canciones de YouTube en formato MP3.';

const processing = new Set<string>();

const cleanTitle = (title: string) => {
    return title
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 100);
};

export default async function (sock: any, msg: any, extra: any, db: any) {
    const text = extra.args.join(' ').trim();

    if (!text) {
        return msg.reply(
            `🍓 𝙴𝚂𝙲𝚁𝙸𝙱𝙴 𝙴𝙻 𝙽𝙾𝙼𝙱𝚁𝙴 𝙾 𝚄𝚁𝙻 𝙳𝙴 𝙻𝙰 𝙲𝙰𝙽𝙲𝙸Ó𝙽\n\n` +
            `𝙴𝙹𝙴𝙼𝙿𝙻𝙾\n` +
            `> ${global.prefix[0]}play Oh Klahoma`
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

        if (!isYoutubeUrl) {
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

        const title = info.title || searchData?.title || 'YouTube Audio';
        const author = info.author || searchData?.author?.name || 'Desconocido';
        const imageUrl = info.image || searchData?.thumbnail;

        const infoText =
            `ᅟㅤ 𓈒    |꛱ ᷼ |꛱ ᷼ |ㅤֵㅤ  ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒\n\n` +
            `${global.namebot}\n` +
            `𐴲੭  ˙ 𓂃  🍥  𓂃  ˙\n\n` +
            `🍓͜ᩧ𑂳ᰍ  𝚈𝙾𝚄𝚃𝚄𝙱𝙴\n\n` +
            `🪷 𝚃Í𝚃𝚄𝙻𝙾 ── ${title}\n` +
            `🍥 𝙰𝚄𝚃𝙾𝚁 ── ${author}\n` +
            `🪷 𝚅𝙸𝚂𝚃𝙰𝚂 ── ${info.views || 'N/A'}\n` +
            `🍥 𝙻𝙸𝙺𝙴𝚂 ── ${info.likes || 'N/A'}\n` +
            `🪷 𝙵𝙾𝚁𝙼𝙰𝚃𝙾 ── ${info.format || 'MP3'}\n\n` +
            `𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰𝙽𝙳𝙾 𝙰𝚄𝙳𝙸𝙾...\n\n` +
            `ꨄ︎ ${global.nmcreador}`;

        if (imageUrl) {
            try {
                const image = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 15000
                });

                await sock.sendMessage(
                    msg.from,
                    {
                        image: Buffer.from(image.data),
                        caption: infoText
                    },
                    {
                        quoted: msg
                    }
                );
            } catch {
                await msg.reply(infoText);
            }
        } else {
            await msg.reply(infoText);
        }

        const audio = await axios.get(info.download, {
            responseType: 'arraybuffer',
            timeout: 120000
        });

        const fileName = `${cleanTitle(title)}.mp3`;

        await sock.sendMessage(
            msg.from,
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
            error?.response?.data || error?.response?.status || error?.message || error
        );

        await msg.reply(
            `⚠︎ 𝙾𝙲𝚄𝚁𝚁𝙸Ó 𝚄𝙽 𝙴𝚁𝚁𝙾𝚁 𝙰𝙻 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝙰𝚄𝙳𝙸𝙾`
        );
    } finally {
        processing.delete(requestKey);
    }
}
