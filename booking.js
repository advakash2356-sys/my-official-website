/**
 * DevgharCabs — Booking Page JS
 * Handles 3-step booking form, fare estimation, WhatsApp redirect
 */

const LOCATIONS = [
  'Jasidih Rly. Station',
  'Deoghar Bus Stand',
  'Baidyanath Dham Temple',
  'Dumka',
  'Giridih',
  'Chittaranjan',
  'Jhajha',
  'Basukinath Temple',
  'Sultanganj',
  'Bhagalpur',
];

const VEHICLES = [
  { value: 'auto', label: 'Auto / E-Rickshaw', desc: '1–3 passengers', icon: '🛺' },
  { value: 'sedan', label: 'Hatchback / Sedan', desc: '1–4 passengers', icon: '🚗' },
  { value: 'suv', label: 'SUV / Innova / Ertiga', desc: '1–7 passengers', icon: '🚙' },
  { value: 'tempo', label: 'Tempo Traveller', desc: '8–12 passengers', icon: '🚐' },
];

let currentStep = 1;
let bookingData = {};

function initBooking() {
  // Set min date
  const dateEl = document.getElementById('travel-date');
  if (dateEl) dateEl.min = new Date().toISOString().split('T')[0];

  // Populate locations
  ['pickup-select', 'dropoff-select'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    LOCATIONS.forEach(loc => {
      const opt = document.createElement('option');
      opt.value = loc; opt.textContent = loc;
      sel.appendChild(opt);
    });
  });

  // Populate vehicle cards
  const vcGrid = document.getElementById('vehicle-grid');
  if (vcGrid) {
    VEHICLES.forEach(v => {
      const card = document.createElement('label');
      card.className = 'vehicle-card';
      card.innerHTML = `
        <input type="radio" name="vehicle" value="${v.value}" />
        <div class="vehicle-card-inner">
          <div class="vehicle-icon">${v.icon}</div>
          <div class="vehicle-name">${v.label}</div>
          <div class="vehicle-desc">${v.desc}</div>
        </div>
      `;
      card.querySelector('input').addEventListener('change', () => {
        document.querySelectorAll('.vehicle-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        updateFarePreview();
      });
      vcGrid.appendChild(card);
    });
  }

  // Route chips
  document.querySelectorAll('.route-chip[data-from]').forEach(chip => {
    chip.addEventListener('click', () => {
      const from = chip.dataset.from;
      const to = chip.dataset.to;
      const pickupSel = document.getElementById('pickup-select');
      const dropoffSel = document.getElementById('dropoff-select');
      if (pickupSel) pickupSel.value = from;
      if (dropoffSel) dropoffSel.value = to;
      updateFarePreview();
      showToast('Route Selected', `${from} → ${to}`, 'success', 2000);
    });
  });

  // Change listeners
  ['pickup-select', 'dropoff-select'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', updateFarePreview);
  });

  renderStep(1);
  checkDriverShifts();
}

function checkDriverShifts() {
  const drivers = DB.getDrivers();
  let minTimeLeft = Infinity;
  let endingSoon = false;

  drivers.forEach(d => {
    const shift = getDriverShiftStatus(d);
    if (shift.isOnline && shift.isEndingSoon && shift.minutesLeft < minTimeLeft) {
      minTimeLeft = shift.minutesLeft;
      endingSoon = true;
    }
  });

  if (endingSoon && minTimeLeft > 0) {
    const banner = document.getElementById('shift-warning-banner');
    const enText = document.getElementById('shift-warn-mins');
    const hiText = document.getElementById('shift-warn-mins-hi');
    if (banner && enText && hiText) {
      enText.textContent = minTimeLeft;
      hiText.textContent = minTimeLeft;
      banner.style.display = 'block';
    }
  }
}

function updateFarePreview() {
  const pickup = document.getElementById('pickup-select')?.value;
  const dropoff = document.getElementById('dropoff-select')?.value;
  const vehicleInput = document.querySelector('input[name="vehicle"]:checked');
  const fareEl = document.getElementById('fare-preview');
  const fareAmt = document.getElementById('fare-amount');
  if (!fareEl || !fareAmt) return;
  if (pickup && dropoff && vehicleInput && pickup !== dropoff) {
    const fare = getFare(pickup, dropoff, vehicleInput.value);
    fareAmt.textContent = fare;
    fareEl.classList.add('show');
  } else {
    fareEl.classList.remove('show');
  }
}

function renderStep(step) {
  currentStep = step;
  document.querySelectorAll('.booking-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.step-indicator').forEach((s, i) => {
    s.classList.toggle('active', i + 1 === step);
    s.classList.toggle('done', i + 1 < step);
  });
  const panel = document.getElementById(`panel-${step}`);
  if (panel) { panel.classList.add('active'); panel.style.animation = 'slide-up 0.4s ease'; }
  // Update progress bar
  const bar = document.getElementById('booking-progress');
  if (bar) bar.style.width = `${((step - 1) / 2) * 100}%`;
}

function goToStep(step) {
  if (step > currentStep) {
    // Validate current step before advancing
    if (!validateStep(currentStep)) return;
    collectStepData(currentStep);
  }
  renderStep(step);
}

function validateStep(step) {
  let valid = true;
  if (step === 1) {
    const pickup = document.getElementById('pickup-select')?.value;
    const dropoff = document.getElementById('dropoff-select')?.value;
    const vehicle = document.querySelector('input[name="vehicle"]:checked');
    if (!pickup) { highlightError('pickup-select', 'Please select pick-up location'); valid = false; }
    else if (pickup === dropoff) { highlightError('dropoff-select', 'Pick-up and drop-off cannot be the same'); valid = false; }
    else if (!dropoff) { highlightError('dropoff-select', 'Please select drop-off location'); valid = false; }
    if (!vehicle) { showToast('Select Vehicle', 'Please choose a vehicle type', 'warning'); valid = false; }
  }
  if (step === 2) {
    const date = document.getElementById('travel-date')?.value;
    const time = document.getElementById('travel-time')?.value;
    if (!date) { highlightError('travel-date', 'Please select travel date'); valid = false; }
    if (!time) { highlightError('travel-time', 'Please select pick-up time'); valid = false; }
  }
  if (step === 3) {
    const name = document.getElementById('passenger-name')?.value.trim();
    const phone = document.getElementById('passenger-phone')?.value.trim();
    const consent = document.getElementById('consent-check')?.checked;
    if (!name || name.length < 2) { highlightError('passenger-name', 'Please enter your full name'); valid = false; }
    if (!phone || phone.length < 10 || !/^\d{10}$/.test(phone)) { highlightError('passenger-phone', 'Please enter valid 10-digit mobile number'); valid = false; }
    if (!consent) { showToast('Agreement Required', 'Please agree to our terms before booking', 'warning'); valid = false; }
  }
  return valid;
}

function highlightError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('error'); setTimeout(() => el.classList.remove('error'), 3000); }
  showToast('Required Field', msg, 'error', 3500);
}

function collectStepData(step) {
  if (step === 1) {
    bookingData.pickup = document.getElementById('pickup-select')?.value;
    bookingData.dropoff = document.getElementById('dropoff-select')?.value;
    const v = document.querySelector('input[name="vehicle"]:checked');
    bookingData.vehicle = v ? VEHICLES.find(x => x.value === v.value)?.label : '';
    bookingData.vehicleKey = v?.value;
  }
  if (step === 2) {
    bookingData.date = document.getElementById('travel-date')?.value;
    bookingData.time = document.getElementById('travel-time')?.value;
    bookingData.passengers = document.getElementById('passengers')?.value;
    bookingData.note = document.getElementById('special-note')?.value;
  }
  if (step === 3) {
    bookingData.name = document.getElementById('passenger-name')?.value.trim();
    bookingData.phone = document.getElementById('passenger-phone')?.value.trim();
  }
}

function submitBooking() {
  if (!validateStep(3)) return;
  collectStepData(3);

  // Save to localStorage
  const saved = DB.saveBooking({ ...bookingData });

  // Show confirmation UI
  document.getElementById('panel-3').classList.remove('active');
  const successPanel = document.getElementById('panel-success');
  if (successPanel) {
    successPanel.classList.add('active');
    document.getElementById('confirm-booking-id').textContent = saved.id;
    document.getElementById('confirm-name').textContent = saved.name;
    document.getElementById('confirm-route').textContent = `${saved.pickup} → ${saved.dropoff}`;
    document.getElementById('confirm-date').textContent = `${saved.date} at ${saved.time}`;
    document.getElementById('confirm-vehicle').textContent = saved.vehicle;
  }
  // Update progress to complete
  const bar = document.getElementById('booking-progress');
  if (bar) bar.style.width = '100%';
  document.querySelectorAll('.step-indicator').forEach(s => s.classList.add('done'));

  // Open WhatsApp for Raja Bhaiya notification
  setTimeout(() => {
    window.open(WA.bookingAlert(saved), '_blank');
  }, 1200);

  showToast('Booking Confirmed! 🎉', `Your booking ID: ${saved.id}`, 'success', 6000);
}

function resetBooking() {
  bookingData = {};
  document.getElementById('panel-success').classList.remove('active');
  document.getElementById('pickup-select').value = '';
  document.getElementById('dropoff-select').value = '';
  document.querySelectorAll('input[name="vehicle"]').forEach(r => r.checked = false);
  document.querySelectorAll('.vehicle-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('travel-date').value = '';
  document.getElementById('travel-time').value = '';
  document.getElementById('passenger-name').value = '';
  document.getElementById('passenger-phone').value = '';
  document.getElementById('consent-check').checked = false;
  document.getElementById('fare-preview').classList.remove('show');
  renderStep(1);
}

document.addEventListener('DOMContentLoaded', initBooking);
