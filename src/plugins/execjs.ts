import { createRequire } from 'node:module';
import { formatWithOptions } from 'node:util';
import { authorizeOwnerCommand, commandInput, replyOwnerOutput } from '../lib/owner_command.ts';

export const command = ['ex', 'e'];
export const category = 'owner';
export const description = 'Ejecuta JavaScript en el bot principal (solo owner).';
export const owner = true;

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const require = createRequire(import.meta.url);

export default async function (sock: any, msg: any, extra: any, _db: any, rawMsg: any) {
    if (!await authorizeOwnerCommand(sock, msg, rawMsg)) return;
    const code = commandInput(extra);
    if (!code) return replyOwnerOutput(msg, '𝙹𝙰𝚅𝙰𝚂𝙲𝚁𝙸𝙿𝚃', '🪷 Escribe el código que deseas ejecutar.');

    const printed: string[] = [];
    const print = (...values: any[]) => {
        if (printed.length < 15) printed.push(formatWithOptions({ depth: 3, maxArrayLength: 50 }, ...values));
    };

    try {
        const body = extra.command === 'e' ? `return (${code}\n);` : code;
        const execute = new AsyncFunction('sock', 'msg', 'args', 'require', 'print', 'process', body);
        const result = await execute.call(sock, sock, msg, extra.args || [], require, print, process);
        if (result !== undefined || !printed.length) {
            printed.push(formatWithOptions({ depth: 3, maxArrayLength: 50 }, result));
        }
        await replyOwnerOutput(msg, '𝙹𝙰𝚅𝙰𝚂𝙲𝚁𝙸𝙿𝚃', printed.join('\n'));
    } catch (error) {
        await replyOwnerOutput(msg, '𝙴𝚁𝚁𝙾𝚁', formatWithOptions({ depth: 3 }, error));
    }
}
