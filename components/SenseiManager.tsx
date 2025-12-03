import React, { useState } from 'react';
import { Sensei } from '../types';
import { storageService } from '../services/storageService';
import { UserPlus, Trash2 } from 'lucide-react';

interface Props {
  data: Sensei[];
  onUpdate: () => void;
}

export const SenseiManager: React.FC<Props> = ({ data, onUpdate }) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    const newSensei: Sensei = {
      id: storageService.generateId(),
      name: name.trim()
    };
    
    await storageService.addSensei(newSensei);
    setName('');
    setIsSubmitting(false);
    onUpdate();
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
        <UserPlus className="mr-2" /> Gestão de Senseis
      </h2>

      <form onSubmit={handleAdd} className="flex gap-4 mb-8">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Sensei</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-red-500 outline-none"
            placeholder="Ex: Sensei Miyagi"
            required
            disabled={isSubmitting}
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors font-semibold disabled:opacity-50"
          >
            {isSubmitting ? 'Salvando...' : 'Cadastrar'}
          </button>
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
               <tr><td colSpan={2} className="p-4 text-center text-gray-500">Nenhum sensei cadastrado.</td></tr>
            ) : (
              data.map((sensei) => (
                <tr key={sensei.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sensei.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {/* Placeholder for delete if needed later */}
                    <span className="text-gray-400 cursor-not-allowed"><Trash2 size={16} /></span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};