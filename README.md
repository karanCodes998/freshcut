# 🥩 FreshCut — Fresh Meat Delivery Platform

> A full-stack, real-time meat delivery platform connecting customers, butchers, and riders.

---

## 📸 Overview

FreshCut is a production-ready multi-role delivery ecosystem built with **Spring Boot** (backend) and **React + Vite** (frontend). It handles the complete order lifecycle — from customer browsing to butcher preparation to rider delivery — with real-time WebSocket updates at every step.

---

## ✨ Features

### 👤 Customer
- Browse active butcher shops by category (Chicken, Mutton, Fish, etc.)
- Add meat items to cart with custom gram quantities
- Checkout with Google Maps address autocomplete + locality input
- Real-time order tracking with live status updates (WebSocket)
- Cancel orders before preparation begins
- Full order history

### 🏪 Butcher
- Register & manage shop (name, area, map pin location)
- Manage menu items with Cloudinary image uploads
- Accept, reject, and progress orders through the pipeline
- Real-time new order alerts with vibration/sound

### 🛵 Rider
- Go online/offline with a single toggle
- Receive live delivery requests for ready orders
- In-app route map from shop to customer
- Mark pickup and delivery with one tap
- Live earnings tracker

### ⚙️ Admin
- Full platform oversight dashboard
- Manage all users, shops, and orders
- Toggle shop active/inactive status
- Delete any entity with cascading cleanup

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Spring Boot 3, Java 21, Spring Security (JWT) |
| **Database** | MySQL (Railway) |
| **ORM** | Spring Data JPA / Hibernate |
| **Real-time** | Spring WebSocket + STOMP |
| **Image CDN** | Cloudinary |
| **Frontend** | React 18, Vite, Tailwind CSS |
| **Maps** | Google Maps JavaScript API |
| **Caching** | Spring Cache (Simple) |
| **Auth** | JWT (Bearer tokens) |

---

## 🚀 Getting Started

### Prerequisites
- Java 21+
- Node.js 18+
- MySQL database
- Cloudinary account
- Google Maps API key

### Backend Setup

```bash
cd freshcut-backend

# Copy the example config and fill in your values
cp src/main/resources/application.properties.example src/main/resources/application.properties

# Run the backend
./mvnw spring-boot:run
```

Required environment variables (set in `application.properties` or Railway):

| Variable | Description |
|---|---|
| `MYSQLHOST` | Database host |
| `MYSQLPORT` | Database port |
| `MYSQLDATABASE` | Database name |
| `MYSQLUSER` | Database username |
| `MYSQLPASSWORD` | Database password |
| `JWT_SECRET` | Base64-encoded secret (min 32 chars) |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Your Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API secret |

### Frontend Setup

```bash
cd freshcut-frontend

# Create your env file
echo "VITE_API_BASE_URL=http://localhost:8080" > .env
echo "VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key" >> .env

# Install and run
npm install
npm run dev
```

---

## 📁 Project Structure

```
freshcut/
├── freshcut-backend/          # Spring Boot API
│   └── src/main/java/com/freshcut/
│       ├── controller/        # REST endpoints
│       ├── service/           # Business logic
│       ├── model/             # JPA entities
│       ├── repository/        # Spring Data repos
│       ├── dto/               # Data transfer objects
│       ├── security/          # JWT auth filter
│       └── config/            # Security, CORS, WebSocket
└── freshcut-frontend/         # React + Vite SPA
    └── src/
        ├── pages/
        │   ├── customer/      # Shop list, checkout, tracking
        │   ├── butcher/       # Order & menu management
        │   ├── rider/         # Delivery dashboard
        │   └── admin/         # Platform admin panel
        ├── api/               # Axios API clients
        ├── hooks/             # useAuth, useWebSocket
        └── components/        # Navbar, ProtectedRoute, etc.
```

---

## 🔐 User Roles

| Role | Access |
|---|---|
| `CUSTOMER` | Browse shops, place & track orders, cancel |
| `BUTCHER` | Manage shop, menu, and incoming orders |
| `RIDER` | Accept and fulfill deliveries |
| `ADMIN` | Full platform management |

---

## 📦 Deployment

This project is designed for deployment on **Railway**:

1. Create two Railway services (Backend + Frontend)
2. Add all environment variables from the table above to each service
3. Deploy with `railway up` from each directory

---

## 📄 License

MIT License — feel free to use this for learning or as a starter project.
