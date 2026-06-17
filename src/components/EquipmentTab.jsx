import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, CheckCircle, Circle, Briefcase, PlusCircle, AlertCircle } from 'lucide-react';
import { equipmentAPI, authAPI } from '../api';

export default function EquipmentTab({ trekId }) {
  const queryClient = useQueryClient();
  const currentUser = authAPI.getCurrentUser();

  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [formError, setFormError] = useState(null);

  // Queries
  const { data: gearList = [], isLoading, isError } = useQuery({
    queryKey: ['equipment', trekId],
    queryFn: () => equipmentAPI.list(trekId),
  });

  // Mutations
  const addGearMutation = useMutation({
    mutationFn: equipmentAPI.add,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment', trekId] });
      setItemName('');
      setItemQty(1);
      setFormError(null);
    },
    onError: () => {
      setFormError('Failed to add equipment item.');
    }
  });

  const updateGearMutation = useMutation({
    mutationFn: ({ id, data }) => equipmentAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment', trekId] });
    }
  });

  const deleteGearMutation = useMutation({
    mutationFn: equipmentAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment', trekId] });
    }
  });

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!itemName) return;

    addGearMutation.mutate({
      group: parseInt(trekId),
      name: itemName,
      quantity: parseInt(itemQty),
      assigned_to: null, // Start unassigned
    });
  };

  const handleClaim = (item) => {
    const isClaimedByMe = item.assigned_to === currentUser.id;
    updateGearMutation.mutate({
      id: item.id,
      data: {
        assigned_to: isClaimedByMe ? null : currentUser.id
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[30vh]">
        <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
        Failed to retrieve belongings ledger.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start text-left">
      {/* List items */}
      <div className="lg:col-span-2 space-y-4">
        <div className="glass-panel rounded-xl border border-dark-border/30 overflow-hidden">
          <div className="px-6 py-4 border-b border-dark-border/30 flex items-center justify-between">
            <h3 className="text-sm font-bold text-dark-text uppercase tracking-widest flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              <span>Gear Checklist</span>
            </h3>
            <span className="text-xs text-dark-muted">
              {gearList.filter(item => item.assigned_to).length} / {gearList.length} Items Claimed
            </span>
          </div>

          {gearList.length === 0 ? (
            <div className="p-12 text-center text-dark-muted text-xs">
              <PlusCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No gear has been logged for this trek yet.</p>
              <p className="mt-1">Add items like sleeping bags, ropes, tents, or camping stoves on the side.</p>
            </div>
          ) : (
            <div className="overflow-x-auto text-xs">
              <table className="w-full">
                <thead>
                  <tr className="bg-dark-bg/60 text-dark-muted border-b border-dark-border/25">
                    <th className="px-6 py-3 text-left font-bold uppercase tracking-wider">Item Details</th>
                    <th className="px-6 py-3 text-center font-bold uppercase tracking-wider">Qty Required</th>
                    <th className="px-6 py-3 text-left font-bold uppercase tracking-wider">Assigned Owner</th>
                    <th className="px-6 py-3 text-right font-bold uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/20">
                  {gearList.map((item) => {
                    const isMyClaim = item.assigned_to === currentUser.id;
                    return (
                      <tr key={item.id} className="hover:bg-dark-card/30 transition duration-150 text-dark-text">
                        <td className="px-6 py-4 font-semibold">{item.name}</td>
                        <td className="px-6 py-4 text-center">{item.quantity}</td>
                        <td className="px-6 py-4">
                          {item.assigned_to ? (
                            <span className={`inline-flex items-center gap-1 font-bold ${isMyClaim ? 'text-primary' : 'text-yellow-500'}`}>
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>{isMyClaim ? 'You (Bringing)' : item.assigned_username}</span>
                            </span>
                          ) : (
                            <span className="text-dark-muted flex items-center gap-1 italic">
                              <Circle className="w-3.5 h-3.5" />
                              <span>Unassigned</span>
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right flex items-center justify-end gap-3.5">
                          <button
                            onClick={() => handleClaim(item)}
                            className={`px-3 py-1.5 rounded text-[10px] font-bold border transition duration-150 ${
                              isMyClaim 
                                ? 'bg-primary/10 border-primary/20 text-primary hover:bg-transparent hover:border-red-500 hover:text-red-400'
                                : item.assigned_to 
                                  ? 'bg-transparent border-dark-border text-dark-muted hover:border-primary hover:text-primary'
                                  : 'bg-primary hover:bg-primary-hover text-dark-bg border-transparent'
                            }`}
                          >
                            {isMyClaim ? 'Release Claim' : 'Claim Item'}
                          </button>

                          <button
                            onClick={() => deleteGearMutation.mutate(item.id)}
                            className="text-dark-muted hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition duration-150"
                            title="Delete Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="p-4 rounded-xl border border-dark-border/20 bg-dark-card/20 flex gap-2.5 text-xs text-dark-muted">
          <AlertCircle className="w-5 h-5 text-primary shrink-0" />
          <p className="leading-relaxed">
            Claims help assign weight logs and coordinate campsites. For example, if Sameer brings the cooking stove, others won't need to carry duplicates.
          </p>
        </div>
      </div>

      {/* Add form */}
      <div className="lg:col-span-1">
        <form onSubmit={handleAddSubmit} className="glass-panel p-5 rounded-xl border border-dark-border/30 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-dark-text flex items-center gap-1">
            <Plus className="w-4 h-4 text-primary" />
            <span>Add Required Gear</span>
          </h3>

          {formError && (
            <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-red-300">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-dark-muted mb-1">Gear Item Name</label>
            <input
              type="text"
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g., Cooking Stove, 4-Man Tent..."
              className="w-full p-2.5 rounded bg-dark-bg border border-dark-border text-dark-text outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-dark-muted mb-1">Quantity Needed</label>
            <input
              type="number"
              required
              min="1"
              value={itemQty}
              onChange={(e) => setItemQty(e.target.value)}
              className="w-full p-2.5 rounded bg-dark-bg border border-dark-border text-dark-text outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={addGearMutation.isPending}
            className="w-full py-2.5 bg-primary hover:bg-primary-hover text-dark-bg font-extrabold rounded-lg transition duration-200"
          >
            {addGearMutation.isPending ? 'Saving...' : 'Add to Checklist'}
          </button>
        </form>
      </div>
    </div>
  );
}
