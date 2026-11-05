import { AsyncLocalStorage } from 'node:async_hooks';
import { getSubBotName } from './subbot_config.ts';

const storage = new AsyncLocalStorage<any>();

export function runWithBot<T>(sock: any, fn: () => T): T {
    return storage.run(sock, fn);
}

export function installBotIdentity(): void {
    const g = globalThis as any;
    let base = g.namebot;

    Object.defineProperty(g, 'namebot', {
        configurable: true,
        enumerable: true,
        get() {
            const phone = storage.getStore()?.subbotPhone;
            if (phone) {
                try {
                    const custom = getSubBotName(phone);
                    if (custom) return custom;
                } catch {}
            }
            return base;
        },
        set(value) {
            base = value;
        }
    });
}
