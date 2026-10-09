import axios from 'axios';
import ytsearch from 'yt-search';
import { deflateSync } from 'node:zlib';

export const command = ['play', 'mp3', 'ytmp3', 'ytaudio', 'playaudio'];
export const category = 'descargas';
export const description = 'Busca y descarga canciones de YouTube en formato MP3 con reproductor visual realista.';

const processing = new Set<string>();
const playerCache = new Map<string, any>();

const cleanTitle = (title: string) => {
    return title
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 100);
};

const formatNumber = (value: any) => {
    if (typeof value !== 'number') return 'N/A';
    return value.toLocaleString('es-CO');
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const color = (r: number, g: number, b: number, a = 255) => ({ r, g, b, a });

const rgbaToInt = (c: { r: number; g: number; b: number; a: number }) =>
    (c.a << 24) | (c.b << 16) | (c.g << 8) | c.r;

function createBuffer(width: number, height: number) {
    const pixels = new Uint8ClampedArray(width * height * 4);
    const setPixel = (x: number, y: number, c: { r: number; g: number; b: number; a?: number }) => {
        if (x < 0 || x >= width || y < 0 || y >= height) return;
        const idx = (y * width + x) * 4;
        pixels[idx] = c.r;
        pixels[idx + 1] = c.g;
        pixels[idx + 2] = c.b;
        pixels[idx + 3] = c.a ?? 255;
    };

    const fillRect = (x: number, y: number, w: number, h: number, c: { r: number; g: number; b: number; a?: number }) => {
        for (let yy = y; yy < y + h; yy++) {
            for (let xx = x; xx < x + w; xx++) setPixel(xx, yy, c);
        }
    };

    const drawHLine = (x1: number, x2: number, y: number, c: { r: number; g: number; b: number; a?: number }) => {
        const start = Math.min(x1, x2);
        const end = Math.max(x1, x2);
        for (let x = start; x <= end; x++) setPixel(x, y, c);
    };

    const drawVLine = (y1: number, y2: number, x: number, c: { r: number; g: number; b: number; a?: number }) => {
        const start = Math.min(y1, y2);
        const end = Math.max(y1, y2);
        for (let y = start; y <= end; y++) setPixel(x, y, c);
    };

    const drawLine = (x1: number, y1: number, x2: number, y2: number, c: { r: number; g: number; b: number; a?: number }, thickness = 1) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const steps = Math.max(Math.abs(dx), Math.abs(dy));
        for (let i = 0; i <= steps; i++) {
            const x = Math.round(x1 + (dx * i) / steps);
            const y = Math.round(y1 + (dy * i) / steps);
            for (let yy = -thickness; yy <= thickness; yy++) {
                for (let xx = -thickness; xx <= thickness; xx++) setPixel(x + xx, y + yy, c);
            }
        }
    };

    const drawCircle = (cx: number, cy: number, radius: number, fill: boolean, c: { r: number; g: number; b: number; a?: number }) => {
        for (let y = -radius; y <= radius; y++) {
            for (let x = -radius; x <= radius; x++) {
                if (x * x + y * y <= radius * radius) {
                    if (fill) setPixel(cx + x, cy + y, c);
                    else {
                        const d = Math.sqrt(x * x + y * y);
                        if (Math.abs(d - radius) < 1.5) setPixel(cx + x, cy + y, c);
                    }
                }
            }
        }
    };

    const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number, c: { r: number; g: number; b: number; a?: number }) => {
        fillRect(x + r, y, w - r * 2, h, c);
        fillRect(x, y + r, w, h - r * 2, c);
        drawCircle(x + r, y + r, r, true, c);
        drawCircle(x + w - r, y + r, r, true, c);
        drawCircle(x + r, y + h - r, r, true, c);
        drawCircle(x + w - r, y + h - r, r, true, c);
    };

    const fontMap: Record<string, number[]> = {
        ' ': [0,0,0,0,0],
        '0': [0b01110,0b10001,0b10011,0b10101,0b10001,0b10001,0b01110],
        '1': [0b00100,0b01100,0b00100,0b00100,0b00100,0b00100,0b01110],
        '2': [0b01110,0b10001,0b00001,0b00010,0b00100,0b01000,0b11111],
        '3': [0b11110,0b00001,0b00001,0b01110,0b00001,0b00001,0b11110],
        '4': [0b00010,0b00110,0b01010,0b10010,0b11111,0b00010,0b00010],
        '5': [0b11111,0b10000,0b10000,0b11110,0b00001,0b00001,0b11110],
        '6': [0b01110,0b10000,0b10000,0b11110,0b10001,0b10001,0b01110],
        '7': [0b11111,0b00001,0b00010,0b00100,0b01000,0b01000,0b01000],
        '8': [0b01110,0b10001,0b10001,0b01110,0b10001,0b10001,0b01110],
        '9': [0b01110,0b10001,0b10001,0b01111,0b00001,0b00001,0b01110],
        'A': [0b01110,0b10001,0b10001,0b11111,0b10001,0b10001,0b10001],
        'B': [0b11110,0b10001,0b10001,0b11110,0b10001,0b10001,0b11110],
        'C': [0b01110,0b10001,0b10000,0b10000,0b10000,0b10001,0b01110],
        'D': [0b11110,0b10001,0b10001,0b10001,0b10001,0b10001,0b11110],
        'E': [0b11111,0b10000,0b10000,0b11110,0b10000,0b10000,0b11111],
        'F': [0b11111,0b10000,0b10000,0b11110,0b10000,0b10000,0b10000],
        'G': [0b01110,0b10001,0b10000,0b10111,0b10001,0b10001,0b01110],
        'H': [0b10001,0b10001,0b10001,0b11111,0b10001,0b10001,0b10001],
        'I': [0b11111,0b00100,0b00100,0b00100,0b00100,0b00100,0b11111],
        'J': [0b00111,0b00010,0b00010,0b00010,0b10010,0b10010,0b01100],
        'K': [0b10001,0b10010,0b10100,0b11000,0b10100,0b10010,0b10001],
        'L': [0b10000,0b10000,0b10000,0b10000,0b10000,0b10000,0b11111],
        'M': [0b1000001,0b1100011,0b1010101,0b1001001,0b1000001,0b1000001,0b1000001],
        'N': [0b10001,0b11001,0b10101,0b10011,0b10001,0b10001,0b10001],
        'O': [0b01110,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110],
        'P': [0b11110,0b10001,0b10001,0b11110,0b10000,0b10000,0b10000],
        'Q': [0b01110,0b10001,0b10001,0b10001,0b10101,0b10010,0b01101],
        'R': [0b11110,0b10001,0b10001,0b11110,0b10100,0b10010,0b10001],
        'S': [0b01111,0b10000,0b10000,0b01110,0b00001,0b00001,0b11110],
        'T': [0b11111,0b00100,0b00100,0b00100,0b00100,0b00100,0b00100],
        'U': [0b10001,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110],
        'V': [0b10001,0b10001,0b10001,0b01010,0b01010,0b00100,0b00100],
        'W': [0b10001,0b10001,0b10001,0b10001,0b10101,0b10101,0b01010],
        'X': [0b10001,0b10001,0b01010,0b00100,0b01010,0b10001,0b10001],
        'Y': [0b10001,0b01010,0b00100,0b00100,0b00100,0b00100,0b00100],
        'Z': [0b11111,0b00001,0b00010,0b00100,0b01000,0b10000,0b11111],
        '-': [0,0,0,0b11111,0,0,0],
        '_': [0,0,0,0,0,0,0b11111],
        '.': [0,0,0,0,0,0b01000,0b01000],
        ':': [0,0,0b01000,0,0b01000,0,0],
        '/': [0b00001,0b00010,0b00100,0b01000,0b10000,0,0],
        '#': [0b01010,0b11111,0b01010,0b01010,0b11111,0b01010,0b01010],
        '?': [0b01110,0b10001,0b00001,0b00010,0b00100,0b00000,0b00100],
        '!': [0b00100,0b00100,0b00100,0b00100,0b00100,0b00000,0b00100],
        '(': [0b00010,0b00100,0b01000,0b01000,0b01000,0b00100,0b00010],
        ')': [0b01000,0b00100,0b00010,0b00010,0b00010,0b00100,0b01000],
        '&': [0b01110,0b10001,0b01010,0b00100,0b01010,0b10001,0b01110],
        '+': [0,0,0b00100,0b00100,0b11111,0b00100,0b00100],
        '=': [0,0,0b11111,0,0b11111,0,0],
        '[': [0b01110,0b01000,0b01000,0b01000,0b01000,0b01000,0b01110],
        ']': [0b01110,0b00010,0b00010,0b00010,0b00010,0b00010,0b01110],
        '*': [0,0,0,0b01010,0b00100,0,0],
        'a': [0,0,0b01110,0b00001,0b01111,0b10001,0b01111],
        'b': [0b10000,0b10000,0b10110,0b11001,0b10001,0b10001,0b01110],
        'c': [0,0,0b01110,0b10001,0b10000,0b10001,0b01110],
        'd': [0b00001,0b00001,0b01111,0b10001,0b10001,0b10001,0b01110],
        'e': [0,0,0b01110,0b10001,0b11111,0b10000,0b01110],
        'g': [0,0,0b01111,0b10001,0b10001,0b01111,0b00001,0b01110],
        'h': [0b10000,0b10000,0b10110,0b11001,0b10001,0b10001,0b10001],
        'i': [0,0,0b00100,0,0b00100,0b00100,0b00100],
        'j': [0,0,0b00010,0,0b00010,0b10010,0b01100],
        'k': [0b10000,0b10000,0b10010,0b10100,0b11000,0b10100,0b10010],
        'l': [0b00100,0b00100,0b00100,0b00100,0b00100,0b00100,0b00110],
        'm': [0,0,0b11011,0b10101,0b10101,0b10101,0b10001],
        'n': [0,0,0b10110,0b11001,0b10001,0b10001,0b10001],
        'o': [0,0,0b01110,0b10001,0b10001,0b10001,0b01110],
        'p': [0,0,0b11110,0b10001,0b10001,0b11110,0b10000,0b10000],
        'q': [0,0,0b01111,0b10001,0b10001,0b01111,0b00001,0b00001],
        'r': [0,0,0b10110,0b11001,0b10000,0b10000,0b10000],
        's': [0,0,0b01110,0b10000,0b01110,0b00001,0b11110],
        't': [0b00100,0b01110,0b00100,0b00100,0b00100,0b00100,0b00011],
        'u': [0,0,0b10001,0b10001,0b10001,0b10001,0b01111],
        'v': [0,0,0b10001,0b10001,0b10001,0b01010,0b00100],
        'w': [0,0,0b10001,0b10101,0b10101,0b10101,0b01010],
        'x': [0,0,0b10001,0b01010,0b00100,0b01010,0b10001],
        'y': [0,0,0b10001,0b10001,0b01111,0b00001,0b01110],
        'z': [0,0,0b11111,0b00010,0b00100,0b01000,0b11111],
        ',': [0,0,0,0,0,0b01000,0b10000],
        ';': [0,0,0b01000,0,0b01000,0b10000,0],
        '"': [0b01100,0b01100,0,0,0,0,0],
        "'": [0b00100,0b00100,0,0,0,0,0]
    };

    const drawText = (x: number, y: number, text: string, colorValue: { r: number; g: number; b: number; a?: number }, scale = 2) => {
        const target = text.toUpperCase();
        let cursor = x;
        for (const ch of target) {
            const map = fontMap[ch] || fontMap[' '];
            for (let row = 0; row < 7; row++) {
                for (let col = 0; col < 5; col++) {
                    if ((map[row] >> (4 - col)) & 1) {
                        fillRect(cursor + col * scale, y + row * scale, scale, scale, colorValue);
                    }
                }
            }
            cursor += 6 * scale;
        }
    };

    const createPng = () => {
        const stride = width * 4;
        const raw = new Uint8Array(stride * height);
        let offset = 0;
        for (let y = 0; y < height; y++) {
            raw[offset++] = 0;
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                raw[offset++] = pixels[i];
                raw[offset++] = pixels[i + 1];
                raw[offset++] = pixels[i + 2];
                raw[offset++] = pixels[i + 3];
            }
        }

        const header = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        const ihdr = Buffer.alloc(13);
        ihdr.writeUInt32BE(width, 0);
        ihdr.writeUInt32BE(height, 4);
        ihdr[8] = 8;
        ihdr[9] = 6;
        ihdr[10] = 0;
        ihdr[11] = 0;
        ihdr[12] = 0;

        const chunks: Buffer[] = [];
        const addChunk = (type: string, data: Buffer) => {
            const chunk = Buffer.alloc(12 + data.length);
            chunk.writeUInt32BE(data.length, 0);
            chunk.write(type, 4);
            data.copy(chunk, 8);
            const crc = Buffer.alloc(4);
            crc.writeUInt32BE(0, 0);
            const crcValue = require('node:zlib').crc32(data); 
            chunk.writeUInt32BE(crcValue, 8 + data.length);
            chunks.push(chunk);
        };

        const bytes = Buffer.concat([
            header,
            Buffer.concat([
                Buffer.from([0x00, 0x00, 0x00, 0x0D]),
                Buffer.from('IHDR'),
                ihdr,
                Buffer.alloc(4)
            ])
        ]);
        // rebuild with proper CRC handling
        const chunksOut: Buffer[] = [];
        chunksOut.push(Buffer.from([0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52]));
        chunksOut.push(ihdr);
        chunksOut.push(Buffer.alloc(0));

        const final = Buffer.alloc(8 + 4 + 4 + 13 + 4);
        final.writeUInt32BE(13, 0);
        final.write('IHDR', 4);
        ihdr.copy(final, 8);
        const crcIhdr = require('node:zlib').crc32(ihdr);
        final.writeUInt32BE(crcIhdr >>> 0, 8 + 13);

        const idatData = Buffer.from(deflateSync(raw));
        const idat = Buffer.alloc(12 + idatData.length);
        idat.writeUInt32BE(idatData.length, 0);
        idat.write('IDAT', 4);
        idatData.copy(idat, 8);
        const crcI = require('node:zlib').crc32(idatData);
        idat.writeUInt32BE(crcI >>> 0, 8 + idatData.length);

        const iend = Buffer.alloc(12);
        iend.writeUInt32BE(0, 0);
        iend.write('IEND', 4);
        const crcEnd = require('node:zlib').crc32(Buffer.alloc(0));
        iend.writeUInt32BE(crcEnd >>> 0, 8);

        return Buffer.concat([header, final, idat, iend]);
    };

    return { pixels, setPixel, fillRect, drawLine, drawCircle, drawRoundedRect, drawText, createPng };
}

function generatePlayerArt({ title, author, duration, current = 0 }: { title: string; author: string; duration: string; current?: number }) {
    const width = 900;
    const height = 980;
    const gfx = createBuffer(width, height);
    const bg = color(14, 18, 21, 255);
    const panel = color(26, 29, 33, 255);
    const panel2 = color(38, 41, 45, 255);
    const text = color(244, 246, 249, 255);
    const muted = color(154, 158, 167, 255);
    const green = color(30, 215, 96, 255);
    const dark = color(15, 15, 15, 255);

    gfx.fillRect(0, 0, width, height, bg);
    gfx.drawRoundedRect(72, 40, width - 144, height - 120, 34, panel2);
    gfx.drawRoundedRect(95, 68, width - 190, 560, 22, color(18, 18, 18, 255));

    // album thumbnail area
    gfx.fillRect(120, 100, width - 240, 480, color(88, 88, 88, 255));
    gfx.fillRect(120, 100, width - 240, 480, color(70, 70, 70, 180));

    // stylized art in center
    for (let i = 0; i < 10; i++) {
        const y = 120 + i * 40;
        gfx.drawLine(180 + i * 20, y, 260 + i * 20, y + 80, color(0, 0, 0, 120), 2);
    }
    gfx.drawLine(260, 170, 420, 80, color(0, 0, 0, 120), 10);
    gfx.drawLine(420, 80, 580, 170, color(0, 0, 0, 120), 10);
    gfx.drawLine(580, 170, 720, 80, color(0, 0, 0, 120), 10);
    gfx.drawLine(720, 80, 790, 170, color(0, 0, 0, 120), 10);
    gfx.drawLine(260, 270, 550, 520, color(0, 0, 0, 120), 11);
    gfx.drawLine(550, 520, 760, 260, color(0, 0, 0, 120), 11);

    // song metadata
    const shortTitle = title.length > 28 ? `${title.slice(0, 25)}...` : title;
    const shortAuthor = author.length > 24 ? `${author.slice(0, 21)}...` : author;

    gfx.drawText(108, 660, shortAuthor || 'unknown', muted, 3);
    gfx.drawText(108, 730, shortTitle || 'youtube audio', text, 4);

    // progress bar
    gfx.drawRoundedRect(110, 815, 660, 10, 5, color(75, 75, 75, 255));
    const total = Math.max(60, parseFloat(String(duration).replace(/[^0-9]/g, '')) || 120);
    const currentSeconds = Math.min(current || 35, total);
    const progressRatio = clamp(currentSeconds / total, 0, 1);
    const progressWidth = 660 * progressRatio;
    gfx.drawRoundedRect(110, 815, progressWidth, 10, 5, green);
    gfx.drawCircle(110 + progressWidth, 820, 8, true, green);

    const elapsed = `${Math.floor(currentSeconds / 60)}:${String(Math.floor(currentSeconds % 60)).padStart(2, '0')}`;
    const totalLabel = `${Math.floor(total / 60)}:${String(Math.floor(total % 60)).padStart(2, '0')}`;
    gfx.drawText(108, 840, elapsed, muted, 2);
    gfx.drawText(650, 840, totalLabel, muted, 2);

    // controls
    const btnY = 900;
    gfx.drawText(155, btnY, '⏮', green, 4);
    gfx.drawText(285, btnY, '⏪', green, 4);
    gfx.drawRoundedRect(395, 888, 110, 110, 55, color(255, 255, 255, 255));
    gfx.drawRoundedRect(413, 908, 74, 70, 25, color(20, 20, 20, 255));
    gfx.drawText(426, 908, 'II', color(0,0,0,255), 4);
    gfx.drawText(585, btnY, '⏩', green, 4);
    gfx.drawText(700, btnY, '↻', green, 4);

    // small green play button on right, similar to reference
    gfx.drawCircle(770, 702, 36, true, green);
    gfx.drawLine(760, 688, 760, 720, color(255,255,255,255), 5);
    gfx.drawLine(760, 688, 785, 704, color(255,255,255,255), 5);
    gfx.drawLine(785, 704, 760, 720, color(255,255,255,255), 5);

    return gfx.createPng();
}

const useRealPlayerImage = async (sock: any, msg: any, title: string, author: string, duration: string, currentTime: number = 0) => {
    const img = generatePlayerArt({ title, author, duration, current: currentTime });
    const chatId = msg.from || msg.chat;
    return sock.sendMessage(chatId, { image: img, caption: `${title} • ${author}` }, { quoted: msg });
};

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
        const duration = searchData?.timestamp || searchData?.duration || 'N/A';
        const imageUrl = searchData?.thumbnail || searchData?.image || null;

        // Real visual player image
        await useRealPlayerImage(sock, msg, title, author, duration, 35);

        const audio = await axios.get(info.download, {
            responseType: 'arraybuffer',
            timeout: 120000
        });

        const fileName = `${cleanTitle(title)}.mp3`;

        await sock.sendMessage(
            msg.from || msg.chat,
            {
                audio: Buffer.from(audio.data),
                mimetype: 'audio/mpeg',
                fileName,
                ptt: false
            },
            { quoted: msg }
        );

        playerCache.set(msg.from || msg.chat, { title, author, duration, imageUrl });
    } catch (error: any) {
        console.error('[PLAY]', error?.response?.data || error?.response?.status || error?.message || error);
        await msg.reply(`⚠︎ 𝙾𝙲𝚄𝚁𝚁𝙸Ó 𝚄𝙽 𝙴𝚁𝚁𝙾𝚁 𝙰𝙻 𝙾𝙱𝚃𝙴𝙽𝙴𝚁 𝙴𝙻 𝙰𝚄𝙳𝙸𝙾`);
    } finally {
        processing.delete(requestKey);
    }
}
