export const command = ['todos', 'invocar', 'tagall'];
export const category = 'group';
export const description = 'Enviar un mensaje mencionando a todos los usuarios del grupo.';
export const admin = true;

export default async function (sock: any, msg: any, extra: any) {
    try {
        const participants = extra.participants || [];
        const memberJids = participants.map((p: any) => p.id).filter(Boolean);
        const pesan = extra.args.join(' ') || 'Revivan 🪴';
        
        let text = `﹒⌗﹒🌱 .ৎ˚₊‧  ${pesan}\n\n𐚁 ֹ ִ \`GROUP TAG\` ! ୧ ֹ ִ🍃\n\n🍄 \`Miembros :\` ${participants.length}\n🌿 \`Solicitado por :\` @${msg.sender.split('@')[0]}\n\n`;
        text += `╭┄ ꒰ \`Lista de usuarios:ׄ\` ꒱ ┄\n`;
        
        for (const jid of memberJids) {
            text += `┊ꕥ @${jid.split('@')[0]}\n`;
        }
        
        text += `╰⸼ ┄ ┄ ꒰ \`@latest\` ꒱ ┄ ┄⸼`;
        
        await sock.sendMessage(msg.from, { text }, { quoted: msg, mentions: [msg.sender, ...memberJids] });
    } catch (e: any) {
        return msg.reply(`Error: ${e.message}`);
    }
}