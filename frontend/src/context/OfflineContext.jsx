import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import localDB, {
  addToSyncQueue,
  getPendingSyncItems,
  markAsSynced,
  incrementRetries,
  SYNC_ACTIONS,
  ENTITY_TYPES,
  setMeta,
  getMeta
} from '../db/localDB';
import { api } from '../services/api';

const OfflineContext = createContext(null);

export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState(null);

  // Detectar cambios de conexion
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingItems();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cargar metadata
    getMeta('lastSync').then(setLastSync);
    updatePendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updatePendingCount = async () => {
    const items = await getPendingSyncItems();
    setPendingCount(items.length);
  };

  // Sincronizar items pendientes
  const syncPendingItems = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    setIsSyncing(true);
    const items = await getPendingSyncItems();

    for (const item of items) {
      try {
        await syncItem(item);
        await markAsSynced(item.id);
      } catch (error) {
        console.error('Error syncing item:', error);
        await incrementRetries(item.id);

        // Si falla 5 veces, dejarlo para revision manual
        if (item.retries >= 5) {
          console.warn('Item exceeded max retries:', item);
        }
      }
    }

    const now = Date.now();
    await setMeta('lastSync', now);
    setLastSync(now);
    setIsSyncing(false);
    await updatePendingCount();
  }, [isSyncing]);

  // Sincronizar un item individual
  const syncItem = async (item) => {
    const { type, action, data } = item;
    const endpoints = {
      [ENTITY_TYPES.EXPENSE]: '/expenses',
      [ENTITY_TYPES.CATEGORY]: '/categories',
      [ENTITY_TYPES.ACCOUNT]: '/accounts',
      [ENTITY_TYPES.TAG]: '/tags',
      [ENTITY_TYPES.BUDGET]: '/budgets',
      [ENTITY_TYPES.INCOME]: '/incomes',
      [ENTITY_TYPES.RECURRING]: '/recurring'
    };

    const endpoint = endpoints[type];
    if (!endpoint) throw new Error(`Unknown entity type: ${type}`);

    switch (action) {
      case SYNC_ACTIONS.CREATE:
        await api.post(endpoint, data);
        break;
      case SYNC_ACTIONS.UPDATE:
        await api.put(`${endpoint}/${item.entityId}`, data);
        break;
      case SYNC_ACTIONS.DELETE:
        await api.delete(`${endpoint}/${item.entityId}`);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  };

  // Guardar datos localmente y encolar sincronizacion
  const saveOffline = async (type, action, entityId, data) => {
    // Guardar en IndexedDB local
    const table = getTableForType(type);
    if (table) {
      if (action === SYNC_ACTIONS.CREATE || action === SYNC_ACTIONS.UPDATE) {
        await table.put({ ...data, id: entityId, synced: false });
      } else if (action === SYNC_ACTIONS.DELETE) {
        await table.delete(entityId);
      }
    }

    // Agregar a cola de sincronizacion
    await addToSyncQueue(type, action, entityId, data);
    await updatePendingCount();

    // Si estamos online, sincronizar inmediatamente
    if (navigator.onLine) {
      syncPendingItems();
    }
  };

  const getTableForType = (type) => {
    const tables = {
      [ENTITY_TYPES.EXPENSE]: localDB.expenses,
      [ENTITY_TYPES.CATEGORY]: localDB.categories,
      [ENTITY_TYPES.ACCOUNT]: localDB.accounts,
      [ENTITY_TYPES.TAG]: localDB.tags,
      [ENTITY_TYPES.BUDGET]: localDB.budgets,
      [ENTITY_TYPES.INCOME]: localDB.incomes,
      [ENTITY_TYPES.RECURRING]: localDB.recurringRules
    };
    return tables[type];
  };

  // Cargar datos del servidor y guardar localmente
  const refreshLocalData = async () => {
    if (!navigator.onLine) return;

    try {
      const [
        { categories },
        { accounts },
        { tags },
        { budgets },
        { expenses }
      ] = await Promise.all([
        api.get('/categories'),
        api.get('/accounts'),
        api.get('/tags'),
        api.get('/budgets'),
        api.get('/expenses?limit=500')
      ]);

      // Guardar en IndexedDB
      await Promise.all([
        localDB.categories.bulkPut(categories.map(c => ({ ...c, synced: true }))),
        localDB.accounts.bulkPut(accounts.map(a => ({ ...a, synced: true }))),
        localDB.tags.bulkPut(tags.map(t => ({ ...t, synced: true }))),
        localDB.budgets.bulkPut(budgets.map(b => ({ ...b, synced: true }))),
        localDB.expenses.bulkPut(expenses.map(e => ({ ...e, synced: true })))
      ]);

      const now = Date.now();
      await setMeta('lastSync', now);
      setLastSync(now);
    } catch (error) {
      console.error('Error refreshing local data:', error);
    }
  };

  // Obtener datos locales
  const getLocalExpenses = async (filters = {}) => {
    let query = localDB.expenses.orderBy('date').reverse();

    if (filters.category_id) {
      query = query.filter(e => e.category_id === filters.category_id);
    }
    if (filters.account_id) {
      query = query.filter(e => e.account_id === filters.account_id);
    }

    return await query.limit(100).toArray();
  };

  const getLocalCategories = () => localDB.categories.toArray();
  const getLocalAccounts = () => localDB.accounts.toArray();
  const getLocalTags = () => localDB.tags.toArray();

  return (
    <OfflineContext.Provider value={{
      isOnline,
      isSyncing,
      pendingCount,
      lastSync,
      saveOffline,
      syncPendingItems,
      refreshLocalData,
      getLocalExpenses,
      getLocalCategories,
      getLocalAccounts,
      getLocalTags,
      SYNC_ACTIONS,
      ENTITY_TYPES
    }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}

export default OfflineContext;
