import { withGacha, getCatalog, getSales, getClaim, removeSale, transferClaim, transaction, getYen, addYen, displayName, afterCommand } from '../../lib/gacha.ts';

export const command = ['buyc', 'buycharacter', 'buychar'];
export const category = 'gacha';
export const description = 'Comprar un personaje en venta.';

export default withGacha(async ({ chatId, userJid, extra, reply }) => {
    const query = afterCommand(extra).toLowerCase();
    if (!query) return reply('COMPRA', `Debes especificar un personaje para comprar.\n> Ejemplo » *${extra.command} Yuki Suou*`);

    const { byId } = getCatalog();
    const entries = getSales(chatId)
        .map((sale) => ({ sale, char: byId.get(sale.charId) }))
        .filter((e) => e.char);

    const found =
        entries.find((e) => e.char!.name.toLowerCase() === query) ||
        entries.find((e) => e.char!.name.toLowerCase().includes(query));

    if (!found) return reply('COMPRA', `No se ha encontrado al personaje *${query}* en venta.`);

    const { sale, char } = found;
    if (sale.sellerJid === userJid) return reply('COMPRA', 'No puedes comprar tu propio personaje.');

    const claim = getClaim(chatId, sale.charId);
    if (!claim || claim.userJid !== sale.sellerJid) {
        removeSale(chatId, sale.charId);
        return reply('COMPRA', `*${char!.name}* ya no está disponible.`);
    }

    if (getYen(userJid) < sale.price) {
        return reply('COMPRA', `No tienes suficientes yenes para comprar a *${char!.name}*.\n> Necesitas *¥${sale.price.toLocaleString()}*`);
    }

    transaction(() => {
        addYen(userJid, -sale.price);
        addYen(sale.sellerJid, sale.price);
        transferClaim(chatId, sale.charId, userJid);
    });

    return reply(
        'COMPRA',
        `*${char!.name}* ha sido comprado por *${displayName(userJid)}*.\n> Se han transferido *¥${sale.price.toLocaleString()}* a *${displayName(sale.sellerJid)}*`
    );
});
