const socket = io();

const $ = id => document.getElementById(id);

let mySlot = null;
let latest = null;


// =====================================================
// TOAST
// =====================================================

function toast(message) {

    $("toast").textContent = message;

    $("toast").style.display = "block";

    clearTimeout(window.toastTimer);

    window.toastTimer = setTimeout(() => {

        $("toast").style.display = "none";

    }, 2200);

}


// =====================================================
// SHOW / HIDE
// =====================================================

function show(id, visible = true) {

    $(id).classList.toggle(
        "hidden",
        !visible
    );

}


// =====================================================
// RETURN TO LOBBY
// =====================================================

function lobby() {

    mySlot = null;

    latest = null;

    $("roomPill").textContent =
        "OFFLINE";

    show("lobby", true);
    show("waiting", false);
    show("auction", false);
    show("resultsCard", false);

}


// =====================================================
// CREATE ROOM
// =====================================================

$("createBtn").onclick = () => {

    const name =
        $("name").value.trim() ||
        "Player 1";

    const purse =
        $("purse").value;

    socket.emit(
        "createRoom",
        {
            name,
            purse
        }
    );

};


// =====================================================
// JOIN ROOM
// =====================================================

$("joinBtn").onclick = () => {

    const code =
        $("roomCode")
            .value
            .trim()
            .toUpperCase();

    const name =
        $("joinName")
            .value
            .trim() ||
        "Player 2";

    socket.emit(
        "joinRoom",
        {
            code,
            name
        }
    );

};


// =====================================================
// START
// =====================================================

$("startBtn").onclick = () => {

    socket.emit(
        "startAuction"
    );

};


// =====================================================
// BID
// =====================================================

$("bidBtn").onclick = () => {

    socket.emit(
        "bid"
    );

};


// =====================================================
// SOLD
// =====================================================

$("sellBtn").onclick = () => {

    socket.emit(
        "sell"
    );

};


// =====================================================
// SKIP
// =====================================================

$("skipBtn").onclick = () => {

    socket.emit(
        "skip"
    );

};


// =====================================================
// PAUSE / RESUME
// =====================================================

$("pauseBtn").onclick = () => {

    socket.emit(
        "togglePause"
    );

};


// =====================================================
// LEAVE
// =====================================================

$("leaveBtn").onclick = () => {

    if (
        !confirm(
            "Are you sure you want to leave the room?"
        )
    ) {

        return;

    }


    socket.emit(
        "leaveRoom"
    );


    lobby();

};


// =====================================================
// PLAY AGAIN
// =====================================================

$("againBtn").onclick = () => {

    socket.emit(
        "playAgain"
    );

};


// =====================================================
// COPY ROOM CODE
// =====================================================

$("copyBtn").onclick = async () => {

    try {

        await navigator.clipboard.writeText(
            $("codeDisplay").textContent
        );

        toast(
            "Room code copied!"
        );

    }

    catch {

        toast(
            "Copy failed. Copy it manually."
        );

    }

};


// =====================================================
// CONNECTED
// =====================================================

socket.on(
    "connect",
    () => {

        $("roomPill").textContent =
            "ONLINE";

    }
);


// =====================================================
// DISCONNECTED
// =====================================================

socket.on(
    "disconnect",
    () => {

        $("roomPill").textContent =
            "OFFLINE";

    }
);


// =====================================================
// ROOM CREATED
// =====================================================

socket.on(
    "roomCreated",
    code => {

        mySlot = 0;

        $("codeDisplay").textContent =
            code;

        $("roomPill").textContent =
            "ROOM " + code;

        show("lobby", false);

        show("waiting", true);

    }
);


// =====================================================
// ROOM JOINED
// =====================================================

socket.on(
    "joined",
    code => {

        mySlot = 1;

        $("codeDisplay").textContent =
            code;

        $("roomPill").textContent =
            "ROOM " + code;

        show("lobby", false);

        show("waiting", true);

    }
);


// =====================================================
// SERVER ERROR
// =====================================================

socket.on(
    "errorMsg",
    message => {

        toast(message);

        if (
            message.includes(
                "room is closed"
            )
        ) {

            lobby();

        }

    }
);


// =====================================================
// LIVE TIMER
// =====================================================

socket.on(
    "tick",
    time => {

        if (
            latest &&
            latest.paused
        ) {

            $("timer").textContent =
                "PAUSED";

            return;

        }


        $("timer").textContent =
            time;

    }
);


// =====================================================
// MAIN STATE
// =====================================================

socket.on(
    "state",
    state => {

        latest = state;


        // ---------------------------------------------
        // WAITING ROOM
        // ---------------------------------------------

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

        else if (
            !state.players[1]
        ) {

            $("waitingText").textContent =
                "Waiting for your friend to join...";

            show(
                "startBtn",
                false
            );

        }


        renderWaiting(state);


        // ---------------------------------------------
        // AUCTION
        // ---------------------------------------------

        if (
            state.started ||
            state.finished
        ) {

            show(
                "waiting",
                false
            );

            show(
                "auction",
                true
            );


            $("auctionRoom").textContent =
                "ROOM " + state.code;


            $("progress").textContent =
                state.finished

                    ? `Auction Complete • ${state.total} players`

                    : `Player ${
                        Math.min(
                            state.index,
                            state.total
                        )
                    } / ${state.total}`;

        }


        // ---------------------------------------------
        // TEAMS
        // ---------------------------------------------

        renderTeams(state);


        // ---------------------------------------------
        // CURRENT PLAYER
        // ---------------------------------------------

        if (
            state.current
        ) {

            $("currentPlayer").textContent =
                state.current.name;


            $("currentBid").textContent =
                state.current.bid +
                " Cr";


            $("highestBidder").textContent =

                state.current.bidder === null

                    ? "No bid"

                    : state.players[
                        state.current.bidder
                    ]?.name || "Unknown";


            // -----------------------------------------
            // AUTHORITATIVE SERVER TIMER
            // -----------------------------------------

            $("timer").textContent =

                state.paused

                    ? "PAUSED"

                    : state.current.timeLeft;


            // -----------------------------------------
            // BID BUTTON
            // -----------------------------------------

            const alreadyHighest =
                state.current.bidder === mySlot;


            $("bidBtn").disabled =
                state.paused ||
                alreadyHighest;


            $("bidBtn").textContent =

                alreadyHighest

                    ? "HIGHEST BID"

                    : "BID +1 Cr";


            // -----------------------------------------
            // SOLD
            // -----------------------------------------

            $("sellBtn").disabled =

                state.paused ||
                state.current.bidder === null;


            // -----------------------------------------
            // SKIP
            // -----------------------------------------

            $("skipBtn").disabled =
                state.paused;


            // -----------------------------------------
            // PAUSE BUTTON
            // -----------------------------------------

            $("pauseBtn").disabled =
                mySlot !== 0;


            $("pauseBtn").textContent =

                state.paused

                    ? "▶ RESUME"

                    : "⏸ PAUSE";

        }


        // ---------------------------------------------
        // FINAL
        // ---------------------------------------------

        if (
            state.finished
        ) {

            renderFinal(state);

        }

    }
);


// =====================================================
// WAITING PLAYERS
// =====================================================

function renderWaiting(state) {

    $("playersWait").innerHTML =
        state.players
            .map(
                (player, index) => `

                    <div class="wait-player">

                        <div class="eyebrow">
                            PLAYER ${index + 1}
                        </div>

                        <strong>
                            ${
                                player
                                    ? escapeHtml(player.name)
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

                `
            )
            .join("");

}


// =====================================================
// TEAMS
// =====================================================

function renderTeams(state) {

    $("teams").innerHTML =
        state.players
            .filter(Boolean)
            .map(
                (player, index) => `

                    <div class="team ${
                        index === mySlot
                            ? "you"
                            : ""
                    }">

                        <div class="team-head">

                            <div class="team-name">

                                ${escapeHtml(
                                    player.name
                                )}

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
                                        .map(
                                            item => `

                                                ${escapeHtml(
                                                    item.name
                                                )}

                                                <span class="price">
                                                    ${item.price}Cr
                                                </span>

                                            `
                                        )
                                        .join(" · ")

                                    : "No players bought yet"
                            }

                        </div>

                    </div>

                `
            )
            .join("");


    const totalSquad =
        state.players.reduce(
            (total, player) =>
                total +
                (
                    player?.squad.length ||
                    0
                ),
            0
        );


    $("squadCount").textContent =
        totalSquad + " bought";


    $("squads").innerHTML = `

        <div class="squad-grid">

            ${
                state.players
                    .filter(Boolean)
                    .map(
                        player => `

                            <div class="team">

                                <div class="team-head">

                                    <strong>
                                        ${escapeHtml(
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
                                        .map(
                                            item => `

                                                <div class="player-row">

                                                    <span>
                                                        ${escapeHtml(
                                                            item.name
                                                        )}
                                                    </span>

                                                    <span class="price">
                                                        ${item.price}
                                                        Cr
                                                    </span>

                                                </div>

                                            `
                                        )
                                        .join("")

                                    ||

                                    `
                                        <div class="hint">
                                            Squad is empty
                                        </div>
                                    `
                                }

                            </div>

                        `
                    )
                    .join("")
            }

        </div>

    `;

}


// =====================================================
// FINAL RESULT
// =====================================================

function renderFinal(state) {

    show(
        "resultsCard",
        true
    );


    const [a, b] =
        state.players;


    if (!a || !b) {

        return;

    }


    const spending =
        player =>
            player.squad.reduce(
                (sum, item) =>
                    sum + item.price,
                0
            );


    let winner;


    if (
        a.squad.length >
        b.squad.length
    ) {

        winner = a;

    }

    else if (
        b.squad.length >
        a.squad.length
    ) {

        winner = b;

    }

    else {

        winner =
            spending(a) >=
            spending(b)
                ? a
                : b;

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
                ${escapeHtml(
                    winner.name
                )}
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
                    .map(
                        player => `

                            <div class="stat">

                                <strong>
                                    ${escapeHtml(
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

                        `
                    )
                    .join("")
            }

        </div>

    `;

}


// =====================================================
// HTML ESCAPE
// =====================================================

function escapeHtml(value) {

    return String(value).replace(
        /[&<>"']/g,
        character => ({

            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"

        }[character])
    );

}