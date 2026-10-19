export const command = ['say', 'decir'];
export const category = 'utils';
export const description = 'Repetir un mensaje como el bot.';

export default async function (sock: any, msg: any, extra: any) {
    const groupMetadata = msg.isGroup ? await sock.groupMetadata(msg.from).catch(() => null) : null;
    const allMentions: string[] = (groupMetadata?.participants || []).map((p: any) => p.id).filter(Boolean);
    const userText = (extra.args.join(' ') || '').trim();
    const src = msg.quoted || msg;
    const hasImage = Boolean(src.message?.imageMessage || src.mtype === 'imageMessage');
    const hasVideo = Boolean(src.message?.videoMessage || src.mtype === 'videoMessage');
    const hasAudio = Boolean(src.message?.audioMessage || src.mtype === 'audioMessage');
    const hasSticker = Boolean(src.message?.stickerMessage || src.mtype === 'stickerMessage');
    const originalText = (src.caption || src.text || src.body || '').trim();
    const textToSend = (userText || originalText || '').trim();
    const mentions = allMentions.filter((jid) => textToSend.includes(jid.split('@')[0]));

    try {
        if (hasImage || hasVideo) {
            const media = await src.download();
            if (hasImage) {
                return sock.sendMessage(msg.from, { image: media, caption: textToSend, mentions });
            }
            return sock.sendMessage(msg.from, { video: media, mimetype: 'video/mp4', caption: textToSend, mentions });
        }

        if (hasAudio) {
            const media = await src.download();
            return sock.sendMessage(msg.from, { audio: media, mimetype: 'audio/mp4', fileName: 'audio.mp3', mentions });
        }

        if (hasSticker) {
            const media = await src.download();
            return sock.sendMessage(msg.from, { sticker: media, mentions });
        }

        if (textToSend) {
            return sock.sendMessage(msg.from, { text: textToSend, mentions });
        }

        return msg.reply('🪷 *SAY*\n\n🍓 Escribe el texto que quieres que repita.');
    } catch (e: any) {
        console.error('[SAY]', e);
        return msg.reply(`🍥 Ocurrió un error al repetir el mensaje.\n🪷 ${e?.message || String(e)}`);
    }
}
