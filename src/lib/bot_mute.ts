import { getGroup, getSetting, setSetting, db } from './database.ts';

function settingKey(sock: any, groupJid: string): string {
    const phone = String(sock?.subbotPhone || '').replace(/\D/g, '');
    if (!phone) throw new Error('No se pudo identificar la sesión del sub-bot.');
    return `bot_mute:subbot:${phone}:${groupJid}`;
}

export function isBotMuted(sock: any, groupJid: string): boolean {
    if (!sock?.subbotPhone) return Number(getGroup(groupJid).mute) === 1;
    return getSetting(settingKey(sock, groupJid)) === '1';
}

export function setBotMuted(sock: any, groupJid: string, muted: boolean): void {
    if (!sock?.subbotPhone) {
        db.prepare('UPDATE groups SET mute = ? WHERE jid = ?').run(muted ? 1 : 0, groupJid);
        return;
    }
    setSetting(settingKey(sock, groupJid), muted ? '1' : '0');
}
