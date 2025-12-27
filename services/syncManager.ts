
import { supabase } from './supabase';
import { localDb } from './localDb';
import { SyncOperation } from '../types';
import * as mappers from './mappers';

class SyncManager {
    private isOnline: boolean = false;
    private syncInProgress: boolean = false;
    private listeners: ((online: boolean) => void)[] = [];
    private checkInterval: number | null = null;
    private lastError: string | null = null;

    constructor() {
        // Écouter les événements réseau comme indicateurs initiaux
        window.addEventListener('online', () => this.checkConnection());
        window.addEventListener('offline', () => this.setOnlineStatus(false));
        
        // Vérification initiale
        this.checkConnection();
        
        // Vérification périodique toutes les 30 secondes
        this.checkInterval = window.setInterval(() => this.checkConnection(), 30000);
    }

    // Vérification réelle de la connexion en pingant Supabase
    private async checkConnection(): Promise<boolean> {
        if (!navigator.onLine) {
            this.setOnlineStatus(false);
            return false;
        }

        try {
            // Ping réel vers Supabase - requête légère
            const { error } = await supabase.from('rooms').select('id').limit(1);
            
            if (error) {
                console.warn('[SyncManager] Supabase error:', error.message);
                this.lastError = error.message;
                this.setOnlineStatus(false);
                return false;
            }
            
            this.lastError = null;
            this.setOnlineStatus(true);
            return true;
        } catch (err) {
            console.warn('[SyncManager] Connection check failed:', err);
            this.lastError = err instanceof Error ? err.message : 'Unknown error';
            this.setOnlineStatus(false);
            return false;
        }
    }

    private setOnlineStatus(online: boolean) {
        if (this.isOnline !== online) {
            console.log(`[SyncManager] Status changed: ${online ? 'ONLINE' : 'OFFLINE'}`);
            this.isOnline = online;
            this.listeners.forEach(l => l(online));
            
            if (online) {
                this.sync();
            }
        }
    }

    public subscribe(callback: (online: boolean) => void) {
        this.listeners.push(callback);
        // Envoyer immédiatement l'état actuel au nouveau subscriber
        callback(this.isOnline);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    public getStatus() {
        return this.isOnline;
    }

    public getLastError() {
        return this.lastError;
    }

    // Forcer une vérification manuelle
    public async forceCheck(): Promise<boolean> {
        return await this.checkConnection();
    }

    public async queueOperation(op: Omit<SyncOperation, 'timestamp' | 'retryCount'>) {
        await localDb.syncQueue.add({
            ...op,
            timestamp: Date.now(),
            retryCount: 0
        });
        
        // Tenter la synchronisation si on pense être en ligne
        if (this.isOnline) {
            this.sync();
        }
    }

    public async sync() {
        if (this.syncInProgress) {
            console.log('[SyncManager] Sync already in progress, skipping');
            return;
        }
        
        // Vérifier d'abord la connexion réelle
        const isReallyOnline = await this.checkConnection();
        if (!isReallyOnline) {
            console.log('[SyncManager] Not online, skipping sync');
            return;
        }

        this.syncInProgress = true;
        console.log('[SyncManager] Starting sync...');

        try {
            await this.pushChanges();
            await this.pullChanges();
            console.log('[SyncManager] Sync completed successfully');
        } catch (error) {
            console.error('[SyncManager] Sync error:', error);
            this.lastError = error instanceof Error ? error.message : 'Sync failed';
        } finally {
            this.syncInProgress = false;
        }
    }

    private async pushChanges() {
        const ops = await localDb.syncQueue.orderBy('timestamp').toArray();
        console.log(`[SyncManager] Pushing ${ops.length} operations...`);
        
        let successCount = 0;
        let failCount = 0;
        
        for (const op of ops) {
            try {
                let error;
                console.log(`[SyncManager] Processing: ${op.action} on ${op.table} (${op.entityId})`);
                
                if (op.action === 'create' || op.action === 'update') {
                    const dbData = this.mapToRemote(op.table, op.data);
                    console.log(`[SyncManager] Data to send:`, dbData);
                    
                    const { error: upsertError, data } = await supabase
                        .from(op.table)
                        .upsert({ ...dbData, id: op.entityId })
                        .select();
                    
                    error = upsertError;
                    
                    if (data) {
                        console.log(`[SyncManager] ✓ Upserted successfully:`, data);
                    }
                } else if (op.action === 'delete') {
                    const { error: deleteError } = await supabase
                        .from(op.table)
                        .delete()
                        .eq('id', op.entityId);
                    error = deleteError;
                }

                if (!error) {
                    await localDb.syncQueue.delete(op.id!);
                    const tableKey = this.mapTableToDb(op.table);
                    const table = (localDb as any)[tableKey];
                    if (table && op.action !== 'delete') {
                        await table.update(op.entityId, { _synced: true });
                    }
                    successCount++;
                    console.log(`[SyncManager] ✓ Operation ${op.id} completed`);
                } else {
                    failCount++;
                    console.error(`[SyncManager] ✗ Error on ${op.table}:`, error.message, error.details);
                    this.lastError = `${op.table}: ${error.message}`;
                    
                    // Incrémenter le retry count
                    await localDb.syncQueue.update(op.id!, { retryCount: (op.retryCount || 0) + 1 });
                    
                    // Si trop de retry, abandonner cette opération
                    if ((op.retryCount || 0) >= 5) {
                        console.error(`[SyncManager] Abandoning operation after 5 retries:`, op);
                        await localDb.syncQueue.delete(op.id!);
                    }
                }
            } catch (err) {
                failCount++;
                console.error(`[SyncManager] ✗ Exception for operation ${op.id}:`, err);
            }
        }
        
        console.log(`[SyncManager] Push complete: ${successCount} success, ${failCount} failed`);
    }

    private async pullChanges() {
        console.log('[SyncManager] Pulling remote changes...');
        
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
                const { data, error } = await supabase.from(t.remote).select('*');
                
                if (error) {
                    console.error(`[SyncManager] ✗ Pull error for ${t.remote}:`, error.message);
                    this.lastError = `Pull ${t.remote}: ${error.message}`;
                    continue;
                }
                
                if (data && data.length > 0) {
                    console.log(`[SyncManager] ✓ Pulled ${data.length} records from ${t.remote}`);
                    const localTable = (localDb as any)[t.local];
                    for (const item of data) {
                        try {
                            const frontendItem = t.mapper(item);
                            await localTable.put({
                                ...frontendItem,
                                _synced: true,
                                _lastModified: Date.now()
                            });
                        } catch (mapErr) {
                            console.error(`[SyncManager] Mapping error for ${t.remote}:`, mapErr, item);
                        }
                    }
                } else {
                    console.log(`[SyncManager] No data in ${t.remote}`);
                }
            } catch (err) {
                console.error(`[SyncManager] ✗ Exception pulling ${t.remote}:`, err);
            }
        }
        
        console.log('[SyncManager] Pull complete');
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
