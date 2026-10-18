import { withGacha, getCatalog, getFavorite, setFavorite } from '../../lib/gacha.ts';

export const command = ['deletefav', 'delfav'];
export const category = 'gacha';
export const description = 'Borrar tu claim favorito.';

export default withGacha(async ({ chatId, userJid, reply }) => {
    const favorite = getFavorite(chatId, userJid);
    if (!favorite) return reply('FAVORITO', 'No tienes ningún personaje marcado como favorito.');

    const name = getCatalog().byId.get(favorite)?.name || 'personaje desconocido';
    setFavorite(chatId, userJid, '');

    return reply('FAVORITO', `*${name}* ha dejado de ser tu personaje favorito.`);
});
