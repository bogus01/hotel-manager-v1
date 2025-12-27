
import { supabase } from './supabase';
import { localDb } from './localDb';
import { SyncOperation } from '../types';

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
                    const { error: upsertError } = await supabase.from(op.table).upsert(op.data);
                    error = upsertError;
                } else if (op.action === 'delete') {
                    const { error: deleteError } = await supabase.from(op.table).delete().eq('id', op.entityId);
                    error = deleteError;
                }

                if (!error) {
                    await localDb.syncQueue.delete(op.id!);
                    // Mettre à jour le flag _synced localement
                    const table = (localDb as any)[this.mapTableToDb(op.table)];
                    if (table) {
                        await table.update(op.entityId, { _synced: true });
                    }
                } else {
                    console.error(`Error pushing change to ${op.table}:`, error);
                    // On pourrait implémenter un retry count ici
                }
            } catch (err) {
                console.error(`Failed to push operation ${op.id}:`, err);
            }
        }
    }

    private async pullChanges() {
        // Liste des tables à synchroniser
        const tables = [
            { remote: 'rooms', local: 'rooms' },
            { remote: 'room_categories', local: 'roomCategories' },
            { remote: 'clients', local: 'clients' },
            { remote: 'reservations', local: 'reservations' },
            { remote: 'taxes', local: 'taxes' },
            { remote: 'payment_methods', local: 'paymentMethods' },
            { remote: 'service_catalog', local: 'serviceCatalog' },
            { remote: 'users', local: 'users' }
        ];

        for (const t of tables) {
            const { data, error } = await supabase.from(t.remote).select('*');
            if (!error && data) {
                const localTable = (localDb as any)[t.local];
                for (const item of data) {
                    // On mappe les données si nécessaire (ici on assume que localDb attend les données brutes de Supabase mappées ensuite par hybridApi)
                    // Note: Il faudra s'assurer que les données distantes sont compatibles avec le schéma local
                    await localTable.put({
                        ...this.mapFromRemote(t.remote, item),
                        _synced: true,
                        _lastModified: Date.now()
                    });
                }
            }
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

    private mapFromRemote(table: string, data: any): any {
        // Si besoin de mapping spécifique entre Supabase (snake_case) et Typescript (camelCase)
        // Mais comme localDb utilise les types exportés qui sont camelCase, 
        // il faut s'assurer du mapping correct via mappers.ts
        return data; // Simplifié pour l'instant, hybridApi gérera le mapping via mappers.ts
    }
}

export const syncManager = new SyncManager();

