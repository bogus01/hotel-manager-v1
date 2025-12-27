
import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, User, Trash2, Save, AlertTriangle, Coins, Users, Briefcase, Calendar, Printer, 
  ClipboardList, Undo2, BookmarkCheck, ChevronRight, Wallet, Edit3, ChevronLeft,
  CalendarDays, Moon, ShoppingBag, ArrowLeftRight, Check, Split, Loader2, Link, Search,
  PlusCircle, LayoutDashboard, Receipt, ArrowRight, BedDouble, CheckCircle2, RefreshCw,
  Building2, Info, AlertCircle, History, Landmark, FileText, CheckCircle, FileSpreadsheet,
  Utensils, LogOut
} from 'lucide-react';
import { 
  format, 
  differenceInDays, 
  addDays, 
  isBefore, 
  isSameDay, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isWithinInterval,
  isToday,
  addMonths,
  subMonths
} from 'date-fns';
import fr from 'date-fns/locale/fr';
import { Room, Reservation, ReservationStatus, ServiceItem, Payment, Client, ServiceCatalogItem, BoardType, BoardConfiguration } from '../types';
import * as api from '../services/api';
import InvoicePreview from './InvoicePreview';
import ClientModal from './ClientModal';
import ReceiptPreview from './ReceiptPreview';

interface ReservationModalProps {
  reservation: Reservation | null;
  allReservations: Reservation[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedRes: Reservation | null) => Promise<boolean>;
  rooms: Room[];
}

const DateCalendarBox = ({ date, label, colorClass = "bg-indigo-600" }: { date: Date, label: string, colorClass?: string }) => (
    <div className="flex flex-col items-center gap-2">
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</span>
        <div className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden shadow-sm w-24 transition-transform hover:scale-105">
            <div className={`${colorClass} text-white text-[9px] font-black py-1.5 uppercase text-center tracking-widest`}>
                {format(date, 'MMMM', { locale: fr })}
            </div>
            <div className="py-3 text-center">
                <div className="text-3xl font-[1000] text-slate-800 leading-none tabular-nums">{format(date, 'dd')}</div>
                <div className="text-[9px] font-black text-slate-400 mt-1 uppercase tracking-widest">{format(date, 'yyyy')}</div>
            </div>
        </div>
    </div>
);

const ReservationModal: React.FC<ReservationModalProps> = ({ reservation, allReservations, isOpen, onClose, onSave, rooms }) => {
  const [activeResId, setActiveResId] = useState<string>('');
  const [formData, setFormData] = useState<Reservation | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<ServiceCatalogItem[]>([]);
  const [boardPrices, setBoardPrices] = useState<BoardConfiguration | null>(null);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>('');
  const [newService, setNewService] = useState({ name: '', price: 0, quantity: 1 });
  const [newPayment, setNewPayment] = useState({ amount: 0, method: 'CB', isGlobal: false });
  
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceMode, setInvoiceMode] = useState<'single' | 'group'>('single');
  const [showReceipt, setShowReceipt] = useState<Payment | Payment[] | null>(null);
  
  const [clientInfo, setClientInfo] = useState<Client | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isChangingRoom, setIsChangingRoom] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectingType, setSelectingType] = useState<'checkIn' | 'checkOut'>('checkIn');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [tempSelectedRoomIds, setTempSelectedRoomIds] = useState<string[]>([]);
  const [isLinkingGroup, setIsLinkingGroup] = useState(false);
  const [groupSearch, setGroupSearch] = useState('');
  const [groupResults, setGroupResults] = useState<Client[]>([]);
  const [addRoomTypeFilter, setAddRoomTypeFilter] = useState('all');

  const [isConfirmingDetach, setIsConfirmingDetach] = useState(false);
  const [isConfirmingDeleteService, setIsConfirmingDeleteService] = useState<string | null>(null);
  const [isConfirmingDeletePayment, setIsConfirmingDeletePayment] = useState<string | null>(null);
  const [isConfirmingDeleteRes, setIsConfirmingDeleteRes] = useState(false);
  const [isConfirmingDeleteGroup, setIsConfirmingDeleteGroup] = useState(false);
  
  const [showCheckInOptions, setShowCheckInOptions] = useState(false);
  const [showCheckOutOptions, setShowCheckOutOptions] = useState(false);
  const [showCheckOutConfirmation, setShowCheckOutConfirmation] = useState(false);
  const [checkOutType, setCheckOutType] = useState<'single' | 'group'>('single');
  const [transferToDebtor, setTransferToDebtor] = useState(false);
  const [showInvoiceOptions, setShowInvoiceOptions] = useState(false);

  const today = new Date();
  today.setHours(0,0,0,0);

  useEffect(() => {
    if (reservation && isOpen) {
      setActiveResId(reservation.id);
    }
  }, [reservation, isOpen]);

  const groupRes = useMemo(() => {
    if (!reservation) return [];
    const clientId = clientInfo?.id || reservation.clientId;
    return allReservations.filter(r => r.clientId === clientId && r.status !== ReservationStatus.CANCELLED);
  }, [reservation, allReservations, clientInfo]);

  const isGroup = groupRes.length > 1;

  // Réinitialisation des états critiques lors du changement de vue
  useEffect(() => {
    // Toujours réinitialiser les confirmations lors d'un changement de chambre ou de vue Master
    setIsConfirmingDeleteRes(false);
    setIsConfirmingDeleteGroup(false);
    setIsConfirmingDetach(false);
    setIsChangingRoom(false);
    setIsLinkingGroup(false);
    setIsConfirmingDeleteService(null);
    setIsConfirmingDeletePayment(null);
    setShowCheckInOptions(false);
    setShowInvoiceOptions(false);
    setErrorMessage(null);

    if (activeResId === 'GROUP_MASTER') {
        setFormData(null);
        return;
    }

    const res = allReservations.find(r => r.id === activeResId);
    if (res) {
      setFormData({ ...res });
      api.fetchClients().then(clients => setClientInfo(clients.find(cl => cl.id === res.clientId) || null));
      api.fetchServiceCatalog().then(setCatalog);
      api.fetchBoardConfig().then(setBoardPrices);
      setCalendarMonth(new Date(res.checkIn));
    }
  }, [activeResId, allReservations]);

  const groupFinancials = useMemo(() => {
    const totalTTC = groupRes.reduce((acc, r) => acc + r.totalPrice, 0);
    const totalPaid = groupRes.reduce((acc, r) => {
        const resPaid = r.payments.reduce((pAcc, p) => pAcc + p.amount, 0) + (r.depositAmount || 0);
        return acc + resPaid;
    }, 0);
    
    const paymentsHistory = groupRes.flatMap(res => {
        const roomNum = rooms.find(rm => rm.id === res.roomId)?.number || '??';
        const pays = res.payments.map(p => ({ ...p, roomNum, resId: res.id }));
        if (res.depositAmount > 0) {
            pays.push({ id: `dep-${res.id}`, amount: res.depositAmount, date: res.checkIn, method: 'Acompte', roomNum, resId: res.id } as any);
        }
        return pays;
    }).sort((a, b) => b.date.getTime() - a.date.getTime());

    return { totalTTC, totalPaid, balance: totalTTC - totalPaid, paymentsHistory };
  }, [groupRes, rooms]);

  const availableRoomsForNew = useMemo(() => {
    const resSource = formData || reservation;
    if (!resSource) return [];
    return rooms.filter(r => {
        const collision = allReservations.find(res => 
            res.roomId === r.id && 
            res.status !== ReservationStatus.CANCELLED && 
            resSource.checkIn < res.checkOut && 
            resSource.checkOut > res.checkIn
        );
        return !collision;
    });
  }, [rooms, allReservations, formData, reservation]);

  useEffect(() => {
    if (groupSearch.length > 1) {
        api.fetchClients().then(clients => {
            setGroupResults(clients.filter(c => 
                (c.id !== clientInfo?.id) &&
                (c.company || `${c.firstName} ${c.lastName}`).toLowerCase().includes(groupSearch.toLowerCase())
            ));
        });
    } else {
        setGroupResults([]);
    }
  }, [groupSearch, clientInfo]);

  const isArrivalToday = useMemo(() => {
    if (!formData) return false;
    return isToday(formData.checkIn);
  }, [formData?.checkIn]);

  // Détermine si le check-in est autorisé (Aujourd'hui ou date passée)
  const canCheckInNow = useMemo(() => {
    if (!formData) return false;
    return isToday(formData.checkIn) || isBefore(formData.checkIn, today);
  }, [formData?.checkIn, today]);

  const nights = formData ? Math.max(1, differenceInDays(formData.checkOut, formData.checkIn)) : 0;
  
  const currentBoardDailyPrice = useMemo(() => {
    if (!formData || !boardPrices || formData.boardType === BoardType.RO) return 0;
    return boardPrices[formData.boardType as keyof BoardConfiguration] || 0;
  }, [formData?.boardType, boardPrices]);

  const currentResPaid = formData ? (formData.payments.reduce((acc, p) => acc + p.amount, 0) + (formData.depositAmount || 0)) : 0;
  const currentResBalance = formData ? (formData.totalPrice - currentResPaid) : 0;
  const roomInfo = formData ? rooms.find(r => r.id === formData.roomId) : null;
  const isReadOnly = formData ? (formData.status === ReservationStatus.CHECKED_OUT || formData.status === ReservationStatus.CANCELLED) : false;

  const panelClass = "border border-slate-100 rounded-xl bg-white shadow-sm flex flex-col relative mb-4";
  const panelHeaderClass = "bg-slate-50 border-b border-slate-100 px-5 py-3 flex items-center gap-3 rounded-t-xl";
  const panelTitleClass = "text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] flex items-center gap-2";
  const labelClass = "text-[8px] font-bold text-slate-400 uppercase mb-1.5 block tracking-widest";
  const inputClass = "w-full border border-slate-300 rounded px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all disabled:opacity-50";

  const startDate = formData?.checkIn || new Date();
  const endDate = formData?.checkOut || new Date();

  // --- COLLISION CHECKER ---
  const checkCollision = (updatedRes: Reservation): boolean => {
    return allReservations.some(r => 
        r.id !== updatedRes.id && 
        r.roomId === updatedRes.roomId && 
        r.status !== ReservationStatus.CANCELLED && 
        updatedRes.checkIn < r.checkOut && 
        updatedRes.checkOut > r.checkIn
    );
  };

  const handleAutoSave = async (updatedRes: Reservation) => {
      setErrorMessage(null);
      
      const original = allReservations.find(r => r.id === updatedRes.id);
      if (original) {
          const dateOrRoomChanged = 
            original.checkIn.getTime() !== updatedRes.checkIn.getTime() || 
            original.checkOut.getTime() !== updatedRes.checkOut.getTime() ||
            original.roomId !== updatedRes.roomId;

          if (dateOrRoomChanged && checkCollision(updatedRes)) {
            setErrorMessage("Collision détectée : cette chambre est occupée sur les nouvelles dates.");
            setFormData({ ...original });
            return;
          }
      }

      setFormData(updatedRes);
      await api.updateReservation(updatedRes);
      await onSave(updatedRes);
  };

  const handleBoardChange = (newBoard: BoardType) => {
    if (!formData || !boardPrices) return;
    const oldBoardPrice = boardPrices[formData.boardType as keyof BoardConfiguration] || 0;
    const newBoardPrice = boardPrices[newBoard as keyof BoardConfiguration] || 0;
    const diffPerPaxPerNight = newBoardPrice - oldBoardPrice;
    const totalAdjustment = diffPerPaxPerNight * formData.adults * nights;
    const updated = {
        ...formData,
        boardType: newBoard,
        totalPrice: formData.totalPrice + totalAdjustment
    };
    handleAutoSave(updated);
  };

  const handleMassCheckIn = async (applyToAll: boolean) => {
      setIsProcessing(true);
      try {
          if (applyToAll) {
              const updates = groupRes.map(r => ({ ...r, status: ReservationStatus.CHECKED_IN }));
              await api.updateMultipleReservations(updates);
              if (formData) setFormData({ ...formData, status: ReservationStatus.CHECKED_IN });
              await onSave(updates[0]);
          } else if (formData) {
              const updated = { ...formData, status: ReservationStatus.CHECKED_IN };
              await handleAutoSave(updated);
          }
          setShowCheckInOptions(false);
      } catch (e) {
          setErrorMessage("Erreur lors de l'enregistrement de l'arrivée.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleMassCheckOut = async (applyToAll: boolean) => {
    setCheckOutType(applyToAll ? 'group' : 'single');
    setTransferToDebtor(false);
    setShowCheckOutOptions(false);
    setShowCheckOutConfirmation(true);
  };

  const handleCheckOutConfirm = async () => {
    setIsProcessing(true);
    try {
      const balanceToTransfer = checkOutType === 'group' ? groupFinancials.balance : currentResBalance;
      
      if (checkOutType === 'group') {
        const updates = groupRes.map(r => ({ ...r, status: ReservationStatus.CHECKED_OUT }));
        await api.updateMultipleReservations(updates);
        if (transferToDebtor && clientInfo && balanceToTransfer > 0.05) {
          await api.addToClientBalance(clientInfo.id, balanceToTransfer);
        }
        if (formData) setFormData({ ...formData, status: ReservationStatus.CHECKED_OUT });
        await onSave(updates[0]);
      } else if (formData) {
        const updated = { ...formData, status: ReservationStatus.CHECKED_OUT };
        await api.updateReservation(updated); // We use api directly because handleAutoSave might be confused with status change
        if (transferToDebtor && clientInfo && balanceToTransfer > 0.05) {
          await api.addToClientBalance(clientInfo.id, balanceToTransfer);
        }
        setFormData(updated);
        await onSave(updated);
      }
      setShowCheckOutConfirmation(false);
    } catch (e) {
      setErrorMessage("Erreur lors de l'enregistrement du départ.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeletePayment = async (resId: string, paymentId: string) => {
      setIsProcessing(true);
      try {
          await api.deletePayment(paymentId);
          await onSave(null); 
          setIsConfirmingDeletePayment(null);
      } catch (e) {
          setErrorMessage("Erreur lors de la suppression du règlement.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleAddPayment = async () => {
    if (newPayment.amount <= 0 || !formData) return;
    setIsProcessing(true);
    try {
        const pay: Payment = { 
            id: `pay-${Date.now()}`, 
            amount: newPayment.amount, 
            date: new Date(), 
            method: newPayment.method 
        };
        await api.addPaymentToReservation(formData.id, pay);
        await onSave(formData);
        setNewPayment({ ...newPayment, amount: 0 });
    } catch (e) {
        setErrorMessage("Erreur lors de l'ajout du règlement.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleAddService = async () => {
    if (!newService.name || !formData) return;
    setIsProcessing(true);
    try {
        const item: ServiceItem = { 
            id: `svc-${Date.now()}`, 
            ...newService 
        };
        await api.addServiceToReservation(formData.id, item);
        await onSave(formData);
        setNewService({ name: '', price: 0, quantity: 1 });
        setSelectedCatalogId('');
    } catch (e) {
        setErrorMessage("Erreur lors de l'ajout de la prestation.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!formData) return;
    setIsProcessing(true);
    try {
        await api.deleteService(serviceId, formData.id);
        await onSave(formData);
        setIsConfirmingDeleteService(null);
    } catch (e) {
        setErrorMessage("Erreur lors de la suppression de la prestation.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleApplyDatesToGroup = async () => {
      if (!formData) return;
      setIsProcessing(true);
      setErrorMessage(null);
      const otherRooms = groupRes.filter(r => r.id !== formData.id);
      const updates: Reservation[] = [formData];
      let conflict = null;
      for (const res of otherRooms) {
          const collision = allReservations.find(r => r.id !== res.id && r.roomId === res.roomId && r.status !== ReservationStatus.CANCELLED && formData.checkIn < r.checkOut && formData.checkOut > r.checkIn && !groupRes.some(gr => gr.id === r.id));
          if (collision) {
              const rNum = rooms.find(rm => rm.id === res.roomId)?.number || res.roomId;
              conflict = `Collision pour la chambre ${rNum} : déjà occupée par ${collision.clientName}.`;
              break;
          }
          updates.push({ ...res, checkIn: formData.checkIn, checkOut: formData.checkOut });
      }
      if (conflict) { setErrorMessage(conflict); setIsProcessing(false); return; }
      try {
          await api.updateMultipleReservations(updates);
          await onSave(formData);
          setActiveResId('GROUP_MASTER');
      } catch (e) { setErrorMessage("Erreur lors de la mise à jour groupée."); } finally { setIsProcessing(false); }
  };

  const handleOpenInvoice = (mode: 'single' | 'group') => {
      setInvoiceMode(mode);
      setShowInvoiceOptions(false);
      setShowInvoice(true);
  };

  const handleDeleteRes = async () => {
      if (!formData) return;
      setIsProcessing(true);
      try {
          await api.deleteReservation(formData.id);
          onClose();
          await onSave(null); 
      } catch (e) {
          setErrorMessage("Erreur lors de la suppression.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleDeleteGroup = async () => {
      setIsProcessing(true);
      try {
          const idsToDelete = groupRes.map(r => r.id);
          for (const id of idsToDelete) {
            await api.deleteReservation(id);
          }
          onClose();
          await onSave(null); 
      } catch (e) {
          setErrorMessage("Erreur lors de la suppression du groupe.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleSaveIndividual = async () => {
    if (!formData) return;
    if (checkCollision(formData)) {
        setErrorMessage("Action bloquée : collision de dates détectée.");
        return;
    }
    setIsProcessing(true);
    setErrorMessage(null); // Reset error
    try {
        await api.updateReservation(formData);
        await onSave(formData);
        onClose();
    } catch (e) {
        console.error("Save error:", e);
        setErrorMessage("Erreur de connexion ou de base de données locale.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleFinalizeAddRooms = async () => {
      const resSource = formData || reservation;
      if (!resSource || tempSelectedRoomIds.length === 0) return;
      setIsProcessing(true);
      try {
          const newReservations: Omit<Reservation, 'id'>[] = tempSelectedRoomIds.map(roomId => {
              const room = rooms.find(r => r.id === roomId)!;
              return {
                  roomId, clientId: resSource.clientId, clientName: resSource.clientName, occupantName: `${resSource.clientName} (Ch. ${room.number})`,
                  checkIn: resSource.checkIn, checkOut: resSource.checkOut, status: resSource.status, adults: room.capacity, children: 0,
                  baseRate: room.baseRate, totalPrice: room.baseRate * differenceInDays(resSource.checkOut, resSource.checkIn),
                  services: [], payments: [], depositAmount: 0, color: resSource.color, boardType: resSource.boardType || BoardType.RO
              };
          });
          await api.createMultipleReservations(newReservations);
          if (formData) await onSave({ ...formData });
          else if (reservation) await onSave({ ...reservation });
          setTempSelectedRoomIds([]);
          setIsAddingRoom(false);
      } catch (e) { setErrorMessage("Échec de l'ajout groupé."); } finally { setIsProcessing(false); }
  };

  const handleLinkToGroup = async (targetClient: Client) => {
      if (!formData) return;
      setIsProcessing(true);
      try {
          const targetGroupRes = allReservations.find(r => r.clientId === targetClient.id);
          const updated: Reservation = { ...formData, clientId: targetClient.id, clientName: targetClient.company || `${targetClient.firstName} ${targetClient.lastName}`, color: targetGroupRes?.color };
          await onSave(updated);
          setIsLinkingGroup(false);
      } catch (e) { setErrorMessage("Échec de la liaison au groupe."); } finally { setIsProcessing(false); }
  };

  const handleDetachFromGroup = async (e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!formData) return;
    setIsProcessing(true);
    try {
        let clientDataToClone;
        if (clientInfo) {
            const { id, balance, ...rest } = clientInfo;
            clientDataToClone = { ...rest, lastName: clientInfo.lastName + " (Indiv.)", balance: 0 };
        } else {
            clientDataToClone = { firstName: "", lastName: formData.clientName + " (Indiv.)", email: "", phone: "", balance: 0, isAccountHolder: false };
        }
        const newClient = await api.createClient(clientDataToClone);
        const updated: Reservation = { ...formData, clientId: newClient.id, clientName: newClient.company || `${newClient.firstName} ${newClient.lastName}`, color: undefined };
        const success = await onSave(updated);
        if (success) onClose();
        else setErrorMessage("Erreur lors du transfert.");
    } catch (err) { setErrorMessage("Erreur technique."); } finally { setIsProcessing(false); setIsConfirmingDetach(false); }
  };

  const handleGlobalPayment = async () => {
      if (newPayment.amount <= 0 || !isGroup) return;
      setIsProcessing(true);
      try {
          let remainingPayment = newPayment.amount;
          const updates: Reservation[] = [];
          const sortedGroupRes = [...groupRes].sort((a,b) => {
             const paidA = a.payments.reduce((acc, p) => acc + p.amount, 0) + (a.depositAmount || 0);
             const paidB = b.payments.reduce((acc, p) => acc + p.amount, 0) + (b.depositAmount || 0);
             return (b.totalPrice - paidB) - (a.totalPrice - paidA);
          });
          for (const res of sortedGroupRes) {
              if (remainingPayment <= 0.01) break;
              const resPaid = res.payments.reduce((acc, p) => acc + p.amount, 0) + (res.depositAmount || 0);
              const resBalance = res.totalPrice - resPaid;
              if (resBalance > 0.01) {
                  const payAmount = Math.min(remainingPayment, resBalance);
                  const pay: Payment = { id: `pay-global-${Date.now()}-${res.id}`, amount: payAmount, date: new Date(), method: newPayment.method };
                  updates.push({ ...res, payments: [...res.payments, pay] });
                  remainingPayment -= payAmount;
              }
          }
          if (remainingPayment > 0.01 && groupRes.length > 0) {
              const firstRes = updates.find(u => u.id === sortedGroupRes[0].id) || { ...sortedGroupRes[0] };
              const pay: Payment = { id: `pay-global-extra-${Date.now()}`, amount: remainingPayment, date: new Date(), method: newPayment.method };
              firstRes.payments.push(pay);
              if (!updates.some(u => u.id === firstRes.id)) updates.push(firstRes);
          }
          await api.updateMultipleReservations(updates);
          await onSave(groupRes[0]);
          setNewPayment({ ...newPayment, amount: 0 });
      } catch (e) { setErrorMessage("Erreur de répartition."); } finally { setIsProcessing(false); }
  };

  const getHeaderStatusBadge = (status: ReservationStatus) => {
    const styles = {
      [ReservationStatus.CONFIRMED]: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50',
      [ReservationStatus.CHECKED_IN]: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
      [ReservationStatus.CHECKED_OUT]: 'bg-slate-500/20 text-slate-400 border-slate-500/50',
      [ReservationStatus.OPTION]: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
      [ReservationStatus.CANCELLED]: 'bg-red-500/20 text-red-400 border-red-500/50',
    };
    return (
      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border tracking-widest transition-all shadow-lg shadow-black/20 ${styles[status]}`}>
        {status}
      </span>
    );
  };

  if (!isOpen || (!formData && activeResId !== 'GROUP_MASTER')) return null;

  return (
    <>
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`bg-slate-100 rounded-xl shadow-2xl w-full max-w-6xl flex flex-col h-[90vh] overflow-hidden border border-slate-300 animate-in zoom-in-95 duration-200 ${isGroup ? 'max-w-7xl' : 'max-w-5xl'}`}>
        
        <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center shrink-0 border-b border-slate-700">
          <div className="flex items-center gap-4">
             <BookmarkCheck size={20} className="text-indigo-400 fill-current"/>
             <div>
                <h2 className="text-sm font-black uppercase tracking-tight leading-none">
                    {isGroup && activeResId === 'GROUP_MASTER' ? `Dossier de Groupe : ${reservation?.clientName}` : `Fiche Séjour n° ${formData?.id}`}
                </h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">Property Management System • Pilotage Centralisé</p>
             </div>
          </div>
          <div className="flex items-center gap-5">
            {isGroup && (
                <button type="button" onClick={() => setActiveResId(activeResId === 'GROUP_MASTER' ? groupRes[0].id : 'GROUP_MASTER')} 
                    className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-2 border-2 ${activeResId === 'GROUP_MASTER' ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg' : 'bg-slate-700 border-slate-600 text-slate-300 hover:text-white'}`}
                >
                    <LayoutDashboard size={14}/> {activeResId === 'GROUP_MASTER' ? 'Retour Chambre' : 'Vue Master Groupe'}
                </button>
            )}
            {formData && (
                <div className="flex items-center gap-3">
                    <div className="h-6 w-px bg-slate-700 hidden md:block mx-1"></div>
                    {getHeaderStatusBadge(formData.status)}
                </div>
            )}
            <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all text-slate-400 hover:text-white border border-transparent hover:border-white/5" title="Fermer la fiche"><X size={20} /></button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {isGroup && (
                <div className="w-72 bg-slate-50 border-r border-slate-100 flex flex-col shrink-0 overflow-y-auto">
                    <div className="p-4 flex flex-col gap-3 border-b border-slate-100 bg-white/50">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1"><Users size={14}/> Gestion du dossier</span>
                        <button type="button" onClick={() => setActiveResId('GROUP_MASTER')} className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${activeResId === 'GROUP_MASTER' ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg' : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'}`}><LayoutDashboard size={18}/><span className="text-[11px] font-black uppercase tracking-tight">Vue Master Groupe</span></button>
                        <button type="button" onClick={() => { setTempSelectedRoomIds([]); setIsAddingRoom(true); }} className="w-full py-2.5 bg-emerald-50 border-2 border-dashed border-emerald-300 rounded-xl text-emerald-700 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all"><PlusCircle size={16}/> Ajouter des chambres</button>
                    </div>
                    <div className="p-4 space-y-2 flex-1">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-2">Chambres affectées ({groupRes.length})</span>
                        {groupRes.map(res => {
                            const r = rooms.find(rm => rm.id === res.roomId);
                            const isActive = res.id === activeResId;
                            const resPaid = res.payments.reduce((a,p)=>a+p.amount, 0) + (res.depositAmount || 0);
                            const hasDebt = (res.totalPrice - resPaid) > 0.01;
                            return (
                                <button type="button" key={res.id} onClick={() => setActiveResId(res.id)} className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center justify-between group ${isActive ? 'bg-white border-indigo-600 shadow-md' : 'bg-transparent border-transparent hover:bg-slate-100'}`}>
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className={`w-10 h-8 rounded border flex items-center justify-center font-black text-xs shrink-0 ${isActive ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-white text-slate-700 border-slate-200'}`}>{r?.number}</div>
                                        <div className="overflow-hidden">
                                            <div className="text-[10px] font-black uppercase tracking-tight truncate">{res.occupantName || 'Sans nom'}</div>
                                            <div className="flex items-center gap-2"><div className={`w-1.5 h-1.5 rounded-full ${hasDebt ? 'bg-red-400' : 'bg-emerald-400'}`}></div><div className="text-[8px] font-bold text-slate-400 uppercase">{res.status}</div></div>
                                        </div>
                                    </div>
                                    {isActive && <ChevronRight size={14} className="text-indigo-600"/>}
                                </button>
                            );
                        })}
                    </div>
                    <div className="p-4 mt-auto border-t border-slate-100 bg-slate-100/50">
                        <div className="bg-slate-800 text-white p-4 rounded-xl shadow-lg border-b-2 border-indigo-50">
                            <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Total TTC Dossier</span>
                            <span className="text-lg font-[1000] tracking-tighter tabular-nums">{groupFinancials.totalTTC.toFixed(2)} €</span>
                            <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (groupFinancials.totalPaid / groupFinancials.totalTTC) * 100)}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 scrollbar-gutter-stable">
                {activeResId === 'GROUP_MASTER' ? (
                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <section className={panelClass}>
                            <div className={`${panelHeaderClass} justify-between bg-indigo-50 border-indigo-100`}>
                                <div className="flex items-center gap-3"><CalendarDays size={16} className="text-indigo-600" /><span className={`${panelTitleClass} !text-indigo-600`}>Situation Logistique du Groupe</span></div>
                            </div>
                            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center text-center sm:text-left">
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                                    <DateCalendarBox date={reservation!.checkIn} label="Arrivée" colorClass="bg-emerald-600" />
                                    <div className="hidden sm:block pt-6 opacity-20"><ArrowRight className="text-slate-900" size={24}/></div>
                                    <DateCalendarBox date={reservation!.checkOut} label="Départ" colorClass="bg-indigo-600" />
                                </div>
                                <div className="flex justify-center border-l border-slate-100">
                                    <div className="text-center">
                                        <p className={labelClass}>Inventaire Mobilisé</p>
                                        <p className="text-3xl font-black text-indigo-600 tracking-tighter">{groupRes.length} <span className="text-xs uppercase font-bold text-slate-400 tracking-widest ml-1">Chambres</span></p>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 flex items-center justify-center gap-2"><Users size={12} className="text-indigo-300"/> {groupRes.reduce((a,c)=>a+c.adults, 0)} Occupants total</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                            <div className="xl:col-span-8">
                                <section className={panelClass}>
                                    <div className={panelHeaderClass}><ShoppingBag size={14} className="text-indigo-500" /><span className={panelTitleClass}>Folio Consolidé par Unité</span></div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                                                <tr><th className="px-6 py-4">Chambre</th><th className="px-6 py-4">Occupant</th><th className="px-6 py-4 text-right">Total TTC</th><th className="px-6 py-4 text-right">Réglé</th><th className="px-6 py-4 text-right">Solde</th></tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {groupRes.map(res => {
                                                    const r = rooms.find(rm => rm.id === res.roomId);
                                                    const resPaid = res.payments.reduce((a, p) => a + p.amount, 0) + (res.depositAmount || 0);
                                                    const resBalance = res.totalPrice - resPaid;
                                                    return (
                                                        <tr key={res.id} className="hover:bg-slate-50 group cursor-pointer" onClick={() => setActiveResId(res.id)}>
                                                            <td className="px-6 py-5"><div className="font-black text-indigo-600 text-sm leading-none mb-1">CH {r?.number}</div><div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{r?.type}</div></td>
                                                            <td className="px-6 py-5 font-bold text-slate-800 uppercase tracking-tight truncate max-w-[120px]">{res.occupantName}</td>
                                                            <td className="px-6 py-5 text-right font-bold text-slate-900">{res.totalPrice.toFixed(2)} €</td>
                                                            <td className="px-6 py-5 text-right font-bold text-emerald-600">-{resPaid.toFixed(2)} €</td>
                                                            <td className="px-6 py-5 text-right"><span className={`font-black px-2 py-1 rounded-lg ${resBalance > 0.05 ? 'text-red-500 bg-red-50' : 'text-emerald-500 bg-emerald-50'}`}>{resBalance.toFixed(2)} €</span></td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot className="bg-slate-900 text-white font-black">
                                                <tr><td colSpan={2} className="px-6 py-5 uppercase text-[10px] tracking-[0.2em] text-indigo-400">Totaux Dossier</td><td className="px-6 py-5 text-right">{groupFinancials.totalTTC.toFixed(2)} €</td><td className="px-6 py-5 text-right text-emerald-400">-{groupFinancials.totalPaid.toFixed(2)} €</td><td className={`px-6 py-5 text-right ${groupFinancials.balance > 0.05 ? 'text-red-400' : 'text-emerald-400'}`}>{groupFinancials.balance.toFixed(2)} €</td></tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </section>
                            </div>
                            <div className="xl:col-span-4">
                                <section className={panelClass}>
                                    <div className={`${panelHeaderClass} justify-between`}>
                                        <div className="flex items-center gap-3">
                                            <History size={14} className="text-indigo-500" />
                                            <span className={panelTitleClass}>Flux de Caisse Groupe</span>
                                        </div>
                                        {groupFinancials.paymentsHistory.filter(p => p.method !== 'Acompte').length > 0 && (
                                            <button onClick={() => setShowReceipt(groupFinancials.paymentsHistory.filter(p => p.method !== 'Acompte'))} className="text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-1.5 transition-all border border-indigo-100"><FileSpreadsheet size={12}/> Imprimer Journal Groupe</button>
                                        )}
                                    </div>
                                    <div className="p-0 max-h-[400px] overflow-y-auto scrollbar-thin">
                                        {groupFinancials.paymentsHistory.length > 0 ? (
                                            <div className="divide-y divide-slate-100">
                                                {groupFinancials.paymentsHistory.map((p, idx) => (
                                                    <div key={idx} className="p-4 hover:bg-slate-50 flex items-center justify-between group/pay transition-all">
                                                        <div className="flex-1"><div className="flex items-center gap-2"><span className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">{p.method}</span><span className="text-[8px] font-black bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">CH.{p.roomNum}</span></div><div className="text-[9px] font-bold text-slate-400 mt-0.5">{format(new Date(p.date), 'dd/MM HH:mm')}</div></div>
                                                        <div className="flex items-center gap-3"><div className="text-sm font-black text-emerald-600">-{p.amount.toFixed(2)} €</div>{p.method !== 'Acompte' && (
                                                                <div className="w-16 flex justify-end gap-1">{isConfirmingDeletePayment === p.id ? (
                                                                        <div className="flex gap-1 animate-in zoom-in-50"><button type="button" onClick={() => handleDeletePayment((p as any).resId, p.id)} className="bg-red-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black">OK</button><button type="button" onClick={() => setIsConfirmingDeletePayment(null)} className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[8px] font-black">NO</button></div>
                                                                    ) : (<><button type="button" onClick={() => setShowReceipt(p)} className="text-slate-300 hover:text-indigo-600 transition-all p-1.5 hover:bg-indigo-50 rounded-lg"><Printer size={14} /></button><button type="button" onClick={() => setIsConfirmingDeletePayment(p.id)} className="text-slate-300 hover:text-red-500 transition-all p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button></>)}</div>
                                                            )}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (<div className="p-8 text-center text-slate-400 italic text-[10px] uppercase tracking-widest font-bold">Aucun règlement encaissé</div>)}
                                    </div>
                                </section>
                                <section className={`${panelClass} !mb-0 bg-indigo-900 border-indigo-800 text-white shadow-xl`}><div className="p-6"><p className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Landmark size={14}/> Règlement Global Rapide</p><div className="space-y-4"><div><label className="text-[8px] font-black text-indigo-400 uppercase mb-1.5 block">Somme à répartir (€)</label><div className="relative"><input type="number" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-black text-white text-xl outline-none focus:bg-white/20 transition-all placeholder:text-white/20" value={newPayment.amount || ''} onChange={e => setNewPayment({...newPayment, amount: parseFloat(e.target.value) || 0})} placeholder="0.00"/><button type="button" onClick={() => setNewPayment({...newPayment, amount: groupFinancials.balance})} className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black bg-white text-indigo-900 px-2 py-1 rounded hover:bg-indigo-50 shadow-sm transition-all active:scale-95">Tout</button></div></div><div className="grid grid-cols-2 gap-3"><div><label className="text-[8px] font-black text-indigo-400 uppercase mb-1.5 block">Mode</label><select className="w-full bg-white/10 border border-white/20 rounded-xl px-2 py-2 text-xs font-black text-white outline-none" value={newPayment.method} onChange={e => setNewPayment({...newPayment, method: e.target.value})}><option value="CB" className="text-slate-900">CB</option><option value="ESP" className="text-slate-900">ESP</option><option value="VIR" className="text-slate-900">VIR</option></select></div><div className="flex items-end"><button type="button" onClick={handleGlobalPayment} disabled={isProcessing || newPayment.amount <= 0.01} className="w-full h-[36px] bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-30">Encaisser</button></div></div></div></div></section>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <section className={panelClass}>
                            <div className={`${panelHeaderClass} bg-indigo-50 border-indigo-100 justify-between py-2`}>
                                <div className="flex items-center gap-3"><Briefcase size={14} className="text-indigo-600" /><span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Titulaire du dossier</span></div>
                                <div className="flex gap-2">
                                  {!isGroup && <button type="button" disabled={isProcessing} onClick={() => { setTempSelectedRoomIds([]); setIsAddingRoom(true); }} className="px-4 py-1.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-600 shadow-sm hover:bg-emerald-100 transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-widest disabled:opacity-50"><PlusCircle size={12}/> Ajouter une chambre</button>}
                                  {isGroup ? (<div className="flex items-center gap-2">{!isConfirmingDetach ? (<button type="button" disabled={isProcessing} onClick={() => setIsConfirmingDetach(true)} className="px-4 py-1.5 bg-white border border-red-300 rounded-xl text-red-600 shadow-sm hover:bg-red-50 transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-widest disabled:opacity-50"><Split size={12}/> Désolidariser du groupe</button>) : (<div className="flex items-center gap-2 animate-in slide-in-from-right-2"><span className="text-[8px] font-black text-red-500 uppercase tracking-widest">Confirmer ?</span><button type="button" onClick={handleDetachFromGroup} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[9px] font-black uppercase hover:bg-red-700">OUI</button><button type="button" onClick={() => setIsConfirmingDetach(false)} className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-[9px] font-black uppercase hover:bg-slate-300">NON</button></div>)}</div>) : (<button type="button" onClick={() => setIsLinkingGroup(true)} className="px-4 py-1.5 bg-white border border-indigo-300 rounded-xl text-indigo-600 shadow-sm hover:bg-indigo-50 transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-widest"><Link size={12}/> Rattacher à un groupe</button>)}
                                </div>
                            </div>
                            <div className="p-6 min-h-[120px] relative">
                                {isLinkingGroup ? (
                                    <div className="space-y-4 animate-in zoom-in-95 duration-200">
                                        <div className="flex items-center justify-between"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rechercher un dossier cible</span><button type="button" onClick={() => setIsLinkingGroup(false)} className="text-slate-300 hover:text-red-500 transition-colors"><X size={18}/></button></div>
                                        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} /><input autoFocus className={`${inputClass} pl-10 h-11 text-sm bg-slate-50`} placeholder="Taper un nom ou une société..." value={groupSearch} onChange={e => setGroupSearch(e.target.value)}/></div>
                                        {groupResults.length > 0 && (<div className="space-y-1 mt-2">{groupResults.map(client => (<button type="button" key={client.id} onClick={() => handleLinkToGroup(client)} className="w-full text-left p-4 bg-white border-2 border-slate-50 rounded-xl hover:border-indigo-500 transition-all flex items-center justify-between group shadow-sm"><div><div className="font-black text-slate-800 text-xs uppercase tracking-tight">{client.company || `${client.firstName} ${client.lastName}`}</div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">ID: #{client.id}</div></div><div className="p-2 text-slate-200 group-hover:text-indigo-500 transition-colors"><Link size={16}/></div></button>))}</div>)}
                                    </div>
                                ) : (
                                    <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center"><div className="flex items-center gap-4 flex-1"><div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shrink-0"><User size={24}/></div><div><h3 className="font-black text-slate-800 text-base uppercase tracking-tight leading-none">{formData?.clientName}</h3><p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-1.5">ID #{formData?.clientId}</p></div></div><div className="flex flex-col sm:flex-row items-start sm:items-center gap-8 border-l border-slate-100 pl-8 flex-1"><div><span className={labelClass}>Ligne</span><span className="text-xs font-bold text-slate-600">{clientInfo?.phone || '-'}</span></div><div><span className={labelClass}>Email</span><span className="text-xs font-bold text-slate-600">{clientInfo?.email || '-'}</span></div></div><div className="flex gap-2 ml-auto"><button type="button" onClick={() => setIsClientModalOpen(true)} className="px-5 py-2 bg-white border border-slate-200 rounded-xl text-indigo-600 shadow-sm hover:bg-indigo-50 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"><Edit3 size={14}/> Éditer</button></div></div>
                                )}
                            </div>
                        </section>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="space-y-4">
                                <section className={panelClass}>
                                    <div className={panelHeaderClass}><CalendarDays size={16} className="text-indigo-500" /><span className={panelTitleClass}>Logistique de l'unité</span></div>
                                    <div className="p-6 space-y-6 relative min-h-[340px]">
                                        {isChangingRoom && (
                                            <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-[70] p-6 animate-in fade-in zoom-in-95 flex flex-col rounded-b-xl border-t border-indigo-100">
                                                <div className="flex justify-between items-center mb-5"><div className="flex items-center gap-3"><div className="bg-indigo-600 p-1.5 rounded-lg text-white"><ArrowLeftRight size={16}/></div><span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.15em]">Choisir une chambre libre</span></div><button type="button" onClick={() => setIsChangingRoom(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={20}/></button></div>
                                                <div className="grid grid-cols-4 gap-2.5 overflow-y-auto flex-1 pr-2 scrollbar-thin">
                                                    {rooms.filter(r => !allReservations.some(res => res.id !== formData?.id && res.roomId === r.id && res.status !== ReservationStatus.CANCELLED && formData!.checkIn < res.checkOut && formData!.checkOut > res.checkIn)).map(r => (
                                                        <button type="button" key={r.id} onClick={() => { const up = {...formData!, roomId: r.id}; handleAutoSave(up); setIsChangingRoom(false); }} className={`h-14 rounded-xl border-2 font-black transition-all flex flex-col items-center justify-center gap-0.5 ${r.id === formData?.roomId ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-slate-50 border-slate-100 hover:border-indigo-300 hover:bg-white text-slate-700'}`}><span className="text-sm font-black">{r.number}</span><span className="text-[9px] font-bold text-emerald-600">{r.baseRate}€</span></button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                                            <div className="flex items-center gap-4"><div className="w-12 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-lg">{roomInfo?.number}</div><div><p className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">{roomInfo?.type}</p><p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Capacité {roomInfo?.capacity} Pers.</p></div></div>
                                            {!isReadOnly && <button type="button" onClick={() => setIsChangingRoom(true)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-indigo-600 text-[9px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-sm"><ArrowLeftRight size={14} /> Déloger</button>}
                                        </div>
                                        <div><label className={labelClass}>Occupant de cette chambre</label><input className={`${inputClass} h-10 border-indigo-100 focus:border-indigo-500 shadow-inner`} value={formData?.occupantName || ''} onChange={e => { const up = {...formData!, occupantName: e.target.value}; setFormData(up); }} onBlur={() => handleAutoSave(formData!)} placeholder="Saisir nom..." disabled={isReadOnly}/></div>
                                        <div><label className={labelClass}>Régime de Pension</label><div className="relative"><Utensils className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} /><select className={`${inputClass} h-10 pl-10 border-indigo-100 focus:border-indigo-500 shadow-inner`} value={formData?.boardType} onChange={(e) => handleBoardChange(e.target.value as BoardType)} disabled={isReadOnly}>{Object.values(BoardType).map(t => <option key={t} value={t}>{t}</option>)}</select></div></div>
                                        <div className="grid grid-cols-2 gap-6 relative">
                                            <div onClick={() => { if (!isReadOnly) { setSelectingType('checkIn'); setShowCalendar(true); } }} className="cursor-pointer group relative"><label className={`${labelClass} ${selectingType === 'checkIn' && showCalendar ? '!text-emerald-500' : ''}`}>Arrivée</label><div className={`${inputClass} flex items-center justify-between shadow-inner transition-all ${selectingType === 'checkIn' && showCalendar ? 'ring-2 ring-emerald-500 border-transparent bg-emerald-50' : 'group-hover:border-indigo-300'}`}><span className={isArrivalToday ? 'text-indigo-600 font-black' : ''}>{format(startDate, 'dd/MM/yyyy')}</span><Calendar size={14} className={selectingType === 'checkIn' && showCalendar ? 'text-emerald-500' : 'text-slate-300'} /></div></div>
                                            <div onClick={() => { if (!isReadOnly) { setSelectingType('checkOut'); setShowCalendar(true); } }} className="cursor-pointer group relative"><label className={`${labelClass} ${selectingType === 'checkOut' && showCalendar ? '!text-indigo-500' : ''}`}>Départ</label><div className={`${inputClass} flex items-center justify-between shadow-inner transition-all ${selectingType === 'checkOut' && showCalendar ? 'ring-2 ring-indigo-500 border-transparent bg-indigo-50' : 'group-hover:border-indigo-300'}`}><span>{format(endDate, 'dd/MM/yyyy')}</span><Calendar size={14} className={selectingType === 'checkOut' && showCalendar ? 'text-indigo-500' : 'text-slate-300'} /></div></div>
                                            {showCalendar && !isReadOnly && (<div className="absolute top-20 left-0 right-0 z-[500] bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-100 p-5 animate-in fade-in zoom-in-95"><div className="flex justify-between items-center mb-4"><button type="button" onClick={(e) => { e.stopPropagation(); setCalendarMonth(subMonths(calendarMonth, 1)); }} className="p-1 hover:bg-slate-50 rounded-full transition-colors"><ChevronLeft size={16}/></button><span className="text-[10px] font-black uppercase tracking-widest text-slate-800">{format(calendarMonth, 'MMMM yyyy', { locale: fr })}</span><button type="button" onClick={(e) => { e.stopPropagation(); setCalendarMonth(addMonths(calendarMonth, 1)); }} className="p-1 hover:bg-slate-50 rounded-full transition-colors"><ChevronRight size={16}/></button></div><div className="grid grid-cols-7 gap-1 text-center">{['L','M','M','J','V','S','D'].map(d => <div key={d} className="text-[8px] font-black text-slate-300 py-1 uppercase">{d}</div>)}{Array.from({ length: (startOfMonth(calendarMonth).getDay() + 6) % 7 }).map((_, i) => <div key={i} />)}{eachDayOfInterval({ start: startOfMonth(calendarMonth), end: endOfMonth(calendarMonth) }).map(day => { const isArrival = isSameDay(day, startDate); const isDeparture = isSameDay(day, endDate); const inRange = isWithinInterval(day, { start: startDate, end: endDate }); const isPast = isBefore(day, today); let dayClass = "h-8 w-full rounded-lg text-[10px] font-bold transition-all "; if (isPast) dayClass += "text-slate-100 cursor-not-allowed "; else if (isArrival) dayClass += "bg-emerald-500 text-white font-black z-20 shadow-md scale-105 "; else if (isDeparture) dayClass += "bg-indigo-600 text-white font-black z-20 shadow-md scale-105 "; else if (inRange) dayClass += "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 z-10 "; else dayClass += "text-slate-600 hover:bg-slate-50 "; return (<button type="button" key={day.toISOString()} onClick={(e) => { e.stopPropagation(); if (selectingType === 'checkIn') { let newOut = endDate; if (isBefore(newOut, day) || isSameDay(newOut, day)) newOut = addDays(day, 1); const up = {...formData!, checkIn: day, checkOut: newOut}; handleAutoSave(up); setSelectingType('checkOut'); } else { if (isBefore(day, startDate)) return; const up = {...formData!, checkOut: day}; handleAutoSave(up); setShowCalendar(false); } }} disabled={isPast} className={dayClass}>{format(day, 'd')}</button>); })}</div></div>)}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4"><div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-xl flex items-center justify-between"><div className="flex flex-col"><span className="text-[7px] font-black text-indigo-400 uppercase tracking-widest">Séjour</span><div className="flex items-center gap-1"><Moon size={10} className="text-indigo-400" /><span className="font-black text-indigo-700 text-xs tabular-nums">{nights} nuits</span></div></div><div className="flex items-center gap-2"><button type="button" onClick={() => { if(!isReadOnly) { const up = {...formData!, checkOut: addDays(formData!.checkOut, -1)}; if(differenceInDays(up.checkOut, up.checkIn) >= 1) handleAutoSave(up); }}} className="text-indigo-300 hover:text-indigo-600 font-black p-1">-</button><button type="button" onClick={() => { if(!isReadOnly) handleAutoSave({...formData!, checkOut: addDays(formData!.checkOut, 1)})}} className="text-indigo-300 hover:text-indigo-600 font-black p-1">+</button></div></div><div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center justify-between"><div className="flex flex-col"><span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Occupants</span><div className="flex items-center gap-1"><Users size={10} className="text-slate-400" /><span className="font-black text-slate-700 text-xs tabular-nums">{formData?.adults} PAX</span></div></div><div className="flex items-center gap-2">
                                          <button type="button" onClick={() => { if(!isReadOnly) handleAutoSave({...formData!, adults: Math.max(1, formData!.adults - 1)})}} className="text-slate-400 hover:text-indigo-600 font-black p-1">-</button>
                                          <button type="button" onClick={() => { if(!isReadOnly && formData!.adults < (roomInfo?.capacity || 99)) handleAutoSave({...formData!, adults: formData!.adults + 1})}} className={`font-black p-1 transition-colors ${formData!.adults >= (roomInfo?.capacity || 99) ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600'}`} title={formData!.adults >= (roomInfo?.capacity || 99) ? "Capacité maximale atteinte" : ""}>+</button>
                                        </div></div></div>
                                        {formData!.adults > (roomInfo?.capacity || 99) && <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg flex items-center gap-2 animate-pulse"><AlertTriangle size={14} className="text-amber-500" /><span className="text-[8px] font-black text-amber-700 uppercase">Attention : Capacité chambre dépassée</span></div>}
                                        {isGroup && <button type="button" onClick={handleApplyDatesToGroup} disabled={isProcessing} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all shadow-lg active:scale-95"><RefreshCw size={14} className={isProcessing ? "animate-spin" : ""}/> Aligner dates du groupe</button>}
                                    </div>
                                </section>
                                <section className={panelClass}><div className={panelHeaderClass}><ClipboardList size={14} className="text-indigo-500" /><span className={panelTitleClass}>Exploitation</span></div><div className="p-5"><textarea className={`${inputClass} h-24 resize-none bg-slate-50 shadow-inner`} placeholder="Notes VIP..." value={formData?.notes || ''} onChange={e => setFormData({...formData!, notes: e.target.value})} onBlur={() => handleAutoSave(formData!)} disabled={isReadOnly}/></div></section>
                            </div>
                            <div className="space-y-4">
                                <section className={`${panelClass} flex-1`}>
                                    <div className={panelHeaderClass}><ShoppingBag size={14} className="text-indigo-500" /><span className={panelTitleClass}>Prestations & Extras</span></div>
                                    <div className="p-0 flex-1 flex flex-col">
                                        <div className="flex-1 overflow-y-auto max-h-[280px] scrollbar-thin">
                                            <table className="w-full text-left border-separate border-spacing-0">
                                                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                                    <tr>
                                                        <th className="px-4 py-2 font-black text-[8px] uppercase text-slate-400 tracking-widest">Désignation</th>
                                                        <th className="px-2 py-2 text-center w-12 font-black text-[8px] uppercase text-slate-400 tracking-widest">P.U..</th>
                                                        <th className="px-2 py-2 text-center w-10 font-black text-[8px] uppercase text-slate-400 tracking-widest">Qté</th>
                                                        <th className="px-4 py-2 text-right w-24 font-black text-[8px] uppercase text-slate-400 tracking-widest">Total</th>
                                                        {!isReadOnly && <th className="w-8"></th>}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    <tr className="bg-indigo-50/30">
                                                        <td className="px-4 py-3">
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-[11px] font-black text-indigo-700 uppercase tracking-tight">Hébergement Ch. {roomInfo?.number} ({roomInfo?.type})</span>
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{nights} nuits x {formData?.baseRate.toFixed(2)}€</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-3 text-center text-[10px] font-black text-slate-500">{formData?.baseRate.toFixed(2)}€</td>
                                                        <td className="px-2 py-3 text-center font-black text-xs text-slate-600">{nights}</td>
                                                        <td className="px-4 py-3 text-right font-black text-xs text-slate-900">{(formData!.baseRate * nights).toFixed(2)}€</td>
                                                        {!isReadOnly && <td className="px-2"></td>}
                                                    </tr>
                                                    {formData?.boardType !== BoardType.RO && (
                                                        <tr className="bg-emerald-50/20">
                                                            <td className="px-4 py-3">
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="text-[11px] font-black text-emerald-700 uppercase tracking-tight">Régime: {formData?.boardType}</span>
                                                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{nights} nuits x {formData?.adults} PAX x {currentBoardDailyPrice.toFixed(2)}€</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-2 py-3 text-center text-[10px] font-black text-slate-500">{currentBoardDailyPrice.toFixed(2)}€</td>
                                                            <td className="px-2 py-3 text-center font-black text-xs text-slate-600">{nights * (formData?.adults || 1)}</td>
                                                            <td className="px-4 py-3 text-right font-black text-xs text-slate-900">{(currentBoardDailyPrice * nights * (formData?.adults || 1)).toFixed(2)}€</td>
                                                            {!isReadOnly && <td className="px-2"></td>}
                                                        </tr>
                                                    )}
                                                    {formData?.services.map(svc => (
                                                        <tr key={svc.id} className="hover:bg-slate-50 group transition-colors">
                                                            <td className="px-4 py-2.5 text-[11px] font-bold text-slate-700 uppercase">{svc.name}</td>
                                                            <td className="px-2 py-2.5 text-center text-[10px] font-bold text-slate-500">{svc.price.toFixed(2)}€</td>
                                                            <td className="px-2 py-2.5 text-center text-xs font-black text-slate-600">{svc.quantity}</td>
                                                            <td className="px-4 py-2.5 text-right font-black text-xs text-slate-700">{(svc.price * svc.quantity).toFixed(2)}€</td>
                                                            {!isReadOnly && (
                                                                <td className="px-2 text-right">
                                                                    {isConfirmingDeleteService === svc.id ? (
                                                                        <div className="flex gap-1 animate-in zoom-in-50">
                                                                            <button onClick={() => handleDeleteService(svc.id)} className="bg-red-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black">OK</button>
                                                                            <button onClick={() => setIsConfirmingDeleteService(null)} className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[8px] font-black">NO</button>
                                                                        </div>
                                                                    ) : (
                                                                        <button type="button" onClick={() => setIsConfirmingDeleteService(svc.id)} className="text-slate-500 hover:text-red-500 transition-all p-1.5 hover:bg-red-50 rounded-lg opacity-100"><Trash2 size={16} /></button>
                                                                    )}
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {!isReadOnly && (
                                            <div className="p-5 bg-white border-t border-slate-100 space-y-4">
                                                <div className="grid grid-cols-12 gap-3 items-end">
                                                    <div className="col-span-6">
                                                        <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] font-bold text-slate-700 outline-none" value={selectedCatalogId} onChange={e => { setSelectedCatalogId(e.target.value); const item = catalog.find(c => c.id === e.target.value); if(item) setNewService({name: item.name, price: item.defaultPrice, quantity: 1}); }}>
                                                            <option value="">+ Ajouter prestation...</option>
                                                            {catalog.map(c => <option key={c.id} value={c.id}>{c.name} ({c.defaultPrice}€)</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="col-span-3">
                                                        <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 text-center font-black text-xs" value={newService.quantity} onChange={e => setNewService({...newService, quantity: parseInt(e.target.value) || 1})}/>
                                                    </div>
                                                    <div className="col-span-3">
                                                        <button type="button" onClick={handleAddService} disabled={!newService.name || isProcessing} className="w-full h-10 bg-indigo-600 text-white rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-indigo-700 transition-all shadow-md disabled:opacity-30">
                                                            {isProcessing ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Ajouter'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                <section className={panelClass}>
                                    <div className={`${panelHeaderClass} justify-between`}>
                                        <div className="flex items-center gap-3"><Coins size={14} className="text-indigo-500" /><span className={panelTitleClass}>PAIEMENTS CH {roomInfo?.number}</span></div>
                                        {formData?.payments.length && formData.payments.length > 0 ? (<button onClick={() => setShowReceipt(formData.payments)} className="text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-1.5 transition-all border border-indigo-100"><Printer size={12}/> IMPRIMER RELEVÉ</button>) : null}
                                    </div>
                                    <div className="p-5">
                                        <div className="space-y-2 mb-4 max-h-32 overflow-y-auto">
                                            {formData?.payments.map(p => (
                                                <div key={p.id} className="flex justify-between items-center bg-emerald-50 border border-emerald-100 rounded-lg p-2 transition-all group/p">
                                                    <span className="text-[9px] font-black text-emerald-700 uppercase">{p.method} • {format(new Date(p.date), 'dd/MM')}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-black text-emerald-600 text-xs">-{p.amount.toFixed(2)} €</span>
                                                        <div className="flex gap-0.5">
                                                            <button type="button" onClick={() => setShowReceipt(p)} className="text-slate-300 hover:text-indigo-600 transition-all p-1 hover:bg-white rounded"><Printer size={12}/></button>
                                                            {isConfirmingDeletePayment === p.id ? (
                                                                <div className="flex gap-1 animate-in zoom-in-50">
                                                                    <button type="button" onClick={() => handleDeletePayment(formData!.id, p.id)} className="bg-red-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black">OK</button>
                                                                    <button type="button" onClick={() => setIsConfirmingDeletePayment(null)} className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[8px] font-black">NO</button>
                                                                </div>
                                                            ) : (
                                                                <button type="button" onClick={() => setIsConfirmingDeletePayment(p.id)} className="text-slate-300 hover:text-red-500 transition-all p-1 hover:bg-white rounded"><Trash2 size={12}/></button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {formData!.depositAmount > 0 && <div className="flex justify-between items-center bg-blue-50 border border-blue-100 rounded-lg p-2"><span className="text-[9px] font-black text-blue-700 uppercase italic">Acompte initial</span><span className="font-black text-blue-600 text-xs">-{formData!.depositAmount.toFixed(2)} €</span></div>}
                                        </div>
                                        {!isReadOnly && (
                                            <div className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-inner">
                                                <input 
                                                    type="number" 
                                                    className="flex-1 h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-800 outline-none focus:border-indigo-500 transition-all" 
                                                    placeholder="Montant..." 
                                                    value={newPayment.amount || ''} 
                                                    onChange={e => setNewPayment({...newPayment, amount: parseFloat(e.target.value) || 0})} 
                                                />
                                                <select className="w-24 h-10 px-2 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-700 outline-none" value={newPayment.method} onChange={e => setNewPayment({...newPayment, method: e.target.value})}>
                                                    <option value="CB">CB</option>
                                                    <option value="ESP">ESP</option>
                                                    <option value="VIR">VIR</option>
                                                </select>
                                                <button 
                                                    type="button" 
                                                    onClick={handleAddPayment} 
                                                    disabled={newPayment.amount <= 0 || isProcessing}
                                                    className="bg-emerald-600 text-white px-4 py-2 h-10 rounded-lg font-black uppercase text-[9px] tracking-widest hover:bg-emerald-700 transition-all active:scale-95 shadow-sm disabled:opacity-50"
                                                >
                                                    {isProcessing ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Valider'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-2xl relative overflow-hidden"><div className="absolute top-0 right-0 p-4 opacity-5"><Wallet size={80}/></div><div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3"><span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">RÉSUMÉ FINANCIER CHAMBRE</span></div><div className="space-y-3"><div className="flex justify-between items-center text-sm"><span className="font-bold text-slate-400">Total Chambre</span><span className="font-black text-lg">{formData!.totalPrice.toFixed(2)} €</span></div><div className="flex justify-between items-center text-sm"><span className="font-bold text-slate-400">Total Encaissé</span><span className="font-bold text-emerald-400">{currentResPaid.toFixed(2)} €</span></div><div className="h-px bg-white/10 my-2"></div><div className="flex justify-between items-center"><span className="font-black text-[10px] text-indigo-300 uppercase">Solde Chambre</span><span className={`text-3xl font-[1000] tabular-nums tracking-tighter ${currentResBalance > 0.05 ? 'text-red-500' : 'text-emerald-500'}`}>{Math.max(0, currentResBalance).toFixed(2)} €</span></div></div></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {errorMessage && (<div className="absolute top-20 left-1/2 -translate-x-1/2 z-[300] bg-red-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce"><AlertCircle size={20}/><span className="text-xs font-black uppercase tracking-widest">{errorMessage}</span><button type="button" onClick={() => setErrorMessage(null)} className="ml-4 hover:bg-white/20 p-1 rounded"><X size={16}/></button></div>)}

        <div className="bg-white border-t border-slate-100 px-6 py-5 flex justify-between items-center shrink-0 rounded-b-xl shadow-inner relative">
            <div className="flex gap-4 items-center">
                <button type="button" onClick={onClose} className="px-8 py-3 bg-white border border-slate-300 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-3 active:scale-95 shadow-sm"><Undo2 size={18}/> Quitter</button>
                <div className="h-8 w-px bg-slate-200 mx-2"></div>
                {isConfirmingDeleteRes ? (
                    <div className="flex items-center gap-2 animate-in slide-in-from-left-2">
                        <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Confirmer ?</span>
                        <button type="button" onClick={handleDeleteRes} className="bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-red-700">OUI</button>
                        <button type="button" onClick={() => setIsConfirmingDeleteRes(false)} className="bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-slate-300">NON</button>
                    </div>
                ) : (
                    !isReadOnly && activeResId !== 'GROUP_MASTER' && <button type="button" onClick={() => setIsConfirmingDeleteRes(true)} className="px-4 py-3 bg-white border border-red-100 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all flex items-center gap-3 active:scale-95 shadow-sm"><Trash2 size={18}/> {formData?.status === ReservationStatus.CHECKED_IN ? 'Annuler Séjour' : 'Annuler Réservation'}</button>
                )}
            </div>
            <div className="flex gap-4">
                {/* ACTIONS SPÉCIFIQUES GROUPE */}
                {activeResId === 'GROUP_MASTER' && (
                    <>
                        {isConfirmingDeleteGroup ? (
                            <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                                <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Confirmer suppression totale ?</span>
                                <button type="button" onClick={handleDeleteGroup} className="bg-red-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-red-700">OUI, TOUT SUPPRIMER</button>
                                <button type="button" onClick={() => setIsConfirmingDeleteGroup(false)} className="bg-slate-200 text-slate-600 px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-slate-300">NON</button>
                            </div>
                        ) : (
                            <button type="button" onClick={isConfirmingDeleteGroup ? () => {} : () => setIsConfirmingDeleteGroup(true)} className="px-6 py-3 bg-white border-2 border-red-100 text-red-400 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-50 transition-all flex items-center gap-3 shadow-sm">
                                <Trash2 size={18}/> Annuler Dossier Complet
                            </button>
                        )}
                        <button type="button" onClick={() => handleOpenInvoice('group')} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 shadow-xl flex items-center gap-3 active:scale-95">
                            <Printer size={18}/> Facturation Groupe
                        </button>
                    </>
                )}

                {/* ACTIONS INDIVIDUELLES */}
                {activeResId !== 'GROUP_MASTER' && formData && formData.status === ReservationStatus.OPTION && !isReadOnly && (
                    <button type="button" onClick={() => { const up = {...formData!, status: ReservationStatus.CONFIRMED}; handleAutoSave(up); }} className="px-10 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100 flex items-center gap-2 border-2 border-indigo-500"><BookmarkCheck size={18}/> Confirmer Réservation</button>
                )}
                {activeResId !== 'GROUP_MASTER' && formData && !isReadOnly && (
                    <div className="relative">
                        <button type="button" onClick={() => setShowInvoiceOptions(!showInvoiceOptions)} className="px-8 py-3 bg-white border-2 border-emerald-500 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 hover:text-white transition-all active:scale-95 shadow-sm flex items-center gap-2"><Printer size={18}/> Facturer</button>
                        {showInvoiceOptions && isGroup && (
                            <div className="absolute bottom-full mb-2 right-0 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[60] animate-in slide-in-from-bottom-2">
                                <button onClick={() => handleOpenInvoice('group')} className="w-full text-left p-4 hover:bg-indigo-50 rounded-xl flex items-center gap-3 transition-colors group">
                                    <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors"><Building2 size={18}/></div>
                                    <div><p className="text-[10px] font-black uppercase text-slate-800">Facture Groupe</p><p className="text-[9px] font-bold text-slate-400">Folio consolidé complet</p></div>
                                </button>
                                <button onClick={() => handleOpenInvoice('single')} className="w-full text-left p-4 hover:bg-slate-50 rounded-xl flex items-center gap-3 transition-colors group border-t border-slate-50">
                                    <div className="bg-slate-100 p-2 rounded-lg text-slate-600 group-hover:bg-slate-600 group-hover:text-white transition-colors"><BedDouble size={18}/></div>
                                    <div><p className="text-[10px] font-black uppercase text-slate-800">Facture Chambre</p><p className="text-[9px] font-bold text-slate-400">Folio individuel Ch.{roomInfo?.number}</p></div>
                                </button>
                            </div>
                        )}
                        {showInvoiceOptions && !isGroup && handleOpenInvoice('single')}
                    </div>
                )}
                
                {/* Condition mise à jour : Le bouton de Check-in n'apparaît que si on est au jour J ou plus tard */}
                {activeResId !== 'GROUP_MASTER' && formData && formData.status === ReservationStatus.CONFIRMED && !isReadOnly && canCheckInNow && (
                    <div className="relative">
                        <button type="button" onClick={() => isGroup ? setShowCheckInOptions(!showCheckInOptions) : handleMassCheckIn(false)} className="px-10 py-3 bg-white border-2 border-emerald-500 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 hover:text-white transition-all active:scale-95 shadow-sm">Enregistrer Arrivée</button>
                        {showCheckInOptions && isGroup && (
                            <div className="absolute bottom-full mb-2 right-0 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[60] animate-in slide-in-from-bottom-2">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest p-3 border-b mb-1">Options de Check-In</p>
                                <button onClick={() => handleMassCheckIn(true)} className="w-full text-left p-4 hover:bg-emerald-50 rounded-xl flex items-center gap-3 transition-colors group">
                                    <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors"><Users size={18}/></div>
                                    <div><p className="text-[10px] font-black uppercase text-slate-800">Tout le Groupe</p><p className="text-[9px] font-bold text-slate-400">Check-in de {groupRes.length} chambres</p></div>
                                </button>
                                <button onClick={() => handleMassCheckIn(false)} className="w-full text-left p-4 hover:bg-slate-50 rounded-xl flex items-center gap-3 transition-colors group border-t border-slate-50">
                                    <div className="bg-slate-100 p-2 rounded-lg text-slate-600 group-hover:bg-slate-600 group-hover:text-white transition-colors"><CheckCircle size={18}/></div>
                                    <div><p className="text-[10px] font-black uppercase text-slate-800">Chambre {roomInfo?.number}</p><p className="text-[9px] font-bold text-slate-400">Uniquement cette unité</p></div>
                                </button>
                            </div>
                        )}
                    </div>
                )}
                
                {/* BOUTON CHECK-OUT */}
                {activeResId !== 'GROUP_MASTER' && formData && formData.status === ReservationStatus.CHECKED_IN && !isReadOnly && (
                    <div className="relative">
                        <button type="button" onClick={() => isGroup ? setShowCheckOutOptions(!showCheckOutOptions) : handleMassCheckOut(false)} className="px-10 py-3 bg-white border-2 border-slate-500 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 hover:text-white transition-all active:scale-95 shadow-sm flex items-center gap-2"><LogOut size={16} /> Enregistrer Départ</button>
                        {showCheckOutOptions && isGroup && (
                            <div className="absolute bottom-full mb-2 right-0 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[60] animate-in slide-in-from-bottom-2">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest p-3 border-b mb-1">Options de Check-Out</p>
                                <button onClick={() => handleMassCheckOut(true)} className="w-full text-left p-4 hover:bg-slate-50 rounded-xl flex items-center gap-3 transition-colors group">
                                    <div className="bg-slate-100 p-2 rounded-lg text-slate-600 group-hover:bg-slate-600 group-hover:text-white transition-colors"><Users size={18}/></div>
                                    <div><p className="text-[10px] font-black uppercase text-slate-800">Tout le Groupe</p><p className="text-[9px] font-bold text-slate-400">Départ de {groupRes.length} chambres</p></div>
                                </button>
                                <button onClick={() => handleMassCheckOut(false)} className="w-full text-left p-4 hover:bg-slate-50 rounded-xl flex items-center gap-3 transition-colors group border-t border-slate-50">
                                    <div className="bg-slate-100 p-2 rounded-lg text-slate-600 group-hover:bg-slate-600 group-hover:text-white transition-colors"><CheckCircle size={18}/></div>
                                    <div><p className="text-[10px] font-black uppercase text-slate-800">Chambre {roomInfo?.number}</p><p className="text-[9px] font-bold text-slate-400">Uniquement cette unité</p></div>
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeResId !== 'GROUP_MASTER' && formData && !isReadOnly && (<button type="button" onClick={handleSaveIndividual} disabled={isProcessing} className="px-12 py-3 bg-indigo-600 text-white rounded-xl text-[11px] font-black uppercase tracking-[0.2em] shadow-[0_15px_30px_rgba(79,70,229,0.3)] hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50">{isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Save size={20}/>}Sauvegarder</button>)}
            </div>
        </div>

        {isAddingRoom && (
            <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-8">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[80vh] overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
                    <div className="p-6 border-b bg-slate-50 flex justify-between items-center shrink-0"><div><h3 className="font-black text-slate-800 uppercase tracking-tight text-xl">Agrandir le dossier</h3><p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Du <span className="text-indigo-600">{reservation && format(reservation.checkIn, 'dd/MM')}</span> au <span className="text-indigo-600">{reservation && format(reservation.checkOut, 'dd/MM')}</span></p></div><button type="button" onClick={() => { setTempSelectedRoomIds([]); setIsAddingRoom(false); }} className="p-2 hover:bg-white rounded-full transition-all text-slate-400"><X size={20}/></button></div>
                    <div className="w-full bg-white border-b flex-none px-6 py-4 flex items-center gap-2 overflow-x-auto no-scrollbar"><button type="button" onClick={() => setAddRoomTypeFilter('all')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${addRoomTypeFilter === 'all' ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>Toutes</button>{Array.from(new Set(rooms.map(r=>r.type))).map(type => (<button type="button" key={type} onClick={() => setAddRoomTypeFilter(type)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${addRoomTypeFilter === type ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>{type}</button>))}</div>
                    <div className="flex-1 overflow-y-auto p-6 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 bg-slate-50/50">{availableRoomsForNew.filter(r => addRoomTypeFilter === 'all' || r.type === addRoomTypeFilter).map(room => { const isSelected = tempSelectedRoomIds.includes(room.id); return (<button type="button" key={room.id} onClick={() => setTempSelectedRoomIds(prev => isSelected ? prev.filter(id => id !== room.id) : [...prev, room.id])} className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 group relative ${isSelected ? 'bg-indigo-600 border-indigo-700 text-white shadow-xl scale-105 z-10' : 'bg-white border-slate-100 text-slate-700 hover:border-indigo-300'}`}><span className={`text-base font-black tracking-tight ${isSelected ? 'text-white' : 'text-slate-800'}`}>#{room.number}</span><span className={`text-[7px] font-black uppercase tracking-widest ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>{room.type.slice(0, 10)}</span><span className={`text-[8px] font-black ${isSelected ? 'text-indigo-100' : 'text-emerald-600'}`}>{room.baseRate}€</span>{isSelected && <div className="absolute -top-1 -right-1 bg-white text-indigo-600 rounded-full p-0.5 border-2 border-indigo-600"><Check size={10} strokeWidth={4}/></div>}</button>); })}{availableRoomsForNew.length === 0 && (<div className="col-span-full py-16 text-center flex flex-col items-center gap-4"><AlertCircle size={40} className="text-slate-200" /><p className="font-black text-slate-300 uppercase text-[10px] tracking-widest">Aucune disponibilité</p></div>)}</div>
                    <div className="p-6 border-t border-slate-100 bg-white flex justify-between items-center shrink-0"><div className="flex items-center gap-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sélection :</span><span className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">{tempSelectedRoomIds.length} chambres</span></div><div className="flex gap-3"><button type="button" onClick={() => { setTempSelectedRoomIds([]); setIsAddingRoom(false); }} className="px-6 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest">Annuler</button><button type="button" disabled={tempSelectedRoomIds.length === 0 || isProcessing} onClick={handleFinalizeAddRooms} className="px-10 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2">{isProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={16}/>}Confirmer l'ajout au groupe</button></div></div>
                </div>
            </div>
        )}
      </div>
    </div>
    {showInvoice && <InvoicePreview reservation={formData || reservation!} allReservations={allReservations} rooms={rooms} client={clientInfo} onClose={() => setShowInvoice(false)} initialIncludeGroup={invoiceMode === 'group'} />}
    {showReceipt && <ReceiptPreview payments={showReceipt} reservation={formData || reservation!} rooms={rooms} onClose={() => setShowReceipt(null)} />}
    {isClientModalOpen && <ClientModal client={clientInfo} isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} onSave={async (updatedClient) => { await api.updateClient(updatedClient); setClientInfo(updatedClient); setIsClientModalOpen(false); }} />}
    
    {showCheckOutConfirmation && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
                <div className="bg-slate-50 px-6 py-4 border-b flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-800 p-2 rounded-xl text-white">
                            <LogOut size={20} />
                        </div>
                        <h3 className="font-black text-slate-800 uppercase tracking-tight">Confirmation de Départ</h3>
                    </div>
                    <button onClick={() => setShowCheckOutConfirmation(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-8">
                    <div className="text-center mb-8">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Solde restant à régler</p>
                        <div className={`text-4xl font-[1000] tabular-nums tracking-tighter ${(checkOutType === 'group' ? groupFinancials.balance : currentResBalance) > 0.05 ? 'text-red-500' : 'text-emerald-500'}`}>
                            {(checkOutType === 'group' ? groupFinancials.balance : currentResBalance).toFixed(2)} €
                        </div>
                    </div>

                    {(checkOutType === 'group' ? groupFinancials.balance : currentResBalance) > 0.05 ? (
                        <div className="space-y-6">
                            {clientInfo?.isAccountHolder ? (
                                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="bg-indigo-600 p-1.5 rounded-lg text-white mt-1">
                                            <Landmark size={14} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-indigo-900 uppercase tracking-tight">Client autorisé en compte</p>
                                            <p className="text-[10px] text-indigo-700 mt-1 leading-relaxed">Voulez-vous transférer le solde impayé sur le compte débiteur du client ?</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center gap-3">
                                        <label className="flex-1 flex items-center gap-2 cursor-pointer group">
                                            <div className="relative">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only" 
                                                    checked={transferToDebtor}
                                                    onChange={(e) => setTransferToDebtor(e.target.checked)}
                                                />
                                                <div className={`w-10 h-5 rounded-full transition-colors ${transferToDebtor ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
                                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${transferToDebtor ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                            </div>
                                            <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Transférer au débit</span>
                                        </label>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="bg-amber-500 p-1.5 rounded-lg text-white mt-1">
                                            <AlertTriangle size={14} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-amber-900 uppercase tracking-tight">Attention : Solde Impayé</p>
                                            <p className="text-[10px] text-amber-700 mt-1 leading-relaxed">Le client n'est pas autorisé en compte. La facture restera marquée comme impayée dans le système.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
                            <div className="bg-emerald-500 w-12 h-12 rounded-full flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-emerald-100">
                                <Check size={24} strokeWidth={4} />
                            </div>
                            <p className="text-[11px] font-black text-emerald-900 uppercase tracking-tight">Dossier en règle</p>
                            <p className="text-[10px] text-emerald-700 mt-1 leading-relaxed">Tous les règlements ont été perçus. Le départ peut être validé sans action supplémentaire.</p>
                        </div>
                    )}
                </div>

                <div className="bg-slate-50 px-8 py-6 border-t flex flex-col gap-3">
                    <button 
                        onClick={handleCheckOutConfirm}
                        disabled={isProcessing}
                        className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-slate-900 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                        {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={3} />}
                        Valider le Départ
                    </button>
                    <button 
                        onClick={() => setShowCheckOutConfirmation(false)}
                        className="w-full py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition-colors"
                    >
                        Annuler
                    </button>
                </div>
            </div>
        </div>
    )}
    </>
  );
};

export default ReservationModal;
