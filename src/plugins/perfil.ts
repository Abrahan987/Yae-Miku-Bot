import { db, getUser, updateUser, getWarnings } from '../lib/database.ts';

export const command = ['perfil', 'profile', 'p'];
export const category = 'economia';
export const description = 'Muestra tu perfil: nombre, foto y dinero.';
export const admin = false;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any) {
    const chatId = msg.from || msg.chat || extra?.chat;

    try {
        const target = msg.mentionedJid?.[0] || msg.quoted?.sender || msg.sender;
        const number = target.split('@')[0].split(':')[0];
        const user = getUser(target);

        // Guardar el nombre si aún no existe y es el propio usuario
        const pushName = target === msg.sender ? (msg.pushName || '') : '';
        if (!user.name && pushName) {
            updateUser(target, { name: pushName, yen: user.yen, banned: user.banned });
            user.name = pushName;
        }

        const name = user.name || number;
        const yen = Number(user.yen || 0);

        const rankRow = db
            .prepare('SELECT COUNT(*) + 1 AS pos FROM users WHERE yen > ?')
            .get(yen) as any;
        const totalRow = db.prepare('SELECT COUNT(*) AS total FROM users').get() as any;

        let messages = 0;
        let warns = 0;
        if (msg.isGroup) {
            const row = db
                .prepare('SELECT message_count FROM message_stats WHERE groupJid = ? AND userJid = ?')
                .get(chatId, target) as any;
            messages = row ? Number(row.message_count) : 0;
            warns = getWarnings(chatId, target);
        }

        let caption =
            `🍓͜ᩧ𑂳ᰍ  PERFIL\n\n` +
            `🪷 Nombre: *${name}*\n` +
            `📱 Número: @${number}\n` +
            `💰 Dinero: *¥${yen.toLocaleString()}*\n` +
            `🏆 Ranking: *#${rankRow?.pos ?? 1}* de ${totalRow?.total ?? 1}`;

        if (msg.isGroup) {
            caption += `\n💬 Mensajes (grupo): *${messages.toLocaleString()}*`;
            caption += `\n⚠️ Advertencias: *${warns}/3*`;
        }

        let pp: string | null = null;
        try {
            pp = await sock.profilePictureUrl(target, 'image');
        } catch {
            pp = null;
        }

        if (pp) {
            return sock.sendMessage(
                chatId,
                { image: { url: pp }, caption, mentions: [target] },
                { quoted: msg }
            );
        }

        return sock.sendMessage(
            chatId,
            { text: caption, mentions: [target] },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error('[PERFIL ERROR]:', error);
        return msg.reply('⚠︎ Ocurrió un error al obtener el perfil.');
    }
}
