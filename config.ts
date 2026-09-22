import { watchFile, unwatchFile } from 'fs';
import { fileURLToPath } from 'url';
global.owner = '573237649689';
global.nmcreador '𝞯𝞯🪷 𝐀𝐁𝐑𝐀𝐇𝐀𝐍-𝐌 ˙';
global.namebot = '𖫨𖫨🪷⃨᪲  𝐘𝐀𝐄 𝐌𝐈𝐊𝐔 𝗕𝗢𝗧˙ᰨᰍ';
global.prefix = ['.', '#']
global.banner = 'https://raw.githubusercontent.com/IrokzDal/data/main/1789777142507.jpeg';
global.icono = 'https://raw.githubusercontent.com/IrokzDal/data/main/1789776770221.jpeg';
global.api = '';
global.key = 'proyectsV2'
global.my = {
    ch: '',
    ch2: ''
};

const file = fileURLToPath(import.meta.url);

watchFile(file, () => {
    unwatchFile(file);
    import(`${file}?update=${Date.now()}`);
});
