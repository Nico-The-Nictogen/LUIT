# LUIT - Clean Brahmaputra River Platform

A web application for reporting and cleaning garbage in the Brahmaputra River using mobile-first design with React, Python, and Firebase.

## Features

- 📱 **Mobile-First Design** - Optimized for smartphones
- 🎥 **Image Capture & Verification** - YOLOv8 ML model for garbage detection
- 📍 **Location-Based Reporting** - Browser Geolocation API integration
- 🗺️ **Navigation** - Google Maps integration for cleanup locations
- 🏆 **Leaderboard System** - Points-based ranking for users and NGOs
- 👥 **Dual User Types** - Individual users and NGO organizations
- 📊 **Analytics** - Track reports, cleanups, and points
- 🔐 **Authentication** - Secure login/register with Firebase

## Tech Stack

### Frontend
- **React 18** with Vite
- **Tailwind CSS** - Utility-first CSS
- **Zustand** - State management
- **Firebase** - Authentication & Database
- **React Router** - Navigation

### Backend
- **Python 3.9+**
- **FastAPI** - REST API framework
- **YOLOv8** - Object detection for garbage verification
- **Firebase Admin SDK** - Database & storage
- **OpenCV** - Image processing

### Cloud Services (Free Tier)
- **Firebase** - Database, Storage, Authentication
- **Vercel** - Frontend hosting
- **Render/Railway** - Backend hosting
- **Google Vision API** - Image verification (optional)

## Quick Start

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Create `.env.local`:
```
VITE_API_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
```

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
python main.py
```

Create `.env`:
```
FIREBASE_PROJECT_ID=xxx
FIREBASE_PRIVATE_KEY_ID=xxx
FIREBASE_PRIVATE_KEY=xxx
FIREBASE_CLIENT_EMAIL=xxx
FIREBASE_CLIENT_ID=xxx
GOOGLE_CLOUD_PROJECT_ID=xxx
BACKEND_PORT=5000
BACKEND_ENV=development
FRONTEND_URL=http://localhost:3000
```

## Pages & Features

### 1. **Main Page** (`/`)
- About the platform
- Login & Report buttons
- Global analytics (places reported & cleaned)

### 2. **Login/Register** (`/login`)
- Dual registration (Individual User & NGO)
- User-specific fields
- Secure authentication

### 3. **User Dashboard** (`/dashboard`)
- Personal statistics
- Reports created count
- Cleanups participated
- Total points earned
- Ranking

### 4. **Reporting** (`/report`)
- Auto location detection (30s refresh)
- Camera capture only (no gallery)
- AI garbage verification
- Duplicate location checking (100m radius)
- Waste type classification
- Points: 10 per report

### 5. **Cleaner** (`/cleaner`)
- Filter by waste type
- Image preview
- Clean & Navigate buttons
- Google Maps navigation
- NGO-exclusive sewage viewing

### 6. **Cleaning** (`/cleaning/:reportId`)
- Auto location verification
- Before image capture
- After image capture
- Automatic verification
- Cleanup confirmation

### 7. **Leaderboard** (`/leaderboard`)
- Separate User & NGO rankings
- Overall/Reporting/Cleaning categories
- Points-based ranking

### 8. **Analytics**
- User dashboard statistics
- NGO dashboard statistics
- Global platform metrics

## Point System

### Reporting
- Plastic Waste: 10 points
- Organic Waste: 10 points
- Mixed Waste: 10 points
- Toxic/Hazardous: 10 points
- Untreated Sewage: 10 points

### Cleaning
- Plastic Waste: 10 points
- Organic Waste: 20 points
- Mixed Waste: 30 points
- Toxic/Hazardous: 50 points
- Untreated Sewage: 100 points (NGO only)

## Project Structure

```
LUIT/
├── frontend/
│   ├── src/
│   │   ├── pages/          # All 8 page components
│   │   ├── api.js          # API client
│   │   ├── firebase.js     # Firebase config
│   │   ├── store.js        # Zustand stores
│   │   ├── App.jsx         # Main app
│   │   └── main.jsx        # Entry point
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── vercel.json         # Vercel deployment config
│
└── backend/
    ├── routes/
    │   ├── auth.py         # Authentication endpoints
    │   ├── reporting.py    # Reporting endpoints
    │   ├── cleaning.py     # Cleaning endpoints
    │   ├── analytics.py    # Analytics endpoints
    │   └── location.py     # Location endpoints
    ├── services/
    │   ├── firebase_service.py
    │   ├── image_verification.py  # YOLOv8 model
    │   └── location_service.py    # Haversine distance
    ├── main.py             # FastAPI app
    ├── config.py           # Configuration
    ├── requirements.txt
    ├── .env.example
    └── .gitignore
```

## Deployment

### Frontend (Vercel)

1. Push to GitHub
2. Connect GitHub repo to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Backend (Render or Railway)

1. Push to GitHub
2. Connect GitHub repo to Render/Railway
3. Set environment variables
4. Deploy

## Mobile Features

- ✅ Full mobile viewport support
- ✅ Camera API integration
- ✅ Geolocation API
- ✅ Touch-optimized UI
- ✅ Safe area insets for notch
- ✅ Native app-like feel with Tailwind

## Development Workflow

1. Clone the repository
2. Set up frontend and backend locally
3. Create `.env` files from `.env.example`
4. Run both servers: `npm run dev` & `python main.py`
5. Open `http://localhost:3000`

## Team: LuitLabs

This project is developed by the LuitLabs team for the LUIT Hackathon, dedicated to cleaning and protecting the Brahmaputra River.

---

**Made with ❤️ to clean the Brahmaputra**
