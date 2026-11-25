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

const generatedMedia = [];
const subbotSockets = [];
let failSubbotAuth = false;
const makeSubbotSocket = () => {
    const listeners = new Map();
    const sock = {
        user: { id: '573099@s.whatsapp.net' },
        ev: {
            on: (event, fn) => listeners.set(event, fn),
            removeAllListeners: () => listeners.clear()
        },
        ws: { isOpen: true, close: () => {} },
        end: () => {},
        listeners
    };
    subbotSockets.push(sock);
    return sock;
};
mock.module('@whiskeysockets/baileys', { namedExports: {
    default: makeSubbotSocket,
    proto: { Message: {
        StickerMessage: { encode: () => ({}) },
        AudioMessage: { encode: () => ({}) },
        encode: () => ({})
    } },
    isJidGroup: jid => String(jid || '').endsWith('@g.us'),
    generateWAMessageFromContent: () => ({ key: { id: 'premium-menu' }, message: {} }),
    getContentType: message => Object.keys(message)[0],
    jidDecode: jid => {
        const [user, server] = jid.split('@');
        return { user: user.split(':')[0], server };
    },
    useMultiFileAuthState: async () => {
        if (failSubbotAuth) {
            failSubbotAuth = false;
            throw new Error('simulated auth-state failure');
        }
        return { state: { creds: { registered: false }, keys: {} }, saveCreds: async () => {} };
    },
    fetchLatestBaileysVersion: async () => ({ version: [2, 3000, 1000000000] }),
    makeCacheableSignalKeyStore: keys => keys,
    makeWASocket: makeSubbotSocket,
    DisconnectReason: { loggedOut: 401 },
    Browsers: { macOS: browser => browser },
    generateWAMessageContent: async content => {
        generatedMedia.push(content);
        return { stickerMessage: {} };
    },
    prepareWAMessageMedia: async () => ({ audioMessage: { ptt: true, url: 'https://example.test/audio' } }),
    downloadContentFromMessage: async media => ({
        async *[Symbol.asyncIterator]() {
            if (media?.testBuffer) yield media.testBuffer;
        }
    })
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
const mute = await import('../src/plugins/mute.ts');
const deleteMessage = await import('../src/plugins/delete.ts');
const promote = await import('../src/plugins/promote.ts');
commands.set('setprefix', setprefix);
mute.default.plugin = { admin: false, botAdmin: false };
for (const command of mute.command) commands.set(command, mute.default);
deleteMessage.default.plugin = { admin: false, botAdmin: false };
for (const command of deleteMessage.command) commands.set(command, deleteMessage.default);
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

test('owner can set its own yen and give yen, but other users cannot', async () => {
    const { default: gift } = await import('../src/plugins/gift.ts');
    const { getUser } = await import('../src/lib/database.ts');
    const replies = [];
    const sock = { sendMessage: async (_chat, content) => replies.push(content) };
    const ownerMsg = {
        from: '123@g.us',
        sender: '573001@s.whatsapp.net',
        isGroup: true,
        mentionedJid: [],
        quoted: null,
        reply: async text => replies.push({ text })
    };
    const rawOwner = { key: { fromMe: true, remoteJid: '123@g.us' } };
    await gift(sock, ownerMsg, { command: 'chetar', args: ['250000'] }, {}, rawOwner);
    assert.equal(getUser('573001@s.whatsapp.net').yen, 250000);

    const recipient = '573003@s.whatsapp.net';
    const targetMsg = { ...ownerMsg, mentionedJid: [recipient] };
    await gift(sock, targetMsg, { command: 'daryenes', args: ['@573003', '5000'] }, {}, rawOwner);
    assert.equal(getUser(recipient).yen, 5000);

    const otherMsg = { ...ownerMsg, sender: '573003@s.whatsapp.net' };
    await gift(sock, otherMsg, { command: 'chetar', args: ['999'] }, {}, { key: { fromMe: false, remoteJid: '573003@s.whatsapp.net' } });
    assert.equal(getUser('573001@s.whatsapp.net').yen, 250000);
    assert.match(replies.at(-1).text, /owner.*bot|solo puede ser usado por el \*?owner/i);
});

test('daryenes adds yen exactly to a balance above Number.MAX_SAFE_INTEGER', async () => {
    const { default: gift } = await import('../src/plugins/gift.ts');
    const recipient = '573078@s.whatsapp.net';
    const initial = 9214010099999982n;
    const amount = 1235;
    db.db.prepare('INSERT INTO users (jid, name, yen, bank) VALUES (?, ?, ?, 0)')
        .run(recipient, 'Saldo grande', initial);
    assert.doesNotThrow(() => db.getUser(recipient));
    db.updateUser(recipient, { name: 'Saldo exacto' });
    assert.equal(
        db.db.prepare('SELECT CAST(yen AS TEXT) AS yen FROM users WHERE jid = ?').get(recipient).yen,
        String(initial)
    );

    const replies = [];
    const ownerMessage = {
        from: '123@g.us',
        sender: '573001@s.whatsapp.net',
        isGroup: true,
        mentionedJid: [recipient],
        quoted: null,
        reply: async text => replies.push({ text })
    };
    const sock = {
        user: { id: '573001@s.whatsapp.net' },
        sendMessage: async (_chat, content) => replies.push(content)
    };
    await gift(sock, ownerMessage, { command: 'daryenes', args: [`@${recipient.split('@')[0]}`, String(amount)] }, {}, {
        key: { fromMe: true, remoteJid: ownerMessage.from }
    });

    const stored = db.db.prepare('SELECT CAST(yen AS TEXT) AS yen FROM users WHERE jid = ?').get(recipient);
    assert.equal(stored.yen, String(initial + BigInt(amount)));
    assert.match(replies.at(-1).text, new RegExp((initial + BigInt(amount)).toLocaleString()));
});

test('failed subbot startup releases its phone lock so linking can be retried', async () => {
    const subbots = await import('../src/lib/subbot.ts');
    const config = {
        phone: '573099',
        isCode: false,
        mainSocket: { sendMessage: async () => ({ key: { id: 'sent' } }) },
        mainChat: '573001@s.whatsapp.net',
        mainMsg: { key: { id: 'request' } }
    };

    failSubbotAuth = true;
    await assert.rejects(subbots.startSubBot(config), /simulated auth-state failure/);
    await assert.doesNotReject(subbots.startSubBot(config));
    await assert.rejects(subbots.startSubBot(config), /sub-bot activo o en proceso/);
    await subbotSockets.at(-1).listeners.get('connection.update')({
        connection: 'close',
        lastDisconnect: { error: { output: { statusCode: 500 } } }
    });
    await assert.rejects(subbots.startSubBot(config), /sub-bot activo o en proceso/);
    subbots.removeSubBot(config.phone);

    await assert.doesNotReject(subbots.startSubBot(config));
    subbots.removeSubBot(config.phone);
    assert.ok(subbotSockets.length >= 2);
});

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

test('mute is group-scoped, admin-only, persistent, and deletes muted messages', async () => {
    const listeners = new Map();
    const sentMessages = [];
    let targetCommands = 0;
    const group = 'mute-test@g.us';
    const adminJid = '573010@s.whatsapp.net';
    const botJid = '573011@s.whatsapp.net';
    const targetJid = '573012@s.whatsapp.net';
    const participants = [
        { id: adminJid, admin: 'admin' },
        { id: botJid, admin: 'admin' },
        { id: targetJid, admin: null }
    ];
    const sock = {
        subbotPhone: '573011',
        user: { id: botJid },
        ev: { on: (event, fn) => listeners.set(event, fn) },
        groupMetadata: async () => ({ participants }),
        sendMessage: async (chat, content) => { sentMessages.push({ chat, ...content }); }
    };
    const send = async (id, participant, text, contextInfo = {}) => listeners.get('messages.upsert')({
        type: 'notify',
        messages: [{
            key: { id, remoteJid: group, participant, fromMe: false },
            message: { extendedTextMessage: { text, contextInfo } }
        }]
    });

    commands.set('muted-command-test', async () => { targetCommands++; });
    handler(sock);
    await send('mute-command', adminJid, '.mute @573012', { mentionedJid: [targetJid] });
    assert.equal(db.isGroupUserMuted(group, [targetJid]), true);
    assert.equal(db.isGroupUserMuted('other-group@g.us', [targetJid]), false);

    await send('muted-message', targetJid, '.muted-command-test');
    assert.equal(targetCommands, 0);
    assert.equal(sentMessages.at(-1).delete.id, 'muted-message');

    await send('nonadmin-mute', targetJid, '.mute @573010', { mentionedJid: [adminJid] });
    assert.equal(db.isGroupUserMuted(group, [adminJid]), false);

    await send('unmute-command', adminJid, '.unmute @573012', { mentionedJid: [targetJid] });
    assert.equal(db.isGroupUserMuted(group, [targetJid]), false);
});

test('delete removes the quoted message silently for admins only', async () => {
    const listeners = new Map();
    const sentMessages = [];
    const group = 'delete-test@g.us';
    const adminJid = '573020@s.whatsapp.net';
    const botJid = '573021@s.whatsapp.net';
    const targetJid = '573022@s.whatsapp.net';
    const sock = {
        subbotPhone: '573021',
        user: { id: botJid },
        ev: { on: (event, fn) => listeners.set(event, fn) },
        groupMetadata: async () => ({ participants: [
            { id: adminJid, admin: 'admin' },
            { id: botJid, admin: 'admin' },
            { id: targetJid, admin: null }
        ] }),
        sendMessage: async (chat, content) => { sentMessages.push({ chat, ...content }); }
    };
    const sendDelete = async (id, participant) => listeners.get('messages.upsert')({
        type: 'notify',
        messages: [{
            key: { id, remoteJid: group, participant, fromMe: false },
            message: { extendedTextMessage: {
                text: '.del',
                contextInfo: { stanzaId: 'message-to-delete', participant: targetJid, quotedMessage: { conversation: 'remove this' } }
            } }
        }]
    });

    handler(sock);
    await sendDelete('admin-delete', adminJid);
    assert.equal(sentMessages.length, 1);
    assert.deepEqual(sentMessages[0].delete, {
        remoteJid: group,
        fromMe: false,
        id: 'message-to-delete',
        participant: targetJid
    });

    await sendDelete('nonadmin-delete', targetJid);
    assert.equal(sentMessages.length, 2);
    assert.match(sentMessages.at(-1).text, /administradores del grupo/);
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

test('premium plans use yen, persist per LID and bypass economy cooldowns', async () => {
    const { default: gift } = await import('../src/plugins/gift.ts');
    const { getUser, updateUser, getCooldown, setCooldown, isPremiumUser, getPremiumUntil } = await import('../src/lib/database.ts');
    const sender = '573010@s.whatsapp.net';
    updateUser(sender, { yen: 1300000, bank: 0, banned: 0 });

    const replies = [];
    const sock = {
        user: { id: '573001@s.whatsapp.net' },
        relayMessage: async (_chat, content) => replies.push(content)
    };
    const msg = {
        from: '123@g.us',
        sender,
        key: { remoteJid: '123@g.us', participant: sender },
        reply: async text => replies.push({ text })
    };

    await gift(sock, msg, { command: 'comprarprem', args: ['1'] });
    assert.equal(getUser(sender).yen, 1275000);
    assert.equal(isPremiumUser(sender), true);
    assert.ok(getPremiumUntil(sender) > Date.now());

    setCooldown(sender, 'work', Date.now() + 3600000);
    assert.equal(getCooldown(sender, 'work'), 0);

    await gift(sock, msg, { command: 'comprarprem', args: ['10'] });
    assert.equal(getUser(sender).yen, 75000);
});

test('balance commands display SQLite yen values above the safe integer range exactly', async () => {
    const { default: balance } = await import('../src/plugins/balance.ts');
    const jid = '573099@s.whatsapp.net';
    const yen = 9214010099999982n;
    const bank = 10000000000000001n;
    db.db.prepare(`
        INSERT INTO users (jid, name, yen, bank)
        VALUES (?, ?, ${yen}, ${bank})
    `).run(jid, 'Rich User');

    const replies = [];
    const msg = {
        sender: jid,
        mentionedJid: [],
        quoted: null,
        reply: async text => replies.push(text)
    };

    await balance({}, msg, { command: 'balance', args: [] });
    assert.match(replies.at(-1), new RegExp(`¥${yen.toLocaleString()}`));
    assert.match(replies.at(-1), new RegExp(`¥${bank.toLocaleString()}`));

    await balance({}, msg, { command: 'economyboard', args: ['50'] });
    const total = yen + bank;
    assert.match(replies.at(-1), new RegExp(`¥${total.toLocaleString()}`));
});

test('ping reports WhatsApp response, processing and message age', async () => {
    const { default: ping } = await import('../src/plugins/ping.ts');
    const sent = [];
    const sock = {
        sendMessage: async (_chat, content) => {
            if (!content.edit) {
                await new Promise(resolve => setTimeout(resolve, 5));
            }
            sent.push(content);
            return content.edit ? {} : { key: { id: 'ping-key' } };
        }
    };
    const msg = {
        from: '123@g.us',
        pushName: 'Yae',
        messageTimestamp: Math.floor(Date.now() / 1000) - 2
    };
    await ping(sock, msg, { command: 'ping' }, {
        getUser: async () => ({ name: 'Yae', yen: 1234 }),
        incrementCommandCount: () => 42
    });
    assert.equal(sent.length, 2);
    assert.match(sent[0].text, /PONG/);
    assert.match(sent[0].text, /Midiendo/);
    assert.equal(sent[1].edit.id, 'ping-key');
    assert.match(sent[1].text, /Respuesta de WhatsApp/);
    assert.match(sent[1].text, /Procesamiento/);
    assert.match(sent[1].text, /Mensaje recibido/);
    assert.match(sent[1].text, /Comandos ejecutados.*42/s);
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

                    const largeVideo = spawnSync('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=512x512:r=20:d=10',
                        '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '12', '-threads', '1',
                        '-movflags', 'frag_keyframe+empty_moov', '-f', 'mp4', 'pipe:1'], { maxBuffer: 20 * 1024 * 1024 });
                    assert.equal(largeVideo.status, 0, String(largeVideo.stderr));
                    assert.ok(largeVideo.stdout.length > 1024 * 1024);
                    const videoMsg = {
                        ...msg,
                        quoted: {
                            type: 'videoMessage',
                            msg: { mimetype: 'video/mp4', seconds: 10, testBuffer: largeVideo.stdout },
                            download: async () => largeVideo.stdout
                        }
                    };
                    await sticker(sock, videoMsg, { command: 's', args: [] });
                    assert.equal(sent.length, 6);
                    assert.ok(sent.at(-1).sticker.length < 1024 * 1024);

                    const generatedSticker = sent.at(-1).sticker;
                    const quotedStickerMsg = {
                        ...msg,
                        quoted: {
                            type: 'stickerMessage',
                            msg: { mimetype: 'image/webp', isAnimated: true, testBuffer: generatedSticker },
                            download: async () => generatedSticker
                        }
                    };
                    await sticker(sock, quotedStickerMsg, { command: 's', args: [] });
                    assert.equal(sent.length, 7);
                    const quotedResult = new webp.default.Image();
                    await quotedResult.load(sent.at(-1).sticker);
                    assert.equal(quotedResult.hasAnim, true);
                } finally {
                    globalThis.fetch = originalFetch;
                }
});

test('sticker plugin exposes audio aliases and requires a quoted video', async () => {
    const { default: sticker, command } = await import('../src/plugins/sticker.ts');
    const replies = [];
    assert.ok(command.includes('stickeraudio'));
    assert.ok(command.includes('sa'));
    assert.ok(command.includes('audiosticker'));

    await sticker({}, {
        quoted: null,
        reply: async text => replies.push(text)
    }, { command: 'sa', args: [] });
    assert.match(replies.at(-1), /Responde a un video con sonido/);

    let downloaded = false;
    await sticker({}, {
        quoted: {
            type: 'videoMessage',
            msg: { seconds: 61 },
            download: async () => { downloaded = true; }
        },
        reply: async text => replies.push(text)
    }, { command: 'stickeraudio', args: [] });
    assert.equal(downloaded, false);
    assert.match(replies.at(-1), /60 segundos o menos/);
});

test('audio sticker replies to its source video and uses faster animation settings', async () => {
    const { default: sticker } = await import('../src/plugins/sticker.ts');
    const webp = await import('node-webpmux');
    const video = spawnSync('ffmpeg', [
        '-loglevel', 'error',
        '-f', 'lavfi', '-i', 'testsrc2=s=320x320:r=10:d=2',
        '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-threads', '1',
        '-c:a', 'aac', '-shortest', '-movflags', 'frag_keyframe+empty_moov',
        '-f', 'mp4', 'pipe:1'
    ], { maxBuffer: 20 * 1024 * 1024 });
    assert.equal(video.status, 0, String(video.stderr));

    const relayed = [];
    const replies = [];
    const sourceChat = 'audio-sticker@g.us';
    await sticker({
        waUploadToServer: async () => {},
        relayMessage: async (chat, content, options) => relayed.push({ chat, content, options })
    }, {
        from: sourceChat,
        chat: sourceChat,
        pushName: 'Prueba',
        quoted: {
            type: 'videoMessage',
            msg: { seconds: 2 },
            key: { id: 'source-video', participant: '573001@s.whatsapp.net' },
            sender: '573001@s.whatsapp.net',
            download: async () => video.stdout
        },
        reply: async text => replies.push(text)
    }, { command: 'sa', args: [] });

    assert.equal(relayed.length, 1);
    assert.equal(relayed[0].chat, sourceChat);
    assert.equal(relayed[0].content.stickerMessage.contextInfo.stanzaId, 'source-video');
    assert.equal(relayed[0].content.stickerMessage.contextInfo.participant, '573001@s.whatsapp.net');
    assert.ok(relayed[0].content.stickerMessage.audioMessage);
    assert.equal(relayed[0].content.stickerMessage.isAnimated, true);
    assert.equal(replies.length, 0);

    const encoded = new webp.default.Image();
    await encoded.load(generatedMedia.at(-1).sticker);
    assert.ok(encoded.exif);
});
