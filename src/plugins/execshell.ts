import { exec } from 'node:child_process';
import { authorizeOwnerCommand, commandInput, replyOwnerOutput } from '../lib/owner_command.ts';

export const command = ['r'];
export const category = 'owner';
export const description = 'Ejecuta comandos del sistema (solo owner principal).';
export const owner = true;

export default async function (sock: any, msg: any, extra: any, _db: any, rawMsg: any) {
    if (!await authorizeOwnerCommand(sock, msg, rawMsg)) return;
    const input = commandInput(extra);
    if (!input) return replyOwnerOutput(msg, '𝚃𝙴𝚁𝙼𝙸𝙽𝙰𝙻', '🪷 Escribe un comando del sistema.');

    const result = await new Promise<{ error: Error | null; stdout: string; stderr: string }>(resolve => {
        exec(input, { timeout: 30000, maxBuffer: 256 * 1024 }, (error, stdout, stderr) => {
            resolve({ error, stdout, stderr });
        });
    });
    const output = [
        result.stdout.trim(),
        result.stderr.trim(),
        result.error ? `Error: ${result.error.message}` : ''
    ].filter(Boolean).join('\n\n');
    await replyOwnerOutput(msg, result.error ? '𝙴𝚁𝚁𝙾𝚁' : '𝚃𝙴𝚁𝙼𝙸𝙽𝙰𝙻', output);
}
