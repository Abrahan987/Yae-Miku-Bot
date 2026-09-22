import fs, { promises as fsPromises } from 'fs';
import path, { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const commandMap = new Map<string, Function>();

export const pluginData = new Map<
    string,
    {
        commands: string[];
        category: string;
        description: string;
    }
>();

export async function loadPlugins(dir = './plugins') {
    const cmdDir = path.resolve(__dirname, dir);

    if (!fs.existsSync(cmdDir)) return;

    commandMap.clear();
    pluginData.clear();

    async function getAllFiles(directory: string): Promise<string[]> {
        const entries = await fsPromises.readdir(directory, {
            withFileTypes: true
        });

        const files = await Promise.all(
            entries.map(e => {
                const res = join(directory, e.name);

                return e.isDirectory()
                    ? getAllFiles(res)
                    : Promise.resolve([res]);
            })
        );

        return files.flat();
    }

    try {
        const allFiles = await getAllFiles(cmdDir);

        const files = allFiles.filter(
            f =>
                (f.endsWith('.ts') || f.endsWith('.js')) &&
                !f.endsWith('.d.ts')
        );

        const ts = Date.now();

        await Promise.all(
            files.map(async fullPath => {
                try {
                    const fileUrl = pathToFileURL(fullPath).href;

                    const cmdModule = await import(
                        `${fileUrl}?update=${ts}`
                    );

                    const handlerFn =
                        cmdModule.default?.default ||
                        cmdModule.default ||
                        cmdModule.run;

                    if (typeof handlerFn !== 'function') return;

                    const cmds =
                        cmdModule.command ||
                        cmdModule.cmd ||
                        cmdModule.alias ||
                        cmdModule.default?.command ||
                        [];

                    const commandList = Array.isArray(cmds)
                        ? cmds
                        : [cmds];

                    const category =
                        cmdModule.category ||
                        cmdModule.default?.category ||
                        'misc';

                    const description =
                        cmdModule.description ||
                        cmdModule.desc ||
                        cmdModule.default?.description ||
                        'Sin descripción';

                    const commands = commandList
                        .filter(Boolean)
                        .map((cmd: any) => String(cmd).toLowerCase());

                    for (const cmd of commands) {
                        commandMap.set(cmd, handlerFn);
                    }

                    if (commands.length) {
                        pluginData.set(fullPath, {
                            commands,
                            category: String(category).toLowerCase(),
                            description: String(description)
                        });
                    }
                } catch (error) {
                    console.error(
                        '\x1b[38;2;255;182;218m[ PLUGIN ] Error:\x1b[0m',
                        fullPath,
                        error
                    );
                }
            })
        );
    } catch (e) {
        console.error(
            '\x1b[38;2;255;182;218m[ ERROR ] Error al cargar plugins:\x1b[0m',
            e
        );
    }
}

export function watchPlugins(dir = './plugins') {
    const pluginsPath = path.resolve(__dirname, dir);

    if (fs.existsSync(pluginsPath)) {
        let timer: NodeJS.Timeout;

        fs.watch(
            pluginsPath,
            { recursive: true },
            (_, filename) => {
                if (
                    filename &&
                    (
                        filename.endsWith('.ts') ||
                        filename.endsWith('.js')
                    )
                ) {
                    clearTimeout(timer);

                    timer = setTimeout(() => {
                        loadPlugins(dir).catch(() => {});
                    }, 300);
                }
            }
        );
    }
}
