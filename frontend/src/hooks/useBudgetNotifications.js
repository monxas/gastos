import { useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { formatCurrency } from '../utils/format';

const NOTIFICATION_KEY = 'lastBudgetNotification';
const NOTIFICATION_INTERVAL = 1000 * 60 * 60 * 4; // 4 hours minimum between notifications

export function useBudgetNotifications() {
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('Este navegador no soporta notificaciones');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }, []);

  const showNotification = useCallback((title, options = {}) => {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: 'budget-alert',
        renotify: true,
        ...options
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    }
    return null;
  }, []);

  const checkBudgetsAndNotify = useCallback(async () => {
    // Check if we should notify (time-based throttle)
    const lastNotification = localStorage.getItem(NOTIFICATION_KEY);
    const now = Date.now();

    if (lastNotification && now - parseInt(lastNotification) < NOTIFICATION_INTERVAL) {
      return; // Too soon for another notification
    }

    try {
      const { budgets } = await api.get('/budgets');
      const criticalBudgets = budgets.filter(b => b.percent >= 90);

      if (criticalBudgets.length > 0) {
        const exceeded = criticalBudgets.filter(b => b.percent >= 100);
        const warning = criticalBudgets.filter(b => b.percent < 100);

        let title, body;

        if (exceeded.length > 0) {
          const budget = exceeded[0];
          const categoryName = budget.category_name || 'Total';
          title = `Presupuesto excedido`;
          body = `${categoryName}: ${formatCurrency(budget.spent)} de ${formatCurrency(budget.amount)} (${budget.percent.toFixed(0)}%)`;
        } else if (warning.length > 0) {
          const budget = warning[0];
          const categoryName = budget.category_name || 'Total';
          const remaining = budget.amount - budget.spent;
          title = `Presupuesto casi agotado`;
          body = `${categoryName}: Te quedan ${formatCurrency(remaining)} (${(100 - budget.percent).toFixed(0)}%)`;
        }

        if (title) {
          showNotification(title, { body });
          localStorage.setItem(NOTIFICATION_KEY, now.toString());
        }
      }
    } catch (error) {
      console.error('Error checking budgets:', error);
    }
  }, [showNotification]);

  useEffect(() => {
    // Request permission on mount if not already granted/denied
    if ('Notification' in window && Notification.permission === 'default') {
      // Don't auto-request, wait for user interaction
    }

    // Check budgets on mount and periodically
    const checkInterval = setInterval(checkBudgetsAndNotify, 1000 * 60 * 30); // Every 30 mins
    checkBudgetsAndNotify();

    return () => clearInterval(checkInterval);
  }, [checkBudgetsAndNotify]);

  return {
    requestPermission,
    showNotification,
    checkBudgetsAndNotify,
    isSupported: 'Notification' in window,
    permission: 'Notification' in window ? Notification.permission : 'denied'
  };
}
