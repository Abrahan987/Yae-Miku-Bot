export const command = ['menu', 'help', 'comandos'];
export const category = 'info';
export const description = 'Muestra el menú principal con todos los comandos.';

export default async function (sock, msg, extra) {
    const pluginData = extra.pluginData;

    const categoryConfig = [
        {
            key: 'info',
            title: 'INFO',
            emoji: '🪷',
            aliases: ['info', 'informacion', 'main', 'principal']
        },
        {
            key: 'descargas',
            title: 'DESCARGAS',
            emoji: '🍥',
            aliases: ['descargas', 'descarga', 'download', 'downloads']
        },
        {
            key: 'grupos',
            title: 'GRUPOS',
            emoji: '🍓',
            aliases: ['grupos', 'grupo', 'group', 'groups']
        },
        {
            key: 'herramientas',
            title: 'HERRAMIENTAS',
            emoji: '🧰',
            aliases: ['herramientas', 'tools', 'utilidades']
        }
    ];

    const groupedCategories = new Map();

    for (const [, data] of pluginData.entries()) {
        const rawCat = (data.category || 'misc').toLowerCase().trim();

        const matchedConfig = categoryConfig.find(c => c.aliases.includes(rawCat));
        const finalKey = matchedConfig ? matchedConfig.key : rawCat;

        if (!groupedCategories.has(finalKey)) {
            groupedCategories.set(finalKey, []);
        }

        const catList = groupedCategories.get(finalKey);

        const existing = catList.find(item =>
            item.commands.some(c => data.commands.includes(c))
        );

        if (!existing) {
            catList.push({
                commands: data.commands,
                description: data.description || 'Sin descripción'
            });
        }
    }

    const renderCategoryBlock = (title, emoji, items) => {
        const lines = [];

        for (const item of items) {
            const limitedCmds = item.commands.slice(0, 2);
            const cmdsFormatted = limitedCmds.map(c => `.${c}`).join(' • ');

            lines.push(`> *${cmdsFormatted}*`);
            lines.push(`> ${item.description}`);
        }

        return `${emoji}͜ᩧ𑂳ᰍ  *${title.toUpperCase()}*\n${lines.join('\n')}`;
    };

    const blocks = [];
    const processedKeys = new Set();

    for (const conf of categoryConfig) {
        const items = groupedCategories.get(conf.key);
        if (items && items.length > 0) {
            blocks.push(renderCategoryBlock(conf.title, conf.emoji, items));
            processedKeys.add(conf.key);
        }
    }

    for (const [catKey, items] of groupedCategories.entries()) {
        if (!processedKeys.has(catKey) && items.length > 0) {
            const dynamicTitle = catKey.toUpperCase();
            blocks.push(renderCategoryBlock(dynamicTitle, '🌸', items));
        }
    }

    const categoriesContent = blocks.join('\n\n');
    const botName = global.namebot || 'YAE MIKU BOT';

    const menuText = `ᅟㅤ 𓈒    |꛱ ᷼ |꛱ ᷼ |ㅤֵㅤ  ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒

𖫨𖫨🪷⃨᪲  ${botName.toUpperCase()}˙ᰨᰍ
𐴲੭  ˙ 𓂃  🍥  𓂃  ˙

🍓͜ᩧ𑂳ᰍ  𝗛𝗼𝗹𝗮, 𝗯𝗶𝗲𝗻𝘃𝗲𝗻𝗶𝗱𝗼 𝗮𝗹
𝗺𝗲𝗻𝘂́ 𝗽𝗿𝗶𝗻𝗰𝗶𝗽𝗮𝗹 𝗱𝗲𝗹 𝗯𝗼𝘁.

${categoriesContent}

𐴲੭  ˙ 𓂃  🍥  𓂃  ˙

ᅟㅤ 𓈒    |꛱ ᷼ |꛱ ᷼ |ㅤֵㅤ  ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒`;

    if (global.icono) {
        await sock.sendMessage(
            msg.from,
            {
                image: { url: global.icono },
                caption: menuText
            },
            { quoted: msg }
        );
    } else {
        await msg.reply(menuText);
    }
}
