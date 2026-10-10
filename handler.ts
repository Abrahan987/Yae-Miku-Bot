import './config.ts';
import type { WASocket } from '@whiskeysockets/baileys';
import { serialize, UserJid, decodeJid } from '#simple';
import { getUser, getGroup, updateUser, incrementCommandCount } from '#db';
import { loadPlugins, watchPlugins, commandMap, pluginData } from '#loader';
import { getPrimary } from './src/lib/primary.ts';
import { isAntilinkEnabled, containsLink } from './src/lib/antilink.ts';
import { LRUCache } from 'lru-cache';

loadPlugins().catch(() => {});
watchPlugins();

const DUP_LIMIT = 2000;
const metaTtlMs = 300000;
const processedIdsSet = new Set<string>();
const processedIdsQueue: string[] = [];
const groupMetaCache = new LRUCache<string, { metadata: any; ts: number }>({ max: 500, ttl: metaTtlMs });

export function invalidateGroupCache(chatId: string): void { if (chatId) groupMetaCache.delete(chatId); }
function isDuplicate(key: string): boolean { if (processedIdsSet.has(key)) return true; processedIdsSet.add(key); processedIdsQueue.push(key); if (processedIdsQueue.length > DUP_LIMIT) { const oldest = processedIdsQueue.shift(); if (oldest) processedIdsSet.delete(oldest); } return false; }
const normalizeNumber = (x: string) => String(x || '').split('@')[0].split(':')[0].replace(/[^\d]/g, '').trim();
const stripMexOne = (num: string) => num.startsWith('521') ? '52' + num.slice(3) : num;
const yae = (title: string, body: string) => `${(global as any).namebot}\n\n🍓͜ᩧ𑂳ᰍ  ${title}\n\n🪷 ${body}\n\nꨄ︎ ${(global as any).nmcreador}`;

function isPrimaryBot(sock: any, primary: string): boolean { if (!primary) return true; const botId = normalizeNumber(sock.user?.id || ''); const botLid = normalizeNumber(sock.user?.lid || ''); const primaryNorm = normalizeNumber(primary); return [botId, stripMexOne(botId), botLid, stripMexOne(botLid)].filter(Boolean).some(id => [primaryNorm, stripMexOne(primaryNorm)].filter(Boolean).includes(id)); }
function getAdminSet(participants: any[]): Set<string> { const set = new Set<string>(); for (const p of participants || []) { if (p.admin !== 'admin' && p.admin !== 'superadmin') continue; for (const id of [p.id, p.lid, p.phoneNumber]) { if (!id) continue; const n = normalizeNumber(id); set.add(n); set.add(stripMexOne(n)); set.add(id); set.add(decodeJid(id)); } } return set; }
async function getGroupMetadata(sock: any, chatId: string): Promise<any> { const key = `${normalizeNumber(sock.user?.id || '')}:${chatId}`; const cached = groupMetaCache.get(key); if (cached?.metadata) return cached.metadata; try { const metadata = await sock.groupMetadata(chatId); if (metadata) { groupMetaCache.set(key, { metadata, ts: Date.now() }); return metadata; } } catch {} return null; }

async function handleAntilink(sock: any, msg: any, rawMsg: any, text: string): Promise<boolean> { if (!msg.isGroup || rawMsg?.key?.fromMe || !isAntilinkEnabled(msg.from) || !containsLink(text)) return false; try { const metadata = await getGroupMetadata(sock, msg.from); const adminSet = getAdminSet(metadata?.participants || []); const raw = rawMsg?.key?.participant || rawMsg?.participant || msg.sender || ''; let resolved = raw; try { resolved = UserJid(sock, msg.from, raw) || raw; } catch {} const nums = [resolved, msg.sender, raw].map(normalizeNumber).filter(Boolean).flatMap((n: string) => [n, stripMexOne(n)]); const owner = normalizeNumber((global as any).owner); const isOwner = !!owner && nums.some(n => n === owner || n === stripMexOne(owner)); const isAdmin = nums.some(n => adminSet.has(n)) || adminSet.has(raw) || adminSet.has(msg.sender); if (isOwner || isAdmin) return false; await sock.sendMessage(msg.from, { delete: rawMsg.key }); const mention = resolved.endsWith('@s.whatsapp.net') ? resolved : raw; void sock.sendMessage(msg.from, { text: `🚫 *ANTILINK*\n\n🪷 @${normalizeNumber(mention)} los links no están permitidos en este grupo.`, mentions: [mention] }).catch(() => {}); return true; } catch (e) { console.error('[ANTILINK ERROR]:', e); return false; } }

function extractCommandInfo(text: string): { cleanCmd: string; usedPrefix: string } | null { const prefixes = (global as any).prefix || '.'; let usedPrefix = ''; if (Array.isArray(prefixes)) { usedPrefix = prefixes.find((p: string) => text.startsWith(p)) || ''; } else if (typeof prefixes === 'string' && text.startsWith(prefixes)) usedPrefix = prefixes; if (!usedPrefix) return null; let start = usedPrefix.length; while (start < text.length && text.charCodeAt(start) === 32) start++; let end = text.indexOf(' ', start); if (end === -1) end = text.length; const cleanCmd = text.slice(start, end).toLowerCase(); return cleanCmd ? { cleanCmd, usedPrefix } : null; }
function isConfiguredOwner(sender: string): boolean { const owner = normalizeNumber((global as any).owner); const n = normalizeNumber(sender); return !!owner && (n === owner || stripMexOne(n) === stripMexOne(owner)); }

export function handler(sock: WASocket) {
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify' || !Array.isArray(messages)) return;
        for (const rawMsg of messages) {
            try {
                const msgId = rawMsg?.key?.id; const jid = rawMsg?.key?.remoteJid || '';
                if (!msgId || !rawMsg.message || !jid || jid === 'status@broadcast' || jid.endsWith('@broadcast')) continue;
                if (jid.endsWith('@g.us')) { const primary = getPrimary(jid); if (primary && !isPrimaryBot(sock, primary)) continue; }
                if (isDuplicate(`${normalizeNumber(sock.user?.id || '')}:${msgId}`)) continue;
                const msg = serialize(sock, rawMsg); if (!msg?.body) continue;
                const text = msg.body.trim(); if (!text || await handleAntilink(sock, msg, rawMsg, text)) continue;
                const parsed = extractCommandInfo(text); if (!parsed) continue;
                const { cleanCmd, usedPrefix } = parsed; const runFn: any = commandMap.get(cleanCmd) || commandMap.get(`${usedPrefix}${cleanCmd}`); if (!runFn) continue;
                let start = usedPrefix.length; while (start < text.length && text.charCodeAt(start) === 32) start++; const first = text.indexOf(' ', start); const args = first === -1 ? [] : text.slice(first + 1).trim().split(/\s+/).filter(Boolean);
                let groupMetadata: any = null; let participants: any[] = []; let groupAdmins: string[] = []; let isAdmin = false; let isBotAdmin = false;
                if (msg.isGroup) { try { groupMetadata = await getGroupMetadata(sock, msg.from); participants = groupMetadata?.participants || []; const adminSet = getAdminSet(participants); groupAdmins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin').map(p => p.id); const rawParticipant = rawMsg?.key?.participant || rawMsg?.participant || msg.sender || ''; let sender = rawParticipant; try { sender = UserJid(sock, msg.from, sender) || sender; } catch {} const senderNums = [sender, msg.sender, rawParticipant].map(normalizeNumber).filter(Boolean).flatMap((n: string) => [n, stripMexOne(n)]); isAdmin = senderNums.some(n => adminSet.has(n)) || adminSet.has(rawParticipant) || adminSet.has(msg.sender); const botNums = [sock.user?.id || '', (sock.user as any)?.lid || ''].map(normalizeNumber).filter(Boolean).flatMap(n => [n, stripMexOne(n)]); isBotAdmin = botNums.some(n => adminSet.has(n)); } catch {} }
                const plugin = runFn.plugin || {}; const reqAdmin = Boolean(plugin.admin); const reqBotAdmin = Boolean(plugin.botAdmin); const reqOwner = Boolean(plugin.owner);
                const owner = rawMsg?.key?.fromMe || isConfiguredOwner(msg.sender);
                if (reqOwner && !owner) { await msg.reply(yae('𝙰𝙲𝙲𝙴𝚂𝙾 𝙳𝙴𝙽𝙴𝙶𝙰𝙳𝙾', 'Este comando solo puede ser usado por el *owner* del bot.')); continue; }
                if (reqAdmin && (!msg.isGroup || !isAdmin)) { await msg.reply(yae('𝙰𝙲𝙲𝙴𝚂𝙾 𝙳𝙴𝙽𝙴𝙶𝙰𝙳𝙾', msg.isGroup ? 'Este comando solo puede ser usado por los *administradores* del grupo.' : 'Este comando solo puede usarse dentro de un *grupo*.')); continue; }
                if (reqBotAdmin && (!msg.isGroup || !isBotAdmin)) { await msg.reply(yae('𝙰𝙲𝙲𝙴𝚂𝙾 𝙳𝙴𝙽𝙴𝙶𝙰𝙳𝙾', msg.isGroup ? 'El bot necesita ser *administrador* para ejecutar este comando.' : 'Este comando solo puede usarse dentro de un *grupo*.')); continue; }
                const dbHelpers = { getUser: async () => { try { return await getUser(msg.sender); } catch { return null; } }, getGroup: async () => { try { return await getGroup(msg.from); } catch { return null; } }, updateUser: async (data: any) => { try { return await updateUser(msg.sender, data); } catch { return null; } }, incrementCommandCount };
                const extra = { text, args, command: cleanCmd, pluginData, groupMetadata, participants, groupAdmins, isAdmin, isBotAdmin, isOwner: owner };
                try { await runFn(sock, msg, extra, dbHelpers, rawMsg); } catch (error: any) { if (error?.output?.statusCode === 401 || error?.output?.statusCode === 500 || error?.data === 401) { invalidateGroupCache(msg.from); void sock.sendMessage(msg.from, { text: yae('𝙿𝙴𝚁𝙼𝙸𝚂𝙾𝚂', 'No se pudo realizar la acción porque el bot carece de permisos de administrador.') }, { quoted: msg }).catch(() => {}); continue; } void sock.sendMessage(msg.from, { text: yae('𝙴𝚁𝚁𝙾𝚁', `Ocurrió un error al ejecutar el comando *${cleanCmd}*.`) }, { quoted: msg }).catch(() => {}); }
            } catch (err) { console.error('[HANDLER ERROR]:', err); }
        }
    });
}
