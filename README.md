# Retail Billing & POS Management System

A modern, fast, and white-label **Point of Sale (POS) & Smart Billing System** built with **TanStack Start**, **React 19**, **Tailwind CSS**, **Firebase Firestore**, and **Cloudinary**.

---

## Features

- ⚡ **High-Speed POS Billing**: Keyboard shortcuts (`F1` for quick billing), category-driven item selection, live tax calculations, and instant discounts.
- 🖨️ **Dual Print Formats**:
  - **80mm Thermal Receipt**: Formatted for ESC/POS thermal printers with itemized totals, store header, and custom terms.
  - **A4 / Letter Tax Invoice**: Standard tax invoice layout with GST breakdowns and authorized signatory boxes.
- 📱 **Two Distinct QR Code Types**:
  - **UPI Payment QR**: Dynamic "Scan to Pay via UPI" generated only on UPI payment methods.
  - **Dynamic Social / Review QR**: Customizable call-to-action QR code (Google Review link, Instagram, Store Website, or Custom URL).
- 📦 **Asset Library**: Integrated Cloudinary CDN media manager with signed asset deletion and real-time storage quota tracking.
- 🎨 **Visual Theme & Brand Customizer**: Light/Dark theme toggle with full live palette customization (Primary, Secondary, Hover, Background, Text) saved directly to Firestore.
- 🔒 **Admin Security**: OTP verification for sensitive credentials via Resend transactional email API.

---

## Quick Start Guide

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd <repository-folder>
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Copy `.env.example` to `.env`:

```bash
# On Windows (PowerShell):
Copy-Item .env.example .env

# On Linux / macOS / Git Bash:
cp .env.example .env
```

Open `.env` and fill in your configuration credentials:

```env
# ==========================================
# 1. Application / Store Branding
# ==========================================
VITE_APP_NAME="Retail Billing System"
VITE_BUSINESS_NAME="Retail Store"
VITE_STORE_NAME="Main Store Outlet"

# ==========================================
# 2. Firebase Database Configuration (Client)
# ==========================================
VITE_FIREBASE_API_KEY="your_firebase_api_key"
VITE_FIREBASE_AUTH_DOMAIN="your-app.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-app"
VITE_FIREBASE_STORAGE_BUCKET="your-app.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
VITE_FIREBASE_APP_ID="your_app_id"
VITE_FIREBASE_MEASUREMENT_ID=""

# ==========================================
# 3. Firebase Admin / Server SDK (Optional)
# ==========================================
FIREBASE_PROJECT_ID="your-app"
FIREBASE_CLIENT_EMAIL=""
FIREBASE_CLIENT_ID=""
FIREBASE_PRIVATE_KEY=""

# ==========================================
# 4. Outside Email Service (Resend API)
# ==========================================
# Used to dispatch OTP verification & password reset emails
MYBUSINESSMATE_RESEND_API_KEY="re_xxxxxxxxxxxx"

# ==========================================
# 5. Cloudinary CDN Image Storage
# ==========================================
# Direct unsigned upload credentials
VITE_CLOUDINARY_CLOUD_NAME="your_cloud_name"
VITE_CLOUDINARY_UPLOAD_PRESET="your_unsigned_preset_name"
VITE_CLOUDINARY_FOLDER="your_store_folder"

# Cloudinary Master/Root API credentials (required for deleting assets)
CLOUDINARY_API_KEY="your_root_api_key"
CLOUDINARY_API_SECRET="your_root_api_secret"

# ==========================================
# 6. Storage Quota (in MB)
# ==========================================
VITE_MAX_STORAGE_MB="100"
```

---

## Running the Application

### Start Development Server

```bash
npm run dev
```

Open your browser and navigate to:

```
http://localhost:3000
```

---

## Build for Production

To create an optimized production build:

```bash
npm run build
```

To run the production server locally:

```bash
npm run start
```

---

## Environment Variables Reference

| Variable                        | Description                                        | Required |
| :------------------------------ | :------------------------------------------------- | :------- |
| `VITE_APP_NAME`                 | Browser tab title & default application branding   | Yes      |
| `VITE_BUSINESS_NAME`            | Default business / company name                    | Yes      |
| `VITE_FIREBASE_API_KEY`         | Firebase Web API Key                               | Yes      |
| `VITE_FIREBASE_PROJECT_ID`      | Firebase Project ID for Firestore database         | Yes      |
| `MYBUSINESSMATE_RESEND_API_KEY` | Resend API key for OTP / Email dispatch            | Optional |
| `VITE_CLOUDINARY_CLOUD_NAME`    | Cloudinary Cloud Name for image storage            | Yes      |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Unsigned Upload Preset name in Cloudinary          | Yes      |
| `CLOUDINARY_API_KEY`            | Cloudinary `root` API Key (for server deletion)    | Yes      |
| `CLOUDINARY_API_SECRET`         | Cloudinary `root` API Secret (for server deletion) | Yes      |
| `VITE_MAX_STORAGE_MB`           | Maximum asset storage limit (e.g. `100`)           | Yes      |

---

## Cloudinary Configuration Tips

1. **Unsigned Upload Preset**:
   - In your [Cloudinary Console](https://cloudinary.com/console) $\rightarrow$ **Settings ⚙️** $\rightarrow$ **Upload** $\rightarrow$ **Add Upload Preset**.
   - Set **Signing Mode** to **Unsigned**.
   - Enter this preset name into `VITE_CLOUDINARY_UPLOAD_PRESET`.
2. **API Key & Secret**:
   - In Cloudinary Settings $\rightarrow$ **API Keys**, locate the **`root`** key.
   - Copy the API Key into `CLOUDINARY_API_KEY` and API Secret into `CLOUDINARY_API_SECRET`.

---

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── billing/          # Product entry, customer lookup, thermal & A4 invoices
│   │   ├── history/          # Invoice search, filters, and drawer viewer
│   │   ├── library/          # Media asset manager and upload dropzone
│   │   ├── settings/         # Theme customizer, QR config, template customizer
│   │   └── layout/           # Sidebar, TopNav, AppLayout
│   ├── config/               # Constants, env parser, and collections
│   ├── context/              # POSContext state management
│   ├── lib/
│   │   ├── firebase.ts       # Firebase client initialization
│   │   └── server/           # TanStack Start server functions & services
│   ├── routes/               # File-based TanStack routes
│   └── types/                # TypeScript schemas (Zod) & POS interfaces
├── .env.example              # Environment variables template
├── package.json              # Dependencies and scripts
└── README.md
```

---

## License

This project is proprietary and confidential. All rights reserved.
