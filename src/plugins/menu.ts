import axios from 'axios';

export const command = ['menu', 'help', 'comandos'];
export const category = 'info';
export const description = 'Muestra el menú principal con todos los comandos.';

export default async function (sock: any, msg: any, extra: any, db: any) {
    const pluginData = extra.pluginData;
    const destination = global.rcanal || msg.from;

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

        const matchedConfig = categoryConfig.find(c =>
            c.aliases.includes(rawCat)
        );

        const finalKey = matchedConfig ? matchedConfig.key : rawCat;

        if (!groupedCategories.has(finalKey)) {
            groupedCategories.set(finalKey, []);
        }

        const catList = groupedCategories.get(finalKey);

        const existing = catList.find((item: any) =>
            item.commands.some((c: string) =>
                data.commands.includes(c)
            )
        );

        if (!existing) {
            catList.push({
                commands: data.commands,
                description: data.description || 'Sin descripción'
            });
        }
    }

    const renderCategoryBlock = (
        title: string,
        emoji: string,
        items: any[]
    ) => {
        const lines: string[] = [];

        for (const item of items) {
            const limitedCmds = item.commands.slice(0, 2);
            const cmdsFormatted = limitedCmds
                .map((c: string) => `.${c}`)
                .join(' • ');

            lines.push(`> *${cmdsFormatted}*`);
            lines.push(`> ${item.description}`);
        }

        return `${emoji}͜ᩧ𑂳ᰍ  *${title.toUpperCase()}*\n${lines.join('\n')}`;
    };

    const blocks: string[] = [];
    const processedKeys = new Set<string>();

    for (const conf of categoryConfig) {
        const items = groupedCategories.get(conf.key);

        if (items && items.length > 0) {
            blocks.push(
                renderCategoryBlock(
                    conf.title,
                    conf.emoji,
                    items
                )
            );

            processedKeys.add(conf.key);
        }
    }

    for (const [catKey, items] of groupedCategories.entries()) {
        if (!processedKeys.has(catKey) && items.length > 0) {
            blocks.push(
                renderCategoryBlock(
                    catKey.toUpperCase(),
                    '🌸',
                    items
                )
            );
        }
    }

    const categoriesContent = blocks.join('\n\n');

    const menuText =
`ᅟㅤ 𓈒    |꛱ ᷼ |꛱ ᷼ |ㅤֵㅤ  ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒

${global.namebot}
${global.nmcreador}

𐴲੭  ˙ 𓂃  🍥  𓂃  ˙

🍓͜ᩧ𑂳ᰍ  𝗛𝗼𝗹𝗮, 𝗯𝗶𝗲𝗻𝘃𝗲𝗻𝗶𝗱𝗼 𝗮𝗹
𝗺𝗲𝗻𝘂́ 𝗽𝗿𝗶𝗻𝗰𝗶𝗽𝗮𝗹 𝗱𝗲𝗹 𝗯𝗼𝘁.

${categoriesContent}

𐴲੭  ˙ 𓂃  🍥  𓂃  ˙

ᅟㅤ 𓈒    |꛱ ᷼ |꛱ ᷼ |ㅤֵㅤ  ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒`;

    try {
        const response = await axios.get(global.banner, {
            responseType: 'arraybuffer',
            timeout: 30000
        });

        await sock.sendMessage(destination, {
            image: Buffer.from(response.data),
            mimetype: response.headers['content-type'] || 'image/jpeg',
            caption: menuText
        });

    } catch (error: any) {
        console.error(
            '[MENU]',
            error?.response?.data || error?.message || error
        );

        await msg.reply(
            `⚠︎ 𝙽𝙾 𝚂𝙴 𝙿𝚄𝙳𝙾 𝙴𝙽𝚅𝙸𝙰𝚁 𝙻𝙰 𝙸𝙼𝙰𝙶𝙴𝙽\n\n${error?.message || error}`
        );
    }
}
