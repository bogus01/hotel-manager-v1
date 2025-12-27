
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BedDouble, Plus, Edit, Trash2, X, ArrowUp, ArrowDown, 
  LayoutList, Layers, Tag, Users, Check, 
  AlertCircle, Info, TrendingUp, Search, Filter, RotateCcw
} from 'lucide-react';
import Header from '../components/Header';
import { Room, RoomCategory, PricingModel } from '../types';
import * as api from '../services/api';

type SortConfig = {
    key: keyof Room;
    direction: 'asc' | 'desc';
};

const SettingsRooms: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'rooms' | 'categories'>('rooms');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [categories, setCategories] = useState<RoomCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterFloor, setFilterFloor] = useState('all');
  const [filterModel, setFilterModel] = useState('all');
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomModalError, setRoomModalError] = useState<string | null>(null);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<RoomCategory | null>(null);
  const [catPricingModel, setCatPricingModel] = useState<PricingModel>('fixed');
  const [catCapacity, setCatCapacity] = useState<number>(2);
  const [catOccupancyPrices, setCatOccupancyPrices] = useState<Record<number, number>>({});
  const [roomSelectedType, setRoomSelectedType] = useState<string>('');
  const [roomFixedCapacity, setRoomFixedCapacity] = useState<number>(2);
  const [roomPricingModel, setRoomPricingModel] = useState<PricingModel>('fixed');
  const [roomOccupancyPrices, setRoomOccupancyPrices] = useState<Record<number, number>>({});
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'number', direction: 'asc' });
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    api.fetchRooms().then(setRooms);
    api.fetchRoomCategories().then(setCategories);
  };

  const requestSort = (key: keyof Room) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
      setSortConfig({ key, direction });
  };

  const filteredAndSortedRooms = useMemo(() => {
      let result = rooms.filter(room => {
          const matchesSearch = room.number.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesType = filterType === 'all' || room.type === filterType;
          const matchesFloor = filterFloor === 'all' || room.floor.toString() === filterFloor;
          const matchesModel = filterModel === 'all' || room.pricingModel === filterModel;
          return matchesSearch && matchesType && matchesFloor && matchesModel;
      });
      result.sort((a, b) => {
          const aVal = a[sortConfig.key];
          const bVal = b[sortConfig.key];
          if (aVal === undefined) return 1;
          if (bVal === undefined) return -1;
          if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
      });
      return result;
  }, [rooms, sortConfig, searchQuery, filterType, filterFloor, filterModel]);

  const uniqueFloors = useMemo(() => Array.from(new Set(rooms.map(r => r.floor.toString()))).sort(), [rooms]);

  const handleRoomEdit = (room: Room) => {
      setEditingRoom(room);
      setRoomModalError(null);
      setRoomSelectedType(room.type);
      setRoomFixedCapacity(room.capacity);
      setRoomPricingModel(room.pricingModel || 'fixed');
      setRoomOccupancyPrices(room.occupancyPrices || { [room.capacity]: room.baseRate });
      setIsRoomModalOpen(true);
  };
  
  const handleRoomCreate = () => {
      setEditingRoom(null);
      setRoomModalError(null);
      const defaultCat = categories[0];
      setRoomSelectedType(defaultCat?.name || '');
      setRoomFixedCapacity(defaultCat?.defaultCapacity || 2);
      setRoomPricingModel(defaultCat?.pricingModel || 'fixed');
      setRoomOccupancyPrices(defaultCat?.occupancyPrices || { 1: 80, 2: 95 });
      setIsRoomModalOpen(true);
  };

  const handleRoomSave = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setRoomModalError(null);
      const formData = new FormData(e.currentTarget);
      const num = formData.get('number') as string;
      const fl = parseInt(formData.get('floor') as string);
      const typ = roomSelectedType;

      const isDuplicate = rooms.some(r => r.id !== editingRoom?.id && r.number === num && r.floor === fl && r.type === typ);
      if (isDuplicate) { setRoomModalError(`La chambre n°${num} existe déjà à l'étage ${fl}.`); return; }

      const currentBaseRate = roomPricingModel === 'fixed' ? parseFloat(formData.get('baseRate') as string) : (roomOccupancyPrices[roomFixedCapacity] || 0);
      const roomData = { number: num, type: typ, floor: fl, capacity: roomFixedCapacity, baseRate: currentBaseRate, pricingModel: roomPricingModel, occupancyPrices: roomPricingModel === 'fixed' ? { [roomFixedCapacity]: currentBaseRate } : roomOccupancyPrices };

      if (editingRoom) await api.updateRoom({ ...editingRoom, ...roomData });
      else await api.createRoom(roomData);
      setIsRoomModalOpen(false);
      loadData();
  };

  /* Added missing handleRoomTypeChange function to fix compilation error and update pricing logic when switching category */
  const handleRoomTypeChange = (typeName: string) => {
      setRoomSelectedType(typeName);
      const cat = categories.find(c => c.name === typeName);
      if (cat) {
          setRoomFixedCapacity(cat.defaultCapacity);
          setRoomPricingModel(cat.pricingModel);
          setRoomOccupancyPrices({ ...(cat.occupancyPrices || {}) });
      }
  };

  /* Added missing handleCatCreate function to fix compilation error and reset category modal state */
  const handleCatCreate = () => {
      setEditingCat(null);
      setCatPricingModel('fixed');
      setCatCapacity(2);
      setCatOccupancyPrices({ 1: 80, 2: 95 });
      setIsCatModalOpen(true);
  };

  const handleCatEdit = (cat: RoomCategory) => {
      setEditingCat(cat);
      setCatPricingModel(cat.pricingModel);
      setCatCapacity(cat.defaultCapacity);
      setCatOccupancyPrices(cat.occupancyPrices || {});
      setIsCatModalOpen(true);
  };

  const handleCatSave = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const maxPrice = catPricingModel === 'fixed' ? parseFloat(formData.get('defaultBaseRate') as string) : (catOccupancyPrices[catCapacity] || 0);
      const catData = { name: formData.get('name') as string, defaultCapacity: catCapacity, defaultBaseRate: maxPrice, pricingModel: catPricingModel, occupancyPrices: catPricingModel === 'fixed' ? { [catCapacity]: maxPrice } : catOccupancyPrices, color: formData.get('color') as string };
      if (editingCat) await api.updateRoomCategory({ ...editingCat, ...catData });
      else await api.createRoomCategory(catData);
      setIsCatModalOpen(false);
      loadData();
  };

  const labelClass = "block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1";
  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all";

  const SortableHeader = ({ label, sortKey, align = 'left' }: { label: string, sortKey: keyof Room, align?: string }) => (
      <th className={`px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors select-none text-${align} group`} onClick={() => requestSort(sortKey)}>
          <div className={`flex items-center gap-2 ${align === 'right' ? 'justify-end' : (align === 'center' ? 'justify-center' : 'justify-start')}`}>
              <span className="font-black text-[10px] uppercase tracking-widest text-slate-500 group-hover:text-indigo-600">{label}</span>
              {sortConfig.key === sortKey && <span className="text-indigo-600">{sortConfig.direction === 'asc' ? <ArrowUp size={14}/> : <ArrowDown size={14}/>}</span>}
          </div>
      </th>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased">
      <Header title="Chambres & Tarifs" backLink="/settings" backLabel="Paramètres" />
      
      <div className="flex-1 max-w-7xl mx-auto w-full p-8 space-y-8 pb-32">
        <div className="flex gap-1 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <button onClick={() => setActiveTab('rooms')} className={`flex-1 py-3 px-6 rounded-xl flex items-center justify-center gap-3 transition-all font-black text-[10px] uppercase tracking-widest ${activeTab === 'rooms' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><LayoutList size={16}/> Registre Unités</button>
            <button onClick={() => setActiveTab('categories')} className={`flex-1 py-3 px-6 rounded-xl flex items-center justify-center gap-3 transition-all font-black text-[10px] uppercase tracking-widest ${activeTab === 'categories' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><Layers size={16}/> Modèles & Catégories</button>
        </div>

        {activeTab === 'rooms' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2"><BedDouble size={18} className="text-indigo-600"/> Inventaire du Parc Hôtelier</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Configuration physique et prix par unité</p>
                    </div>
                    <button onClick={handleRoomCreate} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center gap-2"><Plus size={16}/> Ajouter Unité</button>
                </div>

                <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-end gap-4 bg-white no-print">
                    <div className="flex-1 min-w-[200px]"><label className={labelClass}>Recherche n°</label><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14}/><input placeholder="Saisir n°..." className={`${inputClass} pl-9 !py-2`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}/></div></div>
                    <div className="w-44"><label className={labelClass}>Catégorie</label><select className={`${inputClass} !py-2`} value={filterType} onChange={e => setFilterType(e.target.value)}><option value="all">Toutes</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                    <div className="w-28"><label className={labelClass}>Étage</label><select className={`${inputClass} !py-2`} value={filterFloor} onChange={e => setFilterFloor(e.target.value)}><option value="all">Tous</option>{uniqueFloors.map(f => <option key={f} value={f}>Étage {f}</option>)}</select></div>
                    <button onClick={() => { setSearchQuery(''); setFilterType('all'); setFilterFloor('all'); setFilterModel('all'); }} className="p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl border border-slate-200 transition-all"><RotateCcw size={16}/></button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                            <tr><SortableHeader label="N°" sortKey="number" /><SortableHeader label="Type" sortKey="type" /><SortableHeader label="Étage" sortKey="floor" /><SortableHeader label="Modèle" sortKey="pricingModel" align="center" /><SortableHeader label="Tarif Réf." sortKey="baseRate" align="right" /><SortableHeader label="Capacité" sortKey="capacity" align="center" /><th className="px-6 py-4 text-right">Actions</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredAndSortedRooms.map(room => (
                                <tr key={room.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-6 py-4 font-black text-[15px] text-slate-900 tabular-nums">#{room.number}</td>
                                    <td className="px-6 py-4"><span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 text-[9px] font-black uppercase border border-slate-200">{room.type}</span></td>
                                    <td className="px-6 py-4 text-[13px] font-bold text-slate-500 tabular-nums">{room.floor}</td>
                                    <td className="px-6 py-4 text-center"><span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${room.pricingModel === 'flexible' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>{room.pricingModel === 'flexible' ? 'Flex' : 'Fixe'}</span></td>
                                    <td className="px-6 py-4 text-right font-black text-emerald-600 text-[13px] tabular-nums">{room.pricingModel === 'flexible' ? `Dès ${(room.occupancyPrices[1] || room.baseRate).toFixed(2)} €` : `${room.baseRate.toFixed(2)} €`}</td>
                                    <td className="px-6 py-4 text-center text-slate-500 font-bold flex items-center justify-center gap-2 text-[13px]">{room.capacity} <Users size={14} className="text-slate-300"/></td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleRoomEdit(room)} className="p-1.5 hover:bg-indigo-50 text-slate-300 hover:text-indigo-600 rounded-lg transition-all"><Edit size={16}/></button>
                                            <button onClick={() => setDeletingRoomId(room.id)} className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-600 rounded-lg transition-all"><Trash2 size={16}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {activeTab === 'categories' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <div>
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2"><Layers size={18} className="text-indigo-600"/> Modèles & Types de Chambres</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Héritage des tarifs et capacités par défaut</p>
                    </div>
                    <button onClick={handleCatCreate} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 shadow-lg transition-all flex items-center gap-2"><Plus size={16}/> Nouveau Modèle</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                            <tr><th className="px-6 py-4">Désignation Commerciale</th><th className="px-6 py-4 text-center">Gestion Prix</th><th className="px-6 py-4 text-center">Standard Pax</th><th className="px-6 py-4 text-right">Référence TTC</th><th className="px-6 py-4 text-center">Label</th><th className="px-6 py-4 text-right">Actions</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {categories.map(cat => (
                                <tr key={cat.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4 font-black text-slate-800 uppercase text-[13px] tracking-tight">{cat.name}</td>
                                    <td className="px-6 py-4 text-center"><span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${cat.pricingModel === 'fixed' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-purple-50 text-purple-600 border-purple-200'}`}>{cat.pricingModel === 'fixed' ? 'Fixe' : 'Flexible'}</span></td>
                                    <td className="px-6 py-4 text-center text-slate-500 font-bold text-[13px]">{cat.defaultCapacity} pax.</td>
                                    <td className="px-6 py-4 text-right font-black text-emerald-600 text-[13px]">{cat.defaultBaseRate.toFixed(2)} €</td>
                                    <td className="px-6 py-5"><div className="flex justify-center"><div className="w-4 h-4 rounded shadow-sm border border-white" style={{ backgroundColor: cat.color }}></div></div></td>
                                    <td className="px-6 py-4 text-right"><div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => handleCatEdit(cat)} className="p-1.5 hover:bg-indigo-50 text-slate-300 hover:text-indigo-600 rounded-lg"><Edit size={16}/></button><button onClick={() => setDeletingCatId(cat.id)} className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-600 rounded-lg"><Trash2 size={16}/></button></div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
      </div>

      {isRoomModalOpen && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <form onSubmit={handleRoomSave} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300 border border-white/20 flex flex-col">
                  <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                          <div className="bg-indigo-600 p-2 rounded-xl"><BedDouble size={22}/></div>
                          <div><h3 className="font-black uppercase tracking-tight text-base">{editingRoom ? 'Configuration Unité' : 'Nouvelle Unité'}</h3><p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">Inventaire chambres</p></div>
                      </div>
                      <button type="button" onClick={() => setIsRoomModalOpen(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors"><X size={24}/></button>
                  </div>
                  <div className="p-10 space-y-6 overflow-y-auto">
                      {roomModalError && <div className="bg-red-50 border-l-4 border-red-500 p-4 flex items-center gap-3"><AlertCircle className="text-red-500" size={18} /><p className="text-xs font-bold text-red-800">{roomModalError}</p></div>}
                      <div className="grid grid-cols-2 gap-6">
                          <div><label className={labelClass}>Numéro de chambre</label><input required name="number" defaultValue={editingRoom?.number} className={`${inputClass} text-base h-11`} placeholder="Ex: 101" /></div>
                          <div><label className={labelClass}>Étage / Niveau</label><input required name="floor" type="number" defaultValue={editingRoom?.floor || 1} className={`${inputClass} text-base h-11`} /></div>
                      </div>
                      <div><label className={labelClass}>Modèle / Type de chambre</label><select value={roomSelectedType} onChange={(e) => handleRoomTypeChange(e.target.value)} className={`${inputClass} h-11`}>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                          {roomPricingModel === 'fixed' ? (
                              <div><label className={labelClass}>Tarif Fixe par nuit (€)</label><input required name="baseRate" type="number" step="0.01" defaultValue={editingRoom?.baseRate} className={`${inputClass} !bg-white text-lg h-12 text-emerald-600`} /></div>
                          ) : (
                              <div className="space-y-4">
                                  <h4 className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 mb-2"><TrendingUp size={14}/> Grille tarifaire par occupant</h4>
                                  <div className="grid grid-cols-2 gap-3">
                                      {Array.from({ length: roomFixedCapacity }).map((_, i) => {
                                          const count = i + 1;
                                          return (<div key={count} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between"><span className="text-[11px] font-bold text-slate-500">{count} Pax</span><input type="number" className="w-20 bg-slate-50 border-none text-right font-black text-emerald-600 rounded text-sm" value={roomOccupancyPrices[count] || ''} onChange={(e) => setRoomOccupancyPrices(prev => ({ ...prev, [count]: parseFloat(e.target.value) || 0 }))} /></div>);
                                      })}
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
                  <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
                      <button type="button" onClick={() => setIsRoomModalOpen(false)} className="px-6 py-2 text-slate-400 font-black uppercase text-[10px] tracking-widest">Annuler</button>
                      <button type="submit" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-100 hover:bg-indigo-700 flex items-center gap-2"><Check size={18}/> Enregistrer l'unité</button>
                  </div>
              </form>
          </div>
      )}

      {/* Added Category Configuration Modal to support handleCatCreate and handleCatEdit */}
      {isCatModalOpen && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <form onSubmit={handleCatSave} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300 border border-white/20 flex flex-col">
                  <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                          <div className="bg-indigo-600 p-2 rounded-xl"><Layers size={22}/></div>
                          <div><h3 className="font-black uppercase tracking-tight text-base">{editingCat ? 'Modifier Modèle' : 'Nouveau Modèle'}</h3><p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">Catégories d'hébergement</p></div>
                      </div>
                      <button type="button" onClick={() => setIsCatModalOpen(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors"><X size={24}/></button>
                  </div>
                  <div className="p-10 space-y-6 overflow-y-auto">
                      <div><label className={labelClass}>Nom de la catégorie</label><input required name="name" defaultValue={editingCat?.name} className={`${inputClass} text-base h-11`} placeholder="Ex: Suite Deluxe" /></div>
                      <div className="grid grid-cols-2 gap-6">
                        <div><label className={labelClass}>Capacité par défaut</label><input required name="defaultCapacity" type="number" value={catCapacity} onChange={e => setCatCapacity(parseInt(e.target.value) || 1)} className={`${inputClass} h-11`} /></div>
                        <div><label className={labelClass}>Modèle de prix</label><select value={catPricingModel} onChange={e => setCatPricingModel(e.target.value as PricingModel)} className={`${inputClass} h-11`}><option value="fixed">Fixe</option><option value="flexible">Par Occupant</option></select></div>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                          {catPricingModel === 'fixed' ? (
                              <div><label className={labelClass}>Prix de base par nuit (€)</label><input required name="defaultBaseRate" type="number" step="0.01" defaultValue={editingCat?.defaultBaseRate} className={`${inputClass} !bg-white text-lg h-12 text-emerald-600`} /></div>
                          ) : (
                              <div className="space-y-4">
                                  <h4 className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 mb-2"><TrendingUp size={14}/> Tarifs par nombre d'occupants</h4>
                                  <div className="grid grid-cols-2 gap-3">
                                      {Array.from({ length: catCapacity }).map((_, i) => {
                                          const count = i + 1;
                                          return (<div key={count} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between"><span className="text-[11px] font-bold text-slate-500">{count} Pax</span><input type="number" className="w-20 bg-slate-50 border-none text-right font-black text-emerald-600 rounded text-sm" value={catOccupancyPrices[count] || ''} onChange={(e) => setCatOccupancyPrices(prev => ({ ...prev, [count]: parseFloat(e.target.value) || 0 }))} /></div>);
                                      })}
                                  </div>
                              </div>
                          )}
                      </div>
                      <div><label className={labelClass}>Couleur distinctive</label><input type="color" name="color" defaultValue={editingCat?.color || '#6366f1'} className="w-full h-11 rounded-xl cursor-pointer border-none p-0" /></div>
                  </div>
                  <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
                      <button type="button" onClick={() => setIsCatModalOpen(false)} className="px-6 py-2 text-slate-400 font-black uppercase text-[10px] tracking-widest">Annuler</button>
                      <button type="submit" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-100 hover:bg-indigo-700 flex items-center gap-2"><Check size={18}/> Enregistrer Modèle</button>
                  </div>
              </form>
          </div>
      )}

      {/* Added Room Delete Confirmation Modal */}
      {deletingRoomId && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 p-8 text-center animate-in zoom-in duration-300">
                  <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={32}/></div>
                  <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg mb-2">Supprimer l'unité ?</h3>
                  <p className="text-slate-500 text-sm mb-8">Cette action est irréversible et supprimera définitivement cette chambre de l'inventaire.</p>
                  <div className="flex gap-3">
                      <button onClick={() => setDeletingRoomId(null)} className="flex-1 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest">Annuler</button>
                      <button onClick={async () => { await api.deleteRoom(deletingRoomId); setDeletingRoomId(null); loadData(); }} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-100">Supprimer</button>
                  </div>
              </div>
          </div>
      )}

      {/* Added Category Delete Confirmation Modal */}
      {deletingCatId && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 p-8 text-center animate-in zoom-in duration-300">
                  <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={32}/></div>
                  <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg mb-2">Supprimer le modèle ?</h3>
                  <p className="text-slate-500 text-sm mb-8">Attention, cela pourrait affecter les chambres liées à cette catégorie.</p>
                  <div className="flex gap-3">
                      <button onClick={() => setDeletingCatId(null)} className="flex-1 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest">Annuler</button>
                      <button onClick={async () => { await api.deleteRoomCategory(deletingCatId); setDeletingCatId(null); loadData(); }} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-100">Supprimer</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default SettingsRooms;
