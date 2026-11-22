
import {
    proto,
    type BinaryNode,
    isJidGroup,
    generateWAMessageFromContent
} from '@whiskeysockets/baileys';

import { randomUUID } from 'node:crypto';
import { db, getUser } from '#db';

export const command = ['tres', 'ttt', 'tictactoe'];
export const category = 'diversion';
export const description = 'Juega tres en raya contra otro usuario.';
export const needsGroupMetadata = false;

type Mark = 'X' | 'O';
type Status = 'pending' | 'active';

type Game = {
    bot: string;
    chat: string;
    id: string;
    x: string;
    o: string;
    board: string;
    turn: Mark;
    version: number;
    status: Status;
    expires_at: number;
};

const INVITE_TIME = 120000;
const TURN_TIME = 60000;

const WIN_LINES = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

const timers = new Map<string, ReturnType<typeof setTimeout>>();

db.exec(`
    CREATE TABLE IF NOT EXISTS yae_tres_games (
        bot TEXT NOT NULL,
        chat TEXT NOT NULL,
        id TEXT NOT NULL,
        x TEXT NOT NULL,
        o TEXT NOT NULL,
        board TEXT NOT NULL,
        turn TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        PRIMARY KEY (bot, chat)
    );

    CREATE TABLE IF NOT EXISTS yae_tres_stats (
        bot TEXT NOT NULL,
        player TEXT NOT NULL,
        wins INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0,
        draws INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (bot, player)
    );

    CREATE TABLE IF NOT EXISTS yae_tres_rewards (
        bot TEXT NOT NULL,
        player TEXT NOT NULL,
        day TEXT NOT NULL,
        rewarded INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (bot, player, day)
    );
`);

function getPrefix(): string {
    const value = global.prefix;

    if (Array.isArray(value)) {
        return value.find((v: string) => v.length > 0) || '.';
    }

    return typeof value === 'string' && value
        ? value
        : '.';
}

function getBotId(sock: any): string {
    return String(sock.user?.id || 'main')
        .replace(/:\d+(?=@)/, '');
}

function getGame(bot: string, chat: string): Game | undefined {
    return db.prepare(`
        SELECT * FROM yae_tres_games
        WHERE bot = ? AND chat = ?
    `).get(bot, chat) as Game | undefined;
}

function saveGame(game: Game): void {
    db.prepare(`
        INSERT INTO yae_tres_games (
            bot, chat, id, x, o, board,
            turn, version, status, expires_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(bot, chat) DO UPDATE SET
            id = excluded.id,
            x = excluded.x,
            o = excluded.o,
            board = excluded.board,
            turn = excluded.turn,
            version = excluded.version,
            status = excluded.status,
            expires_at = excluded.expires_at
    `).run(
        game.bot,
        game.chat,
        game.id,
        game.x,
        game.o,
        game.board,
        game.turn,
        game.version,
        game.status,
        game.expires_at
    );
}

function timerKey(game: Game): string {
    return `${game.bot}|${game.chat}`;
}

function deleteGame(game: Game): void {
    const key = timerKey(game);
    const timer = timers.get(key);

    if (timer) clearTimeout(timer);
    timers.delete(key);

    db.prepare(`
        DELETE FROM yae_tres_games
        WHERE bot = ? AND chat = ? AND id = ?
    `).run(game.bot, game.chat, game.id);
}

function addStat(
    bot: string,
    player: string,
    field: 'wins' | 'losses' | 'draws'
): void {
    db.prepare(`
        INSERT INTO yae_tres_stats (bot, player, ${field})
        VALUES (?, ?, 1)
        ON CONFLICT(bot, player) DO UPDATE SET
            ${field} = ${field} + 1
    `).run(bot, player);
}

function giveYen(
    bot: string,
    player: string,
    amount: number
): boolean {
    const day = new Date().toISOString().slice(0, 10);

    const daily = db.prepare(`
        SELECT rewarded FROM yae_tres_rewards
        WHERE bot = ? AND player = ? AND day = ?
    `).get(bot, player, day) as
        | { rewarded: number }
        | undefined;

    if ((daily?.rewarded || 0) >= 5) return false;

    try {
        getUser(player);

        const result = db.prepare(`
            UPDATE users
            SET yen = COALESCE(yen, 0) + ?
            WHERE jid = ?
        `).run(amount, player);

        if (Number(result.changes) === 0) return false;

        db.prepare(`
            INSERT INTO yae_tres_rewards (
                bot, player, day, rewarded
            )
            VALUES (?, ?, ?, 1)
            ON CONFLICT(bot, player, day) DO UPDATE SET
                rewarded = rewarded + 1
        `).run(bot, player, day);

        return true;
    } catch (error) {
        console.error('[TRES REWARD ERROR]:', error);
        return false;
    }
}

function finishGame(
    game: Game,
    winner: Mark | null,
    reason = ''
): string {
    deleteGame(game);

    if (!winner) {
        addStat(game.bot, game.x, 'draws');
        addStat(game.bot, game.o, 'draws');

        const rewardX = giveYen(game.bot, game.x, 25);
        const rewardO = giveYen(game.bot, game.o, 25);

        return `🍓 *YAE TRES EN RAYA*

🤝 ¡La partida terminó en empate!

❌ @${game.x.split('@')[0]}
⭕ @${game.o.split('@')[0]}

💰 Recompensas:
${rewardX ? '❌ +25 yenes' : '❌ Sin recompensa'}
${rewardO ? '⭕ +25 yenes' : '⭕ Sin recompensa'}

🌸 ¡Bien jugado!`;
    }

    const winnerJid = winner === 'X' ? game.x : game.o;
    const loserJid = winner === 'X' ? game.o : game.x;

    addStat(game.bot, winnerJid, 'wins');
    addStat(game.bot, loserJid, 'losses');

    const rewarded = giveYen(game.bot, winnerJid, 100);

    return `🍓 *YAE TRES EN RAYA*

🏆 ¡Tenemos un ganador!

👑 @${winnerJid.split('@')[0]}
💔 @${loserJid.split('@')[0]}

${reason ? `🍥 Motivo: ${reason}\n` : ''}
${rewarded ? '💰 Premio: +100 yenes' : '🍥 Límite diario de recompensas alcanzado.'}

🌸 ¡Felicidades!`;
}

function getWinner(board: string): Mark | null {
    for (const [a, b, c] of WIN_LINES) {
        const value = board[a];

        if (
            value !== '-' &&
            value === board[b] &&
            value === board[c]
        ) {
            return value as Mark;
        }
    }

    return null;
}

function renderBoard(board: string): string {
    const cells = board.split('').map((cell, index) => {
        if (cell === 'X') return '❌';
        if (cell === 'O') return '⭕';
        return `${index + 1}️⃣`;
    });

    return ` ${cells[0]} │ ${cells[1]} │ ${cells[2]}
 ───┼───┼───
 ${cells[3]} │ ${cells[4]} │ ${cells[5]}
 ───┼───┼───
 ${cells[6]} │ ${cells[7]} │ ${cells[8]}`;
}

function gameText(game: Game): string {
    const current = game.turn === 'X' ? game.x : game.o;

    return `🍓 *YAE TRES EN RAYA*

❌ @${game.x.split('@')[0]}
⭕ @${game.o.split('@')[0]}

${renderBoard(game.board)}

🎮 Turno de: @${current.split('@')[0]}
🌸 Ficha: ${game.turn === 'X' ? '❌' : '⭕'}

⏳ Tienes 60 segundos para jugar.`;
}

async function sendInteractive(
    sock: any,
    msg: any,
    chat: string,
    text: string,
    title: string,
    rows: any[],
    mentions: string[],
    fallback: string
) {
    const prefix = getPrefix();

    try {
        const header =
            proto.Message.InteractiveMessage.Header.create({
                title: '🍓 YAE TRES EN RAYA',
                hasMediaAttachment: false
            });

        const interactiveMessage =
            proto.Message.InteractiveMessage.create({
                header,

                body:
                    proto.Message.InteractiveMessage.Body.create({
                        text
                    }),

                footer:
                    proto.Message.InteractiveMessage.Footer.create({
                        text: '𐴲੭  ˙ 𓂃  🍥  𓂃  ˙'
                    }),

                nativeFlowMessage:
                    proto.Message.InteractiveMessage.NativeFlowMessage.create({
                        messageVersion: 1,
                        messageParamsJson: '{}',
                        buttons: [
                            {
                                name: 'single_select',
                                buttonParamsJson: JSON.stringify({
                                    title,
                                    sections: [
                                        {
                                            title: '🍓 OPCIONES',
                                            rows
                                        }
                                    ]
                                })
                            }
                        ]
                    }),

                contextInfo: {
                    mentionedJid: mentions
                }
            });

        const message = generateWAMessageFromContent(
            chat,
            {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadata: {},
                            deviceListMetadataVersion: 2
                        },
                        interactiveMessage
                    }
                }
            },
            {
                userJid: sock.user?.id || '',
                quoted: msg
            }
        );

        if (!message.message || !message.key.id) {
            throw new Error('Mensaje interactivo inválido.');
        }

        const additionalNodes: BinaryNode[] = [
            {
                tag: 'biz',
                attrs: {},
                content: [
                    {
                        tag: 'interactive',
                        attrs: {
                            type: 'native_flow',
                            v: '1'
                        },
                        content: [
                            {
                                tag: 'native_flow',
                                attrs: {
                                    name: 'mixed',
                                    v: '9'
                                }
                            }
                        ]
                    }
                ]
            }
        ];

        if (!isJidGroup(chat)) {
            additionalNodes.unshift({
                tag: 'bot',
                attrs: {
                    biz_bot: '1'
                }
            });
        }

        return await sock.relayMessage(
            chat,
            message.message,
            {
                messageId: message.key.id,
                additionalNodes
            }
        );
    } catch (error) {
        console.error('[TRES INTERACTIVE ERROR]:', error);

        return sock.sendMessage(
            chat,
            {
                text: `${text}\n\n🍥 ${fallback}`,
                mentions
            },
            { quoted: msg }
        );
    }
}

async function sendBoard(
    sock: any,
    msg: any,
    game: Game
) {
    const prefix = getPrefix();

    const rows = game.board
        .split('')
        .map((value, index) => ({
            value,
            index
        }))
        .filter(item => item.value === '-')
        .map(item => ({
            title: `Casilla ${item.index + 1}`,
            description:
                `Marcar ${game.turn === 'X' ? '❌' : '⭕'}`,
            id:
                `${prefix}tres mover ${game.id} ${game.version} ${item.index + 1}`
        }));

    return sendInteractive(
        sock,
        msg,
        game.chat,
        gameText(game),
        '🎮 Elegir casilla',
        rows,
        [game.x, game.o],
        `También puedes escribir ${prefix}tres mover 5`
    );
}

function scheduleGame(sock: any, game: Game): void {
    const key = timerKey(game);
    const previous = timers.get(key);

    if (previous) clearTimeout(previous);

    const delay = Math.max(
        0,
        game.expires_at - Date.now()
    );

    const timer = setTimeout(async () => {
        timers.delete(key);

        const current = getGame(game.bot, game.chat);

        if (
            !current ||
            current.id !== game.id ||
            current.version !== game.version ||
            current.expires_at > Date.now()
        ) {
            return;
        }

        try {
            if (current.status === 'pending') {
                deleteGame(current);

                await sock.sendMessage(current.chat, {
                    text: '🍥 El desafío de Tres en Raya expiró.'
                });

                return;
            }

            const winner: Mark =
                current.turn === 'X' ? 'O' : 'X';

            const result = finishGame(
                current,
                winner,
                'Tiempo agotado'
            );

            await sock.sendMessage(current.chat, {
                text: `${renderBoard(current.board)}\n\n${result}`,
                mentions: [current.x, current.o]
            });
        } catch (error) {
            console.error('[TRES TIMER ERROR]:', error);
        }
    }, delay);

    timer.unref?.();
    timers.set(key, timer);
}

async function checkExpired(
    sock: any,
    bot: string,
    chat: string
): Promise<boolean> {
    const game = getGame(bot, chat);

    if (!game) return false;

    if (game.expires_at > Date.now()) {
        scheduleGame(sock, game);
        return false;
    }

    if (game.status === 'pending') {
        deleteGame(game);

        await sock.sendMessage(chat, {
            text: '🍥 El desafío anterior ha expirado.'
        });

        return true;
    }

    const winner: Mark =
        game.turn === 'X' ? 'O' : 'X';

    const result = finishGame(
        game,
        winner,
        'Tiempo agotado'
    );

    await sock.sendMessage(chat, {
        text: `${renderBoard(game.board)}\n\n${result}`,
        mentions: [game.x, game.o]
    });

    return true;
}

function findMention(msg: any, extra: any): string | undefined {
    const mentions = [
        ...(Array.isArray(msg.mentionedJid)
            ? msg.mentionedJid
            : []),
        ...(Array.isArray(extra?.mentions)
            ? extra.mentions
            : []),
        ...(Array.isArray(
            msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
        )
            ? msg.message.extendedTextMessage.contextInfo.mentionedJid
            : []),
        ...(Array.isArray(msg.msg?.contextInfo?.mentionedJid)
            ? msg.msg.contextInfo.mentionedJid
            : [])
    ];

    return mentions.find(
        (jid: unknown) =>
            typeof jid === 'string' && jid.includes('@')
    );
}

export default async function (
    sock: any,
    msg: any,
    extra: any
) {
    const chat = msg.key?.remoteJid || msg.from;

    if (!chat) return;

    const sender = String(
        msg.sender ||
        msg.key?.participant ||
        msg.participant ||
        chat
    );

    const bot = getBotId(sock);
    const prefix = getPrefix();

    const args: string[] = Array.isArray(extra?.args)
        ? extra.args.map(String)
        : [];

    const action = String(args[0] || '').toLowerCase();

    if (action === 'perfil') {
        const stats = db.prepare(`
            SELECT wins, losses, draws
            FROM yae_tres_stats
            WHERE bot = ? AND player = ?
        `).get(bot, sender) as
            | {
                wins: number;
                losses: number;
                draws: number;
            }
            | undefined;

        return msg.reply(`🍓 *YAE TRES EN RAYA*

👤 Tu perfil

🏆 Victorias: ${stats?.wins || 0}
💔 Derrotas: ${stats?.losses || 0}
🤝 Empates: ${stats?.draws || 0}`);
    }

    if (action === 'top') {
        const stats = db.prepare(`
            SELECT player, wins, losses, draws
            FROM yae_tres_stats
            WHERE bot = ?
            ORDER BY wins DESC, draws DESC
            LIMIT 10
        `).all(bot) as Array<{
            player: string;
            wins: number;
            losses: number;
            draws: number;
        }>;

        if (!stats.length) {
            return msg.reply(
                '🍥 Todavía no hay jugadores en el ranking.'
            );
        }

        const lines = stats.map((user, index) =>
            `${index + 1}. @${user.player.split('@')[0]} — ${user.wins} victorias`
        );

        return sock.sendMessage(
            chat,
            {
                text: `🍓 *TOP TRES EN RAYA*\n\n${lines.join('\n')}`,
                mentions: stats.map(user => user.player)
            },
            { quoted: msg }
        );
    }

    const expired = await checkExpired(sock, bot, chat);
    const game = getGame(bot, chat);

    if (action === 'aceptar') {
        if (!game || game.status !== 'pending') {
            return msg.reply(
                '🍥 No hay ningún desafío pendiente.'
            );
        }

        if (args[1] && args[1] !== game.id) {
            return msg.reply(
                '🍥 Ese desafío ya no está disponible.'
            );
        }

        if (sender !== game.o) {
            return msg.reply(
                '🍥 Solo el usuario retado puede aceptar.'
            );
        }

        game.status = 'active';
        game.expires_at = Date.now() + TURN_TIME;
        game.version = 0;

        saveGame(game);
        scheduleGame(sock, game);

        return sendBoard(sock, msg, game);
    }

    if (action === 'rechazar' || action === 'cancelar') {
        if (!game || game.status !== 'pending') {
            return msg.reply(
                '🍥 No hay desafíos pendientes.'
            );
        }

        if (args[1] && args[1] !== game.id) {
            return msg.reply(
                '🍥 Ese desafío ya no está disponible.'
            );
        }

        if (sender !== game.x && sender !== game.o) {
            return msg.reply(
                '🍥 No perteneces a este desafío.'
            );
        }

        deleteGame(game);

        return msg.reply(
            '🍥 El desafío fue cancelado.'
        );
    }

    if (action === 'rendirse') {
        if (!game || game.status !== 'active') {
            return msg.reply(
                '🍥 No tienes una partida activa.'
            );
        }

        if (sender !== game.x && sender !== game.o) {
            return msg.reply(
                '🍥 No participas en esta partida.'
            );
        }

        const winner: Mark =
            sender === game.x ? 'O' : 'X';

        const result = finishGame(
            game,
            winner,
            'Rendición'
        );

        return sock.sendMessage(
            chat,
            {
                text: `${renderBoard(game.board)}\n\n${result}`,
                mentions: [game.x, game.o]
            },
            { quoted: msg }
        );
    }

    if (action === 'mover') {
        if (!game || game.status !== 'active') {
            return msg.reply(
                '🍥 No hay ninguna partida activa.'
            );
        }

        const currentPlayer =
            game.turn === 'X' ? game.x : game.o;

        if (sender !== currentPlayer) {
            return msg.reply(
                '🍥 No es tu turno de jugar.'
            );
        }

        let position: number;
        let requestedId = '';
        let requestedVersion = -1;

        if (args.length >= 4) {
            requestedId = args[1];
            requestedVersion = Number(args[2]);
            position = Number(args[3]);
        } else {
            position = Number(args[1]);
        }

        if (
            requestedId &&
            (
                requestedId !== game.id ||
                requestedVersion !== game.version
            )
        ) {
            return msg.reply(
                '🍥 Ese botón pertenece a un turno anterior.'
            );
        }

        if (
            !Number.isInteger(position) ||
            position < 1 ||
            position > 9
        ) {
            return msg.reply(
                '🍥 Selecciona una casilla del 1 al 9.'
            );
        }

        const index = position - 1;

        if (game.board[index] !== '-') {
            return msg.reply(
                '🍥 Esa casilla ya está ocupada.'
            );
        }

        const cells = game.board.split('');
        cells[index] = game.turn;
        game.board = cells.join('');

        const winner = getWinner(game.board);

        if (winner) {
            const result = finishGame(game, winner);

            return sock.sendMessage(
                chat,
                {
                    text: `${renderBoard(game.board)}\n\n${result}`,
                    mentions: [game.x, game.o]
                },
                { quoted: msg }
            );
        }

        if (!game.board.includes('-')) {
            const result = finishGame(game, null);

            return sock.sendMessage(
                chat,
                {
                    text: `${renderBoard(game.board)}\n\n${result}`,
                    mentions: [game.x, game.o]
                },
                { quoted: msg }
            );
        }

        game.turn = game.turn === 'X' ? 'O' : 'X';
        game.version++;
        game.expires_at = Date.now() + TURN_TIME;

        saveGame(game);
        scheduleGame(sock, game);

        return sendBoard(sock, msg, game);
    }

    const target = findMention(msg, extra);

    if (target) {
        if (!isJidGroup(chat)) {
            return msg.reply(
                '🍥 Los desafíos entre jugadores deben iniciarse en un grupo.'
            );
        }

        if (game) {
            return msg.reply(
                '🍥 Ya hay una partida o desafío en este grupo.'
            );
        }

        if (target === sender) {
            return msg.reply(
                '🍥 No puedes retarte a ti mismo.'
            );
        }

        if (target === bot) {
            return msg.reply(
                '🍥 El modo contra Yae estará disponible próximamente.'
            );
        }

        const newGame: Game = {
            bot,
            chat,
            id: randomUUID(),
            x: sender,
            o: target,
            board: '---------',
            turn: 'X',
            version: 0,
            status: 'pending',
            expires_at: Date.now() + INVITE_TIME
        };

        saveGame(newGame);
        scheduleGame(sock, newGame);

        return sendInteractive(
            sock,
            msg,
            chat,
            `🍓 *YAE TRES EN RAYA*

❌ @${sender.split('@')[0]} ha retado a:

⭕ @${target.split('@')[0]}

🎮 ¿Aceptas el desafío?

⏳ Tienes 2 minutos para responder.`,
            '🌸 Responder desafío',
            [
                {
                    title: '🍓 Aceptar',
                    description: 'Comenzar la partida',
                    id: `${prefix}tres aceptar ${newGame.id}`
                },
                {
                    title: '🍥 Rechazar',
                    description: 'Cancelar el desafío',
                    id: `${prefix}tres rechazar ${newGame.id}`
                }
            ],
            [sender, target],
            `Usa ${prefix}tres aceptar o ${prefix}tres rechazar`
        );
    }

    if (expired) return;

    if (game) {
        if (game.status === 'active') {
            return sendBoard(sock, msg, game);
        }

        return msg.reply(
            '🍥 Hay un desafío pendiente en este grupo.'
        );
    }

    return msg.reply(`🍓 *YAE TRES EN RAYA*

🌸 Desafía a otro usuario y consigue yenes.

🎮 *COMANDOS*

${prefix}tres @usuario
${prefix}tres aceptar
${prefix}tres rechazar
${prefix}tres mover 5
${prefix}tres rendirse
${prefix}tres perfil
${prefix}tres top

🏆 Victoria: 100 yenes
🤝 Empate: 25 yenes
⏳ Tiempo por turno: 60 segundos

🍥 Máximo 5 recompensas diarias por jugador.`);
}
