export const command = ['translate', 'trad', 'traducir'];
export const category = 'utils';
export const description = 'Traducir texto al idioma especificado.';

export default async function (sock: any, msg: any, extra: any) {
    const defaultLang = 'es';
    const args: string[] = extra.args || [];
    let lang = args[0];
    let text = '';

    if (!args[0] && !msg.quoted) {
        return msg.reply('🪷 *TRADUCTOR*\n\n🍓 Ingresa el idioma y el texto.\n🍥 Ejemplo: .translate en hola');
    }

    if (msg.quoted) {
        text = msg.quoted.text || msg.quoted.caption || msg.quoted.body || '';
        if ((lang || '').length === 2 && args[1]) {
            text = args.slice(1).join(' ') || text;
        } else if ((lang || '').length !== 2) {
            lang = defaultLang;
            text = args.join(' ') || text;
        }
    } else if ((lang || '').length === 2) {
        text = args.slice(1).join(' ');
    } else {
        lang = defaultLang;
        text = args.join(' ');
    }

    if (!text.trim()) {
        return msg.reply('🍥 No hay texto para traducir.');
    }

    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(lang || defaultLang)}&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        const json: any = await res.json();
        const translated = Array.isArray(json?.[0]) ? json[0].map((part: any[]) => part[0] || '').join('') : text;
        return sock.sendMessage(msg.from, { text: `🪷 *TRADUCTOR*\n\n🍓 ${translated}` }, { quoted: msg });
    } catch (e: any) {
        console.error('[TRANSLATE]', e);
        return msg.reply(`🍥 Ocurrió un error al traducir.\n🪷 ${e?.message || String(e)}`);
    }
}
