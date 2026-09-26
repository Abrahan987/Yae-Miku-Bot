export const command = ['tiktoksearch', 'tiks'];
export const category = 'descargas';
export const description = 'Busca videos en TikTok y los envía.';

export default async function (sock: any, msg: any, extra: any, db: any) {
    const { text } = extra;

    if (!text) {
        return await sock.sendMessage(msg.key.remoteJid, {
            text: '❀ Escribe algo para buscar en TikTok.'
        }, { quoted: msg });
    }

    try {
        const url = `https://api.stellarwa.xyz/search/tiktok?key=${global.key}&query=${encodeURIComponent(text)}`;

        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!data?.status || !Array.isArray(data?.result) || !data.result.length) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '⚠︎ No encontré resultados para esa búsqueda.'
            }, { quoted: msg });
        }

        const result = data.result[0];

        if (!result?.dl) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '⚠︎ No se pudo obtener el video.'
            }, { quoted: msg });
        }

        await sock.sendMessage(msg.key.remoteJid, {
            video: { url: result.dl },
            caption: `𝚃𝙸́𝚃𝚄𝙻𝙾\n${result.title || 'Sin título'}`
        }, { quoted: msg });

    } catch (error) {
        console.error(error);

        await sock.sendMessage(msg.key.remoteJid, {
            text: '⚠︎ Ocurrió un error al buscar el video.'
        }, { quoted: msg });
    }
}
