# 📚 ADVERSE Platform — Complete Architecture & Codebase Guide

Welcome to the comprehensive architecture and developer guide for **ADVERSE** — the digital marketplace for Out-Of-Home (OOH) billboard and hoarding rentals across West Bengal.

This document is designed to teach you the system architecture, file structure, design decisions, and core workflows from scratch.

---

## Table of Contents
1. [High-Level Architecture](#1-high-level-architecture)
2. [Monorepo Directory Structure](#2-monorepo-directory-structure)
3. [Backend Deep Dive (`server`)](#3-backend-deep-dive-server)
   - [Database Connection & DNS SRV Engine](#database-connection--dns-srv-engine)
   - [Data Models & Mongoose Schemas](#data-models--mongoose-schemas)
   - [Authentication & Single Sign-On (SSO)](#authentication--single-sign-on-sso)
   - [Business Logic & Controllers](#business-logic--controllers)
4. [Web Client Deep Dive (`client-web`)](#4-web-client-deep-dive-client-web)
   - [Tech Stack & Routing](#tech-stack--routing)
   - [Authentication State (`AuthContext.jsx`)](#authentication-state-authcontextjsx)
   - [Interactive Maps (`HoardingMap.jsx`)](#interactive-maps-hoardingmapjsx)
   - [Pages & Workflows](#pages--workflows)
5. [Mobile Client Deep Dive (`client-mobile`)](#5-mobile-client-deep-dive-client-mobile)
   - [Expo SDK 57 & React Native 0.86](#expo-sdk-57--react-native-086)
   - [Persistent Storage Adapter (`storage.js`)](#persistent-storage-adapter-storagejs)
   - [Safe Area Insets & System Navigation](#safe-area-insets--system-navigation)
   - [Live GPS "Near Me" Geolocation](#live-gps-near-me-geolocation)
   - [Mobile SSO & Bottom Sheet](#mobile-sso--bottom-sheet)
6. [Cross-Platform Synchronization Flow](#6-cross-platform-synchronization-flow)
7. [Running & Testing the Entire Stack](#7-running--testing-the-entire-stack)

---

## 1. High-Level Architecture

The platform operates on a three-tier architecture connecting Web, Mobile, and Cloud Backend:

```mermaid
graph TD
    subgraph Clients
        Web["Client Web (React 18 + Vite)\nPort 5173"]
        Mobile["Client Mobile (React Native + Expo SDK 57)\nExpo Go :8081"]
    end

    subgraph Backend_Server["Backend API Server (Express.js on Port 3000)"]
        AuthModule["/api/auth (JWT + SSO)"]
        HoardingModule["/api/hoardings (GeoJSON Search)"]
        BookingModule["/api/bookings (Conflict Resolution)"]
        PaymentModule["/api/payments (Offline NEFT/UPI Verification)"]
        AdminModule["/api/admin (Governance)"]
    end

    subgraph Database["MongoDB Atlas (Cloud Cluster)"]
        Atlas["Database: 'Adverse'\n- users\n- hoardings\n- bookings\n- payments"]
    end

    Web -->|HTTP / REST + Bearer Token| Backend_Server
    Mobile -->|LAN HTTP 192.168.29.205:3000| Backend_Server
    Backend_Server -->|Mongoose with Google Public DNS| Atlas
```

---

## 2. Monorepo Directory Structure

```
Adverse/
├── server/                       # Node.js / Express API
│   ├── .env                      # Environment configurations (PORT, MONGO_URI, JWT)
│   ├── src/
│   │   ├── app.js                # Express app configuration & middleware pipeline
│   │   ├── server.js             # Server entry point & autoSeed trigger
│   │   ├── config/
│   │   │   ├── env.js            # Environment variables parser
│   │   │   ├── db.js             # Mongoose connection with public DNS SRV resolvers
│   │   │   └── autoSeed.js       # Auto-seeds default users & 6 prime Bengal hoardings
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js # Multi-role token verification & resilient lookups
│   │   │   └── error.middleware.js# Centralized error handler & status mapper
│   │   ├── models/
│   │   │   ├── User.js           # Users (Customer, Seller, Admin, SSO accounts)
│   │   │   ├── Hoarding.js       # Billboards with 2dsphere GeoJSON spatial coordinates
│   │   │   ├── Booking.js        # Date-range reservations & state transitions
│   │   │   └── Payment.js        # Offline UTR/Cheque records & verification timestamps
│   │   └── modules/
│   │       ├── auth/             # Login, register, SSO, profile routes
│   │       ├── hoardings/        # Geospatial radial discovery & filters
│   │       ├── bookings/         # Availability engine & calendar conflict prevention
│   │       ├── payments/         # Offline payment proof submit & owner approval
│   │       └── admin/            # Platform metrics & site moderation
│
├── client-web/                   # React 18 Single Page App (SPA)
│   ├── index.html                # HTML entry point
│   ├── vite.config.js            # Vite build tool with /api proxy to localhost:3000
│   ├── tailwind.config.js        # Tailwind CSS utility theme
│   └── src/
│       ├── App.jsx               # React Router routes & ProtectedRoute gates
│       ├── services/api.js       # Central Axios client with token interceptors
│       ├── context/AuthContext.jsx # Global user authentication state
│       ├── components/
│       │   ├── Navbar.jsx        # Navigation header with role badges
│       │   ├── Footer.jsx        # Footer with regional hub links
│       │   ├── HoardingCard.jsx  # Reusable billboard card with price & specs
│       │   ├── HoardingMap.jsx   # Interactive Leaflet map (React 18 compatible)
│       │   ├── GoogleSSOModal.jsx# Branded Google OAuth account selector
│       │   └── ErrorBoundary.jsx # React component crash protection
│       └── pages/
│           ├── HomePage.jsx      # Hero section, quick city filters, featured hoardings
│           ├── SearchResultsPage.jsx # Full-screen split view with map + filter panel
│           ├── HoardingDetailPage.jsx# Detailed specs, photo gallery, booking form
│           ├── LoginPage.jsx     # Email & Google SSO login
│           ├── RegisterPage.jsx  # Advertiser vs Media Owner registration
│           ├── seller/           # Media owner dashboard (inventory & payments)
│           ├── customer/         # Advertiser dashboard (campaigns & booking slips)
│           └── admin/            # Super Admin metrics & hoarding approval desk
│
└── client-mobile/                # React Native Expo Mobile App
    ├── app.json                  # Expo app metadata, bundle identifiers & permissions
    ├── App.js                    # Navigation setup (BottomTabs + NativeStack + RootNavigator)
    └── src/
        ├── api/client.js         # Mobile Axios client pointing to LAN IP 192.168.29.205
        ├── utils/storage.js      # Resilient storage adapter (expo-secure-store + async-storage)
        ├── context/AuthContext.js# Mobile auth state with automatic storage rehydration
        └── screens/
            ├── HomeScreen.js     # Discover feed, Live GPS "Near Me" search with radius pills
            ├── HoardingDetailScreen.js # Billboard specs, booking button with bottom safe inset
            ├── MyBookingsScreen.js# Advertiser booking history & payment status
            ├── SellerDashboardScreen.js # Media owner desk for verifying payments
            └── LoginScreen.js    # Sign in, Sign up, and Google SSO bottom sheet
```

---

## 3. Backend Deep Dive (`server`)

### Database Connection & DNS SRV Engine
In [`server/src/config/db.js`](file:///d:/Adverse/server/src/config/db.js):
* **The Challenge**: MongoDB Atlas connection strings use `mongodb+srv://`. On Windows or certain ISPs, local DNS resolvers frequently refuse SRV queries (`querySrv ECONNREFUSED`), which causes the app to fail connecting to the cloud cluster.
* **The Solution**: Before connecting, `db.js` explicitly configures Node.js's DNS subsystem to use Google Public DNS (`8.8.8.8`, `8.8.4.4`) and Cloudflare DNS (`1.1.1.1`):
  ```javascript
  if (MONGO_URI && MONGO_URI.startsWith('mongodb+srv://')) {
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
  }
  ```
* **Fallback Protection**: If Atlas is ever unreachable (e.g., completely offline), it seamlessly spins up an embedded in-memory database (`mongodb-memory-server`) to keep development running smoothly.

### Data Models & Mongoose Schemas

#### 1. User Model ([`User.js`](file:///d:/Adverse/server/src/models/User.js))
* **Three Roles**:
  * `customer`: Advertisers looking to book sites.
  * `seller`: Media owners enlisting billboards (requires admin approval before publishing).
  * `admin`: Platform moderators.
* **Sparse Indexing**:
  * `phone` is marked `{ sparse: true, default: undefined }`. When users register via SSO or don't provide a phone, MongoDB omits the field, preventing duplicate key collisions on empty strings.
* **Conditional Passwords**:
  * `passwordHash` is only required when `!this.ssoProvider`, allowing SSO users to exist without dummy passwords.
* **Resilient JWT Generation**:
  * `getSignedJwtToken()` signs the user ID, role, email, and SSO metadata with a 30-day expiration (`JWT_EXPIRES_IN=30d`).

#### 2. Hoarding Model ([`Hoarding.js`](file:///d:/Adverse/server/src/models/Hoarding.js))
* **Geospatial GeoJSON**:
  ```javascript
  geo: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: [Number] // [longitude, latitude] (GeoJSON format!)
  }
  ```
  Indexed with `HoardingSchema.index({ 'location.geo': '2dsphere' })` to enable high-speed radial search queries (`$nearSphere` / `$geoWithin`).
* **Attributes**: Dimensions (width × height in feet), lighting type (`Frontlit`, `Backlit`, `Digital/LED`, `Unlit`), hoarding type (`Billboard`, `Unipole`, `Gantry`, `Kiosk`), and estimated mounting/printing charges.

#### 3. Booking Model ([`Booking.js`](file:///d:/Adverse/server/src/models/Booking.js))
* Tracks rental date ranges (`startDate` to `endDate`).
* Lifecycle statuses: `requested` ➔ `active` ➔ `completed` (or `cancelled`).
* **Overlap Conflict Guard**: When a booking is submitted, the backend verifies that no active/confirmed booking exists for that hoarding during the requested dates:
  ```javascript
  {
    hoardingId,
    bookingStatus: { $in: ['active', 'confirmed'] },
    startDate: { $lte: requestedEndDate },
    endDate: { $gte: requestedStartDate }
  }
  ```

#### 4. Payment Model ([`Payment.js`](file:///d:/Adverse/server/src/models/Payment.js))
* Handles both offline and online modes:
  * `offlineDetails`: Records Bank Name, Cheque Number, or NEFT/UPI Transaction Reference (UTR).
  * `verifiedBy` & `verifiedAt`: Stores the seller's confirmation timestamp.

---

### Authentication & Single Sign-On (SSO)

#### Registration Uniqueness Check ([`auth.controller.js`](file:///d:/Adverse/server/src/modules/auth/auth.controller.js))
To prevent false "account exists" errors:
1. Validates and queries `email` first:
   If found, returns: `"An account with this email address already exists. Please sign in instead."`
2. Validates and queries `phone` **only if a valid string is provided**:
   If found, returns: `"An account with this phone number already exists. Please use a different phone number."`
3. Stores `phone: cleanPhone || undefined` so empty phone numbers never collide.

#### Resilient Token Verification ([`auth.middleware.js`](file:///d:/Adverse/server/src/middlewares/auth.middleware.js))
```javascript
const decoded = jwt.verify(token, JWT_SECRET);
let user = null;
if (decoded.id) {
  user = await User.findById(decoded.id).select('-passwordHash');
}
// Resilient fallback if server was restarted with new in-memory IDs
if (!user && decoded.email) {
  user = await User.findOne({ email: decoded.email.toLowerCase() }).select('-passwordHash');
}
```

#### SSO Endpoint (`POST /api/auth/sso`)
* Accepts `{ provider, ssoId, email, name, avatar, role, companyDetails }`.
* If user exists, links SSO credentials and generates token.
* If user is new, provisions account with role selection, sets status, and returns signed JWT.

---

## 4. Web Client Deep Dive (`client-web`)

### Tech Stack & Routing
* **Vite + React 18**: High-speed build tool and hot module replacement.
* **Tailwind CSS**: Utility-first styling.
* **React Router v6**: Client-side page navigation.
* **Axios**: Configured with request/response interceptors in `services/api.js`.

### Authentication State (`AuthContext.jsx`)
* Rehydrates `token` from `localStorage.getItem('adverse_token')` and `user` from `localStorage.getItem('adverse_user')`.
* On startup, calls `api.get('/auth/me')` in the background.
* **Critical Bug Fix**: It **only** logs out if the server explicitly returns HTTP `401 Unauthorized`. If the connection is slow or temporarily offline, the session is preserved.

### Interactive Maps (`HoardingMap.jsx`)
* Built with `react-leaflet` pinned to `^4.2.1` for 100% compatibility with React 18.
* Wraps tiles in an `ErrorBoundary` and guards against missing coordinates with default Kolkata center `[22.5726, 88.3639]`.

---

## 5. Mobile Client Deep Dive (`client-mobile`)

### Expo SDK 57 & React Native 0.86
* Configured for **Expo Go SDK 57.0.9** with React Native 0.86.3 and React 19.2.3.
* Uses LAN IP address `192.168.29.205:3000` for physical Android and iOS devices.

### Persistent Storage Adapter (`src/utils/storage.js`)
To fix the `Native module is null` warning in Expo Go SDK 57, a multi-tier storage adapter was built:
1. **`expo-secure-store`** (Primary): Uses Android KeyStore / SharedPreferences and iOS Keychain directly supported by Expo Go.
2. **`@react-native-async-storage/async-storage`** (Secondary): Safe fallback.
3. **In-Memory Cache** (Tertiary): Fallback if native bridge is momentarily unready.

### Safe Area Insets & System Navigation
* Android devices with gesture bars or three-button navigation (Back / Home / Minimize) can overlap the bottom navigation bar.
* In [`App.js`](file:///d:/Adverse/client-mobile/App.js) and [`HoardingDetailScreen.js`](file:///d:/Adverse/client-mobile/src/screens/HoardingDetailScreen.js), we calculate dynamic insets using `useSafeAreaInsets()`:
  ```javascript
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 0);
  const tabHeight = 60 + bottomInset;
  ```

### Live GPS "Near Me" Geolocation
* In [`HomeScreen.js`](file:///d:/Adverse/client-mobile/src/screens/HomeScreen.js):
  * Requests user location using `Location.requestForegroundPermissionsAsync()`.
  * Provides quick distance filter pills: **10 km**, **25 km**, **50 km**, and **All**.
  * Calculates real-time distance from user's current GPS coordinates using the Haversine formula and tags each hoarding card with a distance badge (e.g. `📍 4.2 km away`).

---

## 6. Cross-Platform Synchronization Flow

Here is the life of a typical user interaction across both platforms:

```mermaid
sequenceDiagram
    autonumber
    actor User as Advertiser / Site Owner
    participant App as Mobile or Web Client
    participant Storage as Local Storage / SecureStore
    participant API as Express Server (Port 3000)
    participant DB as MongoDB Atlas

    User->>App: Clicks "Continue with Google"
    App->>API: POST /api/auth/sso with Google profile
    API->>DB: Finds or creates user in 'Adverse.users'
    DB-->>API: Returns user document
    API-->>App: Returns JWT token + user profile
    App->>Storage: Persists adverse_token & adverse_user
    App-->>User: Displays Dashboard & persists session on reopen
```

---

## 7. Running & Testing the Entire Stack

### Step 1: Start Backend
```powershell
cd d:\Adverse\server
node src/server.js
```
*Output:*
```
Connecting to MongoDB at: mongodb+srv://...
✅ MongoDB Connected successfully to Atlas host: ac-7f3nmca-shard-00-02.wiqur3b.mongodb.net
🚀 Adverse Hoarding Backend running on port: 3000
📡 Health Check: http://localhost:3000/api/health
```

### Step 2: Start Web Client
```powershell
cd d:\Adverse\client-web
npm run dev
```
*Open in Browser:* `http://localhost:5173`

### Step 3: Start Mobile Client (Expo Go)
```powershell
cd d:\Adverse\client-mobile
npx expo start --lan
```
*Scan the QR code in your Expo Go app (Android or iOS).*

---

### Default Seeded Test Accounts

| Role | Email | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **👑 Super Admin** | `admin@adverse.in` | `Admin@123` | Moderate hoardings, view revenue metrics |
| **🏢 Media Owner (Seller)** | `seller@bengalmedia.com` | `Seller@123` | Enlist hoardings, verify offline cheques & NEFT payments |
| **🛍️ Client (Advertiser)** | `client@brands.com` | `Client@123` | Discover sites, book hoardings, upload campaign artwork |

*(Both Web and Mobile feature 1-tap demo buttons on their login screens for instant sign-in!)*
