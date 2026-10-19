import { withGacha, getCatalog, getSales, removeSale, afterCommand } from '../lib/gacha.ts';

export const command = ['removesale', 'removerventa'];
export const category = 'gacha';
export const description = 'Eliminar un personaje en venta.';

export default withGacha(async ({ chatId, userJid, extra, reply }) => {
    const query = afterCommand(extra).toLowerCase();
    if (!query) return reply('VENTA', `Debes especificar un personaje para eliminar.\n> Ejemplo » *${extra.command} Yuki Suou*`);

    const { byId } = getCatalog();
    const found = getSales(chatId).find((s) => s.sellerJid === userJid && byId.get(s.charId)?.name.toLowerCase() === query);
    if (!found) return reply('VENTA', `El personaje *${query}* no está a la venta por ti.`);

    removeSale(chatId, found.charId);
    return reply('VENTA', `*${byId.get(found.charId)!.name}* ha sido eliminado de la lista de ventas.`);
});
