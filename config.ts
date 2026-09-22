import { watchFile, unwatchFile } from 'fs';
import { fileURLToPath } from 'url';

global.emojis = '';
global.namebot = 'Yae Miku Bot';
global.rcanal = '';
global.banner = 'https://raw.githubusercontent.com/IrokzDal/data/main/1789777142507.jpeg';
global.icono = 'https://raw.githubusercontent.com/IrokzDal/data/main/1789776770221.jpeg';
global.api = '';
global.my = {
    ch: '',
    ch2: ''
};

const file = fileURLToPath(import.meta.url);

watchFile(file, () => {
    unwatchFile(file);
    import(`${file}?update=${Date.now()}`);
});
