import { db } from './database.ts';

db.exec(`
    CREATE TABLE IF NOT EXISTS group_antilink (
        groupJid TEXT PRIMARY KEY,
        enabled INTEGER DEFAULT 0
    )
`);

export function isAntilinkEnabled(groupJid: string): boolean {
    const row = db
        .prepare('SELECT enabled FROM group_antilink WHERE groupJid = ?')
        .get(groupJid) as any;
    return Number(row?.enabled) === 1;
}

export function setAntilink(groupJid: string, enabled: boolean): void {
    db.prepare(`
        INSERT INTO group_antilink (groupJid, enabled)
        VALUES (?, ?)
        ON CONFLICT(groupJid) DO UPDATE SET enabled = excluded.enabled
    `).run(groupJid, enabled ? 1 : 0);
}

const LINK_REGEX = new RegExp(
    [
        'https?:\\/\\/\\S+',
        'www\\.\\S+',
        'chat\\.whatsapp\\.com\\/\\S+',
        'wa\\.me\\/\\S+',
        't\\.me\\/\\S+',
        'discord\\.gg\\/\\S+',
        'bit\\.ly\\/\\S+',
        '\\b[a-z0-9-]+\\.(?:com|net|org|io|gg|xyz|me|info|co|tv|app|link|site|online)\\b(?:\\/\\S*)?'
    ].join('|'),
    'i'
);

const WHATSAPP_LINK_REGEX = /(?:chat\.|api\.)?whatsapp\.com\/\S*|wa\.me\/\S*/i;

export function containsLink(text: string): boolean {
    return LINK_REGEX.test(String(text || ''));
}

export function containsWhatsappLink(text: string): boolean {
    return WHATSAPP_LINK_REGEX.test(String(text || ''));
}
