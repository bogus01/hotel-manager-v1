
import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Search, User, Calendar, Plus, Trash2, Hotel,
  Check, Building, AlertTriangle, Utensils, Info, Filter,
  Layers, MapPin, Mail, Phone, Tag, ChevronDown, Users,
  ArrowRight, ArrowLeft, CheckCircle2, Clock, Sparkles, AlertCircle, Coins, Briefcase,
  RotateCcw, ChevronRight, ChevronLeft, Palette, CreditCard, Coffee, Bookmark, FileText
} from 'lucide-react';
import {
  format,
  differenceInDays,
  addDays,
  isBefore,
  isSameDay,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  isWithinInterval,
  isToday
} from 'date-fns';
import fr from 'date-fns/locale/fr';
import { Room, Client, ReservationSource, BoardType, ReservationStatus, Reservation, BoardConfiguration, CurrencySettings, Tax } from '../types';
import * as api from '../services/api';
import { useCurrency } from '../context/CurrencyContext';

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const subMonths = (date: Date, amount: number) => addMonths(date, -amount);

interface NewReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rooms: Room[];
  existingReservations: Reservation[];
  initialData?: {
    roomId?: string;
    checkIn?: Date;
    checkOut?: Date;
    status?: ReservationStatus;
  } | null;
}

type Step = 'CRITERIA' | 'ROOMS' | 'CLIENT' | 'CONFIRM';

const PRESET_COLORS = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Sky', value: '#0ea5e9' },
  { name: 'Slate', value: '#64748b' },
];

const NewReservationModal: React.FC<NewReservationModalProps> = ({ isOpen, onClose, onSuccess, rooms, existingReservations, initialData }) => {
  const { formatPrice, currencySettings: currency } = useCurrency();
  const [step, setStep] = useState<Step>('CRITERIA');
  const [error, setError] = useState<string | null>(null);
  const today = startOfToday();

  // --- STATE: CRITERIA ---
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(addDays(new Date(), 1));
  const [selectingType, setSelectingType] = useState<'checkIn' | 'checkOut'>('checkIn');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [guests, setGuests] = useState(1);

  // --- STATE: ROOM SELECTION ---
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // --- STATE: CLIENT ---
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isNewClientFormVisible, setIsNewClientFormVisible] = useState(false);
  const [newClientData, setNewClientData] = useState<Omit<Client, 'id' | 'balance'>>({
    civility: 'M.', firstName: '', lastName: '', company: '', email: '', phone: '', address: '', notes: '', isAccountHolder: false
  });
  const [clientHistory, setClientHistory] = useState<Client[]>([]);

  // --- STATE: FINALIZATION ---
  const [currentStatus, setCurrentStatus] = useState<ReservationStatus>(ReservationStatus.CONFIRMED);
  const [source, setSource] = useState<ReservationSource>(ReservationSource.DIRECT);
  const [boardType, setBoardType] = useState<BoardType>(BoardType.RO);
  const [boardPrices, setBoardPrices] = useState<BoardConfiguration | null>(null);
  const [notes, setNotes] = useState('');
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('CB');
  const [customColor, setCustomColor] = useState<string>(PRESET_COLORS[0].value);
  const [availableTaxes, setAvailableTaxes] = useState<Tax[]>([]);

  useEffect(() => {
    if (isOpen) {
      api.fetchClients().then(setClientHistory);
      api.fetchBoardConfig().then(setBoardPrices);
      api.fetchTaxes().then(setAvailableTaxes);

      if (initialData) {
        if (initialData.checkIn) setStartDate(initialData.checkIn);
        if (initialData.checkOut) setEndDate(initialData.checkOut);
        if (initialData.roomId) setSelectedRoomIds([initialData.roomId]);
        if (initialData.status) setCurrentStatus(initialData.status);
        setStep('CLIENT');
      } else {
        setStep('CRITERIA');
        setSelectedRoomIds([]);
        setSelectedCategories([]);
        setSelectedClient(null);
        setIsNewClientFormVisible(false);
        setClientSearch('');
        setStartDate(new Date());
        setEndDate(addDays(new Date(), 1));
        setSelectingType('checkIn');
        setDepositAmount(0);
        setBoardType(BoardType.RO);
      }
      setError(null);
    }
  }, [isOpen, initialData]);

  const nights = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const diff = differenceInDays(endDate, startDate);
    return diff > 0 ? diff : 0;
  }, [startDate, endDate]);

  const isRoomAvailable = (roomId: string) => {
    if (!startDate || !endDate) return false;
    return !existingReservations.some(res =>
      res.roomId === roomId &&
      res.status !== ReservationStatus.CANCELLED &&
      startDate < res.checkOut && endDate > res.checkIn
    );
  };

  const roomCategories = useMemo(() => Array.from(new Set(rooms.map(r => r.type))).sort(), [rooms]);

  const availableRoomsByCategory = useMemo(() => {
    const available = rooms.filter(r => isRoomAvailable(r.id));
    const grouped: Record<string, Room[]> = {};
    available.forEach(r => {
      if (selectedCategories.length > 0 && !selectedCategories.includes(r.type)) return;
      if (!grouped[r.type]) grouped[r.type] = [];
      grouped[r.type].push(r);
    });
    return grouped;
  }, [rooms, existingReservations, startDate, endDate, selectedCategories]);

  const getRoomPrice = (room: Room) => {
    const guestsInThisRoom = Math.min(guests, room.capacity);
    return room.pricingModel === 'flexible' ? (room.occupancyPrices[guestsInThisRoom] || room.baseRate) : room.baseRate;
  };

  const totalPrice = useMemo(() => {
    let total = 0;
    const boardPrice = (boardPrices && boardPrices[boardType as keyof BoardConfiguration]) || 0;
    let remainingGuests = guests;

    // Taxes fixes (ex: Taxe de séjour) applicables à l'hébergement
    const activeFixedTaxes = availableTaxes.filter(t => t.isActive && t.isFixed && (t.applyTo === 'accommodation' || t.applyTo === 'all'));
    const fixedTaxPerNightPerPax = activeFixedTaxes.reduce((sum, t) => sum + t.rate, 0);

    selectedRoomIds.forEach(id => {
      const room = rooms.find(r => r.id === id);
      if (room) {
        const guestsAllocated = Math.min(remainingGuests, room.capacity);
        const nightlyBase = getRoomPrice(room);

        // TTC = (Base + Pension) * Nuits + (Taxes Fixes * PAX * Nuits)
        // Note: La TVA (Pourcentage) est incluse "en-dedans" dans le prix de base paramétré par l'hôtelier
        total += (nightlyBase + (boardPrice * guestsAllocated)) * nights;
        total += (fixedTaxPerNightPerPax * guestsAllocated * nights);

        remainingGuests = Math.max(0, remainingGuests - guestsAllocated);
      }
    });
    return total;
  }, [selectedRoomIds, rooms, guests, nights, boardType, boardPrices, availableTaxes]);

  const handleDateClick = (day: Date) => {
    if (isBefore(day, today)) return;
    setError(null);
    if (selectingType === 'checkIn') {
      let newEnd = endDate;
      if (newEnd && (isBefore(newEnd, day) || isSameDay(newEnd, day))) newEnd = addDays(day, 1);
      setStartDate(day);
      setEndDate(newEnd);
      setSelectingType('checkOut');
    } else {
      if (startDate && (isBefore(day, startDate) || isSameDay(day, startDate))) {
        setError("La date de départ doit être postérieure à l'arrivée.");
        return;
      }
      setEndDate(day);
    }
  };

  const renderCalendar = (baseDate: Date) => {
    const start = startOfMonth(baseDate);
    const end = endOfMonth(baseDate);
    const days = eachDayOfInterval({ start, end });
    const emptyDays = start.getDay() === 0 ? 6 : start.getDay() - 1;
    return (
      <div className="w-full">
        <h4 className="text-center font-black text-slate-800 uppercase tracking-widest text-[10px] mb-4">{format(baseDate, 'MMMM yyyy', { locale: fr })}</h4>
        <div className="grid grid-cols-7 gap-1 text-center">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => <div key={d} className="text-[9px] font-black text-slate-300 mb-2">{d}</div>)}
          {Array.from({ length: emptyDays }).map((_, i) => <div key={`empty-${i}`} />)}
          {days.map(day => {
            const isPast = isBefore(day, today);
            const isS = startDate && isSameDay(day, startDate);
            const isE = endDate && isSameDay(day, endDate);
            const inRange = startDate && endDate && isWithinInterval(day, { start: startDate, end: endDate });
            let dayClass = "h-9 w-full flex items-center justify-center text-[11px] font-black rounded-xl transition-all ";
            if (isPast) dayClass += "text-slate-200 cursor-not-allowed ";
            else if (isS) dayClass += "bg-emerald-500 text-white shadow-lg z-10 scale-110 ring-2 ring-emerald-100 ";
            else if (isE) dayClass += "bg-indigo-600 text-white shadow-lg z-10 scale-110 ring-2 ring-indigo-100 ";
            else if (inRange) dayClass += "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-50 ";
            else if (isToday(day)) dayClass += "border-2 border-slate-100 text-indigo-600 ";
            else dayClass += "text-slate-600 hover:bg-slate-50 ";
            return (<button key={day.toISOString()} type="button" disabled={isPast} onClick={() => handleDateClick(day)} className={dayClass}>{format(day, 'd')}</button>);
          })}
        </div>
      </div>
    );
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      let clientId = selectedClient?.id;
      let clientName = selectedClient?.company || `${selectedClient?.firstName} ${selectedClient?.lastName}`;
      if (isNewClientFormVisible) {
        const created = await api.createClient(newClientData);
        clientId = created.id;
        clientName = created.company || `${created.firstName} ${created.lastName}`;
      }

      if (!clientId) {
        setError("Veuillez sélectionner ou créer un client.");
        return;
      }

      let remainingGuests = guests;
      const activeFixedTaxes = availableTaxes.filter(t => t.isActive && t.isFixed && (t.applyTo === 'accommodation' || t.applyTo === 'all'));
      const fixedTaxPerNightPerPax = activeFixedTaxes.reduce((sum, t) => sum + t.rate, 0);

      const newResList = selectedRoomIds.map(roomId => {
        const room = rooms.find(r => r.id === roomId)!;
        const guestsAllocated = Math.min(remainingGuests, room.capacity);
        const nightly = getRoomPrice(room);
        remainingGuests = Math.max(0, remainingGuests - guestsAllocated);
        const perRoomDeposit = depositAmount / selectedRoomIds.length;

        const baseStay = (nightly + ((boardPrices?.[boardType as keyof BoardConfiguration] || 0) * guestsAllocated)) * nights;
        const totalTaxesFixes = fixedTaxPerNightPerPax * guestsAllocated * nights;

        return {
          roomId, clientId: clientId!, clientName, occupantName: clientName,
          checkIn: startDate!, checkOut: endDate!,
          status: currentStatus, source, boardType, adults: guestsAllocated, children: 0,
          baseRate: nightly, totalPrice: baseStay + totalTaxesFixes,
          notes, services: [],
          payments: perRoomDeposit > 0 ? [{ id: crypto.randomUUID(), amount: perRoomDeposit, date: new Date(), method: paymentMethod }] : [],
          depositAmount: perRoomDeposit,
          color: customColor
        };
      });

      await api.createMultipleReservations(newResList);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Erreur lors de la création du dossier:", err);
      setError("Une erreur technique est survenue lors de l'enregistrement.");
    }
  };

  if (!isOpen) return null;

  const labelClass = "block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1";
  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className={`bg-white rounded-[2.5rem] shadow-2xl w-full flex flex-col overflow-hidden relative border border-white/20 animate-in zoom-in-95 duration-300 ${step === 'CRITERIA' ? 'max-w-4xl h-auto' : 'max-w-5xl h-[85vh]'}`}>
        <div className="bg-slate-900 text-white px-8 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4"><div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-900/20"><Hotel size={20} /></div><div><h2 className="text-lg font-black uppercase tracking-tight">Assistant Réception</h2><p className="text-[9px] text-indigo-400 font-bold uppercase tracking-[0.2em]">Enregistrement Séjour</p></div></div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50">
          {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 mx-8 mt-6 flex items-center gap-3 animate-in slide-in-from-top-2"><AlertTriangle className="text-red-500 shrink-0" size={20} /><p className="text-xs font-black text-red-800 uppercase">{error}</p></div>}

          {step === 'CRITERIA' && (
            <div className="p-8 space-y-8 animate-in fade-in">
              <div className="flex flex-col md:flex-row gap-8 items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div onClick={() => setSelectingType('checkIn')} className={`flex-1 w-full space-y-1 cursor-pointer transition-all ${selectingType === 'checkIn' ? 'scale-[1.02]' : 'opacity-60'}`}><label className={`text-[9px] font-black uppercase tracking-widest ml-1 ${selectingType === 'checkIn' ? 'text-emerald-500' : 'text-slate-400'}`}>* Arrivée prévue</label><div className={`relative group border-2 rounded-xl px-4 py-3 font-black transition-all ${selectingType === 'checkIn' ? 'bg-emerald-50 border-emerald-500 text-emerald-600 shadow-md ring-2 ring-emerald-50' : 'bg-slate-50 border-slate-100 text-slate-800'}`}><span className="block">{startDate ? format(startDate, 'dd/MM/yyyy') : 'Choisir...'}</span><Calendar className={`absolute right-4 top-1/2 -translate-y-1/2 ${selectingType === 'checkIn' ? 'text-emerald-500' : 'text-slate-300'}`} size={18} /></div></div>
                <div className="px-2 hidden md:block opacity-20"><ArrowRight className="text-slate-900" size={24} /></div>
                <div onClick={() => setSelectingType('checkOut')} className={`flex-1 w-full space-y-1 cursor-pointer transition-all ${selectingType === 'checkOut' ? 'scale-[1.02]' : 'opacity-60'}`}><label className={`text-[9px] font-black uppercase tracking-widest ml-1 ${selectingType === 'checkOut' ? 'text-indigo-500' : 'text-slate-400'}`}>* Départ prévu</label><div className={`relative group border-2 rounded-xl px-4 py-3 font-black transition-all ${selectingType === 'checkOut' ? 'bg-indigo-50 border-indigo-500 text-indigo-600 shadow-md ring-2 ring-indigo-50' : 'bg-slate-50 border-slate-100 text-slate-800'}`}><span className="block">{endDate ? format(endDate, 'dd/MM/yyyy') : 'Choisir...'}</span><Calendar className={`absolute right-4 top-1/2 -translate-y-1/2 ${selectingType === 'checkOut' ? 'text-indigo-500' : 'text-slate-300'}`} size={18} /></div></div>
              </div>
              <div className="relative bg-white rounded-[2rem] p-10 shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row gap-16 justify-center"><div className="flex-1">{renderCalendar(currentMonth)}</div><div className="w-px bg-slate-100 hidden md:block"></div><div className="flex-1">{renderCalendar(addMonths(currentMonth, 1))}</div></div>
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 hover:bg-slate-50 rounded-full text-slate-300 hover:text-indigo-600 transition-all"><ChevronLeft size={32} /></button>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 hover:bg-slate-50 rounded-full text-slate-300 hover:text-indigo-600 transition-all"><ChevronRight size={32} /></button>
              </div>
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 pb-4">
                <div className="space-y-1"><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre d'hôtes total</label><div className="flex items-center bg-white border-2 border-slate-100 rounded-2xl p-1 shadow-sm"><button onClick={() => setGuests(Math.max(1, guests - 1))} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400"><Trash2 size={16} className="rotate-45" /></button><span className="w-12 text-center font-black text-xl text-indigo-600">{guests}</span><button onClick={() => setGuests(guests + 1)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400"><Plus size={16} /></button></div></div>
                <div className="flex items-center gap-6"><div className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs shadow-xl shadow-indigo-100">{nights} Nuit{nights > 1 ? 's' : ''} de séjour</div><button onClick={() => { if (!startDate || !endDate || nights <= 0) { setError("Dates de séjour invalides."); return; } setStep('ROOMS'); setError(null); }} className="bg-slate-900 text-white px-10 py-5 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-indigo-600 shadow-2xl transition-all hover:scale-105">Vérifier Disponibilités</button></div>
              </div>
            </div>
          )}

          {step === 'ROOMS' && (
            <div className="p-8 animate-in slide-in-from-right-4">
              <div className="flex justify-between items-end mb-8">
                <div><h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Chambres Libres</h3><p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">{nights} nuits • {guests} pers.</p></div>
              </div>
              <div className="space-y-6">
                {Object.keys(availableRoomsByCategory).map(type => (
                  <div key={type} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-3"><div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div><h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">{type}</h4></div></div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                      {availableRoomsByCategory[type].map(room => {
                        const isSelected = selectedRoomIds.includes(room.id);
                        const price = getRoomPrice(room);
                        return (
                          <button key={room.id} onClick={() => setSelectedRoomIds(prev => isSelected ? prev.filter(i => i !== room.id) : [...prev, room.id])} className={`aspect-square rounded-2xl border-2 transition-all flex flex-col items-center justify-center relative ${isSelected ? 'bg-indigo-600 border-indigo-700 text-white shadow-xl scale-105 z-10' : 'bg-slate-50 border-slate-50 text-slate-700 hover:border-indigo-300 hover:bg-white'}`}>
                            <span className="text-sm font-black tracking-tight">{room.number}</span>
                            <div className={`mt-1 text-[8px] font-black uppercase px-1 rounded ${isSelected ? 'bg-white/20' : 'bg-white text-emerald-600 border border-emerald-100'}`}>{formatPrice(price)}</div>
                            {isSelected && <CheckCircle2 className="absolute -top-1 -right-1 bg-white text-indigo-600 rounded-full" size={14} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-10 flex justify-between items-center bg-white p-6 rounded-3xl shadow-lg border border-slate-100">
                <button onClick={() => setStep('CRITERIA')} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 flex items-center gap-2"><ArrowLeft size={16} /> Dates</button>
                <button onClick={() => { if (selectedRoomIds.length === 0) return; setStep('CLIENT'); }} disabled={selectedRoomIds.length === 0} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-3">Suivant : Client <ArrowRight size={18} /></button>
              </div>
            </div>
          )}

          {step === 'CLIENT' && (
            <div className="p-10 animate-in slide-in-from-right-4 max-w-3xl mx-auto space-y-8">
              <div className="text-center"><h3 className="text-2xl font-black text-slate-800 mb-1 uppercase tracking-tighter">Client du Dossier</h3><p className="text-slate-400 text-xs font-black uppercase tracking-widest">Recherchez ou créez une fiche complète</p></div>
              {!isNewClientFormVisible ? (
                <div className="space-y-4">
                  <div className="flex gap-3"><div className="relative flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} /><input type="text" autoFocus className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 font-black text-slate-800 outline-none focus:border-indigo-500 transition-all shadow-sm" placeholder="Taper le nom pour rechercher..." value={clientSearch} onChange={e => { setClientSearch(e.target.value); if (selectedClient) setSelectedClient(null); }} /></div><button onClick={() => setIsNewClientFormVisible(true)} className="bg-slate-900 text-white px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-600 transition-all shadow-md">Nouveau Client</button></div>
                  {clientSearch.length > 0 && (
                    <div className="bg-white rounded-3xl border-2 border-slate-100 overflow-hidden shadow-xl divide-y divide-slate-50 animate-in fade-in slide-in-from-top-4 duration-300">
                      {clientHistory.filter(c => `${c.firstName} ${c.lastName} ${c.company}`.toLowerCase().includes(clientSearch.toLowerCase())).slice(0, 5).map(c => (
                        <div key={c.id} onClick={() => { setSelectedClient(c); setClientSearch(`${c.company || c.lastName}`); }} className={`p-4 hover:bg-slate-50 cursor-pointer flex justify-between items-center group transition-all ${selectedClient?.id === c.id ? 'bg-indigo-50 border-l-8 border-indigo-600' : ''}`}><div><div className="font-black text-slate-800 text-sm">{c.company || `${c.firstName} ${c.lastName}`}</div><div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{c.email} • {c.phone}</div></div>{selectedClient?.id === c.id && <CheckCircle2 className="text-indigo-600" size={20} />}</div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white p-10 rounded-[2rem] border-2 border-indigo-100 shadow-xl space-y-6 animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-2"><h4 className="font-black text-indigo-600 text-[10px] uppercase tracking-widest">Fiche Client Détaillée</h4><button onClick={() => setIsNewClientFormVisible(false)} className="text-[9px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest">Annuler</button></div>
                  <div className="grid grid-cols-6 gap-4">
                    <div className="col-span-2"><label className={labelClass}>Civilité</label><select className={inputClass} value={newClientData.civility} onChange={e => setNewClientData({ ...newClientData, civility: e.target.value })}><option value="M.">Monsieur (M.)</option><option value="Mme">Madame (Mme)</option><option value="Dr">Docteur (Dr)</option></select></div>
                    <div className="col-span-4"><label className={labelClass}>Société / Entité</label><input className={inputClass} placeholder="Optionnel" value={newClientData.company} onChange={e => setNewClientData({ ...newClientData, company: e.target.value })} /></div>
                    <div className="col-span-3"><label className={labelClass}>Prénom</label><input className={inputClass} value={newClientData.firstName} onChange={e => setNewClientData({ ...newClientData, firstName: e.target.value })} /></div>
                    <div className="col-span-3"><label className={labelClass}>Nom</label><input className={inputClass} value={newClientData.lastName} onChange={e => setNewClientData({ ...newClientData, lastName: e.target.value })} /></div>
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center pt-6">
                <button onClick={() => setStep('ROOMS')} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-800 flex items-center gap-2"><ArrowLeft size={16} /> Chambres</button>
                <button onClick={() => setStep('CONFIRM')} disabled={!selectedClient && (!isNewClientFormVisible || !newClientData.lastName)} className="bg-indigo-600 text-white px-12 py-5 rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-2xl hover:bg-indigo-700 transition-all disabled:opacity-50">Détails du séjour <ArrowRight size={18} className="inline ml-2" /></button>
              </div>
            </div>
          )}

          {step === 'CONFIRM' && (
            <div className="p-8 animate-in slide-in-from-right-4 grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <div className="flex items-center gap-2 mb-6 text-indigo-600"><Bookmark size={18} className="fill-current" /><h4 className="text-[11px] font-black uppercase tracking-[0.2em]">Détails du dossier</h4></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 flex flex-col gap-1"><span className={labelClass}>Client Titulaire</span><div className="bg-slate-50 p-3 rounded-xl border border-slate-100 font-black text-slate-800 text-sm">{selectedClient?.company || selectedClient?.lastName || newClientData.lastName}</div></div>
                    <div className="flex flex-col gap-1"><span className={labelClass}>Période</span><div className="bg-slate-50 p-3 rounded-xl border border-slate-100 font-black text-indigo-600 text-[11px] uppercase">{format(startDate!, 'dd MMM')} → {format(endDate!, 'dd MMM')}</div></div>
                    <div className="flex flex-col gap-1"><span className={labelClass}>Durée / Hôtes</span><div className="bg-slate-50 p-3 rounded-xl border border-slate-100 font-black text-slate-700 text-[11px]">{nights} nuits • {guests} pers.</div></div>
                    <div className="col-span-2 flex flex-col gap-1"><span className={labelClass}>Unités assignées</span>
                      <div className="p-2 space-y-2">
                        {selectedRoomIds.map(id => {
                          const r = rooms.find(rm => rm.id === id);
                          return (<div key={id} className="flex items-center justify-between p-3 rounded-xl border bg-slate-50 border-slate-100"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs bg-white text-slate-700 shadow-sm">#{r?.number}</div><span className="text-[10px] font-black uppercase text-slate-600">{r?.type}</span></div></div>);
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-1"><label className={labelClass}><Coffee size={14} /> Formule</label><select className={inputClass} value={boardType} onChange={e => setBoardType(e.target.value as BoardType)}>{Object.values(BoardType).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                    <div className="col-span-1"><label className={labelClass}><Palette size={14} /> Visuel Planning</label>
                      <div className="flex gap-2">{PRESET_COLORS.map(c => (<button key={c.value} onClick={() => setCustomColor(c.value)} className={`w-7 h-7 rounded-full border-2 transition-all ${customColor === c.value ? 'border-indigo-600 ring-2 ring-indigo-100 scale-110' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-110'}`} style={{ backgroundColor: c.value }} title={c.name} />))}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 border-t pt-6 border-slate-100">
                    <div className="col-span-1"><label className={labelClass}><Coins size={14} /> Acompte ({currency?.symbol || '€'})</label><input type="number" step="0.01" className={`${inputClass} !bg-white`} value={depositAmount || ''} onChange={e => setDepositAmount(parseFloat(e.target.value) || 0)} placeholder="0.00" /></div>
                    <div className="col-span-1"><label className={labelClass}><CreditCard size={14} /> Règlement</label><select className={inputClass} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} disabled={depositAmount <= 0}><option value="CB">CB</option><option value="Espèces">Espèces</option><option value="Virement">Virement</option></select></div>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-5 flex flex-col">
                <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl flex flex-col h-full overflow-hidden text-white">
                  <div className="p-8 flex-1">
                    <div className="flex items-center justify-between mb-8 opacity-30"><div className="flex items-center gap-3"><FileText size={20} /> <span className="text-[9px] font-black uppercase tracking-[0.4em]">Facturation Estimée</span></div></div>
                    <div className="space-y-4 mb-10">
                      <div className="flex justify-between items-end"><div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Prestations</p><p className="text-xs text-slate-300 font-medium">Hébergement + Repas ({nights} nuits)</p></div><span className="font-black text-lg">{formatPrice(totalPrice - availableTaxes.filter(t => t.isActive && t.isFixed).reduce((s, t) => s + (t.rate * guests * nights), 0))}</span></div>
                      {availableTaxes.filter(t => t.isActive && t.isFixed).length > 0 && (
                        <div className="flex justify-between items-end border-t border-white/5 pt-4"><div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Taxes Locales</p><p className="text-xs text-slate-300 font-medium">Taxes de séjour / Fixes</p></div><span className="font-black text-lg text-indigo-400">{formatPrice(availableTaxes.filter(t => t.isActive && t.isFixed).reduce((s, t) => s + (t.rate * guests * nights), 0))}</span></div>
                      )}
                    </div>
                    {/* Fixed: Changed totalStayPrice to totalPrice as totalStayPrice was not defined in this scope */}
                    <div className="mt-auto border-t border-white/10 pt-8"><div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-2">Total TTC estimé</div><div className="text-5xl font-[1000] tracking-tighter leading-none flex items-baseline gap-2 mb-4">{formatPrice(totalPrice)}</div></div>
                  </div>
                  <div className="p-8 bg-black/30 border-t border-white/5 space-y-4"><div className="grid grid-cols-2 gap-4"><button onClick={() => { setCurrentStatus(ReservationStatus.OPTION); handleSubmit(); }} className="py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border border-white/10">Poser Option</button><button onClick={() => { setCurrentStatus(ReservationStatus.CONFIRMED); handleSubmit(); }} className="py-4 bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/50 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl transition-all">Confirmer</button></div><button onClick={() => setStep('CRITERIA')} className="w-full text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-300 py-1 transition-colors flex items-center justify-center gap-2"><RotateCcw size={12} /> Recommencer</button></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewReservationModal;
