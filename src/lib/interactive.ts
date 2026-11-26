import {
    proto,
    generateWAMessageFromContent,
    type WASocket,
    type WAMessage
} from '@whiskeysockets/baileys';

type Row = {
    title: string;
    description?: string;
    id?: string;
    rowId?: string;
};

type Section = {
    title: string;
    rows: Row[];
};

type ListOptions = {
    title?: string;
    description: string;
    footer?: string;
    buttonText?: string;
    mentions?: string[];
    contextInfo?: proto.IContextInfo;
    sections: Section[];
};

const clean = (text: unknown): string =>
    String(text ?? '').replace(/[\u1AB2\u20E8]/gu, '');

export async function sendInteractiveList(
    sock: WASocket,
    jid: string,
    options: ListOptions,
    quoted?: WAMessage
) {
    const sections = options.sections.map(section => ({
        title: clean(section.title),
        rows: section.rows.map(row => {
            const rowId = row.rowId || row.id;
            if (!rowId) throw new Error('La opción no tiene un identificador.');

            return {
                title: clean(row.title),
                description: clean(row.description),
                rowId
            };
        })
    }));

    const message = generateWAMessageFromContent(
        jid,
        proto.Message.fromObject({
            listMessage: {
                title: clean(options.title),
                description: clean(options.description),
                footerText: clean(options.footer),
                buttonText: clean(options.buttonText || 'Seleccionar'),
                listType: 1,
                sections,
                contextInfo: {
                    ...options.contextInfo,
                    mentionedJid: options.mentions || options.contextInfo?.mentionedJid || []
                }
            }
        }),
        {
            userJid: sock.user?.id || '',
            ...(quoted ? { quoted } : {})
        }
    );

    if (!message.message || !message.key.id) {
        throw new Error('Mensaje interactivo inválido.');
    }

    await sock.relayMessage(jid, message.message, {
        messageId: message.key.id,
        additionalNodes: [
            {
                tag: 'biz',
                attrs: {},
                content: [
                    {
                        tag: 'list',
                        attrs: {
                            type: 'product_list',
                            v: '2'
                        }
                    }
                ]
            }
        ]
    });

    return message;
}

export default sendInteractiveList;
