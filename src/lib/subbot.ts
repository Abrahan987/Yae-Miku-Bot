import fs from 'fs';
import path from 'path';
import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion, Browsers } from '@whiskeysockets/baileys';
import qrcode from 'qrcode';
import type { WASocket } from '@whiskeysockets/baileys';

const subsDir = path.join(process.cwd(), 'subs');
if (!fs.existsSync(subsDir)) fs.mkdirSync(subsDir, { recursive: true });

export interface SubBotConfig {
    phone: string;
    isCode: boolean;
    sender: string;
    mainSocket: WASocket;
    mainChat: string;
    mainMsg: any;
}

const activeBots = new Map<string, any>();
const botSessions = new Map<string, { createdAt: number; phone: string }>();

function normalizePhone(input: string): string {
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

export async function getLatestVersion(): Promise<any> {
    try {
        const { version } = await fetchLatestBaileysVersion();
        return version;
    } catch (e) {
        return [2, 3000, 1033105955];
    }
}

export async function startSubBot(config: SubBotConfig): Promise<any> {
    const { phone, isCode, mainSocket, mainChat, mainMsg } = config;
    const phoneNorm = normalizePhone(phone);

    if (!phoneNorm) {
        throw new Error('Número de teléfono inválido.');
    }

    if (activeBots.has(phoneNorm)) {
        throw new Error(`🪷 El sub-bot ${phoneNorm} ya está activo.`);
    }

    const sessionPath = path.join(subsDir, phoneNorm);
    if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const version = await getLatestVersion();

    let qrSent = false;
    let codeSent = false;
    let messageToDelete: any = null;

    const subbot: any = makeWASocket({
        version,
        browser: Browsers.macOS('Safari'),
        auth: state,
        printQRInTerminal: false,
        markOnlineOnConnect: false,
        syncFullHistory: false,
        fireInitQueries: false,
        generateHighQualityLinkPreview: false,
    });

    subbot.ev.on('creds.update', saveCreds);

    subbot.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (connection === 'open') {
            const botJid = subbot.user?.id || '';
            const botNumber = cleanJid(botJid);

            activeBots.set(phoneNorm, subbot);
            botSessions.set(phoneNorm, { createdAt: Date.now(), phone: phoneNorm });

            console.log(`[SUB-BOT] ✿ Conectado: ${botNumber}`);

            if (messageToDelete) {
                try {
                    await mainSocket.sendMessage(mainChat, { delete: messageToDelete.key });
                } catch (e) {}
            }

            try {
                await mainSocket.sendMessage(
                    mainChat,
                    {
                        text: `🪷 *SUB-BOT CONECTADO*\n\n` +
                            `✓ Número: *${botNumber}*\n` +
                            `✓ Estado: *ACTIVO*\n` +
                            `✓ Hora: *${new Date().toLocaleTimeString()}*\n\n` +
                            `📌 El sub-bot ya está listo para usar.`
                    },
                    { quoted: mainMsg }
                );
            } catch (e) {}
        }

        if (connection === 'close') {
            const reason = (lastDisconnect?.error as any)?.output?.statusCode;
            activeBots.delete(phoneNorm);
            botSessions.delete(phoneNorm);
            console.log(`[SUB-BOT] ✿ Desconectado: ${phoneNorm} (código ${reason})`);
        }

        if (qr && !isCode && !qrSent) {
            try {
                qrSent = true;
                const qrBuffer = await qrcode.toBuffer(qr, { scale: 8 });
                const sentMsg = await mainSocket.sendMessage(
                    mainChat,
                    {
                        image: qrBuffer,
                        caption: `🪷 *ESCANEA EL QR*\n\n` +
                            `🍓 Número: *${phoneNorm}*\n\n` +
                            `📌 Escanea este código en WhatsApp\n` +
                            `📌 Se eliminará en 1 minuto`
                    },
                    { quoted: mainMsg }
                );
                messageToDelete = sentMsg;
                setTimeout(() => {
                    if (messageToDelete) {
                        mainSocket.sendMessage(mainChat, { delete: messageToDelete.key }).catch(() => {});
                    }
                }, 60000);
            } catch (e) {
                console.error('[QR ERROR]', e);
            }
        }

        if (qr && isCode && !codeSent) {
            try {
                codeSent = true;
                const rawCode: string = await subbot.requestPairingCode(phoneNorm);
                const chunks = rawCode.match(/.{1,4}/g);
                const codeGen = chunks ? chunks.join('-') : rawCode;

                const sentMsg = await mainSocket.sendMessage(
                    mainChat,
                    {
                        text: `🪷 *CÓDIGO DE EMPAREJAMIENTO*\n\n` +
                            `🍓 Número: *${phoneNorm}*\n\n` +
                            `\`\`\`${codeGen}\`\`\`\n\n` +
                            `📌 Ingresa este código en WhatsApp\n` +
                            `📌 Se eliminará en 1 minuto`
                    },
                    { quoted: mainMsg }
                );
                messageToDelete = sentMsg;
                setTimeout(() => {
                    if (messageToDelete) {
                        mainSocket.sendMessage(mainChat, { delete: messageToDelete.key }).catch(() => {});
                    }
                }, 60000);
            } catch (e) {
                console.error('[CODE ERROR]', e);
            }
        }
    });

    return subbot;
}

export function getActiveBots(): Map<string, any> {
    return activeBots;
}

export function getBotSessions(): Map<string, any> {
    return botSessions;
}

export function removeSubBot(phone: string) {
    const phoneNorm = normalizePhone(phone);
    const bot = activeBots.get(phoneNorm);
    if (bot) {
        try {
            bot.ev.removeAllListeners();
            bot.ws?.close();
            bot.end?.(new Error('disconnected'));
        } catch (e) {}
        activeBots.delete(phoneNorm);
    }
    botSessions.delete(phoneNorm);
}

export function listActiveBots(): string[] {
    return Array.from(activeBots.keys());
}
