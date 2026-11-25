import { getGroup, getSetting } from '../lib/database.ts';
import { getPrimary } from '../lib/primary.ts';
import { isAntilinkEnabled } from '../lib/antilink.ts';
import { deco } from '../lib/perms.ts';

export const command = ['diaggrupo', 'diagnosticogrupo'];
export const category = 'admin';
export const description = 'Revisa por qué el bot puede no responder en este grupo.';
export const admin = true;
export const botAdmin = false;

const number = (jid: string): string => String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '');
const stripMexOne = (value: string): string => value.startsWith('521') ? `52${value.slice(3)}` : value;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) return msg.reply('🍓 Este diagnóstico solo funciona dentro del grupo afectado.');

    const chatId = msg.from || msg.chat;
    const primary = getPrimary(chatId);
    const currentBotNumbers = [sock.user?.id, sock.user?.lid]
        .map(number)
        .filter(Boolean)
        .flatMap(value => [value, stripMexOne(value)]);
    const primaryNumbers = [number(primary), stripMexOne(number(primary))].filter(Boolean);
    const primaryMatches = !primary || currentBotNumbers.some(value => primaryNumbers.includes(value));
    const botDisabled = Number(getGroup(chatId).mute) === 1;
    const adminOnly = getSetting(`onlyadmin:${chatId}`) === '1';
    const senderIsAdmin = Boolean(extra?.isAdmin || extra?.isOwner);
    const botIsAdmin = Boolean(extra?.isBotAdmin);
    const antlinkEnabled = isAntilinkEnabled(chatId);
    const configuredPrefixes = (global as any).prefix || '.';
    const prefix = (Array.isArray(configuredPrefixes) ? configuredPrefixes[0] : configuredPrefixes) || '.';

    const checks = [
        `🍓 Prefijo del bot: *${String(prefix)}*`,
        `📌 Instancia principal del grupo: *${primary ? `@${primary}` : 'sin asignar'}*`,
        `🤖 Esta instancia debe responder: *${primaryMatches ? 'Sí' : 'No; hay otra instancia seleccionada'}*`,
        `🔌 Bot activado en el grupo: *${botDisabled ? 'No' : 'Sí'}*`,
        `👑 Modo solo administradores: *${adminOnly ? 'Activado' : 'Desactivado'}*`,
        `🛡️ Eres administrador del grupo: *${senderIsAdmin ? 'Sí' : 'No'}*`,
        `🤖 El bot es administrador: *${botIsAdmin ? 'Sí' : 'No'}*`,
        `🔗 Antilink: *${antlinkEnabled ? 'Activado' : 'Desactivado'}*`
    ];

    const fixes: string[] = [];
    if (!primaryMatches) fixes.push(`> ${prefix}resetprimary`);
    if (botDisabled) fixes.push(`> ${prefix}bot on`);
    if (adminOnly && !senderIsAdmin) fixes.push('> Pide a un administrador que ejecute el diagnóstico o desactive Solo Admin.');
    if (!botIsAdmin) fixes.push('> Haz administrador al bot si necesitas moderación, antilink u otras funciones que lo requieran.');
    if (!fixes.length) fixes.push('> No veo un bloqueo de grupo en la configuración. Comprueba que el comando use el prefijo indicado y vuelve a probar.');

    return sock.sendMessage(
        chatId,
        {
            text: deco('𝙳𝙸𝙰𝙶𝙽𝙾́𝚂𝚃𝙸𝙲𝙾 𝙳𝙴 𝙶𝚁𝚄𝙿𝙾', `${checks.join('\n')}\n\n🪷 *Qué hacer*\n${fixes.join('\n')}`),
            ...(primary && !primaryMatches ? { mentions: [`${primary}@s.whatsapp.net`] } : {})
        },
        { quoted: msg }
    );
}
