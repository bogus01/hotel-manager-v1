
import { localDb } from './localDb';
import { syncManager } from './syncManager';
import * as mappers from './mappers';
import { 
    Room, RoomCategory, Client, Reservation, Tax, PaymentMethod, 
    ServiceCatalogItem, User, ReservationStatus, ServiceItem, Payment,
    CurrencySettings, BoardConfiguration, PlanningSettings, ModuleThemesMap,
    BoardType, RoomStatus
} from '../types';

// Helper pour générer des IDs robustes
const generateId = (): string => {
    try {
        return crypto.randomUUID();
    } catch (e) {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }
};

// TAXES
export const fetchTaxes = async (): Promise<Tax[]> => {
    return await localDb.taxes.toArray();
};

export const createTax = async (tax: Omit<Tax, 'id'>): Promise<Tax> => {
    const id = generateId();
    const newTax = { ...tax, id } as Tax;
    // ... rest of file uses generateId() instead of generateId()
    await localDb.taxes.add({ ...newTax, _synced: false, _lastModified: Date.now() });
    await syncManager.queueOperation({ action: 'create', table: 'taxes', entityId: id, data: newTax });
    return newTax;
};

export const updateTax = async (tax: Tax): Promise<Tax> => {
    await localDb.taxes.put({ ...tax, _synced: false, _lastModified: Date.now() });
    await syncManager.queueOperation({ action: 'update', table: 'taxes', entityId: tax.id, data: tax });
    return tax;
};

export const deleteTax = async (id: string): Promise<void> => {
    await localDb.taxes.delete(id);
    await syncManager.queueOperation({ action: 'delete', table: 'taxes', entityId: id, data: null });
};

// ROOM CATEGORIES
export const fetchRoomCategories = async (): Promise<RoomCategory[]> => {
    return await localDb.roomCategories.toArray();
};

export const createRoomCategory = async (cat: Omit<RoomCategory, 'id'>): Promise<RoomCategory> => {
    const id = generateId();
    const newCat = { ...cat, id } as RoomCategory;
    await localDb.roomCategories.add({ ...newCat, _synced: false, _lastModified: Date.now() });
    await syncManager.queueOperation({ action: 'create', table: 'room_categories', entityId: id, data: newCat });
    return newCat;
};

export const updateRoomCategory = async (cat: RoomCategory): Promise<RoomCategory> => {
    await localDb.roomCategories.put({ ...cat, _synced: false, _lastModified: Date.now() });
    await syncManager.queueOperation({ action: 'update', table: 'room_categories', entityId: cat.id, data: cat });
    return cat;
};

export const deleteRoomCategory = async (id: string): Promise<boolean> => {
    await localDb.roomCategories.delete(id);
    await syncManager.queueOperation({ action: 'delete', table: 'room_categories', entityId: id, data: null });
    return true;
};

// ROOMS
export const fetchRooms = async (): Promise<Room[]> => {
    return await localDb.rooms.orderBy('number').toArray();
};

export const createRoom = async (room: Omit<Room, 'id' | 'status'>): Promise<Room> => {
    const id = generateId();
    const newRoom = { ...room, id, status: RoomStatus.CLEAN } as Room;
    await localDb.rooms.add({ ...newRoom, _synced: false, _lastModified: Date.now() });
    await syncManager.queueOperation({ action: 'create', table: 'rooms', entityId: id, data: newRoom });
    return newRoom;
};

export const updateRoom = async (room: Room): Promise<Room> => {
    await localDb.rooms.put({ ...room, _synced: false, _lastModified: Date.now() });
    await syncManager.queueOperation({ action: 'update', table: 'rooms', entityId: room.id, data: room });
    return room;
};

export const deleteRoom = async (id: string): Promise<void> => {
    await localDb.rooms.delete(id);
    await syncManager.queueOperation({ action: 'delete', table: 'rooms', entityId: id, data: null });
};

// CLIENTS
export const fetchClients = async (): Promise<Client[]> => {
    return await localDb.clients.orderBy('lastName').toArray();
};

export const createClient = async (client: Omit<Client, 'id'>): Promise<Client> => {
    const id = generateId();
    const newClient = { ...client, id, balance: 0 } as Client;
    await localDb.clients.add({ ...newClient, _synced: false, _lastModified: Date.now() });
    await syncManager.queueOperation({ action: 'create', table: 'clients', entityId: id, data: newClient });
    return newClient;
};

export const updateClient = async (client: Client): Promise<Client> => {
    await localDb.clients.put({ ...client, _synced: false, _lastModified: Date.now() });
    await syncManager.queueOperation({ action: 'update', table: 'clients', entityId: client.id, data: client });
    return client;
};

export const updateClientBalance = async (id: string, amount: number): Promise<Client | null> => {
    const client = await localDb.clients.get(id);
    if (!client) return null;
    const newBalance = Math.max(0, Number(client.balance) - amount);
    const updatedClient = { ...client, balance: newBalance };
    await localDb.clients.put({ ...updatedClient, _synced: false, _lastModified: Date.now() });
    await syncManager.queueOperation({ action: 'update', table: 'clients', entityId: id, data: updatedClient });
    return updatedClient;
};

export const addToClientBalance = async (id: string, amount: number): Promise<Client | null> => {
    const client = await localDb.clients.get(id);
    if (!client) return null;
    const newBalance = Number(client.balance) + amount;
    const updatedClient = { ...client, balance: newBalance };
    await localDb.clients.put({ ...updatedClient, _synced: false, _lastModified: Date.now() });
    await syncManager.queueOperation({ action: 'update', table: 'clients', entityId: id, data: updatedClient });
    return updatedClient;
};

// RESERVATIONS
export const fetchReservations = async (): Promise<Reservation[]> => {
    return await localDb.reservations.toArray();
};

export const createReservation = async (res: Omit<Reservation, 'id'>): Promise<Reservation> => {
    const id = generateId();
    const newRes = { ...res, id } as Reservation;
    await localDb.reservations.add({ ...newRes, _synced: false, _lastModified: Date.now() });
    await syncManager.queueOperation({ action: 'create', table: 'reservations', entityId: id, data: newRes });
    return newRes;
};

export const updateReservation = async (reservation: Reservation): Promise<Reservation> => {
    await localDb.reservations.put({ ...reservation, _synced: false, _lastModified: Date.now() });
    await syncManager.queueOperation({ action: 'update', table: 'reservations', entityId: reservation.id, data: reservation });
    return reservation;
};

export const deleteReservation = async (id: string): Promise<void> => {
    await localDb.reservations.delete(id);
    await syncManager.queueOperation({ action: 'delete', table: 'reservations', entityId: id, data: null });
};

export const updateReservationDate = async (id: string, checkIn: Date, checkOut: Date, roomId: string): Promise<void> => {
    const res = await localDb.reservations.get(id);
    if (res) {
        const updated = { ...res, checkIn, checkOut, roomId };
        await localDb.reservations.put({ ...updated, _synced: false, _lastModified: Date.now() });
        await syncManager.queueOperation({ action: 'update', table: 'reservations', entityId: id, data: updated });
    }
};

export const updateReservationStatus = async (id: string, status: ReservationStatus): Promise<void> => {
    const res = await localDb.reservations.get(id);
    if (res) {
        const updated = { ...res, status };
        await localDb.reservations.put({ ...updated, _synced: false, _lastModified: Date.now() });
        await syncManager.queueOperation({ action: 'update', table: 'reservations', entityId: id, data: updated });
    }
};

export const createMultipleReservations = async (newResList: Omit<Reservation, 'id'>[]): Promise<Reservation[]> => {
    const results: Reservation[] = [];
    for (const res of newResList) {
        const created = await createReservation(res);
        results.push(created);
    }
    return results;
};

export const updateMultipleReservations = async (updatedList: Reservation[]): Promise<void> => {
    for (const res of updatedList) {
        await updateReservation(res);
    }
};

export const resetPlanningData = async (): Promise<void> => {
    console.log('[Reset] Début du reset des données...');
    
    // 1. Récupérer tous les IDs des réservations LOCALES avant de les effacer
    const localReservations = await localDb.reservations.toArray();
    const localIds = localReservations.map(r => r.id);
    console.log(`[Reset] ${localIds.length} réservations locales trouvées:`, localIds);
    
    // 2. Vérifier VRAIMENT si on peut joindre Supabase (pas juste le status en cache)
    let canReachSupabase = false;
    let remoteIds: string[] = [];
    
    try {
        const { supabase } = await import('./supabase');
        const { data, error } = await supabase.from('reservations').select('id');
        
        if (!error) {
            canReachSupabase = true;
            remoteIds = data?.map(r => r.id) || [];
            console.log(`[Reset] ✓ Supabase accessible - ${remoteIds.length} réservations distantes`);
        } else {
            console.log('[Reset] ✗ Supabase inaccessible:', error.message);
        }
    } catch (err) {
        console.log('[Reset] ✗ Impossible de joindre Supabase:', err);
    }
    
    // 3. Combiner les IDs locaux et distants (sans doublons)
    const allIds = [...new Set([...localIds, ...remoteIds])];
    console.log(`[Reset] Total: ${allIds.length} réservations à supprimer`);
    
    // 4. Nettoyer la queue de sync existante
    await localDb.syncQueue.clear();
    
    if (canReachSupabase && allIds.length > 0) {
        // === MODE EN LIGNE - Suppression directe ===
        console.log('[Reset] Mode EN LIGNE - Suppression directe dans Supabase...');
        
        const { supabase } = await import('./supabase');
        let deletedCount = 0;
        
        for (const id of allIds) {
            const { error } = await supabase
                .from('reservations')
                .delete()
                .eq('id', id);
            
            if (!error) {
                deletedCount++;
            } else {
                console.error(`[Reset] Erreur suppression ${id}:`, error.message);
            }
        }
        
        console.log(`[Reset] ✓ ${deletedCount}/${allIds.length} supprimées de Supabase`);
        
    } else if (allIds.length > 0) {
        // === MODE HORS LIGNE - Mise en queue ===
        console.log('[Reset] Mode HORS LIGNE - Mise en queue des suppressions...');
        
        // IMPORTANT: Ajouter chaque suppression à la queue
        for (const id of allIds) {
            await localDb.syncQueue.add({
                action: 'delete',
                table: 'reservations',
                entityId: id,
                data: null,
                timestamp: Date.now(),
                retryCount: 0
            });
            console.log(`[Reset] Queued delete for: ${id}`);
        }
        
        // Marquer qu'un reset a été fait hors ligne
        await localDb.settings.put({ key: 'pendingReset', value: true });
        
        // Vérifier que les opérations sont bien dans la queue
        const queueCount = await localDb.syncQueue.count();
        console.log(`[Reset] ✓ ${queueCount} opérations dans la queue de sync`);
    }
    
    // 5. Effacer les données locales
    await localDb.reservations.clear();
    console.log('[Reset] ✓ Données locales effacées');
};

// SERVICES ET PAIEMENTS
export const addServiceToReservation = async (id: string, service: ServiceItem): Promise<void> => {
    const res = await localDb.reservations.get(id);
    if (res) {
        const newServices = [...(res.services || []), service];
        const newTotal = Number(res.totalPrice) + (service.price * service.quantity);
        const updated = { ...res, services: newServices, totalPrice: newTotal };
        await localDb.reservations.put({ ...updated, _synced: false, _lastModified: Date.now() });
        await syncManager.queueOperation({ action: 'update', table: 'reservations', entityId: id, data: updated });
    }
};

export const addPaymentToReservation = async (id: string, payment: Payment): Promise<void> => {
    const res = await localDb.reservations.get(id);
    if (res) {
        const newPayments = [...(res.payments || []), payment];
        const updated = { ...res, payments: newPayments };
        await localDb.reservations.put({ ...updated, _synced: false, _lastModified: Date.now() });
        await syncManager.queueOperation({ action: 'update', table: 'reservations', entityId: id, data: updated });
    }
};

export const deletePayment = async (id: string): Promise<void> => {
    // Note: Dans cette implémentation, les paiements sont des sous-objets des réservations.
    // Pour supprimer un paiement, il faudrait identifier la réservation.
    // On laisse syncManager gérer les queues séparées si on avait des tables séparées.
};

export const deleteService = async (id: string, reservationId: string): Promise<void> => {
    const res = await localDb.reservations.get(reservationId);
    if (res) {
        const service = res.services.find(s => s.id === id);
        if (service) {
            const newServices = res.services.filter(s => s.id !== id);
            const newTotal = Math.max(0, Number(res.totalPrice) - (service.price * service.quantity));
            const updated = { ...res, services: newServices, totalPrice: newTotal };
            await localDb.reservations.put({ ...updated, _synced: false, _lastModified: Date.now() });
            await syncManager.queueOperation({ action: 'update', table: 'reservations', entityId: reservationId, data: updated });
        }
    }
};

export const fetchClientHistory = async (clientId: string): Promise<Reservation[]> => {
    return await localDb.reservations.where('clientId').equals(clientId).toArray();
};

// SERVICE CATALOG
export const fetchServiceCatalog = async (): Promise<ServiceCatalogItem[]> => {
    return await localDb.serviceCatalog.toArray();
};

export const createCatalogItem = async (item: Omit<ServiceCatalogItem, 'id'>): Promise<ServiceCatalogItem> => {
    const id = generateId();
    const newItem = { ...item, id } as ServiceCatalogItem;
    await localDb.serviceCatalog.add({ ...newItem, _synced: false, _lastModified: Date.now() });
    await syncManager.queueOperation({ action: 'create', table: 'service_catalog', entityId: id, data: newItem });
    return newItem;
};

export const deleteCatalogItem = async (id: string): Promise<void> => {
    await localDb.serviceCatalog.delete(id);
    await syncManager.queueOperation({ action: 'delete', table: 'service_catalog', entityId: id, data: null });
};

// PAYMENT METHODS
export const fetchPaymentMethods = async (): Promise<PaymentMethod[]> => {
    return await localDb.paymentMethods.toArray();
};

export const createPaymentMethod = async (method: Omit<PaymentMethod, 'id'>): Promise<PaymentMethod> => {
    const id = generateId();
    const newMethod = { ...method, id } as PaymentMethod;
    await localDb.paymentMethods.add({ ...newMethod, _synced: false, _lastModified: Date.now() });
    await syncManager.queueOperation({ action: 'create', table: 'payment_methods', entityId: id, data: newMethod });
    return newMethod;
};

export const updatePaymentMethod = async (method: PaymentMethod): Promise<PaymentMethod> => {
    await localDb.paymentMethods.put({ ...method, _synced: false, _lastModified: Date.now() });
    await syncManager.queueOperation({ action: 'update', table: 'payment_methods', entityId: method.id, data: method });
    return method;
};

export const deletePaymentMethod = async (id: string): Promise<boolean> => {
    await localDb.paymentMethods.delete(id);
    await syncManager.queueOperation({ action: 'delete', table: 'payment_methods', entityId: id, data: null });
    return true;
};

// USERS
export const fetchUsers = async (): Promise<User[]> => {
    return await localDb.users.toArray();
};

export const createUser = async (user: Omit<User, 'id'>): Promise<User> => {
    const id = generateId();
    const newUser = { ...user, id } as User;
    await localDb.users.add({ ...newUser, _synced: false, _lastModified: Date.now() });
    await syncManager.queueOperation({ action: 'create', table: 'users', entityId: id, data: newUser });
    return newUser;
};

export const updateUser = async (user: User): Promise<User> => {
    await localDb.users.put({ ...user, _synced: false, _lastModified: Date.now() });
    await syncManager.queueOperation({ action: 'update', table: 'users', entityId: user.id, data: user });
    return user;
};

export const deleteUser = async (id: string): Promise<void> => {
    await localDb.users.delete(id);
    await syncManager.queueOperation({ action: 'delete', table: 'users', entityId: id, data: null });
};

// SETTINGS
export const fetchPlanningSettings = async (): Promise<PlanningSettings> => {
    const s = await localDb.settings.get('planning_settings');
    return s?.value || {
        defaultZoom: 100, defaultView: 'month', historyOffset: 5,
        navigationStep: 2, showRoomStatus: true, selectionColor: '#6366f1',
        barStyle: 'translucent',
        statusColors: {
            confirmed: '#6366f1', checkedIn: '#10b981',
            checkedOut: '#64748b', option: '#f59e0b', cancelled: '#ef4444'
        }
    };
};

export const updatePlanningSettings = async (settings: PlanningSettings): Promise<void> => {
    await localDb.settings.put({ key: 'planning_settings', value: settings });
    await syncManager.queueOperation({ action: 'update', table: 'settings', entityId: 'planning_settings', data: settings });
};

export const fetchCurrencySettings = async (): Promise<CurrencySettings> => {
    const s = await localDb.settings.get('currency');
    return s?.value || { code: 'EUR', symbol: '€', position: 'suffix', decimalSeparator: ',', thousandSeparator: ' ', decimalPlaces: 2 };
};

export const updateCurrencySettings = async (settings: CurrencySettings): Promise<void> => {
    await localDb.settings.put({ key: 'currency', value: settings });
    await syncManager.queueOperation({ action: 'update', table: 'settings', entityId: 'currency', data: settings });
};

export const fetchBoardConfig = async (): Promise<BoardConfiguration> => {
    const s = await localDb.settings.get('board_config');
    return s?.value || { [BoardType.BB]: 15, [BoardType.HB]: 40, [BoardType.FB]: 65, [BoardType.ALL]: 95 };
};

export const updateBoardConfig = async (config: BoardConfiguration): Promise<void> => {
    await localDb.settings.put({ key: 'board_config', value: config });
    await syncManager.queueOperation({ action: 'update', table: 'settings', entityId: 'board_config', data: config });
};

export const fetchModuleThemes = async (): Promise<ModuleThemesMap> => {
    const s = await localDb.settings.get('module_themes');
    return s?.value || { '/planning': 'indigo', '/reports': 'amber', '/reservations': 'slate', '/clients': 'slate', '/daily-planning': 'violet', '/dashboard': 'slate', '/billing': 'slate', '/settings': 'slate' };
};

export const updateModuleTheme = async (path: string, colorKey: string): Promise<ModuleThemesMap> => {
    const themes = await fetchModuleThemes();
    themes[path] = colorKey;
    await localDb.settings.put({ key: 'module_themes', value: themes });
    await syncManager.queueOperation({ action: 'update', table: 'settings', entityId: 'module_themes', data: themes });
    return themes;
};
