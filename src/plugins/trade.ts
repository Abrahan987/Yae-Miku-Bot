import { withGacha, y, findCharacter, findInHarem, getClaim, displayName, charValue, pendingTrades, afterCommand } from '../lib/gacha.ts';

export const command = ['trade', 'intercambiar'];
export const category = 'gacha';
export const description = 'Intercambiar un personaje con otro usuario.';

export default withGacha(async ({ chatId, userJid, extra, reply, send }) => {
    const raw = afterCommand(extra);
    if (!raw.includes('/')) {
        return reply('INTERCAMBIO', `Debes especificar dos personajes para intercambiarlos.\n> Ejemplo » *${extra.command} Personaje1 / Personaje2*`);
    }

    const [nameA, nameB] = raw.split('/').map((s) => s.trim());
    if (!nameA || !nameB) return reply('INTERCAMBIO', 'Debes escribir el nombre de los dos personajes.');

    const give = findInHarem(chatId, userJid, nameA, true);
    if (!give) return reply('INTERCAMBIO', `*${nameA}* no está reclamado por ti.`);

    const get = findCharacter(nameB);
    if (!get) return reply('INTERCAMBIO', `No se ha encontrado al personaje *${nameB}*.`);

    const claim = getClaim(chatId, get.id);
    if (!claim) return reply('INTERCAMBIO', `El personaje *${get.name}* no está reclamado por nadie.`);
    if (claim.userJid === userJid) return reply('INTERCAMBIO', `El personaje *${get.name}* ya está reclamado por ti.`);

    const receiver = claim.userJid;
    pendingTrades.set(`${chatId}:${receiver}`, { from: userJid, to: receiver, give: give.id, get: get.id, expiresAt: Date.now() + 60000 });

    return send(
        y('INTERCAMBIO', `*${displayName(receiver)}*, *${displayName(userJid)}* te ha enviado una solicitud de intercambio.\n\n✦ [${displayName(receiver)}] *${get.name}* (${charValue(get).toLocaleString()})\n✦ [${displayName(userJid)}] *${give.name}* (${charValue(give).toLocaleString()})\n\n✐ Para aceptar responde con *aceptar*. La solicitud expira en 60 segundos.`),
        [userJid, receiver]
    );
});
