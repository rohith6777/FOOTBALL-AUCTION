const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const rooms = new Map();


// =====================================================
// TOP FOOTBALL PLAYERS
// =====================================================

const PLAYERS = [
    "Pelé","Lionel Messi","Cristiano Ronaldo","Diego Maradona",
    "Johan Cruyff","Franz Beckenbauer","Zinedine Zidane",
    "Ronaldo Nazário","Ronaldinho","Alfredo Di Stéfano",
    "Ferenc Puskás","Garrincha","Michel Platini","George Best",
    "Eusébio","Paolo Maldini","Xavi","Andrés Iniesta","Lev Yashin",
    "Bobby Charlton","Marco van Basten","Romário","Gerd Müller",
    "Franco Baresi","Ronald Koeman","Lothar Matthäus","Roberto Baggio",
    "Thierry Henry","Kaká","Luis Suárez","Neymar","Luka Modrić",
    "Sergio Ramos","Manuel Neuer","Iker Casillas","Gianluigi Buffon",
    "Cafu","Roberto Carlos","Philipp Lahm","Andrea Pirlo",
    "Steven Gerrard","Frank Lampard","Paul Scholes","Kevin De Bruyne",
    "Eden Hazard","Arjen Robben","Franck Ribéry","Mohamed Salah",
    "Karim Benzema","Robert Lewandowski","Erling Haaland",
    "Kylian Mbappé","Virgil van Dijk","Sergio Busquets",
    "Sergio Agüero","Didier Drogba","Samuel Eto'o","David Villa",
    "Wayne Rooney","Zlatan Ibrahimović","George Weah",
    "Andriy Shevchenko","Ruud van Nistelrooy","Dennis Bergkamp",
    "Eric Cantona","Alan Shearer","Gary Lineker","Raúl",
    "David Beckham","Ryan Giggs","Patrick Vieira","Claude Makélélé",
    "Roy Keane","Nemanja Vidić","John Terry","Carles Puyol",
    "Fabio Cannavaro","Alessandro Nesta","Javier Zanetti","Dani Alves",
    "Marcelo","Ashley Cole","Lilian Thuram","Jaap Stam",
    "Rio Ferdinand","Kevin Keegan","Kenny Dalglish","Ian Rush",
    "Luis Figo","Michael Laudrup","Hristo Stoichkov","Sócrates",
    "Zico","Rivaldo","Didi","Nilton Santos","Carlos Alberto",
    "Rivelino","Jairzinho","Tostão","Gerson","Mario Kempes",
    "Daniel Passarella","Gabriel Batistuta","Javier Saviola",
    "Juan Román Riquelme","Pablo Aimar","Juan Sebastián Verón",
    "Hernán Crespo","Jorge Valdano","Fernando Redondo",
    "Esteban Cambiasso","Javier Mascherano","Ángel Di María",
    "Santi Cazorla","David Silva","Xabi Alonso","Mesut Özil",
    "Toni Kroos","Bastian Schweinsteiger","Thomas Müller",
    "Miroslav Klose","Wesley Sneijder","Clarence Seedorf",
    "Edgar Davids","Ruud Gullit","Frank Rijkaard","Dennis Wise",
    "Patrick Kluivert","Edwin van der Sar","Petr Čech","Oliver Kahn",
    "Dino Zoff","Walter Zenga","Gordon Banks","Peter Schmeichel",
    "Hugo Sánchez","Johan Neeskens","Marco Tardelli","Andrea Barzagli",
    "Giorgio Chiellini","Leonardo Bonucci","Thiago Silva",
    "Marquinhos","Casemiro","Fernandinho","Rodri","N'Golo Kanté",
    "Paul Pogba","Yaya Touré","Cesc Fàbregas","David Trezeguet",
    "Fernando Torres","Antoine Griezmann","Harry Kane",
    "Son Heung-min","Sadio Mané","Riyad Mahrez","Vinícius Júnior",
    "Rodrygo","Phil Foden","Bukayo Saka","Jude Bellingham","Pedri",
    "Gavi","Bernardo Silva","Bruno Fernandes","Martin Ødegaard",
    "Luis Suárez Miramontes","Héctor Chumpitaz","Teófilo Cubillas",
    "Elias Figueroa","Obdulio Varela","José Nasazzi","Josef Masopust",
    "Raymond Kopa","Just Fontaine","Sándor Kocsis","László Kubala",
    "Gunnar Nordahl","Davor Šuker","Rui Costa","Deco",
    "Ricardo Carvalho"
];

const PLAYER_POOL = [...new Set(PLAYERS)];


// =====================================================
// SHUFFLE
// =====================================================

function shuffle(array) {

    for (let i = array.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [array[i], array[j]] =
        [array[j], array[i]];

    }

    return array;
}


// =====================================================
// CREATE ROOM
// =====================================================

function makeRoom(code, purse) {

    return {

        code,
        purse,

        players: [null, null],

        started: false,
        finished: false,
        paused: false,

        index: 0,

        current: null,

        timer: null,
        nextTimer: null,

        timeLeft: 10,

        playerQueue: shuffle([...PLAYER_POOL]),

        results: []

    };

}


// =====================================================
// PUBLIC STATE
// =====================================================

function publicState(room) {

    return {

        code: room.code,

        purse: room.purse,

        players: room.players.map(player => {

            if (!player) return null;

            return {

                id: player.id,
                name: player.name,
                purse: player.purse,
                squad: player.squad

            };

        }),

        started: room.started,
        finished: room.finished,
        paused: room.paused,

        index: room.index,

        total: room.playerQueue.length,

        current: room.current
            ? {

                name: room.current.name,
                base: room.current.base,
                bid: room.current.bid,
                bidder: room.current.bidder,
                timeLeft: room.timeLeft

            }
            : null,

        results: room.results

    };

}


// =====================================================
// SEND STATE TO BOTH PLAYERS
// =====================================================

function emitState(room) {

    io.to(room.code).emit(
        "state",
        publicState(room)
    );

}


// =====================================================
// STOP TIMER
// =====================================================

function stopTimer(room) {

    if (room.timer) {

        clearInterval(room.timer);

        room.timer = null;

    }

}


// =====================================================
// CLEAR NEXT PLAYER TIMER
// =====================================================

function clearNextTimer(room) {

    if (room.nextTimer) {

        clearTimeout(room.nextTimer);

        room.nextTimer = null;

    }

}


// =====================================================
// START TIMER
// =====================================================

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


        room.timeLeft -= 1;


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
// START NEXT PLAYER
// =====================================================

function nextPlayer(room) {

    stopTimer(room);
    clearNextTimer(room);


    if (
        room.index >=
        room.playerQueue.length
    ) {

        room.finished = true;
        room.started = false;
        room.paused = false;
        room.current = null;

        emitState(room);

        return;

    }


    const name =
        room.playerQueue[room.index];

    room.index += 1;


    room.current = {

        name,

        base: 1,

        bid: 1,

        bidder: null

    };


    room.timeLeft = 10;

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


        if (
            buyer &&
            buyer.purse >= current.bid
        ) {

            buyer.purse -= current.bid;


            buyer.squad.push({

                name: current.name,

                price: current.bid

            });


            room.results.push({

                player: current.name,

                status: "SOLD",

                team: buyer.name,

                price: current.bid

            });

        }

        else {

            room.results.push({

                player: current.name,

                status: "SKIPPED",

                team: null,

                price: 0

            });

        }

    }

    else {

        room.results.push({

            player: current.name,

            status: "SKIPPED",

            team: null,

            price: 0

        });

    }


    room.current = null;


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
                ![100, 200, 300]
                    .includes(purse)
            ) {

                socket.emit(
                    "errorMsg",
                    "Choose 100, 200 or 300 Cr."
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
                makeRoom(code, purse);


            room.players[0] = {

                id: socket.id,

                name:
                    String(
                        name ||
                        "Player 1"
                    ).slice(0, 20),

                purse,

                squad: []

            };


            rooms.set(code, room);


            socket.join(code);

            socket.data.room = code;

            socket.data.slot = 0;


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


            if (room.players[1]) {

                socket.emit(
                    "errorMsg",
                    "This room already has 2 players."
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


            room.players[1] = {

                id: socket.id,

                name:
                    String(
                        name ||
                        "Player 2"
                    ).slice(0, 20),

                purse: room.purse,

                squad: []

            };


            socket.join(code);

            socket.data.room = code;

            socket.data.slot = 1;


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


            if (
                !room ||
                socket.data.slot !== 0
            ) {

                return;

            }


            if (!room.players[1]) {

                socket.emit(
                    "errorMsg",
                    "Your friend must join first."
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

            room.playerQueue =
                shuffle([...PLAYER_POOL]);


            room.players.forEach(player => {

                player.purse = room.purse;

                player.squad = [];

            });


            nextPlayer(room);

        }
    );


    // =================================================
    // BID
    // =================================================

    socket.on(
        "bid",
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


            const player =
                room.players[slot];


            if (!player) {

                return;

            }


            // IMPORTANT:
            // bidder can be 0, so DON'T use
            // simple truthy checks here.

            if (
                room.current.bidder === slot
            ) {

                return;

            }


            const nextBid =
                room.current.bidder !== null
                    ? room.current.bid + 1
                    : room.current.base;


            if (
                player.purse < nextBid
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


            // =========================================
            // THE IMPORTANT TIMER FIX
            // =========================================

            room.timeLeft = 10;


            // Stop the OLD countdown.

            stopTimer(room);


            // Tell BOTH players immediately.

            emitState(room);


            // Start a completely NEW 10-second timer.

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


            sellOrSkip(
                room,
                "skip"
            );

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
                room.current.bidder === null
            ) {

                socket.emit(
                    "errorMsg",
                    "No one has bid yet."
                );

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


            // Only host can pause.

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

                // FREEZE TIMER

                stopTimer(room);

            }

            else {

                // CONTINUE TIMER

                startTimer(room);

            }


            // Both players receive
            // the same state.

            emitState(room);

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
                "A player left the room. The room is closed."
            );


            rooms.delete(room.code);


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
                socket.data.slot !== 0 ||
                !room.players[1]
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

            room.current = null;

            room.playerQueue =
                shuffle([...PLAYER_POOL]);


            room.players.forEach(player => {

                player.purse =
                    room.purse;

                player.squad = [];

            });


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


            io.to(code).emit(
                "errorMsg",
                "A player disconnected. The room is closed."
            );


            rooms.delete(code);

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
            ok: true
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

    }
);