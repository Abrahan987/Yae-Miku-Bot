import { withGacha, findSeries, getChatClaims, valueMap, displayName, paginate } from '../lib/gacha.ts';

export const command = ['serieinfo', 'ainfo', 'animeinfo'];
export const category = 'gacha';
export const description = 'Información de un anime.';

export default withGacha(async ({ chatId, args, extra, reply }) => {
    if (!args.length) return reply('SERIE', `Debes especificar el nombre de un anime.\n> Ejemplo » *${extra.command} Naruto*`);

    let pageNumber = 1;
    let words = args;
    const last = args[args.length - 1];
    if (args.length > 1 && /^\d+$/.test(last)) {
        pageNumber = parseInt(last, 10);
        words = args.slice(0, -1);
    }

    const query = words.join(' ');
    const serie = findSeries(query);
    if (!serie) return reply('SERIE', `No se encontró la serie *${query}*.`);

    const claims = getChatClaims(chatId);
    const values = valueMap();
    const rows = serie.characters
        .map((c) => ({ name: c.name, value: values.get(c.id) ?? c.value, owner: claims.get(c.id) }))
        .sort((a, b) => b.value - a.value);

    const claimed = rows.filter((r) => r.owner).length;
    const page = paginate(rows, pageNumber, 50);
    if (!page) return reply('SERIE', `Página no válida. Hay un total de *${Math.max(1, Math.ceil(rows.length / 50))}* páginas.`);

    let body = `Fuente: *${serie.name}*\n\n❏ Personajes » *${rows.length}*\n♡ Reclamados » *${claimed}/${rows.length} (${rows.length ? Math.round((claimed / rows.length) * 100) : 0}%)*\n❏ Lista de personajes:\n\n`;
    body += page.items
        .map((r) => `» *${r.name}* (${r.value.toLocaleString()}) • ${r.owner ? `Reclamado por *${displayName(r.owner)}*` : 'Libre'}`)
        .join('\n');
    body += `\n\n> ⌦ _Página *${page.page}* de *${page.totalPages}*_`;
    if (page.page < page.totalPages) body += `\n> Usa *${extra.command} ${words.join(' ')} ${page.page + 1}* para ver la siguiente página.`;

    return reply('SERIE', body);
});
