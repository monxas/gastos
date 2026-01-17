import Dexie from 'dexie';

// Base de datos local para offline-first
export const localDB = new Dexie('gastos');

localDB.version(1).stores({
  // Datos principales (mirror del servidor)
  expenses: 'id, date, category_id, account_id, user_id, synced',
  categories: 'id, user_id',
  accounts: 'id, user_id',
  tags: 'id, user_id',
  budgets: 'id, user_id',
  incomes: 'id, date, user_id',
  recurringRules: 'id, user_id',

  // Cola de sincronizacion para operaciones offline
  syncQueue: '++id, type, action, entityId, timestamp, retries',

  // Metadata
  meta: 'key'
});

// Tipos de acciones en la cola
export const SYNC_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete'
};

// Tipos de entidades
export const ENTITY_TYPES = {
  EXPENSE: 'expense',
  CATEGORY: 'category',
  ACCOUNT: 'account',
  TAG: 'tag',
  BUDGET: 'budget',
  INCOME: 'income',
  RECURRING: 'recurring'
};

// Agregar item a la cola de sincronizacion
export async function addToSyncQueue(type, action, entityId, data) {
  await localDB.syncQueue.add({
    type,
    action,
    entityId,
    data,
    timestamp: Date.now(),
    retries: 0
  });
}

// Obtener items pendientes de sincronizar
export async function getPendingSyncItems() {
  return await localDB.syncQueue.orderBy('timestamp').toArray();
}

// Marcar item como sincronizado (eliminarlo de la cola)
export async function markAsSynced(id) {
  await localDB.syncQueue.delete(id);
}

// Incrementar reintentos
export async function incrementRetries(id) {
  const item = await localDB.syncQueue.get(id);
  if (item) {
    await localDB.syncQueue.update(id, { retries: item.retries + 1 });
  }
}

// Guardar metadata (ej: ultima sincronizacion)
export async function setMeta(key, value) {
  await localDB.meta.put({ key, value });
}

export async function getMeta(key) {
  const item = await localDB.meta.get(key);
  return item?.value;
}

// Limpiar datos locales (logout)
export async function clearLocalData() {
  await Promise.all([
    localDB.expenses.clear(),
    localDB.categories.clear(),
    localDB.accounts.clear(),
    localDB.tags.clear(),
    localDB.budgets.clear(),
    localDB.incomes.clear(),
    localDB.recurringRules.clear(),
    localDB.syncQueue.clear(),
    localDB.meta.clear()
  ]);
}

export default localDB;
