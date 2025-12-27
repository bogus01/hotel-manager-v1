# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hotel Manager PMS - A Property Management System for hotel operations built with React 19, TypeScript, and Supabase. The application manages room inventory, reservations, client tracking, billing, and reporting.

## Development Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run preview  # Preview production build locally
```

## Architecture

### Tech Stack
- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** TailwindCSS 4
- **Backend:** Supabase (PostgreSQL, Auth, Realtime)
- **Routing:** React Router DOM with HashRouter
- **Key Libraries:** date-fns (French locale), Recharts, @dnd-kit

### Code Structure
```
├── App.tsx                 # Router with 19 routes
├── types.ts                # All TypeScript type definitions
├── components/             # Reusable UI components (modals, headers)
├── pages/                  # Page components for each route
├── services/
│   ├── supabase.ts         # Supabase client initialization
│   ├── api.ts              # All API functions (~515 lines)
│   └── mappers.ts          # DB ↔ TypeScript type converters
└── utils/
    └── currency.ts         # Currency formatting utilities
```

### Data Flow Pattern
1. **Database (snake_case)** → `mappers.ts` → **TypeScript types (camelCase)**
2. API functions in `services/api.ts` handle all Supabase queries
3. Settings stored as key-value pairs via `getSettingValue()`/`setSettingValue()`

### Key Modules
- **Planning** (`pages/Planning.tsx`): Interactive drag-and-drop calendar with @dnd-kit, zoom controls, color-coded reservations
- **Reservations**: Multi-step modals for booking management with services and payments
- **Billing**: Invoice/receipt generation with customizable templates
- **Settings**: Hotel config, rooms, services, taxes, payment methods, users

## Important Conventions

### Language & Locale
- UI text and enum values are in **French** (e.g., `Confirmée`, `A nettoyer`)
- Date formatting uses `date-fns` with French locale
- Currency formatting is locale-aware via `utils/currency.ts`

### Type Definitions
All types are centralized in `types.ts`:
- `Room`, `RoomCategory`, `RoomStatus`
- `Reservation`, `ReservationStatus`, `BoardType`, `ReservationSource`
- `Client`, `Payment`, `PaymentMethod`, `Tax`, `ServiceItem`
- Settings types: `CurrencySettings`, `PlanningSettings`, `BoardConfiguration`

### API Functions (services/api.ts)
Functions are grouped by entity:
- Room: `fetchRooms()`, `createRoom()`, `updateRoom()`, `deleteRoom()`
- Client: `fetchClients()`, `createClient()`, `updateClientBalance()`
- Reservation: `fetchReservations()`, `createReservation()`, `createMultipleReservations()`
- Settings: `getCurrencySettings()`, `getPlanningSettings()`, `getBoardConfigurations()`

### Status Enums
```typescript
RoomStatus: 'Propre' | 'A nettoyer' | 'Maintenance'
ReservationStatus: 'Confirmée' | 'Arrivé' | 'Départ effectué' | 'Option' | 'Annulée'
BoardType: 'RO' | 'BB' | 'HB' | 'FB' | 'All Inc.'
```

## Environment Variables

Required in `.env.local`:
```
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
```

## Database Schema

Tables: `rooms`, `room_categories`, `clients`, `reservations`, `services`, `payments`, `payment_methods`, `taxes`, `service_catalog`, `users`, `settings`

Database uses snake_case naming; mappers convert to camelCase for TypeScript.
