import { withGacha, getCatalog, getHarem, valueMap, displayName, cd, cdLeft, fmtTime } from '../lib/gacha.ts';

export const command = ['gachainfo', 'ginfo', 'infogacha'];
export const category = 'gacha';
export const description = 'Ver tu información de gacha.';

const timeText = (ms: number) => (ms <= 0 ? 'Ahora' : fmtTime(ms));

export default withGacha(async ({ chatId, userJid, reply }) => {
    const { all, series, byId } = getCatalog();
    const values = valueMap();
    const claims = getHarem(chatId, userJid);
    const totalValue = claims.reduce((sum, c) => sum + (values.get(c.charId) ?? byId.get(c.charId)?.value ?? 0), 0);

    return reply(
        'GACHA',
        `Usuario: *${displayName(userJid)}*\n\nⴵ RollWaifu » *${timeText(cdLeft(userJid, cd.roll(chatId)))}*\nⴵ Claim » *${timeText(cdLeft(userJid, cd.claim(chatId)))}*\nⴵ Vote » *${timeText(cdLeft(userJid, cd.vote))}*\nⴵ Robwaifu » *${timeText(cdLeft(userJid, cd.rob(chatId)))}*\n\n♡ Personajes reclamados » *${claims.length}*\n✰ Valor total » *${totalValue.toLocaleString()}*\n❏ Personajes totales » *${all.length}*\n❏ Series totales » *${series.length}*`
    );
});
