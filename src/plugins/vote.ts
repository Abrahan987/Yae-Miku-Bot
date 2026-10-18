import { withGacha, findCharacter, getCharRow, saveCharRow, cd, cdLeft, cdSet, fmtTime, afterCommand } from '../../lib/gacha.ts';

export const command = ['vote', 'votar'];
export const category = 'gacha';
export const description = 'Votar por un personaje para subir su valor.';

const USER_COOLDOWN = 60 * 60 * 1000;
const CHAR_COOLDOWN = 60 * 60 * 1000;
const DAILY_LIMIT = 900;

export default withGacha(async ({ userJid, extra, reply }) => {
    const left = cdLeft(userJid, cd.vote);
    if (left > 0) return reply('VOTO', `Debes esperar *${fmtTime(left)}* para usar *${extra.command}* de nuevo.`);

    const query = afterCommand(extra);
    if (!query) return reply('VOTO', 'Debes especificar un personaje para votarlo.');

    const char = findCharacter(query);
    if (!char) return reply('VOTO', 'Personaje no encontrado. Asegúrate de que el nombre esté correcto.');

    const now = Date.now();
    const today = new Date().toISOString().slice(0, 10);
    const row = getCharRow(char.id) || { charId: char.id, value: char.value, votes: 0, lastVotedAt: 0, dayKey: '', dayInc: 0 };

    if (row.lastVotedAt && now < row.lastVotedAt + CHAR_COOLDOWN) {
        const remaining = row.lastVotedAt + CHAR_COOLDOWN - now;
        return reply('VOTO', `*${char.name}* ha sido votada recientemente.\n> Debes esperar *${fmtTime(remaining)}* para votarla de nuevo.`);
    }

    const dayInc = row.dayKey === today ? row.dayInc : 0;
    if (dayInc >= DAILY_LIMIT) return reply('VOTO', `El personaje *${char.name}* ya alcanzó el límite de valor que puede subir hoy.`);

    const increment = Math.min(DAILY_LIMIT - dayInc, Math.floor(Math.random() * 201) + 50);

    saveCharRow({
        charId: char.id,
        value: row.value + increment,
        votes: row.votes + 1,
        lastVotedAt: now,
        dayKey: today,
        dayInc: dayInc + increment
    });

    cdSet(userJid, cd.vote, USER_COOLDOWN);

    return reply('VOTO', `Votaste por *${char.name}* (*${char.seriesName}*)\n> Su nuevo valor es *${(row.value + increment).toLocaleString()}*`);
});
