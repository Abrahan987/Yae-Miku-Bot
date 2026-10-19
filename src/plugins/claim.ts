import { withGacha, getCatalog, getClaim, setClaim, getRoll, getClaimMessage, displayName, cd, cdLeft, cdSet, fmtTime } from '../lib/gacha.js';

export const command = ['claim', 'c', 'reclamar'];
export const category = 'gacha';
export const description = 'Reclamar un personaje.';

const CLAIM_COOLDOWN = 30 * 60 * 1000;

export default withGacha(async ({ msg, chatId, userJid, extra, reply, send }) => {
    const left = cdLeft(userJid, cd.claim(chatId));
    if (left > 0) return reply('CLAIM', `Debes esperar *${fmtTime(left)}* para usar *${extra.command}* de nuevo.`);

    const quotedId = msg.quoted?.key?.id;
    const roll = quotedId ? getRoll(chatId, quotedId) : undefined;
    if (!roll) return reply('CLAIM', 'Debes citar un personaje válido para reclamar.');

    const char = getCatalog().byId.get(roll.charId);
    if (!char) return reply('CLAIM', 'Personaje no encontrado en characters.json.');

    const now = Date.now();

    const owner = getClaim(chatId, char.id);
    if (owner || roll.claimed) {
        return reply('CLAIM', `El personaje *${char.name}* ya ha sido reclamado por *${displayName(owner?.userJid || roll.rollerJid)}*.`);
    }

    if (roll.rollerJid !== userJid && now < roll.reservedUntil) {
        const seconds = ((roll.reservedUntil - now) / 1000).toFixed(1);
        return reply('CLAIM', `Este personaje está protegido por *${displayName(roll.rollerJid)}* durante *${seconds}s*.`);
    }

    if (now > roll.expiresAt) {
        const seconds = ((now - roll.expiresAt) / 1000).toFixed(1);
        return reply('CLAIM', `El personaje ha expirado » ${seconds}s.`);
    }

    setClaim(chatId, char.id, userJid);
    roll.claimed = true;
    cdSet(userJid, cd.claim(chatId), CLAIM_COOLDOWN);

    const name = displayName(userJid);
    const custom = getClaimMessage(userJid);
    const text = custom
        ? custom.replace(/€user/g, `*${name}*`).replace(/€character/g, `*${char.name}*`)
        : `*${char.name}* ha sido reclamado por *${name}*`;

    const seconds = ((now - roll.createdAt) / 1000).toFixed(1);
    return send(`❀ ${text} (${seconds}s)`);
});
