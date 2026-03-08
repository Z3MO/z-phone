(() => {
    const state = {
        vehicles: [],
        selectedPlate: '',
        selectedVehicle: null,
        expandedPlate: '',
    };

    const refs = {
        list: document.getElementById('garage-vehicles'),
        empty: document.getElementById('garage-empty-state'),
        count: document.getElementById('garage-count-badge'),
        search: document.getElementById('garage-search'),
        sellModal: document.getElementById('garage-sellvehicle-menu'),
        sellStateId: document.querySelector('.garage-sellvehicle-stateid'),
        sellPrice: document.querySelector('.garage-sellvehicle-price'),
        sellConfirm: document.getElementById('garage-sellvehicle'),
        sellCancel: document.getElementById('garage-sellvehicle-cancel'),
        sellPlateLabel: document.getElementById('garage-sellvehicle-plate-label'),
    };

    function getResourceName() {
        return typeof GetParentResourceName === 'function' ? GetParentResourceName() : 'qb-phone';
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

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function sanitizeVehicle(vehicle) {
        if (!vehicle || typeof vehicle !== 'object') {
            return null;
        }

        const plate = typeof vehicle.plate === 'string' ? vehicle.plate.trim() : '';
        if (!plate) {
            return null;
        }

        const stateLabel = ['In', 'Out', 'Impounded'].includes(vehicle.state) ? vehicle.state : 'Unknown';
        const fullname = typeof vehicle.fullname === 'string' && vehicle.fullname.trim() ? vehicle.fullname.trim() : 'Unknown Vehicle';
        const garage = typeof vehicle.garage === 'string' && vehicle.garage.trim() ? vehicle.garage.trim() : 'Unknown Garage';
        const fuel = Math.max(0, Math.min(100, Number(vehicle.fuel) || 0));
        const engine = Math.max(0, Math.min(100, Number(vehicle.engine) || 0));
        const body = Math.max(0, Math.min(100, Number(vehicle.body) || 0));
        const paymentsleft = Math.max(0, Number(vehicle.paymentsleft) || 0);

        return {
            fullname,
            plate,
            state: stateLabel,
            garage,
            fuel,
            engine,
            body,
            paymentsleft,
        };
    }

    function updateCount(total) {
        if (refs.count) {
            refs.count.textContent = String(total || 0);
        }
    }

    function setEmptyState(isEmpty) {
        refs.empty?.classList.toggle('visible', isEmpty);
        if (refs.list) {
            refs.list.hidden = isEmpty;
        }
    }

    function resetSellForm() {
        state.selectedPlate = '';
        state.selectedVehicle = null;
        if (refs.sellStateId) refs.sellStateId.value = '';
        if (refs.sellPrice) refs.sellPrice.value = '';
        if (refs.sellPlateLabel) refs.sellPlateLabel.textContent = 'Choose a buyer and price.';
    }

    function openSellModal(vehicle) {
        state.selectedVehicle = vehicle;
        state.selectedPlate = vehicle.plate;
        if (refs.sellPlateLabel) {
            refs.sellPlateLabel.textContent = `Selling ${vehicle.fullname} (${vehicle.plate})`;
        }
        refs.sellModal?.classList.add('visible');
        refs.sellStateId?.focus();
    }

    function closeSellModal() {
        refs.sellModal?.classList.remove('visible');
        resetSellForm();
    }

    function filterVehicles(query) {
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) {
            return state.vehicles;
        }

        return state.vehicles.filter((vehicle) => {
            return [vehicle.fullname, vehicle.plate, vehicle.state, vehicle.garage]
                .some((value) => value.toLowerCase().includes(normalizedQuery));
        });
    }

    function createStatRow(icon, label, value) {
        return `
            <div class="garage-stat">
                <i class="${icon}"></i>
                <span class="garage-stat-label">${escapeHtml(label)}</span>
                <span class="garage-stat-value">${escapeHtml(value)}</span>
            </div>
        `;
    }

    function createVehicleCard(vehicle) {
        const expanded = state.expandedPlate === vehicle.plate;
        return `
            <article class="garage-vehicle${expanded ? ' is-expanded' : ''}" data-plate="${escapeHtml(vehicle.plate)}">
                <button type="button" class="garage-vehicle-header" data-action="toggle" aria-expanded="${expanded ? 'true' : 'false'}">
                    <span class="garage-vehicle-icon"><i class="fas fa-car"></i></span>
                    <span class="garage-vehicle-main">
                        <span class="garage-vehicle-name">${escapeHtml(vehicle.fullname)}</span>
                        <span class="garage-vehicle-meta">
                            <span class="garage-plate-name">${escapeHtml(vehicle.plate)}</span>
                            <span>${escapeHtml(vehicle.garage)}</span>
                        </span>
                    </span>
                    <span class="garage-state-name" data-state="${escapeHtml(vehicle.state)}">${escapeHtml(vehicle.state)}</span>
                    <i class="fa-solid fa-chevron-down garage-expand-icon"></i>
                </button>
                <div class="garage-block">
                    <div class="garage-stats-grid">
                        ${createStatRow('fas fa-map-marker-alt', 'Garage', vehicle.garage)}
                        ${createStatRow('fas fa-gas-pump', 'Fuel', `${Math.round(vehicle.fuel)}%`)}
                        ${createStatRow('fas fa-oil-can', 'Engine', `${Math.round(vehicle.engine)}%`)}
                        ${createStatRow('fas fa-car-crash', 'Body', `${Math.round(vehicle.body)}%`)}
                        ${createStatRow('fas fa-hand-holding-usd', 'Payments', `${vehicle.paymentsleft} left`)}
                        ${createStatRow('fas fa-closed-captioning', 'Plate', vehicle.plate)}
                    </div>
                    <div class="garage-actions">
                        <button type="button" class="garage-box box-track" data-action="track">Track</button>
                        <button type="button" class="garage-box box-sellvehicle" data-action="sell">Sell</button>
                    </div>
                </div>
            </article>
        `;
    }

    function renderVehicles(vehicles) {
        if (!refs.list) {
            return;
        }

        const filteredVehicles = filterVehicles(refs.search?.value || '');
        refs.list.innerHTML = filteredVehicles.map(createVehicleCard).join('');
        updateCount(filteredVehicles.length);
        setEmptyState(filteredVehicles.length === 0);
    }

    async function trackVehicle(vehicle) {
        if (!vehicle) {
            return;
        }
        await nuiPost('gps-vehicle-garage', { veh: vehicle });
    }

    async function submitVehicleSale() {
        const buyerId = Number(refs.sellStateId?.value || 0);
        const price = Number(refs.sellPrice?.value || 0);

        if (!state.selectedPlate || !state.selectedVehicle) {
            closeSellModal();
            return;
        }

        if (!Number.isInteger(buyerId) || buyerId < 1) {
            notify('fas fa-car', 'Garage', 'Enter a valid buyer state ID.', '#ef4444', 2500);
            return;
        }

        if (!Number.isFinite(price) || price < 1) {
            notify('fas fa-car', 'Garage', 'Enter a valid sale price.', '#ef4444', 2500);
            return;
        }

        await nuiPost('sellVehicle', {
            plate: state.selectedPlate,
            id: buyerId,
            price: Math.floor(price),
        });

        closeSellModal();
    }

    function onVehicleListClick(event) {
        const actionTarget = event.target instanceof Element ? event.target.closest('[data-action]') : null;
        const card = event.target instanceof Element ? event.target.closest('.garage-vehicle') : null;
        if (!actionTarget || !card) {
            return;
        }

        const plate = card.dataset.plate || '';
        const vehicle = state.vehicles.find((entry) => entry.plate === plate);
        if (!vehicle) {
            return;
        }

        const action = actionTarget.getAttribute('data-action');
        if (action === 'toggle') {
            state.expandedPlate = state.expandedPlate === plate ? '' : plate;
            renderVehicles(state.vehicles);
        } else if (action === 'track') {
            trackVehicle(vehicle);
        } else if (action === 'sell') {
            openSellModal(vehicle);
        }
    }

    function attachEvents() {
        refs.search?.addEventListener('input', () => {
            renderVehicles(state.vehicles);
        });

        refs.list?.addEventListener('click', onVehicleListClick);
        refs.sellConfirm?.addEventListener('click', (event) => {
            event.preventDefault();
            submitVehicleSale();
        });
        refs.sellCancel?.addEventListener('click', (event) => {
            event.preventDefault();
            closeSellModal();
        });
        refs.sellModal?.addEventListener('click', (event) => {
            if (event.target === refs.sellModal) {
                closeSellModal();
            }
        });
    }

    function setupGarageVehicles(vehicles) {
        state.vehicles = Array.isArray(vehicles)
            ? vehicles.map(sanitizeVehicle).filter(Boolean)
            : [];

        if (state.expandedPlate && !state.vehicles.some((vehicle) => vehicle.plate === state.expandedPlate)) {
            state.expandedPlate = '';
        }

        renderVehicles(state.vehicles);
    }

    window.SetupGarageVehicles = setupGarageVehicles;
    attachEvents();
})();