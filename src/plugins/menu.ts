import { pluginData } from '#handler';

export default async function (
    sock: any,
    msg: any
) {
    const categories = new Map<string, Set<string>>();

    for (const plugin of pluginData.values()) {
        const category = plugin.category || 'misc';

        if (!categories.has(category)) {
            categories.set(category, new Set());
        }

        for (const command of plugin.commands) {
            categories.get(category)!.add(command);
        }
    }

    let menu = `ఌ︎ 𝚈𝙰𝙴 𝙼𝙸𝙺𝚄 𝙱𝙾𝚃\n\n`;

    for (const [category, commands] of categories) {
        menu += `𝙲𝙰𝚃𝙴𝙶𝙾𝚁Í𝙰 ── ${category.toUpperCase()}\n`;

        for (const command of commands) {
            menu += `> .${command}\n`;
        }

        menu += '\n';
    }

    menu += `ఌ︎ 𝙵𝙸𝙽`;

    await msg.reply(menu);
}

export const command = [
    'menu',
    'help',
    'allmenu'
];

export const category = 'info';
