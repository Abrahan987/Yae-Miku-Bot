import { withGacha, findInHarem, putSale, displayName } from '../lib/gacha.ts';
import { deco, warn } from '../lib/perms.ts';
import { isMainPrivateModeOwner, setPrivateMode } from '../lib/private_mode.ts';

export const command = ['sell', 'vender'];
export const category = 'gacha';
export const description = 'Poner un personaje a la venta.';
export const menu = [
    { command: ['sell', 'vender'], description: 'Poner un personaje a la venta.' },
    { command: ['sell on', 'sell off'], description: 'Restringir privados del bot principal (owner).' }
];

const sellCharacter = withGacha(async ({ chatId, userJid, args, extra, reply }) => {
    if (args.length < 2) {
        return reply('VENTA', `Debes especificar un precio y el personaje que quieres vender.\n> Ejemplo » *${extra.command} 5000 Yuki Suou*`);
    }

    const price = parseInt(args[0].replace(/[,._]/g, ''), 10);
    if (isNaN(price) || price < 2000) return reply('VENTA', 'El precio mínimo para vender un personaje es de *¥2,000*.');
    if (price > 100_000_000) return reply('VENTA', 'El precio máximo permitido para vender un personaje es de *¥100,000,000*.');

    const name = args.slice(1).join(' ');
    const char = findInHarem(chatId, userJid, name, true);
    if (!char) return reply('VENTA', `No se ha encontrado al personaje *${name}* reclamado por ti.`);

    putSale(chatId, char.id, userJid, price);

    return reply(
        'VENTA',
        `*${char.name}* ha sido puesto a la venta.\n❀ Vendedor » *${displayName(userJid)}*\n⛁ Valor » *¥${price.toLocaleString()}*\nⴵ Expira en » *3 días*\n> Puedes ver los personajes en venta usando *wshop*`
    );
});

export default async function (sock: any, msg: any, extra: any, db: any, rawMsg: any) {
    const args = extra?.args || [];
    const value = String(args[0] || '').toLowerCase();
    if (extra?.command === 'sell' && args.length === 1 && (value === 'on' || value === 'off')) {
        if (!isMainPrivateModeOwner(sock, msg, rawMsg)) {
            return msg.reply(warn.owner());
        }
        const enabled = value === 'on';
        setPrivateMode(sock, enabled);
        const text = enabled
            ? '🪷 Activado. Solo responderé en grupos; en privado solo atenderé *code*.\n> Para desactivarlo, usa *sell off* desde un grupo.'
            : '🪷 Desactivado. Vuelvo a responder en privado.';
        return msg.reply(deco('𝙼𝙾𝙳𝙾 𝙿𝚁𝙸𝚅𝙰𝙳𝙾', text));
    }
    return sellCharacter(sock, msg, extra, db, rawMsg);
}
