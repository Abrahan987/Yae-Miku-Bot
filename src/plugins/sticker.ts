import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import webp from 'node-webpmux';

export const command = ['sticker', 's', 'stiker'];
export const category = 'stickers';
export const description = 'Convierte una imagen, video, gif, sticker o URL en sticker.';
export const admin = false;
export const botAdmin = false;

const tmpDir = path.join(os.tmpdir(), 'yae-miku-stickers');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const shapeArgs: Record<string, string> = {
    '-c': 'circle',
    '-d': 'diamond',
    '-b': 'border',
    '-f': 'frame',
    '-m': 'mirror',
    '-x': 'cover'
};

const effectArgs: Record<string, string> = {
    '-blur': 'blur',
    '-sepia': 'sepia',
    '-sharpen': 'sharpen',
    '-brighten': 'brighten',
    '-darken': 'darken',
    '-invert': 'invert',
    '-grayscale': 'grayscale',
    '-flip': 'flip',
    '-flop': 'flop',
    '-rotate90': 'rotate90'
};

const isUrl = (text: string) => /^https?:\/\/\S+$/i.test(text);

function helpText(prefix: string) {
    return (
        `🪷 *𝗦𝗧𝗜𝗖𝗞𝗘𝗥*\n` +
        `─────── ❀ ───────\n\n` +
        `🍓 *Uso:*\n` +
        `> ${prefix}s (responde o envía una imagen/video)\n` +
        `> ${prefix}s <url de imagen/video>\n` +
        `> ${prefix}s Pack • Autor\n\n` +
        `✦ *Formas:*\n` +
        `> -c círculo\n` +
        `> -d diamante\n` +
        `> -b borde\n` +
        `> -f marco\n` +
        `> -m espejo\n` +
        `> -x rellenar (cover)\n\n` +
        `✦ *Efectos:*\n` +
        `> -blur -sepia -sharpen -brighten\n` +
        `> -darken -invert -grayscale\n` +
        `> -flip -flop -rotate90\n\n` +
        `─────── ❀ ───────`
    );
}

function buildFilters(shape: string | undefined, effects: string[]): string {
    const W = 512;
    const H = 512;
    const f: string[] = [];

    if (shape === 'cover') {
        f.push(`scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}`);
    } else {
        f.push(`scale=${W}:${H}:force_original_aspect_ratio=decrease`);
        f.push(`pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`);
    }

    f.push('format=rgba');

    for (const e of effects) {
        switch (e) {
            case 'blur': f.push('gblur=sigma=5'); break;
            case 'sepia': f.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131'); break;
            case 'sharpen': f.push('unsharp=5:5:1.0:5:5:0.0'); break;
            case 'brighten': f.push('eq=brightness=0.05'); break;
            case 'darken': f.push('eq=brightness=-0.05'); break;
            case 'invert': f.push('negate'); break;
            case 'grayscale': f.push('hue=s=0'); break;
            case 'flip': f.push('hflip'); break;
            case 'flop': f.push('vflip'); break;
            case 'rotate90': f.push('transpose=1'); break;
        }
    }

    if (shape === 'mirror') f.push('hflip');

    if (shape === 'circle') {
        const c = W / 2;
        f.push(`geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte((X-${c})*(X-${c})+(Y-${c})*(Y-${c}),${c * c}),alpha(X,Y),0)'`);
    }
    if (shape === 'diamond') {
        const c = W / 2;
        f.push(`geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte(abs(X-${c})+abs(Y-${c}),${c}),alpha(X,Y),0)'`);
    }
    if (shape === 'border') f.push(`drawbox=x=0:y=0:w=${W}:h=${H}:color=white@0.9:t=10`);
    if (shape === 'frame') f.push(`drawbox=x=15:y=15:w=${W - 30}:h=${H - 30}:color=white@0.7:t=8`);

    f.push('format=yuva420p');
    return f.join(',');
}

function runFFmpeg(input: string, output: string, vf: string, animated: boolean): Promise<void> {
    const args = animated
        ? ['-y', '-i', input, '-t', '10', '-vf', `fps=15,${vf}`, '-an', '-c:v', 'libwebp', '-loop', '0', '-preset', 'default', '-q:v', '60', '-compression_level', '6', output]
        : ['-y', '-i', input, '-vf', vf, '-an', '-frames:v', '1', '-c:v', 'libwebp', '-q:v', '80', output];

    return new Promise((resolve, reject) => {
        const p = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
        let err = '';
        p.stderr.on('data', (d) => (err += d.toString()));
        p.on('error', reject);
        p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err.slice(-300) || `ffmpeg code ${code}`))));
    });
}

async function addExif(buffer: Buffer, packname: string, author: string): Promise<Buffer> {
    const img = new (webp as any).Image();
    await img.load(buffer);

    const json = {
        'sticker-pack-id': `yae-miku-${Date.now()}`,
        'sticker-pack-name': packname,
        'sticker-pack-publisher': author,
        emojis: ['🪷']
    };

    const exifAttr = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
    const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8');
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);

    img.exif = exif;
    return await img.save(null);
}

async function downloadQuoted(media: any, type: string): Promise<Buffer> {
    const stream = await downloadContentFromMessage(media, type as any);
    const chunks: Buffer[] = [];
    for await (const c of stream) chunks.push(c);
    return Buffer.concat(chunks);
}

export default async function (sock: any, msg: any, extra: any) {
    const args: string[] = extra.args || [];
    const prefix = (global as any).prefix?.[0] || '.';
    const files: string[] = [];

    try {
        const nameBot = (global as any).namebot || 'Yae Miku Bot';
        const creador = (global as any).nmcreador || '';
        const userName = msg.pushName || 'Usuario';

        if (args[0] === '-list' || args[0] === 'help') {
            return msg.reply(helpText(prefix));
        }

        let urlArg: string | null = null;
        const rest: string[] = [];
        for (const a of args) {
            if (isUrl(a)) urlArg = a;
            else rest.push(a);
        }

        const shapes = rest.filter((a) => shapeArgs[a.toLowerCase()]).map((a) => shapeArgs[a.toLowerCase()]);
        const effects = rest.filter((a) => effectArgs[a.toLowerCase()]).map((a) => effectArgs[a.toLowerCase()]);
        const shape = shapes[0];

        const customText = rest.filter((a) => !a.startsWith('-')).join(' ').trim();
        const parts = customText.split(/[•|]/).map((p) => p.trim()).filter(Boolean);

        const packname = parts[0] || `${nameBot}`;
        const author = parts[1] || `Creador: ${creador}\nUsuario: ${userName}`;

        let media: any = null;
        let mediaType = '';
        let mime = '';

        const current = msg.message || {};
        const candidates: Array<{ type: string; content: any }> = [];

        const pushCandidate = (m: any) => {
            if (!m) return;
            for (const t of ['imageMessage', 'videoMessage', 'stickerMessage']) {
                if (m[t]) candidates.push({ type: t, content: m[t] });
            }
        };

        pushCandidate(current);
        pushCandidate(current.viewOnceMessage?.message);
        pushCandidate(current.viewOnceMessageV2?.message);
        if (msg.quoted?.msg && msg.quoted?.type) {
            candidates.push({ type: msg.quoted.type, content: msg.quoted.msg });
        }

        const found = candidates.find((c) => ['imageMessage', 'videoMessage', 'stickerMessage'].includes(c.type));
        if (found) {
            media = found.content;
            mediaType = found.type.replace('Message', '');
            mime = media.mimetype || '';
        }

        let inputBuffer: Buffer | null = null;
        let isAnimated = false;
        let ext = 'img';

        if (media) {
            if (mediaType === 'video' && (media.seconds || 0) > 15) {
                return msg.reply('⚠️ El video no puede durar más de 15 segundos.');
            }
            inputBuffer = await downloadQuoted(media, mediaType);
            isAnimated = mediaType === 'video' || /gif/i.test(mime) || (mediaType === 'sticker' && !!media.isAnimated);
            ext = mediaType === 'video' ? 'mp4' : mediaType === 'sticker' ? 'webp' : /png/i.test(mime) ? 'png' : 'jpg';
        } else if (urlArg) {
            if (!/\.(jpe?g|png|gif|webp|mp4|mov|webm|mkv)(\?.*)?$/i.test(urlArg)) {
                return msg.reply('⚠️ La URL debe ser de una imagen (jpg, png, gif, webp) o video (mp4, mov, webm, mkv).');
            }
            const res = await fetch(urlArg);
            if (!res.ok) return msg.reply('⚠️ No pude descargar ese archivo desde la URL.');
            inputBuffer = Buffer.from(await res.arrayBuffer());
            const m = urlArg.match(/\.(jpe?g|png|gif|webp|mp4|mov|webm|mkv)(\?.*)?$/i);
            ext = (m?.[1] || 'img').toLowerCase();
            isAnimated = /^(gif|mp4|mov|webm|mkv)$/.test(ext);
        }

        if (!inputBuffer) {
            return msg.reply(
                `🪷 *𝗦𝗧𝗜𝗖𝗞𝗘𝗥*\n\n` +
                `🍓 Envía o responde a una imagen, video, gif o sticker.\n` +
                `📌 También puedes usar una URL.\n\n` +
                `> Usa *${prefix}s -list* para ver formas y efectos`
            );
        }

        const stamp = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const inputPath = path.join(tmpDir, `in-${stamp}.${ext}`);
        const outputPath = path.join(tmpDir, `out-${stamp}.webp`);
        files.push(inputPath, outputPath);

        fs.writeFileSync(inputPath, inputBuffer);

        const vf = buildFilters(shape, effects);
        await runFFmpeg(inputPath, outputPath, vf, isAnimated);

        const webpBuffer = fs.readFileSync(outputPath);
        const finalBuffer = await addExif(webpBuffer, packname, author);

        await sock.sendMessage(msg.chat, { sticker: finalBuffer }, { quoted: msg });
    } catch (error: any) {
        console.error('[STICKER ERROR]:', error);
        return msg.reply(
            `⚠️ *ERROR AL CREAR STICKER*\n\n` +
            `🍥 ${error?.message?.slice(0, 200) || 'Error desconocido'}\n\n` +
            `📌 Verifica que ffmpeg esté instalado.`
        );
    } finally {
        for (const f of files) {
            try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {}
        }
    }
}
