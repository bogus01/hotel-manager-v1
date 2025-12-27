import { Room, RoomStatus, Reservation, ReservationStatus, Client, Tax, PaymentMethod, ServiceCatalogItem, RoomCategory, User, Payment, ServiceItem, CurrencySettings, PlanningSettings, BoardConfiguration, ModuleThemesMap, PricingModel } from '../types';

// ============================================
// ROOM CATEGORIES
// ============================================
export const mapRoomCategoryFromDB = (row: any): RoomCategory => ({
    id: row.id,
    name: row.name,
    defaultCapacity: row.default_capacity,
    defaultBaseRate: Number(row.default_base_rate),
    pricingModel: row.pricing_model as PricingModel,
    occupancyPrices: row.occupancy_prices || {},
    color: row.color,
});

export const mapRoomCategoryToDB = (cat: Partial<RoomCategory>) => ({
    name: cat.name,
    default_capacity: cat.defaultCapacity,
    default_base_rate: cat.defaultBaseRate,
    pricing_model: cat.pricingModel,
    occupancy_prices: cat.occupancyPrices,
    color: cat.color,
});

// ============================================
// ROOMS
// ============================================
export const mapRoomFromDB = (row: any): Room => ({
    id: row.id,
    number: row.number,
    type: row.type,
    floor: row.floor,
    capacity: row.capacity,
    baseRate: Number(row.base_rate),
    pricingModel: row.pricing_model as PricingModel,
    occupancyPrices: row.occupancy_prices || {},
    status: row.status as RoomStatus,
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

// ============================================
// CLIENTS
// ============================================
export const mapClientFromDB = (row: any): Client => ({
    id: row.id,
    civility: row.civility,
    firstName: row.first_name,
    lastName: row.last_name,
    company: row.company,
    email: row.email || '',
    phone: row.phone || '',
    address: row.address,
    balance: Number(row.balance) || 0,
    isAccountHolder: row.is_account_holder || false,
    notes: row.notes,
});

export const mapClientToDB = (client: Partial<Client>) => ({
    civility: client.civility,
    first_name: client.firstName,
    last_name: client.lastName,
    company: client.company,
    email: client.email,
    phone: client.phone,
    address: client.address,
    balance: client.balance,
    is_account_holder: client.isAccountHolder,
    notes: client.notes,
});

// ============================================
// RESERVATIONS
// ============================================
export const mapReservationFromDB = (row: any, services: ServiceItem[] = [], payments: Payment[] = []): Reservation => ({
    id: row.id,
    roomId: row.room_id,
    clientId: row.client_id,
    clientName: row.client_name,
    occupantName: row.occupant_name,
    checkIn: new Date(row.check_in),
    checkOut: new Date(row.check_out),
    status: row.status as ReservationStatus,
    source: row.source,
    boardType: row.board_type,
    color: row.color,
    adults: row.adults,
    children: row.children || 0,
    baseRate: Number(row.base_rate),
    totalPrice: Number(row.total_price),
    depositAmount: Number(row.deposit_amount) || 0,
    notes: row.notes,
    services,
    payments,
});

export const mapReservationToDB = (res: Partial<Reservation>) => ({
    room_id: res.roomId,
    client_id: res.clientId,
    client_name: res.clientName,
    occupant_name: res.occupantName,
    check_in: res.checkIn instanceof Date ? res.checkIn.toISOString().split('T')[0] : res.checkIn,
    check_out: res.checkOut instanceof Date ? res.checkOut.toISOString().split('T')[0] : res.checkOut,
    status: res.status,
    source: res.source,
    board_type: res.boardType,
    color: res.color,
    adults: res.adults,
    children: res.children,
    base_rate: res.baseRate,
    total_price: res.totalPrice,
    deposit_amount: res.depositAmount,
    notes: res.notes,
});

// ============================================
// SERVICES (reservation services)
// ============================================
export const mapServiceFromDB = (row: any): ServiceItem => ({
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    price: Number(row.price),
});

export const mapServiceToDB = (service: Partial<ServiceItem>, reservationId: string) => ({
    reservation_id: reservationId,
    name: service.name,
    quantity: service.quantity,
    price: service.price,
});

// ============================================
// PAYMENTS
// ============================================
export const mapPaymentFromDB = (row: any): Payment => ({
    id: row.id,
    amount: Number(row.amount),
    date: new Date(row.date),
    method: row.method,
});

export const mapPaymentToDB = (payment: Partial<Payment>, reservationId: string) => ({
    reservation_id: reservationId,
    amount: payment.amount,
    date: payment.date instanceof Date ? payment.date.toISOString() : payment.date,
    method: payment.method,
});

// ============================================
// TAXES
// ============================================
export const mapTaxFromDB = (row: any): Tax => ({
    id: row.id,
    name: row.name,
    rate: Number(row.rate),
    isFixed: row.is_fixed || false,
    applyTo: row.apply_to,
    isActive: row.is_active ?? true,
});

export const mapTaxToDB = (tax: Partial<Tax>) => ({
    name: tax.name,
    rate: tax.rate,
    is_fixed: tax.isFixed,
    apply_to: tax.applyTo,
    is_active: tax.isActive,
});

// ============================================
// PAYMENT METHODS
// ============================================
export const mapPaymentMethodFromDB = (row: any): PaymentMethod => ({
    id: row.id,
    name: row.name,
    iconType: row.icon_type,
    isActive: row.is_active ?? true,
    isSystem: row.is_system || false,
});

export const mapPaymentMethodToDB = (pm: Partial<PaymentMethod>) => ({
    name: pm.name,
    icon_type: pm.iconType,
    is_active: pm.isActive,
    is_system: pm.isSystem,
});

// ============================================
// SERVICE CATALOG
// ============================================
export const mapServiceCatalogFromDB = (row: any): ServiceCatalogItem => ({
    id: row.id,
    name: row.name,
    defaultPrice: Number(row.default_price),
    category: row.category || '',
});

export const mapServiceCatalogToDB = (item: Partial<ServiceCatalogItem>) => ({
    name: item.name,
    default_price: item.defaultPrice,
    category: item.category,
});

// ============================================
// USERS
// ============================================
export const mapUserFromDB = (row: any): User => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: row.is_active ?? true,
});

export const mapUserToDB = (user: Partial<User>) => ({
    name: user.name,
    email: user.email,
    role: user.role,
    is_active: user.isActive,
});

// ============================================
// SETTINGS
// ============================================
export const parseSettingsValue = <T>(row: any, defaultValue: T): T => {
    if (!row) return defaultValue;
    return row.value as T;
};
