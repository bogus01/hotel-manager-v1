
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Plus, Filter, Eye, Edit, Trash2, User, Phone, Mail, Building, AlertCircle } from 'lucide-react';
import { Client } from '../types';
import * as api from '../services/api';
import Header from '../components/Header';
import ClientModal from '../components/ClientModal';

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [filter, setFilter] = useState('');
  const [showDebtorsOnly, setShowDebtorsOnly] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const fromReports = searchParams.get('from') === 'reports';

  const refreshClients = () => { api.fetchClients().then(setClients); };
  useEffect(() => { refreshClients(); }, []);

  const filteredClients = clients.filter(c => {
      const matchesSearch = `${c.firstName} ${c.lastName}`.toLowerCase().includes(filter.toLowerCase()) || c.company?.toLowerCase().includes(filter.toLowerCase());
      const matchesDebt = showDebtorsOnly ? (c.balance > 0) : true;
      return matchesSearch && matchesDebt;
  });

  const handleSaveClient = async (updatedClient: Client) => {
      if (isCreating) await api.createClient(updatedClient);
      else await api.updateClient(updatedClient);
      refreshClients();
      setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header 
        title="Fichier Clients & Balance" 
        backLink={fromReports ? "/reports" : "/"} 
        backLabel={fromReports ? "Rapports" : "Menu Principal"}
      />
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div><h2 className="text-xl font-bold text-slate-800">Gestion de la clientèle</h2><p className="text-slate-500">Comptabilité et historique.</p></div>
          <button onClick={() => { setSelectedClient(null); setIsCreating(true); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm"><Plus size={18} className="inline mr-2"/> Nouveau Client</button>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex gap-4 items-center bg-slate-50 flex-wrap">
            <div className="relative flex-1 min-w-[300px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Rechercher..." className="pl-10 pr-4 py-2 border rounded-lg w-full" value={filter} onChange={(e) => setFilter(e.target.value)}/></div>
            <label className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer ${showDebtorsOnly ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white'}`}><input type="checkbox" className="rounded text-red-600" checked={showDebtorsOnly} onChange={e => setShowDebtorsOnly(e.target.checked)}/><span className="font-medium text-sm">Débiteurs uniquement</span></label>
          </div>
          <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500"><tr><th className="px-6 py-4">Nom / Société</th><th className="px-6 py-4">Solde</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50 transition-colors group"><td className="px-6 py-4 font-bold text-slate-900">{client.firstName} {client.lastName}</td><td className="px-6 py-4">{client.balance > 0 ? <span className="text-red-600 font-bold">-{client.balance.toFixed(2)} €</span> : 'À jour'}</td><td className="px-6 py-4 text-right"><button onClick={() => { setSelectedClient(client); setIsCreating(false); setIsModalOpen(true); }} className="p-1 hover:text-indigo-600 text-slate-400"><Eye size={18} /></button></td></tr>
              ))}</tbody>
          </table>
        </div>
      </div>
      <ClientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} client={selectedClient} onSave={handleSaveClient} isCreating={isCreating} />
    </div>
  );
};

export default Clients;
