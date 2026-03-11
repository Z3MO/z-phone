(function () {
    const DEFAULT_MAX_PLAYER_ID = 9999;
    const pingButton = document.getElementById("ping-send");
    const pingInput = document.getElementById("ping-target-id");

    if (!pingButton || !pingInput) {
        return;
    }

    function getMaxPlayerId() {
        return Number.parseInt(pingInput.max, 10) || DEFAULT_MAX_PLAYER_ID;
    }

    function sendPing(event) {
        if (event) {
            event.preventDefault();
        }

        const targetId = Number.parseInt(pingInput.value, 10);
        const maxPlayerId = getMaxPlayerId();

        if (!Number.isInteger(targetId) || targetId < 1 || targetId > maxPlayerId) {
            pingInput.focus();
            return;
        }

        ZPhoneUI.postNui("SendPingPlayer", {
            id: targetId
        });

        pingInput.value = "";
    }

    pingButton.addEventListener("click", sendPing);
    pingInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            sendPing(event);
        }
    });
}());
