/**
 * DevgharCabs — Main JS Utilities
 * Shared functions used across all pages
 */

// ===== CONSTANTS =====
const RAJA_PHONE = '917643081977';
const RAJA_PHONE_DISPLAY = '+91 76430 81977';
const BRAND_NAME = 'DevgharCabs';
const DB_KEY_BOOKINGS = 'dgc_bookings';
const DB_KEY_DRIVERS = 'dgc_drivers';

// ===== LOCAL STORAGE DB =====
const DB = {
  getBookings() {
    try { return JSON.parse(localStorage.getItem(DB_KEY_BOOKINGS) || '[]'); }
    catch { return []; }
  },
  saveBooking(booking) {
    const bookings = this.getBookings();
    booking.id = 'DGC-' + Math.floor(100000 + Math.random() * 900000);
    booking.timestamp = new Date().toISOString();
    booking.status = 'pending';
    bookings.unshift(booking);
    localStorage.setItem(DB_KEY_BOOKINGS, JSON.stringify(bookings));
    return booking;
  },
  updateBookingStatus(id, status) {
    const bookings = this.getBookings();
    const idx = bookings.findIndex(b => b.id === id);
    if (idx > -1) { bookings[idx].status = status; bookings[idx].updatedAt = new Date().toISOString(); }
    localStorage.setItem(DB_KEY_BOOKINGS, JSON.stringify(bookings));
  },
  getDrivers() {
    try { return JSON.parse(localStorage.getItem(DB_KEY_DRIVERS) || '[]'); }
    catch { return []; }
  },
  saveDriver(driver) {
    const drivers = this.getDrivers();
    // Check for duplicate
    if (drivers.find(d => d.phone === driver.phone)) return null;
    driver.id = 'DRV-' + Math.floor(1000 + Math.random() * 9000);
    driver.timestamp = new Date().toISOString();
    driver.status = 'pending';
    driver.available = false;
    drivers.unshift(driver);
    localStorage.setItem(DB_KEY_DRIVERS, JSON.stringify(drivers));
    return driver;
  },
  updateDriverStatus(id, status, available) {
    const drivers = this.getDrivers();
    const idx = drivers.findIndex(d => d.id === id);
    if (idx > -1) {
      if (status !== undefined) drivers[idx].status = status;
      if (available !== undefined) {
        drivers[idx].available = available;
        if (!available) drivers[idx].shiftEndTime = null; // Clear shift if manually made offline
      }
    }
    localStorage.setItem(DB_KEY_DRIVERS, JSON.stringify(drivers));
  },
  startDriverShift(id, durationMinutes) {
    const drivers = this.getDrivers();
    const idx = drivers.findIndex(d => d.id === id);
    if (idx > -1) {
      drivers[idx].available = true;
      drivers[idx].shiftStartTime = Date.now();
      drivers[idx].shiftDuration = durationMinutes;
      drivers[idx].shiftEndTime = Date.now() + (durationMinutes * 60000);
      localStorage.setItem(DB_KEY_DRIVERS, JSON.stringify(drivers));
    }
  },
  endDriverShift(id) {
    this.updateDriverStatus(id, undefined, false);
  }
};

// Driver Shift Helper
function getDriverShiftStatus(driver) {
  if (!driver.available || !driver.shiftEndTime) {
    return { isOnline: false, isEndingSoon: false, minutesLeft: 0 };
  }
  const now = Date.now();
  const timeLeft = driver.shiftEndTime - now;
  const minutesLeft = Math.floor(timeLeft / 60000);
  
  if (minutesLeft <= 0) {
    return { isOnline: false, isEndingSoon: false, minutesLeft: 0 };
  }
  return {
    isOnline: true,
    isEndingSoon: minutesLeft <= 20, // Warning threshold
    minutesLeft
  };
}

// ===== WHATSAPP HELPERS =====
const WA = {
  bookingAlert(booking) {
    const msg = encodeURIComponent(
      `🕉️ *NEW BOOKING — DevgharCabs*\n\n` +
      `📋 ID: ${booking.id}\n` +
      `👤 Name: ${booking.name}\n` +
      `📱 Phone: +91${booking.phone}\n` +
      `📍 Pickup: ${booking.pickup}\n` +
      `🏁 Drop: ${booking.dropoff}\n` +
      `🚗 Vehicle: ${booking.vehicle}\n` +
      `📅 Date: ${booking.date}\n` +
      `🕐 Time: ${booking.time}\n` +
      `👥 Passengers: ${booking.passengers}\n` +
      `📝 Note: ${booking.note || 'None'}\n\n` +
      `💰 Payment: Cash on Arrival\n\n` +
      `Reply CONFIRM to accept or CANCEL to reject.`
    );
    return `https://wa.me/${RAJA_PHONE}?text=${msg}`;
  },
  driverAlert(driver) {
    const msg = encodeURIComponent(
      `🚗 *NEW DRIVER APPLICATION — DevgharCabs*\n\n` +
      `👤 Name: ${driver.name}\n` +
      `📱 Phone: +91${driver.phone}\n` +
      `🚘 Vehicle: ${driver.vehicle}\n` +
      `🪪 License: ${driver.license}\n` +
      `📍 Area: ${driver.area}\n` +
      `📅 Applied: ${new Date().toLocaleDateString('en-IN')}\n\n` +
      `Please verify and onboard this driver.`
    );
    return `https://wa.me/${RAJA_PHONE}?text=${msg}`;
  },
  contactSupport(issue) {
    const msg = encodeURIComponent(
      `🆘 *Support Request — DevgharCabs*\n\n${issue || 'I need help with my booking.'}\n\n🙏 Har Har Mahadev`
    );
    return `https://wa.me/${RAJA_PHONE}?text=${msg}`;
  }
};

// ===== TOAST NOTIFICATIONS =====
function showToast(title, msg, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', info: '🔔', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || '🔔'}</div>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
    </div>
  `;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(-10px)'; toast.style.transition = 'all 0.3s'; setTimeout(() => toast.remove(), 300); }, duration);
}

// ===== LANG TOGGLE =====
function toggleLang() {
  document.body.classList.toggle('hindi');
  const isHindi = document.body.classList.contains('hindi');
  localStorage.setItem('dgc_lang', isHindi ? 'hi' : 'en');
  document.querySelectorAll('.lang-toggle').forEach(btn => {
    btn.textContent = isHindi ? 'English' : 'हिंदी';
  });
}
function initLang() {
  const saved = localStorage.getItem('dgc_lang');
  if (saved === 'hi') {
    document.body.classList.add('hindi');
    document.querySelectorAll('.lang-toggle').forEach(btn => btn.textContent = 'English');
  }
}

// ===== NAVBAR SCROLL =====
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  // Mobile hamburger
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('open');
      }
    });
  }
}

// ===== PAGE LOADER =====
function hideLoader() {
  const loader = document.getElementById('page-loader');
  if (loader) {
    setTimeout(() => loader.classList.add('hidden'), 800);
  }
}

// ===== FARE TABLE =====
const FARES = {
  'Jasidih Rly. Station|Baidyanath Dham Temple': { auto: '₹100–180', sedan: '₹200–350', suv: '₹350–500', tempo: '₹500–800' },
  'Deoghar Bus Stand|Baidyanath Dham Temple':    { auto: '₹60–100',  sedan: '₹120–200', suv: '₹200–320', tempo: '₹350–550' },
  'Dumka|Baidyanath Dham Temple':                { auto: 'N/A',       sedan: '₹700–950', suv: '₹950–1400', tempo: '₹1500–2000' },
  'Giridih|Baidyanath Dham Temple':              { auto: 'N/A',       sedan: '₹900–1200', suv: '₹1200–1700', tempo: '₹1800–2500' },
  'Chittaranjan|Baidyanath Dham Temple':         { auto: 'N/A',       sedan: '₹800–1100', suv: '₹1100–1500', tempo: '₹1600–2200' },
  'Jhajha|Baidyanath Dham Temple':               { auto: 'N/A',       sedan: '₹600–850',  suv: '₹850–1200', tempo: '₹1200–1700' },
  'Baidyanath Dham Temple|Jasidih Rly. Station': { auto: '₹100–180', sedan: '₹200–350', suv: '₹350–500', tempo: '₹500–800' },
  'Baidyanath Dham Temple|Deoghar Bus Stand':    { auto: '₹60–100',  sedan: '₹120–200', suv: '₹200–320', tempo: '₹350–550' },
};
function getFare(pickup, dropoff, vehicle) {
  const key1 = `${pickup}|${dropoff}`;
  const key2 = `${dropoff}|${pickup}`;
  const f = FARES[key1] || FARES[key2];
  if (!f) return 'Call for quote';
  const v = vehicle ? vehicle.split('|')[0] : null;
  if (!v || !f[v]) return 'Call for quote';
  if (f[v] === 'N/A') return 'Not available for this route';
  return f[v];
}

// ===== DATE HELPERS =====
function formatDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ===== STATUS HELPERS =====
const STATUS_LABELS = {
  pending: 'Pending', confirmed: 'Confirmed', assigned: 'Driver Assigned',
  ongoing: 'Ongoing', completed: 'Completed', cancelled: 'Cancelled'
};
const STATUS_BADGE_CLASS = {
  pending: 'badge-gold', confirmed: 'badge-blue', assigned: 'badge-saffron',
  ongoing: 'badge-saffron', completed: 'badge-green', cancelled: 'badge-red'
};

// ===== INIT ON LOAD =====
document.addEventListener('DOMContentLoaded', () => {
  initLang();
  initNavbar();
  initCookieConsent();
  hideLoader();
});

// ===== COOKIE CONSENT =====
function initCookieConsent() {
  const banner = document.getElementById('cookie-consent');
  if (banner && !localStorage.getItem('devgharcabs_cookie_consent')) {
    // Show after 1.5s delay
    setTimeout(() => {
      banner.style.display = 'flex';
    }, 1500);
  }
}

function acceptCookies() {
  localStorage.setItem('devgharcabs_cookie_consent', 'true');
  const banner = document.getElementById('cookie-consent');
  if (banner) {
    banner.style.display = 'none';
    showToast('Preferences saved');
  }
}
