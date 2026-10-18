import { withGacha, findInHarem, transferClaim, displayName, resolveTarget, stripMentions, afterCommand } from '../../lib/gacha.ts';

export const command = ['givechar', 'givewaifu'];
export const category = 'gacha';
export const description = 'Regalar un personaje a otro usuario.';

export default withGacha(async ({ sock, msg, chatId, userJid, extra, reply, send }) => {
    const target = resolveTarget(sock, msg);
    if (!target) return reply('REGALO', 'Debes mencionar o citar el mensaje del destinatario.');
    if (target === userJid) return reply('REGALO', 'No puedes regalarte personajes a ti mismo.');

    const name = stripMentions(afterCommand(extra));
    if (!name) return reply('REGALO', `Debes escribir el nombre del personaje y citar o mencionar al usuario que lo recibirá.\n> Ejemplo » *${extra.command} Yuki Suou @usuario*`);

    const char = findInHarem(chatId, userJid, name, true);
    if (!char) return reply('REGALO', `*${name}* no está reclamado por ti.`);

    transferClaim(chatId, char.id, target);

    return send(`❀ *${char.name}* ha sido regalado a *${displayName(target)}* por *${displayName(userJid)}*.`, [target]);
});
