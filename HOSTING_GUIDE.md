# 🕉️ DevgharCabs — Hosting Guide
### How to Publish This Website Today (Free!)

---

## 📁 Website Files

Your website folder (`Gift for bro Raja/`) contains:

```
index.html          → Main landing page
booking.html        → Cab booking form
driver.html         → Driver registration portal
dashboard.html      → Raja Bhaiya's admin panel (you set your own PIN on first visit)
privacy.html        → Privacy Policy (DPDP Compliant)
terms.html          → Terms of Service
css/style.css       → Shared stylesheet
js/main.js          → Shared utilities
js/booking.js       → Booking logic
js/dashboard.js     → Dashboard logic
```

---

## 🚀 Option 1: Netlify Drop (EASIEST — 2 Minutes)

**This is the recommended method for Raja Bhaiya.**

1. Open your browser and go to: **[https://app.netlify.com/drop](https://app.netlify.com/drop)**
2. Open Finder and locate the folder: `Documents/Gift for bro Raja/`
3. **Drag the entire folder** onto the Netlify Drop page
4. Wait 30 seconds — your site will be live at a URL like: `https://random-name-123.netlify.app`
5. Share this URL with pilgrims and drivers!

**To get a custom domain (e.g., devgharcabs.in):**
- Go to [GoDaddy.com](https://godaddy.com) or [Namecheap.com](https://namecheap.com)
- Search for `devgharcabs.in` — costs approx ₹600–₹900/year
- In Netlify → Domain Settings → Add custom domain → Follow instructions

---

## 🚀 Option 2: GitHub Pages (Free, Professional)

1. Create a free account at [github.com](https://github.com)
2. Create a new repository named `devgharcabs`
3. Upload all website files
4. Go to Settings → Pages → Set source to `main` branch
5. Site will be live at: `https://yourusername.github.io/devgharcabs/`

---

## 🌐 Option 3: Hostinger / Bluehost (Paid — Best for SEO)

If Raja Bhaiya wants a professional `.in` domain with email:
- Go to [Hostinger.in](https://hostinger.in) — hosting starts at ₹69/month
- Register `devgharcabs.in` domain (~₹600/year)
- Upload files via File Manager (cPanel)
- Site live in 1 hour

---

## 📱 How to Share the Website

Once live, share the link via:
- WhatsApp status: "🕉️ DevgharCabs is now live! Book your cab to Baidyanath Dham: [LINK]"
- Print business cards with QR code: Use [qr-code-generator.com](https://qr-code-generator.com)
- Distribute QR cards at: Jasidih Station, Deoghar Bus Stand, Dharmshaalas

---

## 🔐 Dashboard Access

- URL: `[your-site-link]/dashboard.html`
- PIN: you choose a 4-digit PIN on first visit (stored as a salted hash in that browser only; clear site data to reset). Client-side only, so not real security.
- Keep this URL private — don't share publicly

---

## 📞 What Happens When Someone Books

1. Passenger fills the 3-step booking form
2. Booking is saved locally + WhatsApp opens with booking details sent to **+91 76430 81977**
3. Raja Bhaiya gets the WhatsApp message with all details
4. Raja Bhaiya assigns a driver and informs the passenger on WhatsApp
5. Booking status updated in dashboard

---

## 🛑 Important Notes

- **No server required** — this is a fully static website
- **Bookings are saved locally** in the browser (not a cloud database) for Phase 1
- **Export CSV** from dashboard regularly to backup booking data
- For Phase 2 with a real database, a developer can add Supabase backend (cost: Free tier)

---

## 🔱 Har Har Mahadev!

*Built with devotion for Baba Baidyanath's pilgrims by the Rajkumar Shukla Family Initiative.*
