import axios from 'axios';

export const command = ['pinterest', 'pin'];
export const category = 'descargas';
export const description = 'Busca imágenes en Pinterest y las envía en un álbum.';

export default async function (sock: any, msg: any, extra: any, db: any) {
    const text = extra?.text || extra?.args?.join(' ') || '';

    if (!text.trim()) {
        return await sock.sendMessage(
            msg.from,
            {
                text: `${global.namebot}

🍓͜ᩧ𑂳ᰍ  𝙿𝙸𝙽𝚃𝙴𝚁𝙴𝚂𝚃

🪷 𝙴𝙹𝙴𝙼𝙿𝙻𝙾
> ${global.prefix[0]}pinterest rizadas

ꨄ︎ ${global.nmcreador}`
            },
            { quoted: msg }
        );
    }

    const query = text.trim();

    try {
        await sock.sendMessage(
            msg.from,
            {
                text: `${global.namebot}

🍓͜ᩧ𑂳ᰍ  𝙿𝙸𝙽𝚃𝙴𝚁𝙴𝚂𝚃

🪷 𝙱𝚄𝚂𝙲𝙰𝙽𝙳𝙾 𝙸𝙼Á𝙶𝙴𝙽𝙴𝚂...
> 𝚀𝚄𝙴𝚁𝚈 ── ${query}

ꨄ︎ ${global.nmcreador}`
            },
            { quoted: msg }
        );

        const response = await axios.get(
            'https://api.stellarwa.xyz/search/pinterest',
            {
                params: {
                    query,
                    key: global.key
                },
                timeout: 60000
            }
        );

        if (!response.data?.status || !Array.isArray(response.data?.data)) {
            return await sock.sendMessage(
                msg.from,
                {
                    text: `🍓͜ᩧ𑂳ᰍ  𝙿𝙸𝙽𝚃𝙴𝚁𝙴𝚂𝚃

🪷 𝙽𝙾 𝚂𝙴 𝙴𝙽𝙲𝙾𝙽𝚃𝚁𝙰𝚁𝙾𝙽 𝚁𝙴𝚂𝚄𝙻𝚃𝙰𝙳𝙾𝚂.

ꨄ︎ ${global.nmcreador}`
                },
                { quoted: msg }
            );
        }

        const results = response.data.data
            .filter((item: any) => item?.hd || item?.mini)
            .slice(0, 5);

        if (!results.length) {
            return await sock.sendMessage(
                msg.from,
                {
                    text: `🍓͜ᩧ𑂳ᰍ  𝙿𝙸𝙽𝚃𝙴𝚁𝙴𝚂𝚃

🪷 𝙽𝙾 𝙷𝙰𝚈 𝙸𝙼Á𝙶𝙴𝙽𝙴𝚂 𝙳𝙸𝚂𝙿𝙾𝙽𝙸𝙱𝙻𝙴𝚂.

ꨄ︎ ${global.nmcreador}`
                },
                { quoted: msg }
            );
        }

        const images = [];

        for (const item of results) {
            const imageUrl = item.hd || item.mini;

            try {
                const image = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 30000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0'
                    }
                });

                images.push({
                    image: Buffer.from(image.data)
                });
            } catch {}
        }

        if (!images.length) {
            return await sock.sendMessage(
                msg.from,
                {
                    text: `🍓͜ᩧ𑂳ᰍ  𝙿𝙸𝙽𝚃𝙴𝚁𝙴𝚂𝚃

🪷 𝙽𝙾 𝚂𝙴 𝙿𝚄𝙳𝙸𝙴𝚁𝙾𝙽 𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰𝚁 𝙻𝙰𝚂 𝙸𝙼Á𝙶𝙴𝙽𝙴𝚂.

ꨄ︎ ${global.nmcreador}`
                },
                { quoted: msg }
            );
        }

        await sock.sendMessage(
            msg.from,
            {
                album: images
            },
            {
                quoted: msg
            }
        );

    } catch (error) {
        console.error('ERROR PINTEREST:', error);

        await sock.sendMessage(
            msg.from,
            {
                text: `🍓͜ᩧ𑂳ᰍ  𝙿𝙸𝙽𝚃𝙴𝚁𝙴𝚂𝚃

🪷 𝙾𝙲𝚄𝚁𝚁𝙸Ó 𝚄𝙽 𝙴𝚁𝚁𝙾𝚁.

> ${error instanceof Error ? error.message : String(error)}

ꨄ︎ ${global.nmcreador}`
            },
            { quoted: msg }
        );
    }
}
