import axios from 'axios'

export const command = ['yaeintro', 'intro']
export const category = 'info'
export const description = 'Presentación animada de Yae-Miku-Bot'

const VIDEO_URL = 'https://h.uguu.se/CYOMUsez.mp4'

export default async function (sock, msg, extra, db) {
  const jid = msg.key.remoteJid

  try {
    const response = await axios.get(VIDEO_URL, {
      responseType: 'arraybuffer',
      timeout: 60000,
      maxContentLength: 50 * 1024 * 1024
    })

    const video = Buffer.from(response.data)

    if (!video.length) {
      throw new Error('El vídeo está vacío')
    }

    await sock.sendMessage(jid, {
      video,
      gifPlayback: true,
      mimetype: 'video/mp4',
      caption: `╭━━━〔 🍓 〕━━━╮

       𝙷𝙾𝙻𝙰, 𝚂𝙾𝚈 𝚈𝙰𝙴

  𝚄𝙽 𝙿𝙾𝚀𝚄𝙸𝚃𝙾 𝙳𝙴 𝙼𝙰𝙶𝙸𝙰
       𝙴𝙽 𝚃𝚄 𝚆𝙷𝙰𝚃𝚂𝙰𝙿𝙿

╰━━━━━━━━━━━━━━╯

「 𝚈𝙰𝙴 𝙼𝙸𝙺𝚄 𝙱𝙾𝚃 」`
    }, { quoted: msg })

  } catch (error) {
    await sock.sendMessage(jid, {
      text: `No pude generar la presentación de Yae.\n\nError: ${error.message}`
    }, { quoted: msg })
  }
}
