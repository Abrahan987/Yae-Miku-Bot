import { watchFile, unwatchFile } from 'fs';
import { fileURLToPath } from 'url';

global.owner = '573237649689';
global.nmcreador = '𝞯𝞯🪷 𝐀𝐁𝐑𝐀𝐇𝐀𝐍-𝐌 ˙';
global.namebot = '𖫨𖫨🪷  𝐘𝐀𝐄 𝐌𝐈𝐊𝐔 𝗕𝗢𝗧˙ᰨᰍ';
global.prefix = ['.', '#'];
global.banner = 'https://files.catbox.moe/1ofp7h.png';
global.icono = 'https://files.catbox.moe/1ofp7h.png';
global.api = '';
global.key = 'proyectsV2';
global.rcanal = '120363427270057983@newsletter'; // todo esto


const file = fileURLToPath(import.meta.url);

watchFile(file, () => {
    unwatchFile(file);
    import(`${file}?update=${Date.now()}`);
});
