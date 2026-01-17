import { useState, useRef, useCallback } from 'react';

export default function PullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef(null);

  const THRESHOLD = 60;

  const handleTouchStart = useCallback((e) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!pulling || refreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      e.preventDefault();
      // Damping effect
      const distance = Math.min(diff * 0.5, 100);
      setPullDistance(distance);
    }
  }, [pulling, refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return;

    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }

    setPulling(false);
    setPullDistance(0);
  }, [pulling, pullDistance, refreshing, onRefresh]);

  return (
    <div
      ref={containerRef}
      className="pull-to-refresh"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: pullDistance > 0 ? 'none' : 'auto' }}
    >
      {/* Indicator */}
      <div
        className={`pull-to-refresh-indicator ${pullDistance > 0 || refreshing ? 'visible' : ''} ${refreshing ? 'loading' : ''}`}
        style={{
          top: pullDistance > 0 ? Math.min(pullDistance - 50, 10) : -50,
          opacity: refreshing ? 1 : Math.min(pullDistance / THRESHOLD, 1)
        }}
      >
        {refreshing ? '🔄' : pullDistance >= THRESHOLD ? '↻' : '↓'}
      </div>

      {/* Content with transform when pulling */}
      <div style={{ transform: `translateY(${pullDistance}px)`, transition: pulling ? 'none' : 'transform 0.2s ease' }}>
        {children}
      </div>
    </div>
  );
}
