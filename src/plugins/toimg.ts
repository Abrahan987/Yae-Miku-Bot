import * as cheerio from 'cheerio';

export const command = ['toimg', 'toimage'];
export const category = 'utils';
export const description = 'Convertir un sticker a imagen o GIF.';

async function ezgif(kind: 'png' | 'mp4', source: Buffer) {
    const base = `https://ezgif.com/webp-to-${kind}`;
    const form = new FormData();
    form.append('new-image-url', '');
    form.append('new-image', new Blob([source]), 'image.webp');

    const res = await fetch(base, { method: 'POST', body: form as any });
    const $ = cheerio.load(await res.text());

    const form2 = new FormData();
    let file = '';
    $('form input[name]').each((_, input) => {
        const name = $(input).attr('name');
        const value = $(input).val() as string;
        if (!name) return;
        if (name === 'file') file = value;
        form2.append(name, value || '');
    });

    const res2 = await fetch(`${base}/${file}`, { method: 'POST', body: form2 as any });
    const $2 = cheerio.load(await res2.text());
    const selector = kind === 'mp4' ? 'div#output > p.outfile > video > source' : 'div#output > p.outfile > img';
    const src = $2(selector).attr('src') || '';
    const outUrl = new URL(src, res2.url).toString();
    return Buffer.from(await (await fetch(outUrl)).arrayBuffer());
}

export default async function (sock: any, msg: any) {
    if (!msg.quoted) {
        return msg.reply('🪷 *TOIMG*\n\n🍓 Responde a un sticker para convertirlo.');
    }

    try {
        const quoted = msg.quoted;
        const buffer = await quoted.download();
        if (!buffer) {
            return msg.reply('🍥 No se pudo descargar el sticker.');
        }

        if (quoted.msg?.isAnimated) {
            const video = await ezgif('mp4', buffer);
            return sock.sendMessage(msg.from, { video, caption: '🪷 *TOIMG*\n\n🍓 Aquí tienes.', gifPlayback: true }, { quoted: msg });
        }

        const image = await ezgif('png', buffer);
        return sock.sendMessage(msg.from, { image, caption: '🪷 *TOIMG*\n\n🍓 Aquí tienes.' }, { quoted: msg });
    } catch (e: any) {
        console.error('[TOIMG]', e);
        return msg.reply(`🍥 Error al convertir el sticker.\n🪷 ${e?.message || String(e)}`);
    }
}
