import { db } from './database.ts';

db.exec(`
    CREATE TABLE IF NOT EXISTS group_welcome (
        groupJid TEXT PRIMARY KEY,
        welcomeEnabled INTEGER DEFAULT 0,
        welcomeMessage TEXT DEFAULT '',
        goodbyeEnabled INTEGER DEFAULT 0,
        goodbyeMessage TEXT DEFAULT ''
    )
`);

export type WelcomeKind = 'welcome' | 'goodbye';

export interface WelcomeConfig {
    enabled: boolean;
    message: string;
}

export function getWelcomeConfig(groupJid: string, kind: WelcomeKind): WelcomeConfig {
    const row = db
        .prepare('SELECT * FROM group_welcome WHERE groupJid = ?')
        .get(groupJid) as any;

    if (!row) return { enabled: false, message: '' };

    return {
        enabled: Number(row[`${kind}Enabled`]) === 1,
        message: String(row[`${kind}Message`] || '')
    };
}

export function setWelcomeEnabled(groupJid: string, kind: WelcomeKind, enabled: boolean): void {
    const col = `${kind}Enabled`;

    db.prepare(`
        INSERT INTO group_welcome (groupJid, ${col})
        VALUES (?, ?)
        ON CONFLICT(groupJid) DO UPDATE SET ${col} = excluded.${col}
    `).run(groupJid, enabled ? 1 : 0);
}

export function setWelcomeMessage(groupJid: string, kind: WelcomeKind, message: string): void {
    const col = `${kind}Message`;

    db.prepare(`
        INSERT INTO group_welcome (groupJid, ${col})
        VALUES (?, ?)
        ON CONFLICT(groupJid) DO UPDATE SET ${col} = excluded.${col}
    `).run(groupJid, message);
}
