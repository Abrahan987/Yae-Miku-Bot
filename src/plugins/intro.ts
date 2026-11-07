
import sharp from 'sharp'

export const command = ['yaecard', 'testcard']
export const category = 'info'
export const description = 'Genera una tarjeta visual de Yae'

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, char => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;'
  })[char]!)
}

export default async function (sock: any, msg: any, extra: any, db: any) {
  const jid = msg.key.remoteJid

  try {
    const botName = escapeXml(String((global as any).namebot || 'Yae-Miku-Bot'))

    const svg = `
    <svg width="900" height="1100" viewBox="0 0 900 1100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#10091f"/>
          <stop offset="50%" stop-color="#281044"/>
          <stop offset="100%" stop-color="#0b0818"/>
        </linearGradient>
        <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ed9bff"/>
          <stop offset="50%" stop-color="#a45aff"/>
          <stop offset="100%" stop-color="#7040d9"/>
        </linearGradient>
        <radialGradient id="glow">
          <stop offset="0%" stop-color="#a34aff" stop-opacity=".35"/>
          <stop offset="100%" stop-color="#a34aff" stop-opacity="0"/>
        </radialGradient>
        <filter id="shadow">
          <feGaussianBlur stdDeviation="18"/>
        </filter>
      </defs>

      <rect width="900" height="1100" fill="#080611"/>
      <rect x="35" y="35" width="830" height="1030" rx="48" fill="url(#bg)" stroke="#57347d" stroke-width="2"/>

      <circle cx="700" cy="260" r="300" fill="url(#glow)"/>
      <circle cx="180" cy="780" r="300" fill="url(#glow)"/>

      <rect x="75" y="75" width="750" height="950" rx="36" fill="none" stroke="#9562bd" stroke-opacity=".22" stroke-width="2"/>

      <rect x="115" y="115" width="220" height="58" rx="29" fill="#8c43ca" fill-opacity=".2" stroke="#c17bff" stroke-width="2"/>
      <text x="225" y="152" fill="#edcaff" font-size="23" text-anchor="middle" font-family="Arial" letter-spacing="3">WELCOME</text>

      <text x="780" y="153" fill="#bd9bd9" font-size="20" text-anchor="end" font-family="Arial" letter-spacing="2">YAE • 001</text>

      <circle cx="450" cy="420" r="185" fill="#a04cda" opacity=".12" filter="url(#shadow)"/>
      <circle cx="450" cy="420" r="145" fill="#211034" stroke="url(#accent)" stroke-width="4"/>
      <circle cx="450" cy="420" r="128" fill="none" stroke="#d9a6ff" stroke-opacity=".35" stroke-width="2"/>

      <text x="450" y="462" text-anchor="middle" font-size="112" fill="#f2c5ff" font-family="Arial">Y</text>
      <path d="M340 540 Q450 585 560 540" fill="none" stroke="#bd7aff" stroke-opacity=".5" stroke-width="3"/>

      <text x="450" y="680" text-anchor="middle" fill="#ffffff" font-size="67" font-family="Arial" font-weight="bold" letter-spacing="5">HOLA, SOY YAE</text>
      <text x="450" y="737" text-anchor="middle" fill="#d5b7ef" font-size="28" font-family="Arial" letter-spacing="3">TU ASISTENTE DE WHATSAPP</text>

      <rect x="185" y="805" width="530" height="2" fill="#a56ad3" opacity=".45"/>

      <text x="450" y="885" text-anchor="middle" fill="#e8caff" font-size="35" font-family="Arial" letter-spacing="3">${botName}</text>
      <text x="450" y="940" text-anchor="middle" fill="#a98abf" font-size="21" font-family="Arial" letter-spacing="4">MAGIA EN CADA MENSAJE</text>

      <g fill="#e7baff" opacity=".8">
        <text x="145" y="290" font-size="32">✦</text>
        <text x="740" y="350" font-size="26">✧</text>
        <text x="175" y="690" font-size="24">✧</text>
        <text x="735" y="760" font-size="35">✦</text>
        <text x="650" y="220" font-size="18">✧</text>
        <text x="260" y="910" font-size="20">✦</text>
      </g>

      <text x="450" y="1000" text-anchor="middle" fill="#8966a8" font-size="17" font-family="Arial" letter-spacing="5">「 YAE MIKU PROJECT 」</text>
    </svg>`

    const image = await sharp(Buffer.from(svg))
      .png()
      .toBuffer()

    await sock.sendMessage(jid, {
      image,
      mimetype: 'image/png'
    }, { quoted: msg })

  } catch (error: any) {
    await sock.sendMessage(jid, {
      text: `Error al generar la tarjeta:\n${error.message}`
    }, { quoted: msg })
  }
}
