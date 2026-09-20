import { WASocket } from '@whiskeysockets/baileys';
import fs, { promises as fsPromises } from 'fs';
import path, { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { serialize } from '#simple';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commandMap = new Map<string, Function>();

export async function loadPlugins(dir = './src/plugins') {
    const cmdDir = path.resolve(__dirname, dir);
    if (!fs.existsSync(cmdDir)) return;

    commandMap.clear();

    async function getAllFiles(directory: string): Promise<string[]> {
        const entries = await fsPromises.readdir(directory, { withFileTypes: true });
        const files = await Promise.all(entries.map(e => {
            const res = join(directory, e.name);
            return e.isDirectory() ? getAllFiles(res) : Promise.resolve([res]);
        }));
        return files.flat();
    }

    try {
        const allFiles = await getAllFiles(cmdDir);
        const files = allFiles.filter(f => 
            (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.d.ts')
        );

        const ts = Date.now();

        await Promise.all(
            files.map(async (fullPath) => {
                try {
                    const fileUrl = pathToFileURL(fullPath).href;
                    const cmdModule = await import(`${fileUrl}?update=${ts}`);
                    
                    const handlerFn = cmdModule.default?.default || cmdModule.default || cmdModule.run;
                    if (typeof handlerFn !== 'function') return;

                    const cmds = cmdModule.command || cmdModule.cmd || cmdModule.alias || cmdModule.default?.command || [];
                    const commandList = Array.isArray(cmds) ? cmds : [cmds];

                    for (const cmd of commandList) {
                        if (cmd) commandMap.set(String(cmd).toLowerCase(), handlerFn);
                    }
                } catch {}
            })
        );
    } catch (e) {
        console.error('\x1b[38;2;255;182;218m[ ERROR ] Error al cargar plugins:\x1b[0m', e);
    }
}

async function executeCommand(sock: WASocket, rawMsg: any, msg: any) {
    if (!msg.body) return;

    const text = msg.body.trim();
    const args = text.split(/\s+/);
    const rawCmd = args.shift()?.toLowerCase() || '';
    const cleanCmd = rawCmd.replace(/^[./#!]/, '');

    const runFn = commandMap.get(rawCmd) || commandMap.get(cleanCmd);
    if (!runFn) return;

    await runFn(sock, rawMsg, msg, { text, args, command: cleanCmd });
}

export function handler(sock: WASocket) {
    sock.ev.on('messages.upsert', ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const rawMsg of messages) {
            if (!rawMsg?.key?.id || !rawMsg.message) continue;

            const jid = rawMsg.key.remoteJid || '';
            if (jid === 'status@broadcast' || jid.endsWith('@broadcast')) continue;

            const msg = serialize(sock, rawMsg);
            if (!msg) continue;

            executeCommand(sock, rawMsg, msg).catch(() => {});
        }
    });

    const pluginsPath = path.join(__dirname, 'src', 'plugins');
    if (fs.existsSync(pluginsPath)) {
        let timer: NodeJS.Timeout;
        fs.watch(pluginsPath, { recursive: true }, (_, filename) => {
            if (filename && (filename.endsWith('.ts') || filename.endsWith('.js'))) {
                clearTimeout(timer);
                timer = setTimeout(() => {
                    loadPlugins('./src/plugins').catch(() => {});
                }, 300);
            }
        });
    }
}
