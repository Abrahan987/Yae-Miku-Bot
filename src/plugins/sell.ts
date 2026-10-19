import { withGacha, findInHarem, putSale, displayName } from '../lib/gacha.ts';

export const command = ['sell', 'vender'];
export const category = 'gacha';
export const description = 'Poner un personaje a la venta.';

export default withGacha(async ({ chatId, userJid, args, extra, reply }) => {
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
