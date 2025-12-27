import React, { useState, useEffect } from 'react';
import { Coffee, Plus, Trash2, Save, Utensils, Tag } from 'lucide-react';
import Header from '../components/Header';
import { BoardType, BoardConfiguration, ServiceCatalogItem } from '../types';
import * as api from '../services/api';

const SettingsServices: React.FC = () => {
  const [boardConfig, setBoardConfig] = useState<BoardConfiguration | null>(null);
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  
  const [newService, setNewService] = useState<Partial<ServiceCatalogItem>>({
      name: '',
      defaultPrice: 0,
      category: 'Restaurations'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    Promise.all([api.fetchBoardConfig(), api.fetchServiceCatalog()]).then(([config, svcs]) => {
        setBoardConfig(config);
        setServices(svcs);
    });
  };

  const handleBoardSave = async () => {
      if (boardConfig) {
          await api.updateBoardConfig(boardConfig);
          alert("Tarifs des pensions mis à jour !");
      }
  };

  const handleBoardChange = (type: BoardType, value: string) => {
      if (boardConfig) {
          setBoardConfig({ ...boardConfig, [type]: parseFloat(value) || 0 });
      }
  };

  const handleAddService = async () => {
      if (!newService.name || !newService.defaultPrice) return;
      await api.createCatalogItem(newService as Omit<ServiceCatalogItem, 'id'>);
      setNewService({ name: '', defaultPrice: 0, category: 'Restaurations' });
      loadData();
  };

  const handleDeleteService = async (id: string) => {
      if(window.confirm("Supprimer ce service du catalogue ?")) {
          await api.deleteCatalogItem(id);
          loadData();
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header title="Prestations & Pensions" backLink="/settings" backLabel="Paramètres" />
      
      <div className="flex-1 max-w-5xl mx-auto w-full p-8 space-y-8">
        
        {/* SECTION 1: PENSIONS (BOARDING) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="p-6 border-b border-slate-100 bg-indigo-50/50">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Utensils className="text-indigo-600"/> Formules Repas (Pensions)
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    Définissez le supplément tarifaire <strong>par personne et par jour</strong> pour chaque formule.
                    Ce montant s'ajoute automatiquement au prix de la chambre.
                </p>
            </div>
            
            {boardConfig && (
                <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Petit-Déjeuner (BB)</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                className="w-full text-center text-xl font-bold text-slate-800 bg-white border border-slate-300 rounded-lg py-2 focus:ring-2 focus:ring-indigo-500"
                                value={boardConfig[BoardType.BB]}
                                onChange={(e) => handleBoardChange(BoardType.BB, e.target.value)}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">€</span>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Demi-Pension (HB)</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                className="w-full text-center text-xl font-bold text-slate-800 bg-white border border-slate-300 rounded-lg py-2 focus:ring-2 focus:ring-indigo-500"
                                value={boardConfig[BoardType.HB]}
                                onChange={(e) => handleBoardChange(BoardType.HB, e.target.value)}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">€</span>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Pension Complète (FB)</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                className="w-full text-center text-xl font-bold text-slate-800 bg-white border border-slate-300 rounded-lg py-2 focus:ring-2 focus:ring-indigo-500"
                                value={boardConfig[BoardType.FB]}
                                onChange={(e) => handleBoardChange(BoardType.FB, e.target.value)}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">€</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-center">
                        <button 
                            onClick={handleBoardSave}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
                        >
                            <Save size={18}/> Enregistrer Tarifs
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* SECTION 2: CATALOGUE EXTRAS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 delay-100">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Tag className="text-indigo-600"/> Catalogue Extras & Services
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Gérez la liste des produits additionnels (Spa, Taxe séjour, Parking...) pour une facturation rapide.
                    </p>
                </div>
            </div>

            <div className="p-6">
                {/* Add Form */}
                <div className="flex gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100 items-end">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nom du Service</label>
                        <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                            placeholder="Ex: Bouteille Champagne"
                            value={newService.name}
                            onChange={e => setNewService({...newService, name: e.target.value})}
                        />
                    </div>
                    <div className="w-48">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Catégorie</label>
                        <select 
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                            value={newService.category}
                            onChange={e => setNewService({...newService, category: e.target.value as any})}
                        >
                            <option value="Restaurations">Restaurations</option>
                            <option value="Bien-être">Bien-être</option>
                            <option value="Divers">Divers</option>
                        </select>
                    </div>
                    <div className="w-32">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Prix Défaut</label>
                        <input 
                            type="number" 
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white font-bold text-slate-800"
                            placeholder="0.00"
                            value={newService.defaultPrice || ''}
                            onChange={e => setNewService({...newService, defaultPrice: parseFloat(e.target.value)})}
                        />
                    </div>
                    <button 
                        onClick={handleAddService}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 h-[38px] flex items-center gap-2"
                    >
                        <Plus size={18}/> Ajouter
                    </button>
                </div>

                {/* Table */}
                <div className="overflow-hidden border border-slate-100 rounded-lg">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3">Service</th>
                                <th className="px-4 py-3">Catégorie</th>
                                <th className="px-4 py-3 text-right">Prix Unitaire</th>
                                <th className="px-4 py-3 text-right w-20"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {services.map(svc => (
                                <tr key={svc.id} className="hover:bg-slate-50 group">
                                    <td className="px-4 py-3 font-bold text-slate-800">{svc.name}</td>
                                    <td className="px-4 py-3">
                                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs border border-slate-200">
                                            {svc.category}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-emerald-600">{svc.defaultPrice.toFixed(2)} €</td>
                                    <td className="px-4 py-3 text-right">
                                        <button 
                                            onClick={() => handleDeleteService(svc.id)}
                                            className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {services.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-400 italic">
                                        Catalogue vide. Ajoutez des services ci-dessus.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default SettingsServices;