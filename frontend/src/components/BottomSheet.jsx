import { useEffect } from 'react';

export default function BottomSheet({ isOpen, onClose, title, children }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-handle" />
        {title && (
          <div className="sheet-header">
            <h2 className="sheet-title">{title}</h2>
            <button onClick={onClose} style={{ fontSize: '24px', padding: '4px' }}>
              &times;
            </button>
          </div>
        )}
        <div className="sheet-content">
          {children}
        </div>
      </div>
    </>
  );
}
