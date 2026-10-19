import { withGacha, getHarem, findInHarem, removeClaim, afterCommand } from '../lib/gacha.js';

export const command = ['delchar', 'deletewaifu', 'delwaifu'];
export const category = 'gacha';
export const description = 'Eliminar un personaje reclamado.';

export default withGacha(async ({ chatId, userJid, extra, reply }) => {
    if (!getHarem(chatId, userJid).length) return reply('HAREM', 'No tienes personajes reclamados en tu harem.');

    const query = afterCommand(extra);
    if (!query) return reply('HAREM', `Debes especificar un personaje para eliminar.\n> Ejemplo » *${extra.command} Yuki Suou*`);

    const char = findInHarem(chatId, userJid, query, true);
    if (!char) return reply('HAREM', `No se ha encontrado ningún personaje reclamado por ti con el nombre *${query}*.`);

    removeClaim(chatId, char.id);
    return reply('HAREM', `*${char.name}* ha sido eliminado de tu lista de reclamados.`);
});
