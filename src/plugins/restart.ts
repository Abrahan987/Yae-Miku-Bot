import { authorizeOwnerCommand } from '../lib/owner_command.ts';
import { deco } from '../lib/perms.ts';
import { getMainSocket } from '../lib/botcontext.ts';

export const command = ['restart'];
export const category = 'owner';
export const description = 'Reinicia el bot principal (solo owner).';
export const owner = true;

export default async function (sock: any, msg: any, _extra: any, _db: any, rawMsg: any) {
    if (!await authorizeOwnerCommand(sock, msg, rawMsg)) return;
    if (process.env.YAE_LAUNCHER !== '1' || !process.send || !process.connected) {
        const mainSocket = sock?.subbotPhone ? getMainSocket() : sock;
        if (typeof mainSocket?.end !== 'function') {
            return msg.reply(deco('𝙴𝚁𝚁𝙾𝚁', '🪷 No se pudo reiniciar la conexión. Reinicia el bot desde el panel.'));
        }
        await msg.reply(deco('𝚁𝙴𝙸𝙽𝙸𝙲𝙸𝙾', '🪷 Reiniciando la conexión principal. El proceso y los subbots seguirán activos.'));
        await mainSocket.end(new Error('Reinicio solicitado por el owner'));
        return;
    }
    await msg.reply(deco('𝚁𝙴𝙸𝙽𝙸𝙲𝙸𝙾', '🪷 Reiniciando el bot principal y sus subbots. Espera un momento.'));
    process.send('yae:restart', error => {
        if (error) {
            console.error('[RESTART IPC]:', error);
            void msg.reply(deco('𝙴𝚁𝚁𝙾𝚁', '🪷 No se pudo solicitar el reinicio.'));
            return;
        }
        process.exit(0);
    });
}
