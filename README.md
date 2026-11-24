# PriceMyTrip

**PriceMyTrip** is a web-based freight cost calculation platform designed to help users estimate and analyze the cost of transporting goods across Indian routes.

The application calculates trip costs using truck-specific data, route distance, fuel prices, toll estimates, and operational expenses. It provides an itemized cost breakdown, route visualization, downloadable reports, and user accounts for managing saved trips.

## Key Features

### 1. Freight Cost Calculator
- Calculate estimated transportation costs between an origin and destination.
- Select truck configurations and enter payload details.
- Calculate freight costs using fixed and variable cost components.
- Includes 21 itemized cost heads, covering expenses such as:
  - Driver and helper salaries
  - Vehicle depreciation
  - Insurance and interest
  - Fuel expenses
  - Toll charges
  - Maintenance
  - Loading and operational overhead
  - Profit margin
  - Empty-return costs
- Uses truck-specific economic data covering 101 named truck models across 46 categories.
- Supports utilization-based cost allocation using trip days, vehicle uptime, and annual kilometres.

### 2. Cost Breakdown and Visualization
- View the calculated trip cost with an itemized breakdown.
- Analyze the contribution of different cost components.
- Visualize cost distribution through charts.
- Review important calculated metrics, including the cost per kilometre (PKPT).
- Recalculate costs when relevant inputs are changed.

### 3. Route Visualization
- Visualize the selected transportation route.
- Display route-related information alongside the freight cost calculation.
- Use routing services when configured, with fallback calculations available when external routing services are unavailable.

### 4. User Authentication
- Sign up and log in using email and password.
- Forgot-password flow with OTP-based verification and password reset.
- Secure password storage using bcrypt hashing.
- JWT-based session management using HTTP-only cookies.

### 5. Saved Trips
- Save calculated trips to a personal account.
- View previously saved trips.
- Open saved trips to review or recalculate them.
- Delete saved trips.
- Each user can access and manage only their own saved trips.

### 6. Reports and Downloads
- Generate trip reports in PDF and Excel formats.
- Request reports through the application.
- Deliver generated reports through email.
- Send report details to the administrator as part of the reporting workflow.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Backend | Next.js API Routes |
| Database | MySQL |
| Authentication | JWT, bcrypt, HTTP-only cookies |
| Routing | OpenRouteService / Google Maps services when configured |
| Data Visualization | Chart-based cost breakdown |
| Reports | PDF and Excel generation |
| Email | Email-based report delivery |
| Development Tools | Node.js, npm, Git |

## How It Works

1. **Input:** The user enters the source city, destination city, truck configuration, and payload details.
2. **Route calculation:** The application determines route distance using the configured routing service or fallback distance calculation.
3. **Cost calculation:** The backend processes truck-specific rates, utilization parameters, fuel expenses, toll estimates, and other operational costs.
4. **Cost allocation:** Fixed and variable expenses are allocated to the trip, and the applicable margin is included.
5. **Results:** The application displays the estimated freight cost, cost breakdown, and visual representations of the expenses.
6. **Trip management:** Authenticated users can save their calculations and access them later.
7. **Report generation:** Users can request PDF or Excel reports and receive them through email.

## APIs

### Main Calculation API

`POST /api/newcalculate`

Accepts trip details and returns the calculated freight cost.

Example request:

```json
{
  "truckId": "16T_6W",
  "origin": "Delhi",
  "destination": "Mumbai",
  "payloadTons": 16
}
```

### Authentication APIs

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/signup` | Register a new user |
| POST | `/api/auth/login` | Authenticate a user |
| POST | `/api/auth/logout` | End the user session |
| GET | `/api/auth/me` | Retrieve the current user |

### Saved Trips APIs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/trips` | Retrieve the logged-in user's saved trips |
| POST | `/api/trips` | Save a calculated trip |
| DELETE | `/api/trips/:id` | Delete a saved trip |

### Supporting Data API

`/api/india-state-prices`

Retrieves Indian state-wise fuel price information used in the cost calculation.

## Routing, Fuel Prices and Fallbacks

### Route Distance
- OpenRouteService can be configured for road-distance calculations.
- Google Maps services can also be configured where supported by the application.
- When a routing service is unavailable or not configured, the application uses a fallback distance calculation based on haversine distance and a road-distance factor.

### Toll Estimation
- Toll costs are estimated using available corridor data and fallback per-kilometre rates.
- The Delhi–Mumbai corridor data is used where applicable.
- Without a dedicated toll-data integration, estimated toll costs may be available without actual toll-plaza names, counts, or individual plaza-level details.

### Diesel Prices
- Fuel prices are retrieved from [The Core India Fuel Watch](https://energy.thecore.in/fuel/prices).
- If the external feed is unavailable, configured fallback rates are used.

## Database

PriceMyTrip uses MySQL to store application data.

The database includes:
- `users` — user account information.
- `trips` — saved trip calculations.

The application initializes the required tables on first use. The SQL schema is also available in `db/schema.sql` for manual database setup through tools such as phpMyAdmin.

## Local Development

### Prerequisites
- Node.js
- npm
- MySQL or MariaDB

### Installation

```bash
git clone <your-repository-url>
cd <project-directory>
npm install
```

Create a `.env.local` file in the project root:

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=pricemytrip
MYSQL_USER=root
MYSQL_PASSWORD=

AUTH_SECRET=your_secure_random_secret

# Optional routing configuration
OPENROUTESERVICE_API_KEY=your_api_key
GOOGLE_MAPS_API_KEY=your_api_key
```

Use the database credentials appropriate for your environment. Do not commit `.env.local` or expose API keys and secrets.

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

```bash
npm run dev       # Start the development server
npm run build     # Create a production build
npm test          # Run unit tests
```

## Deployment

The application is deployed using GoDaddy hosting with Node.js application support.

The production deployment requires:
- A configured production database.
- Correct environment variables and authentication secrets.
- Node.js application configuration.
- Appropriate routing and email service credentials where required.
- Production build and application startup configuration.

**Important:** Keep credentials and environment-specific configuration outside the source code. Configure production environment variables separately from local development settings.

## Project Status

PriceMyTrip is a deployed freight cost calculation application with user authentication, trip management, route visualization, cost analysis, and report-generation functionality.

The application also includes fallback mechanisms for selected external data dependencies so that cost calculations can continue when optional services are unavailable.