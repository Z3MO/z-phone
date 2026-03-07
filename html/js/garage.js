/**
 * Garage app – component-pattern implementation.
 *
 * The component registers itself with QB.Phone.ComponentManager.
 * onMount  – attaches delegated event listeners and subscribes to EventBus events.
 * onUnmount – removes those listeners and nullifies the cached vehicle dataset.
 *
 * Direct $(document).on() bindings are replaced by a single delegated listener
 * that is attached in onMount and explicitly removed in onUnmount.
 */

var _GarageData = null;
var _garageVehPlate = null;

/** Build the vehicle list using DocumentFragment to avoid repeated reflows. */
SetupGarageVehicles = function(Vehicles) {
    var container = document.querySelector('.garage-vehicles');
    container.innerHTML = "";
    _GarageData = {};

    if (Vehicles != null) {
        var fragment = document.createDocumentFragment();
        $.each(Vehicles, function(i, vehicle){
            var div = document.createElement('div');
            div.className = 'garage-vehicle';
            div.id = 'vehicle-' + i;
            div.innerHTML =
                '<span class="garage-vehicle-icon"><i class="fas fa-car"></i></span> ' +
                '<span class="garage-vehicle-name">' + vehicle.fullname + '</span> ' +
                '<span class="garage-plate-name">' + vehicle.plate + '</span> ' +
                '<span class="garage-state-name">' + vehicle.state + '</span>' +
                '<div class="garage-block">' +
                    '<div class="garage-name"><i class="fas fa-map-marker-alt"></i>' + vehicle.garage + '</div>' +
                    '<div class="garage-plate"><i class="fas fa-closed-captioning"></i>' + vehicle.plate + '</div>' +
                    '<div class="garage-fuel"><i class="fas fa-gas-pump"></i>' + vehicle.fuel + '</div>' +
                    '<div class="garage-engine"><i class="fas fa-oil-can"></i>' + vehicle.engine + ' %</div>' +
                    '<div class="garage-body"><i class="fas fa-car-crash"></i>' + vehicle.body + ' %</div>' +
                    '<div class="garage-payments"><i class="fas fa-hand-holding-usd"></i>' + vehicle.paymentsleft + ' Payments Left</div>' +
                    '<div class="garage-box" id="' + vehicle.plate + '">' +
                        '<span class="garage-box box-track">TRACK</span>' +
                        '<span class="garage-box box-sellvehicle">SELL</span>' +
                    '</div>' +
                '</div>';
            $(div).data('VehicleData', vehicle);
            _GarageData['vehicle-' + i] = vehicle;
            fragment.appendChild(div);
        });
        container.appendChild(fragment);
    }
};

// ── Component definition ──────────────────────────────────────────────────────

var _garageHandleClick = null;
var _garageHandleSearch = null;
var _garageUpdateHandler = null;

QB.Phone.ComponentManager.register('garage', {
    onMount: function () {
        // ── Delegated click handler for the whole garage app ──────────────────
        _garageHandleClick = function (e) {
            var target = e.target;

            var vehicleEl = target.closest('.garage-vehicle');
            if (vehicleEl && !target.closest('.box-track') && !target.closest('.box-sellvehicle')) {
                e.preventDefault();
                $(vehicleEl).find('.garage-block').toggle();
                _garageVehPlate = $(vehicleEl).data('VehicleData');
                return;
            }

            if (target.closest('.box-track')) {
                e.preventDefault();
                $.post('https://' + GetParentResourceName() + '/gps-vehicle-garage', JSON.stringify({
                    veh: _garageVehPlate,
                }));
                return;
            }

            if (target.closest('.box-sellvehicle')) {
                e.preventDefault();
                _garageVehPlate = target.closest('.garage-box').id;
                $('#garage-sellvehicle-menu').fadeIn(350);
                return;
            }

            if (target.closest('#garage-sellvehicle')) {
                e.preventDefault();
                var stateid = document.querySelector('.garage-sellvehicle-stateid').value;
                var price   = document.querySelector('.garage-sellvehicle-price').value;
                if (price !== '' && stateid !== '') {
                    $.post('https://' + GetParentResourceName() + '/sellVehicle', JSON.stringify({
                        plate: _garageVehPlate,
                        id:    stateid,
                        price: price,
                    }));
                }
                if (typeof ClearInputNew === 'function') ClearInputNew();
                $('#garage-sellvehicle-menu').fadeOut(350);
                return;
            }
        };

        // ── Search handler (debounced) ─────────────────────────────────────────
        var _searchTimer = null;
        _garageHandleSearch = function () {
            clearTimeout(_searchTimer);
            var input = this;
            _searchTimer = setTimeout(function () {
                var value = input.value.toLowerCase();
                document.querySelectorAll('.garage-vehicles .garage-vehicle').forEach(function (el) {
                    el.style.display = el.textContent.toLowerCase().indexOf(value) > -1 ? '' : 'none';
                });
            }, 150);
        };

        // ── EventBus subscription – refresh vehicle list when game sends update ─
        _garageUpdateHandler = function (data) {
            if (QB.Phone.Data.currentApplication === 'garage') {
                $.post('https://' + GetParentResourceName() + '/SetupGarageVehicles', JSON.stringify({}), function (Vehicles) {
                    SetupGarageVehicles(Vehicles);
                });
            }
        };

        document.querySelector('.garage-app').addEventListener('click', _garageHandleClick);
        var searchEl = document.querySelector('#garage-search');
        if (searchEl) searchEl.addEventListener('keyup', _garageHandleSearch);
        QB.Phone.EventBus.on('phone:garageUpdate', _garageUpdateHandler);
    },

    onUnmount: function () {
        var appEl = document.querySelector('.garage-app');
        if (appEl && _garageHandleClick) appEl.removeEventListener('click', _garageHandleClick);
        var searchEl = document.querySelector('#garage-search');
        if (searchEl && _garageHandleSearch) searchEl.removeEventListener('keyup', _garageHandleSearch);
        QB.Phone.EventBus.off('phone:garageUpdate', _garageUpdateHandler);

        // Nullify large dataset to free GC pressure
        _GarageData = null;
        _garageVehPlate = null;
        _garageHandleClick = null;
        _garageHandleSearch = null;
        _garageUpdateHandler = null;
    }
});
