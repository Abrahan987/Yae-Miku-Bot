import { watchFile, unwatchFile } from 'fs';
import { fileURLToPath } from 'url';

global.emojis = '';

global.namebot = 'Yae Miku Bot';

global.rcanal = '';

global.banner = 'https://qu.ax/2EtYo.jpg';

global.icono = 'https://qu.ax/FdqjE.jpg';

global.api = '';

global.my = {
ch: '',
ch2: ''
};

const file = fileURLToPath(import.meta.url);

watchFile(file, () => {
unwatchFile(file);
import("${file}?update=${Date.now()}");
});
