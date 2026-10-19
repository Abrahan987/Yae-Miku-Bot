import { withGacha, setClaimMessage, afterCommand } from '../lib/gacha.ts';

export const command = ['setclaim', 'setclaimmsg'];
export const category = 'gacha';
export const description = 'Modificar el mensaje al reclamar un personaje.';

export default withGacha(async ({ userJid, extra, reply }) => {
    const text = afterCommand(extra);
    if (!text) {
        return reply('CLAIM', `Debes especificar un mensaje para reclamar un personaje.\n> Ejemplos:\n> ${extra.command} €user ha reclamado el personaje €character!\n> ${extra.command} €character ha sido reclamado por €user`);
    }

    if (!text.includes('€user') || !text.includes('€character')) {
        return reply('CLAIM', 'Tu mensaje debe incluir *€user* y *€character* para que funcione correctamente.');
    }

    setClaimMessage(userJid, text);
    return reply('CLAIM', 'Mensaje de reclamación modificado.');
});
