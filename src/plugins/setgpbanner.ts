export const command = ['setgpbanner'];
export const category = 'group';
export const description = 'Cambia la imagen del grupo.';
export const admin = true;
export const botAdmin = true;

export default async function (sock: any, msg: any) {
    try {
        const media = msg.quoted || msg;
        const image = media?.message?.imageMessage || media?.imageMessage;
        if (!image) {
            return msg.reply('Responde a una imagen para usarla como portada del grupo.');
        }

        const buffer = await media.download?.();
        if (!buffer) {
            return msg.reply('No se pudo descargar la imagen.');
        }

        await sock.updateProfilePicture(msg.from, buffer);
        return msg.reply('✅ La imagen del grupo fue actualizada.');
    } catch (err: any) {
        return msg.reply(`Error: ${err?.message || 'No se pudo actualizar la imagen.'}`);
    }
}
