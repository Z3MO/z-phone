(function () {
    const pingButton = document.getElementById("ping-send");
    const pingInput = document.getElementById("ping-target-id");

    if (!pingButton || !pingInput) {
        return;
    }

    function sendPing(event) {
        if (event) {
            event.preventDefault();
        }

        const targetId = Number.parseInt(pingInput.value, 10);

        if (!Number.isInteger(targetId) || targetId < 1) {
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
