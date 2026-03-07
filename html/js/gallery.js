(() => {
    const state = {
        toastTimer: null,
        postImageUrl: '',
        currentImageUrl: '',
    };

    const refs = {
        container: document.querySelector('.container'),
        grid: document.getElementById('gallery-grid'),
        countBadge: document.getElementById('gallery-count-badge'),
        emptyState: document.getElementById('gallery-empty-state'),
        home: document.querySelector('.gallery-homescreen'),
        detail: document.querySelector('.gallery-detailscreen'),
        post: document.querySelector('.gallery-postscreen'),
        detailStatus: document.getElementById('gallery-detail-status'),
        detailImage: document.getElementById('imagedata'),
        postPreview: document.getElementById('gallery-post-preview-img'),
        composer: document.getElementById('new-textarea'),
        charCount: document.getElementById('gallery-char-count'),
        deleteModal: document.getElementById('gallery-delete-modal'),
        toast: document.getElementById('gallery-toast'),
        imageViewer: document.getElementById('gallery-image-viewer'),
        imageViewerImage: document.getElementById('gallery-image-viewer-img'),
        imageViewerClose: document.getElementById('gallery-image-viewer-close'),
        returnButton: document.getElementById('return-button'),
        deleteButton: document.getElementById('delete-button'),
        deleteCancelButton: document.getElementById('gallery-delete-cancel'),
        deleteConfirmButton: document.getElementById('gallery-delete-confirm'),
        copyButton: document.getElementById('gallery-coppy-button'),
        shareButton: document.getElementById('make-post-button'),
        returnDetailButton: document.getElementById('returndetail-button'),
        pulseButton: document.getElementById('pulse-button'),
        proxiButton: document.getElementById('proxi-button'),
    };

    function getResourceName() {
        return typeof GetParentResourceName === 'function' ? GetParentResourceName() : 'qb-phone';
    }

    function normalizeImageUrl(value) {
        if (typeof value !== 'string') {
            return '';
        }

        const url = value.trim();
        if (!url) {
            return '';
        }

        try {
            const parsed = new URL(url);
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                return '';
            }
            return parsed.toString();
        } catch {
            return '';
        }
    }

    async function nuiPost(endpoint, payload = {}) {
        const response = await fetch(`https://${getResourceName()}/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
            },
            body: JSON.stringify(payload),
        });

        const text = await response.text();
        if (!text) {
            return null;
        }

        try {
            return JSON.parse(text);
        } catch {
            return text;
        }
    }

    function notify(icon, title, message, color, duration) {
        if (window.QB && QB.Phone && QB.Phone.Notifications && typeof QB.Phone.Notifications.Add === 'function') {
            QB.Phone.Notifications.Add(icon, title, message, color, duration);
        }
    }

    function showToast(message, duration = 1900) {
        if (!refs.toast) {
            return;
        }

        window.clearTimeout(state.toastTimer);
        refs.toast.textContent = message;
        refs.toast.classList.add('visible');
        state.toastTimer = window.setTimeout(() => {
            refs.toast.classList.remove('visible');
        }, duration);
    }

    function setEmptyState(isEmpty) {
        refs.emptyState?.classList.toggle('visible', isEmpty);
        if (refs.grid) {
            refs.grid.hidden = isEmpty;
        }
    }

    function updateCount(total) {
        if (refs.countBadge) {
            refs.countBadge.textContent = String(total || 0);
        }
    }

    function primeImage(imageElement, src) {
        if (!imageElement) {
            return;
        }

        const safeSrc = normalizeImageUrl(src);
        imageElement.classList.remove('is-ready');
        imageElement.src = '';
        window.requestAnimationFrame(() => {
            imageElement.src = safeSrc;
        });
    }

    function resetComposer() {
        if (refs.composer) {
            refs.composer.value = '';
        }
        if (refs.charCount) {
            refs.charCount.textContent = '0';
            refs.charCount.classList.remove('near-limit', 'at-limit');
        }
    }

    function finishShare(message) {
        resetComposer();
        applyView('detail');
        showToast(message);
        if (typeof window.ConfirmationFrame === 'function') {
            window.setTimeout(() => {
                window.ConfirmationFrame();
            }, 150);
        }
    }

    function openImageViewer(src) {
        const safeSrc = normalizeImageUrl(src);
        if (!safeSrc || !refs.imageViewer || !refs.imageViewerImage) {
            return;
        }

        refs.imageViewerImage.src = safeSrc;
        refs.imageViewer.classList.add('visible');
    }

    function closeImageViewer() {
        if (!refs.imageViewer || !refs.imageViewerImage) {
            return;
        }

        refs.imageViewer.classList.remove('visible');
        window.setTimeout(() => {
            refs.imageViewerImage.src = '';
        }, 180);
    }

    function applyView(viewName) {
        refs.home?.classList.remove('slide-out-left');
        refs.detail?.classList.remove('slide-in');
        refs.post?.classList.remove('slide-in');

        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                if (viewName === 'detail') {
                    refs.home?.classList.add('slide-out-left');
                    refs.detail?.classList.add('slide-in');
                } else if (viewName === 'post') {
                    refs.home?.classList.add('slide-out-left');
                    refs.detail?.classList.add('slide-in');
                    refs.post?.classList.add('slide-in');
                }
            });
        });
    }

    function openPhoto(src) {
        const safeSrc = normalizeImageUrl(src);
        if (!safeSrc) {
            return;
        }

        state.currentImageUrl = safeSrc;
        if (refs.detailStatus) {
            refs.detailStatus.textContent = 'Loading photo...';
            refs.detailStatus.classList.remove('is-hidden', 'is-error');
        }

        primeImage(refs.detailImage, safeSrc);
        applyView('detail');
    }

    function closeViewer() {
        refs.deleteModal?.classList.remove('visible');
        closeImageViewer();
        applyView('home');
    }

    function handleDetailImageLoad() {
        refs.detailStatus?.classList.add('is-hidden');
        refs.detailStatus?.classList.remove('is-error');
        refs.detailImage?.classList.add('is-ready');
    }

    function handleDetailImageError() {
        if (refs.detailStatus) {
            refs.detailStatus.textContent = 'Unable to load this photo';
            refs.detailStatus.classList.remove('is-hidden');
            refs.detailStatus.classList.add('is-error');
        }
        refs.detailImage?.classList.remove('is-ready');
    }

    function handlePreviewLoad() {
        refs.postPreview?.classList.add('is-ready');
    }

    function handlePreviewError() {
        refs.postPreview?.classList.remove('is-ready');
    }

    function updateComposerCounter() {
        if (!refs.composer || !refs.charCount) {
            return;
        }

        const length = refs.composer.value.length;
        refs.charCount.textContent = String(length);
        refs.charCount.classList.remove('near-limit', 'at-limit');

        if (length >= 280) {
            refs.charCount.classList.add('at-limit');
        } else if (length >= 230) {
            refs.charCount.classList.add('near-limit');
        }
    }

    async function copyCurrentLink() {
        if (!state.currentImageUrl) {
            return;
        }

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(state.currentImageUrl);
            } else {
                const fallback = document.createElement('textarea');
                fallback.value = state.currentImageUrl;
                fallback.setAttribute('readonly', 'true');
                fallback.style.position = 'absolute';
                fallback.style.left = '-9999px';
                document.body.appendChild(fallback);
                fallback.select();
                document.execCommand('copy');
                fallback.remove();
            }
            showToast('Link copied');
        } catch {
            notify('fa-solid fa-link', 'Gallery', 'Unable to copy link right now.', '#ef4444', 2500);
        }
    }

    async function refreshGallery() {
        const images = await nuiPost('GetGalleryData', {});
        renderGallery(images);
    }

    async function deleteCurrentImage() {
        if (!state.currentImageUrl) {
            refs.deleteModal?.classList.remove('visible');
            return;
        }

        refs.deleteModal?.classList.remove('visible');
        await nuiPost('DeleteImage', { image: state.currentImageUrl });
        state.currentImageUrl = '';
        closeViewer();
        await refreshGallery();
        showToast('Photo deleted');
    }

    async function shareToPulses() {
        const message = refs.composer?.value.trim() || '';
        if (!message && !state.postImageUrl) {
            notify('fa-solid fa-wave-pulse', 'Pulses', 'Fill a message or select a photo first!', '#1DA1F2');
            return;
        }

        await nuiPost('PostNewPulse', {
            Message: message,
            Date: new Date(),
            url: state.postImageUrl,
            type: 'pulse',
            anonymous: false,
        });

        finishShare('Shared to Pulses');
    }

    async function shareToProxi() {
        const message = refs.composer?.value.trim() || '';
        if (!message && !state.postImageUrl) {
            notify('fas fa-ad', 'Proxi', "You can't post an empty proxi!", '#ff8f1a', 2000);
            return;
        }

        await nuiPost('PostProxi', {
            message,
            url: state.postImageUrl || null,
        });

        finishShare('Shared to Proxi');
    }

    function renderGallery(images) {
        if (!refs.grid) {
            return;
        }

        refs.grid.textContent = '';

        const safeImages = Array.isArray(images)
            ? images
                .map((row) => ({
                    image: normalizeImageUrl(row && row.image),
                }))
                .filter((row) => row.image)
            : [];

        if (safeImages.length === 0) {
            updateCount(0);
            setEmptyState(true);
            return;
        }

        const fragment = document.createDocumentFragment();
        for (const row of safeImages) {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'gallery-item';
            item.dataset.image = row.image;
            item.setAttribute('aria-label', 'Open gallery image');

            const image = document.createElement('img');
            image.src = row.image;
            image.alt = 'Gallery image';
            image.loading = 'lazy';
            image.decoding = 'async';

            item.appendChild(image);
            fragment.appendChild(item);
        }

        refs.grid.appendChild(fragment);
        updateCount(safeImages.length);
        setEmptyState(false);
    }

    function attachEvents() {
        refs.grid?.addEventListener('click', (event) => {
            const target = event.target instanceof Element ? event.target.closest('.gallery-item') : null;
            if (!target) {
                return;
            }
            openPhoto(target.dataset.image || '');
        });

        refs.detailImage?.addEventListener('load', handleDetailImageLoad);
        refs.detailImage?.addEventListener('error', handleDetailImageError);
        refs.postPreview?.addEventListener('load', handlePreviewLoad);
        refs.postPreview?.addEventListener('error', handlePreviewError);

        refs.detailImage?.addEventListener('click', () => {
            if (state.currentImageUrl) {
                openImageViewer(state.currentImageUrl);
            }
        });

        refs.imageViewerClose?.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            closeImageViewer();
        });

        refs.imageViewer?.addEventListener('click', (event) => {
            if (event.target === refs.imageViewer) {
                closeImageViewer();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeImageViewer();
                refs.deleteModal?.classList.remove('visible');
            }
        });

        refs.returnButton?.addEventListener('click', (event) => {
            event.preventDefault();
            closeViewer();
        });

        refs.deleteButton?.addEventListener('click', (event) => {
            event.preventDefault();
            refs.deleteModal?.classList.add('visible');
        });

        refs.deleteCancelButton?.addEventListener('click', () => {
            refs.deleteModal?.classList.remove('visible');
        });

        refs.deleteConfirmButton?.addEventListener('click', deleteCurrentImage);
        refs.copyButton?.addEventListener('click', (event) => {
            event.preventDefault();
            copyCurrentLink();
        });

        refs.shareButton?.addEventListener('click', (event) => {
            event.preventDefault();
            state.postImageUrl = state.currentImageUrl;
            if (!state.postImageUrl) {
                return;
            }
            primeImage(refs.postPreview, state.postImageUrl);
            resetComposer();
            applyView('post');
        });

        refs.returnDetailButton?.addEventListener('click', (event) => {
            event.preventDefault();
            applyView('detail');
        });

        refs.composer?.addEventListener('input', updateComposerCounter);
        refs.pulseButton?.addEventListener('click', (event) => {
            event.preventDefault();
            shareToPulses();
        });

        refs.proxiButton?.addEventListener('click', (event) => {
            event.preventDefault();
            shareToProxi();
        });
    }

    function init() {
        if (refs.container && refs.imageViewer) {
            refs.container.appendChild(refs.imageViewer);
        }
        attachEvents();
    }

    window.setUpGalleryData = renderGallery;
    init();
})();

