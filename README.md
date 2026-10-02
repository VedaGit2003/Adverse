# 🌆 ADVERSE - Outdoor Advertising & Hoarding Rental Marketplace (West Bengal)

**ADVERSE** is an end-to-end, multi-tenant digital platform built to modernize and digitize the offline hoarding (billboard / OOH) rental business across **West Bengal** (Kolkata, Howrah, Siliguri, Durgapur, Asansol, and arterial highways).

The platform bridges offline operations into the digital realm by providing **geospatial nearby hoarding discovery**, **online and offline booking workflows**, and **dual payment tracking** (Cheque, NEFT/RTGS/UPI reference, Cash receipt upload & site owner verification).

---

## 🏛️ System Architecture

```
Adverse/
├── server/                 # Microservice-Ready Node.js/Express Backend
│   ├── src/
│   │   ├── config/         # Database with automated fallback & env configs
│   │   ├── middlewares/    # Multi-role JWT auth & central error handling
│   │   ├── models/         # User, Hoarding (2dsphere geo), Booking, Payment
│   │   ├── modules/
│   │   │   ├── auth/       # Multi-role Auth (Admin, Seller, Customer)
│   │   │   ├── hoardings/  # Hoarding Catalog & West Bengal Geospatial Search
│   │   │   ├── bookings/   # Availability Engine & Overlap Conflict Guard
│   │   │   ├── payments/   # Offline Cheque/NEFT verification & Online hooks
│   │   │   ├── admin/      # Metrics, user management & site moderation
│   │   │   └── upload/     # Photo & receipt upload handling
│   │   └── utils/geo.js    # West Bengal advertising hubs coordinate database
│   └── tests/              # Automated Jest & Supertest integration tests
├── client-web/             # MERN Web Portal (Next.js App Router Ready)
│   ├── src/
│   │   ├── components/     # Navbar, Footer, HoardingCard
│   │   ├── context/        # AuthContext with role-based access
│   │   ├── pages/          # Home, SearchResults, HoardingDetail,
│   │   │                   # SellerDashboard, AdminDashboard, MyBookings
│   │   └── services/       # Axios API client
└── client-mobile/          # React Native Expo Mobile App (Play Store Ready)
    ├── app.json            # Android Play Store package & permission configs
    ├── eas.json            # EAS Build production app-bundle profiles
    └── src/screens/        # HomeScreen, HoardingDetail, Bookings, SellerDesk
```

---

## 👥 Three-Tier User Roles

| Role | Description | Key Capabilities |
| :--- | :--- | :--- |
| **👑 Super Admin** | Platform Governance & Oversight | System-wide revenue metrics, site moderation (approve/reject), user management. |
| **🏢 Seller (Site Owner)** | Media Owners with Hoarding Sites | Enlist hoardings (dimensions, lighting, rate card, location), view incoming booking requests, verify offline cheques / UTR references, monitor active occupancy. |
| **🛍️ Customer (Advertiser)** | Brands, Agencies & Local Businesses | Search hoardings by location/city or GPS "Near Me", compare rates, check availability, book dates with offline/online payments, submit campaign artwork. |

---

## 💳 Offline & Online Payment Reconciliation Loop

To digitize offline bookings and cash/cheque workflows:
1. **Advertiser** selects a hoarding and date range, choosing an offline payment method:
   - **Bank Cheque**: Enters Cheque Number, Bank Name, and attaches slip.
   - **NEFT / RTGS / UPI**: Enters UTR / Transaction Reference.
   - **Cash**: Records cash settlement details with desk.
2. The system reserves the dates and sets `bookingStatus: 'requested'` and `paymentStatus: 'pending'`.
3. The **Seller (Site Owner)** sees the incoming payment record on their **Seller Offline Desk**.
4. Upon clearing the cheque or verifying the bank deposit, the Seller clicks **"Verify & Confirm"**.
5. The system automatically flips the payment to `'verified'` and the booking to `'confirmed'`, locking out conflicting bookings on the calendar!

---

## ⚡ Quick Start Guide

### 1. Prerequisites
- Node.js (v18+)
- npm (v9+)
- *(Optional)* Local MongoDB or MongoDB Atlas URI (The server includes an automated in-memory MongoDB fallback for instant local testing).

### 2. Backend Setup & Seeding
```bash
# Navigate to server directory
cd server

# Install dependencies (if not already installed)
npm install

# Seed sample West Bengal hoardings, users, and bookings
npm run seed

# Start server in development mode
npm run dev
# Server runs on: http://localhost:5000
# Health check:  http://localhost:5000/api/health
```

### 3. Run Automated Tests
```bash
cd server
npm test
```
*Executes all 10 integration tests covering multi-role auth, geospatial search, booking conflict resolution, and offline payment verification.*

### 4. Web Client Setup (MERN)
```bash
# Navigate to web client
cd ../client-web

# Install dependencies
npm install

# Start Vite development server
npm run dev
# Web app runs on: http://localhost:5173
```

### 5. Mobile App Setup (React Native Expo)
```bash
# Navigate to mobile client
cd ../client-mobile

# Install dependencies
npm install

# Start Expo development server
npx expo start
```
- Press `a` to open Android Emulator.
- Or scan QR code using Expo Go app on your physical Android device.

---

## 🔑 Demo Login Credentials (Seeded)

| Role | Email | Password |
| :--- | :--- | :--- |
| **👑 Super Admin** | `admin@adverse.in` | `Admin@123` |
| **🏢 Seller (Media Owner)** | `seller@bengalmedia.com` | `Seller@123` |
| **🛍️ Customer (Advertiser)** | `client@brands.com` | `Client@123` |

*(The web and mobile apps include one-click demo buttons on the login screen for instant access!)*

---

## 📱 Google Play Store Deployment (Agile Sprint 6)

The React Native Expo app is configured for Google Play Store release:
1. **Package Identifier**: `com.adverse.hoardings` configured in `app.json`.
2. **Android Permissions**: Coarse/Fine Location, Camera, External Storage, Internet.
3. **EAS Build Ready**: Run the following commands to generate the production Android App Bundle (`.aab`):
   ```bash
   cd client-mobile
   # Install EAS CLI globally if not already installed
   npm install -g eas-cli
   
   # Log in to your Expo account
   eas login
   
   # Build production AAB for Google Play Console
   eas build --platform android --profile production
   ```
4. Upload the generated `.aab` file to your [Google Play Console](https://play.google.com/console).

---

## 🚀 Future Next.js Upgrade Compatibility

The web client is built with modular components and custom hooks that map directly to the Next.js App Router:
- `client-web/src/pages/HomePage.jsx` ➡️ `app/page.jsx`
- `client-web/src/pages/SearchResultsPage.jsx` ➡️ `app/search/page.jsx`
- `client-web/src/pages/HoardingDetailPage.jsx` ➡️ `app/hoardings/[id]/page.jsx`
- `client-web/src/pages/seller/SellerDashboardPage.jsx` ➡️ `app/seller/dashboard/page.jsx`
- `client-web/src/pages/admin/AdminDashboardPage.jsx` ➡️ `app/admin/dashboard/page.jsx`
- Shared `services/api.js` works in both client components and server actions.
