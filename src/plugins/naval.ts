
import {
    proto,
    type BinaryNode,
    isJidGroup,
    generateWAMessageFromContent
} from '@whiskeysockets/baileys';

import { randomInt, randomUUID } from 'node:crypto';
import { db, getUser } from '#db';

export const command = ['naval', 'batallanaval', 'barcos'];
export const category = 'diversion';
export const description = 'Batalla naval interactiva entre dos jugadores.';
export const needsGroupMetadata = false;

type Player = 0 | 1;
type Status = 'pending' | 'active';

type Fleet = {
    ships: number[][];
    shots: number[];
};

type Game = {
    id: string;
    bot: string;
    chat: string;
    players: [string, string];
    fleets: [Fleet, Fleet];
    turn: Player;
    version: number;
    status: Status;
    expires: number;
};

type StoredGame = {
    game: Game;
    raw: string;
};

const SIZE = 5;
const LETTERS = 'ABCDE';
const SHIP_SIZES = [3, 2, 2];
const INVITE_TIME = 120000;
const TURN_TIME = 90000;
const WIN_REWARD = 150;

const timers = new Map<
    string,
    ReturnType<typeof setTimeout>
>();

db.exec(`
    CREATE TABLE IF NOT EXISTS yae_naval_games (
        bot TEXT NOT NULL,
        chat TEXT NOT NULL,
        id TEXT NOT NULL,
        data TEXT NOT NULL,
        PRIMARY KEY (bot, chat)
    );

    CREATE TABLE IF NOT EXISTS yae_naval_stats (
        bot TEXT NOT NULL,
        player TEXT NOT NULL,
        wins INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (bot, player)
    );

    CREATE TABLE IF NOT EXISTS yae_naval_rewards (
        bot TEXT NOT NULL,
        winner TEXT NOT NULL,
        loser TEXT NOT NULL,
        day TEXT NOT NULL,
        PRIMARY KEY (bot, winner, loser, day)
    );
`);

function prefix(): string {
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

function botId(sock: any): string {
    return String(sock.user?.id || 'main')
        .replace(/:\d+(?=@)/, '');
}

function tag(jid: string): string {
    return `@${jid.split('@')[0]}`;
}

function keyOf(game: Game): string {
    return `${game.bot}|${game.chat}`;
}

function readGame(
    bot: string,
    chat: string
): StoredGame | null {
    const row = db.prepare(`
        SELECT data
        FROM yae_naval_games
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
        INSERT OR IGNORE INTO yae_naval_games
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
    stored: StoredGame,
    game: Game
): boolean {
    const result = db.prepare(`
        UPDATE yae_naval_games
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

function removeGame(stored: StoredGame): boolean {
    const game = stored.game;

    const result = db.prepare(`
        DELETE FROM yae_naval_games
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

    const key = keyOf(game);
    const timer = timers.get(key);

    if (timer) clearTimeout(timer);
    timers.delete(key);

    return true;
}

function createFleet(): Fleet {
    const ships: number[][] = [];
    const occupied = new Set<number>();

    for (const length of SHIP_SIZES) {
        let placed = false;

        for (let attempt = 0; attempt < 500; attempt++) {
            const horizontal = randomInt(2) === 0;

            const row = randomInt(
                horizontal ? SIZE : SIZE - length + 1
            );

            const col = randomInt(
                horizontal ? SIZE - length + 1 : SIZE
            );

            const cells = Array.from(
                { length },
                (_, index) =>
                    horizontal
                        ? row * SIZE + col + index
                        : (row + index) * SIZE + col
            );

            if (cells.some(cell => occupied.has(cell))) {
                continue;
            }

            for (const cell of cells) {
                occupied.add(cell);
            }

            ships.push(cells);
            placed = true;
            break;
        }

        if (!placed) {
            throw new Error(
                'No se pudo generar la flota.'
            );
        }
    }

    return {
        ships,
        shots: []
    };
}

function shipCells(fleet: Fleet): Set<number> {
    return new Set(fleet.ships.flat());
}

function renderGrid(
    fleet: Fleet,
    reveal = false
): string {
    const occupied = shipCells(fleet);
    const attacked = new Set(fleet.shots);

    const lines = [
        '     A   B   C   D   E'
    ];

    for (let row = 0; row < SIZE; row++) {
        const cells: string[] = [];

        for (let col = 0; col < SIZE; col++) {
            const index = row * SIZE + col;
            const hasShip = occupied.has(index);
            const hit = attacked.has(index);

            if (hit && hasShip) {
                cells.push('💥');
            } else if (hit) {
                cells.push('💦');
            } else if (reveal && hasShip) {
                cells.push('🚢');
            } else {
                cells.push('🌊');
            }
        }

        lines.push(
            `${row + 1}  ${cells.join(' ')}`
        );
    }

    return lines.join('\n');
}

function remainingShips(fleet: Fleet): number {
    const shots = new Set(fleet.shots);

    return fleet.ships.filter(
        ship => !ship.every(cell => shots.has(cell))
    ).length;
}

function allSunk(fleet: Fleet): boolean {
    return remainingShips(fleet) === 0;
}

function renderGame(
    game: Game,
    reveal = false
): string {
    const [first, second] = game.players;

    return `🍓 *YAE BATALLA NAVAL*

🚢 *${tag(first)}*
${renderGrid(game.fleets[1], reveal)}

🚢 *${tag(second)}*
${renderGrid(game.fleets[0], reveal)}

🌊 Sin explorar
💦 Agua
💥 Impacto
${reveal ? '🚢 Barco revelado\n' : ''}
🛡️ Barcos restantes:
${tag(first)}: ${remainingShips(game.fleets[0])}
${tag(second)}: ${remainingShips(game.fleets[1])}`;
}

function parseCoordinate(value: string): number {
    const match = /^([A-E])([1-5])$/i.exec(
        value.trim()
    );

    if (!match) return -1;

    const col = LETTERS.indexOf(
        match[1].toUpperCase()
    );

    const row = Number(match[2]) - 1;

    return row * SIZE + col;
}

function formatCoordinate(index: number): string {
    return `${LETTERS[index % SIZE]}${Math.floor(index / SIZE) + 1}`;
}

function addStat(
    bot: string,
    player: string,
    field: 'wins' | 'losses'
): void {
    db.prepare(`
        INSERT INTO yae_naval_stats
        (bot, player, ${field})
        VALUES (?, ?, 1)
        ON CONFLICT(bot, player)
        DO UPDATE SET ${field} = ${field} + 1
    `).run(bot, player);
}

function giveReward(
    game: Game,
    winner: string,
    loser: string
): boolean {
    const day = new Date(
        Date.now() - 5 * 60 * 60 * 1000
    ).toISOString().slice(0, 10);

    try {
        const user = getUser(winner);

        db.exec('SAVEPOINT naval_reward');

        const count = db.prepare(`
            SELECT COUNT(*) AS total
            FROM yae_naval_rewards
            WHERE bot = ? AND winner = ? AND day = ?
        `).get(
            game.bot,
            winner,
            day
        ) as { total: number };

        if (Number(count.total) >= 3) {
            db.exec('RELEASE naval_reward');
            return false;
        }

        const inserted = db.prepare(`
            INSERT OR IGNORE INTO yae_naval_rewards
            (bot, winner, loser, day)
            VALUES (?, ?, ?, ?)
        `).run(
            game.bot,
            winner,
            loser,
            day
        );

        if (Number(inserted.changes) !== 1) {
            db.exec('RELEASE naval_reward');
            return false;
        }

        const paid = db.prepare(`
            UPDATE users
            SET yen = COALESCE(yen, 0) + ?
            WHERE jid = ?
        `).run(WIN_REWARD, user.jid);

        if (Number(paid.changes) !== 1) {
            throw new Error(
                'No se pudo acreditar la recompensa.'
            );
        }

        db.exec('RELEASE naval_reward');
        return true;
    } catch (error) {
        try {
            db.exec('ROLLBACK TO naval_reward');
            db.exec('RELEASE naval_reward');
        } catch {}

        console.error('[NAVAL REWARD ERROR]:', error);
        return false;
    }
}

function finishGame(
    stored: StoredGame,
    winnerIndex: Player,
    reason: string,
    reward: boolean
): string | null {
    const game = stored.game;

    if (!removeGame(stored)) return null;

    const winner = game.players[winnerIndex];
    const loser = game.players[
        winnerIndex === 0 ? 1 : 0
    ];

    addStat(game.bot, winner, 'wins');
    addStat(game.bot, loser, 'losses');

    const paid = reward
        ? giveReward(game, winner, loser)
        : false;

    return `${renderGame(game, true)}

🏆 *¡BATALLA TERMINADA!*

👑 Ganador: ${tag(winner)}
💔 Perdedor: ${tag(loser)}

🍥 Motivo: ${reason}

${paid
    ? `💰 Premio: +${WIN_REWARD} yenes`
    : '🌸 Sin recompensa de yenes'}

🍓 ¡Felicidades por tu victoria!`;
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
        const interactiveMessage =
            proto.Message.InteractiveMessage.create({
                header:
                    proto.Message.InteractiveMessage.Header.create({
                        title: '🍓 YAE BATALLA NAVAL',
                        hasMediaAttachment: false
                    }),

                body:
                    proto.Message.InteractiveMessage.Body.create({
                        text: body
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
                                    title: buttonTitle,
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
            throw new Error(
                'No se pudo crear el mensaje interactivo.'
            );
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
        console.error('[NAVAL INTERACTIVE ERROR]:', error);

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
    const targetIndex: Player =
        game.turn === 0 ? 1 : 0;

    const target = game.fleets[targetIndex];
    const shots = new Set(target.shots);

    const rows = Array.from(
        { length: SIZE },
        (_, index) => index + 1
    )
        .filter(row =>
            LETTERS.split('').some(
                (_, col) =>
                    !shots.has((row - 1) * SIZE + col)
            )
        )
        .map(row => ({
            title: `Fila ${row}`,
            description: `Atacar la fila ${row}`,
            id:
                `${prefix()}naval fila ${game.id} ${game.version} ${row}`
        }));

    const body = `${announcement
        ? `${announcement}\n\n`
        : ''}${renderGame(game)}

🎮 *Turno de ${tag(game.players[game.turn])}*

🎯 Primero selecciona una fila.
⏳ Tiempo disponible: 90 segundos.`;

    return sendInteractive(
        sock,
        msg,
        game.chat,
        body,
        '🎯 Elegir fila',
        rows,
        game.players,
        `Escribe ${prefix()}naval tiro A1`
    );
}

async function sendColumns(
    sock: any,
    msg: any,
    game: Game,
    row: number
) {
    const targetIndex: Player =
        game.turn === 0 ? 1 : 0;

    const shots = new Set(
        game.fleets[targetIndex].shots
    );

    const rows = LETTERS.split('')
        .map((letter, col) => ({
            letter,
            index: (row - 1) * SIZE + col
        }))
        .filter(item => !shots.has(item.index))
        .map(item => ({
            title: `🎯 ${item.letter}${row}`,
            description:
                `Disparar a ${item.letter}${row}`,
            id:
                `${prefix()}naval tiro ${game.id} ${game.version} ${item.letter}${row}`
        }));

    if (!rows.length) {
        return msg.reply(
            '🍥 Todas las casillas de esa fila ya fueron atacadas.'
        );
    }

    return sendInteractive(
        sock,
        msg,
        game.chat,
        `🍓 *YAE BATALLA NAVAL*

🎮 Jugador: ${tag(game.players[game.turn])}

🎯 Fila seleccionada: *${row}*

🪷 Ahora elige una columna para disparar.`,
        '🚢 Elegir columna',
        rows,
        game.players,
        `Escribe ${prefix()}naval tiro A${row}`
    );
}

async function sendPrivateFleets(
    sock: any,
    game: Game
): Promise<void> {
    await Promise.allSettled(
        game.players.map((player, index) =>
            sock.sendMessage(player, {
                text: `🍓 *TU FLOTA SECRETA*

🚢 Batalla en el grupo:
${game.chat}

${renderGrid(game.fleets[index], true)}

🛡️ Tienes tres barcos:
🚢 Uno de 3 casillas
🚢 Dos de 2 casillas

🍥 No compartas tu tablero con tu rival.

🌸 ¡Buena suerte!`
            })
        )
    );
}

function schedule(
    sock: any,
    game: Game
): void {
    const key = keyOf(game);
    const previous = timers.get(key);

    if (previous) clearTimeout(previous);

    const delay = Math.max(
        0,
        game.expires - Date.now()
    );

    const timer = setTimeout(async () => {
        timers.delete(key);

        const stored = readGame(
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
                    text:
                        '🍥 El desafío de Batalla Naval expiró.'
                });

                return;
            }

            const winner: Player =
                current.turn === 0 ? 1 : 0;

            const result = finishGame(
                stored,
                winner,
                'Tiempo agotado',
                false
            );

            if (!result) return;

            await sock.sendMessage(current.chat, {
                text: result,
                mentions: current.players
            });
        } catch (error) {
            console.error('[NAVAL TIMER ERROR]:', error);
        }
    }, delay);

    timer.unref?.();
    timers.set(key, timer);
}

async function expireIfNeeded(
    sock: any,
    stored: StoredGame | null
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

    const winner: Player =
        game.turn === 0 ? 1 : 0;

    const result = finishGame(
        stored,
        winner,
        'Tiempo agotado',
        false
    );

    if (!result) return;

    await sock.sendMessage(game.chat, {
        text: result,
        mentions: game.players
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

    const bot = botId(sock);

    const args: string[] = Array.isArray(extra?.args)
        ? extra.args.map(String)
        : [];

    const action = String(
        args[0] || ''
    ).toLowerCase();

    if (action === 'perfil') {
        const row = db.prepare(`
            SELECT wins, losses
            FROM yae_naval_stats
            WHERE bot = ? AND player = ?
        `).get(bot, sender) as
            | { wins: number; losses: number }
            | undefined;

        return msg.reply(`🍓 *YAE BATALLA NAVAL*

👤 *TU PERFIL*

🏆 Victorias: ${row?.wins || 0}
💔 Derrotas: ${row?.losses || 0}`);
    }

    if (action === 'top') {
        const rows = db.prepare(`
            SELECT player, wins, losses
            FROM yae_naval_stats
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
                text: `🍓 *TOP BATALLA NAVAL*

${rows.map((row, index) =>
    `${index + 1}. ${tag(row.player)} — ${row.wins} victorias`
).join('\n')}`,
                mentions: rows.map(row => row.player)
            },
            { quoted: msg }
        );
    }

    if (!isJidGroup(chat)) {
        return msg.reply(
            '🍥 Batalla Naval se juega dentro de grupos.'
        );
    }

    await expireIfNeeded(
        sock,
        readGame(bot, chat)
    );

    const stored = readGame(bot, chat);
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

        if (sender !== game.players[1]) {
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

        await sendPrivateFleets(sock, game);

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

        if (!game.players.includes(sender)) {
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
            '🍥 El desafío de Batalla Naval fue cancelado.'
        );
    }

    if (action === 'rendirse') {
        if (!stored || game?.status !== 'active') {
            return msg.reply(
                '🍥 No hay una partida activa.'
            );
        }

        if (!game.players.includes(sender)) {
            return msg.reply(
                '🍥 No participas en esta batalla.'
            );
        }

        const winner: Player =
            sender === game.players[0] ? 1 : 0;

        const result = finishGame(
            stored,
            winner,
            'Rendición',
            false
        );

        if (!result) {
            return msg.reply(
                '🍥 La partida ya fue actualizada.'
            );
        }

        return sock.sendMessage(
            chat,
            {
                text: result,
                mentions: game.players
            },
            { quoted: msg }
        );
    }

    if (action === 'flota') {
        if (!game || game.status !== 'active') {
            return msg.reply(
                '🍥 No hay una partida activa.'
            );
        }

        const index = game.players.indexOf(sender);

        if (index < 0) {
            return msg.reply(
                '🍥 No participas en esta batalla.'
            );
        }

        try {
            await sock.sendMessage(sender, {
                text: `🍓 *TU FLOTA SECRETA*

${renderGrid(game.fleets[index], true)}

🛡️ Barcos restantes:
${remainingShips(game.fleets[index])}`
            });

            return msg.reply(
                '🍓 Te envié tu flota por privado.'
            );
        } catch {
            return msg.reply(
                '🍥 No pude enviarte tu flota por privado. Abre un chat con Yae e inténtalo de nuevo.'
            );
        }
    }

    if (action === 'fila') {
        if (!game || game.status !== 'active') {
            return msg.reply(
                '🍥 No hay una partida activa.'
            );
        }

        if (sender !== game.players[game.turn]) {
            return msg.reply(
                '🍥 No es tu turno.'
            );
        }

        const interactive = args.length >= 4;

        if (
            interactive &&
            (
                args[1] !== game.id ||
                Number(args[2]) !== game.version
            )
        ) {
            return msg.reply(
                '🍥 Ese botón pertenece a un turno anterior.'
            );
        }

        const row = Number(
            interactive ? args[3] : args[1]
        );

        if (
            !Number.isInteger(row) ||
            row < 1 ||
            row > SIZE
        ) {
            return msg.reply(
                '🍥 Selecciona una fila del 1 al 5.'
            );
        }

        return sendColumns(
            sock,
            msg,
            game,
            row
        );
    }

    if (action === 'tiro') {
        if (!stored || game?.status !== 'active') {
            return msg.reply(
                '🍥 No hay una partida activa.'
            );
        }

        if (sender !== game.players[game.turn]) {
            return msg.reply(
                '🍥 No es tu turno de atacar.'
            );
        }

        const interactive = args.length >= 4;

        if (
            interactive &&
            (
                args[1] !== game.id ||
                Number(args[2]) !== game.version
            )
        ) {
            return msg.reply(
                '🍥 Ese botón pertenece a un turno anterior.'
            );
        }

        const coordinate = String(
            interactive ? args[3] : args[1] || ''
        ).toUpperCase();

        const index = parseCoordinate(coordinate);

        if (index < 0) {
            return msg.reply(
                '🍥 Coordenada inválida. Ejemplo: .naval tiro B3'
            );
        }

        const targetIndex: Player =
            game.turn === 0 ? 1 : 0;

        const target = game.fleets[targetIndex];

        if (target.shots.includes(index)) {
            return msg.reply(
                '🍥 Esa casilla ya fue atacada.'
            );
        }

        target.shots.push(index);

        const occupied = shipCells(target);
        const hit = occupied.has(index);

        const sunk = target.ships.find(
            ship =>
                ship.includes(index) &&
                ship.every(cell =>
                    target.shots.includes(cell)
                )
        );

        const announcement = hit
            ? sunk
                ? `💥 ¡BARCO HUNDIDO EN ${coordinate}!`
                : `🔥 ¡IMPACTO EN ${coordinate}!`
            : `💦 ¡AGUA EN ${coordinate}!`;

        if (allSunk(target)) {
            const result = finishGame(
                stored,
                game.turn,
                'Todos los barcos enemigos fueron hundidos',
                true
            );

            if (!result) {
                return msg.reply(
                    '🍥 La partida ya fue actualizada.'
                );
            }

            return sock.sendMessage(
                chat,
                {
                    text: `${announcement}\n\n${result}`,
                    mentions: game.players
                },
                { quoted: msg }
            );
        }

        game.turn = targetIndex;
        game.version++;
        game.expires = Date.now() + TURN_TIME;

        if (!updateGame(stored, game)) {
            return msg.reply(
                '🍥 La partida ya fue actualizada.'
            );
        }

        schedule(sock, game);

        return sendTurn(
            sock,
            msg,
            game,
            announcement
        );
    }

    const target = findMention(msg);

    if (target) {
        if (game) {
            return msg.reply(
                '🍥 Ya hay una batalla o desafío en este grupo.'
            );
        }

        if (target === sender) {
            return msg.reply(
                '🍥 No puedes desafiarte a ti mismo.'
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
            players: [sender, target],
            fleets: [
                createFleet(),
                createFleet()
            ],
            turn: 0,
            version: 0,
            status: 'pending',
            expires: Date.now() + INVITE_TIME
        };

        if (!createGame(newGame)) {
            return msg.reply(
                '🍥 Ya existe una partida en este grupo.'
            );
        }

        schedule(sock, newGame);

        return sendInteractive(
            sock,
            msg,
            chat,
            `🍓 *YAE BATALLA NAVAL*

🚢 ${tag(sender)} ha desafiado a:

⚔️ ${tag(target)}

🛡️ Cada jugador tendrá:
🚢 Un barco de 3 casillas
🚢 Dos barcos de 2 casillas

🌊 Tablero: 5×5
🎯 Gana quien hunda toda la flota rival.

⏳ Tienes 2 minutos para aceptar.`,
            '🚢 Responder desafío',
            [
                {
                    title: '🍓 Aceptar',
                    description: 'Comenzar la batalla',
                    id:
                        `${prefix()}naval aceptar ${newGame.id}`
                },
                {
                    title: '🍥 Rechazar',
                    description: 'Cancelar desafío',
                    id:
                        `${prefix()}naval rechazar ${newGame.id}`
                }
            ],
            newGame.players,
            `Escribe ${prefix()}naval aceptar`
        );
    }

    if (game) {
        if (game.status === 'active') {
            return sendTurn(sock, msg, game);
        }

        return msg.reply(
            '🍥 Hay un desafío pendiente en este grupo.'
        );
    }

    return msg.reply(`🍓 *YAE BATALLA NAVAL*

🚢 ¡Desafía a otro usuario y hunde su flota!

🪷 *COMANDOS*

${prefix()}naval @usuario
${prefix()}naval aceptar
${prefix()}naval rechazar
${prefix()}naval fila 2
${prefix()}naval tiro B3
${prefix()}naval flota
${prefix()}naval rendirse
${prefix()}naval perfil
${prefix()}naval top

🎮 *REGLAS*

🌊 Tablero de 5×5
🚢 Tres barcos por jugador
🎯 Ataques por turnos
⏳ 90 segundos por turno

🏆 Victoria: ${WIN_REWARD} yenes
🍥 Máximo 3 premios diarios.
🌸 Un premio por rival al día.

🪷 Los barcos se colocan automáticamente y permanecen ocultos.`);
}
