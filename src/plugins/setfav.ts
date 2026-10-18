import { withGacha, getCatalog, getFavorite, setFavorite, findInHarem, afterCommand } from '../../lib/gacha.ts';

export const command = ['setfav', 'setfavourite'];
export const category = 'gacha';
export const description = 'Establecer tu claim favorito.';

export default withGacha(async ({ chatId, userJid, extra, reply }) => {
    const query = afterCommand(extra);
    if (!query) return reply('FAVORITO', `Debes especificar un personaje.\n> Ejemplo » *${extra.command} Yuki Suou*`);

    const char = findInHarem(chatId, userJid, query);
    if (!char) return reply('FAVORITO', `No se encontró un personaje reclamado por ti que coincida con *${query}*.`);

    const previous = getFavorite(chatId, userJid);
    setFavorite(chatId, userJid, char.id);

    if (previous && previous !== char.id) {
        const previousName = getCatalog().byId.get(previous)?.name || 'personaje anterior';
        return reply('FAVORITO', `Se ha reemplazado tu favorito *${previousName}* por *${char.name}*.`);
    }

    return reply('FAVORITO', `Ahora *${char.name}* es tu personaje favorito.`);
});
