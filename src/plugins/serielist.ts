import { withGacha, getCatalog, paginate, pageArg } from '../lib/gacha.ts';

export const command = ['serielist', 'slist', 'animelist'];
export const category = 'gacha';
export const description = 'Listar series del bot.';

export default withGacha(async ({ args, reply }) => {
    const { series } = getCatalog();
    const page = paginate(series, pageArg(args), 20);
    if (!page) return reply('SERIES', `Página no válida. Hay un total de *${Math.ceil(series.length / 20)}* páginas.`);

    const lines = page.items.map((s) => `» *${s.name}* (${s.characters.length})`);
    return reply('SERIES', `Lista de series (${series.length}):\n\n${lines.join('\n')}\n\n> • _Página ${page.page}/${page.totalPages}_`);
});
