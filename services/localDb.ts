
import Dexie, { Table } from 'dexie';
import { 
    Room, RoomCategory, Client, Reservation, ServiceItem, Payment, 
    Tax, PaymentMethod, ServiceCatalogItem, User, SyncMetadata, SyncOperation
} from '../types';

// Types enrichis avec les métadonnées de synchronisation
export type LocalRoom = Room & SyncMetadata;
export type LocalRoomCategory = RoomCategory & SyncMetadata;
export type LocalClient = Client & SyncMetadata;
export type LocalReservation = Reservation & SyncMetadata;
export type LocalTax = Tax & SyncMetadata;
export type LocalPaymentMethod = PaymentMethod & SyncMetadata;
export type LocalServiceCatalogItem = ServiceCatalogItem & SyncMetadata;
export type LocalUser = User & SyncMetadata;

export class HotelDatabase extends Dexie {
    rooms!: Table<LocalRoom>;
    roomCategories!: Table<LocalRoomCategory>;
    clients!: Table<LocalClient>;
    reservations!: Table<LocalReservation>;
    taxes!: Table<LocalTax>;
    paymentMethods!: Table<LocalPaymentMethod>;
    serviceCatalog!: Table<LocalServiceCatalogItem>;
    users!: Table<LocalUser>;
    settings!: Table<{ key: string; value: any }>;
    syncQueue!: Table<SyncOperation>;

    constructor() {
        super('HotelManagerDB');
        this.version(1).stores({
            rooms: 'id, number, type, categoryId, _synced',
            roomCategories: 'id, name, _synced',
            clients: 'id, firstName, lastName, email, phone, _synced',
            reservations: 'id, roomId, clientId, checkIn, checkOut, status, _synced',
            taxes: 'id, name, _synced',
            paymentMethods: 'id, name, _synced',
            serviceCatalog: 'id, name, category, _synced',
            users: 'id, name, email, _synced',
            settings: 'key',
            syncQueue: '++id, table, entityId, timestamp'
        });
    }
}

export const localDb = new HotelDatabase();

