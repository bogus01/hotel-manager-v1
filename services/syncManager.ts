
import { supabase } from './supabase';
import { localDb } from './localDb';
import { SyncOperation } from '../types';
import * as mappers from './mappers';

class SyncManager {
    private isOnline: boolean = navigator.onLine;
    private syncInProgress: boolean = false;
    private listeners: ((online: boolean) => void)[] = [];

    constructor() {
        window.addEventListener('online', () => this.handleStatusChange(true));
        window.addEventListener('offline', () => this.handleStatusChange(false));
    }

    private handleStatusChange(online: boolean) {
        this.isOnline = online;
        this.listeners.forEach(l => l(online));
        if (online) {
            this.sync();
        }
    }

    public subscribe(callback: (online: boolean) => void) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    public getStatus() {
        return this.isOnline;
    }

    public async queueOperation(op: Omit<SyncOperation, 'timestamp' | 'retryCount'>) {
        await localDb.syncQueue.add({
            ...op,
            timestamp: Date.now(),
            retryCount: 0
        });
        if (this.isOnline) {
            this.sync();
        }
    }

    public async sync() {
        if (this.syncInProgress || !this.isOnline) return;
        this.syncInProgress = true;

        try {
            await this.pushChanges();
            await this.pullChanges();
        } catch (error) {
            console.error('Sync error:', error);
        } finally {
            this.syncInProgress = false;
        }
    }

    private async pushChanges() {
        const ops = await localDb.syncQueue.orderBy('timestamp').toArray();
        for (const op of ops) {
            try {
                let error;
                if (op.action === 'create' || op.action === 'update') {
                    const dbData = this.mapToRemote(op.table, op.data);
                    // On inclut l'ID car upsert en a besoin pour identifier l'enregistrement
                    const { error: upsertError } = await supabase.from(op.table).upsert({ ...dbData, id: op.entityId });
                    error = upsertError;
                } else if (op.action === 'delete') {
                    const { error: deleteError } = await supabase.from(op.table).delete().eq('id', op.entityId);
                    error = deleteError;
                }

                if (!error) {
                    await localDb.syncQueue.delete(op.id!);
                    const tableKey = this.mapTableToDb(op.table);
                    const table = (localDb as any)[tableKey];
                    if (table && op.action !== 'delete') {
                        await table.update(op.entityId, { _synced: true });
                    }
                } else {
                    console.error(`Error pushing change to ${op.table}:`, error);
                }
            } catch (err) {
                console.error(`Failed to push operation ${op.id}:`, err);
            }
        }
    }

    private async pullChanges() {
        const tables = [
            { remote: 'rooms', local: 'rooms', mapper: mappers.mapRoomFromDB },
            { remote: 'room_categories', local: 'roomCategories', mapper: mappers.mapRoomCategoryFromDB },
            { remote: 'clients', local: 'clients', mapper: mappers.mapClientFromDB },
            { remote: 'reservations', local: 'reservations', mapper: (row: any) => mappers.mapReservationFromDB(row, row.services || [], row.payments || []) },
            { remote: 'taxes', local: 'taxes', mapper: mappers.mapTaxFromDB },
            { remote: 'payment_methods', local: 'paymentMethods', mapper: mappers.mapPaymentMethodFromDB },
            { remote: 'service_catalog', local: 'serviceCatalog', mapper: mappers.mapServiceCatalogFromDB },
            { remote: 'users', local: 'users', mapper: mappers.mapUserFromDB }
        ];

        for (const t of tables) {
            try {
                // Pour les réservations, on a besoin des services et paiements (logic complexe dans api.ts d'origine)
                // Mais ici on simplifie en récupérant les données brutes. 
                // Idéalement on devrait faire des jointures ou des fetchs séparés.
                const { data, error } = await supabase.from(t.remote).select('*');
                
                if (!error && data) {
                    const localTable = (localDb as any)[t.local];
                    for (const item of data) {
                        const frontendItem = t.mapper(item);
                        await localTable.put({
                            ...frontendItem,
                            _synced: true,
                            _lastModified: Date.now()
                        });
                    }
                }
            } catch (err) {
                console.error(`Pull error for ${t.remote}:`, err);
            }
        }
    }

    private mapToRemote(table: string, data: any): any {
        switch (table) {
            case 'rooms': return mappers.mapRoomToDB(data);
            case 'room_categories': return mappers.mapRoomCategoryToDB(data);
            case 'clients': return mappers.mapClientToDB(data);
            case 'reservations': return mappers.mapReservationToDB(data);
            case 'taxes': return mappers.mapTaxToDB(data);
            case 'payment_methods': return mappers.mapPaymentMethodToDB(data);
            case 'service_catalog': return mappers.mapServiceCatalogToDB(data);
            case 'users': return mappers.mapUserToDB(data);
            default: return data;
        }
    }

    private mapTableToDb(remoteTable: string): string {
        const mapping: Record<string, string> = {
            'rooms': 'rooms',
            'room_categories': 'roomCategories',
            'clients': 'clients',
            'reservations': 'reservations',
            'taxes': 'taxes',
            'payment_methods': 'paymentMethods',
            'service_catalog': 'serviceCatalog',
            'users': 'users'
        };
        return mapping[remoteTable] || remoteTable;
    }
}

export const syncManager = new SyncManager();
