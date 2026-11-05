import fs from 'fs';
import path from 'path';
import { UserJid } from '#simple';
import { isOwner } from './perms.ts';
import { getSubBotConfig as getSubBotConfigDB, setSubBotConfig as setSubBotConfigDB, updateSubBotName as updateSubBotNameDB, updateSubBotBanner as updateSubBotBannerDB } from './database.ts';

const normalizePhone = (input: string): string => {
    let s = String(input).replace(/\D/g, '');
    if (!s) return '';
    if (s.startsWith('0')) s = s.replace(/^0+/, '');
    if (s.length === 10 && s.startsWith('3')) s = '57' + s;
    if (s.startsWith('52') && !s.startsWith('521') && s.length >= 12) s = '521' + s.slice(2);
    if (s.startsWith('54') && !s.startsWith('549') && s.length >= 11) s = '549' + s.slice(2);
    return s;
};

const cleanJid = (jid: string = ''): string => {
    return jid.replace(/:\d+/, '').split('@')[0];
};

export function initializeSubBotConfig(phone: string, ownerJid: string) {
    const normalizedPhone = normalizePhone(phone);
    const ownerNumber = cleanJid(ownerJid) || normalizedPhone;

    try {
        const existing = getSubBotConfigDB(normalizedPhone);
        if (existing) {
            return existing;
        }

        return setSubBotConfigDB(normalizedPhone, {
            owner_jid: ownerNumber
        });
    } catch (error) {
        console.error('[SUBBOT_CONFIG_INIT]', normalizedPhone, error);
        return null;
    }
}

export function getSubBotName(phone: string): string | null {
    try {
        const normalized = normalizePhone(phone);
        const config = getSubBotConfigDB(normalized);
        return config?.name || null;
    } catch (error) {
        console.error('[SUBBOT_CONFIG_GET_NAME]', phone, error);
        return null;
    }
}

export function getSubBotBanner(phone: string): string | null {
    try {
        const normalized = normalizePhone(phone);
        const config = getSubBotConfigDB(normalized);
        return config?.banner || null;
    } catch (error) {
        console.error('[SUBBOT_CONFIG_GET_BANNER]', phone, error);
        return null;
    }
}

const digits = (x: any): string => String(x || '').split('@')[0].split(':')[0].replace(/\D/g, '');

export function canModifySubBot(phone: string, userJid: string): boolean {
    try {
        const normalized = normalizePhone(phone);
        const config = getSubBotConfigDB(normalized);
        if (!config) return false;
        const userNumber = digits(userJid);
        if (!userNumber) return false;
        let ownerResolved = '';
        try { ownerResolved = digits(UserJid(null, '', `${digits(config.owner_jid)}@lid`)); } catch {}
        return userNumber === digits(config.owner_jid) || userNumber === normalized || (!!ownerResolved && userNumber === ownerResolved);
    } catch (error) {
        console.error('[SUBBOT_CONFIG_CAN_MODIFY]', phone, error);
        return false;
    }
}

export function isSubBotOwner(sock: any, msg: any, rawMsg: any, phone: string): boolean {
    try {
        if (rawMsg?.key?.fromMe) return true;
        if (isOwner(sock, msg, rawMsg)) return true;

        const sender = String(msg?.sender || rawMsg?.key?.participant || rawMsg?.key?.remoteJid || '');
        let resolved = sender;
        try {
            resolved = UserJid(sock, msg?.from, sender) || sender;
        } catch {}

        const key = rawMsg?.key || {};
        const candidates = [sender, resolved, key.participant, key.participantPn, key.participantAlt, key.remoteJidAlt]
            .map(digits)
            .filter(Boolean);
        const own = [sock?.user?.id, sock?.user?.lid].map(digits).filter(Boolean);
        if (candidates.some((n) => own.includes(n))) return true;

        return candidates.some((n) => canModifySubBot(phone, n));
    } catch (error) {
        console.error('[SUBBOT_CONFIG_IS_OWNER]', phone, error);
        return false;
    }
}

export function setSubBotName(phone: string, name: string) {
    try {
        const normalized = normalizePhone(phone);
        const trimmed = name.trim();
        if (!trimmed) throw new Error('El nombre no puede estar vacío');
        if (trimmed.length > 100) throw new Error('El nombre es muy largo (máx. 100 caracteres)');
        return updateSubBotNameDB(normalized, trimmed);
    } catch (error) {
        console.error('[SUBBOT_CONFIG_SET_NAME]', phone, error);
        throw error;
    }
}

export function setSubBotBanner(phone: string, bannerUrl: string) {
    try {
        const normalized = normalizePhone(phone);
        const trimmed = bannerUrl.trim();
        if (!trimmed) throw new Error('La URL del banner no puede estar vacía');
        if (!isValidUrl(trimmed)) throw new Error('La URL del banner no es válida');
        if (trimmed.length > 500) throw new Error('La URL del banner es muy larga');
        return updateSubBotBannerDB(normalized, trimmed);
    } catch (error) {
        console.error('[SUBBOT_CONFIG_SET_BANNER]', phone, error);
        throw error;
    }
}

function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

export function getSubBotConfiguration(phone: string) {
    try {
        const normalized = normalizePhone(phone);
        return getSubBotConfigDB(normalized);
    } catch (error) {
        console.error('[SUBBOT_CONFIG_GET]', phone, error);
        return null;
    }
}


const bannersDir = path.join(process.cwd(), 'banners');

export function setSubBotBannerImage(phone: string, buffer: Buffer) {
    const normalized = normalizePhone(phone);
    if (!getSubBotConfigDB(normalized)) throw new Error('Configuración de subbot no encontrada');
    fs.mkdirSync(bannersDir, { recursive: true });
    const file = path.join(bannersDir, `${normalized}.jpg`);
    fs.writeFileSync(file, buffer);
    return updateSubBotBannerDB(normalized, `file:${file}`);
}

export function getBotPhone(sock: any): string {
    return sock?.subbotPhone ? normalizePhone(sock.subbotPhone) : '';
}

export function resolveBotName(sock: any, fallback: string): string {
    const phone = getBotPhone(sock);
    if (!phone) return fallback;
    return getSubBotName(phone) || fallback;
}

export function resolveBotBanner(sock: any, fallback: string | undefined): { url?: string; buffer?: Buffer } | null {
    const phone = getBotPhone(sock);
    const banner = phone ? getSubBotBanner(phone) : null;
    if (banner) {
        if (banner.startsWith('file:')) {
            try {
                return { buffer: fs.readFileSync(banner.slice(5)) };
            } catch {}
        } else {
            return { url: banner };
        }
    }
    return fallback ? { url: fallback } : null;
}

export async function getImageFromMessage(msg: any): Promise<Buffer | null> {
    try {
        if (msg?.type === 'imageMessage') return (await msg.download()) || null;
        if (msg?.quoted?.type === 'imageMessage') return (await msg.quoted.download()) || null;
    } catch {}
    return null;
}

export function isHttpUrl(url: string): boolean {
    try {
        const u = new URL(url);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
        return false;
    }
}
