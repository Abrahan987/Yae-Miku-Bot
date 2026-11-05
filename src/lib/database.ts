import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { lidCache, decodeJid, UserJid } from './simple.ts';

const dbPath = path.resolve(process.cwd(), 'database.sqlite');
const db = new DatabaseSync(dbPath);

export async function loadDB() {
    db.exec(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS users (
            jid TEXT PRIMARY KEY,
            name TEXT DEFAULT '',
            yen INTEGER DEFAULT 0,
            banned INTEGER DEFAULT 0,
            bank INTEGER DEFAULT 0,
            lid TEXT DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS groups (
            jid TEXT PRIMARY KEY,
            welcome INTEGER DEFAULT 0,
            mute INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS welcomes (
            groupJid TEXT PRIMARY KEY,
            enabled INTEGER DEFAULT 0,
            message TEXT DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS bot_settings (
            key TEXT PRIMARY KEY,
            value TEXT DEFAULT ''
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

        CREATE TABLE IF NOT EXISTS message_stats (
            groupJid TEXT NOT NULL,
            userJid TEXT NOT NULL,
            message_count INTEGER DEFAULT 0,
            PRIMARY KEY (groupJid, userJid)
        );

        CREATE TABLE IF NOT EXISTS economy_cooldowns (
            userJid TEXT NOT NULL,
            action TEXT NOT NULL,
            until_time INTEGER DEFAULT 0,
            PRIMARY KEY (userJid, action)
        );

        CREATE TABLE IF NOT EXISTS group_primary (
            groupJid TEXT PRIMARY KEY,
            botNumber TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS subbot_config (
            phone TEXT PRIMARY KEY,
            name TEXT DEFAULT NULL,
            banner TEXT DEFAULT NULL,
            owner_jid TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    migrateUsers();
    applyPrefixSettings();
}

const LID_RE = /^([^@:]+)(?::\d+)?@lid$/;
const USER_TABLES = ['warnings', 'message_stats', 'economy_cooldowns', 'gacha_claims', 'gacha_users', 'gacha_profile'];

export function getSetting(key: string): string | null {
    const row = db.prepare('SELECT value FROM bot_settings WHERE key = ?').get(key) as any;
    return row ? String(row.value) : null;
}

export function setSetting(key: string, value: string): void {
    db.prepare('INSERT INTO bot_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
}

export function deleteSetting(key: string): void {
    db.prepare('DELETE FROM bot_settings WHERE key = ?').run(key);
}

export function applyPrefixSettings(): void {
    const saved = getSetting('prefix');
    if (saved) {
        try {
            const list = JSON.parse(saved);
            if (Array.isArray(list) && list.length) (global as any).prefix = list;
        } catch {}
    }
    (global as any).noPrefix = getSetting('noprefix') === '1';
}

function migrateUsers(): void {
    const cols = (db.prepare('PRAGMA table_info(users)').all() as any[]).map((c) => c.name);
    if (!cols.includes('bank')) db.exec('ALTER TABLE users ADD COLUMN bank INTEGER DEFAULT 0');
    if (!cols.includes('lid')) db.exec("ALTER TABLE users ADD COLUMN lid TEXT DEFAULT ''");
    db.exec('CREATE INDEX IF NOT EXISTS idx_users_lid ON users (lid)');

    const lidRows = db.prepare("SELECT jid FROM users WHERE jid LIKE '%@lid'").all() as any[];
    for (const row of lidRows) {
        try {
            const id = resolveUserIdentity(row.jid);
            if (id.jid !== row.jid) absorbUser(row.jid, id.jid, id.lid);
        } catch (error) {
            console.error('[USERS MIGRATE]', row.jid, error);
        }
    }
}

function reverseLid(phoneJid: string): string {
    for (const [lid, pn] of lidCache) {
        if (pn === phoneJid) return `${lid}@lid`;
    }
    return '';
}

export function resolveUserIdentity(jid: string): { jid: string; lid: string } {
    const clean = decodeJid(String(jid || ''));
    const m = clean.match(LID_RE);

    if (m) {
        const lid = `${m[1]}@lid`;
        let phone = '';
        try { phone = UserJid(null, '', lid); } catch {}
        if (phone.endsWith('@s.whatsapp.net')) return { jid: phone, lid };

        const row = db.prepare("SELECT jid FROM users WHERE lid = ? ORDER BY jid LIKE '%@lid' LIMIT 1").get(lid) as any;
        return { jid: row?.jid || lid, lid };
    }

    return { jid: clean, lid: '' };
}

function absorbUser(from: string, to: string, lid: string): void {
    if (from === to) return;
    const src = db.prepare('SELECT * FROM users WHERE jid = ?').get(from) as any;
    if (!src) return;
    const dst = db.prepare('SELECT * FROM users WHERE jid = ?').get(to) as any;

    db.exec('SAVEPOINT absorb_user');
    try {
        if (!dst) {
            db.prepare('INSERT INTO users (jid, name, yen, bank, banned, lid) VALUES (?, ?, ?, ?, ?, ?)')
                .run(to, src.name || '', src.yen || 0, src.bank || 0, src.banned || 0, lid || src.lid || '');
        } else {
            db.prepare('UPDATE users SET name = ?, yen = ?, bank = ?, banned = ?, lid = ? WHERE jid = ?').run(
                dst.name || src.name || '',
                (dst.yen || 0) + (src.yen || 0),
                (dst.bank || 0) + (src.bank || 0),
                Math.max(dst.banned || 0, src.banned || 0),
                dst.lid || lid || src.lid || '',
                to
            );
        }
        db.prepare('DELETE FROM users WHERE jid = ?').run(from);

        for (const table of USER_TABLES) {
            try {
                if (table === 'message_stats') {
                    const rows = db.prepare('SELECT groupJid, message_count FROM message_stats WHERE userJid = ?').all(from) as any[];
                    for (const r of rows) {
                        db.prepare(`
                            INSERT INTO message_stats (groupJid, userJid, message_count) VALUES (?, ?, ?)
                            ON CONFLICT(groupJid, userJid) DO UPDATE SET message_count = message_count + excluded.message_count
                        `).run(r.groupJid, to, r.message_count || 0);
                    }
                    db.prepare('DELETE FROM message_stats WHERE userJid = ?').run(from);
                    continue;
                }
                db.prepare(`UPDATE OR IGNORE ${table} SET userJid = ? WHERE userJid = ?`).run(to, from);
                db.prepare(`DELETE FROM ${table} WHERE userJid = ?`).run(from);
            } catch {}
        }

        db.exec('RELEASE absorb_user');
    } catch (error) {
        db.exec('ROLLBACK TO absorb_user');
        db.exec('RELEASE absorb_user');
        throw error;
    }
}

export function getUser(jid: string) {
    const id = resolveUserIdentity(jid);
    const select = db.prepare('SELECT * FROM users WHERE jid = ?');

    if (id.lid && id.lid !== id.jid && select.get(id.lid)) {
        try { absorbUser(id.lid, id.jid, id.lid); } catch (error) { console.error('[USER MERGE]', id.lid, error); }
    }

    let user = select.get(id.jid) as any;
    const lid = id.lid || (id.jid.endsWith('@s.whatsapp.net') && !user?.lid ? reverseLid(id.jid) : '');

    if (!user) {
        db.prepare('INSERT INTO users (jid, lid) VALUES (?, ?)').run(id.jid, lid);
        user = { jid: id.jid, name: '', yen: 0, banned: 0, bank: 0, lid };
    } else if (lid && !user.lid) {
        db.prepare('UPDATE users SET lid = ? WHERE jid = ?').run(lid, id.jid);
        user.lid = lid;
    }

    return user;
}

export function updateUser(
    jid: string,
    data: Partial<{
        name: string;
        yen: number;
        bank: number;
        banned: number;
        lid: string;
    }>
) {
    const user = getUser(jid);
    const updated = { ...user, ...data };

    db.prepare(`
        UPDATE users
        SET name = ?, yen = ?, bank = ?, banned = ?, lid = ?
        WHERE jid = ?
    `).run(
        updated.name || '',
        updated.yen || 0,
        updated.bank || 0,
        updated.banned || 0,
        updated.lid || '',
        user.jid
    );

    return updated;
}

export function getGroup(jid: string) {
    const stmt = db.prepare('SELECT * FROM groups WHERE jid = ?');
    let group = stmt.get(jid) as any;

    if (!group) {
        db.prepare('INSERT INTO groups (jid) VALUES (?)').run(jid);

        group = {
            jid,
            welcome: 0,
            mute: 0
        };
    }

    return group;
}

export function incrementCommandCount() {
    db.exec(`
        INSERT INTO bot_stats (key, value)
        VALUES ('commands', 1)
        ON CONFLICT(key)
        DO UPDATE SET value = value + 1;
    `);

    const stmt = db.prepare(
        'SELECT value FROM bot_stats WHERE key = ?'
    );

    const res = stmt.get('commands') as any;

    return res ? res.value : 1;
}

export function incrementMessageCount(
    groupJid: string,
    userJid: string
) {
    if (!groupJid || !userJid) return;

    db.prepare(`
        INSERT INTO message_stats (
            groupJid,
            userJid,
            message_count
        )
        VALUES (?, ?, 1)
        ON CONFLICT(groupJid, userJid)
        DO UPDATE SET message_count = message_count + 1
    `).run(groupJid, userJid);
}

export function getTopActive(
    groupJid: string,
    limit: number = 30
) {
    const safeLimit = Math.max(
        1,
        Math.min(Number(limit) || 30, 100)
    );

    const stmt = db.prepare(`
        SELECT
            userJid AS jid,
            message_count
        FROM message_stats
        WHERE groupJid = ?
        ORDER BY message_count DESC
        LIMIT ?
    `);

    return stmt.all(groupJid, safeLimit) as any[];
}

export function getWarnings(
    groupJid: string,
    userJid: string
): number {
    const stmt = db.prepare(`
        SELECT count
        FROM warnings
        WHERE groupJid = ?
        AND userJid = ?
    `);

    const result = stmt.get(
        groupJid,
        userJid
    ) as any;

    return result ? result.count : 0;
}

export function addWarning(
    groupJid: string,
    userJid: string
): number {
    const current = getWarnings(
        groupJid,
        userJid
    );

    const next = current + 1;

    if (current === 0) {
        db.prepare(`
            INSERT INTO warnings (
                groupJid,
                userJid,
                count
            )
            VALUES (?, ?, ?)
        `).run(
            groupJid,
            userJid,
            next
        );
    } else {
        db.prepare(`
            UPDATE warnings
            SET count = ?,
                timestamp = CURRENT_TIMESTAMP
            WHERE groupJid = ?
            AND userJid = ?
        `).run(
            next,
            groupJid,
            userJid
        );
    }

    return next;
}

export function removeWarning(
    groupJid: string,
    userJid: string
): number {
    const current = getWarnings(
        groupJid,
        userJid
    );

    if (current <= 0) return 0;

    const next = current - 1;

    if (next === 0) {
        db.prepare(`
            DELETE FROM warnings
            WHERE groupJid = ?
            AND userJid = ?
        `).run(
            groupJid,
            userJid
        );
    } else {
        db.prepare(`
            UPDATE warnings
            SET count = ?,
                timestamp = CURRENT_TIMESTAMP
            WHERE groupJid = ?
            AND userJid = ?
        `).run(
            next,
            groupJid,
            userJid
        );
    }

    return next;
}

export function resetWarnings(
    groupJid: string,
    userJid: string
): number {
    db.prepare(`
        DELETE FROM warnings
        WHERE groupJid = ?
        AND userJid = ?
    `).run(
        groupJid,
        userJid
    );

    return 0;
}

export function getCooldown(userJid: string, action: string): number {
    const row = db
        .prepare('SELECT until_time FROM economy_cooldowns WHERE userJid = ? AND action = ?')
        .get(userJid, action) as any;
    return row ? Number(row.until_time) : 0;
}

export function setCooldown(userJid: string, action: string, untilTime: number): void {
    db.prepare(`
        INSERT INTO economy_cooldowns (userJid, action, until_time)
        VALUES (?, ?, ?)
        ON CONFLICT(userJid, action) DO UPDATE SET until_time = excluded.until_time
    `).run(userJid, action, untilTime);
}

export function getSubBotConfig(phone: string) {
    const stmt = db.prepare('SELECT * FROM subbot_config WHERE phone = ?');
    return stmt.get(phone) as any;
}

export function setSubBotConfig(
    phone: string,
    data: Partial<{
        name: string;
        banner: string;
        owner_jid: string;
    }>
) {
    const existing = getSubBotConfig(phone);

    if (!existing) {
        if (!data.owner_jid) {
            throw new Error('owner_jid es requerido al crear nueva configuración');
        }
        db.prepare(`
            INSERT INTO subbot_config (phone, name, banner, owner_jid)
            VALUES (?, ?, ?, ?)
        `).run(phone, data.name || null, data.banner || null, data.owner_jid);
    } else {
        db.prepare(`
            UPDATE subbot_config
            SET name = COALESCE(?, name),
                banner = COALESCE(?, banner),
                updated_at = CURRENT_TIMESTAMP
            WHERE phone = ?
        `).run(
            data.name || null,
            data.banner || null,
            phone
        );
    }

    return getSubBotConfig(phone);
}

export function updateSubBotName(phone: string, name: string) {
    const existing = getSubBotConfig(phone);
    if (!existing) {
        throw new Error('Configuración de subbot no encontrada');
    }
    db.prepare(`
        UPDATE subbot_config
        SET name = ?, updated_at = CURRENT_TIMESTAMP
        WHERE phone = ?
    `).run(name, phone);
    return getSubBotConfig(phone);
}

export function updateSubBotBanner(phone: string, banner: string) {
    const existing = getSubBotConfig(phone);
    if (!existing) {
        throw new Error('Configuración de subbot no encontrada');
    }
    db.prepare(`
        UPDATE subbot_config
        SET banner = ?, updated_at = CURRENT_TIMESTAMP
        WHERE phone = ?
    `).run(banner, phone);
    return getSubBotConfig(phone);
}

export { db };
