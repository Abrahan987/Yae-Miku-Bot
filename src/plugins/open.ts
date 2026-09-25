export const command = ['open', 'abrir'];
export const category = 'admin';
export const description = 'Abre el grupo para que todos los participantes puedan enviar mensajes.';
export const admin = true;
export const botAdmin = true;

export default async function (sock: any, msg: any) {
    if (!msg.isGroup) {
        return msg.reply('Necesitas estar en un grupo para usar este comando.');
    }

    try {
        await sock.groupSettingUpdate(msg.from, 'not_announcement');
        await msg.reply('Grupo abierto. Todos los participantes pueden enviar mensajes.');
    } catch (error) {
        await msg.reply('Ocurrió un error al intentar abrir el grupo.');
    }
}
