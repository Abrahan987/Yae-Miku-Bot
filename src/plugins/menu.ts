export const command = ['menu', 'help', 'comandos'];
export const category = 'info';
export const description = 'Muestra el menú principal con todos los comandos.';

export default async function (sock, msg, extra) {
    const pluginData = extra.pluginData;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[MENU] INICIANDO PRUEBA DE R.CANAL');
    console.log('[MENU] global.rcanal:', global.rcanal);
    console.log('[MENU] Tipo:', typeof global.rcanal);
    console.log('[MENU] msg.from:', msg.from);
    console.log('[MENU] sock.user.id:', sock.user?.id);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (!global.rcanal) {
        console.error('[R.CANAL] ❌ global.rcanal está vacío o no existe.');
        return msg.reply('⚠︎ global.rcanal no está configurado.');
    }

    const menuText = `ᅟㅤ 𓈒    |꛱ ᷼ |꛱ ᷼ |ㅤֵㅤ  ̄ 𐇽 🍓 ㅤ࣫ㅤ|꛱ ᷼ |꛱ ᷼ |ㅤ 𓈒

${global.namebot}
𐴲੭  ˙ 𓂃  🍥  𓂃  ˙

🍓͜ᩧ𑂳ᰍ  𝙼𝙴𝙽Ú

🪷 𝙿𝚁𝚄𝙴𝙱𝙰 𝙳𝙴 𝚁.𝙲𝙰𝙽𝙰𝙻

ꨄ︎ ${global.nmcreador}`;

    console.log('[R.CANAL] Intentando enviar...');
    console.log('[R.CANAL] Destino:', global.rcanal);
    console.log('[R.CANAL] Texto:', menuText);

    try {
        const result = await sock.sendMessage(
            global.rcanal,
            {
                text: menuText
            }
        );

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('[R.CANAL] ✅ sendMessage terminó correctamente');
        console.log('[R.CANAL] Resultado:', result);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        return result;
    } catch (error: any) {
        console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('[R.CANAL] ❌ ERROR AL ENVIAR');
        console.error('[R.CANAL] Mensaje:', error?.message);
        console.error('[R.CANAL] Stack:', error?.stack);
        console.error('[R.CANAL] Error completo:', error);
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        return msg.reply(
            `⚠︎ 𝙴𝚁𝚁𝙾𝚁 𝙰𝙻 𝙴𝙽𝚅𝙸𝙰𝚁 𝙰𝙻 𝚁.𝙲𝙰𝙽𝙰𝙻\n\n` +
            `🍥 𝚁𝙴𝚅𝙸𝚂𝙰 𝙻𝙰 𝚃𝙴𝚁𝙼𝙸𝙽𝙰𝙻.`
        );
    }
}
