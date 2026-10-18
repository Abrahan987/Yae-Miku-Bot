import { withGacha, y, getCatalog, getClaim, displayName, charValue, getCharImage, registerRoll, cd, cdLeft, cdSet, fmtTime } from '../../lib/gacha.ts';

export const command = ['rollwaifu', 'rw', 'roll'];
export const category = 'gacha';
export const description = 'Waifu o husbando aleatorio.';

const ROLL_COOLDOWN = 15 * 60 * 1000;
const locks = new Map<string, number>();

export default withGacha(async ({ sock, raw, chatId, userJid, reply }) => {
    const now = Date.now();
    const lock = locks.get(userJid);
    if (lock && now - lock < 15000) return;

    const left = cdLeft(userJid, cd.roll(chatId));
    if (left > 0) return reply('ROLL', `Debes esperar *${fmtTime(left)}* para usar *rw* de nuevo.`);

    locks.set(userJid, now);

    try {
        const { all } = getCatalog();
        if (!all.length) return reply('ROLL', 'El catálogo de personajes está vacío.');

        let char = all[Math.floor(Math.random() * all.length)];
        let image = await getCharImage(char.tags[0] || '');

        if (!image) {
            char = all[Math.floor(Math.random() * all.length)];
            image = await getCharImage(char.tags[0] || '');
        }

        if (!image) return reply('ROLL', `No se encontraron imágenes para *${char.name}*. Inténtalo de nuevo.`);

        const claim = getClaim(chatId, char.id);
        const status = claim ? `Reclamado por *${displayName(claim.userJid)}*` : 'Libre';
        const caption = y(
            'ROLL',
            `Nombre » *${char.name}*\n⚥ Género » *${char.gender}*\n✰ Valor » *${charValue(char).toLocaleString()}*\n♡ Estado » ${status}\n❖ Fuente » *${char.seriesName}*`
        );

        const sent = await sock.sendMessage(chatId, { image, caption }, { quoted: raw });

        if (sent?.key?.id) {
            registerRoll(chatId, sent.key.id, {
                charId: char.id,
                rollerJid: userJid,
                createdAt: now,
                reservedUntil: now + 20000,
                expiresAt: now + 60000,
                claimed: false
            });
        }

        cdSet(userJid, cd.roll(chatId), ROLL_COOLDOWN);
    } finally {
        locks.delete(userJid);
    }
});
