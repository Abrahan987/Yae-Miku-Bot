
import {
    proto,
    type BinaryNode,
    isJidGroup,
    generateWAMessageFromContent,
    prepareWAMessageMedia
} from '@whiskeysockets/baileys';

import {
    resolveBotName,
    resolveBotBanner
} from '../lib/subbot_config.ts';

export const command = ['menu', 'help', 'comandos'];
export const category = 'info';
export const description = 'Muestra el menú de comandos.';
export const needsGroupMetadata = false;

type MenuItem = {
    commands: string[];
    description: string;
};

type MenuCategory = {
    key: string;
    title: string;
    emoji: string;
    aliases: string[];
    items: MenuItem[];
};

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
        aliases: [
            'grupos', 'grupo', 'group', 'groups',
            'admin', 'administracion'
        ]
    },
    {
        key: 'herramientas',
        title: 'HERRAMIENTAS',
        emoji: '🧰',
        aliases: [
            'herramientas', 'tools', 'utilidades',
            'utils', 'stickers', 'sticker'
        ]
    },
    {
        key: 'economia',
        title: 'ECONOMÍA',
        emoji: '💰',
        aliases: ['economia', 'economy']
    },
    {
        key: 'gacha',
        title: 'GACHA Y ANIME',
        emoji: '🌸',
        aliases: ['gacha', 'anime']
    },
    {
        key: 'diversion',
        title: 'DIVERSIÓN',
        emoji: '🎮',
        aliases: ['diversion', 'fun', 'juegos']
    },
    {
        key: 'subbots',
        title: 'SUBBOTS',
        emoji: '🤖',
        aliases: ['socket', 'subbot', 'subbots']
    },
    {
        key: 'owner',
        title: 'OWNER',
        emoji: '👑',
        aliases: ['owner', 'propietario', 'creador']
    },
    {
        key: 'otros',
        title: 'OTROS',
        emoji: '🌷',
        aliases: ['otros', 'misc', 'other']
    }
];

const normalize = (value: string): string =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

function getPrefix(): string {
    const prefixes = (global as any).prefix;

    if (Array.isArray(prefixes)) {
        return prefixes.find(
            (value: unknown) =>
                typeof value === 'string' && value.length > 0
        ) || '.';
    }

    return typeof prefixes === 'string' && prefixes
        ? prefixes
        : '.';
}

function getCategories(pluginData: any): MenuCategory[] {
    const categories = new Map<string, MenuCategory>();

    for (const config of categoryConfig) {
        categories.set(config.key, {
            ...config,
            items: []
        });
    }

    if (!pluginData || typeof pluginData.values !== 'function') {
        return [];
    }

    for (const data of pluginData.values()) {
        const rawCategory = normalize(
            data.category || 'otros'
        );

        const config = categoryConfig.find(item =>
            item.aliases.includes(rawCategory)
        );

        const key = config?.key || 'otros';
        const current = categories.get(key);

        if (!current) continue;

        const commands = Array.isArray(data.commands)
            ? data.commands
                .filter(Boolean)
                .map((value: unknown) =>
                    String(value).toLowerCase()
                )
            : [];

        if (!commands.length) continue;

        const exists = current.items.some(item =>
            item.commands.some(cmd =>
                commands.includes(cmd)
            )
        );

        if (exists) continue;

        current.items.push({
            commands,
            description: String(
                data.description || 'Sin descripción'
            )
        });
    }

    return Array.from(categories.values()).filter(
        item => item.items.length > 0
    );
}

function getMenuHeader(botName: string): string {
    return `ᅟㅤ 𓈒   ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒

  ${botName.toUpperCase()}˙ᰨᰍ
𐴲੭  ˙ 𓂃  🍥  𓂃  ˙

🍓͜ᩧ𑂳ᰍ  𝗛𝗼𝗹𝗮, 𝗯𝗶𝗲𝗻𝘃𝗲𝗻𝗶𝗱𝗼 𝗮𝗹
𝗺𝗲𝗻𝘂́ 𝗽𝗿𝗶𝗻𝗰𝗶𝗽𝗮𝗹 𝗱𝗲𝗹 𝗯𝗼𝘁.`;
}

const menuFooter = `𐴲੭  ˙ 𓂃  🍥  𓂃  ˙

ᅟㅤ 𓈒    |꛱ ᷼ |꛱ ᷼ |ㅤֵㅤ  ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒`;

async function sendOriginalMenu(
    sock: any,
    msg: any,
    pluginData: any,
    remoteJid: string,
    contextInfo: any
) {
    const originalCategories = [
        {
            key: 'info',
            title: 'INFO',
            emoji: '🪷',
            aliases: [
                'info', 'informacion', 'main', 'principal'
            ]
        },
        {
            key: 'descargas',
            title: 'DESCARGAS',
            emoji: '🍥',
            aliases: [
                'descargas', 'descarga',
                'download', 'downloads'
            ]
        },
        {
            key: 'grupos',
            title: 'GRUPOS',
            emoji: '🍓',
            aliases: [
                'grupos', 'grupo', 'group', 'groups'
            ]
        },
        {
            key: 'herramientas',
            title: 'HERRAMIENTAS',
            emoji: '🧰',
            aliases: [
                'herramientas', 'tools', 'utilidades'
            ]
        }
    ];

    const groupedCategories =
        new Map<string, MenuItem[]>();

    if (pluginData && typeof pluginData.entries === 'function') {
        for (const [, data] of pluginData.entries()) {
            const rawCat = String(
                data.category || 'misc'
            ).toLowerCase().trim();

            const matchedConfig = originalCategories.find(
                c => c.aliases.includes(rawCat)
            );

            const finalKey = matchedConfig
                ? matchedConfig.key
                : rawCat;

            if (!groupedCategories.has(finalKey)) {
                groupedCategories.set(finalKey, []);
            }

            const catList = groupedCategories.get(finalKey)!;

            const commands = Array.isArray(data.commands)
                ? data.commands.map(
                    (c: unknown) => String(c)
                )
                : [];

            if (!commands.length) continue;

            const existing = catList.find(item =>
                item.commands.some(c =>
                    commands.includes(c)
                )
            );

            if (!existing) {
                catList.push({
                    commands,
                    description:
                        data.description || 'Sin descripción'
                });
            }
        }
    }

    const renderCategoryBlock = (
        title: string,
        emoji: string,
        items: MenuItem[]
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
    const processedKeys = new Set<string>();

    for (const conf of originalCategories) {
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

    const botName = resolveBotName(
        sock,
        global.namebot || 'YAE MIKU BOT'
    );

    const menuText = `ᅟㅤ 𓈒   ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒

  ${botName.toUpperCase()}˙ᰨᰍ
𐴲੭  ˙ 𓂃  🍥  𓂃  ˙

🍓͜ᩧ𑂳ᰍ  𝗛𝗼𝗹𝗮, 𝗯𝗶𝗲𝗻𝘃𝗲𝗻𝗶𝗱𝗼 𝗮𝗹
𝗺𝗲𝗻𝘂́ 𝗽𝗿𝗶𝗻𝗰𝗶𝗽𝗮𝗹 𝗱𝗲𝗹 𝗯𝗼𝘁.

${categoriesContent}

𐴲੭  ˙ 𓂃  🍥  𓂃  ˙

ᅟㅤ 𓈒    |꛱ ᷼ |꛱ ᷼ |ㅤֵㅤ  ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒`;

    const banner = resolveBotBanner(
        sock,
        global.icono
    );

    if (banner) {
        const image = banner.buffer
            ? banner.buffer
            : { url: banner.url as string };

        try {
            return await sock.sendMessage(
                remoteJid,
                {
                    image,
                    caption: menuText,
                    contextInfo
                }
            );
        } catch (error) {
            console.error('[MENU BANNER ERROR]:', error);

            if (
                banner.url !== global.icono &&
                global.icono
            ) {
                try {
                    return await sock.sendMessage(
                        remoteJid,
                        {
                            image: {
                                url: global.icono
                            },
                            caption: menuText,
                            contextInfo
                        }
                    );
                } catch {}
            }
        }
    }

    return sock.sendMessage(
        remoteJid,
        {
            text: menuText,
            contextInfo
        }
    );
}

async function sendTextMenu(
    sock: any,
    msg: any,
    remoteJid: string,
    categories: MenuCategory[],
    botName: string,
    prefix: string,
    contextInfo: any,
    showNavigation: boolean
) {
    const header = `${getMenuHeader(botName)}\n\n`;

    const navigation = showNavigation
        ? `🪷 Lista interactiva: *${prefix}menu*\n\n`
        : '';

    let page = header + navigation;

    for (const category of categories) {
        const title =
            `${category.emoji}͜ᩧ𑂳ᰍ  *${category.title}*\n\n`;

        let showTitle = true;

        for (const item of category.items) {
            const commands = item.commands
                .map(cmd => `${prefix}${cmd}`)
                .join(' • ');

            const block =
                `> *${commands}*\n> ${item.description}\n\n`;

            const nextLength =
                page.length +
                (showTitle ? title.length : 0) +
                block.length +
                menuFooter.length;

            if (
                nextLength > 3500 &&
                page !== header &&
                page !== header + navigation
            ) {
                await sock.sendMessage(
                    remoteJid,
                    {
                        text: page + menuFooter,
                        contextInfo
                    },
                    { quoted: msg }
                );

                page = header;
                showTitle = true;
            }

            if (showTitle) {
                page += title;
                showTitle = false;
            }

            page += block;
        }
    }

    return sock.sendMessage(
        remoteJid,
        {
            text: page + menuFooter,
            contextInfo
        },
        { quoted: msg }
    );
}

export default async function (
    sock: any,
    msg: any,
    extra: any
) {
    const remoteJid = msg.key?.remoteJid || msg.from;

    if (!remoteJid) {
        throw new Error(
            'No se pudo obtener el chat de destino.'
        );
    }

    const botName = resolveBotName(
        sock,
        global.namebot || 'YAE MIKU BOT'
    );

    const categories = getCategories(
        extra?.pluginData
    );

    const contextInfo = {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: global.rcanal,
            newsletterName:
                '𓈒𓂃 𝚈𝚄𝙺𝙺𝙸 & 𝚈𝙰𝙴 𝙱𝙾𝚃 🍓'
        }
    };

    const selection = normalize(
        extra?.args?.[0] || ''
    );

    const prefix = getPrefix();

    const sendFallback = () =>
        sendTextMenu(
            sock,
            msg,
            remoteJid,
            categories,
            botName,
            prefix,
            contextInfo,
            true
        );

    if (selection === 'texto') {
        return sendOriginalMenu(
            sock,
            msg,
            extra?.pluginData,
            remoteJid,
            contextInfo
        );
    }

    if (selection.startsWith('cat_')) {
        const categoryKey = selection.slice(4);

        const selected = categories.find(
            item => item.key === categoryKey
        );

        if (!selected) {
            return msg.reply(
                '🍥 Esta categoría ya no está disponible.'
            );
        }

        return sendTextMenu(
            sock,
            msg,
            remoteJid,
            [selected],
            botName,
            prefix,
            contextInfo,
            false
        );
    }

    if (!categories.length) {
        return msg.reply(
            '🍥 No hay comandos disponibles en este momento.'
        );
    }

    if (selection && selection !== 'lista') {
        return sendFallback();
    }

    const rows = categories.map(item => ({
        header: item.emoji,
        title: item.title,
        description:
            `${item.items.length} opciones disponibles`,
        id: `${prefix}menu cat_${item.key}`
    }));

    const sections = [
        {
            title: '🍓 CATEGORÍAS DE YAE',
            rows
        }
    ];

    let preparedMedia:
        Awaited<ReturnType<typeof prepareWAMessageMedia>>
        | null = null;

    let banner:
        ReturnType<typeof resolveBotBanner> = null;

    try {
        banner = resolveBotBanner(
            sock,
            global.icono
        );

        const image = banner?.buffer ||
            (
                banner?.url
                    ? { url: banner.url }
                    : undefined
            );

        if (image) {
            preparedMedia = await prepareWAMessageMedia(
                { image },
                {
                    upload: sock.waUploadToServer
                }
            );
        }
    } catch (error) {
        console.error(
            '[MENU BANNER ERROR]:',
            error
        );

        if (
            global.icono &&
            banner?.url !== global.icono
        ) {
            try {
                preparedMedia =
                    await prepareWAMessageMedia(
                        {
                            image: {
                                url: global.icono
                            }
                        },
                        {
                            upload: sock.waUploadToServer
                        }
                    );
            } catch (fallbackError) {
                console.error(
                    '[MENU DEFAULT BANNER ERROR]:',
                    fallbackError
                );
            }
        }
    }

    const additionalNodes: BinaryNode[] = [
        {
            tag: 'biz',
            attrs: {},
            content: [
                {
                    tag: 'interactive',
                    attrs: {
                        type: 'native_flow',
                        v: '1'
                    },
                    content: [
                        {
                            tag: 'native_flow',
                            attrs: {
                                name: 'mixed',
                                v: '9'
                            }
                        }
                    ]
                }
            ]
        }
    ];

    if (!isJidGroup(remoteJid)) {
        additionalNodes.unshift({
            tag: 'bot',
            attrs: {
                biz_bot: '1'
            }
        });
    }

    const sendInteractive = async (
        media: typeof preparedMedia
    ) => {
        const header =
            proto.Message.InteractiveMessage.Header.create({
                title: botName.toUpperCase(),
                hasMediaAttachment:
                    Boolean(media?.imageMessage),
                imageMessage: media?.imageMessage
            });

        const interactiveMessage =
            proto.Message.InteractiveMessage.create({
                header,

                body:
                    proto.Message.InteractiveMessage.Body.create({
                        text: `🍓͜ᩧ𑂳ᰍ  𝗛𝗼𝗹𝗮, 𝗯𝗶𝗲𝗻𝘃𝗲𝗻𝗶𝗱𝗼 𝗮𝗹
𝗺𝗲𝗻𝘂́ 𝗽𝗿𝗶𝗻𝗰𝗶𝗽𝗮𝗹 𝗱𝗲𝗹 𝗯𝗼𝘁.

🪷 Toca *Mostrar comandos* para abrir la lista y seleccionar una categoría.

🍥 Si no aparece el botón, escribe *${prefix}menu texto*.`
                    }),

                footer:
                    proto.Message.InteractiveMessage.Footer.create({
                        text:
                            '𐴲੭  ˙ 𓂃  🍥  𓂃  ˙'
                    }),

                nativeFlowMessage:
                    proto.Message.InteractiveMessage.NativeFlowMessage.create({
                        messageVersion: 1,
                        messageParamsJson: '{}',
                        buttons: [
                            {
                                name: 'single_select',
                                buttonParamsJson:
                                    JSON.stringify({
                                        title:
                                            'Mostrar comandos',
                                        sections
                                    })
                            }
                        ]
                    }),

                contextInfo
            });

        const message =
            generateWAMessageFromContent(
                remoteJid,
                {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadata: {},
                                deviceListMetadataVersion: 2
                            },
                            interactiveMessage
                        }
                    }
                },
                {
                    userJid: sock.user?.id || '',
                    quoted: msg
                }
            );

        if (
            !message.message ||
            !message.key.id
        ) {
            throw new Error(
                'No se pudo generar el mensaje interactivo.'
            );
        }

        return sock.relayMessage(
            remoteJid,
            message.message,
            {
                messageId: message.key.id,
                additionalNodes
            }
        );
    };

    try {
        return await sendInteractive(
            preparedMedia
        );
    } catch (error) {
        console.error(
            '[MENU INTERACTIVE ERROR]:',
            error
        );

        if (preparedMedia) {
            try {
                return await sendInteractive(
                    null
                );
            } catch (retryError) {
                console.error(
                    '[MENU INTERACTIVE RETRY ERROR]:',
                    retryError
                );
            }
        }
    }

    return sendFallback();
}
