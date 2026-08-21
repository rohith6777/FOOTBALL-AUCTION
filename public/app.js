const socket = io();

const $ = (id) => document.getElementById(id);

let mySlot = null;
let latest = null;


// ===============================
// TOAST MESSAGE
// ===============================

function toast(message) {

    $("toast").textContent = message;
    $("toast").style.display = "block";

    clearTimeout(window.toastTimer);

    window.toastTimer = setTimeout(() => {
        $("toast").style.display = "none";
    }, 2200);
}


// ===============================
// SHOW / HIDE
// ===============================

function show(id, visible = true) {

    $(id).classList.toggle("hidden", !visible);

}


// ===============================
// RETURN TO LOBBY
// ===============================

function lobby() {

    mySlot = null;
    latest = null;

    $("roomPill").textContent = "OFFLINE";

    show("lobby", true);
    show("waiting", false);
    show("auction", false);
    show("resultsCard", false);
}


// ===============================
// CREATE ROOM
// ===============================

$("createBtn").onclick = () => {

    const name =
        $("name").value.trim() || "Player 1";

    const purse =
        $("purse").value;

    socket.emit("createRoom", {
        name,
        purse
    });

};


// ===============================
// JOIN ROOM
// ===============================

$("joinBtn").onclick = () => {

    const code =
        $("roomCode").value.trim().toUpperCase();

    const name =
        $("joinName").value.trim() || "Player 2";

    socket.emit("joinRoom", {
        code,
        name
    });

};


// ===============================
// START AUCTION
// ===============================

$("startBtn").onclick = () => {

    socket.emit("startAuction");

};


// ===============================
// BID
// ===============================

$("bidBtn").onclick = () => {

    socket.emit("bid");

};


// ===============================
// SELL
// ===============================

$("sellBtn").onclick = () => {

    socket.emit("sell");

};


// ===============================
// SKIP
// ===============================

$("skipBtn").onclick = () => {

    socket.emit("skip");

};


// ===============================
// PAUSE / RESUME
// ===============================

$("pauseBtn").onclick = () => {

    socket.emit("togglePause");

};


// ===============================
// LEAVE ROOM
// ===============================

$("leaveBtn").onclick = () => {

    const confirmed =
        confirm("Are you sure you want to leave the room?");

    if (!confirmed) {
        return;
    }

    socket.emit("leaveRoom");

    lobby();

};


// ===============================
// PLAY AGAIN
// ===============================

$("againBtn").onclick = () => {

    socket.emit("playAgain");

};


// ===============================
// COPY ROOM CODE
// ===============================

$("copyBtn").onclick = async () => {

    try {

        await navigator.clipboard.writeText(
            $("codeDisplay").textContent
        );

        toast("Room code copied!");

    } catch {

        toast("Copy failed. Copy it manually.");

    }

};


// ===============================
// SOCKET CONNECT
// ===============================

socket.on("connect", () => {

    $("roomPill").textContent = "ONLINE";

});


// ===============================
// SOCKET DISCONNECT
// ===============================

socket.on("disconnect", () => {

    $("roomPill").textContent = "OFFLINE";

});


// ===============================
// ROOM CREATED
// ===============================

socket.on("roomCreated", (code) => {

    mySlot = 0;

    $("codeDisplay").textContent = code;

    $("roomPill").textContent =
        "ROOM " + code;

    show("lobby", false);
    show("waiting", true);

});


// ===============================
// ROOM JOINED
// ===============================

socket.on("joined", (code) => {

    mySlot = 1;

    $("codeDisplay").textContent = code;

    $("roomPill").textContent =
        "ROOM " + code;

    show("lobby", false);
    show("waiting", true);

});


// ===============================
// ERROR MESSAGE
// ===============================

socket.on("errorMsg", (message) => {

    toast(message);

    if (
        message.includes("left the room") ||
        message.includes("disconnected")
    ) {

        lobby();

    }

});


// ===============================
// TIMER TICK
// ===============================

socket.on("tick", (time) => {

    if (!latest?.paused) {

        $("timer").textContent = time;

    }

});


// ===============================
// MAIN GAME STATE
// ===============================

socket.on("state", (state) => {

    latest = state;


    // -------------------------------
    // WAITING ROOM
    // -------------------------------

    if (
        state.players.every(Boolean) &&
        !state.started &&
        !state.finished
    ) {

        $("waitingText").textContent =
            "Both players are ready. Host can start the auction.";

        show(
            "startBtn",
            mySlot === 0
        );

    }

    else if (!state.players[1]) {

        $("waitingText").textContent =
            "Waiting for your friend to join...";

        show("startBtn", false);

    }


    renderWaiting(state);


    // -------------------------------
    // AUCTION SCREEN
    // -------------------------------

    if (
        state.started ||
        state.finished
    ) {

        show("waiting", false);
        show("auction", true);

        $("auctionRoom").textContent =
            "ROOM " + state.code;

        $("progress").textContent =
            state.finished
                ? `Auction Complete • ${state.total} players`
                : `Player ${Math.min(
                    state.index,
                    state.total
                )} / ${state.total}`;

    }


    // -------------------------------
    // TEAMS
    // -------------------------------

    renderTeams(state);


    // -------------------------------
    // CURRENT PLAYER
    // -------------------------------

    if (state.current) {

        $("currentPlayer").textContent =
            state.current.name;

        $("currentBid").textContent =
            state.current.bid + " Cr";

        $("highestBidder").textContent =
            state.current.bidder === null
                ? "No bid"
                : state.players[
                    state.current.bidder
                  ]?.name || "Unknown";


        // IMPORTANT:
        // The timer comes from the server.
        // Every new bid resets it to 10.

        $("timer").textContent =
            state.paused
                ? "PAUSED"
                : state.current.timeLeft;


        const highestBid =
            state.current.bidder === mySlot;


        $("bidBtn").disabled =
            state.paused || highestBid;


        $("bidBtn").textContent =
            highestBid
                ? "HIGHEST BID"
                : "BID +1 Cr";


        $("sellBtn").disabled =
            state.paused ||
            state.current.bidder === null;


        $("skipBtn").disabled =
            state.paused;


        $("pauseBtn").textContent =
            state.paused
                ? "▶ RESUME"
                : "⏸ PAUSE";


        $("pauseBtn").disabled =
            mySlot !== 0;

    }


    // -------------------------------
    // FINAL RESULTS
    // -------------------------------

    if (state.finished) {

        renderFinal(state);

    }

});


// ===============================
// WAITING ROOM PLAYERS
// ===============================

function renderWaiting(state) {

    $("playersWait").innerHTML =
        state.players
            .map((player, index) => {

                return `
                    <div class="wait-player">

                        <div class="eyebrow">
                            PLAYER ${index + 1}
                        </div>

                        <strong>
                            ${
                                player
                                    ? escapeHTML(player.name)
                                    : "Waiting..."
                            }
                        </strong>

                        <div class="hint">
                            ${
                                player
                                    ? state.purse + " Cr purse"
                                    : "Send the room code"
                            }
                        </div>

                    </div>
                `;

            })
            .join("");

}


// ===============================
// TEAM DISPLAY
// ===============================

function renderTeams(state) {

    $("teams").innerHTML =
        state.players
            .filter(Boolean)
            .map((player, index) => {

                return `
                    <div class="team ${
                        index === mySlot
                            ? "you"
                            : ""
                    }">

                        <div class="team-head">

                            <div class="team-name">

                                ${escapeHTML(player.name)}

                                ${
                                    index === mySlot
                                        ? " • YOU"
                                        : ""
                                }

                            </div>

                            <div class="purse">

                                ${player.purse} Cr

                            </div>

                        </div>


                        <div class="squad-list">

                            ${
                                player.squad.length

                                    ? player.squad
                                        .map(playerData => {

                                            return `
                                                ${escapeHTML(
                                                    playerData.name
                                                )}

                                                <span class="price">
                                                    ${playerData.price}Cr
                                                </span>
                                            `;

                                        })
                                        .join(" · ")

                                    : "No players bought yet"
                            }

                        </div>

                    </div>
                `;

            })
            .join("");


    // Number of bought players

    const totalBought =
        state.players.reduce(
            (total, player) =>
                total +
                (player?.squad.length || 0),
            0
        );


    $("squadCount").textContent =
        totalBought + " bought";


    // Detailed squads

    $("squads").innerHTML = `

        <div class="squad-grid">

            ${
                state.players
                    .filter(Boolean)
                    .map(player => {

                        return `

                            <div class="team">

                                <div class="team-head">

                                    <strong>
                                        ${escapeHTML(
                                            player.name
                                        )}
                                    </strong>

                                    <span class="purse">
                                        ${player.squad.length}
                                        players
                                    </span>

                                </div>


                                ${
                                    player.squad
                                        .map(playerData => {

                                            return `

                                                <div class="player-row">

                                                    <span>
                                                        ${escapeHTML(
                                                            playerData.name
                                                        )}
                                                    </span>

                                                    <span class="price">
                                                        ${playerData.price}
                                                        Cr
                                                    </span>

                                                </div>

                                            `;

                                        })
                                        .join("")

                                    ||

                                    `
                                        <div class="hint">
                                            Squad is empty
                                        </div>
                                    `
                                }

                            </div>

                        `;

                    })
                    .join("")
            }

        </div>

    `;

}


// ===============================
// FINAL RESULT
// ===============================

function renderFinal(state) {

    show("resultsCard", true);


    const player1 =
        state.players[0];

    const player2 =
        state.players[1];


    if (!player1 || !player2) {

        return;

    }


    // Calculate total spending

    function spending(player) {

        return player.squad.reduce(
            (total, playerData) =>
                total + playerData.price,
            0
        );

    }


    /*
        Main winner rule:

        1. Most players bought wins.

        2. If both have the same number,
           the player who spent more wins.
    */

    let winner;


    if (
        player1.squad.length >
        player2.squad.length
    ) {

        winner = player1;

    }

    else if (
        player2.squad.length >
        player1.squad.length
    ) {

        winner = player2;

    }

    else {

        winner =
            spending(player1) >=
            spending(player2)
                ? player1
                : player2;

    }


    $("winner").innerHTML = `

        <div class="winner-box">

            <div class="crown">
                🏆
            </div>

            <div class="eyebrow">
                AUCTION WINNER
            </div>

            <div class="winner-name">
                ${escapeHTML(winner.name)}
            </div>

            <div class="hint">
                More players acquired.
                Tie-breaker: total spending.
            </div>

        </div>

    `;


    $("finalStats").innerHTML = `

        <div class="final-grid">

            ${
                state.players
                    .map(player => {

                        return `

                            <div class="stat">

                                <strong>
                                    ${escapeHTML(
                                        player.name
                                    )}
                                </strong>

                                <div class="hint">

                                    ${player.squad.length}
                                    players

                                    •

                                    ${player.purse}
                                    Cr left

                                    •

                                    ${
                                        state.purse -
                                        player.purse
                                    }
                                    Cr spent

                                </div>

                            </div>

                        `;

                    })
                    .join("")
            }

        </div>

    `;

}


// ===============================
// HTML SAFETY
// ===============================

function escapeHTML(value) {

    return String(value).replace(
        /[&<>"']/g,
        character => {

            return {

                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"

            }[character];

        }
    );

}