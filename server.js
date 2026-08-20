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

const PLAYERS = [
"Pelé","Lionel Messi","Cristiano Ronaldo","Diego Maradona","Johan Cruyff","Franz Beckenbauer","Zinedine Zidane","Ronaldo Nazário","Ronaldinho","Alfredo Di Stéfano",
"Ferenc Puskás","Garrincha","Michel Platini","George Best","Eusébio","Paolo Maldini","Xavi","Andrés Iniesta","Lev Yashin","Bobby Charlton",
"Marco van Basten","Romário","Gerd Müller","Franco Baresi","Ronald Koeman","Lothar Matthäus","Roberto Baggio","Thierry Henry","Kaká","Luis Suárez",
"Neymar","Luka Modrić","Sergio Ramos","Manuel Neuer","Iker Casillas","Gianluigi Buffon","Cafu","Roberto Carlos","Philipp Lahm","Andrea Pirlo",
"Steven Gerrard","Frank Lampard","Paul Scholes","Kevin De Bruyne","Eden Hazard","Arjen Robben","Franck Ribéry","Mohamed Salah","Karim Benzema","Robert Lewandowski",
"Erling Haaland","Kylian Mbappé","Virgil van Dijk","Sergio Busquets","Sergio Agüero","Didier Drogba","Samuel Eto'o","David Villa","Wayne Rooney","Zlatan Ibrahimović",
"George Weah","Andriy Shevchenko","Ruud van Nistelrooy","Dennis Bergkamp","Eric Cantona","Alan Shearer","Gary Lineker","Raúl","David Beckham","Ryan Giggs",
"Patrick Vieira","Claude Makélélé","Roy Keane","Nemanja Vidić","John Terry","Carles Puyol","Fabio Cannavaro","Alessandro Nesta","Javier Zanetti","Dani Alves",
"Marcelo","Ashley Cole","Lilian Thuram","Jaap Stam","Rio Ferdinand","John Stones","Kevin Keegan","Kenny Dalglish","Ian Rush","Luis Figo",
"Michael Laudrup","Hristo Stoichkov","Andriy Yarmolenko","Socrates","Zico","Rivaldo","Cafu","Didi","Nilton Santos","Carlos Alberto",
"Rivelino","Jairzinho","Tostão","Gerson","Mario Kempes","Daniel Passarella","Gabriel Batistuta","Javier Saviola","Juan Román Riquelme","Pablo Aimar",
"Juan Sebastián Verón","Hernán Crespo","Jorge Valdano","Fernando Redondo","Esteban Cambiasso","Javier Mascherano","Ángel Di María","Santi Cazorla","David Silva","Xabi Alonso",
"Mesut Özil","Toni Kroos","Bastian Schweinsteiger","Thomas Müller","Miroslav Klose","Philipp Lahm","Arjen Robben","Wesley Sneijder","Clarence Seedorf","Edgar Davids",
"Ruud Gullit","Frank Rijkaard","Dennis Wise","Patrick Kluivert","Edwin van der Sar","Petr Čech","Oliver Kahn","Dino Zoff","Walter Zenga","Gordon Banks",
"Peter Schmeichel","Hugo Sánchez","Johan Neeskens","Marco Tardelli","Andrea Barzagli","Giorgio Chiellini","Leonardo Bonucci","Thiago Silva","Marquinhos","Casemiro",
"Fernandinho","Rodri","N'Golo Kanté","Paul Pogba","Yaya Touré","Cesc Fàbregas","David Trezeguet","Fernando Torres","Antoine Griezmann","Harry Kane",
"Son Heung-min","Sadio Mané","Riyad Mahrez","Vinícius Júnior","Rodrygo","Phil Foden","Bukayo Saka","Jude Bellingham","Pedri","Gavi",
"Bernardo Silva","Bruno Fernandes","Martin Ødegaard","Luis Suárez Miramontes","Héctor Chumpitaz","Teófilo Cubillas","Elias Figueroa","Obdulio Varela","José Nasazzi","Josef Masopust",
"Raymond Kopa","Just Fontaine","Sándor Kocsis","László Kubala","Gunnar Nordahl","Davor Šuker","George Weah","Rui Costa","Deco","Ricardo Carvalho"
];

// Remove duplicates while preserving order.
const PLAYER_POOL = [...new Set(PLAYERS)];

function makeRoom(code, purse) {
  return {
    code,
    purse,
    players: [null, null],
    started: false,
    finished: false,
    index: 0,
    current: null,
    timer: null,
    timeLeft: 10,
    playerQueue: shuffle([...PLAYER_POOL]),
    results: [],
    createdAt: Date.now()
  };
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function publicState(room) {
  return {
    code: room.code,
    purse: room.purse,
    players: room.players.map(p => p && ({
      id: p.id,
      name: p.name,
      purse: p.purse,
      squad: p.squad
    })),
    started: room.started,
    finished: room.finished,
    index: room.index,
    total: room.playerQueue.length,
    current: room.current && {
      name: room.current.name,
      base: room.current.base,
      bid: room.current.bid,
      bidder: room.current.bidder,
      timeLeft: room.timeLeft
    },
    results: room.results
  };
}

function emitState(room) {
  io.to(room.code).emit("state", publicState(room));
}

function stopTimer(room) {
  if (room.timer) clearInterval(room.timer);
  room.timer = null;
}

function nextPlayer(room) {
  stopTimer(room);

  if (room.index >= room.playerQueue.length) {
    room.finished = true;
    room.started = false;
    room.current = null;
    emitState(room);
    return;
  }

  const name = room.playerQueue[room.index++];
  room.current = {
    name,
    base: 1,
    bid: 1,
    bidder: null
  };
  room.timeLeft = 10;
  emitState(room);

  room.timer = setInterval(() => {
    room.timeLeft -= 1;
    io.to(room.code).emit("tick", room.timeLeft);

    if (room.timeLeft <= 0) {
      sellOrSkip(room, room.current.bidder ? "sold" : "skip");
    }
  }, 1000);
}

function sellOrSkip(room, action) {
  stopTimer(room);
  if (!room.current) return;

  const c = room.current;

  if (action === "sold" && c.bidder) {
    const buyer = room.players[c.bidder];
    if (buyer && buyer.purse >= c.bid) {
      buyer.purse -= c.bid;
      buyer.squad.push({ name: c.name, price: c.bid });
      room.results.push({
        player: c.name,
        status: "SOLD",
        team: buyer.name,
        price: c.bid
      });
    } else {
      room.results.push({ player: c.name, status: "SKIPPED", team: null, price: 0 });
    }
  } else {
    room.results.push({ player: c.name, status: "SKIPPED", team: null, price: 0 });
  }

  room.current = null;
  emitState(room);
  setTimeout(() => {
    if (room.started && !room.finished) nextPlayer(room);
  }, 700);
}

io.on("connection", socket => {
  socket.on("createRoom", ({ name, purse }) => {
    purse = Number(purse);
    if (![100, 200, 300].includes(purse)) return socket.emit("errorMsg", "Choose 100, 200 or 300 Cr.");
    let code;
    do code = Math.random().toString(36).slice(2, 7).toUpperCase(); while (rooms.has(code));

    const room = makeRoom(code, purse);
    room.players[0] = { id: socket.id, name: String(name || "Player 1").slice(0, 20), purse, squad: [] };
    rooms.set(code, room);
    socket.join(code);
    socket.data.room = code;
    socket.data.slot = 0;
    socket.emit("roomCreated", code);
    emitState(room);
  });

  socket.on("joinRoom", ({ code, name }) => {
    code = String(code || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return socket.emit("errorMsg", "Room not found.");
    if (room.players[1]) return socket.emit("errorMsg", "This room already has 2 players.");
    if (room.started) return socket.emit("errorMsg", "Auction has already started.");

    room.players[1] = { id: socket.id, name: String(name || "Player 2").slice(0, 20), purse: room.purse, squad: [] };
    socket.join(code);
    socket.data.room = code;
    socket.data.slot = 1;
    socket.emit("joined", code);
    emitState(room);
  });

  socket.on("startAuction", () => {
    const room = rooms.get(socket.data.room);
    if (!room || socket.data.slot !== 0) return;
    if (!room.players[1]) return socket.emit("errorMsg", "Your friend must join first.");
    if (room.started) return;

    room.started = true;
    room.finished = false;
    room.index = 0;
    room.results = [];
    room.playerQueue = shuffle([...PLAYER_POOL]);
    room.players.forEach(p => { p.purse = room.purse; p.squad = []; });
    nextPlayer(room);
  });

  socket.on("bid", () => {
    const room = rooms.get(socket.data.room);
    if (!room || !room.started || !room.current) return;
    const p = room.players[socket.data.slot];
    if (!p) return;

    const nextBid = room.current.bidder ? room.current.bid + 1 : room.current.base;
    if (p.purse < nextBid) return socket.emit("errorMsg", "Not enough purse.");

    // If you're already the highest bidder, clicking again does nothing.
    if (room.current.bidder === socket.data.slot) return;

    room.current.bid = nextBid;
    room.current.bidder = socket.data.slot;

// Reset timer whenever someone places a successful bid
    room.timeLeft = 10;

    emitState(room);
  });

  socket.on("skip", () => {
    const room = rooms.get(socket.data.room);
    if (!room || !room.started || !room.current) return;
    sellOrSkip(room, "skip");
  });

  socket.on("sell", () => {
    const room = rooms.get(socket.data.room);
    if (!room || !room.started || !room.current) return;
    if (!room.current.bidder) return socket.emit("errorMsg", "No one has bid yet.");
    sellOrSkip(room, "sold");
  });

  socket.on("playAgain", () => {
    const room = rooms.get(socket.data.room);
    if (!room || socket.data.slot !== 0 || !room.players[1]) return;
    stopTimer(room);
    room.started = true;
    room.finished = false;
    room.index = 0;
    room.results = [];
    room.current = null;
    room.playerQueue = shuffle([...PLAYER_POOL]);
    room.players.forEach(p => { p.purse = room.purse; p.squad = []; });
    nextPlayer(room);
  });

  socket.on("disconnect", () => {
    const code = socket.data.room;
    const room = rooms.get(code);
    if (!room) return;
    stopTimer(room);
    io.to(code).emit("errorMsg", "A player disconnected. The room is closed.");
    rooms.delete(code);
  });
});

app.get("/health", (_, res) => res.json({ ok: true }));

server.listen(PORT, () => {
  console.log(`Football Auction running on http://localhost:${PORT}`);
});