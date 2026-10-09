import fs from 'fs';
import path from 'path';
import pino from 'pino';
import makeWASocket, {
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason,
    Browsers
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode';
import { handler } from '#handler';

const subsDir = path.join(process.cwd(), 'subs');
if (!fs.existsSync(subsDir)) fs.mkdirSync(subsDir, { recursive: true });

const logger = pino({ level: 'silent' }) as any;

export interface SubBotConfig {
    phone: string;
    isCode: boolean;
    mainSocket: any;
    mainChat: string;
    mainMsg: any;
}

const activeBots = new Map<string, any>();
const connecting = new Set<string>();
const retries = new Map<string, number>();

export function normalizePhone(input: string): string {
    let s = String(input).replace(/\D/g, '');
    if (!s) return '';
    if (s.startsWith('0')) s = s.replace(/^0+/, '');
    if (s.length === 10 && s.startsWith('3')) s = '57' + s;
    if (s.startsWith('52') && !s.startsWith('521') && s.length >= 12) s = '521' + s.slice(2);
    if (s.startsWith('54') && !s.startsWith('549') && s.length >= 11) s = '549' + s.slice(2);
    return s;
}

function cleanJid(jid: string = ''): string {
    return jid.replace(/:\d+/, '').split('@')[0];
}

async function getVersion(): Promise<any> {
    try {
        const { version } = await fetchLatestBaileysVersion();
        return version;
    } catch {
        return [2, 3000, 1033105955];
    }
}

function deleteLater(sock: any, chat: string, key: any, ms = 60000) {
    if (!key) return;
    setTimeout(() => {
        sock.sendMessage(chat, { delete: key }).catch(() => {});
    }, ms);
}

export async function startSubBot(config: SubBotConfig): Promise<void> {
    const { isCode, mainSocket, mainChat, mainMsg } = config;
    const phone = normalizePhone(config.phone);

    if (!phone) throw new Error('No se pudo obtener tu número.');
    if (activeBots.has(phone) || connecting.has(phone)) {
        throw new Error('Ya tienes un sub-bot activo o en proceso de vinculación.');
    }

    connecting.add(phone);

    const sessionPath = path.join(subsDir, phone);
    fs.mkdirSync(sessionPath, { recursive: true });

    const sentKeys: any[] = [];
    let pairingSent = false;

    const connect = async (): Promise<void> => {
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const version = await getVersion();

        const sock: any = makeWASocket({
            version,
            logger,
            browser: Browsers.macOS('Safari'),
            printQRInTerminal: false,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger)
            },
            markOnlineOnConnect: false,
            syncFullHistory: false,
            fireInitQueries: false,
            generateHighQualityLinkPreview: false,
            getMessage: async () => undefined
        });

        sock.ev.on('creds.update', saveCreds);

        // IMPORTANTE: conectar el handler de comandos al socket del sub-bot
        // (sin esto el sub-bot vincula pero nunca responde a nada)
        // El handler usa los comandos compartidos cargados por el bot principal
        try {
            await handler(sock);
        } catch (e) {
            console.error('[SUBBOT HANDLER ERROR]', e);
        }

        // Código de 8 dígitos
        if (isCode && !state.creds.registered && !pairingSent) {
            pairingSent = true;
            setTimeout(async () => {
                try {
                    const raw: string = await sock.requestPairingCode(phone);
                    const code = raw?.match(/.{1,4}/g)?.join('-') || raw;

                    const info = await mainSocket.sendMessage(
                        mainChat,
                        {
                            text:
                                `🪷 *𝗦𝗨𝗕-𝗕𝗢𝗧 • 𝗖𝗢́𝗗𝗜𝗚𝗢*\n` +
                                `─────── ❀ ───────\n\n` +
                                `🍓 Abre WhatsApp en el número *${phone}*\n` +
                                `> 1. Toca los *3 puntos*\n` +
                                `> 2. *Dispositivos vinculados*\n` +
                                `> 3. *Vincular con el número de teléfono*\n` +
                                `> 4. Ingresa el código que te envío abajo 👇\n\n` +
                                `⏳ Expira en 1 minuto`
                        },
                        { quoted: mainMsg }
                    );
                    const codeMsg = await mainSocket.sendMessage(mainChat, { text: code }, { quoted: mainMsg });

                    sentKeys.push(info?.key, codeMsg?.key);
                    deleteLater(mainSocket, mainChat, info?.key);
                    deleteLater(mainSocket, mainChat, codeMsg?.key);
                } catch (e) {
                    console.error('[SUBBOT CODE ERROR]', e);
                    connecting.delete(phone);
                    try { sock.end?.(new Error('code failed')); } catch {}
                    mainSocket.sendMessage(mainChat, { text: '⚠️ No se pudo generar el código. Intenta de nuevo.' }, { quoted: mainMsg }).catch(() => {});
                }
            }, 3000);
        }

        sock.ev.on('connection.update', async (update: any) => {
            const { connection, lastDisconnect, qr } = update;

            // QR
            if (qr && !isCode) {
                try {
                    const buffer = await qrcode.toBuffer(qr, { scale: 8 });
                    const qrMsg = await mainSocket.sendMessage(
                        mainChat,
                        {
                            image: buffer,
                            caption:
                                `🪷 *𝗦𝗨𝗕-𝗕𝗢𝗧 • 𝗤𝗥*\n` +
                                `─────── ❀ ───────\n\n` +
                                `🍓 Escanea este QR desde *Dispositivos vinculados*\n` +
                                `⏳ Expira en 1 minuto`
                        },
                        { quoted: mainMsg }
                    );
                    sentKeys.push(qrMsg?.key);
                    deleteLater(mainSocket, mainChat, qrMsg?.key, 45000);
                } catch (e) {
                    console.error('[SUBBOT QR ERROR]', e);
                }
            }

            if (connection === 'open') {
                connecting.delete(phone);
                retries.delete(phone);
                activeBots.set(phone, sock);
                console.log(`[SUB-BOT] Conectado: ${cleanJid(sock.user?.id)}`);

                mainSocket.sendMessage(
                    mainChat,
                    {
                        text:
                            `✅ *SUB-BOT CONECTADO*\n\n` +
                            `🪷 Número: *${cleanJid(sock.user?.id)}*\n` +
                            `📌 Ya quedó vinculado.`
                    },
                    { quoted: mainMsg }
                ).catch(() => {});
            }

            if (connection === 'close') {
                const code = (lastDisconnect?.error as any)?.output?.statusCode;
                activeBots.delete(phone);

                if (code === DisconnectReason.loggedOut) {
                    connecting.delete(phone);
                    try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch {}
                    return;
                }

                // 515 = reinicio requerido tras vincular, y otras desconexiones: reconectar
                const n = (retries.get(phone) || 0) + 1;
                retries.set(phone, n);
                if (n > 8) {
                    connecting.delete(phone);
                    retries.delete(phone);
                    return;
                }
                try { sock.ev.removeAllListeners(); } catch {}
                setTimeout(() => connect().catch((e) => console.error('[SUBBOT RECONNECT]', e)), 2000);
            }
        });
    };

    await connect();
}

// Reconecta los sub-bots guardados en /subs al iniciar el bot principal
export async function restoreSubBots(mainSocket: any): Promise<void> {
    if (!fs.existsSync(subsDir)) return;
    for (const phone of fs.readdirSync(subsDir)) {
        const dir = path.join(subsDir, phone);
        if (!fs.statSync(dir).isDirectory()) continue;
        if (!fs.existsSync(path.join(dir, 'creds.json'))) continue;
        if (activeBots.has(phone) || connecting.has(phone)) continue;
        try {
            await startSubBot({
                phone,
                isCode: false,
                mainSocket,
                mainChat: '',
                mainMsg: undefined
            });
            console.log(`[SUBBOT RESTORED] ${phone}`);
        } catch (e) {
            console.error('[SUBBOT RESTORE]', phone, e);
        }
    }
}

export function getActiveBots(): Map<string, any> {
    return activeBots;
}

export function listActiveBots(): string[] {
    return Array.from(activeBots.keys());
}

export function removeSubBot(phone: string) {
    const p = normalizePhone(phone);
    const bot = activeBots.get(p);
    if (bot) {
        try { bot.ev.removeAllListeners(); bot.ws?.close(); } catch {}
    }
    activeBots.delete(p);
    connecting.delete(p);
}
