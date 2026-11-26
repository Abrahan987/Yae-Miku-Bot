import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const MAX_BYTES = 32 * 1024 * 1024;
export const processing = new Set<string>();
const MAX_SECONDS = 600;
const LOCAL_TIMEOUT = 120_000;
const ID = /^[A-Za-z0-9_-]{11}$/;

export function isAuthorized(videoId: string): boolean {
    return ID.test(videoId) && process.env.PLAY2_LOCAL_ENABLED === '1' &&
        (process.env.PLAY2_AUTHORIZED_IDS ?? '').split(/[\s,]+/).includes(videoId);
}

function runDownloader(videoId: string, dir: string): Promise<void> {
    const binary = process.env.YTDLP_PATH || 'yt-dlp';
    const args = [
        '--ignore-config', '--no-plugin-dirs', '--no-cache-dir',
        '--no-playlist', '--no-progress', '--no-warnings',
        '--no-geo-bypass', '--socket-timeout', '15',
        '--retries', '1', '--fragment-retries', '1',
        '--js-runtimes', 'node',
        '--match-filters', `duration <= ${MAX_SECONDS} & !is_live & !was_live`,
        '--max-filesize', String(MAX_BYTES),
        // Un solo MP4 H.264/AAC, sin fusión ni transcodificación.
        '-f', 'b[ext=mp4][height<=360][vcodec^=avc1][acodec^=mp4a][protocol=https]',
        '-o', join(dir, 'video.%(ext)s'),
        '--', `https://www.youtube.com/watch?v=${videoId}`
    ];

    return new Promise((resolve, reject) => {
        let reason = '';
        const child = execFile(binary, args, {
            windowsHide: true,
            shell: false,
            timeout: LOCAL_TIMEOUT,
            killSignal: 'SIGKILL',
            maxBuffer: 256 * 1024
        }, (error) => {
            clearInterval(watch);
            if (reason) return reject(new Error(reason));
            if (error) {
                if (error.code === 'ENOENT') return reject(new Error('LOCAL_MISSING'));
                if (error.killed) return reject(new Error('LOCAL_TIMEOUT'));
                return reject(new Error('LOCAL_ERROR'));
            }
            resolve();
        });
        // Complementa --max-filesize cuando no se conoce el peso de antemano.
        const watch = setInterval(() => {
            try {
                const total = readdirSync(dir).reduce((sum, name) => {
                    try { return sum + statSync(join(dir, name)).size; }
                    catch { return sum; }
                }, 0);
                if (total > MAX_BYTES) {
                    reason = 'LOCAL_LIMIT';
                    child.kill('SIGKILL');
                }
            } catch {
                reason = 'LOCAL_ERROR';
                child.kill('SIGKILL');
            }
        }, 250);
        watch.unref();
    });
}

export async function downloadLocal(videoId: string): Promise<Buffer> {
    if (!isAuthorized(videoId)) throw new Error('LOCAL_NOT_AUTHORIZED');
    const dir = await mkdtemp(join(tmpdir(), 'yae-play2-'));
    try {
        await runDownloader(videoId, dir);
        const file = join(dir, 'video.mp4');
        const info = await stat(file).catch(() => null);
        if (!info?.isFile() || info.size <= 0 || info.size > MAX_BYTES) {
            throw new Error('LOCAL_LIMIT');
        }
        const buffer = await readFile(file);
        if (buffer.length > MAX_BYTES ||
            buffer.subarray(4, 8).toString('ascii') !== 'ftyp') {
            throw new Error('LOCAL_LIMIT');
        }
        return buffer;
    } finally {
        await rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
            .catch(() => console.warn('[PLAY2] No se pudo limpiar el temporal.'));
    }
}

