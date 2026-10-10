const regex = /^(?:https:\/\/|git@)github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/i;

export const command = ['gitclone', 'git'];
export const category = 'utils';
export const description = 'Buscar y descargar un repositorio de GitHub.';

function formatDate(value: string) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'Desconocido';
    return d.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function (sock: any, msg: any, extra: any) {
    const text = (extra?.args || []).join(' ').trim();

    if (!text) {
        return msg.reply('🪷 *GITCLONE*\n\n🍓 Proporciona un enlace o nombre de repositorio de GitHub.');
    }

    try {
        let zipBuffer: Buffer | null = null;
        let zipName = '';
        let repos: any[] = [];

        const match = text.match(regex);

        if (match) {
            const [, user, repo] = match;
            const repoRes = await fetch(`https://api.github.com/repos/${user}/${repo}`);
            const zipRes = await fetch(`https://api.github.com/repos/${user}/${repo}/zipball`);
            const repoData = await repoRes.json();
            zipName = zipRes.headers.get('content-disposition')?.match(/filename=(.*)/)?.[1] || `${repo}-${user}.zip`;
            zipBuffer = Buffer.from(await zipRes.arrayBuffer());
            repos.push(repoData);
        } else {
            const res = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(text)}`);
            const json: any = await res.json();

            if (!json.items?.length) {
                return msg.reply('🍥 No se encontraron resultados.');
            }

            if (json.items.length === 1) {
                const repo = json.items[0];
                const zipRes = await fetch(`https://api.github.com/repos/${repo.owner.login}/${repo.name}/zipball`);
                zipName = zipRes.headers.get('content-disposition')?.match(/filename=(.*)/)?.[1] || `${repo.name}-${repo.owner.login}.zip`;
                zipBuffer = Buffer.from(await zipRes.arrayBuffer());
                repos.push(repo);
            } else {
                repos = json.items.slice(0, 10);
            }
        }

        const info = repos
            .map((repo, i) =>
                `🪷 *Resultado ${i + 1}*\n` +
                `🍓 Creador: ${repo.owner?.login || 'Desconocido'}\n` +
                `🍥 Nombre: ${repo.name}\n` +
                `🍓 Creado: ${formatDate(repo.created_at)}\n` +
                `🍥 Actualizado: ${formatDate(repo.updated_at)}\n` +
                `🍓 Estrellas: ${repo.stargazers_count || 0}\n` +
                `🍥 Forks: ${repo.forks || 0}\n` +
                `🍓 Issues: ${repo.open_issues || 0}\n` +
                `🍥 Descripción: ${repo.description || 'Sin descripción'}\n` +
                `🍓 Enlace: ${repo.clone_url || repo.html_url || 'Sin enlace'}`
            )
            .join('\n\n');

        const avatarUrl = repos[0]?.owner?.avatar_url;
        if (avatarUrl) {
            const avatar = Buffer.from(await (await fetch(avatarUrl)).arrayBuffer());
            await sock.sendMessage(msg.from, { image: avatar, caption: info }, { quoted: msg });
        } else {
            await msg.reply(info);
        }

        if (zipBuffer && zipName) {
            await sock.sendMessage(
                msg.from,
                { document: zipBuffer, fileName: zipName, mimetype: 'application/zip' },
                { quoted: msg }
            );
        }
    } catch (e: any) {
        console.error('[GITCLONE]', e);
        return msg.reply(`🍥 Ocurrió un error al buscar el repositorio.\n🪷 ${e?.message || String(e)}`);
    }
}
