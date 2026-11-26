import fs, { promises as fsPromises } from 'fs';
import path, { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const commandMap = new Map<string, Function>();

export const pluginData = new Map<string, { commands: string[]; category: string; description: string }>();
let pluginWatcher: fs.FSWatcher | undefined;
let activeLoad: Promise<void> | undefined;
let reloadRequested = false;

export async function loadPlugins(dir = '../plugins') {
    if (activeLoad) {
        reloadRequested = true;
        await activeLoad;
        return;
    }

    activeLoad = (async () => {
        do {
            reloadRequested = false;
            await loadPluginSnapshot(dir);
        } while (reloadRequested);
    })();

    try {
        await activeLoad;
    } finally {
        activeLoad = undefined;
    }
}

async function loadPluginSnapshot(dir: string): Promise<void> {
    const cmdDir = path.resolve(__dirname, dir);
    if (!fs.existsSync(cmdDir)) return;

    async function getAllFiles(directory: string): Promise<string[]> {
        const entries = await fsPromises.readdir(directory, { withFileTypes: true });
        const files = await Promise.all(entries.map(e => {
            const res = join(directory, e.name);
            return e.isDirectory() ? getAllFiles(res) : Promise.resolve([res]);
        }));
        return files.flat();
    }

    try {
        const allFiles = (await getAllFiles(cmdDir)).sort();
        const files = allFiles.filter(f => (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.d.ts'));
        const ts = Date.now();
        const nextCommands = new Map<string, Function>();
        const nextPluginData = new Map<string, { commands: string[]; category: string; description: string }>();
        let failed = false;

        await Promise.all(files.map(async fullPath => {
            try {
                const fileUrl = pathToFileURL(fullPath).href;
                const cmdModule = await import(`${fileUrl}?update=${ts}`);
                const handlerFn: any = cmdModule.default?.default || cmdModule.default || cmdModule.run;
                if (typeof handlerFn !== 'function') return;

                const cmds = cmdModule.command || cmdModule.cmd || cmdModule.alias || cmdModule.default?.command || [];
                const commandList = Array.isArray(cmds) ? cmds : [cmds];
                const category = cmdModule.category || cmdModule.default?.category || 'misc';
                const description = cmdModule.description || cmdModule.desc || cmdModule.default?.description || 'Sin descripción';
                const commands = commandList.filter(Boolean).map((cmd: any) => String(cmd).toLowerCase());

                // El handler usa estos metadatos para bloquear comandos de admin, bot-admin u owner.
                handlerFn.plugin = {
                    admin: Boolean(cmdModule.admin ?? cmdModule.default?.admin),
                    botAdmin: Boolean(cmdModule.botAdmin ?? cmdModule.botadmin ?? cmdModule.default?.botAdmin ?? cmdModule.default?.botadmin),
                    owner: Boolean(cmdModule.owner ?? cmdModule.isOwner ?? cmdModule.default?.owner ?? cmdModule.default?.isOwner),
                    needsGroupMetadata: cmdModule.needsGroupMetadata !== false
                };

                for (const cmd of commands) nextCommands.set(cmd, handlerFn);

                const menuEntries: { command: string[]; description: string }[] | undefined = Array.isArray(cmdModule.menu) ? cmdModule.menu : undefined;
                if (menuEntries?.length) {
                    menuEntries.forEach((entry, i) => {
                        const entryCmds = (entry.command || []).filter(Boolean).map((c: any) => String(c).toLowerCase());
                        if (!entryCmds.length) return;
                        nextPluginData.set(`${fullPath}#${i}`, { commands: entryCmds, category: String(category).toLowerCase(), description: String(entry.description || description) });
                    });
                } else if (commands.length) {
                    nextPluginData.set(fullPath, { commands, category: String(category).toLowerCase(), description: String(description) });
                }
            } catch (error) {
                failed = true;
                console.error('\x1b[38;2;255;182;218m[ PLUGIN ] Error:\x1b[0m', fullPath, error);
            }
        }));

        if (failed) {
            console.error('\x1b[38;2;255;182;218m[ PLUGIN ] Se conserva la última carga válida.\x1b[0m');
            return;
        }

        commandMap.clear();
        pluginData.clear();
        for (const [command, handler] of nextCommands) commandMap.set(command, handler);
        for (const [key, data] of nextPluginData) pluginData.set(key, data);
    } catch (e) {
        console.error('\x1b[38;2;255;182;218m[ ERROR ] Error al cargar plugins:\x1b[0m', e);
    }
}

export function watchPlugins(dir = '../plugins') {
    const pluginsPath = path.resolve(__dirname, dir);
    if (!fs.existsSync(pluginsPath) || pluginWatcher) return;
    let timer: NodeJS.Timeout;
    pluginWatcher = fs.watch(pluginsPath, { recursive: true }, (_, filename) => {
        if (filename && (filename.endsWith('.ts') || filename.endsWith('.js'))) {
            clearTimeout(timer);
            timer = setTimeout(() => { loadPlugins(dir).catch(() => {}); }, 300);
        }
    });
}
