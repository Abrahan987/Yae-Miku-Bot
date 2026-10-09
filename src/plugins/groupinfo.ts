export const command = ['groupinfo', 'gp', 'infogrupo'];
export const category = 'admin';
export const description = 'Muestra la información del grupo.';
export const admin = false;
export const botAdmin = false;

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 Este comando solo funciona en grupos.');
    }

    const chatId = msg.from || msg.chat;

    try {
        const metadata = await sock.groupMetadata(chatId);
        const participants: any[] = metadata?.participants || [];
        const admins = participants.filter((p: any) => p.admin === 'admin' || p.admin === 'superadmin');
        const owner = metadata?.owner ? `@${metadata.owner.split('@')[0]}` : 'Desconocido';
        const creado = metadata?.creation
            ? new Date(metadata.creation * 1000).toLocaleDateString('es-CO')
            : 'Desconocido';

        const texto =
            `🪷 *INFORMACIÓN DEL GRUPO*\n\n` +
            `🍓 Nombre: ${metadata?.subject || 'Sin nombre'}\n` +
            `🍥 Creador: ${owner}\n` +
            `👥 Miembros: ${participants.length}\n` +
            `⚠️ Administradores: ${admins.length}\n` +
            `📌 Creado: ${creado}\n\n` +
            `> ${metadata?.desc || 'Sin descripción'}`;

        const mentions = metadata?.owner ? [metadata.owner] : [];

        return sock.sendMessage(chatId, { text: texto, mentions }, { quoted: msg });
    } catch (error: any) {
        console.error('[GROUPINFO ERROR]:', error);
        return msg.reply('⚠️ Ocurrió un error al obtener la información del grupo.');
    }
}
