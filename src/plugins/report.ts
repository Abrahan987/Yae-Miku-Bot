import { getCooldown, setCooldown } from '#db';

export const command = ['report', 'reportar', 'error'];
export const category = 'utils';
export const description = 'Envía un reporte o error directamente al owner del bot.';

const COOLDOWN_MS = 60 * 1000;
const MAX_LENGTH = 1000;

const onlyDigits = (x: string) => String(x || '').replace(/\D/g, '');

function getOwnerJids(): string[] {
    const owners = ([] as any[]).concat((global as any).owner || []);
    const nums = owners
        .map((o) => onlyDigits(Array.isArray(o) ? o[0] : o))
        .filter(Boolean);

    return Array.from(new Set(nums)).map((n) => `${n}@s.whatsapp.net`);
}

export default async function (sock: any, msg: any, extra: any) {
    const text = String(extra.text || '');
    const reporte = text
        .slice(text.toLowerCase().indexOf(extra.command) + extra.command.length)
        .trim();

    const encabezado =
        `ᅟㅤ 𓈒    |꛱ ᷼ |꛱ ᷼ |ㅤֵㅤ  ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒\n\n` +
        `${global.namebot}\n` +
        `𐴲੭  ˙ 𓂃  🍥  𓂃  ˙\n\n`;

    const pie = `\n\n𐴲੭  ˙ 𓂃  🍥  𓂃  ˙\n\nꨄ︎ ${global.nmcreador}`;

    if (!reporte) {
        return msg.reply(
            encabezado +
            `🍓͜ᩧ𑂳ᰍ  𝚁𝙴𝙿𝙾𝚁𝚃𝙰𝚁\n\n` +
            `🪷 𝙴𝚂𝙲𝚁𝙸𝙱𝙴 𝚃𝚄 𝚁𝙴𝙿𝙾𝚁𝚃𝙴\n` +
            `> Indica el error o problema que encontraste.\n\n` +
            `🍥 𝙴𝙹𝙴𝙼𝙿𝙻𝙾\n` +
            `> ${global.prefix[0]}report hay un error con sticker` +
            pie
        );
    }

    if (reporte.length > MAX_LENGTH) {
        return msg.reply(
            encabezado +
            `⚠︎ 𝚁𝙴𝙿𝙾𝚁𝚃𝙴 𝙳𝙴𝙼𝙰𝚂𝙸𝙰𝙳𝙾 𝙻𝙰𝚁𝙶𝙾\n\n` +
            `🍥 El máximo permitido es de *${MAX_LENGTH} caracteres*.` +
            pie
        );
    }

    const owners = getOwnerJids();

    if (!owners.length) {
        return msg.reply(
            encabezado +
            `⚠︎ 𝙾𝚆𝙽𝙴𝚁 𝙽𝙾 𝙲𝙾𝙽𝙵𝙸𝙶𝚄𝚁𝙰𝙳𝙾\n\n` +
            `🍓 No hay un destinatario configurado para recibir reportes.` +
            pie
        );
    }

    const now = Date.now();
    const until = getCooldown(msg.sender, 'report');

    if (until > now) {
        const seconds = Math.ceil((until - now) / 1000);

        return msg.reply(
            encabezado +
            `🍓͜ᩧ𑂳ᰍ  𝙴𝚂𝙿𝙴𝚁𝙰 𝚄𝙽 𝙿𝙾𝙲𝙾\n\n` +
            `🪷 Podrás enviar otro reporte en *${seconds} segundos*.` +
            pie
        );
    }

    let origen = 'Chat privado';

    if (msg.isGroup) {
        try {
            const metadata = await sock.groupMetadata(msg.from);
            origen = `Grupo: ${metadata?.subject || msg.from}`;
        } catch {
            origen = `Grupo: ${msg.from}`;
        }
    }

    const senderNumber = onlyDigits(msg.sender);
    const fecha = new Date().toLocaleString('es-CO', {
        timeZone: 'America/Bogota'
    });

    let contenido =
        `ᅟㅤ 𓈒    |꛱ ᷼ |꛱ ᷼ |ㅤֵㅤ  ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒\n\n` +
        `${global.namebot}\n` +
        `𐴲੭  ˙ 𓂃  🍥  𓂃  ˙\n\n` +
        `🍓͜ᩧ𑂳ᰍ  𝙽𝚄𝙴𝚅𝙾 𝚁𝙴𝙿𝙾𝚁𝚃𝙴\n\n` +
        `🪷 𝚄𝚂𝚄𝙰𝚁𝙸𝙾\n` +
        `> ${msg.pushName || 'Desconocido'}\n\n` +
        `🍥 𝙽Ú𝙼𝙴𝚁𝙾\n` +
        `> ${senderNumber}${String(msg.sender).endsWith('@lid') ? ' (LID)' : ''}\n\n` +
        `🍓 𝙾𝚁𝙸𝙶𝙴𝙽\n` +
        `> ${origen}\n\n` +
        `🪷 𝙵𝙴𝙲𝙷𝙰\n` +
        `> ${fecha}\n\n` +
        `🍥 𝙼𝙴𝙽𝚂𝙰𝙹𝙴\n` +
        `${reporte}`;

    const citado = String(msg.quoted?.body || '').trim();

    if (citado) {
        contenido += `\n\n🪷 𝙼𝙴𝙽𝚂𝙰𝙹𝙴 𝙲𝙸𝚃𝙰𝙳𝙾\n${citado.slice(0, 500)}`;
    }

    contenido += pie;

    let enviado = false;

    for (const owner of owners) {
        try {
            await sock.sendMessage(owner, { text: contenido });
            enviado = true;
        } catch (e) {
            console.error('[REPORT SEND]:', e);
        }
    }

    if (!enviado) {
        return msg.reply(
            encabezado +
            `⚠︎ 𝙽𝙾 𝚂𝙴 𝙿𝚄𝙳𝙾 𝙴𝙽𝚅𝙸𝙰𝚁\n\n` +
            `🍥 Ocurrió un problema al entregar tu reporte. Inténtalo más tarde.` +
            pie
        );
    }

    setCooldown(msg.sender, 'report', now + COOLDOWN_MS);

    return msg.reply(
        encabezado +
        `🍓͜ᩧ𑂳ᰍ  𝚁𝙴𝙿𝙾𝚁𝚃𝙴 𝙴𝙽𝚅𝙸𝙰𝙳𝙾\n\n` +
        `🪷 Tu reporte fue enviado correctamente al equipo de Yae.\n\n` +
        `🍥 Gracias por ayudarnos a mejorar el bot. ♡` +
        pie
    );
          }
