import axios from 'axios';
import ytsearch from 'yt-search';
import { deflateSync, crc32 } from 'node:zlib';

export const command = ['play', 'mp3', 'ytmp3', 'ytaudio', 'playaudio'];
export const category = 'descargas';
export const description = 'Busca y descarga canciones de YouTube en MP3 con reproductor visual.';

const processing = new Set<string>();

const cleanTitle = (title: string) =>
    title.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100);

type RGBA = { r: number; g: number; b: number; a?: number };

// Fuente bitmap 5x7 (solo mayusculas, numeros y simbolos basicos)
const FONT: Record<string, number[]> = {
    ' ': [0, 0, 0, 0, 0, 0, 0],
    '0': [14, 17, 19, 21, 25, 17, 14], '1': [4, 12, 4, 4, 4, 4, 14],
    '2': [14, 17, 1, 2, 4, 8, 31], '3': [30, 1, 1, 14, 1, 1, 30],
    '4': [2, 6, 10, 18, 31, 2, 2], '5': [31, 16, 30, 1, 1, 17, 14],
    '6': [14, 16, 30, 17, 17, 17, 14], '7': [31, 1, 2, 4, 8, 8, 8],
    '8': [14, 17, 17, 14, 17, 17, 14], '9': [14, 17, 17, 15, 1, 1, 14],
    A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30],
    C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30],
    E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
    G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
    I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12],
    K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
    M: [17, 27, 21, 21, 17, 17, 17], N: [17, 25, 21, 19, 17, 17, 17],
    O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
    Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17],
    S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
    U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 10, 10, 4],
    W: [17, 17, 17, 21, 21, 27, 17], X: [17, 17, 10, 4, 10, 17, 17],
    Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
    '-': [0, 0, 0, 31, 0, 0, 0], '.': [0, 0, 0, 0, 0, 12, 12],
    ':': [0, 12, 12, 0, 12, 12, 0], '(': [2, 4, 8, 8, 8, 4, 2],
    ')': [8, 4, 2, 2, 2, 4, 8], '&': [14, 17, 10, 4, 10, 17, 14],
    '!': [4, 4, 4, 4, 4, 0, 4], '?': [14, 17, 1, 2, 4, 0, 4],
    "'": [4, 4, 0, 0, 0, 0, 0], ',': [0, 0, 0, 0, 12, 4, 8],
    '/': [1, 2, 4, 8, 16, 0, 0], '#': [10, 31, 10, 10, 31, 10, 10]
};

function createCanvas(width: number, height: number) {
    const px = new Uint8Array(width * height * 4);

    const set = (x: number, y: number, c: RGBA) => {
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        const i = (y * width + x) * 4;
        px[i] = c.r; px[i + 1] = c.g; px[i + 2] = c.b; px[i + 3] = c.a ?? 255;
    };

    const rect = (x: number, y: number, w: number, h: number, c: RGBA) => {
        for (let yy = Math.max(0, y); yy < Math.min(height, y + h); yy++)
            for (let xx = Math.max(0, x); xx < Math.min(width, x + w); xx++) set(xx, yy, c);
    };

    const circle = (cx: number, cy: number, r: number, c: RGBA) => {
        for (let y = -r; y <= r; y++)
            for (let x = -r; x <= r; x++)
                if (x * x + y * y <= r * r) set(cx + x, cy + y, c);
    };

    const rounded = (x: number, y: number, w: number, h: number, r: number, c: RGBA) => {
        rect(x + r, y, w - 2 * r, h, c);
        rect(x, y + r, w, h - 2 * r, c);
        circle(x + r, y + r, r, c);
        circle(x + w - r - 1, y + r, r, c);
        circle(x + r, y + h - r - 1, r, c);
        circle(x + w - r - 1, y + h - r - 1, r, c);
    };

    const triangle = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, c: RGBA) => {
        const minX = Math.min(x1, x2, x3), maxX = Math.max(x1, x2, x3);
        const minY = Math.min(y1, y2, y3), maxY = Math.max(y1, y2, y3);
        const area = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
            (ax - cx) * (by - cy) - (bx - cx) * (ay - cy);
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const d1 = area(x, y, x1, y1, x2, y2);
                const d2 = area(x, y, x2, y2, x3, y3);
                const d3 = area(x, y, x3, y3, x1, y1);
                const neg = d1 < 0 || d2 < 0 || d3 < 0;
                const pos = d1 > 0 || d2 > 0 || d3 > 0;
                if (!(neg && pos)) set(x, y, c);
            }
        }
    };

    const line = (x1: number, y1: number, x2: number, y2: number, c: RGBA, t = 1) => {
        const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) || 1;
        for (let i = 0; i <= steps; i++) {
            const x = Math.round(x1 + ((x2 - x1) * i) / steps);
            const y = Math.round(y1 + ((y2 - y1) * i) / steps);
            circle(x, y, t, c);
        }
    };

    const text = (x: number, y: number, str: string, c: RGBA, scale = 3) => {
        let cx = x;
        for (const ch of str.toUpperCase()) {
            const glyph = FONT[ch] || FONT[' '];
            for (let row = 0; row < 7; row++)
                for (let col = 0; col < 5; col++)
                    if ((glyph[row] >> (4 - col)) & 1) rect(cx + col * scale, y + row * scale, scale, scale, c);
            cx += 6 * scale;
        }
    };

    const png = () => {
        const raw = Buffer.alloc((width * 4 + 1) * height);
        for (let y = 0; y < height; y++) {
            const o = y * (width * 4 + 1);
            raw[o] = 0;
            Buffer.from(px.buffer, y * width * 4, width * 4).copy(raw, o + 1);
        }
        const chunk = (type: string, data: Buffer) => {
            const len = Buffer.alloc(4);
            len.writeUInt32BE(data.length);
            const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
            const crc = Buffer.alloc(4);
            crc.writeUInt32BE(crc32(body) >>> 0);
            return Buffer.concat([len, body, crc]);
        };
        const ihdr = Buffer.alloc(13);
        ihdr.writeUInt32BE(width, 0);
        ihdr.writeUInt32BE(height, 4);
        ihdr[8] = 8; ihdr[9] = 6;
        return Buffer.concat([
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
            chunk('IHDR', ihdr),
            chunk('IDAT', deflateSync(raw)),
            chunk('IEND', Buffer.alloc(0))
        ]);
    };

    return { rect, circle, rounded, triangle, line, text, png };
}

const toSeconds = (ts: string): number => {
    const parts = String(ts || '').split(':').map(Number);
    if (!parts.length || parts.some(isNaN)) return 0;
    return parts.reduce((acc, n) => acc * 60 + n, 0);
};

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

async function buildPlayerImage(opts: {
    title: string; author: string; durationText: string; thumb: Buffer | null;
}): Promise<Buffer> {
    const W = 720, H = 960;
    const g = createCanvas(W, H);

    const bg: RGBA = { r: 18, g: 18, b: 18 };
    const card: RGBA = { r: 36, g: 34, b: 34 };
    const white: RGBA = { r: 255, g: 255, b: 255 };
    const muted: RGBA = { r: 170, g: 170, b: 170 };
    const green: RGBA = { r: 30, g: 215, b: 96 };
    const dark: RGBA = { r: 15, g: 15, b: 15 };

    g.rect(0, 0, W, H, bg);
    g.rounded(20, 20, W - 40, H - 40, 40, card);
    g.text(190, 55, 'PLAYING WITH MUSIC', muted, 3);

    // Portada (placeholder; si hay thumbnail se intenta reemplazar abajo)
    g.rect(60, 110, 600, 420, { r: 150, g: 150, b: 150 });

    const total = toSeconds(opts.durationText) || 180;
    const current = Math.floor(total * 0.35);

    const title = opts.title.length > 22 ? opts.title.slice(0, 21) + '.' : opts.title;
    const author = opts.author.length > 30 ? opts.author.slice(0, 29) + '.' : opts.author;
    g.text(60, 570, title, white, 5);
    g.text(60, 625, author, muted, 3);

    // Corazon verde (circulo + triangulo simple)
    g.circle(590, 585, 14, green);
    g.circle(618, 585, 14, green);
    g.triangle(573, 592, 635, 592, 604, 625, green);

    // Barra de progreso
    const barX = 60, barW = 600, barY = 690;
    g.rounded(barX, barY, barW, 8, 4, { r: 90, g: 90, b: 90 });
    const filled = Math.max(8, Math.floor(barW * (current / total)));
    g.rounded(barX, barY, filled, 8, 4, white);
    g.text(60, 715, fmt(current), muted, 3);
    g.text(660 - fmt(total).length * 18, 715, fmt(total), muted, 3);

    // Controles
    const cy = 840;
    // shuffle (dos lineas cruzadas)
    g.line(75, cy - 14, 125, cy + 14, green, 3);
    g.line(75, cy + 14, 125, cy - 14, green, 3);
    // anterior
    g.rect(190, cy - 20, 6, 40, white);
    g.triangle(228, cy - 20, 228, cy + 20, 198, cy, white);
    // play/pause grande
    g.circle(360, cy, 55, white);
    g.rect(340, cy - 24, 12, 48, dark);
    g.rect(368, cy - 24, 12, 48, dark);
    // siguiente
    g.triangle(492, cy - 20, 492, cy + 20, 522, cy, white);
    g.rect(524, cy - 20, 6, 40, white);
    // repetir (cuadro verde)
    g.rect(600, cy - 16, 44, 6, green);
    g.rect(600, cy + 10, 44, 6, green);
    g.rect(600, cy - 16, 6, 32, green);
    g.rect(638, cy - 16, 6, 32, green);

    return g.png();
}

export default async function (sock: any, msg: any, extra: any, db: any) {
    const text = extra.args.join(' ').trim();

    if (!text) {
        return msg.reply(
            `🍓 𝙴𝚂𝙲𝚁𝙸𝙱𝙴 𝙴𝙻 𝙽𝙾𝙼𝙱𝚁𝙴 𝙾 𝚄𝚁𝙻 𝙳𝙴 𝙻𝙰 𝙲𝙰𝙽𝙲𝙸Ó𝙽\n\n` +
            `𝙴𝙹𝙴𝙼𝙿𝙻𝙾\n` +
            `> ${(global as any).prefix?.[0] || '.'}play Oh Klahoma`
        );
    }

    const requestKey = text.toLowerCase();
    if (processing.has(requestKey)) {
        return msg.reply(`𝙴𝚂𝚃𝙰 𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰 𝚈𝙰 𝙴𝚂𝚃Á 𝙴𝙽 𝙿𝚁𝙾𝙲𝙴𝚂𝙾 ❀`);
    }
    processing.add(requestKey);

    try {
        let videoUrl = text;
        let searchData: any = null;
        const isYoutubeUrl = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(text);

        if (isYoutubeUrl) {
            const result = await ytsearch({ videoId: text });
            if (result) searchData = result;
        } else {
            const result = await ytsearch(text);
            if (!result.videos?.length) {
                return msg.reply(`🍥 𝙽𝙾 𝙴𝙽𝙲𝙾𝙽𝚃𝚁É 𝚅Í𝙳𝙴𝙾𝚂 𝙿𝙰𝚁𝙰 𝙴𝚂𝙰 𝙱Ú𝚂𝚀𝚄𝙴𝙳𝙰 ❀`);
            }
            searchData = result.videos[0];
            videoUrl = searchData.url;
        }

        const apiUrl = `https://api.delirius.online/download/ytmp3?url=${encodeURIComponent(videoUrl)}`;
        const response = await axios.get(apiUrl, { timeout: 60000 });
        const data = response.data;

        if (!data?.status || !data?.data?.download) {
            return msg.reply(`⚠︎ 𝙽𝙾 𝙿𝚄𝙳𝙴 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝙰𝚄𝙳𝙸𝙾`);
        }

        const info = data.data;
        const title = searchData?.title || (info.title && info.title !== '-' ? info.title : null) || 'YouTube Audio';
        const author = searchData?.author?.name || (info.author && info.author !== '-' ? info.author : null) || 'Desconocido';
        const duration = searchData?.timestamp || searchData?.duration || '3:00';
        const imageUrl = searchData?.thumbnail || searchData?.image || null;

        // Si falla la imagen, igual se envia el audio
        try {
            const image = await buildPlayerImage({ title, author, durationText: String(duration), thumb: null });
            await sock.sendMessage(msg.from, { image, caption: `${title}\n${author}` }, { quoted: msg });
        } catch (e) {
            console.error('[PLAY IMG]', e);
            if (imageUrl) {
                try {
                    const img = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
                    await sock.sendMessage(msg.from, { image: Buffer.from(img.data), caption: `${title}\n${author}` }, { quoted: msg });
                } catch {}
            }
        }

        const audio = await axios.get(info.download, { responseType: 'arraybuffer', timeout: 120000 });

        await sock.sendMessage(
            msg.from,
            {
                audio: Buffer.from(audio.data),
                mimetype: 'audio/mpeg',
                fileName: `${cleanTitle(title)}.mp3`,
                ptt: false
            },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error('[PLAY]', error?.response?.data || error?.response?.status || error?.message || error);
        await msg.reply(`⚠︎ 𝙾𝙲𝚄𝚁𝚁𝙸Ó 𝚄𝙽 𝙴𝚁𝚁𝙾𝚁 𝙰𝙻 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝙰𝚄𝙳𝙸𝙾`);
    } finally {
        processing.delete(requestKey);
    }
}
