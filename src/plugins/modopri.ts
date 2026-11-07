import { getActiveBots } from '../lib/subbot.ts';
import { isPrivateModeEnabled, setPrivateMode, isSubbotPrivateModeOwner } from '../lib/private_mode.ts';
import { deco } from '../lib/perms.ts';

export const command = ['modopri', 'antipri', 'antiprivadi'];
export const category = 'socket';
export const description = 'Restringe los mensajes privados de tu subbot.';

export default async function (sock: any, msg: any, extra: any, _db: any, rawMsg: any) {
    const phone = [...getActiveBots().entries()].find(([, bot]) => bot === sock)?.[0];
    if (!phone) {
        return msg.reply(deco('𝙼𝙾𝙳𝙾 𝙿𝚁𝙸𝚅𝙰𝙳𝙾', '🪷 Este comando solo funciona en tu subbot vinculado.'));
    }
    if (!isSubbotPrivateModeOwner(sock, msg, rawMsg, phone)) {
        return msg.reply(deco('𝙰𝙲𝙲𝙴𝚂𝙾 𝙳𝙴𝙽𝙴𝙶𝙰𝙳𝙾', '🪷 Solo el propietario de este subbot puede cambiar este modo.'));
    }

    const args = extra?.args || [];
    const arg = String(args[0] || '').toLowerCase();
    if (args.length > 1 || (arg && arg !== 'on' && arg !== 'off')) {
        return msg.reply(deco('𝙼𝙾𝙳𝙾 𝙿𝚁𝙸𝚅𝙰𝙳𝙾', '🪷 Usa *modopri on* o *modopri off*.'));
    }
    const enabled = arg ? arg === 'on' : !isPrivateModeEnabled(sock);
    setPrivateMode(sock, enabled);
    const text = enabled
        ? '🪷 Activado. Solo responderé en grupos; en privado solo atenderé *code*.\n> Para desactivarlo, usa *modopri off* desde un grupo.'
        : '🪷 Desactivado. Vuelvo a responder en privado.';
    return msg.reply(deco('𝙼𝙾𝙳𝙾 𝙿𝚁𝙸𝚅𝙰𝙳𝙾', text));
}
