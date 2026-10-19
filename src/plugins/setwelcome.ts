import { setWelcomeMessage } from '../lib/welcome.ts';

export const command = ['setwelcome'];
export const category = 'group';
export const description = 'Establecer un mensaje de bienvenida personalizado.';
export const admin = true;

export default async function (sock: any, msg: any, extra: any) {
    if (!extra.args.length) {
        return msg.reply(`ꕤ ꨩᰰ𑪐𑂺 ˳ ׄ Set Welcome ࣭𑁯ᰍ   ̊ ܃܃

*❒ Variables disponibles:*
𖣣ֶㅤ֯⌗ ✤ ⬭ @user    
> → Mención del usuario que ingresa

𖣣ֶㅤ֯⌗ ✤ ⬭ @group   
> → Nombre del grupo

𖣣ֶㅤ֯⌗ ✤ ⬭ @members 
> → Número de miembros actuales

✿ Si ya tienes un mensaje configurado y quieres borrarlo usa: */setwelcome clear*`);
    }
    
    if (extra.args[0] === 'clear') {
        setWelcomeMessage(msg.from, 'welcome', '');
        msg.reply('✐ Mensaje de bienvenida eliminado.');
        return;
    }
    
    const texto = extra.text.slice(extra.text.toLowerCase().indexOf(extra.command) + extra.command.length).trim();
    setWelcomeMessage(msg.from, 'welcome', texto);
    msg.reply(`ꕥ Has establecido el mensaje de bienvenida correctamente.`);
}
