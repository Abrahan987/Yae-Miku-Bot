import { authorizeOwnerCommand } from '../lib/owner_command.ts';
import { deco } from '../lib/perms.ts';

export const command = ['restart'];
export const category = 'owner';
export const description = 'Reinicia el bot principal (solo owner).';
export const owner = true;

export default async function (sock: any, msg: any, _extra: any, _db: any, rawMsg: any) {
    if (!await authorizeOwnerCommand(sock, msg, rawMsg)) return;
    if (process.env.YAE_LAUNCHER !== '1' || !process.send || !process.connected) {
        return msg.reply(deco('𝚁𝙴𝙸𝙽𝙸𝙲𝙸𝙾', '🪷 No puedo reiniciarme automáticamente. Inicia el bot con *npm start*.'));
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
