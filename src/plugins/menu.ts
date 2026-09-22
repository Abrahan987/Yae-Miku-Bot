export const command = ['menu', 'help', 'comandos'];
export const category = 'info';
export const description = 'Muestra el menú principal con todos los comandos.';

export default async function (sock: any, msg: any, extra: any, db: any) {
    const userData = db.getUser();
    const userName = userData?.name || 'Usuario';
    const pluginData = extra.pluginData;

    const categoryConfig = [
        {
            key: 'info',
            title: 'INFORMACIÓN',
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
            emoji: '🪷',
            aliases: ['herramientas', 'tools', 'utilidades']
        }
    ];

    const groupedCategories = new Map<string, Array<{ commands: string[]; description: string }>>();

    for (const [, data] of pluginData.entries()) {
        const rawCat = (data.category || 'misc').toLowerCase().trim();

        const matchedConfig = categoryConfig.find(c => c.aliases.includes(rawCat));
        const finalKey = matchedConfig ? matchedConfig.key : rawCat;

        if (!groupedCategories.has(finalKey)) {
            groupedCategories.set(finalKey, []);
        }

        const catList = groupedCategories.get(finalKey)!;

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

    const renderCategoryBlock = (title: string, emoji: string, items: Array<{ commands: string[]; description: string }>) => {
        const lines: string[] = [];

        for (let i = 0; i < items.length; i += 2) {
            const pair = items.slice(i, i + 2);

            const cmdsFormatted = pair.map(item => {
                return item.commands.map(c => `.${c}`).join(' • ');
            }).join(' • ');

            lines.push(`> *${cmdsFormatted}*`);

            const descText = pair.map(item => item.description).join(' / ');
            lines.push(`> ${descText}`);
        }

        return `${emoji}͜ᩧ𑂳ᰍ  *${title.toUpperCase()}*\n${lines.join('\n')}`;
    };

    const blocks: string[] = [];
    const processedKeys = new Set<string>();

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

🍓͜ᩧ𑂳ᰍ  𝗛𝗼𝗹𝗮 ${userName}, 𝗯𝗶𝗲𝗻𝘃𝗲𝗻𝗶𝗱𝗼 𝗮𝗹
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
    const gruposBlock = formatCategory('grupos', '🍓');
    const herramientasBlock = formatCategory('herramientas', '🪷');

    const knownCategories = ['info', 'descargas', 'grupos', 'herramientas', 'misc'];
    let extraCategoriesBlock = '';

    for (const [cat, cmds] of categoriesMap.entries()) {
        if (!knownCategories.includes(cat) && cmds.length > 0) {
            const formattedCmds = cmds.map(c => `.${c}`).join(', ');
            extraCategoriesBlock += `\n\n🌸͜ᩧ𑂳ᰍ  *${cat.toUpperCase()}*\n> ${formattedCmds}`;
        }
    }

    const miscBlock = categoriesMap.has('misc') && categoriesMap.get('misc')!.length > 0
        ? `\n\n${formatCategory('misc', '🍥')}`
        : '';

    const botName = global.namebot || 'YAE MIKU BOT';

    const menuText = `ᅟㅤ 𓈒    |꛱ ᷼ |꛱ ᷼ |ㅤֵㅤ  ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒

𖫨𖫨🪷⃨᪲  ${botName.toUpperCase()}˙ᰨᰍ
𐴲੭  ˙ 𓂃  🍥  𓂃  ˙

🍓͜ᩧ𑂳ᰍ  𝗛𝗼𝗹𝗮 ${userName}, 𝗯𝗶𝗲𝗻𝘃𝗲𝗻𝗶𝗱𝗼 𝗮𝗹
𝗺𝗲𝗻𝘂́ 𝗽𝗿𝗶𝗻𝗰𝗶𝗽𝗮𝗹 𝗱𝗲𝗹 𝗯𝗼𝘁.

${infoBlock}

${descargasBlock}

${gruposBlock}

${herramientasBlock}${miscBlock}${extraCategoriesBlock}

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
