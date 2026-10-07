export const command = ['menu', 'help', 'comandos'];
export const category = 'info';
export const description = 'Muestra el menú principal con todos los comandos.';

export default async function (sock: any, msg: any, extra: any) {
    console.log('\n🍓͜ᩧ𑂳ᰍ  INICIANDO COMANDO MENU');

    try {
        const pluginData = extra.pluginData;

        if (!pluginData) {
            console.error('🍥 ERROR: extra.pluginData no está definido.');
            return;
        }

        if (!global.rcanal) {
            console.error('🍥 ERROR: global.rcanal no está definido.');
            return;
        }

        const remoteJid = msg?.key?.remoteJid;

        if (!remoteJid) {
            console.error('🍥 ERROR: no se pudo obtener msg.key.remoteJid.');
            return;
        }

        console.log('🍓 Chat destino:', remoteJid);
        console.log('🪷 Canal referencia:', global.rcanal);

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
            const rawCat = (data.category || 'misc')
                .toLowerCase()
                .trim();

            const matchedConfig = categoryConfig.find(c =>
                c.aliases.includes(rawCat)
            );

            const finalKey = matchedConfig
                ? matchedConfig.key
                : rawCat;

            if (!groupedCategories.has(finalKey)) {
                groupedCategories.set(finalKey, []);
            }

            const catList = groupedCategories.get(finalKey);

            const existing = catList.find(item =>
                item.commands.some(c =>
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
                    .map(c => `.${c}`)
                    .join(' • ');

                lines.push(`> *${cmdsFormatted}*`);
                lines.push(`> ${item.description}`);
            }

            return `${emoji}͜ᩧ𑂳ᰍ  *${title.toUpperCase()}*\n${lines.join('\n')}`;
        };

        const blocks: string[] = [];
        const processedKeys = new Set();

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
        const botName = global.namebot || 'YAE MIKU BOT';

        const menuText = `ᅟㅤ 𓈒   ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒

  ${botName.toUpperCase()}˙ᰨᰍ
𐴲੭  ˙ 𓂃  🍥  𓂃  ˙

🍓͜ᩧ𑂳ᰍ  𝗛𝗼𝗹𝗮, 𝗯𝗶𝗲𝗻𝘃𝗲𝗻𝗶𝗱𝗼 𝗮𝗹
𝗺𝗲𝗻𝘂́ 𝗽𝗿𝗶𝗻𝗰𝗶𝗽𝗮𝗹 𝗱𝗲𝗹 𝗯𝗼𝘁.

${categoriesContent}

𐴲੭  ˙ 𓂃  🍥  𓂃  ˙

ᅟㅤ 𓈒    |꛱ ᷼ |꛱ ᷼ |ㅤֵㅤ  ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒`;

        const contextInfo = {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: global.rcanal
            }
        };

        console.log('🪷 Preparando mensaje...');
        console.log('🍓 contextInfo:', contextInfo);

        const messageContent = global.icono
            ? {
                image: {
                    url: global.icono
                },
                caption: menuText,
                contextInfo
            }
            : {
                text: menuText,
                contextInfo
            };

        console.log('🍥 Enviando menú al chat actual...');

        const result = await sock.sendMessage(
            remoteJid,
            messageContent
        );

        console.log('🍓 MENÚ ENVIADO CORRECTAMENTE.');
        console.log('🪷 ID:', result?.key?.id);
        console.log('🍥 Destino:', result?.key?.remoteJid);

    } catch (error) {
        console.error('\n🍥͜ᩧ𑂳ᰍ  ERROR EN COMANDO MENU');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        if (error instanceof Error) {
            console.error('🍓 Mensaje:', error.message);
            console.error('🪷 Stack:', error.stack);
        } else {
            console.error(error);
        }

        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
}
