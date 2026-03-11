window.ZPhoneUI = (function () {
    const imageFileExtensionRegex = /\.(?:jpg|jpeg|gif|png|webp)(?:\?.*)?$/i;

    function getResourceName() {
        if (typeof window.GetParentResourceName === "function") {
            return window.GetParentResourceName();
        }

        if (document.body && document.body.dataset && document.body.dataset.resourceName) {
            return document.body.dataset.resourceName;
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

    function sanitizeText(value) {
        if (typeof window.DOMPurify !== "undefined") {
            return window.DOMPurify.sanitize(String(value ?? ""), {
                ALLOWED_TAGS: [],
                ALLOWED_ATTR: []
            }).trim();
        }

        return String(value ?? "")
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function sanitizeImageUrl(urlValue) {
        const rawUrl = Array.isArray(urlValue) ? urlValue[0] : urlValue;
        if (typeof rawUrl !== "string") {
            return null;
        }

        const trimmedUrl = rawUrl.trim();
        if (trimmedUrl === "" || !imageFileExtensionRegex.test(trimmedUrl)) {
            return null;
        }

        try {
            const normalizedUrl = trimmedUrl.startsWith("www.") ? `https://${trimmedUrl}` : trimmedUrl;
            const parsedUrl = new URL(normalizedUrl, window.location.href);
            const urlString = parsedUrl.href.toLowerCase();

            if ((parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:")
                || urlString.includes("javascript:")
                || urlString.includes("data:")
                || urlString.includes("vbscript:")
                || urlString.includes("file:")
                || urlString.includes("<script")
                || urlString.includes("onerror=")
                || urlString.includes("onload=")) {
                return null;
            }

            return parsedUrl.href;
        } catch (error) {
            return null;
        }
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
        sanitizeImageUrl: sanitizeImageUrl,
        sanitizeText: sanitizeText,
        initTooltips: initTooltips
    };
}());
