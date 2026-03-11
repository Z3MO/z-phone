window.ZPhoneUI = (function () {
    function getResourceName() {
        if (typeof window.GetParentResourceName === "function") {
            return window.GetParentResourceName();
        }

        return "z-phone";
    }

    function parseResponse(response) {
        return response.text().then(function (text) {
            if (!text) {
                return null;
            }

            try {
                return JSON.parse(text);
            } catch (error) {
                return text;
            }
        });
    }

    function postNui(endpoint, payload) {
        return window.fetch(`https://${getResourceName()}/${endpoint}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=UTF-8"
            },
            body: JSON.stringify(payload || {})
        }).then(parseResponse);
    }

    function initTooltips() {
        if (!window.bootstrap || !window.bootstrap.Tooltip) {
            return;
        }

        document.querySelectorAll('[data-toggle="tooltip"]').forEach(function (element) {
            window.bootstrap.Tooltip.getOrCreateInstance(element);
        });
    }

    return {
        getResourceName: getResourceName,
        postNui: postNui,
        initTooltips: initTooltips
    };
}());
