const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

const rooms = new Map();

const MAX_PLAYERS = 5;
const MAX_SQUAD_SIZE = 30;
const AUCTION_TIME = 10;

const BID_AMOUNTS = [100, 250, 500, 1000000];

const REQUIRED_POSITIONS = [
    "LW",
    "STRIKER",
    "RW",
    "CM",
    "CAM",
    "CDM",
    "LB",
    "CB",
    "CB",
    "RB",
    "GK"
];


// =====================================================
// PLAYER DATABASE
// =====================================================

const PLAYERS = [

    // =========================
    // GK
    // =========================

    { name: "Lev Yashin", position: "GK" },
    { name: "Gianluigi Buffon", position: "GK" },
    { name: "Manuel Neuer", position: "GK" },
    { name: "Iker Casillas", position: "GK" },
    { name: "Peter Schmeichel", position: "GK" },
    { name: "Oliver Kahn", position: "GK" },
    { name: "Edwin van der Sar", position: "GK" },
    { name: "Alisson Becker", position: "GK" },
    { name: "Thibaut Courtois", position: "GK" },
    { name: "Jan Oblak", position: "GK" },
    { name: "Emiliano Martinez", position: "GK" },
    { name: "Gianluigi Donnarumma", position: "GK" },

    // =========================
    // LB
    // =========================

    { name: "Roberto Carlos", position: "LB" },
    { name: "Paolo Maldini", position: "LB" },
    { name: "Marcelo", position: "LB" },
    { name: "Ashley Cole", position: "LB" },
    { name: "Philipp Lahm", position: "LB" },
    { name: "Jordi Alba", position: "LB" },
    { name: "Theo Hernandez", position: "LB" },
    { name: "Alphonso Davies", position: "LB" },
    { name: "Nuno Mendes", position: "LB" },
    { name: "Andrew Robertson", position: "LB" },

    // =========================
    // CB
    // =========================

    { name: "Franz Beckenbauer", position: "CB" },
    { name: "Paolo Maldini", position: "CB" },
    { name: "Franco Baresi", position: "CB" },
    { name: "Alessandro Nesta", position: "CB" },
    { name: "Sergio Ramos", position: "CB" },
    { name: "Rio Ferdinand", position: "CB" },
    { name: "Nemanja Vidic", position: "CB" },
    { name: "Carles Puyol", position: "CB" },
    { name: "Virgil van Dijk", position: "CB" },
    { name: "William Saliba", position: "CB" },
    { name: "Ruben Dias", position: "CB" },
    { name: "Antonio Rudiger", position: "CB" },
    { name: "Fabio Cannavaro", position: "CB" },
    { name: "Thiago Silva", position: "CB" },
    { name: "Giorgio Chiellini", position: "CB" },
    { name: "Leonardo Bonucci", position: "CB" },

    // =========================
    // RB
    // =========================

    { name: "Cafu", position: "RB" },
    { name: "Carlos Alberto", position: "RB" },
    { name: "Dani Alves", position: "RB" },
    { name: "Philipp Lahm", position: "RB" },
    { name: "Javier Zanetti", position: "RB" },
    { name: "Lilian Thuram", position: "RB" },
    { name: "Trent Alexander-Arnold", position: "RB" },
    { name: "Achraf Hakimi", position: "RB" },
    { name: "Kyle Walker", position: "RB" },
    { name: "Reece James", position: "RB" },
    { name: "Joao Cancelo", position: "RB" },

    // =========================
    // CDM
    // =========================

    { name: "Ruud Gullit", position: "CDM" },
    { name: "Lothar Matthaus", position: "CDM" },
    { name: "Claude Makelele", position: "CDM" },
    { name: "Patrick Vieira", position: "CDM" },
    { name: "Frank Rijkaard", position: "CDM" },
    { name: "Sergio Busquets", position: "CDM" },
    { name: "Xabi Alonso", position: "CDM" },
    { name: "Andrea Pirlo", position: "CDM" },
    { name: "Casemiro", position: "CDM" },
    { name: "Rodri", position: "CDM" },
    { name: "N'Golo Kante", position: "CDM" },
    { name: "Yaya Toure", position: "CDM" },

    // =========================
    // CM
    // =========================

    { name: "Zinedine Zidane", position: "CM" },
    { name: "Xavi", position: "CM" },
    { name: "Andres Iniesta", position: "CM" },
    { name: "Luka Modric", position: "CM" },
    { name: "Steven Gerrard", position: "CM" },
    { name: "Frank Lampard", position: "CM" },
    { name: "Paul Scholes", position: "CM" },
    { name: "Clarence Seedorf", position: "CM" },
    { name: "Kevin De Bruyne", position: "CM" },
    { name: "Toni Kroos", position: "CM" },
    { name: "Jude Bellingham", position: "CM" },
    { name: "Pedri", position: "CM" },
    { name: "Federico Valverde", position: "CM" },
    { name: "Bastian Schweinsteiger", position: "CM" },

    // =========================
    // CAM
    // =========================

    { name: "Diego Maradona", position: "CAM" },
    { name: "Johan Cruyff", position: "CAM" },
    { name: "Ronaldinho", position: "CAM" },
    { name: "Kaka", position: "CAM" },
    { name: "Michel Platini", position: "CAM" },
    { name: "Roberto Baggio", position: "CAM" },
    { name: "Dennis Bergkamp", position: "CAM" },
    { name: "Zico", position: "CAM" },
    { name: "Francesco Totti", position: "CAM" },
    { name: "Juan Roman Riquelme", position: "CAM" },
    { name: "Kevin De Bruyne", position: "CAM" },
    { name: "Bruno Fernandes", position: "CAM" },
    { name: "Mesut Ozil", position: "CAM" },
    { name: "Jamal Musiala", position: "CAM" },
    { name: "Martin Odegaard", position: "CAM" },

    // =========================
    // LW
    // =========================

    { name: "Cristiano Ronaldo", position: "LW" },
    { name: "Ronaldinho", position: "LW" },
    { name: "Neymar Jr", position: "LW" },
    { name: "Thierry Henry", position: "LW" },
    { name: "Rivaldo", position: "LW" },
    { name: "George Best", position: "LW" },
    { name: "Ryan Giggs", position: "LW" },
    { name: "Vinicius Jr", position: "LW" },
    { name: "Kylian Mbappe", position: "LW" },
    { name: "Sadio Mane", position: "LW" },
    { name: "Rafael Leao", position: "LW" },
    { name: "Khvicha Kvaratskhelia", position: "LW" },
    { name: "Son Heung-min", position: "LW" },

    // =========================
    // RW
    // =========================

    { name: "Lionel Messi", position: "RW" },
    { name: "Garrincha", position: "RW" },
    { name: "Luis Figo", position: "RW" },
    { name: "David Beckham", position: "RW" },
    { name: "Mohamed Salah", position: "RW" },
    { name: "Arjen Robben", position: "RW" },
    { name: "George Best", position: "RW" },
    { name: "Bukayo Saka", position: "RW" },
    { name: "Lamine Yamal", position: "RW" },
    { name: "Rodrygo", position: "RW" },
    { name: "Riyad Mahrez", position: "RW" },

    // =========================
    // STRIKER
    // =========================

    { name: "Pele", position: "STRIKER" },
    { name: "Ronaldo Nazario", position: "STRIKER" },
    { name: "Cristiano Ronaldo", position: "STRIKER" },
    { name: "Lionel Messi", position: "STRIKER" },
    { name: "Marco van Basten", position: "STRIKER" },
    { name: "Gerd Muller", position: "STRIKER" },
    { name: "Romario", position: "STRIKER" },
    { name: "Ferenc Puskas", position: "STRIKER" },
    { name: "Eusebio", position: "STRIKER" },
    { name: "Gabriel Batistuta", position: "STRIKER" },
    { name: "Thierry Henry", position: "STRIKER" },
    { name: "Robert Lewandowski", position: "STRIKER" },
    { name: "Luis Suarez", position: "STRIKER" },
    { name: "Karim Benzema", position: "STRIKER" },
    { name: "Erling Haaland", position: "STRIKER" },
    { name: "Kylian Mbappe", position: "STRIKER" },
    { name: "Zlatan Ibrahimovic", position: "STRIKER" },
    { name: "Samuel Eto'o", position: "STRIKER" },
    { name: "Didier Drogba", position: "STRIKER" },
    { name: "Harry Kane", position: "STRIKER" },
    { name: "Wayne Rooney", position: "STRIKER" },
    { name: "Fernando Torres", position: "STRIKER" },
    { name: "Sergio Aguero", position: "STRIKER" },
    { name: "David Villa", position: "STRIKER" },
    { name: "Andriy Shevchenko", position: "STRIKER" },
    { name: "Ruud van Nistelrooy", position: "STRIKER" },
    { name: "Alan Shearer", position: "STRIKER" }
];


// =====================================================
// HELPERS
// =====================================================

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
}


function createPlayerPool() {
    return shuffle(
        PLAYERS.map((player, index) => ({
            id: `${index}-${player.name}`,
            name: player.name,
            position: player.position
        }))
    );
}


function makeRoom(code, purse) {

    return {

        code,
        purse,

        players: Array(MAX_PLAYERS).fill(null),

        started: false,
        finished: false,
        paused: false,

        index: 0,

        current: null,

        timer: null,
        nextTimer: null,

        timeLeft: AUCTION_TIME,

        playerQueue: createPlayerPool(),

        results: [],

        bidHistory: [],

        skipVotes: new Set(),

        chat: []

    };
}


// =====================================================
// POSITION HELPERS
// =====================================================

function countPosition(squad, position) {

    return squad.filter(
        player => player.position === position
    ).length;
}


function requiredPositionCount(position) {

    return REQUIRED_POSITIONS.filter(
        p => p === position
    ).length;
}


function canAddPlayerToSquad(player, auctionPlayer) {

    if (!player || !auctionPlayer) {
        return false;
    }

    if (player.squad.length >= MAX_SQUAD_SIZE) {
        return false;
    }

    const position = auctionPlayer.position;

    const currentCount =
        countPosition(player.squad, position);

    const maximum =
        requiredPositionCount(position);

    /*
     * Allow normal bench players after the starting
     * position has been filled.
     *
     * Once a position has reached its required count,
     * another player of the same position can still
     * be bought as a bench player.
     */

    return true;
}


function getMissingPositions(player) {

    if (!player) {
        return [...REQUIRED_POSITIONS];
    }

    const missing = [];

    const counts = {};

    for (const position of REQUIRED_POSITIONS) {
        counts[position] =
            (counts[position] || 0) + 1;
    }

    for (const required of Object.keys(counts)) {

        const owned =
            countPosition(
                player.squad,
                required
            );

        const needed =
            counts[required];

        for (let i = owned; i < needed; i++) {
            missing.push(required);
        }
    }

    return missing;
}


function mustFillPosition(player, auctionPlayer) {

    if (!player || !auctionPlayer) {
        return false;
    }

    const missing =
        getMissingPositions(player);

    /*
     * If the player has 30 players already,
     * no purchase is allowed.
     */

    if (player.squad.length >= MAX_SQUAD_SIZE) {
        return true;
    }

    /*
     * If the squad is approaching the starting XI
     * and the auction player can fill a missing position,
     * allow it normally.
     */

    return false;
}


// =====================================================
// PUBLIC STATE
// =====================================================

function publicState(room) {

    return {

        code: room.code,

        purse: room.purse,

        players: room.players.map(player => {

            if (!player) {
                return null;
            }

            return {

                id: player.id,

                name: player.name,

                purse: player.purse,

                squad: player.squad,

                slot: player.slot

            };

        }),

        maxPlayers: MAX_PLAYERS,

        started: room.started,

        finished: room.finished,

        paused: room.paused,

        index: room.index,

        total: room.playerQueue.length,

        current: room.current
            ? {

                id: room.current.id,

                name: room.current.name,

                position: room.current.position,

                base: room.current.base,

                bid: room.current.bid,

                bidder: room.current.bidder,

                timeLeft: room.timeLeft

            }
            : null,

        results: room.results,

        bidHistory: room.bidHistory,

        skipVotes: room.skipVotes.size,

        skipRequired:
            room.players.filter(Boolean).length,

        chat: room.chat.slice(-50)

    };
}


// =====================================================
// EMIT STATE
// =====================================================

function emitState(room) {

    io.to(room.code).emit(
        "state",
        publicState(room)
    );

}


// =====================================================
// TIMER
// =====================================================

function stopTimer(room) {

    if (room.timer) {

        clearInterval(room.timer);

        room.timer = null;

    }

}


function clearNextTimer(room) {

    if (room.nextTimer) {

        clearTimeout(room.nextTimer);

        room.nextTimer = null;

    }

}


function startTimer(room) {

    stopTimer(room);

    if (
        !room.started ||
        room.finished ||
        room.paused ||
        !room.current
    ) {

        return;

    }

    room.timer = setInterval(() => {

        if (
            !room.started ||
            room.finished ||
            room.paused ||
            !room.current
        ) {

            return;

        }

        room.timeLeft--;

        io.to(room.code).emit(
            "tick",
            room.timeLeft
        );

        if (room.timeLeft <= 0) {

            stopTimer(room);

            const action =
                room.current.bidder !== null
                    ? "sold"
                    : "skip";

            sellOrSkip(room, action);

        }

    }, 1000);

}


// =====================================================
// NEXT PLAYER
// =====================================================

function nextPlayer(room) {

    stopTimer(room);

    clearNextTimer(room);

    room.skipVotes.clear();

    if (
        room.index >=
        room.playerQueue.length
    ) {

        finishAuction(room);

        return;

    }

    const auctionPlayer =
        room.playerQueue[room.index];

    room.index++;

    room.current = {

        id: auctionPlayer.id,

        name: auctionPlayer.name,

        position: auctionPlayer.position,

        base: 100,

        bid: 100,

        bidder: null

    };

    room.timeLeft = AUCTION_TIME;

    room.paused = false;

    emitState(room);

    startTimer(room);

}


// =====================================================
// SELL / SKIP
// =====================================================

function sellOrSkip(room, action) {

    stopTimer(room);

    clearNextTimer(room);

    if (!room.current) {
        return;
    }

    const current =
        room.current;

    if (
        action === "sold" &&
        current.bidder !== null
    ) {

        const buyer =
            room.players[current.bidder];

        if (!buyer) {
            return;
        }

        if (
            buyer.purse <
            current.bid
        ) {

            room.results.push({

                player: current.name,

                position: current.position,

                status: "SKIPPED",

                team: null,

                price: 0

            });

        }

        else if (
            buyer.squad.length >=
            MAX_SQUAD_SIZE
        ) {

            room.results.push({

                player: current.name,

                position: current.position,

                status: "SKIPPED",

                team: null,

                price: 0

            });

        }

        else {

            buyer.purse -=
                current.bid;

            buyer.squad.push({

                id: current.id,

                name: current.name,

                position: current.position,

                price: current.bid

            });

            room.results.push({

                player: current.name,

                position: current.position,

                status: "SOLD",

                team: buyer.name,

                price: current.bid

            });

        }

    }

    else {

        room.results.push({

            player: current.name,

            position: current.position,

            status: "SKIPPED",

            team: null,

            price: 0

        });

    }

    room.current = null;

    room.skipVotes.clear();

    emitState(room);

    room.nextTimer = setTimeout(() => {

        room.nextTimer = null;

        if (
            room.started &&
            !room.finished
        ) {

            nextPlayer(room);

        }

    }, 700);

}


// =====================================================
// FINISH AUCTION
// =====================================================

function finishAuction(room) {

    stopTimer(room);

    clearNextTimer(room);

    room.finished = true;

    room.started = false;

    room.paused = false;

    room.current = null;

    const teams = room.players
        .filter(Boolean)
        .map(player => {

            const totalSpent =
                player.squad.reduce(
                    (sum, p) =>
                        sum + Number(p.price || 0),
                    0
                );

            const positionScore =
                getTeamPositionScore(
                    player
                );

            const squadScore =
                player.squad.length * 10;

            return {

                slot: player.slot,

                name: player.name,

                squadSize:
                    player.squad.length,

                spent: totalSpent,

                remaining:
                    player.purse,

                positionScore,

                squadScore,

                totalScore:
                    positionScore +
                    squadScore

            };

        });

    teams.sort(
        (a, b) =>
            b.totalScore -
            a.totalScore
    );

    room.finalTeams = teams;

    room.winner =
        teams.length
            ? teams[0]
            : null;

    emitState(room);

    io.to(room.code).emit(
        "auctionFinished",
        {
            teams,
            winner: room.winner
        }
    );

}


function getTeamPositionScore(player) {

    const missing =
        getMissingPositions(player);

    const filled =
        REQUIRED_POSITIONS.length -
        missing.length;

    return filled * 100;

}


// =====================================================
// SOCKET CONNECTION
// =====================================================

io.on("connection", socket => {


    // =================================================
    // CREATE ROOM
    // =================================================

    socket.on(
        "createRoom",
        ({ name, purse }) => {

            purse = Number(purse);

            if (
                !Number.isFinite(purse) ||
                purse <= 0
            ) {

                socket.emit(
                    "errorMsg",
                    "Enter a valid purse."
                );

                return;

            }

            let code;

            do {

                code =
                    Math.random()
                        .toString(36)
                        .slice(2, 7)
                        .toUpperCase();

            }
            while (rooms.has(code));

            const room =
                makeRoom(
                    code,
                    purse
                );

            room.players[0] = {

                id: socket.id,

                name:
                    String(
                        name ||
                        "Player 1"
                    ).slice(0, 20),

                purse,

                squad: [],

                slot: 0

            };

            rooms.set(
                code,
                room
            );

            socket.join(code);

            socket.data.room =
                code;

            socket.data.slot =
                0;

            socket.emit(
                "roomCreated",
                code
            );

            emitState(room);

        }
    );


    // =================================================
    // JOIN ROOM
    // =================================================

    socket.on(
        "joinRoom",
        ({ code, name }) => {

            code =
                String(code || "")
                    .trim()
                    .toUpperCase();

            const room =
                rooms.get(code);

            if (!room) {

                socket.emit(
                    "errorMsg",
                    "Room not found."
                );

                return;

            }

            if (room.started) {

                socket.emit(
                    "errorMsg",
                    "Auction has already started."
                );

                return;

            }

            const slot =
                room.players.findIndex(
                    player =>
                        player === null
                );

            if (slot === -1) {

                socket.emit(
                    "errorMsg",
                    "Room is full. Maximum 5 players."
                );

                return;

            }

            room.players[slot] = {

                id: socket.id,

                name:
                    String(
                        name ||
                        `Player ${slot + 1}`
                    ).slice(0, 20),

                purse:
                    room.purse,

                squad: [],

                slot

            };

            socket.join(code);

            socket.data.room =
                code;

            socket.data.slot =
                slot;

            socket.emit(
                "joined",
                code
            );

            emitState(room);

        }
    );


    // =================================================
    // START AUCTION
    // =================================================

    socket.on(
        "startAuction",
        () => {

            const room =
                rooms.get(
                    socket.data.room
                );

            if (!room) {
                return;
            }

            if (
                socket.data.slot !== 0
            ) {
                return;
            }

            const activePlayers =
                room.players.filter(Boolean);

            if (
                activePlayers.length < 2
            ) {

                socket.emit(
                    "errorMsg",
                    "At least 2 players are required."
                );

                return;

            }

            if (room.started) {
                return;
            }

            stopTimer(room);

            clearNextTimer(room);

            room.started = true;

            room.finished = false;

            room.paused = false;

            room.index = 0;

            room.results = [];

            room.bidHistory = [];

            room.chat = [];

            room.playerQueue =
                createPlayerPool();

            room.players.forEach(
                player => {

                    if (!player) {
                        return;
                    }

                    player.purse =
                        room.purse;

                    player.squad = [];

                }
            );

            nextPlayer(room);

        }
    );


    // =================================================
    // BID
    // =================================================

    socket.on(
        "bid",
        data => {

            const room =
                rooms.get(
                    socket.data.room
                );

            if (
                !room ||
                !room.started ||
                room.finished ||
                room.paused ||
                !room.current
            ) {
                return;
            }

            const slot =
                socket.data.slot;

            const player =
                room.players[slot];

            if (!player) {
                return;
            }

            if (
                room.current.bidder ===
                slot
            ) {

                return;

            }

            let requestedAmount =
                data &&
                typeof data.amount !==
                "undefined"
                    ? Number(data.amount)
                    : null;

            let nextBid;

            /*
             * New bidding system:
             *
             * $100
             * $250
             * $500
             * $1M
             *
             * If the client sends an exact
             * amount, use that amount.
             *
             * Otherwise calculate the next
             * normal increment.
             */

            if (
                BID_AMOUNTS.includes(
                    requestedAmount
                ) &&
                requestedAmount >
                room.current.bid
            ) {

                nextBid =
                    requestedAmount;

            }

            else {

                nextBid =
                    getNextBid(
                        room.current.bid
                    );

            }

            if (
                player.purse <
                nextBid
            ) {

                socket.emit(
                    "errorMsg",
                    "Not enough purse."
                );

                return;

            }

            room.current.bid =
                nextBid;

            room.current.bidder =
                slot;

            room.bidHistory.push({

                player:
                    room.current.name,

                position:
                    room.current.position,

                bidder:
                    player.name,

                slot,

                amount:
                    nextBid,

                time:
                    Date.now()

            });

            /*
             * IMPORTANT TIMER RESET
             */

            room.timeLeft =
                AUCTION_TIME;

            stopTimer(room);

            emitState(room);

            startTimer(room);

        }
    );


    // =================================================
    // SKIP
    // =================================================

    socket.on(
        "skip",
        () => {

            const room =
                rooms.get(
                    socket.data.room
                );

            if (
                !room ||
                !room.started ||
                room.finished ||
                room.paused ||
                !room.current
            ) {
                return;
            }

            const slot =
                socket.data.slot;

            room.skipVotes.add(slot);

            emitState(room);

            const activePlayers =
                room.players
                    .filter(Boolean);

            /*
             * EVERY MEMBER MUST PRESS SKIP
             */

            if (
                room.skipVotes.size >=
                activePlayers.length
            ) {

                room.skipVotes.clear();

                sellOrSkip(
                    room,
                    "skip"
                );

            }

        }
    );


    // =================================================
    // SOLD
    // =================================================

    socket.on(
        "sell",
        () => {

            const room =
                rooms.get(
                    socket.data.room
                );

            if (
                !room ||
                !room.started ||
                room.finished ||
                room.paused ||
                !room.current
            ) {
                return;
            }

            if (
                room.current.bidder ===
                null
            ) {

                socket.emit(
                    "errorMsg",
                    "No one has bid yet."
                );

                return;

            }

            /*
             * Only host can confirm SOLD.
             */

            if (
                socket.data.slot !== 0
            ) {

                return;

            }

            sellOrSkip(
                room,
                "sold"
            );

        }
    );


    // =================================================
    // PAUSE / RESUME
    // =================================================

    socket.on(
        "togglePause",
        () => {

            const room =
                rooms.get(
                    socket.data.room
                );

            if (
                !room ||
                socket.data.slot !== 0 ||
                !room.started ||
                room.finished ||
                !room.current
            ) {

                return;

            }

            room.paused =
                !room.paused;

            if (room.paused) {

                stopTimer(room);

            }

            else {

                startTimer(room);

            }

            emitState(room);

        }
    );


    // =================================================
    // CHAT
    // =================================================

    socket.on(
        "chatMessage",
        data => {

            const room =
                rooms.get(
                    socket.data.room
                );

            if (!room) {
                return;
            }

            const player =
                room.players[
                    socket.data.slot
                ];

            if (!player) {
                return;
            }

            const message =
                String(
                    data &&
                    data.message ||
                    ""
                )
                    .trim()
                    .slice(0, 300);

            if (!message) {
                return;
            }

            const chatMessage = {

                id:
                    `${Date.now()}-${Math.random()}`,

                sender:
                    player.name,

                slot:
                    player.slot,

                message,

                time:
                    Date.now()

            };

            room.chat.push(
                chatMessage
            );

            if (
                room.chat.length >
                100
            ) {

                room.chat =
                    room.chat.slice(-100);

            }

            io.to(room.code).emit(
                "chatMessage",
                chatMessage
            );

        }
    );


    // =================================================
    // LEAVE ROOM
    // =================================================

    socket.on(
        "leaveRoom",
        () => {

            const room =
                rooms.get(
                    socket.data.room
                );

            if (!room) {

                socket.disconnect(true);

                return;

            }

            stopTimer(room);

            clearNextTimer(room);

            io.to(room.code).emit(
                "errorMsg",
                `${room.players[
                    socket.data.slot
                ]?.name || "A player"} left the room.`
            );

            rooms.delete(
                room.code
            );

            io.to(room.code).emit(
                "roomClosed"
            );

            socket.disconnect(true);

        }
    );


    // =================================================
    // PLAY AGAIN
    // =================================================

    socket.on(
        "playAgain",
        () => {

            const room =
                rooms.get(
                    socket.data.room
                );

            if (
                !room ||
                socket.data.slot !== 0
            ) {

                return;

            }

            const activePlayers =
                room.players.filter(Boolean);

            if (
                activePlayers.length < 2
            ) {

                return;

            }

            stopTimer(room);

            clearNextTimer(room);

            room.started = true;

            room.finished = false;

            room.paused = false;

            room.index = 0;

            room.results = [];

            room.bidHistory = [];

            room.current = null;

            room.skipVotes.clear();

            room.playerQueue =
                createPlayerPool();

            room.players.forEach(
                player => {

                    if (!player) {
                        return;
                    }

                    player.purse =
                        room.purse;

                    player.squad = [];

                }
            );

            nextPlayer(room);

        }
    );


    // =================================================
    // DISCONNECT
    // =================================================

    socket.on(
        "disconnect",
        () => {

            const code =
                socket.data.room;

            const room =
                rooms.get(code);

            if (!room) {
                return;
            }

            stopTimer(room);

            clearNextTimer(room);

            const slot =
                socket.data.slot;

            if (
                typeof slot ===
                "number" &&
                room.players[slot]
            ) {

                const playerName =
                    room.players[slot].name;

                room.players[slot] =
                    null;

                io.to(code).emit(
                    "playerDisconnected",
                    {
                        slot,
                        name: playerName
                    }
                );

                /*
                 * If the host leaves, close
                 * the room to keep the auction
                 * synchronized.
                 */

                if (slot === 0) {

                    io.to(code).emit(
                        "errorMsg",
                        "Host disconnected. Room closed."
                    );

                    rooms.delete(code);

                    return;

                }

                emitState(room);

            }

        }
    );

});


// =====================================================
// HEALTH CHECK
// =====================================================

app.get(
    "/health",
    (_, res) => {

        res.json({
            ok: true,
            players: PLAYERS.length
        });

    }
);


// =====================================================
// START SERVER
// =====================================================

server.listen(
    PORT,
    () => {

        console.log(
            `Football Auction running on port ${PORT}`
        );

        console.log(
            `Player pool: ${PLAYERS.length}`
        );

        console.log(
            `Maximum members: ${MAX_PLAYERS}`
        );

    }
);