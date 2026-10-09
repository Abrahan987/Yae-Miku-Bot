import { getWarnings, removeWarning, resetWarnings } from '#db';

export const command = ['delwarn'];
export const category = 'group';
export const description = 'Eliminar una advertencia de un miembro del grupo.';
export const admin = true;

export default async function (sock: any, msg: any, extra: any) {
    const targetId = msg.mentionedJid?.[0] || msg.quoted?.sender;
    
    if (!targetId) {
        return msg.reply('《✧》 Debes mencionar o responder al usuario cuya advertencia deseas eliminar.');
    }
    
    try {
        const total = getWarnings(msg.from, targetId);
        const userName = targetId.split('@')[0];
        
        if (total === 0) {
            return msg.reply(`《✧》 El usuario @${userName} no tiene advertencias registradas.`);
        }
        
        if (extra.args[0]?.toLowerCase() === 'all') {
            resetWarnings(msg.from, targetId);
            return msg.reply(`✐ Se han eliminado todas las advertencias del usuario @${userName}.`);
        }
        
        const newCount = removeWarning(msg.from, targetId);
        msg.reply(`ꕥ Se ha eliminado una advertencia del usuario @${userName}. Advertencias actuales: ${newCount}`);
    } catch (e: any) {
        return msg.reply(`Error: ${e.message}`);
    }
}