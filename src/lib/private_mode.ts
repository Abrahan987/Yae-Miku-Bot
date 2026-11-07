import { getSetting, setSetting, getSubBotConfig } from './database.ts';
import { decodeJid, UserJid } from './simple.ts';

function senderIds(sock: any, msg: any, rawMsg: any): string[] {
    const key = rawMsg?.key || {};
    const ids = msg.isGroup
        ? [key.participant, key.participantPn, key.participantAlt]
        : [key.remoteJid, key.remoteJidAlt];
    return [...new Set(ids.filter((id): id is string => typeof id === 'string' && !!id)
        .flatMap(id => [decodeJid(id), UserJid(sock, msg.from, id)])
        .filter(Boolean))];
}

function numberOf(jid: string): string {
    return jid.split('@')[0].split(':')[0].replace(/\D/g, '');
}

function phoneVariants(number: string): string[] {
    const digits = numberOf(number);
    if (!digits) return [];
    return [digits, digits.startsWith('521') ? `52${digits.slice(3)}` : digits];
}

export function isMainPrivateModeOwner(sock: any, msg: any, rawMsg: any): boolean {
    if (sock?.subbotPhone) return false;
    if (rawMsg?.key?.fromMe) return true;
    const owners = ([] as any[]).concat((global as any).owner || [])
        .flatMap(value => phoneVariants(String(value)));
    return senderIds(sock, msg, rawMsg)
        .filter(id => id.endsWith('@s.whatsapp.net'))
        .some(id => phoneVariants(id).some(number => owners.includes(number)));
}

export function isSubbotPrivateModeOwner(sock: any, msg: any, rawMsg: any, phone: string): boolean {
    if (rawMsg?.key?.fromMe) return true;
    const config = getSubBotConfig(phone);
    if (!config) return false;
    const storedOwner = numberOf(String(config.owner_jid || ''));
    const resolvedOwner = storedOwner ? UserJid(sock, msg.from, `${storedOwner}@lid`) : '';
    const ownerPhones = resolvedOwner.endsWith('@s.whatsapp.net') ? phoneVariants(resolvedOwner) : [];
    const phoneNumbers = phoneVariants(phone);
    const ownLid = decodeJid(sock?.user?.lid || '');
    return senderIds(sock, msg, rawMsg).some(id => {
        if (id === ownLid && !!ownLid) return true;
        const number = numberOf(id);
        if (!number) return false;
        if (storedOwner && number === storedOwner &&
            (id.endsWith('@s.whatsapp.net') || resolvedOwner.endsWith('@s.whatsapp.net'))) return true;
        return id.endsWith('@s.whatsapp.net') &&
            phoneVariants(id).some(value => phoneNumbers.includes(value) || ownerPhones.includes(value));
    });
}

function settingKey(sock: any): string {
    const phone = sock?.subbotPhone;
    return phone ? `private_mode:subbot:${phone}` : 'private_mode:main';
}

export function isPrivateModeEnabled(sock: any): boolean {
    return getSetting(settingKey(sock)) === '1';
}

export function setPrivateMode(sock: any, enabled: boolean): void {
    setSetting(settingKey(sock), enabled ? '1' : '0');
}
