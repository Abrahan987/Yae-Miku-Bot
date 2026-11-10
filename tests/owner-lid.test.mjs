import { test, mock, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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
