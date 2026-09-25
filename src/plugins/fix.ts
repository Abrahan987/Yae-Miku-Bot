import { exec } from 'child_process';
import { promisify } from 'util';
import { loadPlugins } from '#loader';

const execPromise = promisify(exec);

export const command = ['fix', 'pull', 'update'];
export const category = 'owner';
export const description = 'Actualiza el código y recarga los plugins.';
export const owner = true;

export default async function (sock: any, msg: any, extra: any) {
    const chatId = msg.from || msg.chat || extra?.chat;

    const sender =
        msg.sender ||
        msg.participant ||
        msg.key?.participant ||
        msg.key?.remoteJid ||
        extra?.sender ||
        extra?.m?.sender ||
        '';

    const senderNumber = String(sender)
        .replace(/@s\.whatsapp\.net$/i, '')
        .replace(/\D/g, '');

    const ownerNumber = String(global.owner || '')
        .replace(/@s\.whatsapp\.net$/i, '')
        .replace(/\D/g, '');

    const isOwner =
        extra?.isOwner === true ||
        msg.isOwner === true ||
        senderNumber === ownerNumber;

    if (!isOwner) {
        return msg.reply(
            '𖥨 *Acceso denegado:* Este comando solo puede ser ejecutado por el *dueño* del bot.'
        );
    }

    try {
        const { stdout } = await execPromise('git pull');

        await loadPlugins();

        const cleanOut = stdout.trim();

        const isUpToDate =
            cleanOut.includes('Already up to date') ||
            cleanOut.includes('Ya está actualizado');

        const text = isUpToDate
            ? '𖥨 *Sistema:* El bot ya está en su última versión.'
            : `𖥨 *Actualización completada:*

\`\`\`${cleanOut}\`\`\``;

        await sock.sendMessage(
            chatId,
            { text },
            { quoted: msg }
        );
    } catch (err: any) {
        console.error('[FIX ERROR]:', err);

        const text =
            `𖥨 *Error al actualizar:* ${err?.message || String(err)}`;

        await sock.sendMessage(
            chatId,
            { text },
            { quoted: msg }
        );
    }
}
