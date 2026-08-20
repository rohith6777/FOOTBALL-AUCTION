const socket = io();

const $ = id => document.getElementById(id);
let mySlot = null;
let latest = null;

function toast(msg) {
  $("toast").textContent = msg;
  $("toast").style.display = "block";
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => $("toast").style.display = "none", 2200);
}

function show(id, yes=true) {
  $(id).classList.toggle("hidden", !yes);
}

$("createBtn").onclick = () => {
  const name = $("name").value.trim() || "Player 1";
  socket.emit("createRoom", { name, purse: $("purse").value });
};

$("joinBtn").onclick = () => {
  const code = $("roomCode").value.trim().toUpperCase();
  const name = $("joinName").value.trim() || "Player 2";
  socket.emit("joinRoom", { code, name });
};

$("startBtn").onclick = () => socket.emit("startAuction");
$("bidBtn").onclick = () => socket.emit("bid");
$("sellBtn").onclick = () => socket.emit("sell");
$("skipBtn").onclick = () => socket.emit("skip");
$("againBtn").onclick = () => socket.emit("playAgain");

$("copyBtn").onclick = async () => {
  await navigator.clipboard.writeText($("codeDisplay").textContent);
  toast("Room code copied!");
};

socket.on("roomCreated", code => {
  mySlot = 0;
  $("codeDisplay").textContent = code;
  $("roomPill").textContent = "ROOM " + code;
  show("lobby", false);
  show("waiting", true);
});

socket.on("joined", code => {
  mySlot = 1;
  $("codeDisplay").textContent = code;
  $("roomPill").textContent = "ROOM " + code;
  show("lobby", false);
  show("waiting", true);
});

socket.on("errorMsg", msg => toast(msg));

socket.on("tick", t => {
  $("timer").textContent = t;
});

socket.on("state", state => {
  latest = state;

  if (state.players.every(Boolean) && !state.started && !state.finished) {
    $("waitingText").textContent = "Both players are ready. Host can start the auction.";
    show("startBtn", mySlot === 0);
  } else if (!state.players[1]) {
    $("waitingText").textContent = "Waiting for your friend to join...";
    show("startBtn", false);
  }

  renderWaiting(state);

  if (state.started || state.finished) {
    show("waiting", false);
    show("auction", true);
    $("auctionRoom").textContent = "ROOM " + state.code;
    $("progress").textContent = state.finished
      ? `Auction Complete • ${state.total} players`
      : `Player ${Math.min(state.index, state.total)} / ${state.total}`;
  }

  renderTeams(state);

  if (state.current) {
    $("currentPlayer").textContent = state.current.name;
    $("currentBid").textContent = state.current.bid + " Cr";
    $("highestBidder").textContent =
      state.current.bidder === null ? "No bid" : state.players[state.current.bidder]?.name || "Unknown";
    $("timer").textContent = state.current.timeLeft;
    $("bidBtn").disabled = state.current.bidder === mySlot;
    $("bidBtn").textContent = state.current.bidder === mySlot ? "HIGHEST BID" : "BID +" + (state.current.bidder ? "1" : "1") + " Cr";
    $("sellBtn").disabled = !state.current.bidder;
    $("skipBtn").disabled = false;
  }

  if (state.finished) renderFinal(state);
});

function renderWaiting(state) {
  $("playersWait").innerHTML = state.players.map((p, i) => `
    <div class="wait-player">
      <div class="eyebrow">PLAYER ${i+1}</div>
      <strong>${p ? escapeHtml(p.name) : "Waiting..."}</strong>
      <div class="hint">${p ? state.purse + " Cr purse" : "Send the room code"}</div>
    </div>
  `).join("");
}

function renderTeams(state) {
  $("teams").innerHTML = state.players.filter(Boolean).map((p, i) => `
    <div class="team ${i === mySlot ? "you" : ""}">
      <div class="team-head">
        <div class="team-name">${escapeHtml(p.name)} ${i === mySlot ? "• YOU" : ""}</div>
        <div class="purse">${p.purse} Cr</div>
      </div>
      <div class="squad-list">
        ${p.squad.length ? p.squad.map(x => `${escapeHtml(x.name)} <span class="price">${x.price}Cr</span>`).join(" · ") : "No players bought yet"}
      </div>
    </div>
  `).join("");

  const totalSquad = state.players.reduce((n,p) => n + (p?.squad.length || 0), 0);
  $("squadCount").textContent = totalSquad + " bought";
  $("squads").innerHTML = `<div class="squad-grid">${
    state.players.filter(Boolean).map(p => `
      <div class="team">
        <div class="team-head"><strong>${escapeHtml(p.name)}</strong><span class="purse">${p.squad.length} players</span></div>
        ${p.squad.map(x => `<div class="player-row"><span>${escapeHtml(x.name)}</span><span class="price">${x.price} Cr</span></div>`).join("") || '<div class="hint">Squad is empty</div>'}
      </div>
    `).join("")
  }</div>`;
}

function renderFinal(state) {
  show("resultsCard", true);
  const [a,b] = state.players;
  const score = p => p.squad.reduce((sum,x) => sum + x.price, 0);
  const winner = a.squad.length === b.squad.length
    ? (score(a) >= score(b) ? a : b)
    : (a.squad.length > b.squad.length ? a : b);

  $("winner").innerHTML = `
    <div class="winner-box">
      <div class="crown">🏆</div>
      <div class="eyebrow">AUCTION WINNER</div>
      <div class="winner-name">${escapeHtml(winner.name)}</div>
      <div class="hint">More players acquired. Tie-breaker: total spending.</div>
    </div>`;

  $("finalStats").innerHTML = `<div class="final-grid">${state.players.map(p => `
    <div class="stat">
      <strong>${escapeHtml(p.name)}</strong>
      <div class="hint">${p.squad.length} players • ${p.purse} Cr left • ${state.purse - p.purse} Cr spent</div>
    </div>`).join("")}</div>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}