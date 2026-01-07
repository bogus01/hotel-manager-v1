
import { syncManager } from './syncManager';
import { localDb } from './localDb';

// Re-export syncManager methods wrapped for easier use in components
export const forceResyncWithReload = async () => {
    try {
        await syncManager.forceResync();
        return true;
    } catch (error) {
        console.error("Resync failed:", error);
        throw error;
    }
};
