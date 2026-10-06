import axios from 'axios';

const API_KEY = 'ProyectsV2';
const BASE_URL = 'https://api.stellarwa.xyz';

const acciones: Record<string, (from: string, to: string, genero?: string) => string> = {
  hug: (from, to) => from === to ? 'se abraza a sí mismo.' : `abraza a`,
  kiss: (from, to) => from === to ? 'se manda un beso al aire.' : `le da un beso a`,
  pat: (from, to) => from === to ? 'se acaricia la cabeza.' : `le acaricia la cabeza a`,
  slap: (from, to) => from === to ? 'se dio una bofetada a sí mismo.' : `le dio una bofetada a`,
  cuddle: (from, to) => from === to ? 'se acurruca solo.' : `se acurruca con`,
  tickle: (from, to) => from === to ? 'se hace cosquillas a sí mismo.' : `le hace cosquillas a`,
  kiss_cheek: (from, to) => from === to ? 'se besó la mejilla.' : `le besó la mejilla a`,
  punch: (from, to) => from === to ? 'se dio un puñetazo a sí mismo.' : `le dio un puñetazo a`,
  kick: (from, to) => from === to ? 'se pateó a sí mismo.' : `le pegó una patada a`,
  bite: (from, to) => from === to ? 'se mordió a sí mismo.' : `le mordió a`,
  dance: (from, to) => from === to ? 'está bailando solo.' : `está bailando con`,
  handhold: (from, to) => from === to ? 'se toma la mano a sí mismo.' : `le toma la mano a`,
  highfive: (from, to) => from === to ? 'se chocó los cinco con el espejo.' : `chocó los cinco con`,
  blush: (from, to) => from === to ? 'se sonrojó.' : `se sonrojó por`,
  smile: (from, to) => from === to ? 'está sonriendo.' : `le sonrió a`,
  wink: (from, to) => from === to ? 'le guiñó un ojo al espejo.' : `le guiñó un ojo a`,
  cry: (from, to) => from === to ? 'está llorando.' : `está llorando por`,
  angry: (from, to) => from === to ? 'está furioso.' : `está enojado con`,
  laugh: (from, to) => from === to ? 'se está riendo de algo.' : `se está burlando de`,
  pout: (from, to) => from === to ? 'está haciendo pucheros.' : `le está haciendo pucheros a`,
  happy: (from, to) => from === to ? 'está muy feliz.' : `está feliz con`,
  sad: (from, to) => from === to ? 'está triste.' : `está triste por`,
  scared: (from, to) => from === to ? 'tiene miedo.' : `tiene miedo de`,
  shocked: (from, to) => from === to ? 'está muy sorprendido.' : `está sorprendido por`,
  thinking: (from, to) => from === to ? 'está pensando.' : `no puede dejar de pensar en`,
};

export const command = ['inter', 'accion', 'anime'];
export const category = 'diversión';
export const description = 'Realiza acciones/interacciones anime.';
export const admin = false;
export const botAdmin = false;

function getNombre(jid: string): string {
  return jid.split('@')[0];
}

export default async function (sock: any, msg: any, extra: any) {
  const args = extra.args || [];
  const sender = msg.sender;
  const senderName = msg.pushName || getNombre(sender);

  if (!args.length) {
    const list = Object.keys(acciones).join(', ');
    return msg.reply(
      `🌸 *ACCIONES ANIME*\n\n` +
      `🪷 Uso: .inter <acción> [@usuario]\n\n` +
      `✦ *Acciones disponibles:*\n` +
      `${list}\n\n` +
      `📌 Ejemplo: .inter hug @usuario`
    );
  }

  const accion = args[0].toLowerCase();

  if (!acciones[accion]) {
    return msg.reply(`❌ La acción "*${accion}*" no existe.\n\n🪷 Usa .inter para ver las disponibles.`);
  }

  try {
    const mentions = msg.mentionedJid || [];
    let targetJid = mentions[0];

    if (!targetJid && msg.quoted) {
      targetJid = msg.quoted.sender;
    }

    const targetName = targetJid ? msg.pushName || getNombre(targetJid) : senderName;
    const descripcion = acciones[accion](senderName, targetName);

    const endpoint = `/anime/${accion}`;
    const url = `${BASE_URL}${endpoint}?key=${API_KEY}`;

    const response = await axios.get(url, { timeout: 10000 });

    if (!response.data || !response.data.url) {
      return msg.reply(`⚠️ No pude obtener la imagen de ${accion}. Intenta de nuevo.`);
    }

    const gifUrl = response.data.url;
    const mentions_list = targetJid ? [targetJid] : [];

    return await sock.sendMessage(
      msg.chat,
      {
        image: { url: gifUrl },
        caption:
          targetJid
            ? `🌸 *${senderName}* ${descripcion} *${targetName}*`
            : `🌸 *${senderName}* ${descripcion}`,
        mentions: mentions_list
      },
      { quoted: msg }
    );
  } catch (error: any) {
    console.error('[INTER ERROR]:', error.message);
    return msg.reply(
      `⚠️ Error al traer la acción.\n\n` +
      `🍥 Intenta de nuevo en unos momentos.`
    );
  }
}
