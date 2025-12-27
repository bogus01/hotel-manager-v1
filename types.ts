
import React from 'react';

export enum RoomStatus {
  CLEAN = 'Propre',
  DIRTY = 'A nettoyer',
  MAINTENANCE = 'Maintenance'
}

export enum RoomType {
  SINGLE = 'Simple',
  DOUBLE = 'Double',
  SUITE = 'Suite'
}

export type PricingModel = 'fixed' | 'flexible';

export interface RoomCategory {
    id: string;
    name: string;
    defaultCapacity: number;
    defaultBaseRate: number;
    pricingModel: PricingModel;
    occupancyPrices: Record<number, number>; // Mapping guest count -> price
    color?: string;
}

export interface Room {
  id: string;
  number: string;
  type: string;
  floor: number;
  capacity: number;
  baseRate: number;
  pricingModel: PricingModel;
  occupancyPrices: Record<number, number>;
  status: RoomStatus;
}

export enum ReservationStatus {
  CONFIRMED = 'Confirmée',
  CHECKED_IN = 'Arrivé',
  CHECKED_OUT = 'Départ effectué',
  OPTION = 'Option',
  CANCELLED = 'Annulée'
}

export enum BoardType {
  RO = 'Chambre seule (RO)',
  BB = 'Petit-déjeuner (BB)',
  HB = 'Demi-pension (HB)',
  FB = 'Pension complète (FB)',
  ALL = 'Tout inclus (All Inc.)'
}

export enum ReservationSource {
  DIRECT = 'Direct / Téléphone',
  EMAIL = 'Email',
  WALKIN = 'Passage (Walk-in)',
  BOOKING = 'Booking.com',
  EXPEDIA = 'Expedia',
  WEBSITE = 'Site Web'
}

export enum UserRole {
  ADMIN = 'Administrateur',
  MANAGER = 'Manager',
  RECEPTIONIST = 'Réceptionniste'
}

export interface Client {
  id: string;
  civility?: string;
  firstName: string;
  lastName: string;
  company?: string;
  email: string;
  phone: string;
  address?: string;
  balance: number;
  isAccountHolder?: boolean;
  notes?: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Payment {
  id: string;
  amount: number;
  date: Date;
  method: string;
}

export interface Reservation {
  id: string;
  roomId: string;
  clientId: string;
  clientName: string;
  occupantName?: string;
  checkIn: Date;
  checkOut: Date;
  status: ReservationStatus;
  source?: ReservationSource;
  boardType?: BoardType;
  color?: string;
  adults: number;
  children: number;
  baseRate: number;
  totalPrice: number;
  depositAmount?: number;
  notes?: string;
  services: ServiceItem[];
  payments: Payment[];
}

export interface PaymentMethod {
  id: string;
  name: string;
  iconType: 'card' | 'cash' | 'mobile' | 'bank' | 'other';
  isActive: boolean;
  isSystem?: boolean;
}

export interface Tax {
  id: string;
  name: string;
  rate: number; // Valeur du taux (ex: 18 pour 18%)
  isFixed: boolean; // Si true, c'est un montant fixe par nuit/pax (ex: Taxe séjour)
  applyTo: 'accommodation' | 'services' | 'all';
  isActive: boolean;
}

export interface CurrencySettings {
  code: string;
  symbol: string;
  position: 'prefix' | 'suffix';
  decimalSeparator: string;
  thousandSeparator: string;
  decimalPlaces: number; // 0 pour FCFA, 2 pour Euro/Dollar
}

export interface StatusColors {
  confirmed: string;
  checkedIn: string;
  checkedOut: string;
  option: string;
  cancelled: string;
}

export interface PlanningSettings {
  defaultZoom: number;
  defaultView: 'week' | 'fortnight' | 'month';
  historyOffset: number;
  navigationStep: number;
  showRoomStatus: boolean;
  selectionColor: string;
  statusColors?: StatusColors;
  barStyle?: 'translucent' | 'solid';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export interface ServiceCatalogItem {
  id: string;
  name: string;
  defaultPrice: number;
  category: string;
}

export interface BoardConfiguration {
  [BoardType.BB]: number;
  [BoardType.HB]: number;
  [BoardType.FB]: number;
  [BoardType.ALL]: number;
}

export interface StatCardProps {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  color: string;
}

export interface ModuleTheme {
    path: string;
    colorKey: string; // 'slate' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet' | 'sky'
}

export type ModuleThemesMap = Record<string, string>;
