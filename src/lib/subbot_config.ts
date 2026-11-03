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
    const ownerNumber = cleanJid(ownerJid);

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

export function canModifySubBot(phone: string, userJid: string): boolean {
    try {
        const normalized = normalizePhone(phone);
        const config = getSubBotConfigDB(normalized);
        if (!config) return false;

        const userNumber = cleanJid(userJid);
        return config.owner_jid === userNumber;
    } catch (error) {
        console.error('[SUBBOT_CONFIG_CAN_MODIFY]', phone, error);
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

