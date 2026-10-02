import ytsearch from 'yt-search';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';

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

const compressVideo = (inputBuffer: Buffer): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        const tmpIn = path.join(os.tmpdir(), `play2_in_${Date.now()}.mp4`);
        const tmpOut = path.join(os.tmpdir(), `play2_out_${Date.now()}.mp4`);
        fs.writeFileSync(tmpIn, inputBuffer);

        ffmpeg(tmpIn)
            .videoCodec('libx264')
            .audioCodec('aac')
            .format('mp4')
            .outputOptions([
                '-preset ultrafast',
                '-crf 32',
                '-vf scale=-2:480',
                '-movflags faststart',
                '-threads 4',
                '-b:a 64k'
            ])
            .on('end', () => {
                try {
                    const out = fs.readFileSync(tmpOut);
                    fs.unlinkSync(tmpIn);
                    fs.unlinkSync(tmpOut);
                    resolve(out);
                } catch (e) {
                    reject(e);
                }
            })
            .on('error', (err) => {
                try { fs.unlinkSync(tmpIn); } catch {}
                try { fs.unlinkSync(tmpOut); } catch {}
                reject(err);
            })
            .save(tmpOut);
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
            fetch(thumb)
                .then(r => r.arrayBuffer())
                .then(b => sock.sendMessage(
                    msg.from,
                    { image: Buffer.from(b), caption: quickInfo },
                    { quoted: msg }
                ))
                .catch(() => msg.reply(quickInfo));
        } else {
            msg.reply(quickInfo);
        }

        const apiUrl = `https://api.ryuzei.xyz/download/ytvideo/v4?url=${encodeURIComponent(cleanUrl)}`;
        const data: any = await fetch(apiUrl).then(r => r.json());

        if (!data?.status || !data?.data?.download) {
            return msg.reply(`⚠︎ 𝙽𝙾 𝙿𝚄𝙳𝙴 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝚅Í𝙳𝙴𝙾`);
        }

        const info = data.data;
        const title = info.title || quickTitle;
        const fileName = `${cleanTitle(title)}.mp4`;

        const rawBuffer = await fetch(info.download)
            .then(r => r.arrayBuffer())
            .then(b => Buffer.from(b));

        let finalBuffer = rawBuffer;
        try {
            const compressed = await compressVideo(rawBuffer);
            if (compressed.length > 0 && compressed.length < rawBuffer.length) {
                finalBuffer = compressed;
            }
        } catch {
            console.error('[PLAY2] ffmpeg error, usando original');
        }

        await sock.sendMessage(
            msg.from,
            {
                video: finalBuffer,
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
