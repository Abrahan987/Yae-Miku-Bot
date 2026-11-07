import { isMainPrivateModeOwner } from './private_mode.ts';
import { deco, warn } from './perms.ts';

export async function authorizeOwnerCommand(sock: any, msg: any, rawMsg: any): Promise<boolean> {
    if (isMainPrivateModeOwner(sock, msg, rawMsg)) return true;
    await msg.reply(warn.owner());
    return false;
}

export function commandInput(extra: any): string {
    if (typeof extra?.rawArgs === 'string') return extra.rawArgs.trim();
    if (typeof extra?.text === 'string') {
        const match = extra.text.trim().match(/^\S+[ \t\r\n]+([\s\S]*)$/);
        if (match) return match[1].trim();
    }
    return Array.isArray(extra?.args) ? extra.args.join(' ').trim() : '';
}

export async function replyOwnerOutput(msg: any, title: string, value: string): Promise<void> {
    const output = value || '(sin salida)';
    const maximum = 12000;
    const shortened = output.length > maximum
        ? `${output.slice(0, maximum)}\n\n[Salida truncada]`
        : output;
    for (let i = 0; i < shortened.length; i += 3000) {
        await msg.reply(deco(title, shortened.slice(i, i + 3000)));
    }
}
