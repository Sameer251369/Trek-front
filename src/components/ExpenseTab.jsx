import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, DollarSign, List, Calculator, AlertCircle } from 'lucide-react';
import { expensesAPI, authAPI } from '../api';

export default function ExpenseTab({ trekId, members }) {
  const queryClient = useQueryClient();
  const currentUser = authAPI.getCurrentUser();

  const [desc, setDesc] = useState('');
  const [amt, setAmt] = useState('');
  const [formError, setFormError] = useState(null);

  // Queries
  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ['expenses', trekId],
    queryFn: () => expensesAPI.list(trekId),
  });

  const { data: ledger = { balances: [], suggested_settlements: [] }, isLoading: loadingLedger } = useQuery({
    queryKey: ['expensesLedger', trekId],
    queryFn: () => expensesAPI.getBalances(trekId),
  });

  // Mutations
  const addExpenseMutation = useMutation({
    mutationFn: expensesAPI.add,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', trekId] });
      queryClient.invalidateQueries({ queryKey: ['expensesLedger', trekId] });
      setDesc('');
      setAmt('');
      setFormError(null);
    },
    onError: (err) => {
      setFormError(err.response?.data?.detail || 'Failed to save expense.');
    }
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: expensesAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', trekId] });
      queryClient.invalidateQueries({ queryKey: ['expensesLedger', trekId] });
    }
  });

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!desc || !amt) return;
    if (isNaN(parseFloat(amt)) || parseFloat(amt) <= 0) {
      setFormError('Please enter a valid positive amount.');
      return;
    }

    addExpenseMutation.mutate({
      group: parseInt(trekId),
      description: desc,
      amount: parseFloat(amt),
    });
  };

  const getBalanceColor = (bal) => {
    if (bal > 0.01) return 'text-primary font-bold';
    if (bal < -0.01) return 'text-red-400 font-bold';
    return 'text-dark-muted';
  };

  if (loadingExpenses || loadingLedger) {
    return (
      <div className="flex items-center justify-center min-h-[30vh]">
        <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start text-left text-xs">
      
      {/* List logged expenses */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Ledger Balance Sheet */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          <div className="glass-panel p-5 rounded-xl border border-dark-border/30">
            <h4 className="font-bold text-dark-text mb-3 uppercase tracking-wider flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-primary" />
              <span>Squad Balances</span>
            </h4>
            
            <div className="space-y-2.5">
              {ledger.balances?.map((b) => (
                <div key={b.user} className="flex justify-between items-center border-b border-dark-border/10 pb-1.5">
                  <span className="font-semibold text-dark-text">{b.username}</span>
                  <span className={getBalanceColor(b.balance)}>
                    {b.balance > 0 ? `+ $${b.balance.toFixed(2)}` : b.balance < 0 ? `- $${Math.abs(b.balance).toFixed(2)}` : '$0.00'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-dark-border/30">
            <h4 className="font-bold text-dark-text mb-3 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-primary" />
              <span>Settle Repayments</span>
            </h4>
            
            {ledger.suggested_settlements?.length === 0 ? (
              <div className="text-dark-muted py-6 text-center italic">
                All bills are fully settled!
              </div>
            ) : (
              <div className="space-y-2.5">
                {ledger.suggested_settlements?.map((tx, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-dark-border/10 pb-1.5 leading-relaxed">
                    <div>
                      <span className="font-bold text-red-300">{tx.from_username}</span>
                      <span className="text-dark-muted mx-1">owes</span>
                      <span className="font-bold text-primary">{tx.to_username}</span>
                    </div>
                    <span className="font-extrabold text-dark-text">$ {tx.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Expenses List */}
        <div className="glass-panel rounded-xl border border-dark-border/30 overflow-hidden">
          <div className="px-6 py-4 border-b border-dark-border/30 flex items-center justify-between bg-dark-card/30">
            <h3 className="text-sm font-bold text-dark-text uppercase tracking-widest flex items-center gap-2">
              <List className="w-5 h-5 text-primary" />
              <span>Cost Ledger</span>
            </h3>
            <span className="text-dark-muted font-bold">
              Total Spent: $ {expenses.reduce((acc, curr) => acc + parseFloat(curr.amount), 0).toFixed(2)}
            </span>
          </div>

          {expenses.length === 0 ? (
            <div className="p-12 text-center text-dark-muted">
              <p>No expenses logged yet. Save travel tickets, fuel, food, or campsite rents on the right.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-dark-bg/60 text-dark-muted border-b border-dark-border/25">
                    <th className="px-6 py-3 text-left font-bold uppercase tracking-wider">Expense Details</th>
                    <th className="px-6 py-3 text-center font-bold uppercase tracking-wider">Total Amount</th>
                    <th className="px-6 py-3 text-left font-bold uppercase tracking-wider">Paid By</th>
                    <th className="px-6 py-3 text-right font-bold uppercase tracking-wider">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/20">
                  {expenses.map((exp) => {
                    const isMyPayment = currentUser && String(exp.paid_by) === String(currentUser.id);
                    return (
                      <tr key={exp.id} className="hover:bg-dark-card/30 transition duration-150 text-dark-text">
                        <td className="px-6 py-4 font-semibold">{exp.description}</td>
                        <td className="px-6 py-4 text-center font-bold">$ {parseFloat(exp.amount).toFixed(2)}</td>
                        <td className="px-6 py-4 font-medium text-dark-muted">
                          {isMyPayment ? 'You' : exp.paid_by_username}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => deleteExpenseMutation.mutate(exp.id)}
                            className="text-dark-muted hover:text-red-400 p-1.5 rounded hover:bg-red-500/10 transition duration-150"
                            title="Delete Expense"
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

      </div>

      {/* Log Expense Form */}
      <div className="lg:col-span-1">
        <form onSubmit={handleAddSubmit} className="glass-panel p-5 rounded-xl border border-dark-border/30 space-y-4">
          <h3 className="text-sm font-bold text-dark-text flex items-center gap-1.5">
            <Plus className="w-4.5 h-4.5 text-primary" />
            <span>Log Expense</span>
          </h3>

          {formError && (
            <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-red-300">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-dark-muted mb-1">Cost Description</label>
            <input
              type="text"
              required
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Gasoline fuel, Campsite ticket, Food..."
              className="w-full p-2.5 rounded bg-dark-bg border border-dark-border text-dark-text outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-dark-muted mb-1">Total Bill Amount ($)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted font-bold">$</span>
              <input
                type="text"
                required
                value={amt}
                onChange={(e) => setAmt(e.target.value)}
                placeholder="120.00"
                className="w-full pl-7 pr-3 py-2.5 rounded bg-dark-bg border border-dark-border text-dark-text outline-none focus:border-primary font-mono"
              />
            </div>
          </div>

          <div className="p-3 bg-dark-bg/60 border border-dark-border/40 rounded-lg flex items-start gap-2 text-[10px] text-dark-muted leading-relaxed">
            <AlertCircle className="w-4.5 h-4.5 text-primary shrink-0" />
            <span>This expense will be automatically divided equally among all {members?.length || 1} squad members.</span>
          </div>

          <button
            type="submit"
            disabled={addExpenseMutation.isPending}
            className="w-full py-2.5 bg-primary hover:bg-primary-hover text-dark-bg font-extrabold rounded-lg transition duration-200"
          >
            {addExpenseMutation.isPending ? 'Logging...' : 'Log & Split Expense'}
          </button>
        </form>
      </div>

    </div>
  );
}
