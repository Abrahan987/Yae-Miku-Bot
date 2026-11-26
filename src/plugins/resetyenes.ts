import { db, getUserBalance } from '../lib/database.ts';
import { isOwner, deco, warn } from '../lib/perms.ts';

export const command = ['resetyenesall', 'resetyenes'];
export const category = 'economia';
export const description = 'Restablece los yenes disponibles y del banco de un usuario o de todos.';
export const admin = false;
export const botAdmin = false;
export const owner = true;

export default async function (sock: any, msg: any, extra: any, _db: any, rawMsg: any) {
    if (!isOwner(sock, msg, rawMsg)) {
        return sock.sendMessage(msg.from, { text: warn.owner() }, { quoted: msg });
    }

    const action = String(extra?.command || '').toLowerCase();
    if (action === 'resetyenesall') {
        let resetCount = 0;
        try {
            db.exec('BEGIN IMMEDIATE');
            const result = db.prepare('UPDATE users SET yen = 0, bank = 0 WHERE yen != 0 OR bank != 0').run();
            resetCount = Number(result.changes);
            db.exec('COMMIT');
        } catch (error) {
            try {
                db.exec('ROLLBACK');
            } catch (rollbackError) {
                console.error('[RESET YENES ALL ROLLBACK]', rollbackError);
            }
            console.error('[RESET YENES ALL]', error);
            return msg.reply(deco('𝚁𝙴𝚂𝙴𝚃 𝙳𝙴 𝚈𝙴𝙽𝙴𝚂', '⚠️ No se pudieron restablecer los yenes. No se confirmó ningún cambio.'));
        }
        return msg.reply(deco(
            '𝚁𝙴𝚂𝙴𝚃 𝙳𝙴 𝚈𝙴𝙽𝙴𝚂',
            `🪷 Se restablecieron los yenes disponibles y del banco de *${resetCount.toLocaleString()} usuarios*.\n> Los demás datos de sus cuentas se conservaron.`
        ));
    }

    const target = msg.mentionedJid?.[0] || msg.quoted?.sender;
    if (!target) {
        const prefix = Array.isArray((global as any).prefix)
            ? (global as any).prefix[0] || '.'
            : (global as any).prefix || '.';
        return msg.reply(deco(
            '𝚁𝙴𝚂𝙴𝚃 𝙳𝙴 𝚈𝙴𝙽𝙴𝚂',
            `🪷 Responde a un usuario o menciónalo.\n> ${prefix}resetyenes @usuario`
        ));
    }

    try {
        const user = getUserBalance(target);
        const result = db.prepare('UPDATE users SET yen = 0, bank = 0 WHERE jid = ?').run(user.jid);
        if (!result.changes) {
            return msg.reply(deco('𝚁𝙴𝚂𝙴𝚃 𝙳𝙴 𝚈𝙴𝙽𝙴𝚂', '⚠️ No encontré una cuenta para ese usuario.'));
        }
        return sock.sendMessage(
            msg.from,
            {
                text: deco('𝚁𝙴𝚂𝙴𝚃 𝙳𝙴 𝚈𝙴𝙽𝙴𝚂', `🪷 Se restablecieron los yenes disponibles y del banco de @${target.split('@')[0]}.`),
                mentions: [target]
            },
            { quoted: msg }
        );
    } catch (error) {
        console.error('[RESET YENES USER]', error);
        return msg.reply(deco('𝚁𝙴𝚂𝙴𝚃 𝙳𝙴 𝚈𝙴𝙽𝙴𝚂', '⚠️ No se pudo restablecer el saldo de ese usuario.'));
    }
}
