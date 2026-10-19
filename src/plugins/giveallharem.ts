import { withGacha, y, getCatalog, getHarem, valueMap, displayName, resolveTarget, pendingGiveAll } from '../lib/gacha.js';

export const command = ['giveallharem'];
export const category = 'gacha';
export const description = 'Regalar todos tus personajes a otro usuario.';

export default withGacha(async ({ sock, msg, chatId, userJid, reply, send }) => {
    const target = resolveTarget(sock, msg);
    if (!target) return reply('REGALO', 'Debes mencionar a quien quieras regalarle tus personajes.');
    if (target === userJid) return reply('REGALO', 'No puedes regalarte personajes a ti mismo.');

    const claims = getHarem(chatId, userJid);
    if (!claims.length) return reply('REGALO', 'No tienes personajes para regalar.');

    const { byId } = getCatalog();
    const values = valueMap();
    const total = claims.reduce((sum, c) => sum + (values.get(c.charId) ?? byId.get(c.charId)?.value ?? 0), 0);

    pendingGiveAll.set(`${chatId}:${userJid}`, { from: userJid, to: target, ids: claims.map((c) => c.charId), expiresAt: Date.now() + 60000 });

    return send(
        y('REGALO', `*${displayName(userJid)}*, ¿confirmas regalar todo tu harem a *${displayName(target)}*?\n\n❏ Personajes a transferir: *${claims.length}*\n❏ Valor total: *${total.toLocaleString()}*\n\n✐ Para confirmar responde con *aceptar*.\n> Esta acción no se puede deshacer.`),
        [target]
    );
});
