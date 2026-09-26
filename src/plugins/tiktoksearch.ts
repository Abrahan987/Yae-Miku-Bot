import axios from 'axios';

export const command = ['tiktoksearch', 'ttsearch', 'tts'];
export const category = 'descargas';
export const description = 'Busca videos en TikTok y envía los primeros 5 resultados.';

export default async function (sock: any, msg: any, extra: any, db: any) {
    const query = extra.args.join(' ').trim();

    if (!query) {
        return msg.reply(
            `ᅟㅤ 𓈒    |꛱ ᷼ |꛱ ᷼ |ㅤֵㅤ  ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒\n\n` +
            `${global.namebot}\n` +
            `𐴲੭  ˙ 𓂃  🍥  𓂃  ˙\n\n` +
            `🍓͜ᩧ𑂳ᰍ  𝚃𝙸𝙺𝚃𝙾𝙺\n\n` +
            `🪷 𝙴𝚂𝙲𝚁𝙸𝙱𝙴 𝙰𝙻𝙶𝙾 𝙿𝙰𝚁𝙰 𝙱𝚄𝚂𝙲𝙰𝚁\n\n` +
            `𝙴𝙹𝙴𝙼𝙿𝙻𝙾\n` +
            `> ${global.prefix[0]}𝚝𝚒𝚔𝚝𝚘𝚔 𝚛𝚒𝚣𝚘𝚜\n\n` +
            `ꨄ︎ ${global.nmcreador}`
        );
    }

    try {
        await msg.reply(
            `ᅟㅤ 𓈒    |꛱ ᷼ |꛱ ᷼ |ㅤֵㅤ  ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒\n\n` +
            `${global.namebot}\n` +
            `𐴲੭  ˙ 𓂃  🍥  𓂃  ˙\n\n` +
            `🍓͜ᩧ𑂳ᰍ  𝚃𝙸𝙺𝚃𝙾𝙺\n\n` +
            `🪷 𝙱𝚄𝚂𝙲𝙰𝙽𝙳𝙾 𝚅Í𝙳𝙴𝙾𝚂...\n\n` +
            `𝙱Ú𝚂𝚀𝚄𝙴𝙳𝙰 ── ${query}\n\n` +
            `ꨄ︎ ${global.nmcreador}`
        );

        const response = await axios.get('https://api.stellarwa.xyz/search/tiktok', {
            params: {
                query,
                key: global.key
            },
            timeout: 60000
        });

        const data = response.data;

        if (!data?.status || !Array.isArray(data?.result) || !data.result.length) {
            return msg.reply(
                `⚠︎ 𝙽𝙾 𝙴𝙽𝙲𝙾𝙽𝚃𝚁É 𝚅Í𝙳𝙴𝙾𝚂 𝙿𝙰𝚁𝙰 𝙴𝚂𝙰 𝙱Ú𝚂𝚀𝚄𝙴𝙳𝙰`
            );
        }

        const videos = data.result
            .filter((video: any) => video?.dl)
            .slice(0, 5);

        if (!videos.length) {
            return msg.reply(
                `⚠︎ 𝙽𝙾 𝙷𝙰𝚈 𝚅Í𝙳𝙴𝙾𝚂 𝙳𝙸𝚂𝙿𝙾𝙽𝙸𝙱𝙻𝙴𝚂 𝙿𝙰𝚁𝙰 𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰𝚁`
            );
        }

        for (let i = 0; i < videos.length; i++) {
            const video = videos[i];

            const stats = video.stats || {};
            const author = video.author || {};

            const title = video.title || 'Sin título';
            const username =
                author.unique_id ||
                author.username ||
                author.nickname ||
                'Desconocido';

            const nickname = author.nickname || username;

            const views = Number(stats.views ?? stats.plays ?? 0).toLocaleString('es-CO');
            const likes = Number(stats.likes ?? 0).toLocaleString('es-CO');
            const comments = Number(stats.comments ?? 0).toLocaleString('es-CO');
            const shares = Number(stats.shares ?? 0).toLocaleString('es-CO');

            const caption =
                `ᅟㅤ 𓈒    |꛱ ᷼ |꛱ ᷼ |ㅤֵㅤ  ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒\n\n` +
                `${global.namebot}\n` +
                `𐴲੭  ˙ 𓂃  🍥  𓂃  ˙\n\n` +
                `🍓͜ᩧ𑂳ᰍ  𝚃𝙸𝙺𝚃𝙾𝙺\n\n` +
                `🪷 𝚁𝙴𝚂𝚄𝙻𝚃𝙰𝙳𝙾 ${i + 1}/5\n\n` +
                `🪷 𝚃Í𝚃𝚄𝙻𝙾 ── ${title}\n` +
                `🍥 𝙰𝚄𝚃𝙾𝚁 ── ${nickname}\n` +
                `> 𝚄𝚂𝚄𝙰𝚁𝙸𝙾 ── @${username}\n` +
                `> 𝙳𝚄𝚁𝙰𝙲𝙸Ó𝙽 ── ${video.duration || 'N/A'}\n` +
                `> 𝚅𝙸𝚂𝚃𝙰𝚂 ── ${views}\n` +
                `> 𝙻𝙸𝙺𝙴𝚂 ── ${likes}\n` +
                `> 𝙲𝙾𝙼𝙴𝙽𝚃𝙰𝚁𝙸𝙾𝚂 ── ${comments}\n` +
                `> 𝙲𝙾𝙼𝙿𝙰𝚁𝚃𝙸𝙳𝙾𝚂 ── ${shares}\n\n` +
                `ꨄ︎ ${global.nmcreador}`;

            try {
                const videoResponse = await axios.get(video.dl, {
                    responseType: 'arraybuffer',
                    timeout: 60000
                });

                await sock.sendMessage(
                    msg.from,
                    {
                        video: Buffer.from(videoResponse.data),
                        mimetype: 'video/mp4',
                        caption
                    },
                    {
                        quoted: msg
                    }
                );
            } catch {
                await msg.reply(
                    `⚠︎ 𝙽𝙾 𝙿𝚄𝙳𝙴 𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰𝚁 𝙴𝙻 𝚅Í𝙳𝙴𝙾 ${i + 1}`
                );
            }
        }
    } catch (error: any) {
        console.error(
            '[TIKTOK SEARCH]',
            error?.response?.data || error?.message || error
        );

        await msg.reply(
            `⚠︎ 𝙾𝙲𝚄𝚁𝚁𝙸Ó 𝚄𝙽 𝙴𝚁𝚁𝙾𝚁 𝙰𝙻 𝙱𝚄𝚂𝙲𝙰𝚁 𝙴𝙽 𝚃𝙸𝙺𝚃𝙾𝙺`
        );
    }
}
