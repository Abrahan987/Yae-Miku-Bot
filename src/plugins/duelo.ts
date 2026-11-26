
import { isJidGroup } from '@whiskeysockets/baileys';
import { sendInteractiveList } from '../lib/interactive.ts';

import { randomInt, randomUUID } from 'node:crypto';
import { db, getUser } from '#db';

export const command = ['duelo', 'rpg', 'fight'];
export const category = 'diversion';
export const description = 'Combates RPG interactivos entre usuarios.';
export const needsGroupMetadata = false;

type Action = 'atacar' | 'defender' | 'curar' | 'habilidad';
type Status = 'pending' | 'active';
type PlayerIndex = 0 | 1;

type Fighter = {
    jid: string;
    hp: number;
    mp: number;
    guard: boolean;
    heals: number;
};

type Game = {
    id: string;
    bot: string;
    chat: string;
    fighters: [Fighter, Fighter];
    turn: PlayerIndex;
    version: number;
    status: Status;
    expires: number;
};

type Stored = {
    game: Game;
    raw: string;
};

const MAX_HP = 100;
const MAX_MP = 40;
const INVITE_TIME = 120000;
const TURN_TIME = 90000;
const WIN_REWARD = 120;

const timers = new Map<
    string,
    ReturnType<typeof setTimeout>
>();

db.exec(`
    CREATE TABLE IF NOT EXISTS yae_duel_games (
        bot TEXT NOT NULL,
        chat TEXT NOT NULL,
        id TEXT NOT NULL,
        data TEXT NOT NULL,
        PRIMARY KEY (bot, chat)
    );

    CREATE TABLE IF NOT EXISTS yae_duel_stats (
        bot TEXT NOT NULL,
        player TEXT NOT NULL,
        wins INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (bot, player)
    );

    CREATE TABLE IF NOT EXISTS yae_duel_rewards (
        bot TEXT NOT NULL,
        winner TEXT NOT NULL,
        loser TEXT NOT NULL,
        day TEXT NOT NULL,
        PRIMARY KEY (bot, winner, loser, day)
    );
`);

function getPrefix(): string {
    const value = global.prefix;

    if (Array.isArray(value)) {
        return value.find(
            (item: string) => item.length > 0
        ) || '.';
    }

    return typeof value === 'string' && value
        ? value
        : '.';
}

function getBotId(sock: any): string {
    return String(sock.user?.id || 'main')
        .replace(/:\d+(?=@)/, '');
}

function mention(jid: string): string {
    return `@${jid.split('@')[0]}`;
}

function gameKey(game: Game): string {
    return `${game.bot}|${game.chat}`;
}

function getGame(
    bot: string,
    chat: string
): Stored | null {
    const row = db.prepare(`
        SELECT data
        FROM yae_duel_games
        WHERE bot = ? AND chat = ?
    `).get(bot, chat) as
        | { data: string }
        | undefined;

    if (!row) return null;

    return {
        game: JSON.parse(row.data) as Game,
        raw: row.data
    };
}

function createGame(game: Game): boolean {
    const result = db.prepare(`
        INSERT OR IGNORE INTO yae_duel_games
        (bot, chat, id, data)
        VALUES (?, ?, ?, ?)
    `).run(
        game.bot,
        game.chat,
        game.id,
        JSON.stringify(game)
    );

    return Number(result.changes) === 1;
}

function updateGame(
    stored: Stored,
    game: Game
): boolean {
    const result = db.prepare(`
        UPDATE yae_duel_games
        SET data = ?
        WHERE bot = ? AND chat = ?
        AND id = ? AND data = ?
    `).run(
        JSON.stringify(game),
        game.bot,
        game.chat,
        game.id,
        stored.raw
    );

    return Number(result.changes) === 1;
}

function clearTimer(game: Game): void {
    const key = gameKey(game);
    const timer = timers.get(key);

    if (timer) clearTimeout(timer);
    timers.delete(key);
}

function removeGame(stored: Stored): boolean {
    const game = stored.game;

    const result = db.prepare(`
        DELETE FROM yae_duel_games
        WHERE bot = ? AND chat = ?
        AND id = ? AND data = ?
    `).run(
        game.bot,
        game.chat,
        game.id,
        stored.raw
    );

    if (Number(result.changes) !== 1) {
        return false;
    }

    clearTimer(game);
    return true;
}

function createFighter(jid: string): Fighter {
    return {
        jid,
        hp: MAX_HP,
        mp: 30,
        guard: false,
        heals: 2
    };
}

function healthBar(value: number): string {
    const filled = Math.max(
        0,
        Math.min(10, Math.ceil(value / 10))
    );

    return '█'.repeat(filled) +
        '░'.repeat(10 - filled);
}

function renderFighter(fighter: Fighter): string {
    return `${mention(fighter.jid)}

❤️ HP: ${fighter.hp}/${MAX_HP}
${healthBar(fighter.hp)}

🔮 Maná: ${fighter.mp}/${MAX_MP}
🧪 Curaciones: ${fighter.heals}
🛡️ Defensa: ${fighter.guard ? 'Activa' : 'Inactiva'}`;
}

function renderGame(game: Game): string {
    const [first, second] = game.fighters;

    return `🍓 *YAE DUELO RPG*

⚔️ *JUGADOR 1*
${renderFighter(first)}

━━━━━━━━━━━━━━

🪷 *JUGADOR 2*
${renderFighter(second)}

━━━━━━━━━━━━━━`;
}

function getDay(): string {
    const parts = new Intl.DateTimeFormat(
        'en-US',
        {
            timeZone: 'America/Bogota',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }
    ).formatToParts(new Date());

    const values = Object.fromEntries(
        parts.map(part => [part.type, part.value])
    );

    return `${values.year}-${values.month}-${values.day}`;
}

function addStat(
    bot: string,
    player: string,
    field: 'wins' | 'losses'
): void {
    db.prepare(`
        INSERT INTO yae_duel_stats
        (bot, player, ${field})
        VALUES (?, ?, 1)
        ON CONFLICT(bot, player)
        DO UPDATE SET ${field} = ${field} + 1
    `).run(bot, player);
}

function completeGame(
    stored: Stored,
    game: Game,
    winnerIndex: PlayerIndex,
    reason: string,
    allowReward: boolean
): string | null {
    const winner = game.fighters[winnerIndex].jid;
    const loser = game.fighters[
        winnerIndex === 0 ? 1 : 0
    ].jid;

    const winnerUser = allowReward
        ? getUser(winner)
        : null;

    let paid = false;

    db.exec('SAVEPOINT yae_duel_finish');

    try {
        const deleted = db.prepare(`
            DELETE FROM yae_duel_games
            WHERE bot = ? AND chat = ?
            AND id = ? AND data = ?
        `).run(
            game.bot,
            game.chat,
            game.id,
            stored.raw
        );

        if (Number(deleted.changes) !== 1) {
            db.exec('ROLLBACK TO yae_duel_finish');
            db.exec('RELEASE yae_duel_finish');
            return null;
        }

        addStat(game.bot, winner, 'wins');
        addStat(game.bot, loser, 'losses');

        if (allowReward && winnerUser) {
            const day = getDay();

            const count = db.prepare(`
                SELECT COUNT(*) AS total
                FROM yae_duel_rewards
                WHERE bot = ? AND winner = ? AND day = ?
            `).get(
                game.bot,
                winner,
                day
            ) as { total: number };

            if (Number(count.total) < 3) {
                const inserted = db.prepare(`
                    INSERT OR IGNORE INTO yae_duel_rewards
                    (bot, winner, loser, day)
                    VALUES (?, ?, ?, ?)
                `).run(
                    game.bot,
                    winner,
                    loser,
                    day
                );

                if (Number(inserted.changes) === 1) {
                    const result = db.prepare(`
                        UPDATE users
                        SET yen = COALESCE(yen, 0) + ?
                        WHERE jid = ?
                    `).run(
                        WIN_REWARD,
                        winnerUser.jid
                    );

                    if (Number(result.changes) !== 1) {
                        throw new Error(
                            'No se pudo acreditar el premio.'
                        );
                    }

                    paid = true;
                }
            }
        }

        db.exec('RELEASE yae_duel_finish');
    } catch (error) {
        try {
            db.exec('ROLLBACK TO yae_duel_finish');
            db.exec('RELEASE yae_duel_finish');
        } catch {}

        throw error;
    }

    clearTimer(game);

    return `${renderGame(game)}

🏆 *¡COMBATE FINALIZADO!*

👑 Ganador: ${mention(winner)}
💔 Perdedor: ${mention(loser)}

🍥 Motivo: ${reason}

${paid
    ? `💰 Recompensa: +${WIN_REWARD} yenes`
    : '🌸 Sin recompensa de yenes'}

🍓 ¡Felicidades por la victoria!`;
}

async function sendInteractive(
    sock: any,
    msg: any,
    chat: string,
    body: string,
    buttonTitle: string,
    rows: any[],
    mentions: string[],
    fallback: string
) {
    try {
        return await sendInteractiveList(
            sock,
            chat,
            {
                title: '🍓 YAE DUELO RPG',
                description: body,
                footer: '𐴲੭  ˙ 𓂃  🍥  𓂃  ˙',
                buttonText: buttonTitle,
                mentions,
                sections: [
                    {
                        title: '⚔️ ACCIONES RPG',
                        rows
                    }
                ]
            },
            msg
        );
    } catch (error) {
        console.error('[DUEL INTERACTIVE ERROR]:', error);

        return sock.sendMessage(
            chat,
            {
                text: `${body}\n\n🍥 ${fallback}`,
                mentions
            },
            { quoted: msg }
        );
    }
}

async function sendTurn(
    sock: any,
    msg: any,
    game: Game,
    announcement = ''
) {
    const fighter = game.fighters[game.turn];

    const actions: Array<{
        action: Action;
        title: string;
        description: string;
    }> = [
        {
            action: 'atacar',
            title: '⚔️ Atacar',
            description: 'Daño de 12 a 20 HP'
        },
        {
            action: 'defender',
            title: '🛡️ Defender',
            description: 'Reduce el próximo daño recibido'
        },
        {
            action: 'curar',
            title: '💚 Curar',
            description: '15 MP, máximo 2 curaciones'
        },
        {
            action: 'habilidad',
            title: '🔮 Habilidad',
            description: '20 MP, daño de 25 a 35 HP'
        }
    ];

    const rows = actions
        .filter(item => {
            if (item.action === 'curar') {
                return fighter.mp >= 15 &&
                    fighter.heals > 0 &&
                    fighter.hp < MAX_HP;
            }

            if (item.action === 'habilidad') {
                return fighter.mp >= 20;
            }

            if (item.action === 'defender') {
                return !fighter.guard;
            }

            return true;
        })
        .map(item => ({
            title: item.title,
            description: item.description,
            id:
                `${getPrefix()}duelo accion ${game.id} ${game.version} ${item.action}`
        }));

    return sendInteractive(
        sock,
        msg,
        game.chat,
        `${announcement
            ? `${announcement}\n\n`
            : ''}${renderGame(game)}

🎮 *Turno de ${mention(fighter.jid)}*

⏳ Tienes 90 segundos para actuar.
🌸 Selecciona una habilidad.`,
        '⚔️ Elegir acción',
        rows,
        game.fighters.map(item => item.jid),
        `Escribe ${getPrefix()}duelo atacar`
    );
}

function schedule(
    sock: any,
    game: Game
): void {
    clearTimer(game);

    const delay = Math.max(
        0,
        game.expires - Date.now()
    );

    const timer = setTimeout(async () => {
        timers.delete(gameKey(game));

        const stored = getGame(
            game.bot,
            game.chat
        );

        if (!stored) return;

        const current = stored.game;

        if (
            current.id !== game.id ||
            current.version !== game.version ||
            current.expires > Date.now()
        ) {
            return;
        }

        try {
            if (current.status === 'pending') {
                if (!removeGame(stored)) return;

                await sock.sendMessage(current.chat, {
                    text: '🍥 El desafío RPG ha expirado.'
                });

                return;
            }

            const winner: PlayerIndex =
                current.turn === 0 ? 1 : 0;

            const result = completeGame(
                stored,
                current,
                winner,
                'Tiempo agotado',
                false
            );

            if (!result) return;

            await sock.sendMessage(current.chat, {
                text: result,
                mentions: current.fighters.map(
                    fighter => fighter.jid
                )
            });
        } catch (error) {
            console.error('[DUEL TIMER ERROR]:', error);
        }
    }, delay);

    timer.unref?.();
    timers.set(gameKey(game), timer);
}

async function expireIfNeeded(
    sock: any,
    stored: Stored | null
): Promise<void> {
    if (!stored) return;

    const game = stored.game;

    if (game.expires > Date.now()) {
        schedule(sock, game);
        return;
    }

    if (game.status === 'pending') {
        if (!removeGame(stored)) return;

        await sock.sendMessage(game.chat, {
            text: '🍥 El desafío anterior ha expirado.'
        });

        return;
    }

    const winner: PlayerIndex =
        game.turn === 0 ? 1 : 0;

    const result = completeGame(
        stored,
        game,
        winner,
        'Tiempo agotado',
        false
    );

    if (!result) return;

    await sock.sendMessage(game.chat, {
        text: result,
        mentions: game.fighters.map(
            fighter => fighter.jid
        )
    });
}

function findMention(msg: any): string | undefined {
    const mentions = [
        ...(Array.isArray(msg.mentionedJid)
            ? msg.mentionedJid
            : []),
        ...(Array.isArray(
            msg.message?.extendedTextMessage
                ?.contextInfo?.mentionedJid
        )
            ? msg.message.extendedTextMessage
                .contextInfo.mentionedJid
            : [])
    ];

    return mentions.find(
        (jid: unknown) =>
            typeof jid === 'string' &&
            jid.includes('@')
    );
}

function applyAction(
    game: Game,
    action: Action
): {
    announcement: string;
    winner: PlayerIndex | null;
} {
    const actorIndex = game.turn;
    const targetIndex: PlayerIndex =
        actorIndex === 0 ? 1 : 0;

    const actor = game.fighters[actorIndex];
    const target = game.fighters[targetIndex];

    let announcement = '';

    if (action === 'atacar' || action === 'habilidad') {
        let damage = action === 'atacar'
            ? randomInt(12, 21)
            : randomInt(25, 36);

        if (action === 'habilidad') {
            actor.mp -= 20;
        }

        const critical = randomInt(100) < 15;

        if (critical) {
            damage += 5;
        }

        const blocked = target.guard;

        if (blocked) {
            damage = Math.ceil(damage / 2);
            target.guard = false;
        }

        target.hp = Math.max(
            0,
            target.hp - damage
        );

        announcement = action === 'atacar'
            ? `⚔️ ${mention(actor.jid)} atacó e infligió *${damage} HP*.`
            : `🔮 ${mention(actor.jid)} lanzó magia e infligió *${damage} HP*.`;

        if (critical) {
            announcement += '\n🔥 ¡Golpe crítico!';
        }

        if (blocked) {
            announcement += '\n🛡️ El escudo redujo el daño.';
        }
    }

    if (action === 'defender') {
        actor.guard = true;
        actor.mp = Math.min(
            MAX_MP,
            actor.mp + 12
        );

        announcement =
            `🛡️ ${mention(actor.jid)} activó su escudo y recuperó maná.`;
    }

    if (action === 'curar') {
        const healing = randomInt(16, 26);
        const recovered = Math.min(
            MAX_HP - actor.hp,
            healing
        );

        actor.hp += recovered;
        actor.mp -= 15;
        actor.heals--;

        announcement =
            `💚 ${mention(actor.jid)} recuperó *${recovered} HP*.`;
    }

    actor.mp = Math.min(
        MAX_MP,
        actor.mp + 5
    );

    if (target.hp <= 0) {
        return {
            announcement,
            winner: actorIndex
        };
    }

    game.turn = targetIndex;
    game.version++;
    game.expires = Date.now() + TURN_TIME;

    return {
        announcement,
        winner: null
    };
}

export default async function (
    sock: any,
    msg: any,
    extra: any
) {
    const chat = msg.from || msg.key?.remoteJid;

    if (!chat) return;

    const sender = String(
        msg.sender ||
        msg.key?.participant ||
        chat
    );

    const bot = getBotId(sock);

    const args: string[] = Array.isArray(extra?.args)
        ? extra.args.map(String)
        : [];

    const action = String(
        args[0] || ''
    ).toLowerCase();

    if (action === 'perfil') {
        const stats = db.prepare(`
            SELECT wins, losses
            FROM yae_duel_stats
            WHERE bot = ? AND player = ?
        `).get(bot, sender) as
            | { wins: number; losses: number }
            | undefined;

        return msg.reply(`🍓 *YAE DUELO RPG*

👤 *TU PERFIL*

🏆 Victorias: ${stats?.wins || 0}
💔 Derrotas: ${stats?.losses || 0}`);
    }

    if (action === 'top') {
        const rows = db.prepare(`
            SELECT player, wins, losses
            FROM yae_duel_stats
            WHERE bot = ?
            ORDER BY wins DESC, losses ASC
            LIMIT 10
        `).all(bot) as Array<{
            player: string;
            wins: number;
            losses: number;
        }>;

        if (!rows.length) {
            return msg.reply(
                '🍥 Todavía no hay jugadores en el ranking.'
            );
        }

        return sock.sendMessage(
            chat,
            {
                text: `🍓 *TOP DUELOS RPG*

${rows.map((user, index) =>
    `${index + 1}. ${mention(user.player)} — ${user.wins} victorias`
).join('\n')}`,
                mentions: rows.map(user => user.player)
            },
            { quoted: msg }
        );
    }

    if (!isJidGroup(chat)) {
        return msg.reply(
            '🍥 Los duelos RPG se realizan en grupos.'
        );
    }

    await expireIfNeeded(
        sock,
        getGame(bot, chat)
    );

    const stored = getGame(bot, chat);
    const game = stored?.game;

    if (action === 'aceptar') {
        if (!stored || game?.status !== 'pending') {
            return msg.reply(
                '🍥 No hay desafíos pendientes.'
            );
        }

        if (args[1] && args[1] !== game.id) {
            return msg.reply(
                '🍥 Ese desafío ya no está disponible.'
            );
        }

        if (sender !== game.fighters[1].jid) {
            return msg.reply(
                '🍥 Solo el jugador retado puede aceptar.'
            );
        }

        game.status = 'active';
        game.version++;
        game.expires = Date.now() + TURN_TIME;

        if (!updateGame(stored, game)) {
            return msg.reply(
                '🍥 El desafío ya fue actualizado.'
            );
        }

        schedule(sock, game);

        return sendTurn(
            sock,
            msg,
            game,
            '🌸 ¡El desafío fue aceptado!'
        );
    }

    if (
        action === 'rechazar' ||
        action === 'cancelar'
    ) {
        if (!stored || game?.status !== 'pending') {
            return msg.reply(
                '🍥 No hay desafíos pendientes.'
            );
        }

        if (args[1] && args[1] !== game.id) {
            return msg.reply(
                '🍥 Ese desafío ya no está disponible.'
            );
        }

        if (
            !game.fighters.some(
                fighter => fighter.jid === sender
            )
        ) {
            return msg.reply(
                '🍥 No perteneces a este desafío.'
            );
        }

        if (!removeGame(stored)) {
            return msg.reply(
                '🍥 El desafío ya fue actualizado.'
            );
        }

        return msg.reply(
            '🍥 El desafío RPG fue cancelado.'
        );
    }

    if (action === 'rendirse') {
        if (!stored || game?.status !== 'active') {
            return msg.reply(
                '🍥 No hay una partida activa.'
            );
        }

        const index = game.fighters.findIndex(
            fighter => fighter.jid === sender
        );

        if (index < 0) {
            return msg.reply(
                '🍥 No participas en este duelo.'
            );
        }

        const winner: PlayerIndex =
            index === 0 ? 1 : 0;

        const result = completeGame(
            stored,
            game,
            winner,
            'Rendición',
            false
        );

        if (!result) {
            return msg.reply(
                '🍥 El combate ya fue actualizado.'
            );
        }

        return sock.sendMessage(
            chat,
            {
                text: result,
                mentions: game.fighters.map(
                    fighter => fighter.jid
                )
            },
            { quoted: msg }
        );
    }

    const possibleActions: Action[] = [
        'atacar',
        'defender',
        'curar',
        'habilidad'
    ];

    if (
        action === 'accion' ||
        possibleActions.includes(action as Action)
    ) {
        if (!stored || game?.status !== 'active') {
            return msg.reply(
                '🍥 No hay un duelo activo.'
            );
        }

        const fighter = game.fighters[game.turn];

        if (sender !== fighter.jid) {
            return msg.reply(
                '🍥 No es tu turno de jugar.'
            );
        }

        let selected: Action;

        if (action === 'accion') {
            if (
                args.length < 4 ||
                args[1] !== game.id ||
                Number(args[2]) !== game.version
            ) {
                return msg.reply(
                    '🍥 Ese botón pertenece a un turno anterior.'
                );
            }

            selected = String(
                args[3]
            ).toLowerCase() as Action;
        } else {
            selected = action as Action;
        }

        if (!possibleActions.includes(selected)) {
            return msg.reply(
                '🍥 Acción desconocida.'
            );
        }

        if (
            selected === 'curar' &&
            (
                fighter.mp < 15 ||
                fighter.heals <= 0 ||
                fighter.hp >= MAX_HP
            )
        ) {
            return msg.reply(
                '🍥 No puedes curarte ahora. Necesitas 15 MP, una curación disponible y tener vida por recuperar.'
            );
        }

        if (
            selected === 'habilidad' &&
            fighter.mp < 20
        ) {
            return msg.reply(
                '🍥 Necesitas al menos 20 MP para utilizar magia.'
            );
        }

        if (
            selected === 'defender' &&
            fighter.guard
        ) {
            return msg.reply(
                '🍥 Ya tienes un escudo activo.'
            );
        }

        const result = applyAction(
            game,
            selected
        );

        if (result.winner !== null) {
            const text = completeGame(
                stored,
                game,
                result.winner,
                'Puntos de vida agotados',
                true
            );

            if (!text) {
                return msg.reply(
                    '🍥 El combate ya fue actualizado.'
                );
            }

            return sock.sendMessage(
                chat,
                {
                    text:
                        `${result.announcement}\n\n${text}`,
                    mentions: game.fighters.map(
                        fighter => fighter.jid
                    )
                },
                { quoted: msg }
            );
        }

        if (!updateGame(stored, game)) {
            return msg.reply(
                '🍥 El combate ya fue actualizado.'
            );
        }

        schedule(sock, game);

        return sendTurn(
            sock,
            msg,
            game,
            result.announcement
        );
    }

    const target = findMention(msg);

    if (target) {
        if (game) {
            return msg.reply(
                '🍥 Ya existe un duelo o desafío en este grupo.'
            );
        }

        if (target === sender) {
            return msg.reply(
                '🍥 No puedes retarte a ti mismo.'
            );
        }

        if (
            target === bot ||
            target === sock.user?.lid
        ) {
            return msg.reply(
                '🍥 No puedes retar al propio bot.'
            );
        }

        const newGame: Game = {
            id: randomUUID(),
            bot,
            chat,
            fighters: [
                createFighter(sender),
                createFighter(target)
            ],
            turn: 0,
            version: 0,
            status: 'pending',
            expires: Date.now() + INVITE_TIME
        };

        if (!createGame(newGame)) {
            return msg.reply(
                '🍥 Ya existe un desafío en este grupo.'
            );
        }

        schedule(sock, newGame);

        return sendInteractive(
            sock,
            msg,
            chat,
            `🍓 *YAE DUELO RPG*

⚔️ ${mention(sender)} ha desafiado a:

🪷 ${mention(target)}

❤️ Vida inicial: 100 HP
🔮 Maná inicial: 30 MP

🎮 Acciones disponibles:
⚔️ Atacar
🛡️ Defender
💚 Curar
🔮 Habilidad especial

🏆 Premio: ${WIN_REWARD} yenes

⏳ Tienes 2 minutos para aceptar.`,
            '⚔️ Responder desafío',
            [
                {
                    title: '🍓 Aceptar',
                    description: 'Comenzar el combate',
                    id:
                        `${getPrefix()}duelo aceptar ${newGame.id}`
                },
                {
                    title: '🍥 Rechazar',
                    description: 'Cancelar desafío',
                    id:
                        `${getPrefix()}duelo rechazar ${newGame.id}`
                }
            ],
            [sender, target],
            `Escribe ${getPrefix()}duelo aceptar`
        );
    }

    if (game) {
        if (game.status === 'active') {
            return sendTurn(
                sock,
                msg,
                game
            );
        }

        return msg.reply(
            '🍥 Hay un desafío pendiente en este grupo.'
        );
    }

    return msg.reply(`🍓 *YAE DUELO RPG*

⚔️ ¡Desafía a otros usuarios y demuestra tu poder!

🪷 *COMANDOS*

${getPrefix()}duelo @usuario
${getPrefix()}duelo aceptar
${getPrefix()}duelo rechazar
${getPrefix()}duelo atacar
${getPrefix()}duelo defender
${getPrefix()}duelo curar
${getPrefix()}duelo habilidad
${getPrefix()}duelo rendirse
${getPrefix()}duelo perfil
${getPrefix()}duelo top

❤️ Vida máxima: 100 HP
🔮 Maná máximo: 40 MP
🧪 Dos curaciones por partida
⏳ 90 segundos por turno

🏆 Victoria: ${WIN_REWARD} yenes
🍥 Máximo 3 premios diarios.
🌸 Un premio por rival al día.

🎮 También puedes jugar utilizando los botones interactivos.`);
}
