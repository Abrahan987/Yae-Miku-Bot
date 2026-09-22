export const command = ['menu', 'help', 'comandos'];
export const category = 'info';
export const description = 'Muestra el menú principal con todos los comandos.';

export default async function (sock: any, msg: any, extra: any, db: any) {
    const userData = db.getUser();
    const userName = userData?.name || msg.pushName || 'Usuario';
    const pluginData = extra.pluginData;

    const categoriesMap = new Map<string, string[]>();

    for (const [, data] of pluginData.entries()) {
        const cat = data.category || 'misc';
        if (!categoriesMap.has(cat)) {
            categoriesMap.set(cat, []);
        }

        const catList = categoriesMap.get(cat)!;

        for (const cmd of data.commands) {
            if (!catList.includes(cmd)) {
                catList.push(cmd);
            }
        }
    }

    const formatCategory = (catName: string, emoji: string) => {
        const cmds = categoriesMap.get(catName.toLowerCase());
        if (!cmds || cmds.length === 0) return `${emoji}͜ᩧ𑂳ᰍ  *${catName.toUpperCase()}*\n> .`;

        const formattedCmds = cmds.map(c => `.${c}`).join(', ');
        return `${emoji}͜ᩧ𑂳ᰍ  *${catName.toUpperCase()}*\n> ${formattedCmds}`;
    };

    const infoBlock = formatCategory('info', '🪷');
    const descargasBlock = formatCategory('descargas', '🍥');
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
