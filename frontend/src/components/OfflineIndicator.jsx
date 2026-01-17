import { useOffline } from '../context/OfflineContext';

export default function OfflineIndicator() {
  const { isOnline, isSyncing, pendingCount } = useOffline();

  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <div className={`offline-indicator ${!isOnline ? 'offline' : isSyncing ? 'syncing' : 'pending'}`}>
      {!isOnline ? (
        <>
          <span className="offline-icon">📡</span>
          <span>Sin conexion</span>
          {pendingCount > 0 && <span className="pending-badge">{pendingCount}</span>}
        </>
      ) : isSyncing ? (
        <>
          <span className="offline-icon spinning">🔄</span>
          <span>Sincronizando...</span>
        </>
      ) : pendingCount > 0 ? (
        <>
          <span className="offline-icon">⏳</span>
          <span>{pendingCount} pendiente{pendingCount > 1 ? 's' : ''}</span>
        </>
      ) : null}
    </div>
  );
}
