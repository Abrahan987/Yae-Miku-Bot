export const command = ['tourl'];
export const category = 'utils';
export const description = 'Convertir una imagen en un enlace.';

const uniqueName = (mime: string) => {
    const ext = (mime || 'image/jpeg').split('/')[1]?.split(';')[0] || 'jpg';
    return `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
};

async function uploadAdoFiles(buffer: Buffer, mime: string) {
    const res = await fetch('https://cdn.adoolab.xyz/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: uniqueName(mime), data: buffer.toString('base64'), expiration: 'never' })
    });
    const body: any = await res.json();
    if (typeof body?.url !== 'string' || !body.url.startsWith('https://')) {
        throw new Error('Respuesta inválida de AdoFiles');
    }
    return body.url as string;
}

async function uploadFare(buffer: Buffer, mime: string) {
    const form = new FormData();
    form.append('file', new Blob([buffer]), uniqueName(mime));
    const res = await fetch('https://u.fare.ink/api/upload', { method: 'POST', body: form as any });
    const body: any = await res.json();
    const url = body?.file?.publicUrl;
    if (typeof url !== 'string' || !url.startsWith('https://')) {
        throw new Error('Respuesta inválida de Fare');
    }
    return url as string;
}

async function uploadUguu(buffer: Buffer, mime: string) {
    const form = new FormData();
    form.append('files[]', new Blob([buffer]), uniqueName(mime));
    const res = await fetch('https://uguu.se/upload.php', { method: 'POST', body: form as any });
    const body: any = await res.json();
    const url = body?.files?.[0]?.url;
    if (typeof url !== 'string') {
        throw new Error('Respuesta inválida de Uguu');
    }
    return url as string;
}

async function uploadAuto(buffer: Buffer, mime: string) {
    const attempts: [string, () => Promise<string>][] = [
        ['adofiles', () => uploadAdoFiles(buffer, mime)],
        ['fare', () => uploadFare(buffer, mime)],
        ['uguu', () => uploadUguu(buffer, mime)]
    ];
    for (const [server, fn] of attempts) {
        try {
            return { link: await fn(), server };
        } catch {}
    }
    throw new Error('Todos los servidores fallaron');
}

const formatBytes = (bytes: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default async function (sock: any, msg: any, extra: any) {
    const q = msg.quoted || msg;
    const mime = (q.msg || q).mimetype || '';
    const p = (global as any).prefix?.[0] || '.';

    if (!mime) {
        return msg.reply(
            `🪷 *TOURL*\n\n🍓 Responde a una imagen o video con ${p}${extra.command} [servidor]\n🍥 Servidores: adofiles, fare, uguu, auto`
        );
    }

    try {
        const media = await q.download();
        if (!media) return msg.reply('🍥 No se pudo descargar el archivo.');

        const serverArg = (extra.args[0] || 'adofiles').toLowerCase();
        const servers: Record<string, () => Promise<{ link: string; server: string }>> = {
            adofiles: async () => ({ link: await uploadAdoFiles(media, mime), server: 'adofiles' }),
            fare: async () => ({ link: await uploadFare(media, mime), server: 'fare' }),
            uguu: async () => ({ link: await uploadUguu(media, mime), server: 'uguu' }),
            auto: () => uploadAuto(media, mime)
        };

        if (!servers[serverArg]) {
            return msg.reply('🍥 Servidor no válido. Disponibles: adofiles, fare, uguu o auto.');
        }

        const { link, server } = await servers[serverArg]();
        return sock.sendMessage(
            msg.from,
            { text: `🪷 *TOURL* (${server.toUpperCase()})\n\n🍓 Link: ${link}\n🍥 Peso: ${formatBytes(media.length)}` },
            { quoted: msg }
        );
    } catch (e: any) {
        console.error('[TOURL]', e);
        return msg.reply(`🍥 Ocurrió un error al subir el archivo.\n🪷 ${e?.message || String(e)}`);
    }
}
