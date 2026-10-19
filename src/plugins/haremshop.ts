import { withGacha, getCatalog, getSales, valueMap, displayName, charValue, paginate, pageArg, fmtTime, SALE_TTL } from '../lib/gacha.js';

export const command = ['wshop', 'haremshop', 'tiendawaifus'];
export const category = 'gacha';
export const description = 'Ver los personajes en venta.';

export default withGacha(async ({ chatId, args, extra, reply }) => {
    const { byId } = getCatalog();
    const sales = getSales(chatId).filter((s) => byId.has(s.charId));

    if (!sales.length) return reply('HAREMSHOP', `No hay personajes en venta en *${extra.groupMetadata?.subject || 'este grupo'}*.`);

    const page = paginate(sales, pageArg(args), 10);
    if (!page) return reply('HAREMSHOP', `Página inválida. Solo hay *${Math.ceil(sales.length / 10)}* disponible(s).`);

    const values = valueMap();
    const now = Date.now();

    const lines = page.items.map((sale) => {
        const char = byId.get(sale.charId)!;
        const value = values.get(char.id) ?? char.value;
        return `❀ *${char.name}* (✰ ${value.toLocaleString()}):\n⛁ Precio » *¥${sale.price.toLocaleString()}*\n❖ Vendedor » *${displayName(sale.sellerJid)}*\nⴵ Expira en » *${fmtTime(sale.createdAt + SALE_TTL - now)}*`;
    });

    return reply('HAREMSHOP', `Personajes en venta <${sales.length}>:\n\n${lines.join('\n\n')}\n\n> • Página *${page.page}* de *${page.totalPages}*`);
});
