import { useState, useRef } from 'react';

export default function SwipeableItem({ children, onEdit, onDelete }) {
  const [translateX, setTranslateX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    currentX.current = translateX;
    setSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (!swiping) return;
    const diff = e.touches[0].clientX - startX.current;
    const newX = Math.min(0, Math.max(-160, currentX.current + diff));
    setTranslateX(newX);
  };

  const handleTouchEnd = () => {
    setSwiping(false);
    // Snap to action buttons or back
    if (translateX < -80) {
      setTranslateX(-160);
    } else {
      setTranslateX(0);
    }
  };

  const handleActionClick = (action) => {
    setTranslateX(0);
    setTimeout(() => {
      if (action === 'edit') onEdit?.();
      if (action === 'delete') onDelete?.();
    }, 200);
  };

  return (
    <div className="swipeable-container">
      <div className="swipe-actions">
        <button className="swipe-action swipe-action-edit" onClick={() => handleActionClick('edit')}>
          Editar
        </button>
        <button className="swipe-action swipe-action-delete" onClick={() => handleActionClick('delete')}>
          Eliminar
        </button>
      </div>
      <div
        className={`swipeable-item ${swiping ? 'swiping' : ''}`}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
