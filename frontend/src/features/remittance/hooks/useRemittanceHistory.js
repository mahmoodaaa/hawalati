import { useCallback, useEffect, useState } from 'react';
import { getRemittanceHistory } from '../../../services/remittanceService.js';
import { useAuth } from '../../../context/AuthContext';

export default function useRemittanceHistory() {
  const { currentUser } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ transactions: [], loading: true, error: '' });
  const reload = useCallback(() => {
    setState({ transactions: [], loading: true, error: '' });
    setAttempt((value) => value + 1);
  }, []);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      if (!active) return;
      setState({ transactions: [], loading: true, error: '' });
      try {
        const transactions = await getRemittanceHistory();
        if (active) setState({ transactions, loading: false, error: '' });
      } catch (error) {
        if (active) setState({ transactions: [], loading: false, error: error.message });
      }
    });
    return () => { active = false; };
  }, [currentUser?.id, attempt]);
  return { ...state, reload };
}
