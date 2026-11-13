import { test, mock, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const originalDirectory = process.cwd();
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'yae-owner-lid-'));
process.chdir(temporaryDirectory);
after(() => {
    process.chdir(originalDirectory);
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

mock.module('@whiskeysockets/baileys', { namedExports: {
    proto: {},
    getContentType: message => Object.keys(message)[0],
    jidDecode: jid => {
        const [user, server] = jid.split('@');
        return { user: user.split(':')[0], server };
    },
    downloadContentFromMessage: async () => {}
} });
mock.module('../config.ts', { namedExports: {} });
const commands = new Map();
mock.module('../src/lib/loader.ts', { namedExports: {
    commandMap: commands, pluginData: new Map(),
    loadPlugins: async () => {}, watchPlugins: () => {}
} });
mock.module('../src/lib/gacha.ts', { namedExports: {
    handleGachaAccept: async () => false,
    touchUser: () => {}
} });

globalThis.owner = '573001';
globalThis.prefix = ['.'];
globalThis.namebot = 'Yae';
globalThis.nmcreador = 'Creator';
const db = await import('../src/lib/database.ts');
await db.loadDB();
const { handler } = await import('../handler.ts');
const { UserJid } = await import('../src/lib/simple.ts');
const { default: setprefix } = await import('../src/plugins/setprefix.ts');
const promote = await import('../src/plugins/promote.ts');
commands.set('setprefix', setprefix);
promote.default.plugin = { admin: promote.admin, botAdmin: promote.botAdmin };
for (const command of promote.command) commands.set(command, promote.default);

if (process.env.YAE_BENCHMARK === '1') {
    test('benchmark group command dispatch', async () => {
        const listeners = new Map();
        let completed = 0;
        commands.set('bench', async () => { completed++; });
        const sock = {
            subbotPhone: '573002',
            user: { id: '573002@s.whatsapp.net' },
            ev: { on: (event, fn) => listeners.set(event, fn) },
            groupMetadata: async () => ({ participants: [] }),
            sendMessage: async () => {}
        };
        handler(sock);
        let id = 0;
        const send = () => listeners.get('messages.upsert')({
            type: 'notify', messages: [{
                key: { id: String(++id), remoteJid: '789@g.us', participant: '573001@s.whatsapp.net' },
                message: { conversation: '.bench' }
            }]
        });
        for (let i = 0; i < 500; i++) await send();
        const times = [];
        for (let r = 0; r < 5; r++) {
            const start = performance.now();
            for (let i = 0; i < 1500; i++) await send();
            times.push(performance.now() - start);
        }
        assert.equal(completed, 8000);
        times.sort((a, b) => a - b);
        console.log('BENCH_GROUP_MEDIAN_MS', times[2].toFixed(2));
    });

    test('benchmark cold group ping dispatch', async () => {
        const listeners = new Map();
        const { default: ping } = await import('../src/plugins/ping.ts');
        commands.set('ping', ping);
        let replies = 0;
        const sock = {
            subbotPhone: '573004',
            user: { id: '573004@s.whatsapp.net' },
            ev: { on: (event, fn) => listeners.set(event, fn) },
            groupMetadata: async () => {
                await new Promise(resolve => setTimeout(resolve, 20));
                return { participants: [] };
            },
            sendMessage: async (_chat, content) => {
                assert.match(content.text, /PONG/);
                replies++;
            }
        };
        handler(sock);
        let id = 0;
        const results = [];
        for (const needsGroupMetadata of [true, false]) {
            ping.plugin = { needsGroupMetadata };
            const times = [];
            for (let r = 0; r < 3; r++) {
                const start = performance.now();
                for (let i = 0; i < 10; i++) {
                    await listeners.get('messages.upsert')({ type: 'notify', messages: [{
                        key: { id: String(++id), remoteJid: `${10000 + id}@g.us`, participant: '573001@s.whatsapp.net' },
                        message: { conversation: '.ping' }
                    }] });
                }
                times.push(performance.now() - start);
            }
            times.sort((a, b) => a - b);
            results.push(times[1]);
        }
        assert.equal(replies, 60);
        console.log('BENCH_COLD_PING_MS', results.map(time => time.toFixed(2)).join(' '));
    });
}

test('real serializer and LID cache authorize the owner, not another user', async () => {
    const listeners = new Map();
    const replies = [];
    const sock = {
        subbotPhone: '573002',
        user: { id: '573002:1@s.whatsapp.net', lid: '444444:1@lid' },
        ev: { on: (event, fn) => listeners.set(event, fn) },
        signalRepository: { lidMapping: {
            getPNForLID: async () => null,
            getLIDForPN: async phone => {
                assert.equal(phone, '573001@s.whatsapp.net');
                return '901234@lid';
            }
        } },
        groupMetadata: async () => ({ participants: [] }),
        sendMessage: async (_chat, content) => { replies.push(content.text); }
    };
    handler(sock);
    const send = async (id, lid, prefix) => listeners.get('messages.upsert')({
        type: 'notify',
        messages: [{
            key: { id, remoteJid: '123@g.us', participant: lid, fromMe: false },
            message: { conversation: `.setprefix ${prefix}` }
        }]
    });

    await send('owner-lid', '901234:5@lid', '!');
    assert.equal(UserJid(sock, '', '901234@lid'), '573001@s.whatsapp.net');
    assert.deepEqual(globalThis.prefix, ['!']);
    globalThis.prefix = ['.'];
    await send('other-lid', '573001@lid', '?');
    assert.deepEqual(globalThis.prefix, ['.']);
    assert.match(replies.at(-1), /solo puede ser usado/);
});

test('autoadmin promotes only the verified owner using the group participant LID', async () => {
        const listeners = new Map();
        const replies = [];
        const updates = [];
        let status = '200';
        const sock = {
            subbotPhone: '573002',
            user: { id: '573002:1@s.whatsapp.net', lid: '444444@lid' },
            ev: { on: (event, fn) => listeners.set(event, fn) },
            signalRepository: { lidMapping: { getPNForLID: async () => null, getLIDForPN: async () => '901234@lid' } },
            groupMetadata: async () => ({ participants: [
                { id: '444444@lid', phoneNumber: '573002@s.whatsapp.net', admin: 'admin' },
                { id: '901234@lid', phoneNumber: '573001@s.whatsapp.net', admin: null },
                { id: '555555@lid', phoneNumber: '573003@s.whatsapp.net', admin: null }
            ] }),
            groupParticipantsUpdate: async (...args) => { updates.push(args); return [{ status }]; },
            sendMessage: async (_chat, content) => { replies.push(content.text); }
        };
        handler(sock);
        const send = async (id, participant, command = '.autoadmin') => listeners.get('messages.upsert')({
            type: 'notify', messages: [{
                key: { id, remoteJid: '456@g.us', participant, fromMe: false },
                message: { conversation: command }
            }]
        });

        await send('autoadmin-owner', '901234@lid');
        assert.deepEqual(updates, [['456@g.us', ['901234@lid'], 'promote']]);
        assert.match(replies.at(-1), /administrador/);
        await send('autoadmin-other', '555555@lid');
        assert.equal(updates.length, 1);
        assert.match(replies.at(-1), /solo puede ser usado/);
        await send('promote-other', '555555@lid', '.promote @usuario');
        assert.equal(updates.length, 1);
        status = '403';
        await send('autoadmin-failure', '901234@lid');
        assert.equal(updates.length, 2);
        assert.match(replies.at(-1), /no confirmó/);
});

test('fast group commands skip metadata only when admin-only mode is disabled', async () => {
            const listeners = new Map();
            let lookups = 0;
            let runs = 0;
            const fn = async () => { runs++; };
            fn.plugin = { needsGroupMetadata: false };
            commands.set('fastcheck', fn);
            const sock = {
                subbotPhone: '573006',
                user: { id: '573006@s.whatsapp.net' },
                ev: { on: (event, fn) => listeners.set(event, fn) },
                groupMetadata: async () => {
                    lookups++;
                    return { participants: [{ id: '573003@s.whatsapp.net', admin: null }] };
                },
                sendMessage: async () => {}
            };
            handler(sock);
            const chat = '645@g.us';
            const send = async (id, participant) => listeners.get('messages.upsert')({
                type: 'notify', messages: [{
                    key: { id, remoteJid: chat, participant },
                    message: { conversation: '.fastcheck' }
                }]
            });

            await send('fast-no-restriction', '573003@s.whatsapp.net');
            assert.equal(runs, 1);
            assert.equal(lookups, 0);
            db.setSetting(`onlyadmin:${chat}`, '1');
            await send('fast-admin-only', '573003@s.whatsapp.net');
            assert.equal(runs, 1);
            assert.equal(lookups, 1);
            await send('fast-owner', '573001@s.whatsapp.net');
            assert.equal(runs, 2);
            assert.equal(lookups, 1);
            db.setSetting(`onlyadmin:${chat}`, '0');
            await send('fast-unlocked', '573003@s.whatsapp.net');
            assert.equal(runs, 3);
            assert.equal(lookups, 1);
            assert.equal(db.db.prepare('SELECT message_count FROM message_stats WHERE groupJid = ? AND userJid = ?').get(chat, '573003@s.whatsapp.net').message_count, 3);
});

test('brat commands encode text and generate static and animated stickers', async () => {
                const { default: sticker, command } = await import('../src/plugins/sticker.ts');
                const webp = await import('node-webpmux');
                const image = spawnSync('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i', 'color=red:s=64x64',
                    '-frames:v', '1', '-threads', '1', '-f', 'image2pipe', '-vcodec', 'png', 'pipe:1']);
                const video = spawnSync('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=s=64x64:r=10',
                    '-t', '1', '-c:v', 'mpeg4', '-threads', '1', '-movflags', 'frag_keyframe+empty_moov', '-f', 'mp4', 'pipe:1']);
                assert.equal(image.status, 0, String(image.stderr));
                assert.equal(video.status, 0, String(video.stderr));

                const originalFetch = globalThis.fetch;
                const urls = [];
                const sent = [];
                const replies = [];
                const msg = { chat: '123@g.us', pushName: 'Prueba', reply: async text => replies.push(text) };
                const sock = { sendMessage: async (chat, data) => sent.push({ chat, ...data }) };
                try {
                    globalThis.fetch = async url => {
                        urls.push(new URL(url));
                        const animated = url.pathname.endsWith('/bratvideo');
                        return new Response(animated ? video.stdout : image.stdout, { status: 200 });
                    };
                    for (const name of ['brat', 'bratv', 'bratvideo', 'bratanime']) {
                        assert.ok(command.includes(name));
                        await sticker(sock, msg, { command: name, args: ['Yae', '&', 'Miku'], rawArgs: 'Yae & Miku' });
                    }
                    assert.deepEqual(urls.map(url => url.pathname), [
                        '/canvas/brat', '/canvas/bratvideo', '/canvas/bratvideo', '/canvas/bratanime'
                    ]);
                    assert.ok(urls.every(url => url.searchParams.get('text') === 'Yae & Miku'));
                    assert.equal(sent.length, 4);
                    for (let i = 0; i < sent.length; i++) {
                        assert.equal(sent[i].chat, '123@g.us');
                        const decoded = new webp.default.Image();
                        await decoded.load(sent[i].sticker);
                        assert.equal(decoded.width, 512);
                        assert.equal(decoded.height, 512);
                        assert.equal(decoded.hasAnim, i === 1 || i === 2);
                        assert.ok(decoded.exif);
                    }
                    await sticker(sock, msg, { command: 'brat', args: [] });
                    assert.match(replies.at(-1), /Escribe el texto/);
                    assert.equal(urls.length, 4);
                    globalThis.fetch = async () => new Response('Error', { status: 503 });
                    await sticker(sock, msg, { command: 'brat', args: ['hola'] });
                    assert.match(replies.at(-1), /HTTP 503/);
                    globalThis.fetch = async () => new Response('not media', { status: 200 });
                    await sticker(sock, msg, { command: 'bratvideo', args: ['hola'] });
                    assert.match(replies.at(-1), /formato multimedia compatible/);
                    assert.equal(sent.length, 4);
                    globalThis.fetch = async () => new Response(image.stdout, { status: 200 });
                    await sticker(sock, msg, { command: 's', args: ['https://example.test/image.png'] });
                    assert.equal(sent.length, 5);
                    const ordinary = new webp.default.Image();
                    await ordinary.load(sent.at(-1).sticker);
                    assert.equal(ordinary.hasAnim, false);
                } finally {
                    globalThis.fetch = originalFetch;
                }
});
