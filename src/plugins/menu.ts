
import {
    proto,
    generateWAMessageFromContent,
    prepareWAMessageMedia
} from '@whiskeysockets/baileys';
import {
    resolveBotName,
    resolveBotBanner
} from '../lib/subbot_config.ts';

export const command = ['menu', 'help', 'comandos'];
export const category = 'info';
export const description = 'Muestra el menú interactivo de comandos.';
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
        aliases: ['grupos', 'grupo', 'group', 'groups', 'admin', 'administracion']
    },
    {
        key: 'herramientas',
        title: 'HERRAMIENTAS',
        emoji: '🧰',
        aliases: ['herramientas', 'tools', 'utilidades', 'utils', 'stickers', 'sticker']
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
        const rawCategory = normalize(data.category || 'otros');

        const config = categoryConfig.find(item =>
            item.aliases.includes(rawCategory)
        );

        const key = config?.key || 'otros';
        const current = categories.get(key);

        if (!current) continue;

        const commands = Array.isArray(data.commands)
            ? data.commands
                .filter(Boolean)
                .map((value: unknown) => String(value).toLowerCase())
            : [];

        if (!commands.length) continue;

        const exists = current.items.some(item =>
            item.commands.some(cmd => commands.includes(cmd))
        );

        if (exists) continue;

        current.items.push({
            commands,
            description: String(data.description || 'Sin descripción')
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

async function sendCategory(
    sock: any,
    msg: any,
    selected: MenuCategory,
    botName: string,
    contextInfo: any
) {
    const prefix = getPrefix();
    const remoteJid = msg.from || msg.key?.remoteJid;

    const header = `${getMenuHeader(botName)}

${selected.emoji}͜ᩧ𑂳ᰍ  *${selected.title}*

`;

    let content = header;

    for (const item of selected.items) {
        const commands = item.commands
            .map(cmd => `${prefix}${cmd}`)
            .join(' • ');

        const block = `> *${commands}*
> ${item.description}

`;

        if (
            content.length + block.length + menuFooter.length > 3500 &&
            content !== header
        ) {
            await sock.sendMessage(
                remoteJid,
                {
                    text: content + menuFooter,
                    contextInfo
                },
                { quoted: msg }
            );

            content = header;
        }

        content += block;
    }

    return sock.sendMessage(
        remoteJid,
        {
            text: content + menuFooter,
            contextInfo
        },
        { quoted: msg }
    );
}

async function sendClassicFallback(
    sock: any,
    msg: any,
    categories: MenuCategory[],
    botName: string,
    contextInfo: any
) {
    const prefix = getPrefix();
    const remoteJid = msg.from || msg.key?.remoteJid;

    let content = `${getMenuHeader(botName)}

`;

    for (const selected of categories) {
        const lines = selected.items.map(item => {
            const commands = item.commands
                .slice(0, 2)
                .map(cmd => `${prefix}${cmd}`)
                .join(' • ');

            return `> *${commands}*
> ${item.description}`;
        });

        const block = `${selected.emoji}͜ᩧ𑂳ᰍ  *${selected.title}*
${lines.join('\n')}

`;

        if (
            content.length + block.length + menuFooter.length > 3500
        ) {
            await sock.sendMessage(remoteJid, {
                text: content + menuFooter,
                contextInfo
            });

            content = '';
        }

        content += block;
    }

    if (content) {
        return sock.sendMessage(remoteJid, {
            text: content + menuFooter,
            contextInfo
        });
    }
}

export default async function (
    sock: any,
    msg: any,
    extra: any
) {
    const remoteJid = msg.from || msg.key?.remoteJid;

    if (!remoteJid) {
        throw new Error('No se pudo obtener el chat de destino.');
    }

    const botName = resolveBotName(
        sock,
        global.namebot || 'YAE MIKU BOT'
    );

    const categories = getCategories(extra.pluginData);

    const contextInfo = {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: global.rcanal,
            newsletterName: '𓈒𓂃 𝚈𝚄𝙺𝙺𝙸 & 𝚈𝙰𝙴 𝙱𝙾𝚃 🍓'
        }
    };

    const selection = String(extra.args?.[0] || '').toLowerCase();

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

        return sendCategory(
            sock,
            msg,
            selected,
            botName,
            contextInfo
        );
    }

    if (!categories.length) {
        return msg.reply(
            '🍥 No hay comandos disponibles en este momento.'
        );
    }

    const prefix = getPrefix();

    const rows = categories.map(item => ({
        header: item.emoji,
        title: item.title,
        description: `${item.items.length} comandos disponibles`,
        id: `${prefix}menu cat_${item.key}`
    }));

    const sections = [{
        title: '🍓 CATEGORÍAS DE YAE',
        rows
    }];

    const banner = resolveBotBanner(sock, global.icono);

    let preparedMedia: any = null;

    if (banner) {
        try {
            const image = banner.buffer
                ? banner.buffer
                : { url: banner.url as string };

            preparedMedia = await prepareWAMessageMedia(
                { image },
                { upload: sock.waUploadToServer }
            );
        } catch (error) {
            console.error('[MENU BANNER ERROR]:', error);

            if (banner.url !== global.icono && global.icono) {
                try {
                    preparedMedia = await prepareWAMessageMedia(
                        { image: { url: global.icono } },
                        { upload: sock.waUploadToServer }
                    );
                } catch {}
            }
        }
    }

    const sendInteractive = async (media: any) => {
        const header = proto.Message.InteractiveMessage.Header.create({
            title: botName.toUpperCase(),
            hasMediaAttachment: Boolean(media),
            ...(media || {})
        });

        const interactiveMessage =
            proto.Message.InteractiveMessage.create({
                header,
                body: proto.Message.InteractiveMessage.Body.create({
                    text: `${getMenuHeader(botName)}

🪷 Toca *Mostrar comandos* para abrir la lista y seleccionar una categoría.`
                }),
                footer: proto.Message.InteractiveMessage.Footer.create({
                    text: '𐴲੭  ˙ 𓂃  🍥  𓂃  ˙'
                }),
                nativeFlowMessage:
                    proto.Message.InteractiveMessage.NativeFlowMessage.create({
                        buttons: [{
                            name: 'single_select',
                            buttonParamsJson: JSON.stringify({
                                title: 'Mostrar comandos',
                                sections
                            })
                        }]
                    }),
                contextInfo
            });

        const message = generateWAMessageFromContent(
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

        return sock.relayMessage(
            remoteJid,
            message.message,
            {
                messageId: message.key.id
            }
        );
    };

    try {
        return await sendInteractive(preparedMedia);
    } catch (error) {
        console.error('[MENU INTERACTIVE ERROR]:', error);

        if (preparedMedia) {
            try {
                return await sendInteractive(null);
            } catch (retryError) {
                console.error(
                    '[MENU INTERACTIVE RETRY ERROR]:',
                    retryError
                );
            }
        }
    }

    return sendClassicFallback(
        sock,
        msg,
        categories,
        botName,
        contextInfo
    );
}
