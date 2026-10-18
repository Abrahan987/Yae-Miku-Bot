import { withGacha, getCatalog, getHarem, getFavorite, transferClaim, displayName, resolveTarget, lastSeenAt, cd, cdLeft, cdSet, fmtTime } from '../../lib/gacha.ts';

export const command = ['robwaifu', 'robarwaifu'];
export const category = 'gacha';
export const description = 'Robar un personaje a otro usuario.';

const ROB_COOLDOWN = 3 * 60 * 60 * 1000;
const VICTIM_COOLDOWN = 24 * 60 * 60 * 1000;
const INACTIVE_TIME = 60 * 60 * 1000;
const SUCCESS_CHANCE = 0.4;

export default withGacha(async ({ sock, msg, chatId, userJid, extra, reply, send }) => {
    const left = cdLeft(userJid, cd.rob(chatId));
    if (left > 0) return reply('ROBO', `Debes esperar *${fmtTime(left)}* para usar *${extra.command}* de nuevo.`);

    const target = resolveTarget(sock, msg);
    if (!target) return reply('ROBO', 'Por favor, cita o menciona al usuario a quien quieras robarle una waifu.');
    if (target === userJid) return reply('ROBO', `No puedes robarte a ti mismo, *${displayName(userJid)}*.`);

    const targetName = displayName(target);
    const seen = lastSeenAt(chatId, target);

    if (seen && Date.now() - seen < INACTIVE_TIME) {
        return reply('ROBO', `*${targetName}* estuvo activo recientemente. Solo puedes robarle waifus si ha estado inactivo más de 1 hora.`);
    }

    const victimClaims = getHarem(chatId, target);
    if (!victimClaims.length) return reply('ROBO', `*${targetName}* no tiene waifus que puedas robar.`);

    if (cdLeft(userJid, cd.robVictim(chatId, target)) > 0) {
        return reply('ROBO', `Ya robaste a *${targetName}* hoy. Solo puedes robarle a alguien una vez cada 24 horas.`);
    }

    cdSet(userJid, cd.rob(chatId), ROB_COOLDOWN);

    if (Math.random() >= SUCCESS_CHANCE) {
        return reply('ROBO', `El intento de robo ha fallado. *${targetName}* defendió a su waifu heroicamente.`);
    }

    cdSet(userJid, cd.robVictim(chatId, target), VICTIM_COOLDOWN);

    const favorite = getFavorite(chatId, target);
    const stealable = victimClaims.filter((c) => c.charId !== favorite);
    if (!stealable.length) return reply('ROBO', `*${targetName}* solo tiene a su favorito protegido, no puedes robarlo.`);

    const stolen = stealable[Math.floor(Math.random() * stealable.length)];
    transferClaim(chatId, stolen.charId, userJid);

    const name = getCatalog().byId.get(stolen.charId)?.name || `ID:${stolen.charId}`;
    return send(`❀ *${displayName(userJid)}* ha robado a *${name}* del harem de *${targetName}*.`, [target]);
});
