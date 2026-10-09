export const command = ['setwarnlimit'];
export const category = 'group';
export const description = 'Establecer el límite de advertencias del grupo.';
export const admin = true;

export default async function (sock: any, msg: any, extra: any) {
    const raw = extra.args[0];
    const limit = parseInt(raw);
    
    if (isNaN(limit) || limit < 0 || limit > 10) {
        return msg.reply(`✐ El límite de advertencias debe ser un número entre \`1\` y \`10\`, o \`0\` para desactivar.\n> Ejemplo › */setwarnlimit 5*`);
    }
    
    if (limit === 0) {
        msg.reply(`✐ Has desactivado la función de eliminar usuarios al alcanzar el límite de advertencias.`);
        return;
    }
    
    msg.reply(`✐ Límite de advertencias establecido en \`${limit}\` para este grupo.\n> ❖ Los usuarios serán eliminados automáticamente al alcanzar este límite.`);
}