export const command = ['ping', 'p', 'speed'];
export const category = 'info';
export const description = 'Muestra la latencia actual y estado del bot.';
export const needsGroupMetadata = false;

export default async function (sock: any, msg: any, extra: any, db: any) {
    const pluginStart = process.hrtime.bigint();
    const userData = (await db.getUser()) || {};
    const totalCmds = db.incrementCommandCount();
    const processingMs = Number(process.hrtime.bigint() - pluginStart) / 1e6;

    let messageAgeMs = 0;
    const timestamp = msg.messageTimestamp;
    const rawTimestamp = typeof timestamp === 'object' && timestamp?.toNumber
        ? timestamp.toNumber()
        : Number(timestamp || 0);
    if (rawTimestamp > 0) {
        messageAgeMs = Math.max(0, Date.now() - rawTimestamp * 1000);
    }

    const responseText = (latency: string) => `*🏓 PONG!*

⚡ *Respuesta de WhatsApp:* \`${latency}\`
🧠 *Procesamiento:* \`${processingMs.toFixed(1)} ms\`
${messageAgeMs > 0 ? `📩 *Mensaje recibido:* hace \`${(messageAgeMs / 1000).toFixed(1)} s\`\n` : ''}
👤 *Usuario:* ${userData.name || msg.pushName}
🪙 *¥enes:* \`${Number(userData.yen || 0)}\`
📊 *Comandos ejecutados:* \`${totalCmds}\``;

    const responseStart = process.hrtime.bigint();
    const sent = await sock.sendMessage(msg.from, { text: responseText('Midiendo...') }, { quoted: msg });
    const latencyMs = Number(process.hrtime.bigint() - responseStart) / 1e6;
    const finalText = responseText(`${latencyMs.toFixed(1)} ms`);

    if (sent?.key) {
        await sock.sendMessage(msg.from, { text: finalText, edit: sent.key });
    }
}
