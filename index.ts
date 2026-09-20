import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers
} from '@whiskeysockets/baileys';
import P from 'pino';
import { Boom } from '@hapi/boom';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import readline from 'readline';
import qrcode from 'qrcode';
import { loadDB } from '#db';
import { handler, loadPlugins } from '#handler';
import './config.ts';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sDir = path.join(__dirname, 'sessions');

const methodCodeQR = process.argv.includes('--qr');
const methodCode = process.argv.includes('--code');

const rosa = '\x1b[38;2;255;182;218m';
const lila = '\x1b[38;2;220;180;255m';
const rosaLila = '\x1b[38;2;220;180;255m';
const subrayado = '\x1b[4m';
const reset = '\x1b[0m';

function normalizePhone(input: any) {
    let s = String(input).replace(/\D/g, '');
    if (!s) return '';
    if (s.startsWith('0')) s = s.replace(/^0+/, '');
    if (s.length === 10 && s.startsWith('3')) s = '57' + s;
    if (s.startsWith('52') && !s.startsWith('521') && s.length >= 12) s = '521' + s.slice(2);
    if (s.startsWith('54') && !s.startsWith('549') && s.length >= 11) s = '549' + s.slice(2);
    return s;
}

const limpiarSesion = () => {
    if (fs.existsSync(sDir)) {
        try {
            fs.rmSync(sDir, { recursive: true, force: true });
        } catch {}
    }
};

const askQuestion = async (query: string): Promise<string> => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(query, (ans) => {
            rl.close();
            resolve(ans.trim());
        });
    });
};

async function startBot() {
    await loadDB();
    await loadPlugins();

    if (!fs.existsSync(sDir)) {
        fs.mkdirSync(sDir, { recursive: true });
    }

    let { state, saveCreds } = await useMultiFileAuthState(sDir);
    const { version } = await fetchLatestBaileysVersion();

    let opcion: string = '';
    let usarCodigo: boolean = false;

    if (!state.creds.registered) {
        if (methodCodeQR) {
            opcion = '1';
        } else if (methodCode) {
            opcion = '2';
            usarCodigo = true;
        } else {
            console.log(`
${rosa}🍓 𝗪𝗛𝗔𝗧𝗦𝗔𝗣𝗣 𝗟𝗢𝗚𝗜𝗡${reset}
${lila}─────── ❀ ───────${reset}

${rosa}🪷 𝗘𝗹𝗶𝗴𝗲 𝘂𝗻𝗮 𝗼𝗽𝗰𝗶𝗼́𝗻${reset}

${lila}𝟭. 𝗤𝗥
𝟮. 𝗖𝗼́𝗱𝗶𝗴𝗼 𝗱𝗲 𝟴 𝗱𝗶́𝗴𝗶𝘁𝗼𝘀${reset}

${rosa}─────── ❀ ───────${reset}
`);
            opcion = await askQuestion(`${rosa}---> ${reset}`);
            usarCodigo = opcion === '2';
        }

        limpiarSesion();
        fs.mkdirSync(sDir, { recursive: true });

        const reloadedAuth = await useMultiFileAuthState(sDir);
        state = reloadedAuth.state;
        saveCreds = reloadedAuth.saveCreds;
    }

    const esQR = opcion === '1' || methodCodeQR;

    const sock = makeWASocket({
        logger: P({ level: 'silent' }) as any,
        printQRInTerminal: false,
        version,
        browser: Browsers.macOS('Safari'),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' }) as any)
        },
        markOnlineOnConnect: false,
        emitOwnEvents: false,
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        downloadHistory: false,
        fireInitQueries: false,
        keepAliveIntervalMs: 30000,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: undefined,
        retryRequestDelayMs: 250,
        getMessage: async () => undefined
    });

    if (usarCodigo && !state.creds.registered) {
        console.log(`\n${rosa}Por favor, Ingrese el número de WhatsApp.${reset}`);
        console.log(`${lila}Ejemplo: +521XXXXXXXXXX${reset}\n`);
        let num = await askQuestion(`${rosa}---> ${reset}`);
        num = normalizePhone(num);

        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(num);
                code = code?.match(/.{1,4}/g)?.join('-') || code;
                console.log(`🪷 𝗧𝘂 𝗰𝗼́𝗱𝗶𝗴𝗼 𝗲𝘀: ${rosaLila}${subrayado}${code}${reset}`);
            } catch (err) {
                console.log(`${rosa}[ ERROR ] Falla al generar código de vinculación:${reset}`, err);
                limpiarSesion();
                setTimeout(() => startBot(), 2000);
            }
        }, 3000);
    }

    sock.ev.on('creds.update', async () => {
        await saveCreds();
    });

    sock.ev.on('connection.update', async (u) => {
        const { connection, lastDisconnect, qr } = u;

        if (qr && esQR) {
            try {
                const qrTerminal = await qrcode.toString(qr, { type: 'terminal', small: true });
                console.log(`\n${rosa}[ QR ] ESCANEA EL SIGUIENTE CÓDIGO QR:${reset}\n`);
                console.log(qrTerminal);
            } catch (err) {
                console.log(`${rosa}[ ERROR ] Error al renderizar el código QR:${reset}`, err);
            }
        }

        if (connection === 'open') {
            const userName = sock.user?.name || 'desconocido';
            console.log(`\n${lila}✿ Conectado con éxito al (${userName}) ✰${reset}\n`);
        }

        if (connection === 'close') {
            const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
            const isStreamError = lastDisconnect?.error?.message?.includes('Stream Errored');

            if (statusCode === 515 || isStreamError) {
                console.log(`${lila}[ RECONNECT ] Reiniciando socket por actualización de sesión...${reset}`);
                setTimeout(() => startBot(), 2000);
            } else if (statusCode === DisconnectReason.loggedOut) {
                console.log(`${rosa}[ SESSION ] Sesión cerrada desde el teléfono. Limpiando...${reset}`);
                limpiarSesion();
                setTimeout(() => startBot(), 2000);
            } else {
                console.log(`${lila}[ CONEXION ] Desconectado (Status ${statusCode}). Reintentando...${reset}`);
                setTimeout(() => startBot(), 3000);
            }
        }
    });

    handler(sock);
}

startBot().catch(() => {});

const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalStderrWrite = process.stderr.write.bind(process.stderr);

const filterNoise = (chunk: any, encoding?: any, callback?: any) => {
    const str = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    
    if (
        str.includes('Closing open session') ||
        str.includes('Closing session') ||
        str.includes('SessionEntry') ||
        str.includes('ephemeralKeyPair') ||
        str.includes('currentRatchet') ||
        str.includes('prekey bundle') ||
        str.includes('chainKey') ||
        str.includes('registrationId') ||
        str.includes('bad-mac') ||
        str.includes('Bad MAC') ||
        str.includes('Failed to decrypt') ||
        str.includes('Session error')
    ) {
        if (typeof callback === 'function') callback();
        return true;
    }
    
    return originalStdoutWrite(chunk, encoding, callback);
};

process.stdout.write = filterNoise as any;
process.stderr.write = filterNoise as any;

process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});
