const socket = io();

const $ = id => document.getElementById(id);

let mySlot = null;
let latest = null;
let selectedBidAmount = 100;


// =====================================================
// SAFE HELPERS
// =====================================================

function el(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const element = el(id);

    if (element) {
        element.textContent = value;
    }
}

function setHTML(id, value) {
    const element = el(id);

    if (element) {
        element.innerHTML = value;
    }
}

function setDisplay(id, visible) {
    const element = el(id);

    if (element) {
        element.classList.toggle("hidden", !visible);
    }
}


// =====================================================
// TOAST
// =====================================================

function toast(message) {

    const toastElement = el("toast");

    if (!toastElement) {
        alert(message);
        return;
    }

    toastElement.textContent = message;
    toastElement.style.display = "block";

    clearTimeout(window.toastTimer);

    window.toastTimer = setTimeout(() => {

        toastElement.style.display = "none";

    }, 2200);

}


// =====================================================
// SHOW / HIDE
// =====================================================

function show(id, visible = true) {

    const element = el(id);

    if (!element) {
        return;
    }

    element.classList.toggle(
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

    setText(
        "roomPill",
        "OFFLINE"
    );

    show("lobby", true);
    show("waiting", false);
    show("auction", false);
    show("resultsCard", false);

}


// =====================================================
// CREATE ROOM
// =====================================================

const createBtn = el("createBtn");

if (createBtn) {

    createBtn.onclick = () => {

        const name =
            el("name")?.value.trim() ||
            "Player 1";

        const purse =
            el("purse")?.value;

        socket.emit(
            "createRoom",
            {
                name,
                purse
            }
        );

    };

}


// =====================================================
// JOIN ROOM
// =====================================================

const joinBtn = el("joinBtn");

if (joinBtn) {

    joinBtn.onclick = () => {

        const code =
            el("roomCode")
                ?.value
                .trim()
                .toUpperCase();

        const name =
            el("joinName")
                ?.value
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

}


// =====================================================
// START
// =====================================================

const startBtn = el("startBtn");

if (startBtn) {

    startBtn.onclick = () => {

        socket.emit(
            "startAuction"
        );

    };

}


// =====================================================
// BID BUTTON
// =====================================================

const bidBtn = el("bidBtn");

if (bidBtn) {

    bidBtn.onclick = () => {

        socket.emit(
            "bid",
            {
                amount: selectedBidAmount
            }
        );

    };

}


// =====================================================
// SOLD
// =====================================================

const sellBtn = el("sellBtn");

if (sellBtn) {

    sellBtn.onclick = () => {

        socket.emit(
            "sell"
        );

    };

}


// =====================================================
// SKIP
// =====================================================

const skipBtn = el("skipBtn");

if (skipBtn) {

    skipBtn.onclick = () => {

        socket.emit(
            "skip"
        );

    };

}


// =====================================================
// PAUSE / RESUME
// =====================================================

const pauseBtn = el("pauseBtn");

if (pauseBtn) {

    pauseBtn.onclick = () => {

        socket.emit(
            "togglePause"
        );

    };

}


// =====================================================
// LEAVE
// =====================================================

const leaveBtn = el("leaveBtn");

if (leaveBtn) {

    leaveBtn.onclick = () => {

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

}


// =====================================================
// PLAY AGAIN
// =====================================================

const againBtn = el("againBtn");

if (againBtn) {

    againBtn.onclick = () => {

        socket.emit(
            "playAgain"
        );

    };

}


// =====================================================
// COPY ROOM CODE
// =====================================================

const copyBtn = el("copyBtn");

if (copyBtn) {

    copyBtn.onclick = async () => {

        try {

            await navigator.clipboard.writeText(
                el("codeDisplay")?.textContent || ""
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

}


// =====================================================
// CONNECTED
// =====================================================

socket.on(
    "connect",
    () => {

        setText(
            "roomPill",
            "ONLINE"
        );

    }
);


// =====================================================
// DISCONNECTED
// =====================================================

socket.on(
    "disconnect",
    () => {

        setText(
            "roomPill",
            "OFFLINE"
        );

    }
);


// =====================================================
// ROOM CREATED
// =====================================================

socket.on(
    "roomCreated",
    code => {

        mySlot = 0;

        setText(
            "codeDisplay",
            code
        );

        setText(
            "roomPill",
            "ROOM " + code
        );

        show(
            "lobby",
            false
        );

        show(
            "waiting",
            true
        );

    }
);


// =====================================================
// ROOM JOINED
// =====================================================

socket.on(
    "joined",
    code => {

        /*
         * Server assigns the actual slot.
         * We don't force slot = 1 here.
         */

        setText(
            "codeDisplay",
            code
        );

        setText(
            "roomPill",
            "ROOM " + code
        );

        show(
            "lobby",
            false
        );

        show(
            "waiting",
            true
        );

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
            String(message)
                .toLowerCase()
                .includes("room closed")
        ) {

            lobby();

        }

    }
);


// =====================================================
// ROOM CLOSED
// =====================================================

socket.on(
    "roomClosed",
    () => {

        toast(
            "Room closed."
        );

        lobby();

    }
);


// =====================================================
// DISCONNECTED PLAYER
// =====================================================

socket.on(
    "playerDisconnected",
    data => {

        if (!data) {
            return;
        }

        toast(
            `${data.name || "A player"} disconnected.`
        );

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

            setText(
                "timer",
                "PAUSED"
            );

            return;

        }

        setText(
            "timer",
            time
        );

    }
);


// =====================================================
// MAIN STATE
// =====================================================

socket.on(
    "state",
    state => {

        latest = state;

        /*
         * Find our real slot from the server state.
         */

        if (
            state.players
        ) {

            const found =
                state.players.findIndex(
                    player =>
                        player &&
                        player.id === socket.id
                );

            if (found !== -1) {

                mySlot = found;

            }

        }


        // ---------------------------------------------
        // WAITING ROOM
        // ---------------------------------------------

        renderWaiting(
            state
        );


        if (
            !state.started &&
            !state.finished
        ) {

            show(
                "waiting",
                true
            );

            show(
                "auction",
                false
            );

            const activePlayers =
                state.players
                    .filter(Boolean)
                    .length;

            if (
                activePlayers >= 2
            ) {

                setText(
                    "waitingText",
                    `${activePlayers}/5 players ready. Host can start the auction.`
                );

                show(
                    "startBtn",
                    mySlot === 0
                );

            }
            else {

                setText(
                    "waitingText",
                    "Waiting for at least one more player to join..."
                );

                show(
                    "startBtn",
                    false
                );

            }

        }


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

            setText(
                "auctionRoom",
                "ROOM " + state.code
            );


            setText(
                "progress",
                state.finished

                    ? `Auction Complete • ${state.total} players`

                    : `Player ${
                        Math.min(
                            state.index,
                            state.total
                        )
                    } / ${state.total}`
            );

        }


        // ---------------------------------------------
        // TEAMS
        // ---------------------------------------------

        renderTeams(
            state
        );


        // ---------------------------------------------
        // CURRENT PLAYER
        // ---------------------------------------------

        if (
            state.current
        ) {

            setText(
                "currentPlayer",
                state.current.name
            );

            setText(
                "currentPosition",
                state.current.position
            );

            setText(
                "currentBid",
                formatMoney(
                    state.current.bid
                )
            );


            const bidder =
                state.current.bidder;

            setText(
                "highestBidder",

                bidder === null ||
                bidder === undefined

                    ? "No bid"

                    : state.players[
                        bidder
                    ]?.name ||
                    "Unknown"
            );


            // -----------------------------------------
            // AUTHORITATIVE SERVER TIMER
            // -----------------------------------------

            setText(
                "timer",

                state.paused
                    ? "PAUSED"
                    : state.current.timeLeft
            );


            // -----------------------------------------
            // BID BUTTON
            // -----------------------------------------

            const alreadyHighest =
                state.current.bidder ===
                mySlot;


            if (bidBtn) {

                bidBtn.disabled =
                    state.paused ||
                    alreadyHighest ||
                    state.finished;


                bidBtn.textContent =
                    alreadyHighest

                        ? "HIGHEST BID"

                        : `BID ${formatMoney(
                            selectedBidAmount
                        )}`;

            }


            // -----------------------------------------
            // SOLD
            // -----------------------------------------

            if (sellBtn) {

                sellBtn.disabled =
                    state.paused ||
                    state.current.bidder === null ||
                    mySlot !== 0;

            }


            // -----------------------------------------
            // SKIP
            // -----------------------------------------

            if (skipBtn) {

                skipBtn.disabled =
                    state.paused ||
                    state.finished;

                const votes =
                    state.skipVotes || 0;

                const required =
                    state.skipRequired ||
                    state.players.filter(Boolean).length;

                skipBtn.textContent =
                    votes > 0
                        ? `SKIP (${votes}/${required})`
                        : "SKIP";

            }


            // -----------------------------------------
            // PAUSE
            // -----------------------------------------

            if (pauseBtn) {

                pauseBtn.disabled =
                    mySlot !== 0 ||
                    state.finished;

                pauseBtn.textContent =
                    state.paused
                        ? "▶ RESUME"
                        : "⏸ PAUSE";

            }


            renderBidButtons(
                state
            );

            renderBidHistory(
                state
            );

        }


        // ---------------------------------------------
        // FINAL
        // ---------------------------------------------

        if (
            state.finished
        ) {

            renderFinal(
                state
            );

        }


        // ---------------------------------------------
        // CHAT
        // ---------------------------------------------

        renderChat(
            state.chat || []
        );

    }
);


// =====================================================
// AUCTION FINISHED
// =====================================================

socket.on(
    "auctionFinished",
    data => {

        if (!data) {
            return;
        }

        if (data.winner) {

            toast(
                `🏆 Winner: ${data.winner.name}`
            );

        }

    }
);


// =====================================================
// CHAT MESSAGE
// =====================================================

socket.on(
    "chatMessage",
    message => {

        if (!latest) {
            return;
        }

        if (!latest.chat) {
            latest.chat = [];
        }

        latest.chat.push(
            message
        );

        if (
            latest.chat.length >
            50
        ) {

            latest.chat =
                latest.chat.slice(-50);

        }

        renderChat(
            latest.chat
        );

    }
);


// =====================================================
// WAITING PLAYERS
// =====================================================

function renderWaiting(state) {

    const container =
        el("playersWait");

    if (!container) {
        return;
    }

    container.innerHTML =
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
                                    ? escapeHtml(
                                        player.name
                                    )
                                    : "Waiting..."
                            }
                        </strong>

                        <div class="hint">

                            ${
                                player

                                    ? `${formatMoney(
                                        player.purse
                                    )} purse`

                                    : "Waiting for player"
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

    const teamsContainer =
        el("teams");

    if (
        !teamsContainer
    ) {
        return;
    }

    const activePlayers =
        state.players
            .filter(Boolean);


    teamsContainer.innerHTML =
        activePlayers
            .map(
                player => `

                    <div class="team ${
                        player.slot === mySlot
                            ? "you"
                            : ""
                    }">

                        <div class="team-head">

                            <div class="team-name">

                                ${escapeHtml(
                                    player.name
                                )}

                                ${
                                    player.slot === mySlot
                                        ? " • YOU"
                                        : ""
                                }

                            </div>

                            <div class="purse">

                                ${formatMoney(
                                    player.purse
                                )}

                            </div>

                        </div>


                        <div class="squad-list">

                            ${
                                player.squad.length

                                    ? player.squad
                                        .map(
                                            item => `

                                                <div class="player-row">

                                                    <span>

                                                        ${escapeHtml(
                                                            item.name
                                                        )}

                                                        <small>
                                                            ${escapeHtml(
                                                                item.position
                                                            )}
                                                        </small>

                                                    </span>

                                                    <span class="price">

                                                        ${formatMoney(
                                                            item.price
                                                        )}

                                                    </span>

                                                </div>

                                            `
                                        )
                                        .join("")

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


    setText(
        "squadCount",
        totalSquad + " bought"
    );


    const squads =
        el("squads");

    if (!squads) {
        return;
    }


    squads.innerHTML = `

        <div class="squad-grid">

            ${
                activePlayers
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
                                        / 30 players

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

                                                        <small>
                                                            ${escapeHtml(
                                                                item.position
                                                            )}
                                                        </small>

                                                    </span>

                                                    <span class="price">

                                                        ${formatMoney(
                                                            item.price
                                                        )}

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
// BID BUTTONS
// =====================================================

function renderBidButtons(state) {

    const auction =
        el("auction");

    if (!auction) {
        return;
    }


    let container =
        el("bidOptions");


    /*
     * If the HTML does not contain the
     * bid options yet, create them automatically.
     */

    if (!container) {

        container =
            document.createElement(
                "div"
            );

        container.id =
            "bidOptions";

        container.style.display =
            "flex";

        container.style.gap =
            "8px";

        container.style.flexWrap =
            "wrap";


        const controls =
            bidBtn?.parentElement;

        if (controls) {

            controls.insertBefore(
                container,
                bidBtn
            );

        }

    }


    const amounts = [
        100,
        250,
        500,
        1000000
    ];


    container.innerHTML =
        amounts
            .map(
                amount => `

                    <button
                        type="button"
                        class="bid-option ${
                            selectedBidAmount === amount
                                ? "active"
                                : ""
                        }"
                        data-bid="${amount}"
                    >

                        ${formatMoney(
                            amount
                        )}

                    </button>

                `
            )
            .join("");


    container
        .querySelectorAll(
            ".bid-option"
        )
        .forEach(
            button => {

                button.onclick = () => {

                    selectedBidAmount =
                        Number(
                            button.dataset.bid
                        );

                    renderBidButtons(
                        latest
                    );

                    if (bidBtn) {

                        bidBtn.textContent =
                            `BID ${formatMoney(
                                selectedBidAmount
                            )}`;

                    }

                };

            }
        );

}


// =====================================================
// BID HISTORY
// =====================================================

function renderBidHistory(state) {

    let container =
        el("bidHistory");


    if (!container) {

        const auction =
            el("auction");

        if (!auction) {
            return;
        }

        container =
            document.createElement(
                "div"
            );

        container.id =
            "bidHistory";

        container.className =
            "bid-history";

        auction.appendChild(
            container
        );

    }


    const history =
        state.bidHistory || [];


    if (!history.length) {

        container.innerHTML = `
            <div class="hint">
                No bids yet
            </div>
        `;

        return;
    }


    container.innerHTML = `

        <div class="eyebrow">
            BIDDING HISTORY
        </div>

        ${
            history
                .slice()
                .reverse()
                .slice(0, 30)
                .map(
                    item => `

                        <div class="player-row">

                            <span>

                                ${escapeHtml(
                                    item.bidder
                                )}

                                •

                                ${escapeHtml(
                                    item.player
                                )}

                            </span>

                            <strong>

                                ${formatMoney(
                                    item.amount
                                )}

                            </strong>

                        </div>

                    `
                )
                .join("")
        }

    `;

}


// =====================================================
// CHAT
// =====================================================

function setupChat() {

    let chat =
        el("chatBox");

    if (!chat) {

        const auction =
            el("auction");

        if (!auction) {
            return;
        }


        chat =
            document.createElement(
                "div"
            );

        chat.id =
            "chatBox";

        chat.className =
            "chat-box";


        chat.innerHTML = `

            <div class="eyebrow">
                CHAT
            </div>

            <div
                id="chatMessages"
                style="
                    height:180px;
                    overflow-y:auto;
                    margin:10px 0;
                "
            ></div>

            <div
                style="
                    display:flex;
                    gap:8px;
                "
            >

                <input
                    id="chatInput"
                    type="text"
                    maxlength="300"
                    placeholder="Type a message..."
                >

                <button
                    id="chatSend"
                    type="button"
                >
                    SEND
                </button>

            </div>

        `;


        auction.appendChild(
            chat
        );

    }


    const input =
        el("chatInput");

    const send =
        el("chatSend");


    if (
        input &&
        send &&
        !send.dataset.ready
    ) {

        send.dataset.ready =
            "1";


        function sendMessage() {

            const message =
                input.value.trim();

            if (!message) {
                return;
            }

            socket.emit(
                "chatMessage",
                {
                    message
                }
            );

            input.value =
                "";

            input.focus();

        }


        send.onclick =
            sendMessage;


        input.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();

                    sendMessage();

                }

            }
        );

    }

}


// =====================================================
// RENDER CHAT
// =====================================================

function renderChat(messages) {

    setupChat();


    const container =
        el("chatMessages");

    if (!container) {
        return;
    }


    container.innerHTML =
        messages
            .slice(-50)
            .map(
                message => `

                    <div
                        style="
                            margin-bottom:6px;
                        "
                    >

                        <strong>
                            ${escapeHtml(
                                message.sender
                            )}
                        </strong>

                        :

                        ${escapeHtml(
                            message.message
                        )}

                    </div>

                `
            )
            .join("");


    container.scrollTop =
        container.scrollHeight;

}


// =====================================================
// FINAL RESULT
// =====================================================

function renderFinal(state) {

    show(
        "resultsCard",
        true
    );


    const teams =
        state.finalTeams ||
        [];


    const winner =
        state.winner ||
        teams[0];


    const winnerContainer =
        el("winner");


    if (
        winnerContainer &&
        winner
    ) {

        winnerContainer.innerHTML = `

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

                    Team Score:
                    ${winner.totalScore}

                </div>

            </div>

        `;

    }


    const stats =
        el("finalStats");


    if (
        !stats
    ) {
        return;
    }


    stats.innerHTML = `

        <div class="final-grid">

            ${
                teams
                    .map(
                        (team, index) => `

                            <div class="stat">

                                <strong>

                                    ${
                                        index === 0
                                            ? "🏆 "
                                            : ""
                                    }

                                    ${escapeHtml(
                                        team.name
                                    )}

                                </strong>

                                <div class="hint">

                                    ${team.squadSize}
                                    players

                                    •

                                    ${formatMoney(
                                        team.spent
                                    )}
                                    spent

                                    •

                                    ${formatMoney(
                                        team.remaining
                                    )}
                                    left

                                    •

                                    Score:
                                    ${team.totalScore}

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
// MONEY FORMAT
// =====================================================

function formatMoney(value) {

    const number =
        Number(value) || 0;


    if (
        number >=
        1000000
    ) {

        if (
            number %
            1000000 ===
            0
        ) {

            return (
                "$" +
                number /
                1000000 +
                "M"
            );

        }

        return (
            "$" +
            (
                number /
                1000000
            ).toFixed(2) +
            "M"
        );

    }


    if (
        number >=
        1000
    ) {

        return (
            "$" +
            (
                number /
                1000
            ).toFixed(1) +
            "K"
        );

    }


    return (
        "$" +
        number
    );

}


// =====================================================
// HTML ESCAPE
// =====================================================

function escapeHtml(value) {

    return String(
        value ?? ""
    ).replace(
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


// =====================================================
// INITIALIZE CHAT
// =====================================================

setupChat();


// =====================================================
// INITIAL STATE
// =====================================================

show(
    "auction",
    false
);

show(
    "waiting",
    false
);

show(
    "resultsCard",
    false
);