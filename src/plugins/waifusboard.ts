import { withGacha, getCatalog, valueMap, paginate, pageArg } from '../../lib/gacha.ts';

export const command = ['waifusboard', 'waifustop', 'topwaifus', 'wtop'];
export const category = 'gacha';
export const description = 'Ver el top de personajes con mayor valor.';

export default withGacha(async ({ args, reply }) => {
    const values = valueMap();
    const rows = getCatalog()
        .all.map((c) => ({ name: c.name, value: values.get(c.id) ?? c.value }))
        .sort((a, b) => b.value - a.value);

    const page = paginate(rows, pageArg(args), 10);
    if (!page) return reply('TOP WAIFUS', `Página no válida. Hay un total de *${Math.ceil(rows.length / 10)}* páginas.`);

    const lines = page.items.map((r, i) => `✰ ${(page.page - 1) * 10 + i + 1} » *${r.name}*\n   → Valor: *${r.value.toLocaleString()}*`);
    let body = `Personajes con más valor:\n\n${lines.join('\n')}\n\n⌦ Página *${page.page}* de *${page.totalPages}*`;
    if (page.page < page.totalPages) body += `\n> Para ver la siguiente página › *wtop ${page.page + 1}*`;

    return reply('TOP WAIFUS', body);
});
