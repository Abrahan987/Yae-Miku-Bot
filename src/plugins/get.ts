export const command = ['get', 'fetch'];
export const category = 'utils';
export const description = 'Realizar solicitudes GET a páginas web.';

function getExtension(contentType: string, url: string) {
    const match = url.match(/\.(\w+)(?:\?|$)/);
    if (match) return `.${match[1]}`;
    const map: Record<string, string> = {
        'text/html': '.html',
        'text/css': '.css',
        'text/javascript': '.js',
        'application/javascript': '.js',
        'application/json': '.json',
        'text/xml': '.xml',
        'text/plain': '.txt'
    };
    return map[contentType.split(';')[0]] || '.txt';
}

export default async function (sock: any, msg: any, extra: any) {
    const text = (extra?.args || [])[0];

    if (!text) {
        return msg.reply('🪷 *GET*\n\n🍓 Ingresa un enlace para realizar la solicitud.');
    }

    if (!/^https?:\/\//i.test(text)) {
        return msg.reply('🍥 Ingresa un enlace válido que comience con http o https.');
    }

    try {
        const res = await fetch(text);
        const contentType = res.headers.get('content-type') || '';
        const contentLength = Number(res.headers.get('content-length') || '0');

        if (contentLength > 100 * 1024 * 1024) {
            return msg.reply(`🍥 El archivo es demasiado grande.\n🪷 ${contentLength} bytes`);
        }

        const buffer = Buffer.from(await res.arrayBuffer());

        if (/text|json/.test(contentType)) {
            const content = buffer.toString();
            if (content.length > 500) {
                return sock.sendMessage(
                    msg.from,
                    { document: buffer, fileName: `code_${Date.now()}${getExtension(contentType, text)}`, mimetype: 'text/plain' },
                    { quoted: msg }
                );
            }
            try {
                return msg.reply(JSON.stringify(JSON.parse(content), null, 2).slice(0, 65536));
            } catch {
                return msg.reply(content.slice(0, 65536));
            }
        }

        return sock.sendMessage(
            msg.from,
            { document: buffer, fileName: 'file', mimetype: contentType || 'application/octet-stream' },
            { quoted: msg }
        );
    } catch (e: any) {
        console.error('[GET]', e);
        return msg.reply(`🍥 Ocurrió un error al consultar la URL.\n🪷 ${e?.message || String(e)}`);
    }
}
