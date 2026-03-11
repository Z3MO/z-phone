window.ZPhoneUI = (function () {
    const imageFileExtensionRegex = /\.(?:jpg|jpeg|gif|png|webp)(?:\?.*)?$/i;
    const elementDataStore = new WeakMap();
    const elementAnimationStore = new WeakMap();
    const elementDisplayStore = new WeakMap();

    function toCamelCase(value) {
        return String(value || "").replace(/-([a-z])/g, function (_, letter) {
            return letter.toUpperCase();
        });
    }

    function toKebabCase(value) {
        return String(value || "")
            .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
            .replace(/\s+/g, "-")
            .toLowerCase();
    }

    function uniqueElements(elements) {
        return Array.from(new Set((elements || []).filter(Boolean)));
    }

    function isNodeLike(value) {
        return value && typeof value === "object" && typeof value.nodeType === "number";
    }

    function isHtmlString(value) {
        return typeof value === "string" && value.trim().startsWith("<") && value.trim().endsWith(">");
    }

    function createElementsFromHtml(html) {
        const template = document.createElement("template");
        template.innerHTML = String(html).trim();
        return Array.from(template.content.childNodes).filter(function (node) {
            return node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE;
        });
    }

    function extractElements(value) {
        if (value instanceof MiniQuery) {
            return value.toArray();
        }

        if (Array.isArray(value)) {
            return value.flatMap(extractElements);
        }

        if (value instanceof NodeList || value instanceof HTMLCollection) {
            return Array.from(value);
        }

        if (isNodeLike(value) || value === window) {
            return [value];
        }

        return [];
    }

    function cloneForAppend(node) {
        if (!node) {
            return null;
        }

        return typeof node.cloneNode === "function" ? node.cloneNode(true) : node;
    }

    function getDefaultDisplay(element) {
        if (!(element instanceof Element)) {
            return "block";
        }

        const tagName = element.tagName.toLowerCase();
        if (tagName === "span" || tagName === "a" || tagName === "strong" || tagName === "small") {
            return "inline";
        }

        return "block";
    }

    function rememberDisplay(element) {
        if (!(element instanceof HTMLElement)) {
            return;
        }

        const display = window.getComputedStyle(element).display;
        if (display && display !== "none") {
            elementDisplayStore.set(element, display);
        }
    }

    function showElement(element) {
        if (!(element instanceof HTMLElement)) {
            return;
        }

        const storedDisplay = elementDisplayStore.get(element);
        element.style.display = storedDisplay || "";

        if (window.getComputedStyle(element).display === "none") {
            element.style.display = storedDisplay || getDefaultDisplay(element);
        }
    }

    function hideElement(element) {
        if (!(element instanceof HTMLElement)) {
            return;
        }

        rememberDisplay(element);
        element.style.display = "none";
    }

    function parseNumericCssValue(element, property, targetValue) {
        const computedStyle = element instanceof Element ? window.getComputedStyle(element) : null;
        const computedValue = computedStyle ? computedStyle.getPropertyValue(property) || computedStyle[property] : "";
        const targetMatch = typeof targetValue === "string"
            ? targetValue.trim().match(/^(-?\d+(?:\.\d+)?)([a-z%]*)$/i)
            : (typeof targetValue === "number" ? [String(targetValue), String(targetValue), ""] : null);

        if (!targetMatch) {
            return null;
        }

        const unit = targetMatch[2] || "";
        const currentMatch = String(computedValue || element.style[property] || "0").trim().match(/^(-?\d+(?:\.\d+)?)([a-z%]*)$/i);
        const startValue = currentMatch ? Number(currentMatch[1]) : 0;

        return {
            start: Number.isFinite(startValue) ? startValue : 0,
            end: Number(targetMatch[1]),
            unit: unit
        };
    }

    function cancelAnimation(element) {
        const runningAnimation = elementAnimationStore.get(element);
        if (!runningAnimation) {
            return;
        }

        if (typeof runningAnimation.cancel === "function") {
            runningAnimation.cancel();
        }

        elementAnimationStore.delete(element);
    }

    function getAnimationOptions(durationOrOptions, easingOrComplete, complete) {
        if (typeof durationOrOptions === "object" && durationOrOptions !== null) {
            return {
                duration: Number(durationOrOptions.duration) || 400,
                easing: durationOrOptions.easing || "swing",
                step: typeof durationOrOptions.step === "function" ? durationOrOptions.step : null,
                complete: typeof durationOrOptions.complete === "function" ? durationOrOptions.complete : null
            };
        }

        return {
            duration: typeof durationOrOptions === "number" ? durationOrOptions : 400,
            easing: typeof easingOrComplete === "string" ? easingOrComplete : "swing",
            step: null,
            complete: typeof easingOrComplete === "function"
                ? easingOrComplete
                : (typeof complete === "function" ? complete : null)
        };
    }

    function getEasingFunction(name) {
        if (name === "linear") {
            return function (progress) {
                return progress;
            };
        }

        return function (progress) {
            return 0.5 - (Math.cos(progress * Math.PI) / 2);
        };
    }

    function runAnimation(element, properties, durationOrOptions, easingOrComplete, complete) {
        if (!(element instanceof HTMLElement)) {
            return;
        }

        const options = getAnimationOptions(durationOrOptions, easingOrComplete, complete);
        const easing = getEasingFunction(options.easing);
        const animatedProperties = Object.keys(properties || {}).map(function (property) {
            const descriptor = parseNumericCssValue(element, property, properties[property]);
            return {
                property: property,
                target: properties[property],
                descriptor: descriptor
            };
        });
        const primaryProperty = animatedProperties.find(function (entry) {
            return entry.descriptor;
        }) || animatedProperties[0] || null;

        cancelAnimation(element);

        if (options.duration <= 0 || animatedProperties.length === 0) {
            animatedProperties.forEach(function (entry) {
                element.style[entry.property] = String(entry.target);
            });

            if (typeof options.complete === "function") {
                options.complete.call(element);
            }
            return;
        }

        const startTime = performance.now();
        let frameId = null;

        function tick(now) {
            const rawProgress = Math.min((now - startTime) / options.duration, 1);
            const easedProgress = easing(rawProgress);

            animatedProperties.forEach(function (entry) {
                if (entry.descriptor) {
                    const currentValue = entry.descriptor.start + ((entry.descriptor.end - entry.descriptor.start) * easedProgress);
                    element.style[entry.property] = `${currentValue}${entry.descriptor.unit}`;
                } else {
                    element.style[entry.property] = rawProgress >= 1 ? String(entry.target) : element.style[entry.property];
                }
            });

            if (primaryProperty && primaryProperty.descriptor && typeof options.step === "function") {
                const currentValue = primaryProperty.descriptor.start
                    + ((primaryProperty.descriptor.end - primaryProperty.descriptor.start) * easedProgress);
                options.step.call(element, currentValue, { prop: primaryProperty.property });
            }

            if (rawProgress < 1) {
                frameId = window.requestAnimationFrame(tick);
                return;
            }

            animatedProperties.forEach(function (entry) {
                element.style[entry.property] = String(entry.target);
            });

            elementAnimationStore.delete(element);

            if (typeof options.complete === "function") {
                options.complete.call(element);
            }
        }

        frameId = window.requestAnimationFrame(tick);
        elementAnimationStore.set(element, {
            cancel: function () {
                if (frameId !== null) {
                    window.cancelAnimationFrame(frameId);
                }
            }
        });
    }

    function getElementDataStore(element) {
        let store = elementDataStore.get(element);
        if (!store) {
            store = {};
            elementDataStore.set(element, store);
        }
        return store;
    }

    function getStoredDataValue(element, key) {
        const normalizedKey = toCamelCase(key);
        const store = getElementDataStore(element);

        if (Object.prototype.hasOwnProperty.call(store, normalizedKey)) {
            return store[normalizedKey];
        }

        if (element && element.dataset && Object.prototype.hasOwnProperty.call(element.dataset, normalizedKey)) {
            return element.dataset[normalizedKey];
        }

        return undefined;
    }

    function setStoredDataValue(element, key, value) {
        const normalizedKey = toCamelCase(key);
        const store = getElementDataStore(element);
        store[normalizedKey] = value;
    }

    function basicSanitizeText(value) {
        return String(value ?? "")
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    if (typeof window.DOMPurify === "undefined") {
        window.DOMPurify = {
            sanitize: function (value) {
                return basicSanitizeText(value);
            }
        };
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

    function createDeferred() {
        let state = "pending";
        let settledValue;
        const doneCallbacks = [];
        const failCallbacks = [];
        const alwaysCallbacks = [];

        let resolvePromise;
        let rejectPromise;
        const nativePromise = new Promise(function (resolve, reject) {
            resolvePromise = resolve;
            rejectPromise = reject;
        });

        function runCallbacks(callbacks, value) {
            callbacks.forEach(function (callback) {
                callback(value);
            });
        }

        const promiseApi = {
            done: function (callback) {
                if (typeof callback !== "function") {
                    return promiseApi;
                }

                if (state === "resolved") {
                    callback(settledValue);
                } else if (state === "pending") {
                    doneCallbacks.push(callback);
                }
                return promiseApi;
            },
            fail: function (callback) {
                if (typeof callback !== "function") {
                    return promiseApi;
                }

                if (state === "rejected") {
                    callback(settledValue);
                } else if (state === "pending") {
                    failCallbacks.push(callback);
                }
                return promiseApi;
            },
            always: function (callback) {
                if (typeof callback !== "function") {
                    return promiseApi;
                }

                if (state === "pending") {
                    alwaysCallbacks.push(callback);
                } else {
                    callback(settledValue);
                }
                return promiseApi;
            },
            then: function (onFulfilled, onRejected) {
                return nativePromise.then(onFulfilled, onRejected);
            },
            catch: function (onRejected) {
                return nativePromise.catch(onRejected);
            },
            finally: function (onFinally) {
                return nativePromise.finally(onFinally);
            }
        };

        return {
            resolve: function (value) {
                if (state !== "pending") {
                    return;
                }

                state = "resolved";
                settledValue = value;
                resolvePromise(value);
                runCallbacks(doneCallbacks, value);
                runCallbacks(alwaysCallbacks, value);
            },
            reject: function (value) {
                if (state !== "pending") {
                    return;
                }

                state = "rejected";
                settledValue = value;
                rejectPromise(value);
                runCallbacks(failCallbacks, value);
                runCallbacks(alwaysCallbacks, value);
            },
            promise: function () {
                return promiseApi;
            }
        };
    }

    function ajaxRequest(method, url, data, success) {
        if (typeof data === "function") {
            success = data;
            data = undefined;
        }

        const deferred = createDeferred();
        const requestOptions = {
            method: method,
            headers: {}
        };

        if (data !== undefined) {
            requestOptions.headers["Content-Type"] = "application/json; charset=UTF-8";
            requestOptions.body = typeof data === "string" ? data : JSON.stringify(data);
        }

        window.fetch(url, requestOptions)
            .then(parseResponse)
            .then(function (response) {
                if (typeof success === "function") {
                    success(response);
                }
                deferred.resolve(response);
            })
            .catch(function (error) {
                deferred.reject(error);
            });

        return deferred.promise();
    }

    class MiniQuery {
        constructor(elements) {
            this.elements = uniqueElements(elements);
            this.length = this.elements.length;

            this.elements.forEach((element, index) => {
                this[index] = element;
            });
        }

        toArray() {
            return this.elements.slice();
        }

        get(index) {
            if (index === undefined) {
                return this.toArray();
            }

            const normalizedIndex = index < 0 ? this.length + index : index;
            return this.elements[normalizedIndex];
        }

        each(callback) {
            this.elements.forEach(function (element, index) {
                callback.call(element, index, element);
            });
            return this;
        }

        find(selector) {
            return new MiniQuery(this.elements.flatMap(function (element) {
                return element instanceof Element ? Array.from(element.querySelectorAll(selector)) : [];
            }));
        }

        closest(selector) {
            return new MiniQuery(this.elements.map(function (element) {
                return element instanceof Element ? element.closest(selector) : null;
            }));
        }

        parent() {
            return new MiniQuery(this.elements.map(function (element) {
                return element && element.parentElement ? element.parentElement : null;
            }));
        }

        siblings(selector) {
            const siblings = this.elements.flatMap(function (element) {
                if (!element || !element.parentElement) {
                    return [];
                }

                return Array.from(element.parentElement.children).filter(function (sibling) {
                    return sibling !== element && (!selector || sibling.matches(selector));
                });
            });

            return new MiniQuery(siblings);
        }

        filter(predicate) {
            if (typeof predicate === "function") {
                return new MiniQuery(this.elements.filter(function (element, index) {
                    return Boolean(predicate.call(element, index, element));
                }));
            }

            if (typeof predicate === "string") {
                return new MiniQuery(this.elements.filter(function (element) {
                    return element instanceof Element && element.matches(predicate);
                }));
            }

            return new MiniQuery(this.elements);
        }

        html(value) {
            if (value === undefined) {
                const element = this.get(0);
                return element ? element.innerHTML : undefined;
            }

            return this.each(function () {
                this.innerHTML = value;
            });
        }

        text(value) {
            if (value === undefined) {
                const element = this.get(0);
                return element ? element.textContent : undefined;
            }

            return this.each(function () {
                this.textContent = value;
            });
        }

        append(content) {
            return this.each(function (index) {
                if (typeof content === "string") {
                    this.insertAdjacentHTML("beforeend", content);
                    return;
                }

                const nodes = extractElements(content);
                nodes.forEach((node) => {
                    const appendNode = index === 0 ? node : cloneForAppend(node);
                    if (appendNode) {
                        this.appendChild(appendNode);
                    }
                });
            });
        }

        remove() {
            return this.each(function () {
                if (typeof this.remove === "function") {
                    this.remove();
                }
            });
        }

        css(property, value) {
            if (typeof property === "string" && value === undefined) {
                const element = this.get(0);
                return element instanceof Element ? window.getComputedStyle(element).getPropertyValue(property) : undefined;
            }

            const styles = typeof property === "object" ? property : { [property]: value };
            return this.each(function () {
                Object.keys(styles).forEach((key) => {
                    this.style[key] = styles[key];
                });
            });
        }

        show() {
            return this.each(function () {
                showElement(this);
            });
        }

        hide() {
            return this.each(function () {
                hideElement(this);
            });
        }

        toggle(state) {
            return this.each(function () {
                const shouldShow = state === undefined ? window.getComputedStyle(this).display === "none" : Boolean(state);
                if (shouldShow) {
                    showElement(this);
                } else {
                    hideElement(this);
                }
            });
        }

        fadeIn(duration, complete) {
            return this.each(function () {
                showElement(this);
                this.style.opacity = "0";
                runAnimation(this, { opacity: 1 }, duration, complete);
            });
        }

        fadeOut(duration, complete) {
            return this.each(function () {
                runAnimation(this, { opacity: 0 }, duration, function () {
                    hideElement(this);
                    this.style.opacity = "1";
                    if (typeof complete === "function") {
                        complete.call(this);
                    }
                });
            });
        }

        animate(properties, durationOrOptions, easingOrComplete, complete) {
            return this.each(function () {
                runAnimation(this, properties, durationOrOptions, easingOrComplete, complete);
            });
        }

        stop() {
            return this.each(function () {
                cancelAnimation(this);
            });
        }

        addClass(classNames) {
            const classes = String(classNames || "").split(/\s+/).filter(Boolean);
            return this.each(function () {
                this.classList.add(...classes);
            });
        }

        removeClass(classNames) {
            const classes = String(classNames || "").split(/\s+/).filter(Boolean);
            return this.each(function () {
                this.classList.remove(...classes);
            });
        }

        hasClass(className) {
            const element = this.get(0);
            return Boolean(element && element.classList.contains(className));
        }

        attr(name, value) {
            if (typeof name === "object") {
                return this.each(function () {
                    Object.keys(name).forEach((key) => {
                        this.setAttribute(key, name[key]);
                    });
                });
            }

            if (value === undefined) {
                const element = this.get(0);
                return element instanceof Element ? element.getAttribute(name) : undefined;
            }

            return this.each(function () {
                this.setAttribute(name, value);
            });
        }

        prop(name, value) {
            if (typeof name === "object") {
                return this.each(function () {
                    Object.keys(name).forEach((key) => {
                        this[key] = name[key];
                    });
                });
            }

            if (value === undefined) {
                const element = this.get(0);
                return element ? element[name] : undefined;
            }

            return this.each(function () {
                this[name] = value;
            });
        }

        val(value) {
            if (value === undefined) {
                const element = this.get(0);
                return element && "value" in element ? element.value : undefined;
            }

            return this.each(function () {
                if ("value" in this) {
                    this.value = value;
                }
            });
        }

        data(key, value) {
            if (typeof key === "object" && key !== null) {
                return this.each(function () {
                    Object.keys(key).forEach((nestedKey) => {
                        setStoredDataValue(this, nestedKey, key[nestedKey]);
                    });
                });
            }

            if (value === undefined) {
                const element = this.get(0);
                return element ? getStoredDataValue(element, key) : undefined;
            }

            return this.each(function () {
                setStoredDataValue(this, key, value);
            });
        }

        removeData(key) {
            return this.each(function () {
                const normalizedKey = toCamelCase(key);
                const store = getElementDataStore(this);
                delete store[normalizedKey];
                if (this.dataset && Object.prototype.hasOwnProperty.call(this.dataset, normalizedKey)) {
                    delete this.dataset[normalizedKey];
                }
                if (this instanceof Element) {
                    this.removeAttribute(`data-${toKebabCase(key)}`);
                }
            });
        }

        on(events, selector, handler) {
            const hasDelegatedSelector = typeof selector === "string";
            const listener = hasDelegatedSelector ? handler : selector;

            if (typeof listener !== "function") {
                return this;
            }

            const eventList = String(events || "").split(/\s+/).filter(Boolean);
            return this.each(function () {
                const boundElement = this;

                eventList.forEach(function (eventName) {
                    boundElement.addEventListener(eventName, function (event) {
                        if (!hasDelegatedSelector) {
                            listener.call(boundElement, event);
                            return;
                        }

                        if (!(event.target instanceof Element)) {
                            return;
                        }

                        const matchedTarget = event.target.closest(selector);
                        if (!matchedTarget) {
                            return;
                        }

                        if (boundElement !== document && boundElement instanceof Element && !boundElement.contains(matchedTarget)) {
                            return;
                        }

                        listener.call(matchedTarget, event);
                    });
                });
            });
        }

        ready(handler) {
            if (typeof handler !== "function") {
                return this;
            }

            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", handler, { once: true });
            } else {
                window.setTimeout(handler, 0);
            }
            return this;
        }

        click(handler) {
            if (typeof handler === "function") {
                return this.on("click", handler);
            }

            return this.each(function () {
                if (typeof this.click === "function") {
                    this.click();
                }
            });
        }

        width() {
            const element = this.get(0);
            return element instanceof Element ? element.getBoundingClientRect().width : 0;
        }

        height() {
            const element = this.get(0);
            return element instanceof Element ? element.getBoundingClientRect().height : 0;
        }

        offset() {
            const element = this.get(0);
            if (!(element instanceof Element)) {
                return { top: 0, left: 0 };
            }

            const rect = element.getBoundingClientRect();
            return {
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX
            };
        }

        is(selector) {
            const element = this.get(0);
            if (!(element instanceof Element)) {
                return false;
            }

            if (selector === ":visible") {
                const style = window.getComputedStyle(element);
                return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
            }

            return element.matches(selector);
        }
    }

    function $(input) {
        if (typeof input === "function") {
            return new MiniQuery([document]).ready(input);
        }

        if (input instanceof MiniQuery) {
            return input;
        }

        if (typeof input === "string") {
            return isHtmlString(input)
                ? new MiniQuery(createElementsFromHtml(input))
                : new MiniQuery(Array.from(document.querySelectorAll(input)));
        }

        return new MiniQuery(extractElements(input));
    }

    $.fn = MiniQuery.prototype;
    $.each = function (collection, callback) {
        if (!collection || typeof callback !== "function") {
            return collection;
        }

        if (Array.isArray(collection) || collection instanceof NodeList || collection instanceof HTMLCollection) {
            Array.from(collection).forEach(function (value, index) {
                callback.call(value, index, value);
            });
            return collection;
        }

        Object.keys(collection).forEach(function (key) {
            callback.call(collection[key], key, collection[key]);
        });
        return collection;
    };
    $.map = function (collection, callback) {
        if (!collection || typeof callback !== "function") {
            return [];
        }

        if (Array.isArray(collection) || collection instanceof NodeList || collection instanceof HTMLCollection) {
            return Array.from(collection).map(function (value, index) {
                return callback(value, index);
            });
        }

        return Object.keys(collection).map(function (key) {
            return callback(collection[key], key);
        });
    };
    $.trim = function (value) {
        return String(value ?? "").trim();
    };
    $.extend = function (target) {
        return Object.assign(target || {}, ...Array.prototype.slice.call(arguments, 1));
    };
    $.Deferred = createDeferred;
    $.post = function (url, data, success) {
        return ajaxRequest("POST", url, data, success);
    };
    $.get = function (url, data, success) {
        return ajaxRequest("GET", url, data, success);
    };

    window.$ = window.jQuery = $;

    function getResourceName() {
        if (typeof window.GetParentResourceName === "function") {
            return window.GetParentResourceName();
        }

        if (document.body && document.body.dataset && document.body.dataset.resourceName) {
            return document.body.dataset.resourceName;
        }

        return "z-phone";
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

        return basicSanitizeText(value);
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
