export const command = ['ping', 'p', 'speed'];
export const category = 'info';
export const description = 'Muestra la latencia actual y estado del bot.';

export default async function (sock: any, msg: any, extra: any, db: any) {
    const start = Date.now();
    const userData = db.getUser();
    const totalCmds = db.incrementCommandCount();
    const latency = Date.now() - start;

    const responseText = `*🏓 PONG!*

⚡ *Latencia:* \`${latency} ms\`
👤 *Usuario:* ${userData.name || msg.pushName}
🪙 *¥enes:* \`${userData.yen}\`
📊 *Comandos ejecutados:* \`${totalCmds}\``;

    await msg.reply(responseText);
}
