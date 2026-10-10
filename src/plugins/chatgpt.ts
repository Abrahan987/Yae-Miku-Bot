export const command = ['ia', 'chatgpt'];
export const category = 'utils';
export const description = 'Realizar peticiones a ChatGPT.';

export default async function (sock: any, msg: any, extra: any) {
    const text = (extra?.args || []).join(' ').trim();

    if (!text) {
        return msg.reply('🪷 *CHATGPT*\n\n🍓 Escribe una petición para que la IA te responda.\n🍥 Ejemplo: .ia hola');
    }

    try {
        const prompt = 'Responde en español, sin inventar hechos, y sé breve pero útil.';
        const apiUrl = `https://api.delirius.online/ia/gptprompt?text=${encodeURIComponent(text)}&prompt=${encodeURIComponent(prompt)}`;
        const res = await fetch(apiUrl);
        const json: any = await res.json();
        const answer = json?.data || json?.result || json?.response || json?.answer;

        if (!answer) {
            return msg.reply('🍥 No se pudo obtener una respuesta válida.');
        }

        return sock.sendMessage(msg.from, { text: `🪷 *CHATGPT*\n\n🍓 ${String(answer)}` }, { quoted: msg });
    } catch (e: any) {
        console.error('[CHATGPT]', e);
        return msg.reply(`🍥 Ocurrió un error al consultar la IA.\n🪷 ${e?.message || String(e)}`);
    }
}
