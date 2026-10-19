import { withGacha, y, getCatalog, getHarem, valueMap, displayName, resolveTarget, paginate, pageArg } from '../lib/gacha.ts';

export const command = ['harem', 'waifus', 'claims'];
export const category = 'gacha';
export const description = 'Ver tus personajes reclamados.';

export default withGacha(async ({ sock, msg, chatId, userJid, args, extra, reply, send }) => {
    const target = resolveTarget(sock, msg) || userJid;
    const name = displayName(target);
    const claims = getHarem(chatId, target);

    if (!claims.length) {
        const text = target === userJid ? 'No tienes personajes reclamados.' : `*${name}* no tiene personajes reclamados.`;
        return send(y('HAREM', text), [target]);
    }

    const { byId } = getCatalog();
    const values = valueMap();
    const rows = claims
        .map((c) => {
            const char = byId.get(c.charId);
            return { name: char?.name || `ID:${c.charId}`, value: values.get(c.charId) ?? char?.value ?? 0 };
        })
        .sort((a, b) => b.value - a.value);

    const page = paginate(rows, pageArg(args), 50);
    if (!page) return reply('HAREM', `Página no válida. Hay un total de *${Math.max(1, Math.ceil(rows.length / 50))}* páginas.`);

    let body = `Usuario: *${name}*\n♡ Personajes: *(${rows.length})*\n\n`;
    body += page.items.map((r) => `» *${r.name}* (*${r.value.toLocaleString()}*)`).join('\n');
    body += `\n\n⌦ _Página *${page.page}* de *${page.totalPages}*_`;
    if (page.page < page.totalPages) body += `\n> Usa *${extra.command} ${page.page + 1}* para ver la siguiente página.`;

    return send(y('HAREM', body), [target]);
});
