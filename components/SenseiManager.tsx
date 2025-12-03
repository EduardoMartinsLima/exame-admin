import React, { useState } from 'react';
import { Sensei } from '../types';
import { storageService } from '../services/storageService';
import { UserPlus, Trash2, Check, X } from 'lucide-react';

interface Props {
  data: Sensei[];
  onUpdate: () => void;
}

export const SenseiManager: React.FC<Props> = ({ data, onUpdate }) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const confirmDelete = async (id: string) => {
      setIsSubmitting(true);
      const { error } = await storageService.deleteSensei(id);
      setIsSubmitting(false);
      
      if (error) {
          alert(`Erro ao excluir sensei: ${error.message || JSON.stringify(error)}`);
      } else {
          setDeletingId(null);
          onUpdate();
      }
  };

  return (
    <div className="p-4 md:p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl md:text-2xl font-bold mb-6 text-gray-800 flex items-center">
        <UserPlus className="mr-2" /> Gestão de Senseis
      </h2>

      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4 mb-8">
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
            className="w-full sm:w-auto bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors font-semibold disabled:opacity-50"
          >
            {isSubmitting ? 'Salvando...' : 'Cadastrar'}
          </button>
        </div>
      </form>

      <div className="overflow-x-auto -mx-4 md:mx-0">
        <div className="inline-block min-w-full py-2 align-middle md:px-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.length === 0 ? (
                 <tr><td colSpan={2} className="p-4 text-center text-gray-500">Nenhum sensei cadastrado.</td></tr>
              ) : (
                data.map((sensei) => {
                  const isDeleting = deletingId === sensei.id;
                  return (
                    <tr key={sensei.id} className="hover:bg-gray-50">
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sensei.name}</td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {isDeleting ? (
                            <div className="flex justify-end gap-2">
                                <button 
                                    onClick={() => confirmDelete(sensei.id)} 
                                    className="bg-red-100 text-red-600 p-1.5 rounded hover:bg-red-200 transition-colors"
                                    title="Confirmar exclusão"
                                    disabled={isSubmitting}
                                >
                                    <Check size={16} />
                                </button>
                                <button 
                                    onClick={() => setDeletingId(null)} 
                                    className="bg-gray-100 text-gray-600 p-1.5 rounded hover:bg-gray-200 transition-colors"
                                    title="Cancelar"
                                    disabled={isSubmitting}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setDeletingId(sensei.id)}
                                className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                                title="Excluir"
                                disabled={isSubmitting}
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};