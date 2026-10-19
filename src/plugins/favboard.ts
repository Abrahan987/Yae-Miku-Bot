import { withGacha, getCatalog, getFavoriteCounts, paginate, pageArg } from '../lib/gacha.js';

export const command = ['favtop', 'favoritetop', 'favboard'];
export const category = 'gacha';
export const description = 'Ver el top de personajes favoritos.';

export default withGacha(async ({ chatId, args, reply }) => {
    const { byId } = getCatalog();
    const rows = Array.from(getFavoriteCounts(chatId).entries())
        .map(([id, total]) => ({ name: byId.get(id)?.name || `ID:${id}`, total }))
        .sort((a, b) => b.total - a.total);

    if (!rows.length) return reply('TOP FAVORITOS', 'Nadie ha marcado un personaje favorito en este grupo todavía.');

    const page = paginate(rows, pageArg(args), 10);
    if (!page) return reply('TOP FAVORITOS', `Página no válida. Hay un total de *${Math.ceil(rows.length / 10)}* páginas.`);

    const lines = page.items.map((r, i) => `#${(page.page - 1) * 10 + i + 1} » *${r.name}*\n   ♡ ${r.total} favorito${r.total !== 1 ? 's' : ''}.`);
    return reply('TOP FAVORITOS', `Top de personajes favoritos:\n\n${lines.join('\n')}\n\n> Página ${page.page} de ${page.totalPages}`);
});
