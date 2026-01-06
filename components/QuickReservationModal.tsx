
import React, { useState, useEffect, useMemo } from 'react';
import {
  X, User, Calendar, Plus, Trash2, Hotel,
  Check, Building, AlertTriangle, Utensils, Info,
  Layers, MapPin, Mail, Phone, Tag, ChevronDown, Users,
  ArrowRight, CheckCircle2, Clock, Coins, Palette, CreditCard, Coffee, Bookmark, Search, PlusCircle,
  ChevronRight, FileText, ShoppingCart, Calculator, ArrowUpDown, CalendarDays,
  UserPlus, UserSearch, Hash, MousePointer2, Receipt, BedDouble, Moon, Undo2, ChevronLeft, Building2,
  BookmarkCheck, Save, ClipboardList, Briefcase, LogIn, AlertCircle
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
import { fr } from 'date-fns/locale/fr';
import { Room, Client, ReservationSource, BoardType, ReservationStatus, Reservation, BoardConfiguration } from '../types';
import * as api from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import InvoicePreview from './InvoicePreview';

interface QuickReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (createdRes?: Reservation, openDetail?: boolean) => void;
  rooms: Room[];
  existingReservations: Reservation[];
  initialData: {
    roomId: string;
    checkIn: Date;
    checkOut: Date;
    status: ReservationStatus;
  };
}

const PRESET_COLORS = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Sky', value: '#0ea5e9' },
  { name: 'Slate', value: '#64748b' },
];

const QuickReservationModal: React.FC<QuickReservationModalProps> = ({ isOpen, onClose, onSuccess, rooms, existingReservations, initialData }) => {
  const { formatPrice, currencySettings } = useCurrency();
  const [error, setError] = useState<string | null>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [startDate, setStartDate] = useState<Date>(initialData.checkIn);
  const [endDate, setEndDate] = useState<Date>(initialData.checkOut);
  const [selectingType, setSelectingType] = useState<'checkIn' | 'checkOut'>('checkIn');
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date(initialData.checkIn));

  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>(initialData.roomId ? [initialData.roomId] : []);
  const [totalPax, setTotalPax] = useState<number>(1);
  const [customColor, setCustomColor] = useState<string>(PRESET_COLORS[0].value);
  const [isAvailabilityPickerOpen, setIsAvailabilityPickerOpen] = useState(false);
  const [roomFilterType, setRoomFilterType] = useState<string>('all');

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [clientResults, setClientResults] = useState<Client[]>([]);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClient, setNewClient] = useState({
    firstName: '', lastName: '', email: '', phone: '', company: '', isCompany: false, address: ''
  });

  const [boardType, setBoardType] = useState<BoardType>(BoardType.RO);
  const [boardPrices, setBoardPrices] = useState<BoardConfiguration | null>(null);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('CB');
  const [notes, setNotes] = useState('');

  // Pour l'aperçu proforma immédiat
  const [showProformaPreview, setShowProformaPreview] = useState<Reservation | null>(null);
  const [newlyCreatedGroup, setNewlyCreatedGroup] = useState<Reservation[]>([]);
  const [availableTaxes, setAvailableTaxes] = useState<Tax[]>([]);

  const nights = useMemo(() => Math.max(1, differenceInDays(endDate, startDate)), [startDate, endDate]);
  const isArrivalToday = useMemo(() => isToday(startDate), [startDate]);

  useEffect(() => {
    if (isOpen) {
      api.fetchBoardConfig().then(setBoardPrices);
      api.fetchTaxes().then(setAvailableTaxes);
      setStartDate(initialData.checkIn);
      setEndDate(initialData.checkOut);
      setSelectedRoomIds(initialData.roomId ? [initialData.roomId] : []);
      setCalendarMonth(new Date(initialData.checkIn));
      setSelectingType('checkIn');
      setError(null);
      setShowProformaPreview(null);
      setNewlyCreatedGroup([]);
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (clientSearch.length > 1) {
      api.fetchClients().then(all => setClientResults(all.filter(c =>
        `${c.firstName} ${c.lastName} ${c.company}`.toLowerCase().includes(clientSearch.toLowerCase())
      )));
    } else setClientResults([]);
  }, [clientSearch]);

  const roomCategories = useMemo(() => Array.from(new Set(rooms.map(r => r.type))).sort(), [rooms]);

  const conflictingRoomIds = useMemo(() => {
    return selectedRoomIds.filter(roomId => {
      return existingReservations.some(res =>
        res.roomId === roomId &&
        res.status !== ReservationStatus.CANCELLED &&
        startDate < res.checkOut &&
        endDate > res.checkIn
      );
    });
  }, [selectedRoomIds, existingReservations, startDate, endDate]);

  const hasCollision = conflictingRoomIds.length > 0;

  const availableRooms = useMemo(() => {
    return rooms.filter(r => {
      const isFree = !existingReservations.some(res =>
        res.roomId === r.id && res.status !== ReservationStatus.CANCELLED &&
        startDate < res.checkOut && endDate > res.checkIn
      );
      return isFree && (roomFilterType === 'all' || r.type === roomFilterType);
    });
  }, [rooms, existingReservations, startDate, endDate, roomFilterType]);

  const maxAllowedPax = useMemo(() => {
    return selectedRoomIds.reduce((acc, id) => {
      const r = rooms.find(rm => rm.id === id);
      return acc + (r?.capacity || 0);
    }, 0);
  }, [selectedRoomIds, rooms]);

  const handleDateClick = (day: Date) => {
    if (isBefore(day, today)) return;
    setError(null);

    if (selectingType === 'checkIn') {
      let newEnd = endDate;
      if (isBefore(newEnd, day) || isSameDay(newEnd, day)) {
        newEnd = addDays(day, 1);
      }
      setStartDate(day);
      setEndDate(newEnd);
      setSelectingType('checkOut');
    } else {
      if (isBefore(day, startDate) || isSameDay(day, startDate)) {
        setError("Le départ doit être après l'arrivée.");
        return;
      }
      setEndDate(day);
      setShowCalendar(false);
    }
  };

  const handleNightsChange = (delta: number) => {
    const newNights = Math.max(1, nights + delta);
    setEndDate(addDays(startDate, newNights));
    setError(null);
  };

  const roomCalculations = useMemo(() => {
    const boardP = (boardPrices && boardType !== BoardType.RO) ? (boardPrices[boardType as keyof BoardConfiguration] || 0) : 0;
    let remainingPax = totalPax;

    // Taxes fixes (ex: Taxe de séjour)
    const activeFixedTaxes = availableTaxes.filter(t => t.isActive && t.isFixed && (t.applyTo === 'accommodation' || t.applyTo === 'all'));
    const fixedTaxPerNightPerPax = activeFixedTaxes.reduce((sum, t) => sum + t.rate, 0);

    return selectedRoomIds.map(id => {
      const room = rooms.find(r => r.id === id);
      if (!room) return null;
      const roomPax = Math.min(remainingPax, room.capacity);
      remainingPax = Math.max(0, remainingPax - roomPax);
      const nightlyPrice = room.baseRate + (boardP * roomPax);
      const totalFixedTaxes = fixedTaxPerNightPerPax * roomPax * nights;

      return {
        id,
        number: room.number,
        type: room.type,
        nightlyPrice: nightlyPrice,
        totalStay: (nightlyPrice * nights) + totalFixedTaxes,
        boardComponent: (boardP * roomPax) * nights,
        roomComponent: room.baseRate * nights,
        fixedTaxesComponent: totalFixedTaxes,
        paxAllocated: roomPax,
        baseNightlyPrice: room.baseRate
      };
    }).filter(Boolean);
  }, [selectedRoomIds, rooms, nights, boardType, boardPrices, totalPax, availableTaxes]);

  const totalStayPrice = useMemo(() => roomCalculations.reduce((acc, curr) => acc + (curr?.totalStay || 0), 0), [roomCalculations]);

  const handleSubmit = async (status: ReservationStatus, mode: 'normal' | 'proforma' = 'normal') => {
    setError(null);

    try {
      if (hasCollision) {
        setError("Impossible de valider : certaines chambres sélectionnées ne sont plus disponibles pour ces dates.");
        return;
      }

      let finalClient = selectedClient;
      if (isCreatingClient) {
        if (newClient.isCompany && !newClient.company) { setError("Société requise."); return; }
        if (!newClient.isCompany && !newClient.lastName) { setError("Nom requis."); return; }
        finalClient = await api.createClient({ ...newClient, civility: 'M.', balance: 0, isAccountHolder: false });
      }

      if (!finalClient) { setError("Client obligatoire."); return; }
      if (selectedRoomIds.length === 0) { setError("Sélectionnez une chambre."); return; }
      if (totalPax > maxAllowedPax) { setError(`Capacité insuffisante (${totalPax} hôtes pour ${maxAllowedPax} places).`); return; }

      const boardP = (boardPrices && boardType !== BoardType.RO) ? (boardPrices[boardType as keyof BoardConfiguration] || 0) : 0;
      let remainingPax = totalPax;

      // Taxes fixes
      const activeFixedTaxes = availableTaxes.filter(t => t.isActive && t.isFixed && (t.applyTo === 'accommodation' || t.applyTo === 'all'));
      const fixedTaxPerNightPerPax = activeFixedTaxes.reduce((sum, t) => sum + t.rate, 0);

      const newResList = selectedRoomIds.map(roomId => {
        const room = rooms.find(r => r.id === roomId)!;
        const roomPax = Math.min(remainingPax, room.capacity);
        remainingPax = Math.max(0, remainingPax - roomPax);

        const baseStay = (room.baseRate + (boardP * roomPax)) * nights;
        const totalTaxesFixes = fixedTaxPerNightPerPax * roomPax * nights;

        return {
          roomId, clientId: finalClient!.id, clientName: finalClient!.company || `${finalClient!.firstName} ${finalClient!.lastName}`, occupantName: finalClient!.company || `${finalClient!.firstName} ${finalClient!.lastName}`,
          checkIn: startDate, checkOut: endDate, status, source: ReservationSource.DIRECT, boardType, adults: roomPax, children: 0,
          baseRate: room.baseRate, totalPrice: baseStay + totalTaxesFixes, services: [],
          payments: depositAmount > 0 ? [{ id: crypto.randomUUID(), amount: depositAmount / selectedRoomIds.length, date: new Date(), method: paymentMethod }] : [],
          depositAmount: depositAmount / selectedRoomIds.length, notes, color: customColor
        };
      });

      const created = await api.createMultipleReservations(newResList);

      if (mode === 'proforma') {
        setNewlyCreatedGroup(created);
        setShowProformaPreview(created[0]);
      } else {
        onSuccess(created[0], false);
        onClose();
      }
    } catch (err) {
      console.error("Erreur lors de la création de la réservation:", err);
      setError("Une erreur technique est survenue lors de la création.");
    }
  };

  if (!isOpen) return null;

  const panelClass = "border border-slate-100 rounded-xl bg-white shadow-sm flex flex-col relative mb-6";
  const panelHeaderClass = "bg-slate-50 border-b border-slate-100 px-5 py-3 flex items-center gap-3 rounded-t-xl";
  const panelTitleClass = "text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] flex items-center gap-2";
  const labelClass = "text-[8px] font-bold text-slate-400 uppercase mb-1.5 block tracking-widest";
  const inputClass = "w-full border border-slate-300 rounded px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all disabled:opacity-50";

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-slate-100 rounded-xl shadow-2xl w-full max-w-6xl flex flex-col h-[90vh] overflow-hidden border border-slate-300 animate-in zoom-in-95 duration-200">

        <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center shrink-0 border-b border-slate-700">
          <div className="flex items-center gap-4">
            <BookmarkCheck size={20} className="text-indigo-400 fill-current" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight leading-none">Assistant Ouverture de Dossier</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">Logiciel de Gestion Hôtelerie PMS Pro</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-gutter-stable">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            <div className="flex flex-col">
              <section className={panelClass}>
                <div className={panelHeaderClass}>
                  <CalendarDays size={16} className="text-indigo-50" />
                  <span className={panelTitleClass}>Logistique Séjour</span>
                </div>
                <div className="p-6 space-y-6 relative">
                  <div className="grid grid-cols-2 gap-6">
                    <div onClick={() => { setSelectingType('checkIn'); setShowCalendar(true); }} className="cursor-pointer group relative">
                      <label className={`${labelClass} ${selectingType === 'checkIn' && showCalendar ? '!text-emerald-500' : ''}`}>Arrivée</label>
                      <div className={`${inputClass} flex items-center justify-between transition-all ${selectingType === 'checkIn' && showCalendar ? 'ring-2 ring-emerald-500 border-transparent bg-emerald-50' : 'group-hover:border-indigo-300'}`}>
                        <span className={isArrivalToday ? 'text-indigo-600 font-black' : ''}>{format(startDate, 'dd/MM/yyyy')}</span>
                        <Calendar size={14} className={selectingType === 'checkIn' && showCalendar ? 'text-emerald-500' : 'text-slate-300'} />
                      </div>
                    </div>
                    <div onClick={() => { setSelectingType('checkOut'); setShowCalendar(true); }} className="cursor-pointer group relative">
                      <label className={`${labelClass} ${selectingType === 'checkOut' && showCalendar ? '!text-indigo-500' : ''}`}>Départ</label>
                      <div className={`${inputClass} flex items-center justify-between transition-all ${selectingType === 'checkOut' && showCalendar ? 'ring-2 ring-indigo-500 border-transparent bg-indigo-50' : 'group-hover:border-indigo-300'}`}>
                        <span>{format(endDate, 'dd/MM/yyyy')}</span>
                        <Calendar size={14} className={selectingType === 'checkOut' && showCalendar ? 'text-indigo-500' : 'text-slate-300'} />
                      </div>
                    </div>
                  </div>

                  {showCalendar && (
                    <div className="absolute top-20 left-6 right-6 z-[500] bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-100 p-5 animate-in fade-in zoom-in-95">
                      <div className="flex justify-between items-center mb-4">
                        <button onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))} className="p-1 hover:bg-slate-50 rounded-full transition-colors"><ChevronLeft size={16} /></button>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-800">{format(calendarMonth, 'MMMM yyyy', { locale: fr })}</span>
                        <button onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} className="p-1 hover:bg-slate-50 rounded-full transition-colors"><ChevronRight size={16} /></button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => <div key={d} className="text-[8px] font-black text-slate-300 py-1 uppercase">{d}</div>)}
                        {Array.from({ length: (startOfMonth(calendarMonth).getDay() + 6) % 7 }).map((_, i) => <div key={i} />)}
                        {eachDayOfInterval({ start: startOfMonth(calendarMonth), end: endOfMonth(calendarMonth) }).map(day => {
                          const isArrival = isSameDay(day, startDate);
                          const isDeparture = isSameDay(day, endDate);
                          const inRange = isWithinInterval(day, { start: startDate, end: endDate });
                          const isPast = isBefore(day, today);
                          let dayClass = "h-8 w-full rounded-lg text-[10px] font-bold transition-all ";
                          if (isPast) dayClass += "text-slate-100 cursor-not-allowed ";
                          else if (isArrival) dayClass += "bg-emerald-500 text-white font-black z-20 shadow-md scale-105 ";
                          else if (isDeparture) dayClass += "bg-indigo-600 text-white font-black z-20 shadow-md scale-105 ";
                          else if (inRange) dayClass += "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 z-10 ";
                          else dayClass += "text-slate-600 hover:bg-slate-50 ";
                          return (<button key={day.toISOString()} onClick={() => handleDateClick(day)} disabled={isPast} className={dayClass}>{format(day, 'd')}</button>);
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-lg flex items-center justify-between">
                      <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">NBR de nuits</label>
                      <div className="flex items-center gap-3">
                        <button onClick={() => handleNightsChange(-1)} className="text-indigo-300 hover:text-indigo-600 font-black">-</button>
                        <span className="font-black text-indigo-700 text-base tabular-nums">{nights}</span>
                        <button onClick={() => handleNightsChange(1)} className="text-indigo-300 hover:text-indigo-600 font-black">+</button>
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center justify-between">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">NBR d'hôtes</label>
                      <div className="flex items-center gap-3">
                        <button onClick={() => setTotalPax(Math.max(1, totalPax - 1))} className="text-slate-400 hover:text-indigo-600 font-black">-</button>
                        <span className={`font-black text-base tabular-nums ${totalPax > maxAllowedPax ? 'text-red-600' : 'text-slate-700'}`}>{totalPax}</span>
                        <button
                          onClick={() => setTotalPax(totalPax + 1)}
                          disabled={totalPax >= maxAllowedPax && selectedRoomIds.length > 0}
                          className={`font-black transition-colors ${totalPax >= maxAllowedPax && selectedRoomIds.length > 0 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600'}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                  {totalPax > maxAllowedPax && selectedRoomIds.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg flex items-center gap-2 animate-pulse">
                      <AlertTriangle size={14} className="text-amber-500" />
                      <span className="text-[8px] font-black text-amber-700 uppercase">Capacité max atteinte ({maxAllowedPax} Pax)</span>
                    </div>
                  )}
                </div>
              </section>

              <section className={panelClass}>
                <div className={panelHeaderClass}>
                  <UserSearch size={16} className="text-indigo-500" />
                  <span className={panelTitleClass}>Identité Client</span>
                </div>
                <div className="p-6 space-y-4">
                  {!isCreatingClient ? (
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                          <input className={`${inputClass} pl-10 h-10`} placeholder="Rechercher nom ou société..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} />
                        </div>
                        <button onClick={() => setIsCreatingClient(true)} className="px-5 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-md"><UserPlus size={16} /> Créer</button>
                      </div>
                      {clientResults.length > 0 && !selectedClient && (
                        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-100 shadow-2xl rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-50">
                          {clientResults.map(c => (
                            <button key={c.id} onClick={() => { setSelectedClient(c); setClientSearch(''); }} className="w-full text-left p-4 hover:bg-indigo-50 transition-all flex justify-between items-center">
                              <div><div className="font-black text-slate-800 text-xs uppercase tracking-tight">{c.company || `${c.firstName} ${c.lastName}`}</div><div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{c.email || 'Pas d\'email'} • {c.phone || 'Pas de tél.'}</div></div>
                              <ChevronRight size={14} className="text-slate-300" />
                            </button>
                          ))}
                        </div>
                      )}
                      {selectedClient && (
                        <div className="bg-indigo-50 border-2 border-indigo-100 p-4 rounded-xl flex justify-between items-center animate-in zoom-in-95">
                          <div className="flex items-center gap-4">
                            <div className="bg-indigo-600 p-2.5 rounded-lg text-white"><User size={18} /></div>
                            <div><span className="font-black text-indigo-900 text-sm uppercase tracking-tight">{selectedClient.company || `${selectedClient.firstName} ${selectedClient.lastName}`}</span><p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5">{selectedClient.email || selectedClient.phone}</p></div>
                          </div>
                          <button onClick={() => setSelectedClient(null)} className="text-indigo-300 hover:text-red-500 p-1.5 hover:bg-white rounded-lg transition-all"><X size={18} /></button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Nouveau Profil Client</span>
                        <button
                          onClick={() => setIsCreatingClient(false)}
                          className="text-[9px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest flex items-center gap-1 transition-colors"
                        >
                          <Search size={12} /> Retour recherche
                        </button>
                      </div>
                      <div className="flex p-1 bg-slate-100 rounded-lg border border-slate-200">
                        <button onClick={() => setNewClient({ ...newClient, isCompany: false })} className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded transition-all ${!newClient.isCompany ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Particulier</button>
                        <button onClick={() => setNewClient({ ...newClient, isCompany: true })} className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded transition-all ${newClient.isCompany ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Société</button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {newClient.isCompany ? (<div className="col-span-2"><label className={labelClass}>Raison Sociale</label><input className={inputClass} value={newClient.company} onChange={e => setNewClient({ ...newClient, company: e.target.value })} /></div>) : (<><div className="col-span-1"><label className={labelClass}>Nom</label><input className={inputClass} value={newClient.lastName} onChange={e => setNewClient({ ...newClient, lastName: e.target.value })} /></div><div className="col-span-1"><label className={labelClass}>Prénom</label><input className={inputClass} value={newClient.firstName} onChange={e => setNewClient({ ...newClient, firstName: e.target.value })} /></div></>)}
                        <div className="col-span-1"><label className={labelClass}>E-mail</label><input className={inputClass} placeholder="exemple@mail.com" value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} /></div>
                        <div className="col-span-1"><label className={labelClass}>Contact (Tél.)</label><input className={inputClass} placeholder="06.." value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} /></div>
                        <div className="col-span-2"><label className={labelClass}>Adresse</label><input className={inputClass} placeholder="Adresse postale..." value={newClient.address} onChange={e => setNewClient({ ...newClient, address: e.target.value })} /></div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="flex flex-col">
              <section className={panelClass}>
                <div className={`${panelHeaderClass} justify-between`}>
                  <div className="flex items-center gap-3">
                    <BedDouble size={16} className="text-indigo-500" />
                    <span className={panelTitleClass}>Hébergement Affecté</span>
                    {selectedRoomIds.length > 0 && (
                      <span className="bg-indigo-100 text-indigo-700 text-[9px] font-black px-2 py-0.5 rounded-full border border-indigo-200">
                        {selectedRoomIds.length}
                      </span>
                    )}
                  </div>

                  {/* SÉLECTEUR DE COULEUR "Bandeau" */}
                  <div className="flex items-center gap-2 mr-2">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c.value}
                        onClick={() => setCustomColor(c.value)}
                        className={`w-4 h-4 rounded-full transition-all border-2 flex items-center justify-center ${customColor === c.value ? 'scale-125 border-slate-700 ring-2 ring-slate-200 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'}`}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      >
                        {customColor === c.value && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                      </button>
                    ))}
                  </div>

                  <button onClick={() => setIsAvailabilityPickerOpen(true)} className="bg-indigo-600 text-white w-7 h-7 rounded-lg flex items-center justify-center hover:bg-indigo-700 transition-all shadow-md"><Plus size={16} strokeWidth={3} /></button>
                </div>
                <div className="p-6 space-y-1 max-h-[135px] overflow-y-auto pr-2 scrollbar-thin">
                  {roomCalculations.map(calc => {
                    const isConflicting = conflictingRoomIds.includes(calc.id);
                    return (
                      <div key={calc.id} className={`flex items-center justify-between p-3 border rounded-lg transition-all group shrink-0 ${isConflicting ? 'bg-red-50 border-red-300' : 'bg-slate-50 border-slate-100 hover:border-indigo-300'}`}>
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-10 h-8 rounded border flex items-center justify-center font-black text-xs shadow-sm transition-colors ${isConflicting ? 'bg-red-600 text-white border-red-500' : 'bg-white text-slate-800 border-slate-300'}`}
                            style={!isConflicting ? { borderLeftWidth: '4px', borderLeftColor: customColor } : {}}
                          >
                            {calc.number}
                          </div>
                          <div>
                            <span className={`text-[10px] font-black uppercase tracking-tight ${isConflicting ? 'text-red-700' : 'text-slate-700'}`}>{calc.type}</span>
                            {isConflicting ? (
                              <div className="flex items-center gap-1.5 text-[8px] font-black text-red-500 uppercase tracking-widest"><AlertTriangle size={10} /> Collision détectée</div>
                            ) : (
                              <div className="flex items-center gap-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest"><Users size={10} /> {calc.paxAllocated} Pers. <span className="text-emerald-600 font-black">{formatPrice(calc.nightlyPrice)}</span></div>
                            )}
                          </div>
                        </div>
                        <button onClick={() => setSelectedRoomIds(selectedRoomIds.filter(x => x !== calc.id))} className={`p-1.5 hover:bg-white rounded-lg transition-all ${isConflicting ? 'text-red-400 hover:text-red-700' : 'text-slate-300 hover:text-red-500'}`}><Trash2 size={16} /></button>
                      </div>
                    );
                  })}
                  {selectedRoomIds.length === 0 && (
                    <div className="py-8 text-center text-slate-300 font-black uppercase tracking-widest text-[10px] italic">Aucune chambre assignée</div>
                  )}
                </div>
              </section>

              <section className={panelClass}>
                <div className={panelHeaderClass}>
                  <Receipt size={16} className="text-indigo-500" />
                  <span className={panelTitleClass}>Chiffrage & Règlement</span>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-4"><label className={labelClass}>Pension</label><select className={inputClass} value={boardType} onChange={e => setBoardType(e.target.value as BoardType)}>{Object.values(BoardType).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                    <div className="col-span-4"><label className={labelClass}>Acompte ({currencySettings?.symbol || '€'})</label><input type="number" className={inputClass} value={depositAmount || ''} onChange={e => setDepositAmount(parseFloat(e.target.value) || 0)} placeholder="0.00" /></div>
                    <div className="col-span-4"><label className={labelClass}>Mode</label><select className={inputClass} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} disabled={depositAmount <= 0}><option value="CB">CB</option><option value="ESP">ESP</option><option value="VIR">VIR</option></select></div>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2 shadow-inner max-h-32 overflow-y-auto">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-2">Folio de création ({nights} nuits)</p>
                    {roomCalculations.map((item, idx) => (
                      <div key={idx} className="space-y-1 border-b border-white last:border-0 pb-2">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <div className="flex flex-col">
                            <span className="text-indigo-600 font-black">CH.{item?.number} ({item?.type})</span>
                            <span className="text-[8px] text-slate-400 uppercase font-bold">{nights} nuits x {formatPrice(item?.baseNightlyPrice || 0)}</span>
                          </div>
                          <span className="text-slate-700 font-black">{formatPrice(item?.totalStay || 0)}</span>
                        </div>
                        {item?.boardComponent! > 0 && (
                          <div className="flex justify-between items-center text-[9px] italic text-slate-500 pl-4">
                            <span>Pension {boardType} ({item?.paxAllocated} PAX)</span>
                            <span>+{formatPrice(item?.boardComponent || 0)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className={`rounded-xl p-6 flex items-center justify-between shadow-2xl border-b-4 transition-all ${hasCollision ? 'bg-red-50 border-red-500 text-red-900' : 'bg-slate-800 text-white border-indigo-500'}`}>
                    <div>
                      <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${hasCollision ? 'text-red-400' : 'text-slate-400'}`}>Total TTC Dossier</p>
                      <p className="text-3xl font-[1000] tracking-tighter tabular-nums">{formatPrice(totalStayPrice)}</p>
                    </div>
                    <div className="text-right">
                      <div className={`flex items-center gap-2 font-black ${hasCollision ? 'text-red-600' : 'text-indigo-400'}`}><Moon size={14} /> {nights} Nuits</div>
                      <div className={`flex items-center gap-2 font-black text-[10px] mt-1 ${totalPax > maxAllowedPax || hasCollision ? 'text-red-600' : 'text-emerald-400'}`}><Users size={14} /> {totalPax} Hôtes</div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>

        {(error || hasCollision) && (
          <div className="mx-6 mb-4 bg-red-50 text-red-600 p-4 rounded-xl text-[10px] font-black uppercase flex items-center gap-4 border border-red-100 animate-pulse">
            <AlertCircle size={18} />
            {hasCollision ? "Chevauchement détecté sur l'hébergement pour les dates sélectionnées" : error}
          </div>
        )}

        <div className="bg-white border-t border-slate-100 px-6 py-5 flex justify-between items-center shrink-0">
          <button onClick={onClose} className="px-8 py-3 bg-white border border-slate-300 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-3 shadow-sm"><Undo2 size={18} /> Annuler</button>
          <div className="flex gap-4">
            <button
              disabled={hasCollision}
              onClick={() => handleSubmit(ReservationStatus.OPTION, 'proforma')}
              className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
            >
              <FileText size={18} /> Facture Proforma
            </button>
            <button
              disabled={hasCollision}
              onClick={() => handleSubmit(ReservationStatus.OPTION, 'normal')}
              className="px-8 py-3 bg-white border-2 border-indigo-200 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Poser une Option
            </button>
            <button
              onClick={() => handleSubmit(ReservationStatus.CONFIRMED, 'normal')}
              disabled={hasCollision || (totalPax > maxAllowedPax && selectedRoomIds.length > 0)}
              className={`px-12 py-3 text-white rounded-xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg transition-all ${hasCollision ? 'bg-red-300 cursor-not-allowed shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}
            >
              {hasCollision ? 'Indisponible' : 'Valider Dossier'}
            </button>
          </div>
        </div>

        {isAvailabilityPickerOpen && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-8">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[85vh] overflow-hidden border border-slate-100 animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                <div><h3 className="font-black text-slate-800 uppercase tracking-tight text-xl">Unités Libres</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Du {format(startDate, 'dd/MM')} au {format(endDate, 'dd/MM')}</p></div>
                <button onClick={() => setIsAvailabilityPickerOpen(false)} className="p-3 hover:bg-white rounded-full transition-all text-slate-400"><X size={28} /></button>
              </div>
              {/* Filter bar for room types */}
              <div className="px-8 py-4 bg-white border-b border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
                <button
                  onClick={() => setRoomFilterType('all')}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${roomFilterType === 'all' ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}
                >
                  Toutes
                </button>
                {roomCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setRoomFilterType(cat)}
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${roomFilterType === cat ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto p-8 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-3 bg-slate-50/50">
                {availableRooms.map(room => {
                  const isSelected = selectedRoomIds.includes(room.id);
                  return (
                    <button key={room.id} onClick={() => setSelectedRoomIds(prev => isSelected ? prev.filter(id => id !== room.id) : [...prev, room.id])} className={`p-3 rounded-xl border-2 transition-all text-center relative flex flex-col items-center justify-center min-h-[100px] ${isSelected ? 'border-indigo-600 bg-indigo-50 shadow-xl scale-[1.05] z-10' : 'border-white bg-white hover:border-indigo-200 shadow-sm'}`}>
                      <span className={`text-lg font-black leading-none ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>#{room.number}</span>
                      <div className="mt-1 text-[8px] font-black text-slate-400 uppercase leading-tight line-clamp-2 w-full">{room.type}</div>
                      <div className="mt-auto pt-2 border-t border-slate-100 w-full flex items-center justify-between"><span className="text-[10px] font-black text-emerald-600">{formatPrice(room.baseRate)}</span><div className="flex items-center gap-1 text-slate-400"><User size={10} /><span className="text-[10px] font-black">{room.capacity}</span></div></div>
                      {isSelected && <div className="absolute top-2 right-2 bg-indigo-600 text-white p-0.5 rounded-full"><Check size={10} strokeWidth={5} /></div>}
                    </button>
                  );
                })}
                {availableRooms.length === 0 && (
                  <div className="col-span-full py-16 text-center">
                    <AlertTriangle className="mx-auto text-slate-300 mb-4" size={40} />
                    <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Aucune unité de ce type disponible</p>
                  </div>
                )}
              </div>
              <div className="p-8 border-t border-slate-100 bg-white flex justify-end"><button onClick={() => setIsAvailabilityPickerOpen(false)} className="bg-indigo-600 text-white px-12 py-4 rounded-xl font-black uppercase text-[11px] shadow-lg hover:bg-indigo-700 transition-all">Valider</button></div>
            </div>
          </div>
        )}

        {showProformaPreview && (
          <InvoicePreview
            reservation={showProformaPreview}
            allReservations={[...existingReservations, ...newlyCreatedGroup]}
            rooms={rooms}
            client={selectedClient || (isCreatingClient ? { ...newClient, id: showProformaPreview.clientId, balance: 0 } : null)}
            onClose={() => { setShowProformaPreview(null); onSuccess(showProformaPreview, false); onClose(); }}
            isProforma={true}
            initialIncludeGroup={true}
          />
        )}
      </div>
    </div>
  );
};

export default QuickReservationModal;
