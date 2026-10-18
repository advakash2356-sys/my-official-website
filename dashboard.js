/**
 * DevgharCabs — Enhanced Dashboard JS
 * Integrates booking engine, live escalation monitoring, WhatsApp templates panel
 */

// ===== DASHBOARD PIN =====
// No PIN is stored in code. On first visit the user sets one; only a salted
// SHA-256 hash is kept in this browser's localStorage. Client-side only: NOT real security.
const PIN_HASH_KEY = 'dgc_pin_hash';
const PIN_SALT_KEY = 'dgc_pin_salt';
async function hashPin(pin, salt) {
  const data = new TextEncoder().encode(salt + ':' + pin);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function isPinSet() { return !!localStorage.getItem(PIN_HASH_KEY); }
function updatePinPrompt() {
  const sub = document.querySelector('#login-screen .login-sub');
  const hint = document.querySelector('#login-screen .pin-hint');
  if (!isPinSet()) {
    if (sub) sub.textContent = 'First visit: choose a 4-digit PIN to protect this dashboard.';
    if (hint) hint.textContent = 'This PIN is saved (hashed) only in this browser.';
  }
}
let isAuthenticated = false;
let activeFilter = 'all';
let searchQuery = '';
let escalationCheckInterval = null;
let lastEscalationCount = 0;

function checkAuth() {
  const auth = sessionStorage.getItem('dgc_admin_auth');
  if (auth === 'true') { isAuthenticated = true; showDashboard(); }
  else { showLoginScreen(); }
}
function showLoginScreen() {
  updatePinPrompt();
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('dashboard-main').style.display = 'none';
}
function showDashboard() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('dashboard-main').style.display = 'block';
  loadDashboard();
  startEscalationMonitor();
}
async function submitPin() {
  const pin = document.getElementById('pin-input').value;
  let ok = false;
  if (!isPinSet()) {
    if (/^\d{4}$/.test(pin)) {
      const salt = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem(PIN_SALT_KEY, salt);
      localStorage.setItem(PIN_HASH_KEY, await hashPin(pin, salt));
      ok = true;
    }
  } else {
    ok = (await hashPin(pin, localStorage.getItem(PIN_SALT_KEY) || '')) === localStorage.getItem(PIN_HASH_KEY);
  }
  if (ok) {
    sessionStorage.setItem('dgc_admin_auth', 'true');
    isAuthenticated = true;
    document.getElementById('pin-input').classList.add('success');
    showToast('Welcome, Raja Bhaiya! 🙏', 'Har Har Mahadev', 'success');
    setTimeout(showDashboard, 600);
  } else {
    document.getElementById('pin-input').classList.add('error');
    document.getElementById('pin-error').style.display = 'block';
    document.getElementById('pin-input').value = '';
    setTimeout(() => {
      document.getElementById('pin-input').classList.remove('error');
      document.getElementById('pin-error').style.display = 'none';
    }, 2500);
  }
}
function logout() {
  sessionStorage.removeItem('dgc_admin_auth');
  isAuthenticated = false;
  clearEscalationMonitor();
  showLoginScreen();
}

// ===== LOAD DASHBOARD =====
function loadDashboard() {
  renderStats();
  renderEscalationPanel();
  renderBookings();
  renderDrivers();
  renderRecentActivity();
}

// ===== STATS =====
function renderStats() {
  const bookings = DB.getBookings();
  const drivers  = DB.getDrivers();
  const escalated = getEscalatedBookings ? getEscalatedBookings() : [];
  const criticalCount = escalated.filter(b => b.escalation.level === 'critical').length;
  const total     = bookings.length;
  const pending   = bookings.filter(b => b.status === 'pending').length;
  const completed = bookings.filter(b => b.status === 'completed').length;
  const activeDrivers = drivers.filter(d => d.status === 'approved' && d.available).length;
  setEl('stat-total',     total);
  setEl('stat-pending',   pending);
  setEl('stat-completed', completed);
  setEl('stat-drivers',   activeDrivers);
  // Escalation badge in header
  const badge = document.getElementById('escalation-header-badge');
  if (badge) {
    if (criticalCount > 0) {
      badge.textContent = criticalCount + ' CRITICAL';
      badge.style.display = 'inline-flex';
      badge.classList.add('pulse');
    } else if (escalated.length > 0) {
      badge.textContent = escalated.length + ' Alert' + (escalated.length > 1 ? 's' : '');
      badge.style.display = 'inline-flex';
      badge.classList.remove('pulse');
    } else {
      badge.style.display = 'none';
    }
  }
}
function setEl(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

// ===== ESCALATION PANEL =====
function renderEscalationPanel() {
  const escalated = getEscalatedBookings ? getEscalatedBookings() : [];
  const panel = document.getElementById('escalation-panel');
  const noEsc = document.getElementById('no-escalation');
  const cards = document.getElementById('escalation-cards');
  if (!panel) return;
  if (escalated.length === 0) {
    if (noEsc) noEsc.style.display = 'flex';
    if (cards) cards.innerHTML = '';
    return;
  }
  if (noEsc) noEsc.style.display = 'none';
  if (!cards) return;
  cards.innerHTML = escalated.map(b => {
    const cfg = b.escalation.config;
    const lvl = b.escalation.level;
    const mins = b.escalation.minutesElapsed;
    const templateFn = lvl === 'critical' ? NotificationTemplates.escalationCritical
                     : lvl === 'urgent'   ? NotificationTemplates.escalationUrgent
                     : NotificationTemplates.escalationWarning;
    const msg = templateFn(b, mins);
    const waLink = `https://wa.me/917643081977?text=${encodeURIComponent(msg)}`;
    const passengerWaLink = `https://wa.me/91${b.phone}?text=${encodeURIComponent(`Namaste ${b.name} Ji! 🙏 I see your cab booking ${b.id} is pending. I'm arranging your driver now. Please bear with me for a few more minutes. - Raja Bhaiya, DevgharCabs`)}`;
    return `
    <div class="escalation-card escalation-${lvl}" style="border-color:${cfg.color};background:${cfg.bgColor};">
      <div class="esc-card-header">
        <div class="esc-badge" style="background:${cfg.color}">${cfg.badge}</div>
        <div class="esc-time">${mins} min waiting</div>
        <div class="esc-id">${b.id}</div>
      </div>
      <div class="esc-card-body">
        <div class="esc-name">👤 ${b.name} — 📱 +91 ${b.phone}</div>
        <div class="esc-route">📍 ${b.pickup} → ${b.dropoff}</div>
        <div class="esc-trip">🕐 ${b.date} at ${b.time} | 🚗 ${b.vehicle}</div>
      </div>
      <div class="esc-card-actions">
        <button class="btn btn-sm btn-confirm" onclick="quickConfirm('${b.id}')">✅ Confirm</button>
        <a href="${waLink}" target="_blank" class="btn btn-sm btn-wa-esc">💬 Send ${lvl === 'critical' ? '🚨 CRITICAL' : lvl === 'urgent' ? '🟠 URGENT' : '⚠️ WARNING'} Alert</a>
        <a href="${passengerWaLink}" target="_blank" class="btn btn-sm btn-wa-passenger">📱 WhatsApp Passenger</a>
        <a href="tel:+91${b.phone}" class="btn btn-sm btn-call">📞 Call Now</a>
      </div>
    </div>`;
  }).join('');
}

function quickConfirm(id) {
  DB.updateBookingStatus(id, 'confirmed');
  renderEscalationPanel();
  renderBookings();
  renderStats();
  showToast('Booking Confirmed ✅', `${id} marked as confirmed`, 'success');
}

// ===== ESCALATION MONITOR =====
function startEscalationMonitor() {
  clearEscalationMonitor();
  escalationCheckInterval = setInterval(() => {
    if (!isAuthenticated) return;
    const escalated = getEscalatedBookings ? getEscalatedBookings() : [];
    const newCount = escalated.length;
    const criticalList = escalated.filter(b => b.escalation.level === 'critical');

    // Notify if escalation count increased
    if (newCount > lastEscalationCount) {
      const diff = newCount - lastEscalationCount;
      showToast(`⚠️ ${diff} Booking(s) Need Attention`, 'Check escalation panel above', 'warning', 6000);
    }
    // Critical alert flash
    if (criticalList.length > 0) {
      showToast(`🔴 CRITICAL — ${criticalList[0].id}`, `${criticalList[0].name} waiting ${criticalList[0].escalation.minutesElapsed}+ minutes!`, 'error', 8000);
    }
    lastEscalationCount = newCount;
    renderEscalationPanel();
    renderStats();
  }, 60000); // check every 60 seconds (1 minute)
}
function clearEscalationMonitor() {
  if (escalationCheckInterval) { clearInterval(escalationCheckInterval); escalationCheckInterval = null; }
}

// ===== BOOKINGS TABLE =====
function renderBookings() {
  let bookings = DB.getBookings();
  if (activeFilter !== 'all') bookings = bookings.filter(b => b.status === activeFilter);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    bookings = bookings.filter(b =>
      b.name?.toLowerCase().includes(q) || b.phone?.includes(q) ||
      b.id?.toLowerCase().includes(q)   || b.pickup?.toLowerCase().includes(q)
    );
  }
  const tbody = document.getElementById('bookings-tbody');
  if (!tbody) return;
  if (bookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">${searchQuery ? 'No matching bookings' : 'No bookings yet'}</div></td></tr>`;
    return;
  }
  tbody.innerHTML = bookings.map(b => {
    const esc = computeEscalation ? computeEscalation(b) : { level: 'none', minutesElapsed: 0, config: null };
    const rowClass = esc.level !== 'none' ? `esc-row-${esc.level}` : '';
    const escCell = esc.level !== 'none'
      ? `<span class="esc-row-badge esc-${esc.level}">${EscalationConfig[esc.level.toUpperCase()]?.badge || ''} ${esc.minutesElapsed}m</span>`
      : `<span class="text-muted" style="font-size:11px">—</span>`;
    const templateFn = esc.level === 'critical' ? NotificationTemplates.escalationCritical
                     : esc.level === 'urgent'   ? NotificationTemplates.escalationUrgent
                     : esc.level === 'warning'  ? NotificationTemplates.escalationWarning
                     : null;
    const escWaLink = templateFn
      ? `<a href="https://wa.me/917643081977?text=${encodeURIComponent(templateFn(b, esc.minutesElapsed))}" target="_blank" class="action-btn btn-wa-esc-sm" title="Send Escalation Alert">🚨</a>`
      : '';
    return `
    <tr class="${rowClass}" data-booking-id="${b.id}">
      <td><span class="booking-id-cell">${b.id}</span></td>
      <td><div class="passenger-name">${b.name||'—'}</div><div class="passenger-phone">📱 +91 ${b.phone||'—'}</div></td>
      <td><div class="route-cell"><span class="route-from-cell">${b.pickup||'—'}</span><span class="route-arrow">→</span><span class="route-to-cell">${b.dropoff||'—'}</span></div></td>
      <td>${b.vehicle||'—'}</td>
      <td>${b.date||'—'}${b.time?`<br><small>${b.time}</small>`:''}</td>
      <td><span class="badge ${STATUS_BADGE_CLASS[b.status]||'badge-gray'}">${STATUS_LABELS[b.status]||b.status}</span></td>
      <td>${escCell}</td>
      <td><small class="text-muted">${timeAgo(b.timestamp)}</small></td>
      <td>
        <div class="action-btns">
          <button class="action-btn btn-confirm" onclick="openAssignModal('${b.id}')" title="Confirm & Assign Driver">✅</button>
          <button class="action-btn btn-complete" onclick="updateStatus('${b.id}','completed')" title="Mark Complete">🏁</button>
          <button class="action-btn btn-cancel" onclick="updateStatus('${b.id}','cancelled')" title="Cancel">❌</button>
          <a href="https://wa.me/91${b.phone}?text=${encodeURIComponent(NotificationTemplates.bookingConfirmed(b))}" target="_blank" class="action-btn btn-wa" title="Send Confirmation to Passenger">💬</a>
          ${escWaLink}
        </div>
      </td>
    </tr>`;
  }).join('');
}

function updateStatus(id, status) {
  DB.updateBookingStatus(id, status);
  // Send trip completed notice to Raja Bhaiya if completing
  if (status === 'completed') {
    const booking = DB.getBookings().find(b => b.id === id);
    if (booking) {
      const msg = NotificationTemplates.tripCompleted(booking);
      window.open(`https://wa.me/917643081977?text=${encodeURIComponent(msg)}`, '_blank');
    }
  }
  loadDashboard();
  showToast('Status Updated', `Booking ${id} → ${STATUS_LABELS[status]}`, 'success');
}
function setFilter(filter) {
  activeFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === filter));
  renderBookings();
}
function searchBookings(query) { searchQuery = query; renderBookings(); }

// ===== ASSIGN DRIVER MODAL =====
function openAssignModal(bookingId) {
  const booking = DB.getBookings().find(b => b.id === bookingId);
  if (!booking) return;
  document.getElementById('assign-booking-id').value = bookingId;
  document.getElementById('assign-booking-info').textContent = `${booking.name} | ${booking.pickup} → ${booking.dropoff} | ${booking.date} ${booking.time}`;
  document.getElementById('assign-modal').style.display = 'flex';
}
function closeAssignModal() { document.getElementById('assign-modal').style.display = 'none'; }
function submitAssignment() {
  const bookingId   = document.getElementById('assign-booking-id').value;
  const driverName  = document.getElementById('assign-driver-name').value.trim();
  const driverPhone = document.getElementById('assign-driver-phone').value.trim();
  const booking = DB.getBookings().find(b => b.id === bookingId);
  if (!booking) return;
  if (!driverName) { showToast('Required', 'Please enter driver name', 'error'); return; }

  DB.updateBookingStatus(bookingId, 'driver_assigned');
  // Notify passenger via WhatsApp
  const passengerMsg = NotificationTemplates.driverAssigned(booking, driverName, driverPhone || '76430 81977');
  const rajaBhaiyaMsg = `✅ *Driver Assigned — ${bookingId}*\n\nDriver: ${driverName}${driverPhone ? ` (+91 ${driverPhone})` : ''}\nPassenger: ${booking.name} (+91 ${booking.phone})\nRoute: ${booking.pickup} → ${booking.dropoff}\n\n🙏 Har Har Mahadev`;
  closeAssignModal();
  document.getElementById('assign-driver-name').value = '';
  document.getElementById('assign-driver-phone').value = '';
  // Open WhatsApp to passenger
  window.open(`https://wa.me/91${booking.phone}?text=${encodeURIComponent(passengerMsg)}`, '_blank');
  loadDashboard();
  showToast('Driver Assigned ✅', `Passenger being notified via WhatsApp`, 'success');
}

// ===== DRIVERS TABLE =====
function renderDrivers() {
  const drivers = DB.getDrivers();
  const tbody = document.getElementById('drivers-tbody');
  if (!tbody) return;
  if (drivers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><div class="empty-icon">🚗</div><div class="empty-text">No driver applications yet</div></td></tr>`;
    return;
  }
  tbody.innerHTML = drivers.map(d => {
    const shift = getDriverShiftStatus(d);
    let shiftBadge = `<span class="badge badge-gray">🔴 Logged Out</span>`;
    let rowClass = '';
    
    if (shift.isOnline) {
      if (shift.isEndingSoon) {
        shiftBadge = `<span class="badge badge-gold">⚠️ Ends in ${shift.minutesLeft}m</span>`;
        rowClass = `style="background: rgba(245, 158, 11, 0.1);"`; // Warning background
      } else {
        shiftBadge = `<span class="badge badge-green">🟢 ${shift.minutesLeft}m left</span>`;
      }
    }

    return `
  <tr ${rowClass}>
    <td><span class="booking-id-cell">${d.id}</span></td>
    <td><div class="passenger-name">${d.name}</div><div class="passenger-phone">📱 +91 ${d.phone}</div></td>
    <td>${d.vehicle}</td>
    <td>${d.license||'—'}</td>
    <td>${shiftBadge}</td>
    <td><span class="badge ${d.status==='approved'?'badge-green':d.status==='rejected'?'badge-red':'badge-gold'}">${d.status==='approved'?'Approved':d.status==='rejected'?'Rejected':'Pending'}</span></td>
    <td>
      <div class="action-btns">
        ${d.status!=='approved'?`<button class="action-btn btn-confirm" onclick="approveDriver('${d.id}')" title="Approve">✅</button>`:''}
        ${d.status==='approved'?`
          ${shift.isOnline 
            ? `<button class="action-btn btn-cancel" onclick="endDriverShift('${d.id}')" title="End Shift">🛑</button>` 
            : `<button class="action-btn btn-confirm" onclick="openStartShiftModal('${d.id}', '${d.name}')" title="Start Shift">⏳</button>`
          }
        `:''}
        <a href="https://wa.me/91${d.phone}?text=${encodeURIComponent(`🙏 Namaste ${d.name}!\n\nYou have been approved as a DevgharCabs driver. Please keep WhatsApp available for ride requests.\n\nHar Har Mahadev 🕉️`)}" target="_blank" class="action-btn btn-wa" title="WhatsApp">💬</a>
        <button class="action-btn btn-cancel" onclick="rejectDriver('${d.id}')" title="Reject">❌</button>
      </div>
    </td>
  </tr>`;
  }).join('');
}
function approveDriver(id) { DB.updateDriverStatus(id,'approved',false); renderDrivers(); renderStats(); showToast('Driver Approved ✅','',  'success'); }
function rejectDriver(id)  { DB.updateDriverStatus(id,'rejected',false); renderDrivers(); showToast('Driver Rejected','', 'error'); }

// Shift Management
function openStartShiftModal(id, name) {
  document.getElementById('shift-driver-id').value = id;
  document.getElementById('shift-driver-name').textContent = name;
  document.getElementById('start-shift-modal').style.display = 'flex';
}
function closeStartShiftModal() { document.getElementById('start-shift-modal').style.display = 'none'; }
function submitStartShift() {
  const id = document.getElementById('shift-driver-id').value;
  const duration = parseInt(document.getElementById('s-duration').value, 10);
  DB.startDriverShift(id, duration);
  closeStartShiftModal();
  renderDrivers();
  renderStats();
  showToast('Shift Started 🟢', `Driver is online for ${duration} mins`, 'success');
}
function endDriverShift(id) {
  DB.endDriverShift(id);
  renderDrivers();
  renderStats();
  showToast('Shift Ended 🛑', 'Driver is now offline', 'info');
}

// Add Driver Logic
function openAddDriverModal() { document.getElementById('add-driver-modal').style.display = 'flex'; }
function closeAddDriverModal() { document.getElementById('add-driver-modal').style.display = 'none'; document.getElementById('add-driver-form').reset(); }
document.getElementById('add-driver-form')?.addEventListener('submit', function(e) {
  e.preventDefault();
  const name = document.getElementById('d-name').value;
  const phone = document.getElementById('d-phone').value;
  const vehicle = document.getElementById('d-vehicle').value;
  const license = document.getElementById('d-license').value;
  const shift = parseInt(document.getElementById('d-shift').value, 10);

  const driver = DB.saveDriver({ name, phone, vehicle, license });
  if (driver) {
    DB.updateDriverStatus(driver.id, 'approved', false);
    if (shift > 0) {
      DB.startDriverShift(driver.id, shift);
    }
    showToast('Driver Added ✅', `${name} successfully added`, 'success');
    closeAddDriverModal();
    renderDrivers();
    renderStats();
  } else {
    showToast('Duplicate Driver', 'A driver with this phone number already exists', 'error');
  }
});

// ===== RECENT ACTIVITY =====
function renderRecentActivity() {
  const bookings = DB.getBookings().slice(0,5);
  const container = document.getElementById('activity-feed');
  if (!container) return;
  if (bookings.length === 0) { container.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">No activity yet</div></div>`; return; }
  container.innerHTML = bookings.map(b => `
  <div class="activity-item">
    <div class="activity-icon">🚕</div>
    <div class="activity-body">
      <div class="activity-title">${b.name||'Passenger'} — ${b.pickup?.split(' ')[0]} → ${b.dropoff?.split(' ')[0]}</div>
      <div class="activity-meta">${b.id} · ${timeAgo(b.timestamp)}</div>
    </div>
    <span class="badge ${STATUS_BADGE_CLASS[b.status]||'badge-gray'} badge-sm">${STATUS_LABELS[b.status]||b.status}</span>
  </div>`).join('');
}

// ===== MANUAL BOOKING =====
function openManualBooking() { document.getElementById('manual-modal').style.display = 'flex'; }
function closeManualBooking() { document.getElementById('manual-modal').style.display = 'none'; }
function submitManualBooking(e) {
  e.preventDefault();
  const name   = document.getElementById('m-name').value.trim();
  const phone  = document.getElementById('m-phone').value.trim();
  const pickup = document.getElementById('m-pickup').value;
  const dropoff= document.getElementById('m-dropoff').value;
  const vehicle= document.getElementById('m-vehicle').value;
  const date   = document.getElementById('m-date').value;
  const time   = document.getElementById('m-time').value;
  if (!name || !phone || !pickup || !dropoff || !date) { showToast('Missing Fields','Please fill all required fields','error'); return; }
  const booking = DB.saveBooking({ name, phone, pickup, dropoff, vehicle, date, time, note: 'Manual booking by Raja Bhaiya' });
  closeManualBooking();
  loadDashboard();
  showToast('Booking Added ✅', `${booking.id} created`, 'success');
}

// ===== NOTIFICATION PREVIEW =====
function showNotificationPreview(type, bookingId) {
  const booking = bookingId ? DB.getBookings().find(b => b.id === bookingId) : DB.getBookings()[0];
  if (!booking && type !== 'daily') { showToast('No Booking', 'No bookings available to preview', 'warning'); return; }
  let title = '', msg = '', waLink = '';
  const today = new Date().toISOString().split('T')[0];
  switch(type) {
    case 'new':        msg = NotificationTemplates.newBooking(booking);          title = '🆕 NEW BOOKING Template'; break;
    case 'confirmed':  msg = NotificationTemplates.bookingConfirmed(booking);    title = '✅ CONFIRMED Template (→ Passenger)'; break;
    case 'driver':     msg = NotificationTemplates.driverAssigned(booking, 'Suresh Yadav', '9876543210'); title = '🚗 DRIVER ASSIGNED Template (→ Passenger)'; break;
    case 'completed':  msg = NotificationTemplates.tripCompleted(booking);       title = '🏁 COMPLETED Template (→ Raja Bhaiya)'; break;
    case 'warning':    msg = NotificationTemplates.escalationWarning(booking, 20); title = '⚠️ ESCALATION WARNING (15-30 min)'; break;
    case 'urgent':     msg = NotificationTemplates.escalationUrgent(booking, 45);  title = '🟠 ESCALATION URGENT (30-60 min)'; break;
    case 'critical':   msg = NotificationTemplates.escalationCritical(booking, 75);title = '🔴 ESCALATION CRITICAL (60+ min)'; break;
    case 'daily':      msg = NotificationTemplates.dailySummary(DB.getBookings(), today); title = '📊 DAILY SUMMARY (6 AM Report)'; break;
  }
  const phone = (type === 'confirmed' || type === 'driver') ? (booking?.phone || '7643081977') : '7643081977';
  waLink = `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`;
  const modal = document.getElementById('notification-modal');
  if (!modal) return;
  document.getElementById('notif-title').textContent = title;
  document.getElementById('notif-body').textContent = msg;
  document.getElementById('notif-wa-link').href = waLink;
  modal.style.display = 'flex';
}
function closeNotificationModal() { document.getElementById('notification-modal').style.display = 'none'; }
function copyNotifText() {
  const text = document.getElementById('notif-body').textContent;
  navigator.clipboard.writeText(text).then(() => showToast('Copied!', 'Message copied to clipboard', 'success'));
}

// ===== EXPORT CSV =====
function exportCSV() {
  const bookings = DB.getBookings();
  if (!bookings.length) { showToast('No Data','No bookings to export','warning'); return; }
  const headers = ['ID','Name','Phone','Pickup','Dropoff','Vehicle','Date','Time','Passengers','Status','Escalation','Created'];
  const rows = bookings.map(b => {
    const esc = computeEscalation ? computeEscalation(b) : { level: 'none', minutesElapsed: 0 };
    return [b.id, b.name, b.phone, b.pickup, b.dropoff, b.vehicle, b.date, b.time, b.passengers, b.status, esc.level !== 'none' ? `${esc.level} (${esc.minutesElapsed}m)` : '', formatDate(b.timestamp)];
  });
  const csv = [headers, ...rows].map(r => r.map(v => `"${v||''}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `devgharcabs_bookings_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  showToast('Export Complete','Bookings CSV downloaded','success');
}

// ===== TAB SWITCHING =====
function switchTab(tab) {
  document.querySelectorAll('.dash-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.dash-panel').forEach(p => p.classList.toggle('active', p.id === `panel-${tab}`));
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  const pinInput = document.getElementById('pin-input');
  if (pinInput) pinInput.addEventListener('keyup', e => { if(e.key==='Enter') submitPin(); });
  const searchEl = document.getElementById('booking-search');
  if (searchEl) searchEl.addEventListener('input', e => searchBookings(e.target.value));
  document.querySelectorAll('.filter-btn').forEach(btn => btn.addEventListener('click', () => setFilter(btn.dataset.filter)));
  const manualForm = document.getElementById('manual-booking-form');
  if (manualForm) manualForm.addEventListener('submit', submitManualBooking);
  // Auto-refresh every 2 minutes
  setInterval(() => { if(isAuthenticated) loadDashboard(); }, 120000);
});
