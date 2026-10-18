import { withGacha, y, findCharacter, getCharImage, afterCommand } from '../../lib/gacha.ts';

export const command = ['charimage', 'waifuimage', 'cimage', 'wimage'];
export const category = 'gacha';
export const description = 'Ver una imagen aleatoria de un personaje.';

export default withGacha(async ({ sock, raw, chatId, extra, reply }) => {
    const query = afterCommand(extra);
    if (!query) return reply('IMAGEN', `Por favor, proporciona el nombre de un personaje.\n> Ejemplo » *${extra.command} Yuki Suou*`);

    const char = findCharacter(query);
    if (!char) return reply('IMAGEN', `No se encontró el personaje *${query}*.`);

    const tag = char.tags[0];
    if (!tag) return reply('IMAGEN', `El personaje *${char.name}* no tiene un tag válido para buscar imágenes.`);

    const image = await getCharImage(tag);
    if (!image) return reply('IMAGEN', `No se encontraron imágenes para *${char.name}*.`);

    const caption = y('IMAGEN', `Nombre » *${char.name}*\n⚥ Género » *${char.gender}*\n❖ Fuente » *${char.seriesName}*`);
    return sock.sendMessage(chatId, { image, caption }, { quoted: raw });
});
