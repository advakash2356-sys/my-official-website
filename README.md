# my-official-website

Official website and booking platform for DevgharCabs, serving Baidyanath Dham, Devghar.

## Features

- **Cab Booking Portal**: 3-step cab booking form with route selection, travel date picker, fare estimation, and vehicle category selection (Auto/E-Rickshaw, Hatchback/Sedan, SUV/Innova/Ertiga, Tempo Traveller).
- **Driver Portal**: Dedicated driver registration page (`driver.html`).
- **Booking Engine & State Machine**: Manages booking states (`pending`, `confirmed`, `driver_assigned`, `in_progress`, `completed`, `cancelled`) with structured transition rules and WhatsApp notification generation.
- **Escalation System**: Tracks request timing with escalation tiers:
  - Warning (15–30 min)
  - Urgent (30–60 min)
  - Critical (60+ min)
- **Admin Dashboard**: PIN-protected administration panel (client-side PIN only, not real security) (`dashboard.html`) featuring live escalation monitoring, status filtering, search, and WhatsApp templates.
- **Legal & Policy Pages**: DPDP-compliant Privacy Policy (`privacy.html`), Terms of Service (`terms.html`), and grievance handling (`grievance.html`).

## Tech Stack

- **Markup**: HTML5
- **Styling**: CSS (`style.css`)
- **Scripting**: Vanilla JavaScript (`main.js`, `booking.js`, `booking-engine.js`, `dashboard.js`)

## Setup

A build step or package manager is not specified. The project consists of static files and can be deployed using:

- **Netlify Drop**: Drag and drop the website folder directly into Netlify Drop.
- **GitHub Pages**: Host directly via a GitHub repository.

*Note: For local development, setup commands are not specified in the repository files.*

## Usage

- **Main Landing Page**: Open `index.html` in a web browser.
- **Booking a Cab**: Navigate to `booking.html`, select pickup and drop-off locations, pick a date, choose a vehicle type, and submit.
- **Admin Access**: Navigate to `dashboard.html` and set your own 4-digit PIN on first visit, then enter it on later visits to view bookings and manage escalations.

## Project Structure

```
├── HOSTING_GUIDE.md           # Deployment and publishing instructions
├── index.html                 # Main landing page
├── booking.html               # 3-step cab booking form
├── booking.js                 # Booking form interactions and fare estimation logic
├── booking-engine.js          # Booking state machine, escalation rules, and WhatsApp logic
├── dashboard.html             # PIN-protected admin dashboard
├── dashboard.js               # Admin authentication and escalation monitoring logic
├── driver.html                # Driver registration portal
├── grievance.html             # Grievance redressal page
├── privacy.html               # DPDP-compliant Privacy Policy
├── terms.html                 # Terms of Service
├── style.css                  # Shared stylesheet
├── main.js                    # Shared utility scripts
└── devgharcabs_preview.html   # Preview page

## Dashboard PIN: security note

No PIN is hard-coded. On first visit you set a PIN, stored as a salted SHA-256 hash in your browser's `localStorage` (needs HTTPS or localhost for Web Crypto). This is **client-side only and not real security**: anyone with access to the browser or its dev tools can bypass or reset it, and booking data also lives client-side. For production use server-side authentication.
