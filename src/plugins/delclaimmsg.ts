import { withGacha, setClaimMessage } from '../lib/gacha.js';

export const command = ['delclaimmsg', 'resetclaimmsg'];
export const category = 'gacha';
export const description = 'Restablecer el mensaje al reclamar un personaje.';

export default withGacha(async ({ userJid, reply }) => {
    setClaimMessage(userJid, '');
    return reply('CLAIM', 'Mensaje de reclamación restablecido.');
});
