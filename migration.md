# 🚀 Plan de Migration - Hotel Manager PMS

## Résumé de la Codebase

### Vue d'ensemble
**Hotel Manager PMS** est une application de gestion hôtelière (Property Management System) construite avec :
- **Framework Frontend** : React 19 + TypeScript
- **Build Tool** : Vite 6
- **Routing** : React Router DOM 7
- **UI** : TailwindCSS (via CDN)
- **Date Management** : date-fns
- **Charts** : Recharts
- **Icons** : Lucide React
- **Drag & Drop** : @dnd-kit/core

### Structure du Projet
```
d:\PROJET\HOTEL MANAGER V1\
├── App.tsx                 # Routeur principal (19 routes)
├── index.tsx               # Point d'entrée React
├── index.html              # HTML + Import Maps (⚠️ Google AI Studio)
├── types.ts                # Définitions TypeScript (tous les modèles)
├── vite.config.ts          # Configuration Vite (⚠️ Gemini API)
├── package.json            # Dépendances NPM
├── components/             # 13 composants réutilisables
│   ├── ReservationModal.tsx
│   ├── QuickReservationModal.tsx
│   ├── NewReservationModal.tsx
│   ├── ClientModal.tsx
│   ├── PaymentModal.tsx
│   ├── InvoicePreview.tsx
│   └── ... (7 autres)
├── pages/                  # 19 pages de l'application
│   ├── Planning.tsx        # Planning interactif
│   ├── Dashboard.tsx       # Tableau de bord
│   ├── Reservations.tsx    # Gestion réservations
│   ├── Clients.tsx         # Gestion clients
│   ├── Billing.tsx         # Facturation
│   ├── Settings*.tsx       # Pages de configuration
│   └── Reports*.tsx        # Rapports
├── services/
│   └── api.ts              # ⚠️ Couche API (localStorage mockup)
└── utils/
    └── currency.ts         # Formatage monétaire
```

### Modèles de Données Identifiés (dans `types.ts`)

| Modèle | Description | Champs Clés |
|--------|-------------|-------------|
| `Room` | Chambre d'hôtel | id, number, type, floor, capacity, baseRate, status |
| `RoomCategory` | Catégorie de chambre | id, name, defaultCapacity, defaultBaseRate, pricingModel |
| `Reservation` | Réservation | id, roomId, clientId, checkIn, checkOut, status, adults, children, totalPrice, services[], payments[] |
| `Client` | Client | id, firstName, lastName, email, phone, balance, isAccountHolder |
| `Payment` | Paiement | id, amount, date, method |
| `ServiceItem` | Service facturé | id, name, quantity, price |
| `Tax` | Taxe | id, name, rate, isFixed, applyTo, isActive |
| `PaymentMethod` | Méthode de paiement | id, name, iconType, isActive, isSystem |
| `ServiceCatalogItem` | Catalogue services | id, name, defaultPrice, category |
| `User` | Utilisateur du système | id, name, email, role, isActive |

---

## ⚠️ Dépendances Google AI Studio à Supprimer

### 1. Import Maps dans `index.html` (Lignes 51-65)
```html
<!-- À SUPPRIMER -->
<script type="importmap">
{
  "imports": {
    "recharts": "https://aistudiocdn.com/recharts@^3.5.1",
    "lucide-react": "https://aistudiocdn.com/lucide-react@^0.556.0",
    ...
  }
}
</script>
```
Ces imports pointent vers `aistudiocdn.com` qui est le CDN de Google AI Studio.

### 2. Gemini API Key dans `vite.config.ts` (Lignes 13-16)
```typescript
// À SUPPRIMER
define: {
  'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
}
```

### 3. TailwindCSS via CDN dans `index.html` (Ligne 8)
```html
<!-- À REMPLACER par installation locale -->
<script src="https://cdn.tailwindcss.com"></script>
```

### 4. Fichier `metadata.json`
Fichier spécifique à Google AI Studio, peut être supprimé.

---

## 📋 Étapes de Migration

### Phase 1 : Préparation de l'Environnement Local

#### Étape 1.1 : Installer les dépendances NPM
```bash
cd "d:\PROJET\HOTEL MANAGER V1"
npm install
```

#### Étape 1.2 : Installer TailwindCSS localement
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Créer `tailwind.config.js` :
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Créer/Modifier `index.css` :
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Conserver les styles personnalisés existants */
```

#### Étape 1.3 : Nettoyer `index.html`
Supprimer :
- Le bloc `<script type="importmap">` (lignes 51-66)
- Le script TailwindCSS CDN (ligne 8)

Le fichier final :
```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Hotel Manager - PMS Pro</title>
    <link rel="stylesheet" href="/index.css">
    <style>
      /* Conserver les styles personnalisés */
    </style>
  </head>
  <body class="bg-gray-50 text-slate-900 antialiased">
    <div id="root"></div>
    <script type="module" src="/index.tsx"></script>
  </body>
</html>
```

#### Étape 1.4 : Nettoyer `vite.config.ts`
Supprimer les références à Gemini API Key :
```typescript
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
```

#### Étape 1.5 : Supprimer les fichiers Google AI Studio
```bash
del metadata.json
```

---

### Phase 2 : Installation et Configuration de Supabase

#### Étape 2.1 : Informations du Projet Supabase (CONFIRMÉES)

**Projet existant connecté :**
| Paramètre | Valeur |
|-----------|--------|
| **Project ID** | `iqytcsuhysyzlcafmlkc` |
| **Project URL** | `https://iqytcsuhysyzlcafmlkc.supabase.co` |
| **Région** | eu-west-1 |
| **Status** | ACTIVE_HEALTHY |

**Clé API (Anon Key) :**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxeXRjc3VoeXN5emxjYWZtbGtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MDA5MTUsImV4cCI6MjA4MjI3NjkxNX0.28-vNw2yIB0IDYtmuMx-d27L5jq-s9UVZLYQ91Pozv8
```

#### Étape 2.2 : Installer le client Supabase
```bash
npm install @supabase/supabase-js
```

#### Étape 2.3 : Créer le fichier de configuration `.env.local`
```env
VITE_SUPABASE_URL=https://iqytcsuhysyzlcafmlkc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxeXRjc3VoeXN5emxjYWZtbGtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MDA5MTUsImV4cCI6MjA4MjI3NjkxNX0.28-vNw2yIB0IDYtmuMx-d27L5jq-s9UVZLYQ91Pozv8
```

> ⚠️ Ajouter `.env` au `.gitignore` si ce n'est pas déjà fait.

#### Étape 2.4 : Créer le client Supabase
Créer `services/supabase.ts` :
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

### Phase 3 : Création du Schéma de Base de Données

#### Étape 3.1 : Script SQL de Création des Tables

Exécuter dans l'éditeur SQL de Supabase (`SQL Editor`) :

```sql
-- ============================================
-- HOTEL MANAGER PMS - SCHEMA SUPABASE
-- ============================================

-- 1. TABLE: room_categories (Catégories de chambres)
CREATE TABLE room_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    default_capacity INTEGER NOT NULL DEFAULT 1,
    default_base_rate DECIMAL(10,2) NOT NULL,
    pricing_model VARCHAR(20) NOT NULL DEFAULT 'fixed' CHECK (pricing_model IN ('fixed', 'flexible')),
    occupancy_prices JSONB DEFAULT '{}',
    color VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLE: rooms (Chambres)
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number VARCHAR(20) NOT NULL UNIQUE,
    type VARCHAR(100) NOT NULL,
    floor INTEGER NOT NULL DEFAULT 1,
    capacity INTEGER NOT NULL DEFAULT 1,
    base_rate DECIMAL(10,2) NOT NULL,
    pricing_model VARCHAR(20) NOT NULL DEFAULT 'fixed' CHECK (pricing_model IN ('fixed', 'flexible')),
    occupancy_prices JSONB DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'Propre' CHECK (status IN ('Propre', 'A nettoyer', 'Maintenance')),
    category_id UUID REFERENCES room_categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLE: clients (Clients)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    civility VARCHAR(20),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    company VARCHAR(200),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    balance DECIMAL(10,2) DEFAULT 0,
    is_account_holder BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLE: reservations (Réservations)
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    client_name VARCHAR(200) NOT NULL,
    occupant_name VARCHAR(200),
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Confirmée' 
        CHECK (status IN ('Confirmée', 'Arrivé', 'Départ effectué', 'Option', 'Annulée')),
    source VARCHAR(50) CHECK (source IN ('Direct / Téléphone', 'Email', 'Passage (Walk-in)', 'Booking.com', 'Expedia', 'Site Web')),
    board_type VARCHAR(50),
    color VARCHAR(20),
    adults INTEGER NOT NULL DEFAULT 1,
    children INTEGER DEFAULT 0,
    base_rate DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    deposit_amount DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT check_dates CHECK (check_out > check_in)
);

-- 5. TABLE: services (Services facturés aux réservations)
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLE: payments (Paiements)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    method VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLE: taxes (Taxes et TVA)
CREATE TABLE taxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    rate DECIMAL(10,4) NOT NULL,
    is_fixed BOOLEAN DEFAULT FALSE,
    apply_to VARCHAR(50) NOT NULL DEFAULT 'all' CHECK (apply_to IN ('accommodation', 'services', 'all')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABLE: payment_methods (Méthodes de paiement)
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    icon_type VARCHAR(50) NOT NULL DEFAULT 'other' CHECK (icon_type IN ('card', 'cash', 'mobile', 'bank', 'other')),
    is_active BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABLE: service_catalog (Catalogue des services)
CREATE TABLE service_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    default_price DECIMAL(10,2) NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TABLE: users (Utilisateurs du système)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'Réceptionniste' 
        CHECK (role IN ('Administrateur', 'Manager', 'Réceptionniste')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. TABLE: settings (Paramètres généraux - clé/valeur JSON)
CREATE TABLE settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEX POUR PERFORMANCE
-- ============================================
CREATE INDEX idx_reservations_dates ON reservations(check_in, check_out);
CREATE INDEX idx_reservations_room ON reservations(room_id);
CREATE INDEX idx_reservations_client ON reservations(client_id);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_services_reservation ON services(reservation_id);
CREATE INDEX idx_payments_reservation ON payments(reservation_id);
CREATE INDEX idx_rooms_status ON rooms(status);

-- ============================================
-- TRIGGERS POUR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_room_categories_updated_at BEFORE UPDATE ON room_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_taxes_updated_at BEFORE UPDATE ON taxes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_catalog_updated_at BEFORE UPDATE ON service_catalog
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### Étape 3.2 : Données Initiales (Seed Data)

```sql
-- ============================================
-- DONNÉES INITIALES
-- ============================================

-- Catégories de chambres
INSERT INTO room_categories (name, default_capacity, default_base_rate, pricing_model, occupancy_prices, color) VALUES
('Simple', 1, 85.00, 'fixed', '{"1": 85}', '#6366f1'),
('Double', 2, 110.00, 'flexible', '{"1": 95, "2": 110}', '#10b981'),
('Suite', 4, 250.00, 'fixed', '{"1": 250, "2": 250, "3": 250, "4": 250}', '#f59e0b');

-- Chambres
INSERT INTO rooms (number, type, floor, capacity, base_rate, pricing_model, occupancy_prices, status) VALUES
('101', 'Simple', 1, 1, 85.00, 'fixed', '{"1": 85}', 'Propre'),
('102', 'Double', 1, 2, 110.00, 'flexible', '{"1": 95, "2": 110}', 'Propre'),
('201', 'Suite', 2, 4, 250.00, 'fixed', '{"4": 250}', 'Propre');

-- Taxes par défaut
INSERT INTO taxes (name, rate, is_fixed, apply_to, is_active) VALUES
('TVA Hébergement', 10.00, FALSE, 'accommodation', TRUE),
('TVA Services', 20.00, FALSE, 'services', TRUE),
('Taxe de Séjour', 1.50, TRUE, 'accommodation', TRUE);

-- Méthodes de paiement
INSERT INTO payment_methods (name, icon_type, is_active, is_system) VALUES
('Carte Bancaire', 'card', TRUE, TRUE),
('Espèces', 'cash', TRUE, TRUE),
('Virement Bancaire', 'bank', TRUE, TRUE);

-- Catalogue de services
INSERT INTO service_catalog (name, default_price, category) VALUES
('Petit-déjeuner', 15.00, 'Restaurations'),
('Taxe de séjour', 1.80, 'Divers'),
('Parking', 20.00, 'Divers');

-- Paramètres par défaut
INSERT INTO settings (key, value) VALUES
('currency', '{"code": "EUR", "symbol": "€", "position": "suffix", "decimalSeparator": ",", "thousandSeparator": " ", "decimalPlaces": 2}'),
('board_config', '{"Petit-déjeuner (BB)": 15, "Demi-pension (HB)": 40, "Pension complète (FB)": 65, "Tout inclus (All Inc.)": 95}'),
('planning_settings', '{"defaultZoom": 100, "defaultView": "month", "historyOffset": 5, "navigationStep": 2, "showRoomStatus": true, "selectionColor": "#6366f1", "barStyle": "translucent"}'),
('module_themes', '{"\/planning": "indigo", "\/reports": "amber", "\/reservations": "slate", "\/clients": "slate", "\/daily-planning": "violet", "\/dashboard": "slate", "\/billing": "slate", "\/settings": "slate"}');

-- Utilisateur admin par défaut
INSERT INTO users (name, email, role, is_active) VALUES
('Admin', 'admin@hotel.com', 'Administrateur', TRUE);
```

---

### Phase 4 : Réécriture de la Couche API

#### Étape 4.1 : Remplacer `services/api.ts`

Créer une nouvelle version de `services/api.ts` qui utilise Supabase au lieu de localStorage.

**Structure recommandée :**
```typescript
// services/api.ts
import { supabase } from './supabase';
import { Room, Reservation, Client, Tax, /* ... */ } from '../types';

// ===== ROOMS =====
export const fetchRooms = async (): Promise<Room[]> => {
    const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('number');
    
    if (error) throw error;
    return mapRoomsFromDB(data);
};

export const createRoom = async (room: Omit<Room, 'id'>): Promise<Room> => {
    const { data, error } = await supabase
        .from('rooms')
        .insert(mapRoomToDB(room))
        .select()
        .single();
    
    if (error) throw error;
    return mapRoomFromDB(data);
};

// ... (répéter pour tous les modèles)
```

#### Étape 4.2 : Créer des Helpers de Mapping

Les noms de colonnes dans Supabase utilisent snake_case, tandis que TypeScript utilise camelCase. Créer des fonctions de mapping :

```typescript
// services/mappers.ts

export const mapRoomFromDB = (row: any): Room => ({
    id: row.id,
    number: row.number,
    type: row.type,
    floor: row.floor,
    capacity: row.capacity,
    baseRate: row.base_rate,
    pricingModel: row.pricing_model,
    occupancyPrices: row.occupancy_prices,
    status: row.status,
});

export const mapRoomToDB = (room: Partial<Room>) => ({
    number: room.number,
    type: room.type,
    floor: room.floor,
    capacity: room.capacity,
    base_rate: room.baseRate,
    pricing_model: room.pricingModel,
    occupancy_prices: room.occupancyPrices,
    status: room.status,
});

// ... (répéter pour tous les modèles)
```

---

### Phase 5 : Configuration Row Level Security (RLS)

> ⚠️ Important pour la sécurité en production

```sql
-- Activer RLS sur toutes les tables
ALTER TABLE room_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Politique simple : authentifié peut tout faire (à affiner selon vos besoins)
CREATE POLICY "Enable all for authenticated users" ON room_categories
    FOR ALL USING (auth.role() = 'authenticated');

-- Répéter pour chaque table...
```

---

### Phase 6 : Tests et Vérification

#### Étape 6.1 : Lancer l'application localement
```bash
npm run dev
```

#### Étape 6.2 : Vérifier les fonctionnalités
- [ ] Création/Modification/Suppression de chambres
- [ ] Création/Modification/Suppression de réservations
- [ ] Gestion des clients
- [ ] Paiements et facturation
- [ ] Rapports
- [ ] Paramètres

---

## 📁 Résumé des Fichiers à Modifier/Créer

| Action | Fichier | Description |
|--------|---------|-------------|
| ✏️ Modifier | `index.html` | Supprimer import maps et CDN TailwindCSS |
| ✏️ Modifier | `vite.config.ts` | Supprimer références Gemini API |
| ✏️ Modifier | `services/api.ts` | Réécrire avec Supabase |
| ✏️ Modifier | `package.json` | Ajouter dépendances TailwindCSS et Supabase |
| ➕ Créer | `services/supabase.ts` | Client Supabase |
| ➕ Créer | `services/mappers.ts` | Fonctions de mapping DB ↔ TS |
| ➕ Créer | `.env` | Variables d'environnement Supabase |
| ➕ Créer | `tailwind.config.js` | Configuration TailwindCSS |
| ➕ Créer | `postcss.config.js` | Configuration PostCSS |
| ❌ Supprimer | `metadata.json` | Fichier Google AI Studio |

---

## ⏱️ Estimation du Temps

| Phase | Durée Estimée |
|-------|---------------|
| Phase 1 : Environnement Local | 30 min |
| Phase 2 : Configuration Supabase | 20 min |
| Phase 3 : Création DB | 15 min |
| Phase 4 : Réécriture API | 2-3 heures |
| Phase 5 : RLS (optionnel) | 30 min |
| Phase 6 : Tests | 1 heure |
| **Total** | **4-5 heures** |

---

## 🔒 Points de Vigilance

1. **Variables d'environnement** : Ne jamais commiter `.env` avec les clés Supabase
2. **Migrations de données** : Si des données localStorage existent, prévoir un script de migration
3. **Gestion des dates** : Supabase retourne des strings ISO, s'assurer de la conversion en objets `Date`
4. **RLS** : Configurer correctement les politiques de sécurité avant mise en production
5. **Types UUID** : Les IDs passent de strings simples (`room-101`) à des UUIDs, adapter les références
/