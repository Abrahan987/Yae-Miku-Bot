import { test, mock, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const originalDirectory = process.cwd();
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'yae-private-test-'));
process.chdir(temporaryDirectory);
after(() => {
    process.chdir(originalDirectory);
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

const mappings = new Map([['987654@lid', '573001@s.whatsapp.net'], ['777777@lid', '573002@s.whatsapp.net']]);
const decodeJid = jid => String(jid || '').replace(/:\d+@/, '@');
const UserJid = (_sock, chat, jid) => mappings.get(decodeJid(jid || chat)) || decodeJid(jid || chat);
const sent = [];
const serialize = (_sock, raw) => ({
    from: raw.key.remoteJid,
    sender: UserJid(null, '', raw.key.participant || raw.key.remoteJid),
    isGroup: raw.key.remoteJid.endsWith('@g.us'),
    body: raw.message.conversation,
    reply: async text => { sent.push({ text }); }
});

mock.module('../src/lib/simple.ts', { namedExports: {
    decodeJid, UserJid, serialize, lidCache: new Map(),
    learnLid: () => {}, rememberParticipants: () => {}
} });
mock.module('../config.ts', { namedExports: {} });
const commands = new Map();
mock.module('../src/lib/loader.ts', { namedExports: {
    commandMap: commands, pluginData: new Map(),
    loadPlugins: async () => {}, watchPlugins: () => {}
} });
const activeBots = new Map();
mock.module('../src/lib/subbot.ts', { namedExports: { getActiveBots: () => activeBots } });
let sales = 0;
mock.module('../src/lib/gacha.ts', { namedExports: {
    handleGachaAccept: async () => false,
    touchUser: () => {},
    withGacha: () => async () => { sales++; },
    findInHarem: () => null, putSale: () => {}, displayName: () => ''
} });

globalThis.owner = '573001';
globalThis.prefix = ['.', '#'];
globalThis.namebot = 'Yae';
globalThis.nmcreador = 'Creator';
const db = await import('../src/lib/database.ts');
await db.loadDB();
const privacy = await import('../src/lib/private_mode.ts');
const { default: modopri } = await import('../src/plugins/modopri.ts');
const { default: sell } = await import('../src/plugins/sell.ts');
const { sendWelcome, setWelcomeEnabled } = await import('../src/lib/welcome.ts');
const { handler } = await import('../handler.ts');

function socket(phone) {
    const listeners = new Map();
    const sock = {
        subbotPhone: phone,
        user: { id: `${phone || '999'}@s.whatsapp.net`, lid: '444444@lid' },
        ev: { on: (event, fn) => listeners.set(event, fn) },
        sendMessage: async (chat, content) => { sent.push({ chat, ...content }); },
        groupMetadata: async () => ({ subject: 'Grupo', participants: [] }),
        profilePictureUrl: async () => undefined,
        emit: async (event, value) => listeners.get(event)(value)
    };
    handler(sock);
    if (phone) activeBots.set(phone, sock);
    return sock;
}

const main = socket();
const subA = socket('573002');
const subB = socket('573003');
db.setSubBotConfig('573002', { owner_jid: '777777' });
db.setSubBotConfig('573003', { owner_jid: '573003' });

const groupMsg = { from: '123@g.us', isGroup: true, sender: '573002@s.whatsapp.net', reply: async text => sent.push({ text }) };
const ownerRaw = { key: { remoteJid: '123@g.us', participant: '777777@lid' } };
const extra = args => ({ args, command: 'modopri' });

test('subbot privacy is owner-only, session-scoped, and persists in SQLite', async () => {
    await modopri(subA, groupMsg, extra(['on']), null, { key: { remoteJid: '123@g.us', participant: '888888@lid' } });
    assert.equal(privacy.isPrivateModeEnabled(subA), false);
    await modopri(subA, groupMsg, extra(['on']), null, ownerRaw);
    assert.equal(privacy.isPrivateModeEnabled(subA), true);
    assert.equal(privacy.isPrivateModeEnabled(subB), false);
    assert.equal(privacy.isPrivateModeEnabled(main), false);
    assert.equal(db.db.prepare('SELECT value FROM bot_settings WHERE key = ?').get('private_mode:subbot:573002').value, '1');
    assert.equal(privacy.isPrivateModeEnabled({ subbotPhone: '573002' }), true);
    const restarted = spawnSync(process.execPath, ['--input-type=module', '-e',
        "import { DatabaseSync } from 'node:sqlite'; const db = new DatabaseSync('database.sqlite'); console.log(db.prepare('SELECT value FROM bot_settings WHERE key = ?').get('private_mode:subbot:573002').value)"],
    { cwd: temporaryDirectory, encoding: 'utf8' });
    assert.equal(restarted.status, 0, restarted.stderr);
    assert.equal(restarted.stdout.trim(), '1');
    await modopri(subB, groupMsg, extra(['on']), null, ownerRaw);
    assert.equal(privacy.isPrivateModeEnabled(subB), false);
    assert.equal(privacy.isSubbotPrivateModeOwner(subB, groupMsg, { key: { participant: '573003@lid' } }, '573003'), false);
    assert.equal(privacy.isMainPrivateModeOwner(main, groupMsg, { key: { participant: '573001@lid' } }), false);
    assert.equal(privacy.isMainPrivateModeOwner(main, groupMsg, { key: { participant: '987654@lid' } }), true);
});

test('sell on/off is restricted to the main owner and sales still use gacha', async () => {
    const command = args => ({ args, command: 'sell' });
    await sell(main, groupMsg, command(['on']), null, { key: { participant: '888888@lid' } });
    assert.equal(privacy.isPrivateModeEnabled(main), false);
    await sell(subA, groupMsg, command(['on']), null, { key: { fromMe: true } });
    assert.equal(privacy.isPrivateModeEnabled(subA), true);
    await sell(main, groupMsg, command(['on']), null, { key: { participant: '987654@lid' } });
    assert.equal(privacy.isPrivateModeEnabled(main), true);
    await sell(main, groupMsg, command(['5000', 'Yuki']), null, ownerRaw);
    assert.equal(sales, 1);
    await sell(main, groupMsg, command(['off']), null, { key: { participant: '987654@lid' } });
    assert.equal(privacy.isPrivateModeEnabled(main), false);
});

test('private mode silently blocks other commands but permits code and group commands', async () => {
    let codes = 0;
    let menus = 0;
    commands.set('code', async () => { codes++; });
    commands.set('menu', async () => { menus++; });
    let id = 0;
    const message = (chat, text) => ({
        key: { id: String(++id), remoteJid: chat, participant: chat.endsWith('@g.us') ? '777777@lid' : undefined },
        message: { conversation: text }
    });
    sent.length = 0;
    await subA.emit('messages.upsert', { type: 'notify', messages: [
        message('777777@lid', '.menu'),
        message('777777@lid', '.modopri off'),
        message('777777@lid', '.code 573002'),
        message('123@g.us', '.menu')
    ] });
    assert.equal(codes, 1);
    assert.equal(menus, 1);
    assert.equal(sent.length, 0);
    await modopri(subA, groupMsg, extra(['off']), null, ownerRaw);
    await subA.emit('messages.upsert', { type: 'notify', messages: [message('777777@lid', '.menu')] });
    assert.equal(menus, 2);
    privacy.setPrivateMode(main, true);
    globalThis.noPrefix = true;
    await main.emit('messages.upsert', { type: 'notify', messages: [
        message('777777@lid', 'menu'),
        message('777777@lid', 'code 573002')
    ] });
    assert.equal(codes, 2);
    assert.equal(menus, 2);
    globalThis.noPrefix = false;
    privacy.setPrivateMode(main, false);
});

test('welcome uses user photo, then group photo, then text', async () => {
    const calls = [];
    const sock = {
        profilePictureUrl: async id => id === 'missing@lid' ? undefined : `https://example.test/${id}`,
        sendMessage: async (chat, content) => calls.push({ chat, ...content })
    };
    await sendWelcome(sock, 'group@g.us', ['user@lid'], 'Hola', ['user@lid']);
    assert.equal(calls[0].image.url, 'https://example.test/user@lid');
    assert.equal(calls[0].caption, 'Hola');
    await sendWelcome(sock, 'group@g.us', ['missing@lid'], 'Hola', ['missing@lid']);
    assert.equal(calls[1].image.url, 'https://example.test/group@g.us');
    sock.profilePictureUrl = async () => undefined;
    await sendWelcome(sock, 'group@g.us', ['missing@lid'], 'Hola', ['missing@lid']);
    assert.equal(calls[2].text, 'Hola');
    assert.deepEqual(calls[2].mentions, ['missing@lid']);
    sock.profilePictureUrl = async id => `https://example.test/${id}`;
    sock.sendMessage = async (chat, content) => {
        if (content.image?.url.endsWith('user@lid')) throw new Error('inaccessible image');
        calls.push({ chat, ...content });
    };
    await sendWelcome(sock, 'group@g.us', ['user@lid'], 'Hola', ['user@lid']);
    assert.equal(calls[3].image.url, 'https://example.test/group@g.us');
});

test('welcome event resolves LID for photo and keeps the original mention', async () => {
    const photos = [];
    sent.length = 0;
    subA.profilePictureUrl = async id => { photos.push(id); return 'https://example.test/photo'; };
    setWelcomeEnabled('welcome@g.us', 'welcome', true);
    await subA.emit('group-participants.update', { id: 'welcome@g.us', action: 'add', participants: ['987654@lid'] });
    assert.equal(photos[0], '573001@s.whatsapp.net');
    assert.deepEqual(sent[0].mentions, ['987654@lid']);
    assert.match(sent[0].caption, /@573001/);
});
