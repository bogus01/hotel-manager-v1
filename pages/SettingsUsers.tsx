import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Shield, X } from 'lucide-react';
import Header from '../components/Header';
import { User, UserRole } from '../types';
import * as api from '../services/api';

const SettingsUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    api.fetchUsers().then(setUsers);
  };

  const handleUserEdit = (user: User) => {
      setEditingUser(user);
      setIsUserModalOpen(true);
  };
  
  const handleUserCreate = () => {
      setEditingUser(null);
      setIsUserModalOpen(true);
  };

  const handleUserDelete = async (id: string) => {
      if(window.confirm("Supprimer cet utilisateur ?")) {
          await api.deleteUser(id);
          loadData();
      }
  };

  const handleUserSave = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const userData = {
          name: formData.get('name') as string,
          email: formData.get('email') as string,
          role: formData.get('role') as UserRole,
          isActive: formData.get('isActive') === 'on'
      };

      if (editingUser) {
          await api.updateUser({ ...editingUser, ...userData });
      } else {
          await api.createUser(userData);
      }
      setIsUserModalOpen(false);
      loadData();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header title="Utilisateurs & Droits" backLink="/settings" backLabel="Paramètres" />
      
      <div className="flex-1 max-w-6xl mx-auto w-full p-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="p-6 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Users className="text-indigo-600"/> Équipe & Permissions
                    </h2>
                    <p className="text-sm text-slate-500">Gérez les comptes d'accès au PMS pour vos collaborateurs.</p>
                </div>
                <button 
                    onClick={handleUserCreate}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm"
                >
                    <Plus size={18}/> Nouvel Utilisateur
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white border-b uppercase text-xs font-bold text-slate-500">
                        <tr>
                            <th className="px-6 py-3">Utilisateur</th>
                            <th className="px-6 py-3">Rôle</th>
                            <th className="px-6 py-3">Email</th>
                            <th className="px-6 py-3 text-center">Statut</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50">
                                <td className="px-6 py-3 font-bold text-slate-800 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                                        {user.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    {user.name}
                                </td>
                                <td className="px-6 py-3">
                                    <span className={`px-2 py-1 rounded text-xs font-medium border flex w-fit items-center gap-1
                                        ${user.role === UserRole.ADMIN ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                                            user.role === UserRole.MANAGER ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                            'bg-slate-100 text-slate-600 border-slate-200'}
                                    `}>
                                        {user.role === UserRole.ADMIN && <Shield size={10}/>}
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-3 text-slate-500">{user.email}</td>
                                <td className="px-6 py-3 text-center">
                                    {user.isActive ? 
                                        <span className="text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Actif</span> 
                                        : 
                                        <span className="text-slate-400 text-xs font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Inactif</span>
                                    }
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleUserEdit(user)} className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded"><Edit size={16}/></button>
                                        <button onClick={() => handleUserDelete(user.id)} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded"><Trash2 size={16}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {/* --- USER MODAL --- */}
      {isUserModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <form onSubmit={handleUserSave} className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
                  <div className="p-4 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800">{editingUser ? 'Modifier Utilisateur' : 'Nouvel Utilisateur'}</h3>
                      <button type="button" onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom Complet</label>
                          <input required name="name" defaultValue={editingUser?.name} className="w-full border rounded px-3 py-2 bg-white text-slate-900" placeholder="Ex: Jean Dupont" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                          <input required name="email" type="email" defaultValue={editingUser?.email} className="w-full border rounded px-3 py-2 bg-white text-slate-900" placeholder="email@hotel.com" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rôle</label>
                          <select name="role" defaultValue={editingUser?.role || UserRole.RECEPTIONIST} className="w-full border rounded px-3 py-2 bg-white text-slate-900">
                              {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                      </div>
                      <div className="flex items-center gap-3 pt-2">
                          <input id="isActive" name="isActive" type="checkbox" defaultChecked={editingUser ? editingUser.isActive : true} className="w-5 h-5 text-indigo-600 rounded" />
                          <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Compte Actif</label>
                      </div>
                  </div>
                  <div className="p-4 flex justify-end gap-3">
                      <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium">Annuler</button>
                      <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700">Enregistrer</button>
                  </div>
              </form>
          </div>
      )}
    </div>
  );
};

export default SettingsUsers;