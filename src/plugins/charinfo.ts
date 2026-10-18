import { withGacha, y, getCatalog, findCharacter, getClaim, getCharRow, valueMap, displayName, charValue, fmtTime, afterCommand } from '../../lib/gacha.ts';

export const command = ['charinfo', 'winfo', 'waifuinfo'];
export const category = 'gacha';
export const description = 'Ver información de un personaje.';

export default withGacha(async ({ chatId, extra, reply, send }) => {
    const query = afterCommand(extra);
    if (!query) return reply('PERSONAJE', `Por favor, proporciona el nombre de un personaje.\n> Ejemplo » *${extra.command} Yuki Suou*`);

    const char = findCharacter(query);
    if (!char) return reply('PERSONAJE', `No se encontró el personaje *${query}*.`);

    const values = valueMap();
    const sorted = [...getCatalog().all].sort((a, b) => (values.get(b.id) ?? b.value) - (values.get(a.id) ?? a.value));
    const rank = sorted.findIndex((c) => c.id === char.id) + 1;

    const claim = getClaim(chatId, char.id);
    let status = '*Libre*';
    if (claim) {
        status = `Reclamado por *${displayName(claim.userJid)}*`;
        const date = new Date(claim.claimedAt).toLocaleDateString('es-CO', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'America/Bogota'
        });
        status += `\nⴵ Fecha de reclamo » *${date}*`;
    }

    const row = getCharRow(char.id);
    const lastVote = row?.lastVotedAt ? `hace *${fmtTime(Date.now() - row.lastVotedAt)}*` : '*Nunca*';

    return send(
        y('PERSONAJE', `Nombre » *${char.name}*\n⚥ Género » *${char.gender}*\n✰ Valor » *${charValue(char).toLocaleString()}*\n♡ Estado » ${status}\n❖ Fuente » *${char.seriesName}*\n❏ Puesto » *#${rank}*\nⴵ Último voto » ${lastVote}`)
    );
});
