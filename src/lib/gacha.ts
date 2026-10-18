import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, getUser, updateUser, getCooldown, setCooldown, getGroup } from './database.ts';
import { UserJid, decodeJid } from './simple.ts';

db.exec(`
    CREATE TABLE IF NOT EXISTS gacha_settings (
        chatId TEXT PRIMARY KEY,
        enabled INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS gacha_chars (
        charId TEXT PRIMARY KEY,
        value INTEGER NOT NULL,
        votes INTEGER DEFAULT 0,
        lastVotedAt INTEGER DEFAULT 0,
        dayKey TEXT DEFAULT '',
        dayInc INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS gacha_claims (
        chatId TEXT NOT NULL,
        charId TEXT NOT NULL,
        userJid TEXT NOT NULL,
        claimedAt INTEGER NOT NULL,
        PRIMARY KEY (chatId, charId)
    );

    CREATE INDEX IF NOT EXISTS idx_gacha_claims_user ON gacha_claims (chatId, userJid);

    CREATE TABLE IF NOT EXISTS gacha_sales (
        chatId TEXT NOT NULL,
        charId TEXT NOT NULL,
        sellerJid TEXT NOT NULL,
        price INTEGER NOT NULL,
        createdAt INTEGER NOT NULL,
        PRIMARY KEY (chatId, charId)
    );

    CREATE TABLE IF NOT EXISTS gacha_users (
        chatId TEXT NOT NULL,
        userJid TEXT NOT NULL,
        favorite TEXT DEFAULT '',
        PRIMARY KEY (chatId, userJid)
    );

    CREATE TABLE IF NOT EXISTS gacha_profile (
        userJid TEXT PRIMARY KEY,
        claimMessage TEXT DEFAULT ''
    );
`);

export interface Char {
    id: string;
    name: string;
    gender: string;
    tags: string[];
    value: number;
    seriesId: string;
    seriesName: string;
}

export interface Series {
    id: string;
    name: string;
    tags: string[];
    characters: Char[];
}

interface Catalog {
    all: Char[];
    byId: Map<string, Char>;
    series: Series[];
}

export interface Claim {
    chatId: string;
    charId: string;
    userJid: string;
    claimedAt: number;
}

export interface Sale {
    chatId: string;
    charId: string;
    sellerJid: string;
    price: number;
    createdAt: number;
}

export interface CharRow {
    charId: string;
    value: number;
    votes: number;
    lastVotedAt: number;
    dayKey: string;
    dayInc: number;
}

const CHAR_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'characters.json');

let catalog: Catalog | null = null;
let catalogMtime = 0;

export function getCatalog(): Catalog {
    let mtime: number;
    try {
        mtime = fs.statSync(CHAR_FILE).mtimeMs;
    } catch {
        throw new Error('No se encontró src/lib/characters.json');
    }

    if (catalog && mtime === catalogMtime) return catalog;

    const raw = JSON.parse(fs.readFileSync(CHAR_FILE, 'utf-8'));
    const series: Series[] = [];
    const all: Char[] = [];
    const byId = new Map<string, Char>();

    for (const [seriesId, s] of Object.entries<any>(raw)) {
        const serie: Series = {
            id: seriesId,
            name: String(s?.name || seriesId),
            tags: Array.isArray(s?.tags) ? s.tags.map(String) : [],
            characters: []
        };

        for (const c of Array.isArray(s?.characters) ? s.characters : []) {
            const char: Char = {
                id: String(c.id),
                name: String(c.name ?? 'Sin nombre'),
                gender: String(c.gender || 'Desconocido'),
                tags: Array.isArray(c.tags) ? c.tags.map(String) : [],
                value: Number(c.value) || 100,
                seriesId,
                seriesName: serie.name
            };
            serie.characters.push(char);
            all.push(char);
            byId.set(char.id, char);
        }

        series.push(serie);
    }

    catalog = { all, byId, series };
    catalogMtime = mtime;
    return catalog;
}

const norm = (s: string) => String(s || '').trim().toLowerCase();

export function findCharacter(query: string, pool?: Char[]): Char | undefined {
    const q = norm(query);
    if (!q) return undefined;

    const list = pool ?? getCatalog().all;
    const words = q.split(/\s+/).filter((w) => w.length >= 3);
    const hit = (c: Char, term: string) =>
        norm(c.name).includes(term) || c.tags.some((t) => t.toLowerCase().includes(term));

    return (
        list.find((c) => norm(c.name) === q) ||
        list.find((c) => hit(c, q)) ||
        list.find((c) => words.some((w) => hit(c, w)))
    );
}

export function findSeries(query: string): Series | undefined {
    const q = norm(query);
    if (!q) return undefined;

    const { series } = getCatalog();
    const words = q.split(/\s+/).filter((w) => w.length >= 2);
    const hit = (s: Series, term: string) =>
        norm(s.name).includes(term) || s.tags.some((t) => t.toLowerCase().includes(term));

    return series.find((s) => hit(s, q)) || series.find((s) => words.some((w) => hit(s, w)));
}

export function getCharRow(charId: string): CharRow | undefined {
    return db.prepare('SELECT * FROM gacha_chars WHERE charId = ?').get(charId) as any;
}

export function saveCharRow(row: CharRow): void {
    db.prepare(`
        INSERT INTO gacha_chars (charId, value, votes, lastVotedAt, dayKey, dayInc)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(charId) DO UPDATE SET
            value = excluded.value,
            votes = excluded.votes,
            lastVotedAt = excluded.lastVotedAt,
            dayKey = excluded.dayKey,
            dayInc = excluded.dayInc
    `).run(row.charId, row.value, row.votes, row.lastVotedAt, row.dayKey, row.dayInc);
}

export function valueMap(): Map<string, number> {
    const rows = db.prepare('SELECT charId, value FROM gacha_chars').all() as any[];
    return new Map(rows.map((r) => [String(r.charId), Number(r.value)]));
}

export function charValue(char: Char): number {
    const row = getCharRow(char.id);
    return row ? Number(row.value) : char.value;
}

export function isGachaEnabled(chatId: string): boolean {
    const row = db.prepare('SELECT enabled FROM gacha_settings WHERE chatId = ?').get(chatId) as any;
    return row ? Number(row.enabled) === 1 : true;
}

export function setGachaEnabled(chatId: string, enabled: boolean): void {
    db.prepare(`
        INSERT INTO gacha_settings (chatId, enabled) VALUES (?, ?)
        ON CONFLICT(chatId) DO UPDATE SET enabled = excluded.enabled
    `).run(chatId, enabled ? 1 : 0);
}

export function getClaim(chatId: string, charId: string): Claim | undefined {
    return db.prepare('SELECT * FROM gacha_claims WHERE chatId = ? AND charId = ?').get(chatId, charId) as any;
}

export function getHarem(chatId: string, userJid: string): Claim[] {
    return db.prepare('SELECT * FROM gacha_claims WHERE chatId = ? AND userJid = ?').all(chatId, userJid) as any[];
}

export function getChatClaims(chatId: string): Map<string, string> {
    const rows = db.prepare('SELECT charId, userJid FROM gacha_claims WHERE chatId = ?').all(chatId) as any[];
    return new Map(rows.map((r) => [String(r.charId), String(r.userJid)]));
}

export function setClaim(chatId: string, charId: string, userJid: string): void {
    db.prepare(`
        INSERT INTO gacha_claims (chatId, charId, userJid, claimedAt) VALUES (?, ?, ?, ?)
        ON CONFLICT(chatId, charId) DO UPDATE SET userJid = excluded.userJid, claimedAt = excluded.claimedAt
    `).run(chatId, charId, userJid, Date.now());
}

function clearFavoriteIf(chatId: string, userJid: string, charId: string): void {
    db.prepare(`UPDATE gacha_users SET favorite = '' WHERE chatId = ? AND userJid = ? AND favorite = ?`)
        .run(chatId, userJid, charId);
}

export function transferClaim(chatId: string, charId: string, toJid: string): void {
    const current = getClaim(chatId, charId);
    if (current) clearFavoriteIf(chatId, current.userJid, charId);
    db.prepare('DELETE FROM gacha_sales WHERE chatId = ? AND charId = ?').run(chatId, charId);
    setClaim(chatId, charId, toJid);
}

export function removeClaim(chatId: string, charId: string): void {
    const current = getClaim(chatId, charId);
    if (current) clearFavoriteIf(chatId, current.userJid, charId);
    db.prepare('DELETE FROM gacha_sales WHERE chatId = ? AND charId = ?').run(chatId, charId);
    db.prepare('DELETE FROM gacha_claims WHERE chatId = ? AND charId = ?').run(chatId, charId);
}

export function getFavorite(chatId: string, userJid: string): string {
    const row = db.prepare('SELECT favorite FROM gacha_users WHERE chatId = ? AND userJid = ?').get(chatId, userJid) as any;
    return row?.favorite ? String(row.favorite) : '';
}

export function setFavorite(chatId: string, userJid: string, charId: string): void {
    db.prepare(`
        INSERT INTO gacha_users (chatId, userJid, favorite) VALUES (?, ?, ?)
        ON CONFLICT(chatId, userJid) DO UPDATE SET favorite = excluded.favorite
    `).run(chatId, userJid, charId);
}

export function getFavoriteCounts(chatId: string): Map<string, number> {
    const rows = db.prepare(`
        SELECT favorite, COUNT(*) AS total FROM gacha_users
        WHERE chatId = ? AND favorite != '' GROUP BY favorite
    `).all(chatId) as any[];
    return new Map(rows.map((r) => [String(r.favorite), Number(r.total)]));
}

export const SALE_TTL = 3 * 24 * 60 * 60 * 1000;

export function getSales(chatId: string): Sale[] {
    db.prepare('DELETE FROM gacha_sales WHERE chatId = ? AND createdAt < ?').run(chatId, Date.now() - SALE_TTL);
    return db.prepare('SELECT * FROM gacha_sales WHERE chatId = ? ORDER BY createdAt DESC').all(chatId) as any[];
}

export function getSale(chatId: string, charId: string): Sale | undefined {
    return getSales(chatId).find((s) => s.charId === charId);
}

export function putSale(chatId: string, charId: string, sellerJid: string, price: number): void {
    db.prepare(`
        INSERT INTO gacha_sales (chatId, charId, sellerJid, price, createdAt) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(chatId, charId) DO UPDATE SET sellerJid = excluded.sellerJid, price = excluded.price, createdAt = excluded.createdAt
    `).run(chatId, charId, sellerJid, price, Date.now());
}

export function removeSale(chatId: string, charId: string): void {
    db.prepare('DELETE FROM gacha_sales WHERE chatId = ? AND charId = ?').run(chatId, charId);
}

export function getClaimMessage(userJid: string): string {
    const row = db.prepare('SELECT claimMessage FROM gacha_profile WHERE userJid = ?').get(userJid) as any;
    return row?.claimMessage ? String(row.claimMessage) : '';
}

export function setClaimMessage(userJid: string, message: string): void {
    db.prepare(`
        INSERT INTO gacha_profile (userJid, claimMessage) VALUES (?, ?)
        ON CONFLICT(userJid) DO UPDATE SET claimMessage = excluded.claimMessage
    `).run(userJid, message);
}

export function transaction<T>(fn: () => T): T {
    db.exec('BEGIN IMMEDIATE');
    try {
        const result = fn();
        db.exec('COMMIT');
        return result;
    } catch (error) {
        db.exec('ROLLBACK');
        throw error;
    }
}

export function getYen(jid: string): number {
    return Number(getUser(jid).yen) || 0;
}

export function addYen(jid: string, amount: number): void {
    updateUser(jid, { yen: getYen(jid) + amount });
}

export function displayName(jid: string): string {
    try {
        const row = db.prepare('SELECT name FROM users WHERE jid = ?').get(jid) as any;
        const name = String(row?.name || '').trim();
        if (name) return name;
    } catch {}
    return String(jid).split('@')[0];
}

const MONO_UPPER = 0x1d670;
const MONO_DIGIT = 0x1d7f6;

export function mono(text: string): string {
    return Array.from(String(text).toUpperCase())
        .map((ch) => {
            const code = ch.charCodeAt(0);
            if (code >= 65 && code <= 90) return String.fromCodePoint(MONO_UPPER + (code - 65));
            if (code >= 48 && code <= 57) return String.fromCodePoint(MONO_DIGIT + (code - 48));
            return ch;
        })
        .join('');
}

export const y = (title: string, body: string) =>
    `${(global as any).namebot}\n\n🍓͜ᩧ𑂳ᰍ  ${mono(title)}\n\n🪷 ${body}\n\nꨄ︎ ${(global as any).nmcreador}`;

export function fmtTime(ms: number): string {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const parts: string[] = [];
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    if (s || !parts.length) parts.push(`${s}s`);
    return parts.join(' ');
}

export function paginate<T>(list: T[], page: number, perPage: number) {
    const totalPages = Math.max(1, Math.ceil(list.length / perPage));
    if (!Number.isInteger(page) || page < 1 || page > totalPages) return null;
    return { items: list.slice((page - 1) * perPage, page * perPage), page, totalPages };
}

export function pageArg(args: string[]): number {
    const last = args[args.length - 1];
    return last && /^\d+$/.test(last) ? parseInt(last, 10) : 1;
}

export function afterCommand(extra: any): string {
    const text = String(extra.text || '');
    const index = text.toLowerCase().indexOf(String(extra.command || ''));
    return index === -1 ? '' : text.slice(index + String(extra.command).length).trim();
}

export function stripMentions(text: string): string {
    return text.replace(/@\d{5,}/g, '').replace(/\s+/g, ' ').trim();
}

export function resolveTarget(sock: any, msg: any): string | null {
    const raw = msg.mentionedJid?.[0];
    if (raw) return UserJid(sock, msg.from, decodeJid(raw));
    return msg.quoted?.sender || null;
}

export function findInHarem(chatId: string, userJid: string, query: string, exact = false): Char | undefined {
    const { byId } = getCatalog();
    const pool = getHarem(chatId, userJid)
        .map((c) => byId.get(c.charId))
        .filter(Boolean) as Char[];

    if (exact) {
        const q = norm(query);
        return pool.find((c) => norm(c.name) === q);
    }

    return findCharacter(query, pool);
}

export const cd = {
    roll: (chatId: string) => `gacha:roll:${chatId}`,
    claim: (chatId: string) => `gacha:claim:${chatId}`,
    rob: (chatId: string) => `gacha:rob:${chatId}`,
    robVictim: (chatId: string, target: string) => `gacha:robv:${chatId}:${target}`,
    vote: 'gacha:vote'
};

export function cdLeft(userJid: string, key: string): number {
    return Math.max(0, getCooldown(userJid, key) - Date.now());
}

export function cdSet(userJid: string, key: string, durationMs: number): void {
    setCooldown(userJid, key, Date.now() + durationMs);
}

interface RollEntry {
    charId: string;
    rollerJid: string;
    createdAt: number;
    reservedUntil: number;
    expiresAt: number;
    claimed: boolean;
}

const rolls = new Map<string, RollEntry>();

export function registerRoll(chatId: string, msgId: string, entry: RollEntry): void {
    const now = Date.now();
    for (const [key, value] of rolls) {
        if (value.expiresAt + 60000 < now) rolls.delete(key);
    }
    rolls.set(`${chatId}:${msgId}`, entry);
}

export function getRoll(chatId: string, msgId: string): RollEntry | undefined {
    return rolls.get(`${chatId}:${msgId}`);
}

const lastSeen = new Map<string, number>();

export function touchUser(chatId: string, jid: string): void {
    const key = `${chatId}:${jid}`;
    lastSeen.delete(key);
    lastSeen.set(key, Date.now());
    if (lastSeen.size > 20000) lastSeen.delete(lastSeen.keys().next().value as string);
}

export function lastSeenAt(chatId: string, jid: string): number {
    return lastSeen.get(`${chatId}:${jid}`) || 0;
}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const imageCache = new Map<string, { urls: string[]; expires: number }>();

function refererFor(url: string): string {
    if (url.includes('safebooru.org')) return 'https://safebooru.org/';
    if (url.includes('donmai.us')) return 'https://danbooru.donmai.us/';
    if (url.includes('gelbooru.com')) return 'https://gelbooru.com/';
    return '';
}

function extractUrls(json: any): string[] {
    const data = Array.isArray(json) ? json : json?.post || json?.data || [];
    const urls: string[] = [];

    for (const item of Array.isArray(data) ? data : []) {
        const candidate =
            item?.file_url ||
            item?.large_file_url ||
            (item?.directory && item?.image ? `https://safebooru.org/images/${item.directory}/${item.image}` : '') ||
            item?.media_asset?.variants?.[0]?.url;

        if (typeof candidate === 'string' && /^https?:\/\/.+\.(jpe?g|png)$/i.test(candidate)) urls.push(candidate);
    }

    return urls;
}

export async function findImages(tag: string): Promise<string[]> {
    const query = String(tag || '').trim().toLowerCase().replace(/\s+/g, '_');
    if (!query) return [];

    const cached = imageCache.get(query);
    if (cached && cached.expires > Date.now()) return cached.urls;

    const gelbooruKey = (global as any).gelbooruKey;
    const gelbooruUser = (global as any).gelbooruUser;

    const sources = [
        `https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=${encodeURIComponent(query)}`,
        `https://danbooru.donmai.us/posts.json?tags=${encodeURIComponent(`${query} rating:g`)}`
    ];

    if (gelbooruKey && gelbooruUser) {
        sources.push(
            `https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=${encodeURIComponent(`${query} rating:general`)}&api_key=${gelbooruKey}&user_id=${gelbooruUser}`
        );
    }

    for (const url of sources) {
        try {
            const res = await fetch(url, {
                headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
                signal: AbortSignal.timeout(8000)
            });
            const type = res.headers.get('content-type') || '';
            if (!res.ok || !type.includes('json')) continue;

            const urls = extractUrls(await res.json());
            if (urls.length) {
                imageCache.set(query, { urls, expires: Date.now() + 60 * 60 * 1000 });
                if (imageCache.size > 500) imageCache.delete(imageCache.keys().next().value as string);
                return urls;
            }
        } catch {}
    }

    return [];
}

export async function getCharImage(tag: string): Promise<Buffer | null> {
    const urls = await findImages(tag);
    if (!urls.length) return null;

    const pool = [...urls].sort(() => Math.random() - 0.5).slice(0, 3);

    for (const url of pool) {
        try {
            const res = await fetch(url, {
                headers: { 'User-Agent': USER_AGENT, Referer: refererFor(url) },
                signal: AbortSignal.timeout(15000)
            });
            if (!res.ok) continue;
            const buffer = Buffer.from(await res.arrayBuffer());
            if (buffer.length > 0 && buffer.length <= 15 * 1024 * 1024) return buffer;
        } catch {}
    }

    return null;
}

export interface GachaContext {
    sock: any;
    msg: any;
    extra: any;
    raw: any;
    args: string[];
    chatId: string;
    userJid: string;
    reply: (title: string, body: string) => Promise<any>;
    send: (text: string, mentions?: string[]) => Promise<any>;
}

function prefixOf(): string {
    const p = (global as any).prefix;
    return (Array.isArray(p) ? p[0] : p) || '.';
}

export function withGacha(handler: (ctx: GachaContext) => Promise<any>) {
    return async (sock: any, msg: any, extra: any, _db?: any, raw?: any) => {
        if (!msg.isGroup) {
            return msg.reply(y('GACHA', 'Los comandos de *Gacha* solo funcionan en grupos.'));
        }

        if (!isGachaEnabled(msg.from)) {
            return msg.reply(
                y('GACHA', `Los comandos de *Gacha* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con:\n» *${prefixOf()}gacha on*`)
            );
        }

        const ctx: GachaContext = {
            sock,
            msg,
            extra,
            raw,
            args: extra.args || [],
            chatId: msg.from,
            userJid: msg.sender,
            reply: (title, body) => msg.reply(y(title, body)),
            send: (text, mentions = []) =>
                sock.sendMessage(msg.from, { text, mentions }, raw ? { quoted: raw } : undefined)
        };

        try {
            return await handler(ctx);
        } catch (error: any) {
            console.error(`[GACHA ${extra.command}]:`, error);
            return msg.reply(y('ERROR', `Ocurrió un error al ejecutar *${extra.command}*.\n> ${error?.message || 'Error desconocido'}`));
        }
    };
}

interface PendingTrade {
    from: string;
    to: string;
    give: string;
    get: string;
    expiresAt: number;
}

interface PendingGiveAll {
    from: string;
    to: string;
    ids: string[];
    expiresAt: number;
}

export const pendingTrades = new Map<string, PendingTrade>();
export const pendingGiveAll = new Map<string, PendingGiveAll>();

function charName(id: string): string {
    return getCatalog().byId.get(id)?.name || `ID:${id}`;
}

async function executeGiveAll(msg: any, chatId: string, data: PendingGiveAll): Promise<void> {
    let count = 0;
    let total = 0;
    const values = valueMap();
    const { byId } = getCatalog();

    transaction(() => {
        for (const id of data.ids) {
            const claim = getClaim(chatId, id);
            if (!claim || claim.userJid !== data.from) continue;
            transferClaim(chatId, id, data.to);
            count++;
            total += values.get(id) ?? byId.get(id)?.value ?? 0;
        }
    });

    await msg.reply(
        y('REGALO', `Has regalado todo tu harem a *${displayName(data.to)}*.\n\n❏ Personajes regalados: *${count}*\nⴵ Valor total: *${total.toLocaleString()}*`)
    );
}

async function executeTrade(msg: any, chatId: string, data: PendingTrade): Promise<void> {
    const claimGive = getClaim(chatId, data.give);
    const claimGet = getClaim(chatId, data.get);

    if (!claimGive || !claimGet || claimGive.userJid !== data.from || claimGet.userJid !== data.to) {
        await msg.reply(y('INTERCAMBIO', 'Uno de los personajes ya no está disponible para el intercambio.'));
        return;
    }

    transaction(() => {
        transferClaim(chatId, data.give, data.to);
        transferClaim(chatId, data.get, data.from);
    });

    await msg.reply(
        y('INTERCAMBIO', `Intercambio aceptado.\n\n✦ *${displayName(data.to)}* » ${charName(data.give)}\n✦ *${displayName(data.from)}* » ${charName(data.get)}`)
    );
}

export async function handleGachaAccept(sock: any, msg: any): Promise<boolean> {
    const chatId = msg.from;
    const key = `${chatId}:${msg.sender}`;
    const give = pendingGiveAll.get(key);
    const trade = pendingTrades.get(key);

    if (!give && !trade) return false;

    try {
        if (Number(getGroup(chatId).mute) === 1) return false;
    } catch {}

    if (!isGachaEnabled(chatId)) return false;

    const now = Date.now();

    if (give) {
        pendingGiveAll.delete(key);
        if (give.expiresAt >= now) {
            await executeGiveAll(msg, chatId, give);
            return true;
        }
    }

    if (trade) {
        pendingTrades.delete(key);
        if (trade.expiresAt >= now) {
            await executeTrade(msg, chatId, trade);
            return true;
        }
    }

    return false;
}
