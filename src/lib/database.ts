import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const dbPath = path.resolve(process.cwd(), 'database.sqlite');
const db = new DatabaseSync(dbPath);

export async function loadDB() {
    db.exec(`
        PRAGMA journal_mode = WAL;
        
        CREATE TABLE IF NOT EXISTS users (
            jid TEXT PRIMARY KEY,
            name TEXT DEFAULT '',
            yen INTEGER DEFAULT 0,
            banned INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS groups (
            jid TEXT PRIMARY KEY,
            welcome INTEGER DEFAULT 0,
            mute INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS bot_stats (
            key TEXT PRIMARY KEY,
            value INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS warnings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            groupJid TEXT NOT NULL,
            userJid TEXT NOT NULL,
            count INTEGER DEFAULT 0,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(groupJid, userJid)
        );
    `);
}

export function getUser(jid: string) {
    const stmt = db.prepare('SELECT * FROM users WHERE jid = ?');
    let user = stmt.get(jid) as any;
    if (!user) {
        db.prepare('INSERT INTO users (jid) VALUES (?)').run(jid);
        user = { jid, name: '', yen: 0, banned: 0 };
    }
    return user;
}

export function updateUser(jid: string, data: Partial<{ name: string; yen: number; banned: number }>) {
    const user = getUser(jid);
    const updated = { ...user, ...data };
    db.prepare('UPDATE users SET name = ?, yen = ?, banned = ? WHERE jid = ?')
      .run(updated.name, updated.yen, updated.banned, jid);
    return updated;
}

export function getGroup(jid: string) {
    const stmt = db.prepare('SELECT * FROM groups WHERE jid = ?');
    let group = stmt.get(jid) as any;
    if (!group) {
        db.prepare('INSERT INTO groups (jid) VALUES (?)').run(jid);
        group = { jid, welcome: 0, mute: 0 };
    }
    return group;
}

export function incrementCommandCount() {
    db.exec(`
        INSERT INTO bot_stats (key, value) VALUES ('commands', 1)
        ON CONFLICT(key) DO UPDATE SET value = value + 1;
    `);
    const stmt = db.prepare('SELECT value FROM bot_stats WHERE key = ?');
    const res = stmt.get('commands') as any;
    return res ? res.value : 1;
}

export function getWarnings(groupJid: string, userJid: string): number {
    const stmt = db.prepare('SELECT count FROM warnings WHERE groupJid = ? AND userJid = ?');
    const result = stmt.get(groupJid, userJid) as any;
    return result ? result.count : 0;
}

export function addWarning(groupJid: string, userJid: string): number {
    const current = getWarnings(groupJid, userJid);
    const next = current + 1;

    if (current === 0) {
        db.prepare('INSERT INTO warnings (groupJid, userJid, count) VALUES (?, ?, ?)').run(groupJid, userJid, next);
    } else {
        db.prepare('UPDATE warnings SET count = ?, timestamp = CURRENT_TIMESTAMP WHERE groupJid = ? AND userJid = ?')
            .run(next, groupJid, userJid);
    }

    return next;
}

export function removeWarning(groupJid: string, userJid: string): number {
    const current = getWarnings(groupJid, userJid);
    if (current <= 0) return 0;

    const next = current - 1;

    if (next === 0) {
        db.prepare('DELETE FROM warnings WHERE groupJid = ? AND userJid = ?').run(groupJid, userJid);
    } else {
        db.prepare('UPDATE warnings SET count = ?, timestamp = CURRENT_TIMESTAMP WHERE groupJid = ? AND userJid = ?')
            .run(next, groupJid, userJid);
    }

    return next;
}

export function resetWarnings(groupJid: string, userJid: string): number {
    db.prepare('DELETE FROM warnings WHERE groupJid = ? AND userJid = ?').run(groupJid, userJid);
    return 0;
}

export { db };
