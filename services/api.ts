import { supabase } from './supabase';
import {
    mapRoomFromDB, mapRoomToDB,
    mapRoomCategoryFromDB, mapRoomCategoryToDB,
    mapClientFromDB, mapClientToDB,
    mapReservationFromDB, mapReservationToDB,
    mapServiceFromDB, mapServiceToDB,
    mapPaymentFromDB, mapPaymentToDB,
    mapTaxFromDB, mapTaxToDB,
    mapPaymentMethodFromDB, mapPaymentMethodToDB,
    mapServiceCatalogFromDB, mapServiceCatalogToDB,
    mapUserFromDB, mapUserToDB,
    parseSettingsValue
} from './mappers';
import {
    Room, RoomStatus, Reservation, ReservationStatus, Client, Tax,
    PaymentMethod, ServiceCatalogItem, RoomCategory, User, Payment,
    ServiceItem, CurrencySettings, PlanningSettings, BoardConfiguration,
    ModuleThemesMap, BoardType
} from '../types';
import { formatDateToDB } from '../utils/date';

// ============================================
// TAXES
// ============================================
export const fetchTaxes = async (): Promise<Tax[]> => {
    const { data, error } = await supabase
        .from('taxes')
        .select('*')
        .order('name');
    if (error) throw error;
    return (data || []).map(mapTaxFromDB);
};

export const createTax = async (tax: Omit<Tax, 'id'>): Promise<Tax> => {
    const { data, error } = await supabase
        .from('taxes')
        .insert(mapTaxToDB(tax))
        .select()
        .single();
    if (error) throw error;
    return mapTaxFromDB(data);
};

export const updateTax = async (tax: Tax): Promise<Tax> => {
    const { data, error } = await supabase
        .from('taxes')
        .update(mapTaxToDB(tax))
        .eq('id', tax.id)
        .select()
        .single();
    if (error) throw error;
    return mapTaxFromDB(data);
};

export const deleteTax = async (id: string): Promise<void> => {
    const { error } = await supabase.from('taxes').delete().eq('id', id);
    if (error) throw error;
};

// ============================================
// ROOM CATEGORIES
// ============================================
export const fetchRoomCategories = async (): Promise<RoomCategory[]> => {
    const { data, error } = await supabase
        .from('room_categories')
        .select('*')
        .order('name');
    if (error) throw error;
    return (data || []).map(mapRoomCategoryFromDB);
};

export const createRoomCategory = async (cat: Omit<RoomCategory, 'id'>): Promise<RoomCategory> => {
    const { data, error } = await supabase
        .from('room_categories')
        .insert(mapRoomCategoryToDB(cat))
        .select()
        .single();
    if (error) throw error;
    return mapRoomCategoryFromDB(data);
};

export const updateRoomCategory = async (cat: RoomCategory): Promise<RoomCategory> => {
    const { data, error } = await supabase
        .from('room_categories')
        .update(mapRoomCategoryToDB(cat))
        .eq('id', cat.id)
        .select()
        .single();
    if (error) throw error;
    return mapRoomCategoryFromDB(data);
};

export const deleteRoomCategory = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('room_categories').delete().eq('id', id);
    if (error) throw error;
    return true;
};

// ============================================
// ROOMS
// ============================================
export const fetchRooms = async (): Promise<Room[]> => {
    const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('number');
    if (error) throw error;
    return (data || []).map(mapRoomFromDB);
};

export const createRoom = async (room: Omit<Room, 'id' | 'status'>): Promise<Room> => {
    const { data, error } = await supabase
        .from('rooms')
        .insert({ ...mapRoomToDB(room), status: RoomStatus.CLEAN })
        .select()
        .single();
    if (error) throw error;
    return mapRoomFromDB(data);
};

export const updateRoom = async (room: Room): Promise<Room> => {
    const { data, error } = await supabase
        .from('rooms')
        .update(mapRoomToDB(room))
        .eq('id', room.id)
        .select()
        .single();
    if (error) throw error;
    return mapRoomFromDB(data);
};

export const deleteRoom = async (id: string): Promise<void> => {
    const { error } = await supabase.from('rooms').delete().eq('id', id);
    if (error) throw error;
};

// ============================================
// CLIENTS
// ============================================
export const fetchClients = async (): Promise<Client[]> => {
    const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('last_name');
    if (error) throw error;
    return (data || []).map(mapClientFromDB);
};

export const createClient = async (client: Omit<Client, 'id'>): Promise<Client> => {
    const { data, error } = await supabase
        .from('clients')
        .insert({ ...mapClientToDB(client), balance: 0 })
        .select()
        .single();
    if (error) throw error;
    return mapClientFromDB(data);
};

export const updateClient = async (client: Client): Promise<Client> => {
    const { data, error } = await supabase
        .from('clients')
        .update(mapClientToDB(client))
        .eq('id', client.id)
        .select()
        .single();
    if (error) throw error;
    return mapClientFromDB(data);
};

export const updateClientBalance = async (id: string, amount: number): Promise<Client | null> => {
    const { data: client, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();
    if (fetchError || !client) return null;

    const newBalance = Math.max(0, Number(client.balance) - amount);
    const { data, error } = await supabase
        .from('clients')
        .update({ balance: newBalance })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return mapClientFromDB(data);
};

export const addToClientBalance = async (id: string, amount: number): Promise<Client | null> => {
    const { data: client, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();
    if (fetchError || !client) return null;

    const newBalance = Number(client.balance) + amount;
    const { data, error } = await supabase
        .from('clients')
        .update({ balance: newBalance })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return mapClientFromDB(data);
};

// ============================================
// RESERVATIONS (with services & payments)
// ============================================
export const fetchReservations = async (): Promise<Reservation[]> => {
    const { data: reservations, error } = await supabase
        .from('reservations')
        .select('*')
        .order('check_in', { ascending: false });
    if (error) throw error;
    if (!reservations || reservations.length === 0) return [];

    const resIds = reservations.map(r => r.id);

    const [servicesRes, paymentsRes] = await Promise.all([
        supabase.from('services').select('*').in('reservation_id', resIds),
        supabase.from('payments').select('*').in('reservation_id', resIds)
    ]);

    const servicesByRes: Record<string, ServiceItem[]> = {};
    const paymentsByRes: Record<string, Payment[]> = {};

    (servicesRes.data || []).forEach(s => {
        if (!servicesByRes[s.reservation_id]) servicesByRes[s.reservation_id] = [];
        servicesByRes[s.reservation_id].push(mapServiceFromDB(s));
    });

    (paymentsRes.data || []).forEach(p => {
        if (!paymentsByRes[p.reservation_id]) paymentsByRes[p.reservation_id] = [];
        paymentsByRes[p.reservation_id].push(mapPaymentFromDB(p));
    });

    return reservations.map(r => mapReservationFromDB(
        r,
        servicesByRes[r.id] || [],
        paymentsByRes[r.id] || []
    ));
};

export const createReservation = async (res: Omit<Reservation, 'id'>): Promise<Reservation> => {
    const { data, error } = await supabase
        .from('reservations')
        .insert(mapReservationToDB(res))
        .select()
        .single();
    if (error) throw error;

    const newRes = mapReservationFromDB(data, [], []);

    // Insert services if any
    if (res.services && res.services.length > 0) {
        const servicesData = res.services.map(s => mapServiceToDB(s, newRes.id));
        await supabase.from('services').insert(servicesData);
    }

    // Insert payments if any
    if (res.payments && res.payments.length > 0) {
        const paymentsData = res.payments.map(p => mapPaymentToDB(p, newRes.id));
        await supabase.from('payments').insert(paymentsData);
    }

    return { ...newRes, services: res.services || [], payments: res.payments || [] };
};

export const createMultipleReservations = async (newResList: Omit<Reservation, 'id'>[]): Promise<Reservation[]> => {
    const results: Reservation[] = [];
    for (const res of newResList) {
        const created = await createReservation(res);
        results.push(created);
    }
    return results;
};

export const updateReservation = async (reservation: Reservation): Promise<Reservation> => {
    const { data, error } = await supabase
        .from('reservations')
        .update(mapReservationToDB(reservation))
        .eq('id', reservation.id)
        .select()
        .single();
    if (error) throw error;
    return mapReservationFromDB(data, reservation.services, reservation.payments);
};

export const updateMultipleReservations = async (updatedList: Reservation[]): Promise<void> => {
    for (const res of updatedList) {
        await updateReservation(res);
    }
};

export const deleteReservation = async (id: string): Promise<void> => {
    const { error } = await supabase.from('reservations').delete().eq('id', id);
    if (error) throw error;
};

export const resetPlanningData = async (): Promise<void> => {
    // Delete in order to respect potential foreign key constraints
    const { error: servicesError } = await supabase.from('services').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (servicesError) throw servicesError;

    const { error: paymentsError } = await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (paymentsError) throw paymentsError;

    const { error: reservationsError } = await supabase.from('reservations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (reservationsError) throw reservationsError;
};

export const updateReservationDate = async (id: string, checkIn: Date, checkOut: Date, roomId: string): Promise<void> => {
    const { error } = await supabase
        .from('reservations')
        .update({
            check_in: formatDateToDB(checkIn),
            check_out: formatDateToDB(checkOut),
            room_id: roomId
        })
        .eq('id', id);
    if (error) throw error;
};

export const updateReservationStatus = async (id: string, status: ReservationStatus): Promise<void> => {
    const { error } = await supabase
        .from('reservations')
        .update({ status })
        .eq('id', id);
    if (error) throw error;
};

export const addServiceToReservation = async (id: string, service: ServiceItem): Promise<void> => {
    const { error: insertError } = await supabase
        .from('services')
        .insert(mapServiceToDB(service, id));
    if (insertError) throw insertError;

    // Update total price
    const { data: res } = await supabase.from('reservations').select('total_price').eq('id', id).single();
    if (res) {
        const newTotal = Number(res.total_price) + (service.price * service.quantity);
        await supabase.from('reservations').update({ total_price: newTotal }).eq('id', id);
    }
};

export const addPaymentToReservation = async (id: string, payment: Payment): Promise<void> => {
    const { error } = await supabase
        .from('payments')
        .insert(mapPaymentToDB(payment, id));
    if (error) throw error;
};

export const deletePayment = async (id: string): Promise<void> => {
    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (error) throw error;
};

export const deleteService = async (id: string, reservationId: string): Promise<void> => {
    const { data: service, error: fetchError } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .single();
    
    if (fetchError || !service) return;

    const amountToSubtract = Number(service.price) * Number(service.quantity);

    const { error: deleteError } = await supabase.from('services').delete().eq('id', id);
    if (deleteError) throw deleteError;

    // Update total price
    const { data: res } = await supabase.from('reservations').select('total_price').eq('id', reservationId).single();
    if (res) {
        const newTotal = Math.max(0, Number(res.total_price) - amountToSubtract);
        await supabase.from('reservations').update({ total_price: newTotal }).eq('id', reservationId);
    }
};

export const fetchClientHistory = async (clientId: string): Promise<Reservation[]> => {
    const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('client_id', clientId)
        .order('check_in', { ascending: false });
    if (error) throw error;
    return (data || []).map(r => mapReservationFromDB(r, [], []));
};

// ============================================
// SERVICE CATALOG
// ============================================
export const fetchServiceCatalog = async (): Promise<ServiceCatalogItem[]> => {
    const { data, error } = await supabase
        .from('service_catalog')
        .select('*')
        .order('name');
    if (error) throw error;
    return (data || []).map(mapServiceCatalogFromDB);
};

export const createCatalogItem = async (item: Omit<ServiceCatalogItem, 'id'>): Promise<ServiceCatalogItem> => {
    const { data, error } = await supabase
        .from('service_catalog')
        .insert(mapServiceCatalogToDB(item))
        .select()
        .single();
    if (error) throw error;
    return mapServiceCatalogFromDB(data);
};

export const deleteCatalogItem = async (id: string): Promise<void> => {
    const { error } = await supabase.from('service_catalog').delete().eq('id', id);
    if (error) throw error;
};

// ============================================
// PAYMENT METHODS
// ============================================
export const fetchPaymentMethods = async (): Promise<PaymentMethod[]> => {
    const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('name');
    if (error) throw error;
    return (data || []).map(mapPaymentMethodFromDB);
};

export const createPaymentMethod = async (method: Omit<PaymentMethod, 'id'>): Promise<PaymentMethod> => {
    const { data, error } = await supabase
        .from('payment_methods')
        .insert(mapPaymentMethodToDB(method))
        .select()
        .single();
    if (error) throw error;
    return mapPaymentMethodFromDB(data);
};

export const updatePaymentMethod = async (method: PaymentMethod): Promise<PaymentMethod> => {
    const { data, error } = await supabase
        .from('payment_methods')
        .update(mapPaymentMethodToDB(method))
        .eq('id', method.id)
        .select()
        .single();
    if (error) throw error;
    return mapPaymentMethodFromDB(data);
};

export const deletePaymentMethod = async (id: string): Promise<boolean> => {
    const { data: method } = await supabase
        .from('payment_methods')
        .select('is_system')
        .eq('id', id)
        .single();
    if (method?.is_system) return false;

    const { error } = await supabase.from('payment_methods').delete().eq('id', id);
    if (error) throw error;
    return true;
};

// ============================================
// USERS
// ============================================
export const fetchUsers = async (): Promise<User[]> => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name');
    if (error) throw error;
    return (data || []).map(mapUserFromDB);
};

export const createUser = async (user: Omit<User, 'id'>): Promise<User> => {
    const { data, error } = await supabase
        .from('users')
        .insert(mapUserToDB(user))
        .select()
        .single();
    if (error) throw error;
    return mapUserFromDB(data);
};

export const updateUser = async (user: User): Promise<User> => {
    const { data, error } = await supabase
        .from('users')
        .update(mapUserToDB(user))
        .eq('id', user.id)
        .select()
        .single();
    if (error) throw error;
    return mapUserFromDB(data);
};

export const deleteUser = async (id: string): Promise<void> => {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
};

// ============================================
// SETTINGS (key-value store)
// ============================================
const getSettingValue = async <T>(key: string, defaultValue: T): Promise<T> => {
    const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', key)
        .single();
    if (error || !data) return defaultValue;
    return data.value as T;
};

const setSettingValue = async <T>(key: string, value: T): Promise<void> => {
    const { error } = await supabase
        .from('settings')
        .upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw error;
};

export const fetchCurrencySettings = async (): Promise<CurrencySettings> => {
    return getSettingValue('currency', {
        code: 'EUR', symbol: '€', position: 'suffix',
        decimalSeparator: ',', thousandSeparator: ' ', decimalPlaces: 2
    });
};

export const updateCurrencySettings = async (settings: CurrencySettings): Promise<void> => {
    await setSettingValue('currency', settings);
};

export const fetchBoardConfig = async (): Promise<BoardConfiguration> => {
    return getSettingValue('board_config', {
        [BoardType.BB]: 15, [BoardType.HB]: 40, [BoardType.FB]: 65, [BoardType.ALL]: 95
    });
};

export const updateBoardConfig = async (config: BoardConfiguration): Promise<void> => {
    await setSettingValue('board_config', config);
};

export const fetchPlanningSettings = async (): Promise<PlanningSettings> => {
    const defaults: PlanningSettings = {
        defaultZoom: 100, defaultView: 'month' as const, historyOffset: 5,
        navigationStep: 2, showRoomStatus: true, selectionColor: '#6366f1',
        barStyle: 'translucent' as const,
        statusColors: {
            confirmed: '#6366f1', checkedIn: '#10b981',
            checkedOut: '#64748b', option: '#f59e0b', cancelled: '#ef4444'
        }
    };
    const saved = await getSettingValue<Partial<PlanningSettings>>('planning_settings', {});
    return {
        ...defaults,
        ...saved,
        statusColors: {
            ...defaults.statusColors,
            ...(saved.statusColors || {})
        }
    } as PlanningSettings;
};

export const updatePlanningSettings = async (settings: PlanningSettings): Promise<void> => {
    await setSettingValue('planning_settings', settings);
};

export const fetchModuleThemes = async (): Promise<ModuleThemesMap> => {
    return getSettingValue('module_themes', {
        '/planning': 'indigo', '/reports': 'amber', '/reservations': 'slate',
        '/clients': 'slate', '/daily-planning': 'violet', '/dashboard': 'slate',
        '/billing': 'slate', '/settings': 'slate'
    });
};

export const updateModuleTheme = async (path: string, colorKey: string): Promise<ModuleThemesMap> => {
    const themes = await fetchModuleThemes();
    themes[path] = colorKey;
    await setSettingValue('module_themes', themes);
    return themes;
};
