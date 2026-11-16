import axios from 'axios';

export const command = ['pinterest', 'pin'];
export const category = 'descargas';
export const description = 'Busca imágenes en Pinterest y las envía.';

export default async function (sock: any, msg: any, extra: any, db: any) {
    const text = extra?.args?.join(' ') || '';

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

        let enviados = 0;

        const download = (item: any) => axios.get(item.hd || item.mini, {
            responseType: 'arraybuffer',
            timeout: 30000,
            maxContentLength: 25 * 1024 * 1024,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        }).then(
            (image) => ({ image }),
            (error) => ({ error })
        );
        const pending = new Map<number, ReturnType<typeof download>>();
        for (let i = 0; i < Math.min(2, results.length); i++) {
            pending.set(i, download(results[i]));
        }

        for (let i = 0; i < results.length; i++) {
            const result = await pending.get(i)!;
            pending.delete(i);
            if (i + 2 < results.length) pending.set(i + 2, download(results[i + 2]));

            try {
                if ('error' in result) throw result.error;
                if (!result.image?.data?.byteLength) throw new Error('Imagen vacía');

                await sock.sendMessage(
                    msg.from,
                    {
                        image: Buffer.from(result.image.data)
                    },
                    {
                        quoted: msg
                    }
                );

                enviados++;
            } catch (error) {
                console.error(`ERROR IMAGEN PINTEREST ${i + 1}:`, error);
            }
        }

        if (!enviados) {
            await sock.sendMessage(
                msg.from,
                {
                    text: `🍓͜ᩧ𑂳ᰍ  𝙿𝙸𝙽𝚃𝙴𝚁𝙴𝚂𝚃

🪷 𝙽𝙾 𝚂𝙴 𝙿𝚄𝙳𝙸𝙴𝚁𝙾𝙽 𝙴𝙽𝚅𝙸𝙰𝚁 𝙻𝙰𝚂 𝙸𝙼Á𝙶𝙴𝙽𝙴𝚂.

ꨄ︎ ${global.nmcreador}`
                },
                { quoted: msg }
            );
        }

    } catch (error) {
        console.error('ERROR PINTEREST:', error);

        await sock.sendMessage(
            msg.from,
            {
                text: `🍓͜ᩧ𑂳ᰍ  𝙿𝙸𝙽𝚃𝙴𝚁𝙴𝚂𝚃

🪷 𝙾𝙲𝚄𝚁𝚁𝙸Ó 𝚄𝙽 𝙴𝚁𝚁𝙾𝚁.

ꨄ︎ ${global.nmcreador}`
            },
            { quoted: msg }
        );
    }
}
