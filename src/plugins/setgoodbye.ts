export const command = ['setgoodbye'];
export const category = 'group';
export const description = 'Establecer un mensaje de despedida personalizado.';
export const admin = true;

export default async function (sock: any, msg: any, extra: any) {
    if (!extra.args.length) {
        return msg.reply(`ꕤ ꨩᰰ𑪐𑂺 ˳ ׄ Set Bye ࣭𑁯ᰍ   ̊ ܃܃

*❒ Variables disponibles:*
𖣣ֶㅤ֯⌗ ✤ ⬭ @user    
> → Mención del usuario que sale

𖣣ֶㅤ֯⌗ ✤ ⬭ @group   
> → Nombre del grupo

𖣣ֶㅤ֯⌗ ✤ ⬭ @members 
> → Número de miembros actuales

✿ Si ya tienes un mensaje configurado y quieres borrarlo usa: */setgoodbye clear*`);
    }
    
    if (extra.args[0] === 'clear') {
        msg.reply('✐ Mensaje de despedida eliminado.');
        return;
    }
    
    const texto = extra.args.join(' ');
    msg.reply(`ꕥ Has establecido el mensaje de despedida correctamente.`);
}