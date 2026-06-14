/**
 * DevgharCabs — Comprehensive Booking Engine
 * Handles booking state, escalation logic, and WhatsApp notification generation
 * Raja Bhaiya's automation backbone
 */

// ===== BOOKING STATUS STATE MACHINE =====
const BookingStatus = {
  PENDING:         'pending',
  CONFIRMED:       'confirmed',
  DRIVER_ASSIGNED: 'driver_assigned',
  IN_PROGRESS:     'in_progress',
  COMPLETED:       'completed',
  CANCELLED:       'cancelled'
};

// Valid status transitions
const StatusTransitions = {
  pending:         ['confirmed', 'cancelled'],
  confirmed:       ['driver_assigned', 'cancelled'],
  driver_assigned: ['in_progress', 'cancelled'],
  in_progress:     ['completed', 'cancelled'],
  completed:       [],
  cancelled:       []
};

// ===== ESCALATION SYSTEM =====
const EscalationLevel = {
  NONE:     'none',     // 0–15 min — normal
  WARNING:  'warning',  // 15–30 min — gentle reminder
  URGENT:   'urgent',   // 30–60 min — urgent
  CRITICAL: 'critical'  // 60+ min — CRITICAL
};

const EscalationConfig = {
  WARNING:  { minMinutes: 15, maxMinutes: 30,   color: '#F59E0B', bgColor: 'rgba(245,158,11,0.12)',  badge: '⚠️ WARNING',  label: 'Needs Attention' },
  URGENT:   { minMinutes: 30, maxMinutes: 60,   color: '#F97316', bgColor: 'rgba(249,115,22,0.15)',  badge: '🟠 URGENT',   label: 'Act Within 30 Min' },
  CRITICAL: { minMinutes: 60, maxMinutes: 9999, color: '#EF4444', bgColor: 'rgba(239,68,68,0.2)',    badge: '🔴 CRITICAL', label: 'IMMEDIATE ACTION' }
};

/**
 * Calculate escalation level for a booking
 * @param {Object} booking
 * @returns {{ level: string, minutesElapsed: number, config: Object|null }}
 */
function computeEscalation(booking) {
  // Only pending bookings can escalate
  if (booking.status !== BookingStatus.PENDING) {
    return { level: EscalationLevel.NONE, minutesElapsed: 0, config: null };
  }
  const minutesElapsed = Math.floor((Date.now() - new Date(booking.timestamp).getTime()) / 60000);
  if (minutesElapsed >= EscalationConfig.CRITICAL.minMinutes) {
    return { level: EscalationLevel.CRITICAL, minutesElapsed, config: EscalationConfig.CRITICAL };
  }
  if (minutesElapsed >= EscalationConfig.URGENT.minMinutes) {
    return { level: EscalationLevel.URGENT, minutesElapsed, config: EscalationConfig.URGENT };
  }
  if (minutesElapsed >= EscalationConfig.WARNING.minMinutes) {
    return { level: EscalationLevel.WARNING, minutesElapsed, config: EscalationConfig.WARNING };
  }
  return { level: EscalationLevel.NONE, minutesElapsed, config: null };
}

/**
 * Get all escalated bookings sorted by urgency
 */
function getEscalatedBookings() {
  const bookings = DB.getBookings();
  return bookings
    .map(b => ({ ...b, escalation: computeEscalation(b) }))
    .filter(b => b.escalation.level !== EscalationLevel.NONE)
    .sort((a, b) => {
      const order = { critical: 0, urgent: 1, warning: 2 };
      return order[a.escalation.level] - order[b.escalation.level];
    });
}

/**
 * Validate a status transition
 */
function canTransition(currentStatus, newStatus) {
  return (StatusTransitions[currentStatus] || []).includes(newStatus);
}

// ===== WHATSAPP NOTIFICATION TEMPLATES =====
const NotificationTemplates = {

  /**
   * 🆕 NEW BOOKING — Sent to Raja Bhaiya when passenger books
   */
  newBooking(booking) {
    return (
      `🕉️ *नई बुकिंग — DevgharCabs*\n\n` +
      `📋 *Booking ID:* ${booking.id}\n` +
      `👤 *Passenger:* ${booking.name}\n` +
      `📱 *Phone:* +91 ${booking.phone}\n` +
      `─────────────────\n` +
      `📍 *Pickup:* ${booking.pickup}\n` +
      `🏁 *Drop:* ${booking.dropoff}\n` +
      `🚗 *Vehicle:* ${booking.vehicle}\n` +
      `📅 *Date:* ${booking.date}\n` +
      `🕐 *Time:* ${booking.time}\n` +
      `👥 *Passengers:* ${booking.passengers || 1}\n` +
      `📝 *Note:* ${booking.note || 'None'}\n` +
      `─────────────────\n` +
      `💰 Payment: Cash on Arrival\n` +
      `🕒 Booked: ${new Date(booking.timestamp).toLocaleString('en-IN')}\n\n` +
      `*Reply with:*\n` +
      `✅ *CONFIRM ${booking.id}* — to confirm\n` +
      `❌ *CANCEL ${booking.id}* — to cancel\n` +
      `🚗 *DRIVER ${booking.id} [name] [phone]* — to assign\n\n` +
      `🙏 Har Har Mahadev`
    );
  },

  /**
   * ✅ CONFIRMED — Sent to passenger when booking is confirmed
   */
  bookingConfirmed(booking) {
    return (
      `✅ *DevgharCabs — Booking Confirmed!*\n\n` +
      `Namaste ${booking.name} Ji! 🙏\n\n` +
      `Your cab has been confirmed.\n\n` +
      `📋 *Booking ID:* ${booking.id}\n` +
      `📍 *From:* ${booking.pickup}\n` +
      `🏁 *To:* ${booking.dropoff}\n` +
      `📅 *Date:* ${booking.date} at ${booking.time}\n` +
      `🚗 *Vehicle:* ${booking.vehicle}\n\n` +
      `Driver details will be shared shortly.\n\n` +
      `📞 Any help? Call Raja Bhaiya: +91 76430 81977\n\n` +
      `🕉️ *Har Har Mahadev — Safe Journey!* 🔱`
    );
  },

  /**
   * 🚗 DRIVER_ASSIGNED — Sent to passenger when driver is assigned
   */
  driverAssigned(booking, driverName, driverPhone) {
    return (
      `🚗 *DevgharCabs — Driver Assigned!*\n\n` +
      `Namaste ${booking.name} Ji! 🙏\n\n` +
      `Your driver is on the way!\n\n` +
      `👤 *Driver:* ${driverName}\n` +
      `📱 *Driver's Number:* +91 ${driverPhone}\n` +
      `🚗 *Booking:* ${booking.id}\n` +
      `📍 *Pickup:* ${booking.pickup}\n` +
      `🕐 *Time:* ${booking.time}\n\n` +
      `💰 *Payment:* Cash to driver on arrival\n\n` +
      `📞 Direct driver contact: *+91 ${driverPhone}*\n` +
      `📞 Raja Bhaiya: *+91 76430 81977*\n\n` +
      `🕉️ *Har Har Mahadev — Have a Safe Trip!* 🔱`
    );
  },

  /**
   * 🏁 COMPLETED — Sent to Raja Bhaiya when trip is marked done
   */
  tripCompleted(booking) {
    return (
      `🏁 *Trip Completed — DevgharCabs*\n\n` +
      `Raja Bhaiya, trip is done! ✅\n\n` +
      `📋 *Booking ID:* ${booking.id}\n` +
      `👤 *Passenger:* ${booking.name} (+91 ${booking.phone})\n` +
      `📍 ${booking.pickup} → ${booking.dropoff}\n` +
      `📅 ${booking.date} at ${booking.time}\n\n` +
      `💰 *Cash collected by driver on arrival.*\n\n` +
      `Please confirm cash collected & close this booking.\n` +
      `🙏 Har Har Mahadev`
    );
  },

  /**
   * ⚠️ ESCALATION_WARNING (15–30 min) — Yellow
   */
  escalationWarning(booking, minutesElapsed) {
    return (
      `⚠️ *Booking Reminder — DevgharCabs*\n\n` +
      `Raja Bhaiya, this booking needs your attention.\n\n` +
      `📋 *Booking:* ${booking.id}\n` +
      `👤 *Passenger:* ${booking.name} (+91 ${booking.phone})\n` +
      `📍 *Route:* ${booking.pickup} → ${booking.dropoff}\n` +
      `📅 *Travel Time:* ${booking.date} ${booking.time}\n\n` +
      `⏰ *Waiting since:* ${minutesElapsed} minutes\n\n` +
      `ग्राहक का इंतज़ार है! Please confirm ASAP.\n\n` +
      `*Reply:* CONFIRM ${booking.id}\n\n` +
      `🙏 Har Har Mahadev`
    );
  },

  /**
   * 🟠 ESCALATION_URGENT (30–60 min) — Orange
   */
  escalationUrgent(booking, minutesElapsed) {
    return (
      `🟠 *URGENT — DevgharCabs Action Needed!*\n\n` +
      `*🔔 यह बुकिंग ${minutesElapsed} मिनट से pending है!*\n\n` +
      `📋 *Booking:* ${booking.id}\n` +
      `👤 *${booking.name}* — 📱 +91 ${booking.phone}\n` +
      `📍 *${booking.pickup}* → *${booking.dropoff}*\n` +
      `🕐 *Travel At:* ${booking.date} ${booking.time}\n\n` +
      `⚠️ *ग्राहक रद्द कर सकता है!*\n` +
      `Please respond in next 10 minutes.\n\n` +
      `✅ CONFIRM ${booking.id}\n` +
      `❌ CANCEL ${booking.id}\n\n` +
      `📞 *Call passenger now:* +91 ${booking.phone}\n\n` +
      `🙏 Har Har Mahadev`
    );
  },

  /**
   * 🔴 ESCALATION_CRITICAL (60+ min) — Red/Critical format
   */
  escalationCritical(booking, minutesElapsed) {
    return (
      `🚨🚨 *CRITICAL ALERT — DevgharCabs* 🚨🚨\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `⛔ *${minutesElapsed} MINUTES — NO RESPONSE!*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📋 *${booking.id}*\n` +
      `👤 *${booking.name}* | 📱 *+91 ${booking.phone}*\n` +
      `📍 *${booking.pickup} → ${booking.dropoff}*\n` +
      `🕐 *${booking.date} at ${booking.time}*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔴 *तुरंत जवाब दें या कॉल करें!*\n` +
      `🔴 *Customer will cancel & rate badly!*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📞 *CALL NOW:* +91 ${booking.phone}\n\n` +
      `✅ CONFIRM ${booking.id}\n` +
      `❌ CANCEL ${booking.id}\n\n` +
      `🔴 *THIS IS YOUR FINAL ALERT* 🔴`
    );
  },

  /**
   * 📊 DAILY SUMMARY — Sent to Raja Bhaiya every morning at 6 AM
   */
  dailySummary(bookings, date) {
    const total   = bookings.length;
    const pending   = bookings.filter(b => b.status === 'pending').length;
    const confirmed = bookings.filter(b => b.status === 'confirmed').length;
    const completed = bookings.filter(b => b.status === 'completed').length;
    const cancelled = bookings.filter(b => b.status === 'cancelled').length;

    const todayTrips = bookings.filter(b => b.date === date);

    return (
      `📊 *DevgharCabs — Daily Summary*\n` +
      `📅 *${date}*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📋 *All Bookings:* ${total}\n` +
      `⏳ Pending: ${pending}\n` +
      `✅ Confirmed: ${confirmed}\n` +
      `🏁 Completed: ${completed}\n` +
      `❌ Cancelled: ${cancelled}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📅 *Today's Trips:* ${todayTrips.length}\n` +
      (todayTrips.map(b =>
        `  🚕 ${b.time} | ${b.name} | ${b.pickup?.split(' ')[0]} → ${b.dropoff?.split(' ')[0]}`
      ).join('\n') || '  No trips today') + '\n' +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `${pending > 0 ? `⚠️ *${pending} booking(s) need confirmation!*\n` : ''}` +
      `🙏 *Har Har Mahadev — Have a great day!* 🕉️`
    );
  },

  /**
   * Generate WhatsApp link for a template
   */
  getLink(phone, message) {
    return `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;
  },

  getRajaBhaiyaLink(message) {
    return `https://wa.me/917643081977?text=${encodeURIComponent(message)}`;
  }
};

// ===== MAKE.COM SCENARIO DEFINITIONS =====
const MakeScenarios = {
  scenarios: [
    {
      id: 1,
      name: 'New Booking Handler',
      trigger: 'Webhook (Website Form Submit)',
      steps: [
        { icon: '🌐', label: 'Website Form', desc: 'Passenger submits booking form' },
        { icon: '📊', label: 'Google Sheets', desc: 'Append row to BookingsDB sheet' },
        { icon: '💬', label: 'WhatsApp Message', desc: 'Send NEW_BOOKING alert to Raja Bhaiya (+91 7643081977)' },
        { icon: '⏰', label: '15-min Timer', desc: 'Schedule escalation check' },
        { icon: '🔍', label: 'Check Status', desc: 'Is booking still PENDING?' },
        { icon: '📤', label: 'Escalation Alert', desc: 'Send WARNING message if unresponded' }
      ]
    },
    {
      id: 2,
      name: 'Escalation Monitor',
      trigger: 'Schedule (Every 15 minutes)',
      steps: [
        { icon: '⏰', label: 'Scheduler', desc: 'Runs every 15 minutes, 24/7' },
        { icon: '📊', label: 'Google Sheets', desc: 'Fetch all rows where Status = PENDING' },
        { icon: '🧮', label: 'Calculate Time', desc: 'Compute minutes since booking created' },
        { icon: '🔀', label: 'Route by Level', desc: '15-30min → WARNING, 30-60min → URGENT, 60+ → CRITICAL' },
        { icon: '💬', label: 'Send Escalation', desc: 'Send level-appropriate WhatsApp message to Raja Bhaiya' },
        { icon: '📝', label: 'Update Sheet', desc: 'Log escalation event in EscalationLog tab' }
      ]
    },
    {
      id: 3,
      name: 'WhatsApp Command Processor',
      trigger: 'WhatsApp Business API Webhook',
      steps: [
        { icon: '💬', label: 'WA Incoming', desc: 'Raja Bhaiya replies: CONFIRM DGC-123456' },
        { icon: '🔍', label: 'Parse Command', desc: 'Extract action (CONFIRM/CANCEL/DRIVER) + Booking ID' },
        { icon: '📊', label: 'Update Sheet', desc: 'Change status in Google Sheet' },
        { icon: '📧', label: 'Notify Passenger', desc: 'Send CONFIRMED message to passenger via WhatsApp' },
        { icon: '✅', label: 'Confirm to RB', desc: 'Send acknowledgment: "Done! ${bookingId} confirmed."' }
      ]
    },
    {
      id: 4,
      name: 'Daily Summary Report',
      trigger: 'Schedule (Daily at 6:00 AM)',
      steps: [
        { icon: '🌅', label: '6 AM Trigger', desc: 'Runs every morning at 6:00 AM IST' },
        { icon: '📊', label: 'Fetch Bookings', desc: "Pull today's bookings from Google Sheets" },
        { icon: '📈', label: 'Build Report', desc: 'Count pending/confirmed/completed/cancelled' },
        { icon: '💬', label: 'Send Summary', desc: 'Daily summary WhatsApp to Raja Bhaiya (+91 7643081977)' }
      ]
    }
  ],

  googleSheetColumns: [
    { col: 'A', field: 'BookingID',   type: 'Text',     example: 'DGC-123456' },
    { col: 'B', field: 'Timestamp',   type: 'DateTime', example: '2024-06-14 09:30:00' },
    { col: 'C', field: 'Name',        type: 'Text',     example: 'Ramesh Kumar' },
    { col: 'D', field: 'Phone',       type: 'Number',   example: '9876543210' },
    { col: 'E', field: 'Pickup',      type: 'Text',     example: 'Jasidih Rly. Station' },
    { col: 'F', field: 'Dropoff',     type: 'Text',     example: 'Baidyanath Dham Temple' },
    { col: 'G', field: 'Vehicle',     type: 'Text',     example: 'Hatchback / Sedan' },
    { col: 'H', field: 'Date',        type: 'Date',     example: '2024-06-14' },
    { col: 'I', field: 'Time',        type: 'Time',     example: '10:30 AM' },
    { col: 'J', field: 'Passengers',  type: 'Number',   example: '3' },
    { col: 'K', field: 'Note',        type: 'Text',     example: 'Elderly passenger' },
    { col: 'L', field: 'Status',      type: 'Text',     example: 'PENDING' },
    { col: 'M', field: 'DriverName',  type: 'Text',     example: 'Suresh Yadav' },
    { col: 'N', field: 'DriverPhone', type: 'Number',   example: '9123456789' },
    { col: 'O', field: 'UpdatedAt',   type: 'DateTime', example: '2024-06-14 09:45:00' },
    { col: 'P', field: 'EscalLevel',  type: 'Text',     example: 'WARNING' },
    { col: 'Q', field: 'EscalCount',  type: 'Number',   example: '2' }
  ]
};

// ===== EXPORT TO GLOBAL =====
window.BookingStatus      = BookingStatus;
window.StatusTransitions  = StatusTransitions;
window.EscalationLevel    = EscalationLevel;
window.EscalationConfig   = EscalationConfig;
window.computeEscalation  = computeEscalation;
window.getEscalatedBookings = getEscalatedBookings;
window.canTransition      = canTransition;
window.NotificationTemplates = NotificationTemplates;
window.MakeScenarios      = MakeScenarios;
