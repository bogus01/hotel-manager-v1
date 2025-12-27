
import { localDb } from './localDb';
import { supabase } from './supabase';
import { Reservation } from '../types';

class ConflictResolver {
    private onConflictFound: ((conflictData: any) => void) | null = null;

    public setConflictListener(callback: (conflictData: any) => void) {
        this.onConflictFound = callback;
    }

    public async handleReservationConflict(reservation: Reservation) {
        // 1. Récupérer la réservation existante qui bloque sur Supabase
        const { data: existingRes, error } = await supabase
            .from('reservations')
            .select('*')
            .eq('room_id', reservation.roomId)
            .not('status', 'eq', 'Annulée')
            .or(`check_in.lte.${reservation.checkOut.toISOString()},check_out.gte.${reservation.checkIn.toISOString()}`);

        if (error) {
            console.error('Error fetching conflicting reservation:', error);
            return;
        }

        // 2. Trouver des chambres alternatives disponibles pour ces dates
        const { data: rooms } = await supabase.from('rooms').select('*');
        // Logique simplifiée pour trouver des chambres dispos
        const availableRooms = rooms || []; 

        if (this.onConflictFound) {
            this.onConflictFound({
                pending: reservation,
                existing: existingRes?.[0],
                alternatives: availableRooms
            });
        }
    }
}

export const conflictResolver = new ConflictResolver();

