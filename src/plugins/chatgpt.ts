
export const command = ['ia', 'chatgpt'];
export const category = 'utils';
export const description = 'Realizar peticiones a ChatGPT.';

export default async function (sock: any, msg: any, extra: any) {
    const text = (extra?.args || []).join(' ').trim();

    if (!text) {
        return msg.reply(
            '🪷 *CHATGPT*\n\n🍓 Escribe una petición para que la IA te responda.\n🍥 Ejemplo: .ia hola'
        );
    }

    try {
        const apiUrl = new URL(
            'https://api.stellarwa.xyz/ai/chatgpt'
        );

        apiUrl.searchParams.set('text', text);
        apiUrl.searchParams.set('key', String(global.key || ''));

        const res = await fetch(apiUrl.toString(), {
            method: 'GET',
            signal: AbortSignal.timeout(30000)
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const json: any = await res.json();

        if (json?.status !== true) {
            return msg.reply(
                '🍥 La API no pudo procesar tu petición.'
            );
        }

        const answer = json?.result;

        if (typeof answer !== 'string' || !answer.trim()) {
            return msg.reply(
                '🍥 No se pudo obtener una respuesta válida.'
            );
        }

        return await sock.sendMessage(
            msg.from,
            {
                text: `🪷 *CHATGPT*\n\n🍓 ${answer.trim()}`
            },
            {
                quoted: msg
            }
        );
    } catch (e: any) {
        console.error('[CHATGPT]', e);

        const error = e?.name === 'TimeoutError'
            ? 'La API tardó demasiado en responder.'
            : 'Ocurrió un error al consultar la IA.';

        return msg.reply(`🍥 ${error}`);
    }
}
