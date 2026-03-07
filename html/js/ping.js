$(document).on('click', '#ping-send', function(e){
    e.preventDefault();
    var IDPlayer = $(".ierplol").val();
    if (IDPlayer >= 1){
        QB.Phone.NUI.postLegacy("SendPingPlayer", {
            id: IDPlayer
        });
        $(".ierplol").val("");
    }
});