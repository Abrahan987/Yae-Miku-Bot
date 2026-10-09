import { getGroup } from '#db';

export const command = ['setprimary'];
export const category = 'group';
export const description = 'Establecer un bot como primario del grupo.';
export const admin = true;

export default async function (sock: any, msg: any, extra: any) {
    const chat = getGroup(msg.from);
    const who = msg.mentionedJid?.[0] || msg.quoted?.sender || null;
    
    if (!who) {
        return msg.reply('《✧》 Por favor menciona un bot para convertirlo en primario.');
    }
    
    try {
        const participants = extra.participants || [];
        const isInGroup = participants.some((p: any) => p.id === who);
        
        if (!isInGroup) {
            return msg.reply('《✧》 El bot mencionado no está presente en este grupo.');
        }
        
        return msg.reply(`ꕥ Se ha establecido a @${who.split('@')[0]} como bot primario de este grupo.\n> Ahora todos los comandos de este grupo serán ejecutados por @${who.split('@')[0]}.`);
    } catch (e: any) {
        return msg.reply(`Error: ${e.message}`);
    }
}