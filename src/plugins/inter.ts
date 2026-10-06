import axios from 'axios';

const API_KEY = 'proyectsV2';
const BASE_URL = 'https://api.stellarwa.xyz/sfw/interaction';

const captions: Record<string, (from: string, to: string) => string> = {
  kiss: (from, to) => from === to ? 'se manda un beso al aire.' : `le da un beso a`,
  hug: (from, to) => from === to ? 'se abraza a sí mismo.' : `abraza a`,
  pat: (from, to) => from === to ? 'se acaricia la cabeza.' : `acaricia la cabeza de`,
  slap: (from, to) => from === to ? 'se dio una bofetada a sí mismo.' : `le dio una bofetada a`,
  cuddle: (from, to) => from === to ? 'se acurruca solo.' : `se acurruca con`,
  tickle: (from, to) => from === to ? 'se hace cosquillas a sí mismo.' : `le hace cosquillas a`,
  punch: (from, to) => from === to ? 'se dio un puñetazo a sí mismo.' : `le dio un puñetazo a`,
  bite: (from, to) => from === to ? 'se mordió a sí mismo.' : `muerde a`,
  dance: (from, to) => from === to ? 'está bailando solo.' : `baila con`,
  angry: (from, to) => from === to ? 'está muy enojado.' : `está enojado con`,
  bored: (from, to) => from === to ? 'está muy aburrido.' : `está aburrido de`,
  cry: (from, to) => from === to ? 'está llorando.' : `está llorando por`,
  happy: (from, to) => from === to ? 'está muy feliz.' : `está feliz con`,
  sad: (from, to) => from === to ? 'está triste.' : `está triste por`,
  scared: (from, to) => from === to ? 'tiene miedo.' : `tiene miedo de`,
  smile: (from, to) => from === to ? 'está sonriendo.' : `le sonrió a`,
  wink: (from, to) => from === to ? 'le guiñó un ojo al espejo.' : `le guiñó un ojo a`,
  blush: (from, to) => from === to ? 'se sonrojó.' : `se sonrojó por`,
  laugh: (from, to) => from === to ? 'se está riendo.' : `se está burlando de`,
  think: (from, to) => from === to ? 'está pensando.' : `no puede dejar de pensar en`,
  walk: (from, to) => from === to ? 'salió a caminar en soledad.' : `decidió dar un paseo con`,
  run: (from, to) => from === to ? 'está corriendo por su vida.' : `está corriendo con`,
  eat: (from, to) => from === to ? 'está comiendo algo delicioso.' : `está comiendo con`,
  sleep: (from, to) => from === to ? 'está durmiendo plácidamente.' : `está durmiendo con`,
  pout: (from, to) => from === to ? 'está haciendo pucheros.' : `le está haciendo pucheros a`,
  highfive: (from, to) => from === to ? 'se chocó los cinco con el espejo.' : `chocó los cinco con`,
  handhold: (from, to) => from === to ? 'se toma la mano a sí mismo.' : `le toma la mano a`,
  wave: (from, to) => from === to ? 'se saludó a sí mismo en el espejo.' : `está saludando a`,
  clap: (from, to) => from === to ? 'está aplaudiendo por algo.' : `está aplaudiendo a`,
  cringe: (from, to) => from === to ? 'siente cringe.' : `siente cringe por`,
  bonk: (from, to) => from === to ? 'se dio un bonk a sí mismo.' : `le dio un bonk a`,
  lick: (from, to) => from === to ? 'se lamió por curiosidad.' : `lamió a`,
  kill: (from, to) => from === to ? 'se autoeliminó en modo dramático.' : `asesinó a`,
};

const descriptions: Record<string, string> = {
  kiss: 'Dale un beso a alguien.',
  hug: 'Abraza a alguien.',
  pat: 'Acaricia la cabeza de alguien.',
  slap: 'Dale una bofetada a alguien.',
  cuddle: 'Acurrúcate con alguien.',
  tickle: 'Hazle cosquillas a alguien.',
  punch: 'Dale un puñetazo a alguien.',
  bite: 'Muerde a alguien.',
  dance: 'Baila con alguien.',
  angry: 'Muestra tu enojo.',
  bored: 'Muestra tu aburrimiento.',
  cry: 'Llora por alguien.',
  happy: 'Muestra tu felicidad.',
  sad: 'Muestra tu tristeza.',
  scared: 'Muestra tu miedo.',
  smile: 'Sonríele a alguien.',
  wink: 'Guíñale un ojo a alguien.',
  blush: 'Sonrójate.',
  laugh: 'Ríete de alguien.',
  think: 'Piensa en alguien.',
  walk: 'Pasea con alguien.',
  run: 'Corre con alguien.',
  eat: 'Come con alguien.',
  sleep: 'Duerme con alguien.',
  pout: 'Haz pucheros.',
  highfive: 'Choca los cinco con alguien.',
  handhold: 'Toma la mano de alguien.',
  wave: 'Saluda a alguien.',
  clap: 'Aplaude a alguien.',
  cringe: 'Siente cringe por alguien.',
  bonk: 'Dale un bonk a alguien.',
  lick: 'Lame a alguien.',
  kill: 'Asesina a alguien (broma).',
};

// alias -> acción
const commandAliases: Record<string, string> = {
  muak: 'kiss',
  beso: 'kiss',
  abrazo: 'hug',
  caricia: 'pat',
  acurruca: 'cuddle',
  cosquillas: 'tickle',
  puñetazo: 'punch',
  morder: 'bite',
  bailar: 'dance',
  aburrido: 'bored',
  feliz: 'happy',
  triste: 'sad',
  correr: 'run',
  comer: 'eat',
  nom: 'eat',
};

export const command = [
  ...Object.keys(captions),
  ...Object.keys(commandAliases),
];

// Cada acción aparece por separado en el menú
export const menu = Object.keys(captions).map((action) => ({
  command: [
    action,
    ...Object.entries(commandAliases)
      .filter(([, target]) => target === action)
      .map(([alias]) => alias),
  ],
  description: descriptions[action] || 'Realiza una acción anime.',
}));

export const category = 'diversión';
export const description = 'Realiza una acción/interacción anime.';
export const admin = false;
export const botAdmin = false;

function getNombre(jid: string): string {
  return jid.split('@')[0];
}

export default async function (sock: any, msg: any, extra: any) {
  const command_used = String(extra.command || '').toLowerCase();
  const currentCommand = commandAliases[command_used] || command_used;

  if (!captions[currentCommand]) return;

  const sender = msg.sender;
  const senderName = msg.pushName || getNombre(sender);

  try {
    const mentions = msg.mentionedJid || [];
    let targetJid = mentions[0];

    if (!targetJid && msg.quoted) {
      targetJid = msg.quoted.sender;
    }

    const targetName = targetJid ? getNombre(targetJid) : senderName;
    const descripcion = captions[currentCommand](senderName, targetName);

    // La API devuelve el archivo (video/gif) directamente, no un JSON
    const response = await axios.get(BASE_URL, {
      params: { inter: currentCommand, key: API_KEY },
      responseType: 'arraybuffer',
      timeout: 20000,
    });

    const contentType = String(response.headers?.['content-type'] || '');
    let buffer: Buffer = Buffer.from(response.data);

    // Por si algún día responde JSON con una url
    if (contentType.includes('application/json')) {
      const json = JSON.parse(buffer.toString('utf-8'));
      const fileUrl = json?.url || json?.result?.url || json?.result;
      if (!fileUrl || typeof fileUrl !== 'string') {
        console.error('[INTER] Respuesta JSON inesperada:', json);
        return msg.reply(`⚠️ La API no devolvió un archivo para *${currentCommand}*.`);
      }
      const file = await axios.get(fileUrl, { responseType: 'arraybuffer', timeout: 20000 });
      buffer = Buffer.from(file.data);
    }

    if (!buffer.length) {
      return msg.reply(`⚠️ La API devolvió un archivo vacío para *${currentCommand}*.`);
    }

    const caption = targetJid
      ? `🌸 *@${targetName}* ${descripcion} *@${targetName}*`
      : `🌸 *${senderName}* ${descripcion}`;

    return await sock.sendMessage(
      msg.chat,
      {
        video: buffer,
        gifPlayback: true,
        caption,
        mentions: targetJid ? [targetJid, sender] : [sender],
      },
      { quoted: msg }
    );
  } catch (error: any) {
    console.error(
      '[INTER ERROR]:',
      error?.response?.status || '',
      error?.message,
      error?.response?.data ? Buffer.from(error.response.data).toString('utf-8').slice(0, 300) : ''
    );
    return msg.reply('⚠️ Error al traer la acción. Intenta de nuevo en unos momentos.');
  }
}
