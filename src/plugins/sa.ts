
import {
    proto,
    generateWAMessageContent,
    prepareWAMessageMedia
} from '@whiskeysockets/baileys';

import {
    mkdtemp,
    readFile,
    writeFile,
    rm
} from 'node:fs/promises';

import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

export const command = ['stickeraudio', 'sa', 'audiosticker'];
export const category = 'stickers';
export const description = 'Convierte un video con sonido en sticker con audio integrado.';
export const admin = false;
export const botAdmin = false;

function installAudioStickerSupport() {
    const Message = proto.Message;
    if (Message.__yaeAudioStickerInstalled) return;

    const StickerMessage = Message.StickerMessage;
    const AudioMessage = Message.AudioMessage;
    const originalStickerEncode = StickerMessage.encode;
    const originalMessageEncode = Message.encode;

    StickerMessage.encode = function (m, writer) {
        writer = originalStickerEncode(m, writer);

        if (m.premium != null) {
            writer.uint32(192).int32(m.premium);
        }

        if (m.emojis != null) {
            writer.uint32(202).string(m.emojis);
        }

        if (m.audioMessage) {
            AudioMessage.encode(
                m.audioMessage,
                writer.uint32(210).fork()
            ).ldelim();
        }

        return writer;
    };

    Message.encode = function (m, writer) {
        if (!m?.stickerMessage?.audioMessage) {
            return originalMessageEncode(m, writer);
        }

        const { stickerMessage, ...outer } = m;
        writer = originalMessageEncode(outer, writer);

        const container = writer.uint32(1074).fork();
        const futureProof = container.uint32(10).fork();

        originalMessageEncode(
            { stickerMessage },
            futureProof
        ).ldelim();

        return container.ldelim();
    };

    Message.__yaeAudioStickerInstalled = true;
}

installAudioStickerSupport();

function ffmpeg(args) {
    return new Promise((resolve, reject) => {
        const process = spawn(
            'ffmpeg',
            ['-hide_banner', '-loglevel', 'error', '-y', ...args],
            {
                stdio: ['ignore', 'ignore', 'pipe']
            }
        );

        let errorOutput = '';

        process.stderr.on('data', chunk => {
            errorOutput = (
                errorOutput + chunk.toString()
            ).slice(-1500);
        });

        process.on('error', reject);

        process.on('close', code => {
            if (code === 0) {
                resolve();
            } else {
                reject(
                    new Error(
                        errorOutput ||
                        `FFmpeg terminó con código ${code}`
                    )
                );
            }
        });
    });
}

export default async function (sock, msg) {
    const quoted = msg.quoted;

    if (quoted?.type !== 'videoMessage') {
        return msg.reply(
            '🍓 Responde a un video que tenga sonido y escribe .stickeraudio'
        );
    }

    if (Number(quoted.msg?.seconds || 0) > 60) {
        return msg.reply(
            '⚠️ El video debe durar 60 segundos o menos. Se usarán los primeros 10.'
        );
    }

    let directory;

    try {
        const source = await quoted.download();

        if (!source) {
            throw new Error(
                'No pude descargar el video citado.'
            );
        }

        const video = Buffer.from(source);

        if (video.length > 20 * 1024 * 1024) {
            throw new Error(
                'El video supera el límite de 20 MB.'
            );
        }

        directory = await mkdtemp(
            join(tmpdir(), 'yae-sticker-audio-')
        );

        const input = join(directory, 'input.mp4');
        const stickerPath = join(directory, 'sticker.webp');
        const audioPath = join(directory, 'audio.ogg');

        await writeFile(input, video);

        await Promise.all([
            ffmpeg([
                '-i', input,
                '-t', '10',
                '-vf',
                'fps=12,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=yuva420p',
                '-an',
                '-c:v', 'libwebp',
                '-loop', '0',
                '-preset', 'default',
                '-q:v', '55',
                stickerPath
            ]),

            ffmpeg([
                '-i', input,
                '-t', '10',
                '-vn',
                '-ac', '1',
                '-ar', '48000',
                '-c:a', 'libopus',
                '-b:a', '48k',
                '-f', 'ogg',
                audioPath
            ])
        ]);

        const [webp, ogg] = await Promise.all([
            readFile(stickerPath),
            readFile(audioPath)
        ]);

        const upload = {
            upload: sock.waUploadToServer
        };

        const generated = await generateWAMessageContent(
            { sticker: webp },
            upload
        );

        const audioMedia = await prepareWAMessageMedia(
            {
                audio: ogg,
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true
            },
            upload
        );

        const stickerMessage = generated.stickerMessage;
        const audioMessage = audioMedia.audioMessage;

        if (!stickerMessage || !audioMessage) {
            throw new Error(
                'Baileys no preparó correctamente los archivos.'
            );
        }

        delete audioMessage.ptt;

        stickerMessage.isAnimated = true;
        stickerMessage.premium = 0;
        stickerMessage.emojis = '🔊';
        stickerMessage.audioMessage = audioMessage;

        await sock.relayMessage(
            msg.chat || msg.from,
            { stickerMessage },
            {}
        );

    } catch (error) {
        console.error('[STICKERAUDIO]', error);

        await msg.reply(
            `⚠️ No pude crear el sticker con audio: ${error.message || error}`
        );

    } finally {
        if (directory) {
            await rm(
                directory,
                {
                    recursive: true,
                    force: true
                }
            ).catch(() => {});
        }
    }
}
