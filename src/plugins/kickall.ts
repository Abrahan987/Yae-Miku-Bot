export const command = ['kickall', 'purgegroup', 'limpiargrupo'];
export const category = 'admin';
export const description = 'Expulsa a todos del grupo excepto al owner.';
export const admin = true;
export const botAdmin = true;

const normalize = (jid: string) => String(jid || '').split('@')[0].split(':')[0];

export default async function (sock: any, msg: any, extra: any) {
    if (!msg.isGroup) {
        return msg.reply('🍓 𝙴𝚂𝚃𝙴 𝙲𝙾𝙼𝙰𝙽𝙳𝙾 𝚂𝙾𝙻𝙾 𝙵𝚄𝙽𝙲𝙸𝙾𝙽𝙰 𝙴𝙽 𝙶𝚁𝚄𝙿𝙾𝚂.');
    }

    const chatId = msg.from || msg.chat || extra?.chat;
    const react = (text: string) =>
        sock.sendMessage(chatId, { react: { text, key: msg.key } }).catch(() => {});

    try {
        await react('⏳');

        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata?.participants || [];

        const protectedIds = new Set<string>();
        const add = (jid?: string) => {
            if (jid) protectedIds.add(normalize(jid));
        };

        add(metadata?.owner);
        add((metadata as any)?.ownerPn);
        add(sock.user?.id);
        add((sock.user as any)?.lid);
        add(msg.sender);

        for (const p of participants) {
            if (p.admin === 'superadmin') {
                add(p.id);
                add(p.lid);
                add(p.phoneNumber);
            }
        }

        const toRemove: string[] = participants
            .filter((p: any) => {
                const ids = [p.id, p.lid, p.phoneNumber].filter(Boolean).map(normalize);
                return !ids.some((id: string) => protectedIds.has(id));
            })
            .map((p: any) => p.id);

        if (toRemove.length === 0) {
            await react('ℹ️');
            return msg.reply('🍥 𝙽𝙾 𝙷𝙰𝚈 𝙼𝙸𝙴𝙼𝙱𝚁𝙾𝚂 𝙿𝙰𝚁𝙰 𝙴𝚇𝙿𝚄𝙻𝚂𝙰𝚁.');
        }

        await sock.sendMessage(
            chatId,
            {
                text:
                    `🍓͜ᩧ𑂳ᰍ  𝙺𝙸𝙲𝙺𝙰𝙻𝙻\n\n` +
                    `🪷 𝙴𝚇𝙿𝚄𝙻𝚂𝙰𝙽𝙳𝙾 𝙰 ${toRemove.length} 𝙼𝙸𝙴𝙼𝙱𝚁𝙾𝚂...`
            },
            { quoted: msg }
        );

        let removed = 0;
        const batchSize = 20;

        for (let i = 0; i < toRemove.length; i += batchSize) {
            const batch = toRemove.slice(i, i + batchSize);
            try {
                await sock.groupParticipantsUpdate(chatId, batch, 'remove');
                removed += batch.length;
            } catch (error: any) {
                console.error('[KICKALL BATCH ERROR]:', error?.message || error);
            }
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        await react('✅');

        return sock.sendMessage(
            chatId,
            {
                text:
                    `✅ 𝙻𝙸𝙼𝙿𝙸𝙴𝚉𝙰 𝙲𝙾𝙼𝙿𝙻𝙴𝚃𝙰𝙳𝙰\n\n` +
                    `🪷 𝙴𝚇𝙿𝚄𝙻𝚂𝙰𝙳𝙾𝚂 ── ${removed}/${toRemove.length}\n` +
                    `🍥 𝚀𝚄𝙴𝙳𝙰𝙽 ── 𝙾𝚆𝙽𝙴𝚁, 𝙱𝙾𝚃 𝚈 𝚀𝚄𝙸𝙴𝙽 𝙴𝙹𝙴𝙲𝚄𝚃Ó`
            },
            { quoted: msg }
        );
    } catch (error: any) {
        console.error('[KICKALL ERROR]:', error);
        await react('❌');

        const status = error?.output?.statusCode || error?.data || error?.status;
        if (status === 401 || status === 403 || status === 500) {
            return msg.reply(
                `⚠︎ 𝙽𝙾 𝙿𝚄𝙳𝙴 𝙴𝙹𝙴𝙲𝚄𝚃𝙰𝚁 𝙻𝙰 𝙰𝙲𝙲𝙸Ó𝙽.\n\n` +
                `🍥 𝚅𝙴𝚁𝙸𝙵𝙸𝙲𝙰 𝚀𝚄𝙴 𝙴𝙻 𝙱𝙾𝚃 𝚂𝙴𝙰 𝙰𝙳𝙼𝙸𝙽.`
            );
        }

        return msg.reply('⚠︎ 𝙾𝙲𝚄𝚁𝚁𝙸Ó 𝚄𝙽 𝙴𝚁𝚁𝙾𝚁 𝙰𝙻 𝙻𝙸𝙼𝙿𝙸𝙰𝚁 𝙴𝙻 𝙶𝚁𝚄𝙿𝙾.');
    }
}
