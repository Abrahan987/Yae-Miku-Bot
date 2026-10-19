import crypto from 'node:crypto';
import { fileTypeFromBuffer } from 'file-type';
import { promises as fsp } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

export const command = ['hd', 'enhance', 'remini'];
export const category = 'utils';
export const description = 'Mejorar la calidad de una imagen.';

const IMG_RE = /^image\/(jpe?g|png|webp)$/i;

async function safeFileType(buf: Buffer) {
    try {
        return await fileTypeFromBuffer(buf);
    } catch {
        return null;
    }
}

function runFfmpeg(args: string[], timeoutMs = 60_000) {
    return new Promise((resolve, reject) => {
        const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
        let stderr = '';
        const timer = setTimeout(() => {
            try { proc.kill('SIGKILL'); } catch {}
            reject(new Error('ffmpeg timeout'));
        }, timeoutMs);
        proc.stderr.on('data', (d) => (stderr += d.toString()));
        proc.on('error', (e) => { clearTimeout(timer); reject(e); });
        proc.on('close', (code) => {
            clearTimeout(timer);
            code === 0 ? resolve(true) : reject(new Error(stderr || `ffmpeg salió con código ${code}`));
        });
    });
}

async function webpToPng(webpBuf: Buffer, tmpDir: string) {
    const tag = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const inPath = path.join(tmpDir, `vi_in_${tag}.webp`);
    const outPath = path.join(tmpDir, `vi_out_${tag}.png`);
    await fsp.writeFile(inPath, webpBuf);
    try {
        await runFfmpeg(['-y', '-i', inPath, '-frames:v', '1', outPath]);
        return { ok: true, png: await fsp.readFile(outPath), error: '' };
    } catch (e: any) {
        return { ok: false, png: null as Buffer | null, error: e?.message || String(e) };
    } finally {
        await fsp.unlink(inPath).catch(() => {});
        await fsp.unlink(outPath).catch(() => {});
    }
}

async function enhance(inputBuf: Buffer, inputMime: string) {
    const API = 'https://us-central1-vector-ink.cloudfunctions.net/upscaleImage';
    const ORIGIN = 'https://vectorink.io';
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36';
    const tmpDir = path.join(os.tmpdir(), 'vectorink');

    try {
        await fsp.mkdir(tmpDir, { recursive: true });
        const res = await fetch(API, {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: '*/*', origin: ORIGIN, referer: `${ORIGIN}/`, 'user-agent': UA },
            body: JSON.stringify({ image_b64: inputBuf.toString('base64'), inputMime, model: 'upscaler' }),
            signal: AbortSignal.timeout(120_000)
        });

        const raw = await res.text();
        let j: any;
        try { j = JSON.parse(raw); } catch { j = { raw }; }

        if (!res.ok) return { ok: false, reason: `request ${res.status}` };

        const innerText = j?.result;
        if (typeof innerText !== 'string' || innerText.length < 10) return { ok: false, reason: 'no_result' };

        let inner: any;
        try { inner = JSON.parse(innerText); } catch { return { ok: false, reason: 'bad_result_json' }; }

        const b64 = inner?.image?.b64_json;
        if (!b64 || typeof b64 !== 'string') return { ok: false, reason: 'no_b64' };

        const webpBuf = Buffer.from(b64, 'base64');
        if (webpBuf.length < 10) return { ok: false, reason: 'b64_empty' };

        const conv = await webpToPng(webpBuf, tmpDir);
        if (!conv.ok || !conv.png) return { ok: false, reason: conv.error || 'ffmpeg_failed' };

        return { ok: true, buffer: conv.png };
    } catch (e: any) {
        return { ok: false, reason: e?.message || String(e) };
    }
}

export default async function (sock: any, msg: any, extra: any) {
    const quoted = msg.quoted || msg;
    const mime = quoted?.mimetype || quoted?.msg?.mimetype || '';

    if (!mime) {
        return msg.reply(`🪷 *HD*\n\n🍓 Responde a una imagen con ${(global as any).prefix?.[0] || '.'}${extra.command}`);
    }

    if (!IMG_RE.test(mime)) {
        return msg.reply(`🍥 El formato ${mime} no es compatible.`);
    }

    try {
        const buffer = await quoted.download?.();
        if (!buffer || buffer.length < 10) {
            return msg.reply('🍥 No se pudo descargar la imagen.');
        }

        const ft = await safeFileType(buffer);
        const resolvedMime = ft?.mime || mime;

        if (!IMG_RE.test(resolvedMime)) {
            return msg.reply(`🍥 El formato ${resolvedMime} no es compatible.`);
        }

        const result: any = await enhance(buffer, resolvedMime);
        if (!result.ok) {
            return msg.reply(`🍥 No se pudo mejorar la imagen.\n🪷 ${result.reason}`);
        }

        return sock.sendMessage(msg.from, { image: result.buffer, caption: '🪷 *HD*\n\n🍓 Imagen mejorada.' }, { quoted: msg });
    } catch (e: any) {
        console.error('[HD]', e);
        return msg.reply(`🍥 Ocurrió un error inesperado.\n🪷 ${e?.message || String(e)}`);
    }
}
