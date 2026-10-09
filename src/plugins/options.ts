import { getGroup } from '#db';

export const command = ['welcome', 'bienvenida', 'goodbye', 'despedida', 'alerts', 'alertas', 'nsfw', 'antilink', 'antienlaces', 'antilinks', 'antistatus', 'antiestados', 'rpg', 'economy', 'economia', 'gacha'];
export const category = 'group';
export const description = 'Configurar opciones del grupo.';
export const admin = true;

export default async function (sock: any, msg: any, extra: any) {
    let chatData = getGroup(msg.from);
    const stateArg = extra.args[0]?.toLowerCase();
    const validStates = ['on', 'off', 'enable', 'disable'];
    
    const mapTerms: {[key: string]: string} = {
        antilinks: 'antilinks',
        antienlaces: 'antilinks',
        antilink: 'antilinks',
        antistatus: 'antistatus',
        antiestados: 'antistatus',
        welcome: 'welcome',
        bienvenida: 'welcome',
        goodbye: 'goodbye',
        despedida: 'goodbye',
        alerts: 'alerts',
        alertas: 'alerts',
        economy: 'economy',
        economia: 'economy',
        adminonly: 'adminonly',
        onlyadmin: 'adminonly',
        nsfw: 'nsfw',
        rpg: 'gacha',
        gacha: 'gacha'
    };
    
    const featureNames: {[key: string]: string} = {
        antilinks: 'el *AntiEnlace*',
        antistatus: 'el *AntiEstado*',
        welcome: 'el mensaje de *Bienvenida*',
        goodbye: 'el mensaje de *Despedida*',
        alerts: 'las *Alertas*',
        economy: 'los comandos de *Economía*',
        gacha: 'los comandos de *Gacha*',
        adminonly: 'el modo *Solo Admin*',
        nsfw: 'los comandos *NSFW*'
    };
    
    const normalizedKey = mapTerms[extra.command] || extra.command;
    const nombreBonito = featureNames[normalizedKey] || `la función *${normalizedKey}*`;
    
    if (!stateArg) {
        return msg.reply(`*✩ ${extra.command} (✿❛◡❛)*\n\nꕥ Un administrador puede activar o desactivar ${nombreBonito} utilizando:\n\n● _Habilitar ›_ *${extra.command} on*\n● _Deshabilitar ›_ *${extra.command} off*`);
    }
    
    if (!validStates.includes(stateArg)) {
        return msg.reply(`✎ Estado no válido. Usa *on*, *off*, *enable* o *disable*\n\nEjemplo:\n${extra.command} enable`);
    }
    
    const enabled = ['on', 'enable'].includes(stateArg);
    msg.reply(`✎ Has *${enabled ? 'activado' : 'desactivado'}* ${nombreBonito}.`);
}