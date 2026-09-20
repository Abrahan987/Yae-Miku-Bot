import { WASocket } from '@whiskeysockets/baileys';
import fs, { promises as fsPromises } from 'fs';
import path, { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { serialize } from '#simple';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

declare global {
    var plugins: Record<string, any>;
}

globalThis.plugins = globalThis.plugins || {};

export async function loadPlugins(dir = './src/plugins') {
    const cmdDir = path.resolve(__dirname, dir);
    if (!fs.existsSync(cmdDir)) return;

    const newPlugins: Record<string, any> = {};

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
                    const plugin = cmdModule.default?.default || cmdModule.default || cmdModule;
                    const pluginName = path.basename(fullPath);
                    newPlugins[pluginName] = plugin;
                } catch {}
            })
        );

        globalThis.plugins = newPlugins;
    } catch (e) {
        console.error('\x1b[38;2;255;182;218m[ ERROR ] Error al cargar plugins:\x1b[0m', e);
    }
}

async function executePlugins(sock: WASocket, rawMsg: any, msg: any) {
    for (const name in globalThis.plugins) {
        const plugin = globalThis.plugins[name];
        if (typeof plugin === 'function') {
            await plugin(sock, rawMsg, msg);
        } else if (typeof plugin?.run === 'function') {
            await plugin.run(sock, rawMsg, msg);
        }
    }
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

            executePlugins(sock, rawMsg, msg).catch(() => {});
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
