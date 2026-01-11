import Dexie from 'dexie';

export const db = new Dexie('GastosDB');

db.version(1).stores({
  categories: 'id, user_id, name, deleted_at, version, updated_at',
  tags: 'id, user_id, name, deleted_at, version, updated_at',
  accounts: 'id, user_id, name, type, deleted_at, version, updated_at',
  expenses: 'id, user_id, date, category_id, account_id, deleted_at, version, updated_at',
  expense_tags: '[expense_id+tag_id], expense_id, tag_id',
  settings: 'id, user_id',
  sync_meta: 'key'
});

export async function getLastSyncTime() {
  const meta = await db.sync_meta.get('last_sync');
  return meta?.value || null;
}

export async function setLastSyncTime(time) {
  await db.sync_meta.put({ key: 'last_sync', value: time });
}

export async function clearAllData() {
  await db.categories.clear();
  await db.tags.clear();
  await db.accounts.clear();
  await db.expenses.clear();
  await db.expense_tags.clear();
  await db.settings.clear();
  await db.sync_meta.clear();
}
