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
import { commandMap } from '#loader';
import { initializeSubBotConfig } from './subbot_config.ts';

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
const reconnectTimers = new Map<string, NodeJS.Timeout>();
const sessionTokens = new Map<string, symbol>();
const pendingBots = new Map<string, any>();
const connectionTimers = new Map<string, NodeJS.Timeout>();
const pairingTimers = new Map<string, NodeJS.Timeout>();

function clearTimer(timers: Map<string, NodeJS.Timeout>, phone: string): void {
    const timer = timers.get(phone);
    if (!timer) return;
    clearTimeout(timer);
    timers.delete(phone);
}

function stopSession(phone: string, token?: symbol): void {
    if (token && sessionTokens.get(phone) !== token) return;

    clearTimer(reconnectTimers, phone);
    clearTimer(connectionTimers, phone);
    clearTimer(pairingTimers, phone);

    const pending = pendingBots.get(phone);
    const active = activeBots.get(phone);
    pendingBots.delete(phone);
    activeBots.delete(phone);
    connecting.delete(phone);
    retries.delete(phone);
    sessionTokens.delete(phone);

    for (const sock of new Set([pending, active].filter(Boolean))) {
        try { sock.ev?.removeAllListeners(); } catch {}
        try { sock.end?.(new Error('Sub-bot session stopped')); } catch {}
        try { sock.ws?.close(); } catch {}
    }
}

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
    const active = activeBots.get(phone);
    if (active && active.ws?.isOpen === false) {
        stopSession(phone);
    }
    if (activeBots.has(phone) || connecting.has(phone)) {
        throw new Error('Ya tienes un sub-bot activo o en proceso de vinculación.');
    }

    const token = Symbol(phone);
    sessionTokens.set(phone, token);
    connecting.add(phone);

    const sessionPath = path.join(subsDir, phone);

    const sentKeys: any[] = [];
    let pairingSent = false;
    const ensureCurrent = () => sessionTokens.get(phone) === token;
    const failSession = (error: unknown) => {
        if (!ensureCurrent()) return;
        console.error(`[SUBBOT ${phone} CONNECTION ERROR]`, error);
        stopSession(phone, token);
        mainSocket.sendMessage(
            mainChat,
            { text: '⚠️ La conexión del sub-bot falló. Ejecuta el comando de vinculación nuevamente.' },
            { quoted: mainMsg }
        ).catch(() => {});
    };

    const connect = async (): Promise<void> => {
        if (!ensureCurrent()) return;
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const version = await getVersion();
        if (!ensureCurrent()) return;

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
        if (!ensureCurrent()) {
            try { sock.end?.(new Error('Stale sub-bot connection')); } catch {}
            try { sock.ws?.close(); } catch {}
            return;
        }
        pendingBots.set(phone, sock);
        sock.subbotPhone = phone;
        sock.ev.on('creds.update', saveCreds);
        await handler(sock);

        if (isCode && !state.creds.registered && !pairingSent) {
            pairingSent = true;
            const timer = setTimeout(async () => {
                pairingTimers.delete(phone);
                if (!ensureCurrent() || pendingBots.get(phone) !== sock) return;
                try {
                    const raw: string = await sock.requestPairingCode(phone);
                    if (!ensureCurrent()) return;
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
                } catch (error) {
                    console.error('[SUBBOT CODE ERROR]', error);
                    if (!ensureCurrent()) return;
                    stopSession(phone, token);
                    mainSocket.sendMessage(
                        mainChat,
                        { text: '⚠️ No se pudo generar el código. Intenta de nuevo.' },
                        { quoted: mainMsg }
                    ).catch(() => {});
                }
            }, 3000);
            pairingTimers.set(phone, timer);
        }

        sock.ev.on('connection.update', async (update: any) => {
            if (!ensureCurrent() || (pendingBots.get(phone) !== sock && activeBots.get(phone) !== sock)) return;
            const { connection, lastDisconnect, qr } = update;

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
                clearTimer(reconnectTimers, phone);
                clearTimer(connectionTimers, phone);
                clearTimer(pairingTimers, phone);
                connecting.delete(phone);
                retries.delete(phone);
                pendingBots.delete(phone);
                activeBots.set(phone, sock);
                console.log(`[SUB-BOT] Conectado: ${cleanJid(sock.user?.id)}`);

                try {
                    const ownerJid = mainMsg?.key?.participant || mainMsg?.sender || mainMsg?.from || '';
                    initializeSubBotConfig(phone, ownerJid);
                } catch (error) {
                    console.error(`[SUBBOT CONFIG ERROR]`, error);
                }

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
                if (activeBots.get(phone) === sock) activeBots.delete(phone);
                if (pendingBots.get(phone) === sock) pendingBots.delete(phone);
                clearTimer(connectionTimers, phone);
                clearTimer(pairingTimers, phone);

                if (code === DisconnectReason.loggedOut) {
                    stopSession(phone, token);
                    try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch {}
                    return;
                }

                connecting.add(phone);
                const n = (retries.get(phone) || 0) + 1;
                retries.set(phone, n);
                if (n > 8) {
                    stopSession(phone, token);
                    return;
                }
                if (reconnectTimers.has(phone)) return;
                try { sock.ev.removeAllListeners(); } catch {}
                try { sock.ws?.close(); } catch {}
                const timer = setTimeout(() => {
                    reconnectTimers.delete(phone);
                    connect().catch(failSession);
                }, 2000);
                reconnectTimers.set(phone, timer);
            }
        });

        const timeout = setTimeout(() => {
            if (!ensureCurrent() || activeBots.has(phone)) return;
            mainSocket.sendMessage(
                mainChat,
                { text: '⌛ Se agotó el tiempo para vincular el sub-bot. Vuelve a ejecutar el comando.' },
                { quoted: mainMsg }
            ).catch(() => {});
            stopSession(phone, token);
        }, 120000);
        connectionTimers.set(phone, timeout);
    };

    try {
        fs.mkdirSync(sessionPath, { recursive: true });
        await connect();
    } catch (error) {
        stopSession(phone, token);
        throw error;
    }
}

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
    stopSession(p);
}
