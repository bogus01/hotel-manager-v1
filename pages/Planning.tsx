import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  format, 
  addDays, 
  differenceInDays, 
  isSameDay, 
  isToday,
  isBefore,
  isAfter,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon,
  X,
  User,
  Users,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Coins,
  List,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  LogIn,
  Moon,
  CheckCircle2,
  Table,
  MoveRight,
  Check,
  Filter,
  Settings as SettingsIcon,
  Maximize,
  Minimize,
  Navigation,
  ShieldAlert,
  Settings,
  Split,
  DoorOpen,
  Hash,
  Utensils,
  MousePointer2,
  Palette,
  Droplet,
  ChevronUp,
  ChevronDown,
  Layout
} from 'lucide-react';
import { DndContext, useDraggable, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

import Header from '../components/Header';
import { Room, Reservation, ReservationStatus, PlanningSettings, StatusColors } from '../types';
import * as api from '../services/api';
import NewReservationModal from '../components/NewReservationModal';
import QuickReservationModal from '../components/QuickReservationModal';
import DailyPlanningModal from '../components/DailyPlanningModal';
import ReservationModal from '../components/ReservationModal';
import AvailabilityModal from '../components/AvailabilityModal';

const COLOR_SPECTRES = [
    { name: 'Océan (Bleus)', colors: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#1e40af'] },
    { name: 'Forêt (Verts)', colors: ['#059669', '#10b981', '#34d399', '#6ee7b7', '#064e3b'] },
    { name: 'Royal (Violets)', colors: ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#4c1d95'] },
    { name: 'Incandescence (Rouges/Roses)', colors: ['#e11d48', '#f43f5e', '#fb7185', '#fda4af', '#9f1239'] },
    { name: 'Ambre (Jaunes/Oranges)', colors: ['#d97706', '#f59e0b', '#fbbf24', '#fcd34d', '#78350f'] },
    { name: 'Ardoise (Gris/Sombres)', colors: ['#475569', '#64748b', '#94a3b8', '#cbd5e1', '#1e293b'] }
];

const subDaysLocal = (date: Date, amount: number) => addDays(date, -amount);
const startOfToday = () => {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d;
};

const getDayAbbr = (date: Date) => {
  const days = ['DI', 'LU', 'MA', 'ME', 'JE', 'VE', 'SA'];
  return days[date.getDay()];
};

const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6; 
};

const BASE_ROW_HEIGHT = 56; 
const MIN_ZOOM = 50;
const MAX_ZOOM = 200;
const ZOOM_STEP = 10;
const LABELS_COLUMN_WIDTH = 192; 

const PRESET_SELECTION_COLORS = [
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Slate', value: '#64748b' },
];

type ViewMode = 'week' | 'fortnight' | 'month';

const getStatusStyles = (status: ReservationStatus, settings: PlanningSettings, customColor?: string) => {
  const sc = settings.statusColors || {
      confirmed: '#6366f1',
      checkedIn: '#10b981',
      checkedOut: '#64748b',
      option: '#f59e0b',
      cancelled: '#ef4444'
  };

  let baseColor = sc.confirmed;
  let isOption = status === ReservationStatus.OPTION;

  switch (status) {
    case ReservationStatus.CONFIRMED: baseColor = sc.confirmed; break;
    case ReservationStatus.CHECKED_IN: baseColor = sc.checkedIn; break;
    case ReservationStatus.CHECKED_OUT: baseColor = sc.checkedOut; break;
    case ReservationStatus.OPTION: baseColor = sc.option; break;
    case ReservationStatus.CANCELLED: baseColor = sc.cancelled; break;
    default: baseColor = sc.confirmed;
  }

  if (customColor && customColor !== '#6366f1') {
      baseColor = customColor;
  }

  const isSolid = settings.barStyle === 'solid';

  return { 
      background: isSolid ? baseColor : `${baseColor}44`, 
      accent: baseColor, 
      text: isSolid ? 'text-white' : 'text-slate-900', 
      borderColor: isOption ? baseColor : `${baseColor}33`,
      borderStyle: isOption ? 'dashed' : 'solid',
      badge: isSolid ? 'bg-white/20 text-white border-white/20' : 'bg-white/60 text-slate-900 border-black/10'
  };
};

const hasDateConflict = (start1: Date, end1: Date, start2: Date, end2: Date) => {
  return (start1.getTime() < end2.getTime() && end1.getTime() > start2.getTime());
};

interface DraggableReservationProps {
  reservation: Reservation;
  style: React.CSSProperties;
  zoom: number;
  settings: PlanningSettings;
  isAnyDragging: boolean;
  onClick: (res: Reservation) => void;
  onResizeStart: (e: React.PointerEvent, direction: 'left' | 'right', reservation: Reservation) => void;
  onHoverStart: (res: Reservation, x: number, y: number) => void;
  onHoverEnd: () => void;
}

const DraggableReservation: React.FC<DraggableReservationProps> = ({ 
  reservation, 
  style, 
  zoom, 
  settings,
  isAnyDragging,
  onClick,
  onResizeStart,
  onHoverStart,
  onHoverEnd
}) => {
  const isTotallyLocked = reservation.status === ReservationStatus.CHECKED_OUT || reservation.status === ReservationStatus.CANCELLED;
  const isCheckedIn = reservation.status === ReservationStatus.CHECKED_IN;
  const isCheckedOut = reservation.status === ReservationStatus.CHECKED_OUT;
  const isOption = reservation.status === ReservationStatus.OPTION;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: reservation.id,
    data: { reservation },
    disabled: isTotallyLocked
  });

  const styles = getStatusStyles(reservation.status, settings, reservation.color);

  const dragStyle: React.CSSProperties = {
    ...style,
    background: styles.background,
    border: `1px ${styles.borderStyle} ${styles.borderColor}`,
    borderLeft: `5px solid ${styles.accent}`,
    boxShadow: isDragging 
        ? '0 25px 50px -12px rgb(0 0 0 / 0.25)' 
        : '0 2px 4px rgba(0,0,0,0.08)',
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.8 : (isCheckedOut ? 0.65 : 1),
    zIndex: isDragging ? 100 : 10,
    cursor: isTotallyLocked ? 'default' : (isDragging ? 'grabbing' : 'grab'),
  };

  const displayName = reservation.occupantName || reservation.clientName;
  const isSmall = zoom < 75;

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className={`absolute top-1 bottom-1 rounded-lg font-bold overflow-hidden whitespace-nowrap flex flex-col justify-center transition-all hover:brightness-95 group ${styles.text}`}
      {...listeners}
      {...attributes}
      onMouseEnter={(e) => {
          if (!isDragging && !isAnyDragging) {
              onHoverStart(reservation, e.clientX + 10, e.clientY + 10);
          }
      }}
      onMouseMove={(e) => {
          if (!isDragging && !isAnyDragging) {
              onHoverStart(reservation, e.clientX + 10, e.clientY + 10);
          }
      }}
      onMouseLeave={onHoverEnd}
      onClick={(e) => {
        if (!isDragging) onClick(reservation);
      }}
    >
      {!isTotallyLocked && !isCheckedIn && (
        <div 
            className="absolute left-0 top-0 bottom-0 w-4 cursor-ew-resize hover:bg-black/5 z-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            onPointerDown={(e) => { e.stopPropagation(); onResizeStart(e, 'left', reservation); }}
        >
            <div className={`w-1 h-4 ${settings.barStyle === 'solid' ? 'bg-white/40' : 'bg-slate-400'} rounded-full`} />
        </div>
      )}

      <div className={`px-2 overflow-hidden pointer-events-auto select-none flex flex-col justify-center h-full`}>
        <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 overflow-hidden">
                <div className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75`} style={{backgroundColor: settings.barStyle === 'solid' ? '#fff' : styles.accent}}></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 shadow-sm" style={{backgroundColor: settings.barStyle === 'solid' ? '#fff' : styles.accent}}></span>
                </div>
                <div className={`${isSmall ? 'text-[9px]' : 'text-[11px]'} font-black truncate leading-none tracking-tight uppercase`}>
                    {displayName} <span className={`ml-1 ${settings.barStyle === 'solid' ? 'opacity-70' : 'opacity-60'} font-black tracking-normal`}>[{reservation.totalPrice}€]</span>
                </div>
            </div>
            {!isSmall && (
                <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full border whitespace-nowrap opacity-80 shrink-0 shadow-sm ${styles.badge}`}>
                    {isCheckedIn ? 'Arrivé' : isCheckedOut ? 'Parti' : isOption ? 'Option' : 'Confirmé'}
                </span>
            )}
        </div>
      </div>

      {!isTotallyLocked && (
        <div 
            className="absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize hover:bg-black/5 z-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            onPointerDown={(e) => { e.stopPropagation(); onResizeStart(e, 'right', reservation); }}
        >
            <div className={`w-1 h-4 ${settings.barStyle === 'solid' ? 'bg-white/40' : 'bg-slate-400'} rounded-full`} />
        </div>
      )}
    </div>
  );
};

const Planning: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const reservationsRef = useRef(reservations);
  const [loading, setLoading] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [settings, setSettings] = useState<PlanningSettings>({
      defaultZoom: 100, defaultView: 'month', historyOffset: 5, navigationStep: 2, showRoomStatus: true, selectionColor: '#6366f1', barStyle: 'translucent',
      statusColors: { confirmed: '#6366f1', checkedIn: '#10b981', checkedOut: '#64748b', option: '#f59e0b', cancelled: '#ef4444' }
  });
  const [currentDate, setCurrentDate] = useState(subDaysLocal(startOfToday(), 5));
  const [zoom, setZoom] = useState(100);
  const [viewMode, setViewMode] = useState<ViewMode>('month'); 
  const [daysToShow, setDaysToShow] = useState(62); 
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);
  const [quickModalInitialData, setQuickModalInitialData] = useState<{roomId: string, checkIn: Date, checkOut: Date, status: ReservationStatus} | null>(null);
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [dailyModalDate, setDailyModalDate] = useState(startOfToday());
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [pendingChange, setPendingChange] = useState<{old: Reservation, new: Reservation} | null>(null);
  const [pendingResize, setPendingResize] = useState<{old: Reservation, new: Reservation, direction: 'left' | 'right'} | null>(null);
  const [groupConflict, setGroupConflict] = useState<string | null>(null);
  const [pendingSelectionConfirm, setPendingSelectionConfirm] = useState<{roomId: string, start: Date, end: Date} | null>(null);
  const [dragSelection, setDragSelection] = useState<{ roomId: string; start: Date; end: Date; } | null>(null);
  const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);
  const [hoveredRes, setHoveredRes] = useState<{ res: Reservation, x: number, y: number } | null>(null);
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const clickBlockerRef = useRef(false);
  const [resizing, setResizing] = useState<{ id: string; direction: 'left' | 'right'; initialX: number; originalRes: Reservation; } | null>(null);
  const resizingRef = useRef<any>(null);
  const [expandedStatusColor, setExpandedStatusColor] = useState<keyof StatusColors | null>(null);

  const today = startOfToday();
  const roomCategories = useMemo(() => Array.from(new Set(rooms.map(r => r.type))).sort(), [rooms]);
  useEffect(() => { reservationsRef.current = reservations; }, [reservations]);
  useEffect(() => {
    if (viewMode === 'week') setDaysToShow(14);
    else if (viewMode === 'fortnight') setDaysToShow(14); 
    else setDaysToShow(62);
  }, [viewMode]);
  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    const handleFsChange = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, []);
  const rowHeight = (BASE_ROW_HEIGHT * zoom) / 100;
  const cellWidth = useMemo(() => {
    const availableWidth = viewportWidth - LABELS_COLUMN_WIDTH;
    const idealWidth = availableWidth / (viewMode === 'week' ? 7 : (viewMode === 'fortnight' ? 14 : 30));
    return (idealWidth * zoom) / 100;
  }, [viewportWidth, viewMode, zoom]);
  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < daysToShow; i++) days.push(addDays(currentDate, i));
    return days;
  }, [currentDate, daysToShow]);
  const filteredReservations = useMemo(() => reservations.filter(res => { const room = rooms.find(rm => rm.id === res.roomId); return selectedCategories.length === 0 || (room && selectedCategories.includes(room.type)); }), [reservations, selectedCategories, rooms]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const isBusy = !!dragSelection || isDraggingGlobal || !!resizing;
  useEffect(() => {
    setLoading(true);
    api.fetchPlanningSettings().then(s => { if (s) { setSettings(s); setZoom(s.defaultZoom); setViewMode(s.defaultView); setCurrentDate(subDaysLocal(startOfToday(), s.historyOffset)); } });
    Promise.all([api.fetchRooms(), api.fetchReservations()]).then(([r, res]) => { setRooms(r); setReservations(res); setLoading(false); }).catch(err => { setLoading(false); });
  }, []);
  const refreshReservations = async () => { const res = await api.fetchReservations(); setReservations(res); };
  const handleReset = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir réinitialiser toutes les données du planning ? Cette action est irréversible (reservations, clients, paiements et factures seront effacés).')) {
      try {
        setLoading(true);
        await api.resetPlanningData();
        await refreshReservations();
        setLoading(false);
        alert('Données réinitialisées avec succès.');
      } catch (err) {
        setLoading(false);
        alert('Erreur lors de la réinitialisation des données.');
        console.error(err);
      }
    }
  };
  const handleNavigate = (direction: 'prev' | 'next') => { const step = viewMode === 'week' ? 7 : (viewMode === 'fortnight' ? 14 : 7); if (direction === 'prev') setCurrentDate(subDaysLocal(currentDate, step)); else setCurrentDate(addDays(currentDate, step)); };
  const handleSelectionStart = (roomId: string, date: Date) => { if (reservations.some(r => r.roomId === roomId && r.status !== ReservationStatus.CANCELLED && (isSameDay(r.checkIn, date) || (date >= r.checkIn && date < r.checkOut)))) return; setDragSelection({ roomId, start: date, end: date }); const handleGlobalMouseUp = () => { setDragSelection(prev => { if (prev) { let start = prev.start, end = prev.end; if (isBefore(end, start)) { const temp = start; start = end; end = temp; } if (!isBefore(start, today) || isToday(start)) setPendingSelectionConfirm({ roomId: prev.roomId, start, end }); } return null; }); window.removeEventListener('mouseup', handleGlobalMouseUp); }; window.addEventListener('mouseup', handleGlobalMouseUp); };
  const handleSelectionMove = (roomId: string, date: Date) => { if (dragSelection && roomId === dragSelection.roomId) { const start = dragSelection.start; const isForward = isAfter(date, start); const rangeStart = isForward ? start : date; const rangeEnd = isForward ? date : start; if (!reservations.filter(r => r.roomId === roomId && r.status !== ReservationStatus.CANCELLED).find(r => r.checkIn.getTime() < addDays(rangeEnd, 1).getTime() && r.checkOut.getTime() > rangeStart.getTime())) setDragSelection(prev => prev ? ({ ...prev, end: date }) : null); } };
  const confirmSelection = () => { if (!pendingSelectionConfirm) return; setQuickModalInitialData({ roomId: pendingSelectionConfirm.roomId, checkIn: pendingSelectionConfirm.start, checkOut: addDays(pendingSelectionConfirm.end, 1), status: ReservationStatus.CONFIRMED }); setIsQuickModalOpen(true); setPendingSelectionConfirm(null); };
  const onResizeStart = (e: React.PointerEvent, direction: 'left' | 'right', reservation: Reservation) => { e.stopPropagation(); clickBlockerRef.current = true; setResizing({ id: reservation.id, direction, initialX: e.clientX, originalRes: { ...reservation } }); const handleMouseMove = (moveEvent: MouseEvent) => { if (!resizingRef.current) return; const deltaX = moveEvent.clientX - resizingRef.current.initialX, dayShift = Math.round(deltaX / cellWidth); if (dayShift === 0) return; const res = resizingRef.current.originalRes; let newCheckIn = res.checkIn, newCheckOut = res.checkOut; if (resizingRef.current.direction === 'left') { newCheckIn = addDays(res.checkIn, dayShift); if (isBefore(newCheckIn, today) && !isToday(newCheckIn)) return; if (isAfter(newCheckIn, subDaysLocal(newCheckOut, 1))) return; } else { newCheckOut = addDays(res.checkOut, dayShift); if (isBefore(newCheckOut, addDays(newCheckIn, 1))) return; } if (!reservationsRef.current.find(r => r.id !== res.id && r.roomId === res.roomId && r.status !== ReservationStatus.CANCELLED && hasDateConflict(newCheckIn, newCheckOut, r.checkIn, r.checkOut))) setReservations(prev => prev.map(r => r.id === res.id ? { ...r, checkIn: newCheckIn, checkOut: newCheckOut } : r)); }; const handleMouseUp = () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); const finalRes = reservationsRef.current.find(r => r.id === resizingRef.current.id), originalRes = resizingRef.current.originalRes; if (finalRes && (finalRes.checkIn.getTime() !== originalRes.checkIn.getTime() || finalRes.checkOut.getTime() !== originalRes.checkOut.getTime())) setPendingResize({ old: originalRes, new: finalRes, direction: resizingRef.current.direction }); setResizing(null); setTimeout(() => { clickBlockerRef.current = false; }, 200); }; window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); };
  useEffect(() => { resizingRef.current = resizing; }, [resizing]);
  const handleDragEnd = async (event: DragEndEvent) => { setIsDraggingGlobal(false); clickBlockerRef.current = true; const { active, delta } = event; if (!delta.x && !delta.y) { setTimeout(() => { clickBlockerRef.current = false; }, 150); return; } const reservation = active.data.current?.reservation as Reservation; if (!reservation || reservation.status === ReservationStatus.CHECKED_OUT) return; const daysShift = Math.round(delta.x / cellWidth), roomsShift = Math.round(delta.y / rowHeight); let newCheckIn = addDays(reservation.checkIn, daysShift), newCheckOut = addDays(reservation.checkOut, daysShift); if (reservation.status === ReservationStatus.CHECKED_IN) { newCheckIn = reservation.checkIn; newCheckOut = addDays(reservation.checkOut, daysShift); } if (reservation.status !== ReservationStatus.CHECKED_IN && isBefore(newCheckIn, today) && !isToday(newCheckIn)) { setReservations(prev => prev.map(r => r.id === reservation.id ? reservation : r)); setTimeout(() => { clickBlockerRef.current = false; }, 150); return; } const filtered = rooms.filter(r => selectedCategories.length === 0 || selectedCategories.includes(r.type)), currentRoomIndex = filtered.findIndex(r => r.id === reservation.roomId); let newRoomId = reservation.roomId; if (currentRoomIndex !== -1) newRoomId = filtered[Math.max(0, Math.min(filtered.length - 1, currentRoomIndex + roomsShift))].id; if (reservations.filter(r => r.id !== reservation.id && r.status !== ReservationStatus.CANCELLED && r.roomId === newRoomId).some(existing => hasDateConflict(newCheckIn, newCheckOut, existing.checkIn, existing.checkOut))) { setReservations(prev => prev.map(r => r.id === reservation.id ? reservation : r)); setTimeout(() => { clickBlockerRef.current = false; }, 150); return; } const updatedRes = { ...reservation, checkIn: newCheckIn, checkOut: newCheckOut, roomId: newRoomId }; setReservations(prev => prev.map(r => r.id === reservation.id ? updatedRes : r)); setPendingChange({ old: reservation, new: updatedRes }); setTimeout(() => { clickBlockerRef.current = false; }, 200); };
  const updateReservationState = async (updatedRes: Reservation, applyToGroup: boolean = false) => { setGroupConflict(null); if (applyToGroup) { const siblings = reservations.filter(r => r.clientId === updatedRes.clientId && r.id !== updatedRes.id && r.status !== ReservationStatus.CANCELLED), oldRef = pendingResize?.old || pendingChange?.old || updatedRes, daysDiffCheckOut = differenceInDays(updatedRes.checkOut, oldRef.checkOut), daysDiffCheckIn = differenceInDays(updatedRes.checkIn, oldRef.checkIn), groupUpdatesList: Reservation[] = []; let hasError = false; for (const s of siblings) { const newIn = addDays(s.checkIn, daysDiffCheckIn), newOut = addDays(s.checkOut, daysDiffCheckOut); if (reservations.find(r => r.clientId !== updatedRes.clientId && r.roomId === s.roomId && r.status !== ReservationStatus.CANCELLED && hasDateConflict(newIn, newOut, r.checkIn, r.checkOut))) { setGroupConflict(`Impossible de déplacer le groupe : la chambre ${rooms.find(rm=>rm.id===s.roomId)?.number} bute sur une autre réservation.`); setReservations(prev => prev.map(r => r.id === updatedRes.id ? oldRef : r)); hasError = true; break; } groupUpdatesList.push({ ...s, checkIn: newIn, checkOut: newOut }); } if (hasError) return; groupUpdatesList.push(updatedRes); await api.updateMultipleReservations(groupUpdatesList); refreshReservations(); setPendingChange(null); setPendingResize(null); } else { await api.updateReservation(updatedRes); refreshReservations(); setPendingChange(null); setPendingResize(null); } setTimeout(() => { clickBlockerRef.current = false; }, 400); };
  const handleRemoteNav = (dir: 'up' | 'down' | 'left' | 'right') => { if (!scrollContainerRef.current) return; const vStep = rowHeight * settings.navigationStep, hStepStep = settings.navigationStep; if (dir === 'left') setCurrentDate(subDaysLocal(currentDate, hStepStep)); if (dir === 'right') setCurrentDate(addDays(currentDate, hStepStep)); if (dir === 'up') scrollContainerRef.current.scrollTop -= vStep; if (dir === 'down') scrollContainerRef.current.scrollTop += vStep; };
  const toggleFullScreen = () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch((e) => {}); else if (document.exitFullscreen) document.exitFullscreen(); };
  const siblingsCount = useMemo(() => { const resToCompare = pendingResize?.old || pendingChange?.old; if (!resToCompare) return 0; return reservations.filter(r => r.clientId === resToCompare.clientId && r.id !== resToCompare.id && r.status !== ReservationStatus.CANCELLED).length; }, [pendingResize, pendingChange, reservations]);
  const dragDatesChanged = useMemo(() => { if (!pendingChange) return false; return !isSameDay(pendingChange.old.checkIn, pendingChange.new.checkIn) || !isSameDay(pendingChange.old.checkOut, pendingChange.new.checkOut); }, [pendingChange]);
  const getHoverSiblingsCount = (clientId: string, resId: string) => reservations.filter(r => r.clientId === clientId && r.id !== resId && r.status !== ReservationStatus.CANCELLED).length;
  const toggleCategory = (cat: string) => setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  const updateStatusColor = (key: keyof StatusColors, color: string) => {
    setSettings({
      ...settings,
      statusColors: {
        ...(settings.statusColors || {
          confirmed: '#6366f1',
          checkedIn: '#10b981',
          checkedOut: '#64748b',
          option: '#f59e0b',
          cancelled: '#ef4444'
        }),
        [key]: color
      }
    });
  };
  const labelClass = "block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2";

  if (loading) return (<div className="h-screen w-full bg-slate-900 flex items-center justify-center flex-col gap-6"><div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div><p className="text-white font-black uppercase tracking-[0.3em] text-sm animate-pulse">Synchronisation VisioPlanning...</p></div>);

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden text-slate-900 antialiased font-sans">
      <Header title="Visioplanning" actions={<div className="flex items-center gap-2"><button onClick={handleReset} className="bg-white hover:bg-red-50 text-red-600 px-3 py-1 rounded-lg border border-red-200 shadow-sm flex items-center gap-2 text-sm font-bold h-9 transition-all"><RotateCcw size={15} /><span className="hidden xl:inline uppercase tracking-widest text-[9px]">Reset</span></button><button onClick={() => setIsAvailabilityModalOpen(true)} className="bg-white hover:bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg border border-emerald-200 shadow-sm flex items-center gap-2 text-sm font-bold h-9 transition-all"><Table size={15} /><span className="hidden xl:inline uppercase tracking-widest text-[9px]">Ventes</span></button><button onClick={() => { setDailyModalDate(startOfToday()); setIsDailyModalOpen(true); }} className="bg-white hover:bg-slate-50 text-slate-700 px-3 py-1 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2 text-sm font-bold h-9 transition-all"><List size={15} /><span className="hidden xl:inline uppercase tracking-widest text-[9px]">Mouvements</span></button><button onClick={() => setIsNewModalOpen(true)} className="bg-indigo-600 text-white px-3 py-1 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition shadow-lg text-sm font-bold h-9 ml-1"><Plus size={15} /><span className="hidden sm:inline uppercase tracking-widest text-[9px]">Nouveau</span></button><div className="h-6 w-px bg-white/20 mx-2"></div><div className="flex items-center gap-2"><button onClick={() => setIsSettingsModalOpen(true)} className="bg-slate-900 text-white p-2.5 rounded-xl hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center border border-white/10" title="Configuration"><SettingsIcon size={18} /></button><button onClick={toggleFullScreen} className="bg-black text-white p-2.5 rounded-xl hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center border border-white/10" title={isFullScreen ? "Sortir du plein écran" : "Passer en plein écran"}>{isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}</button></div></div>} hideProfile={true} />
      <div className="h-14 border-b border-slate-200/50 flex items-center bg-white shadow-sm z-30 shrink-0"><div className="w-48 pl-4 pr-2 flex items-center shrink-0 border-r border-slate-200/50 h-full"><div className="flex items-center bg-slate-100 rounded-xl p-1 shadow-inner border border-slate-200 w-full justify-between"><button onClick={() => handleNavigate('prev')} className="p-1 hover:bg-white rounded-lg transition-all text-slate-600"><ChevronLeft size={14} /></button><button onClick={() => setCurrentDate(subDaysLocal(startOfToday(), settings.historyOffset))} className="px-2 text-[9px] font-black text-slate-700 hover:text-indigo-600 uppercase tracking-widest transition-colors">Aujourd'hui</button><button onClick={() => handleNavigate('next')} className="p-1 hover:bg-white rounded-lg transition-all text-slate-600"><ChevronRight size={14} /></button></div></div><div className="px-6 text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] whitespace-nowrap">{format(currentDate, 'MMMM', { locale: fr })} <span className="text-slate-300 ml-1 font-bold">{format(currentDate, 'yyyy')}</span></div><div className="flex-1 flex justify-center"><div className="flex items-center bg-slate-100 rounded-xl p-1 shadow-inner border border-slate-200"><button onClick={() => setViewMode('month')} className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'month' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-white/50'}`}>Mois</button><button onClick={() => setViewMode('fortnight')} className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'fortnight' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-white/50'}`}>Quinzaine</button><button onClick={() => setViewMode('week')} className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'week' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-white/50'}`}>Semaine</button></div></div><div className="flex items-center gap-3 pr-4"><div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-200 h-9"><button onClick={() => setZoom(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM))} disabled={zoom <= MIN_ZOOM} className="p-1.5 hover:bg-white rounded-lg shadow-sm transition disabled:opacity-50 text-slate-600"><ZoomOut size={14} /></button><span className="px-1 text-[9px] font-black text-slate-500 w-9 text-center">{zoom}%</span><button onClick={() => setZoom(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM))} disabled={zoom >= MAX_ZOOM} className="p-1.5 hover:bg-white rounded-lg shadow-sm transition disabled:opacity-50 text-slate-600"><ZoomIn size={14} /></button></div><button onClick={() => setIsFilterModalOpen(true)} className="group flex items-center gap-2 bg-slate-50 hover:bg-white text-slate-600 px-4 py-2 rounded-xl border border-slate-200 shadow-sm transition-all h-9"><Filter size={14} className="text-slate-400 group-hover:text-indigo-600" /><span className="text-[10px] font-black uppercase tracking-tight text-slate-800">{selectedCategories.length === 0 ? 'Toutes les catégories' : `${selectedCategories.length} catégorie(s)`}</span><ChevronDown size={12} className="text-slate-300" /></button></div></div>
      <div className="flex-1 overflow-auto relative bg-slate-200" ref={scrollContainerRef} onMouseLeave={() => setHoveredDayIndex(null)}><DndContext onDragEnd={handleDragEnd} onDragStart={() => setIsDraggingGlobal(true)} sensors={sensors}><div className="min-w-max relative pb-12 select-none"><div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md flex border-b border-slate-200/50 shadow-sm" style={{ height: 48 }}><div className="sticky left-0 w-48 shrink-0 bg-slate-50 border-r border-slate-200/50 z-50 flex items-center justify-center font-black text-slate-400 uppercase text-[8px] tracking-[0.4em]">Unités</div><div className="flex">{calendarDays.map((day, i) => { const isHovered = hoveredDayIndex === i; return (<div key={i} style={{ width: cellWidth }} className={`flex-shrink-0 border-r border-slate-200/50 flex flex-col items-center justify-center transition-all duration-150 relative ${isToday(day) ? 'bg-amber-100 text-amber-900 font-black z-10' : isBefore(day, today) && !isToday(day) ? 'bg-slate-200 text-slate-500 opacity-60' : isWeekend(day) ? 'bg-indigo-50/50' : 'text-slate-600 bg-white'} ${isHovered ? 'ring-2 ring-inset ring-indigo-500/30 bg-indigo-50 text-indigo-700 z-20' : ''}`}>{isHovered && <div className="absolute inset-0 bg-indigo-600/5 pointer-events-none" />}<span className={`text-base font-black leading-none ${isHovered ? 'scale-110 transition-transform' : ''}`}>{format(day, 'd')}</span><span className="text-[8px] font-black uppercase mt-0.5 opacity-60">{getDayAbbr(day)}</span></div>); })}</div></div><div className="bg-slate-50 relative">{rooms.length === 0 ? (<div className="p-20 text-center text-slate-400 uppercase font-black text-xs tracking-widest">Aucune chambre configurée dans l'inventaire</div>) : rooms.filter(room => selectedCategories.length === 0 || selectedCategories.includes(room.type)).map((room) => (<div key={room.id} className="flex relative group"><div className={`sticky left-0 w-48 shrink-0 border-r border-b border-slate-200/50 z-30 flex flex-col justify-center px-5 transition-colors duration-150 bg-white group-hover:bg-slate-100`} style={{ height: rowHeight }}><div className="flex justify-between items-center"><span className="font-black text-lg tracking-tighter">{room.number}</span>{settings.showRoomStatus && <div className={`w-2 h-2 rounded-full ${room.status === 'Propre' ? 'bg-emerald-400' : 'bg-orange-400'}`} />}</div><div className="flex justify-between items-center text-[7px] uppercase font-black tracking-widest text-slate-400"><span>{room.type}</span><span>{room.baseRate}€</span></div></div><div className="relative flex border-b border-slate-200/50 min-w-0">{calendarDays.map((day, i) => (<div key={i} style={{ width: cellWidth, height: rowHeight }} className={`flex-shrink-0 border-r border-slate-200/50 transition-colors duration-75 cursor-cell relative ${isWeekend(day) ? 'bg-indigo-50/20' : 'bg-white'} ${isBefore(day, today) && !isToday(day) ? 'bg-slate-200/40' : 'hover:bg-indigo-50/5'}`} onMouseDown={() => handleSelectionStart(room.id, day)} onMouseEnter={() => { handleSelectionMove(room.id, day); setHoveredDayIndex(i); }} />))}{dragSelection && dragSelection.roomId === room.id && (() => { const start = dragSelection.start < dragSelection.end ? dragSelection.start : dragSelection.end, end = dragSelection.start < dragSelection.end ? dragSelection.end : dragSelection.start, diffStart = Number(differenceInDays(start, calendarDays[0])), nightsCount = Number(differenceInDays(end, start)) + 1, isPast = isBefore(start, today) && !isToday(start); return (<div className="absolute top-1 bottom-1 rounded-2xl border-4 border-dashed z-50 flex flex-col items-center justify-center pointer-events-none transition-all duration-300 shadow-2xl" style={{ left: `${(Number(diffStart) + 0.5) * cellWidth}px`, width: `${Number(nightsCount) * cellWidth}px`, backgroundColor: isPast ? 'rgba(127, 29, 29, 0.4)' : `${settings.selectionColor}66`, borderColor: isPast ? '#b91c1c' : settings.selectionColor }}>{isPast ? (<div className="flex items-center gap-2 px-4 py-2 bg-red-900/80 text-white rounded-full"><ShieldAlert size={18} className="animate-pulse"/><span className="text-xs font-black uppercase tracking-widest">Zone Interdite</span></div>) : nightsCount > 1 && (<div className="flex flex-col items-center"><div className="text-slate-900 font-black uppercase text-base leading-none tracking-tighter">{nightsCount} NUITS</div><div className="text-slate-900/60 font-bold tabular-nums text-[10px] mt-1 uppercase tracking-widest">{format(start, 'dd/MM')} - {format(addDays(end, 1), 'dd/MM')}</div></div>)}</div>); })()}{filteredReservations.filter(res => res.roomId === room.id).map(res => { const diffStart = Number(differenceInDays(res.checkIn, calendarDays[0])), duration = Number(differenceInDays(res.checkOut, res.checkIn)); return (<DraggableReservation key={res.id} reservation={res} zoom={zoom} settings={settings} isAnyDragging={isDraggingGlobal || !!resizing} style={{ left: `${(diffStart + 0.5) * cellWidth}px`, width: `${duration * cellWidth}px` }} onHoverStart={(r, x, y) => setHoveredRes({ res: r, x, y })} onHoverEnd={() => setHoveredRes(null)} onClick={(r) => { if (!isBusy && !clickBlockerRef.current) { setSelectedRes(r); setIsModalOpen(true); } }} onResizeStart={onResizeStart} />); })}</div></div>))}</div></div></DndContext></div>
      {hoveredRes && (<div className="fixed z-[500] pointer-events-none bg-white text-slate-800 p-5 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-100 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/5" style={{ left: hoveredRes.x, top: hoveredRes.y }}><div className="flex items-center gap-4 mb-4"><div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-100"><User size={20}/></div><div><h4 className="font-black text-base uppercase tracking-tight text-slate-900">{hoveredRes.res.clientName}</h4><p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-1.5">{hoveredRes.res.status}{getHoverSiblingsCount(hoveredRes.res.clientId, hoveredRes.res.id) > 0 && (<span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full flex items-center gap-1 border border-purple-200"><Users size={10}/> GROUPE</span>)}</p></div></div><div className="space-y-2 border-t border-slate-200/50 pt-4"><div className="grid grid-cols-2 gap-3"><div className="bg-slate-50 p-2 rounded-xl border border-slate-200/50"><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Unité</span><span className="font-black text-slate-700 text-xs flex items-center gap-1.5"><Hash size={12} className="text-indigo-400" /> {rooms.find(r=>r.id===hoveredRes.res.roomId)?.number}</span></div><div className="bg-slate-50 p-2 rounded-xl border border-slate-200/50"><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Formule</span><span className="font-black text-slate-700 text-[10px] flex items-center gap-1.5"><Utensils size={12} className="text-indigo-400" /> {(hoveredRes.res.boardType || 'RO').split(' ')[0]}</span></div></div><div className="flex items-center gap-3 text-xs font-black uppercase text-slate-500 mt-2 px-1"><CalendarIcon size={14} className="text-indigo-400"/><span>{format(hoveredRes.res.checkIn, 'dd MMM')}</span><ArrowRight size={12} className="text-slate-300"/><span>{format(hoveredRes.res.checkOut, 'dd MMM')}</span></div><div className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-400 px-1"><Moon size={14} className="text-indigo-400"/>{differenceInDays(hoveredRes.res.checkOut, hoveredRes.res.checkIn)} nuits • {hoveredRes.res.adults} pers.</div>{getHoverSiblingsCount(hoveredRes.res.clientId, hoveredRes.res.id) > 0 && (<div className="mt-2 bg-purple-50 p-2 rounded-xl border border-purple-100 flex items-center gap-2"><Users size={14} className="text-purple-600" /><span className="text-[9px] font-black text-purple-700 uppercase">+ {getHoverSiblingsCount(hoveredRes.res.clientId, hoveredRes.res.id)} chambres liées</span></div>)}<div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200/50"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valeur Séjour</span><span className="text-lg font-black text-emerald-600">{hoveredRes.res.totalPrice} €</span></div></div></div>)}
      {pendingSelectionConfirm && (<div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"><div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95"><div className="p-6 flex items-center gap-4 text-white" style={{ backgroundColor: settings.selectionColor }}><div className="bg-white/20 p-3 rounded-2xl shadow-lg"><MousePointer2 size={24}/></div><div><h3 className="font-black uppercase tracking-tight text-lg">Nouvelle demande</h3><p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Confirmation de sélection</p></div></div><div className="p-8 text-center"><div className="mb-6 flex flex-col items-center"><div className="w-16 h-16 rounded-3xl bg-slate-50 border-2 border-slate-200/50 flex items-center justify-center mb-4" style={{ color: settings.selectionColor }}><Hash size={32} /></div><p className="text-slate-600 text-sm leading-relaxed font-medium">Voulez-vous bien confirmer la réservation pour <span className="font-black" style={{ color: settings.selectionColor }}>{differenceInDays(pendingSelectionConfirm.end, pendingSelectionConfirm.start) + 1} nuit(s)</span>,<br/>de <span className="font-black text-slate-900">{format(pendingSelectionConfirm.start, 'dd/MM/yyyy')}</span> au <span className="font-black text-slate-900">{format(addDays(pendingSelectionConfirm.end, 1), 'dd/MM/yyyy')}</span>,<br/>pour la chambre <span className="font-black text-slate-900">#{rooms.find(r=>r.id===pendingSelectionConfirm.roomId)?.number}</span> ?</p></div></div><div className="p-6 bg-slate-50 border-t flex gap-4"><button onClick={() => setPendingSelectionConfirm(null)} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-800 transition-colors">Annuler</button><button onClick={confirmSelection} className="flex-1 py-4 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all flex items-center justify-center gap-2" style={{ backgroundColor: settings.selectionColor }}><Check size={18} strokeWidth={3}/> Confirmer</button></div></div></div>)}
      {pendingChange && (<div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"><div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95"><div className={`${pendingChange.old.status === ReservationStatus.CHECKED_IN ? 'bg-emerald-600' : 'bg-indigo-600'} text-white p-6 flex items-center gap-4 transition-colors`}><div className="bg-white/20 p-3 rounded-2xl">{pendingChange.old.status === ReservationStatus.CHECKED_IN ? <DoorOpen size={24}/> : <RefreshCw size={24} />}</div><div><h3 className="font-black uppercase tracking-tight text-lg">{pendingChange.old.status === ReservationStatus.CHECKED_IN ? 'Confirmer le délogement ?' : 'Confirmer le déplacement ?'}</h3><p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Mise à jour du planning</p></div></div><div className="p-8 space-y-6">{groupConflict && (<div className="bg-red-50 border-l-4 border-red-500 p-4 mx-8 mt-6 flex items-center gap-3 animate-bounce"><AlertTriangle className="text-red-500 shrink-0" size={20}/><p className="text-xs font-bold text-red-800">{groupConflict}</p></div>)}{pendingChange.old.roomId !== pendingChange.new.roomId && (<div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/50 flex items-center justify-between"><div className="text-center flex-1"><span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Ch. Actuelle</span><span className="font-black text-slate-800 text-lg">#{rooms.find(r=>r.id===pendingChange.old.roomId)?.number}</span></div><div className="px-4 text-indigo-600"><MoveRight size={20}/></div><div className="text-center flex-1"><span className="text-[9px] font-black text-indigo-400 uppercase block mb-1">Ch. Nouvelle</span><span className="font-black text-indigo-600 text-lg">#{rooms.find(r=>r.id===pendingChange.new.roomId)?.number}</span></div></div>)}{dragDatesChanged && (pendingChange.old.status === ReservationStatus.CHECKED_IN ? (<div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/50 space-y-4"><div className="flex justify-between items-center text-sm"><span className="text-slate-400 font-bold uppercase text-[10px]">Départ initial</span><span className="font-black text-slate-600">{format(pendingChange.old.checkOut, 'dd/MM/yyyy')}</span></div><div className="h-px bg-slate-200"></div><div className="flex justify-between items-center text-sm"><span className="text-indigo-50 font-bold uppercase text-[10px]">Nouveau départ</span><span className="font-black text-indigo-600">{format(pendingChange.new.checkOut, 'dd/MM/yyyy')}</span></div></div>) : (<div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 space-y-3"><div className="text-center mb-2"><p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Nouveau séjour</p><p className="text-lg font-black text-indigo-700">{format(pendingChange.new.checkIn, 'dd MMM')} → {format(pendingChange.new.checkOut, 'dd MMM')}</p></div><div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400"><span>{differenceInDays(pendingChange.new.checkOut, pendingChange.new.checkIn)} nuits</span><span>{rooms.find(r=>r.id===pendingChange.new.roomId)?.type}</span></div></div>))}{dragDatesChanged && siblingsCount > 0 && !groupConflict && (<div className="bg-indigo-50 p-5 rounded-3xl border border-indigo-100 flex items-start gap-4"><div className="p-2 bg-white rounded-xl shadow-sm text-indigo-600"><Users size={20}/></div><div><p className="text-xs font-black text-indigo-800 uppercase tracking-tight">Dossier de groupe ({siblingsCount} autres ch.)</p><p className="text-[10px] text-indigo-600 font-medium leading-relaxed mt-1">Voulez-vous déplacer l'ensemble du groupe vers ces nouvelles dates ?</p></div></div>)}</div><div className="p-6 bg-slate-50 border-t flex flex-col gap-3"><div className="flex gap-3 w-full"><button onClick={() => { setReservations(prev => prev.map(r => r.id === pendingChange.old.id ? pendingChange.old : r)); setPendingChange(null); setGroupConflict(null); }} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-800">Annuler</button><button onClick={async () => { await updateReservationState(pendingChange.new, false); }} className={`flex-1 py-4 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 ${pendingChange.old.status === ReservationStatus.CHECKED_IN ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>{dragDatesChanged ? `Juste Ch. ${rooms.find(r=>r.id===pendingChange.new.roomId)?.number}` : "Confirmer le changement"}</button></div>{dragDatesChanged && siblingsCount > 0 && !groupConflict && (<button onClick={async () => { await updateReservationState(pendingChange.new, true); }} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"><Split size={16} /> Appliquer à tout le groupe</button>)}</div></div></div>)}
      {pendingResize && (<div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"><div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95"><div className="bg-emerald-600 text-white p-6 flex items-center gap-4"><div className="bg-white/20 p-3 rounded-2xl"><Maximize size={24}/></div><div><h3 className="font-black uppercase tracking-tight text-lg">Confirmer la modification ?</h3><p className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest">Ajustement de la durée du séjour</p></div></div><div className="p-8 space-y-6">{groupConflict && (<div className="bg-red-50 border-l-4 border-red-500 p-4 mx-8 mt-6 flex items-center gap-3 animate-bounce"><AlertTriangle className="text-red-500 shrink-0" size={20}/><p className="text-xs font-bold text-red-800">{groupConflict}</p></div>)}{pendingResize.old.status === ReservationStatus.CHECKED_IN ? (<div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/50 space-y-4"><div className="flex justify-between items-center text-sm"><span className="text-slate-400 font-bold uppercase text-[10px]">Départ initial</span><span className="font-black text-slate-600">{format(pendingResize.old.checkOut, 'dd MMMM yyyy', { locale: fr })}</span></div><div className="h-px bg-slate-200"></div><div className="flex justify-between items-center text-sm"><span className="text-indigo-50 font-bold uppercase text-[10px]">Nouveau départ</span><span className="font-black text-indigo-600">{format(pendingResize.new.checkOut, 'dd MMMM yyyy', { locale: fr })}</span></div></div>) : (<div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 space-y-3 text-center"><p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Nouvelles dates de séjour</p><p className="text-xl font-black text-indigo-700">{format(pendingResize.new.checkIn, 'dd MMM')} → {format(pendingResize.new.checkOut, 'dd MMM')}</p><div className="pt-2 border-t border-indigo-100 text-[10px] font-black text-slate-400 uppercase">Nouvelle durée : {differenceInDays(pendingResize.new.checkOut, pendingResize.new.checkIn)} nuits</div></div>)}{siblingsCount > 0 && !groupConflict && (<div className="bg-indigo-50 p-5 rounded-3xl border border-indigo-100 flex items-start gap-4"><div className="p-2 bg-white rounded-xl shadow-sm text-indigo-600"><Users size={20}/></div><div><p className="text-xs font-black text-indigo-800 uppercase tracking-tight">Dossier de groupe ({siblingsCount} autres ch.)</p><p className="text-[10px] text-indigo-600 font-medium leading-relaxed mt-1">Voulez-vous aligner l'ensemble du groupe sur cette nouvelle date ?</p></div></div>)}</div><div className="p-6 bg-slate-50 border-t flex flex-col gap-3"><div className="flex gap-3 w-full"><button onClick={() => { setReservations(prev => prev.map(r => r.id === pendingResize.old.id ? pendingResize.old : r)); setPendingResize(null); setGroupConflict(null); }} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-800">Annuler</button><button onClick={async () => { await updateReservationState(pendingResize.new, false); }} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">Juste Ch. {rooms.find(r=>r.id===pendingResize.new.roomId)?.number}</button></div>{siblingsCount > 0 && !groupConflict && (<button onClick={async () => { await updateReservationState(pendingResize.new, true); }} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"><Split size={16} /> Appliquer à tout le groupe</button>)}</div></div></div>)}
      {isFilterModalOpen && (<div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4 animate-in fade-in duration-200"><div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-[340px] overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300"><div className="p-5 border-b bg-slate-50/80 flex justify-between items-center"><div className="flex items-center gap-2"><Filter size={16} className="text-indigo-600" /><h3 className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Catégories</h3></div><button onClick={() => setIsFilterModalOpen(false)} className="p-1 hover:bg-white rounded-lg text-slate-400 transition-colors"><X size={18} /></button></div><div className="p-4 space-y-1.5 max-h-[60vh] overflow-y-auto bg-white">{roomCategories.map(type => { const isSelected = selectedCategories.includes(type); return (<label key={type} className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all border-2 ${isSelected ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-50 hover:border-slate-200/50 hover:bg-slate-50'}`}><div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>{isSelected && <Check size={14} className="text-white" strokeWidth={4} />}</div><input type="checkbox" className="hidden" checked={isSelected} onChange={() => toggleCategory(type)}/><span className={`text-[11px] font-black uppercase tracking-tight ${isSelected ? 'text-indigo-700' : 'text-slate-600'}`}>{type}</span></label>); })}</div><div className="p-5 border-t bg-slate-50 flex justify-between items-center gap-3"><button onClick={() => setSelectedCategories([])} className="text-[9px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors">Désélectionner</button><button onClick={() => setIsFilterModalOpen(false)} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">Appliquer</button></div></div></div>)}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-center bg-white text-slate-800 p-3 rounded-[2rem] shadow-2xl border border-slate-100 group transition-all hover:scale-105 active:scale-95"><div className="flex flex-col items-center gap-1"><button onClick={() => handleRemoteNav('up')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-indigo-600" title="Monter"><ArrowUp size={20} /></button><div className="flex items-center gap-1"><button onClick={() => handleRemoteNav('left')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-indigo-600" title="Reculer"><ArrowLeft size={20} /></button><div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-indigo-200"><Navigation size={14} className="fill-current"/></div><button onClick={() => handleRemoteNav('right')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-indigo-600" title="Avancer"><ArrowRight size={20} /></button></div><button onClick={() => handleRemoteNav('down')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-indigo-600" title="Descendre"><ArrowDown size={20} /></button></div><div className="mt-2 pt-2 border-t border-slate-200/50 w-full flex justify-center"><span className="text-[7px] font-black uppercase tracking-widest text-slate-400">Navigation Pad</span></div></div>
      {isModalOpen && selectedRes && ( <ReservationModal reservation={selectedRes} allReservations={reservations} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} rooms={rooms} onSave={async (updated) => { if (updated) await api.updateReservation(updated); await refreshReservations(); return true; }} /> )}
      <NewReservationModal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} onSuccess={() => { refreshReservations(); setIsNewModalOpen(false); }} rooms={rooms} existingReservations={reservations} initialData={null} />
      {isQuickModalOpen && quickModalInitialData && (<QuickReservationModal isOpen={isQuickModalOpen} onClose={() => setIsQuickModalOpen(false)} onSuccess={async (created, openDetail) => { await refreshReservations(); setIsQuickModalOpen(false); if (created && openDetail) { setSelectedRes(created); setIsModalOpen(true); } }} rooms={rooms} existingReservations={reservations} initialData={quickModalInitialData} />)}
      {isSettingsModalOpen && (<div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"><div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 animate-in zoom-in-95"><div className="bg-slate-900 text-white p-6 flex justify-between items-center"><div className="flex items-center gap-3"><SettingsIcon className="text-indigo-400" /><h3 className="font-black uppercase tracking-tight text-lg">Réglages Planning</h3></div><button onClick={() => setIsSettingsModalOpen(false)} className="hover:bg-white/10 p-1 rounded-full"><X size={24}/></button></div><div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto"><div className="space-y-4"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Ouverture par défaut</label><div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner"><button onClick={() => setSettings({...settings, defaultView: 'month'})} className={`py-3 text-[10px] font-black uppercase rounded-xl transition-all ${settings.defaultView === 'month' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-white/50'}`}>Mois</button><button onClick={() => setSettings({...settings, defaultView: 'fortnight'})} className={`py-3 text-[10px] font-black uppercase rounded-xl transition-all ${settings.defaultView === 'fortnight' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-white/50'}`}>Quinzaine</button><button onClick={() => setSettings({...settings, defaultView: 'week'})} className={`py-3 text-[10px] font-black uppercase rounded-xl transition-all ${settings.defaultView === 'week' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-white/50'}`}>Semaine</button></div></div><div className="space-y-4"><div className="flex justify-between items-center"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Zoom de l'interface</label><span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{settings.defaultZoom}%</span></div><input type="range" min="50" max="200" step="10" className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-100 rounded-lg appearance-none" value={settings.defaultZoom} onChange={(e) => setSettings({...settings, defaultZoom: parseInt(e.target.value)})} /></div><div className="space-y-4 border-t border-slate-200/50 pt-8"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Palette size={14}/> Couleur du sélecteur (Voile)</label><div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"><div><div className="flex flex-wrap gap-2">{PRESET_SELECTION_COLORS.map(c => (<button key={c.value} onClick={() => setSettings({...settings, selectionColor: c.value})} className={`w-9 h-9 rounded-xl border-2 transition-all ${settings.selectionColor === c.value ? 'border-slate-900 ring-2 ring-slate-100 scale-110' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'}`} style={{ backgroundColor: c.value }} title={c.name}/>))}</div></div><div className="bg-slate-50/50 rounded-3xl p-6 border-2 border-dashed border-slate-200 flex flex-col items-center"><span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mb-3">Aperçu du rendu</span><div className="w-full h-16 rounded-2xl border-4 border-dashed flex flex-col items-center justify-center transition-all duration-300 shadow-xl" style={{ backgroundColor: `${settings.selectionColor}66`, borderColor: settings.selectionColor }}><div className="text-slate-900 font-black uppercase text-sm leading-none tracking-tighter">6 NUITS</div><div className="text-slate-900/60 font-bold tabular-nums text-[9px] mt-0.5 uppercase tracking-widest">30/12 - 05/01</div></div></div></div></div><div className="space-y-4 pt-4 border-t border-slate-200/50"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Droplet size={16} className="text-indigo-600"/> Nuanciers PMS (Couleurs des statuts)</label><div className="space-y-3">{(['confirmed', 'checkedIn', 'checkedOut', 'option', 'cancelled'] as const).map(statusKey => { const isExpanded = expandedStatusColor === statusKey; return (<div key={statusKey} className={`rounded-3xl border transition-all duration-300 ${isExpanded ? 'bg-slate-50 border-indigo-200 shadow-inner p-6' : 'bg-white border-slate-200 p-4 hover:border-indigo-300 cursor-pointer'}`} onClick={() => !isExpanded && setExpandedStatusColor(statusKey)}><div className="flex items-center justify-between"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-2xl shadow-sm border-2 border-white flex items-center justify-center transition-transform hover:scale-110" style={{ backgroundColor: settings.statusColors?.[statusKey] || (statusKey === 'confirmed' ? '#6366f1' : statusKey === 'checkedIn' ? '#10b981' : statusKey === 'checkedOut' ? '#64748b' : statusKey === 'option' ? '#f59e0b' : '#ef4444') }}>{isExpanded && <Droplet size={14} className="text-white drop-shadow-md"/>}</div><span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">{statusKey === 'confirmed' ? 'Réservé / Confirmé' : statusKey === 'checkedIn' ? 'Arrivé / En séjour' : statusKey === 'checkedOut' ? 'Parti / Historique' : statusKey === 'option' ? 'Option / Devis' : 'Annulé'}</span></div><button onClick={(e) => { e.stopPropagation(); setExpandedStatusColor(isExpanded ? null : statusKey); }} className="text-slate-300 hover:text-indigo-600 transition-colors">{isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</button></div>{isExpanded && (<div className="mt-8 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300"><div className="space-y-4">{COLOR_SPECTRES.map((spectre, sIdx) => (<div key={sIdx} className="space-y-2"><span className="text-[8px] font-bold text-slate-400 uppercase ml-1">{spectre.name}</span><div className="flex flex-wrap gap-2">{spectre.colors.map(color => (<button key={color} onClick={(e) => { e.stopPropagation(); updateStatusColor(statusKey, color); }} className={`w-8 h-8 rounded-xl border-2 transition-all hover:scale-125 ${settings.statusColors?.[statusKey] === color ? 'border-slate-900 ring-2 ring-white scale-110 shadow-lg z-10' : 'border-transparent shadow-sm'}`} style={{ backgroundColor: color }}/>))}</div></div>))}<div className="pt-4 border-t border-slate-200"><label className="text-[8px] font-bold text-slate-400 uppercase ml-1 mb-2 block">Couleur libre (Pipette) :</label><input type="color" value={settings.statusColors?.[statusKey] || '#6366f1'} onChange={e => updateStatusColor(statusKey, e.target.value)} className="w-full h-10 rounded-xl border-2 border-white shadow-sm cursor-pointer" onClick={(e) => e.stopPropagation()}/></div></div></div>)}</div>); })}</div><p className="text-[8px] text-slate-400 uppercase font-bold italic mt-4 text-center">Note : Une couleur de séjour personnalisée restera prioritaire sur ces standards.</p></div><div className="space-y-4 border-t border-slate-200/50 pt-8"><label className={labelClass}><Layout size={14}/> Style des bandes de séjour</label><div className="grid grid-cols-2 gap-4 p-1.5 bg-slate-100 rounded-2xl border border-slate-200"><button onClick={() => setSettings({...settings, barStyle: 'translucent'})} className={`flex flex-col items-center gap-2 py-4 rounded-xl transition-all ${settings.barStyle === 'translucent' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-white/50'}`}><div className="flex h-8 w-24 rounded-lg overflow-hidden border border-slate-200"><div className="w-1.5 h-full bg-indigo-600"></div><div className="flex-1 bg-indigo-50"></div></div><span className="text-[10px] font-black uppercase">Translucide</span></button><button onClick={() => setSettings({...settings, barStyle: 'solid'})} className={`flex flex-col items-center gap-2 py-4 rounded-xl transition-all ${settings.barStyle === 'solid' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-white/50'}`}><div className="flex h-8 w-24 rounded-lg overflow-hidden border border-slate-200 shadow-sm"><div className="w-1.5 h-full bg-indigo-700"></div><div className="flex-1 bg-indigo-600"></div></div><span className="text-[10px] font-black uppercase">Plein (Opaque)</span></button></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-200/50"><div className="space-y-4"><div className="flex justify-between items-center"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Historique (j.)</label><span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{settings.historyOffset} j.</span></div><input type="range" min="0" max="30" step="1" className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none" value={settings.historyOffset} onChange={(e) => setSettings({...settings, historyOffset: parseInt(e.target.value)})} /></div><div className="space-y-4"><div className="flex justify-between items-center"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Vitesse Navigation</label><span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">x{settings.navigationStep}</span></div><input type="range" min="1" max="10" step="1" className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none" value={settings.navigationStep} onChange={(e) => setSettings({...settings, navigationStep: parseInt(e.target.value)})} /></div></div><div className="pt-4 border-t border-slate-200/50"><label className="flex items-center justify-between cursor-pointer p-4 bg-slate-50 rounded-2xl border border-slate-200/50 hover:bg-slate-100 transition-colors"><div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${settings.showRoomStatus ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}><CheckCircle2 size={18} /></div><div><span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">Statut des unités</span><p className="text-[8px] text-slate-400 uppercase font-bold">Afficher l'état de propreté à gauche.</p></div></div><button onClick={(e) => { e.preventDefault(); setSettings({...settings, showRoomStatus: !settings.showRoomStatus}); }} className={`w-12 h-6 rounded-full transition-all relative ${settings.showRoomStatus ? 'bg-indigo-600' : 'bg-slate-300'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${settings.showRoomStatus ? 'left-7' : 'left-1'}`} /></button></label></div></div><div className="p-6 bg-slate-50 border-t flex justify-end gap-3"><button onClick={() => setIsSettingsModalOpen(false)} className="px-6 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-800">Annuler</button><button onClick={() => { api.updatePlanningSettings(settings); setZoom(settings.defaultZoom); setViewMode(settings.defaultView); setIsSettingsModalOpen(false); }} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">Appliquer</button></div></div></div>)}
      <DailyPlanningModal isOpen={isDailyModalOpen} onClose={() => setIsDailyModalOpen(false)} date={dailyModalDate} reservations={reservations} rooms={rooms} />
      <AvailabilityModal isOpen={isAvailabilityModalOpen} onClose={() => setIsAvailabilityModalOpen(false)} rooms={rooms} reservations={reservations} />
    </div>
  );
};

export default Planning;
