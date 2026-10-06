import axios from 'axios';

const API_KEY = 'ProyectsV2';
const BASE_URL = 'https://api.stellarwa.xyz';

export const command = ['bite', 'morder'];
export const category = 'anime';
export const description = 'Muerde a alguien.';
export const admin = false;
export const botAdmin = false;

function getNombre(jid: string): string {
  return jid.split('@')[0];
}

export default async function (sock: any, msg: any, extra: any) {
  const sender = msg.sender;
  const senderName = msg.pushName || getNombre(sender);

  try {
    const mentions = msg.mentionedJid || [];
    let targetJid = mentions[0];

    if (!targetJid && msg.quoted) {
      targetJid = msg.quoted.sender;
    }

    if (!targetJid) {
      return msg.reply(
        `🧛 *MORDER*\n\n` +
        `Uso: .bite @usuario\n` +
        `O responde a su mensaje`
      );
    }

    const targetName = msg.pushName || getNombre(targetJid);

    const url = `${BASE_URL}/anime/bite?key=${API_KEY}`;
    const response = await axios.get(url, { timeout: 10000 });

    if (!response.data || !response.data.url) {
      return msg.reply(`⚠️ No pude obtener la imagen. Intenta de nuevo.`);
    }

    const gifUrl = response.data.url;

    return await sock.sendMessage(
      msg.chat,
      {
        image: { url: gifUrl },
        caption: `🧛 *${senderName}* muerde a *${targetName}*`,
        mentions: [targetJid]
      },
      { quoted: msg }
    );
  } catch (error: any) {
    console.error('[BITE ERROR]:', error.message);
    return msg.reply(`⚠️ Error al traer la imagen. Intenta de nuevo.`);
  }
}
