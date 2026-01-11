import { getDB } from '../db/init.js';
import { v4 as uuidv4 } from 'uuid';

const defaultCategories = [
  { name: 'Alimentación', icon: '🍽️', color: '#FF6B6B' },
  { name: 'Transporte', icon: '🚗', color: '#4ECDC4' },
  { name: 'Casa', icon: '🏠', color: '#45B7D1' },
  { name: 'Suscripciones', icon: '📱', color: '#96CEB4' },
  { name: 'Ocio', icon: '🎮', color: '#FFEAA7' },
  { name: 'Salud', icon: '🏥', color: '#DDA0DD' },
  { name: 'Educación', icon: '📚', color: '#98D8C8' },
  { name: 'Viajes', icon: '✈️', color: '#F7DC6F' },
  { name: 'Impuestos', icon: '📋', color: '#85C1E9' },
  { name: 'Tarjeta', icon: '💳', color: '#BB8FCE' },
  { name: 'Otros', icon: '📦', color: '#AEB6BF' }
];

const defaultTags = [
  { name: 'Supermercado', color: '#FF6B6B' },
  { name: 'Restaurante', color: '#4ECDC4' },
  { name: 'Gasolina', color: '#45B7D1' },
  { name: 'Amazon', color: '#FF9F43' },
  { name: 'Trabajo', color: '#96CEB4' },
  { name: 'Familia', color: '#DDA0DD' },
  { name: 'Urgente', color: '#E74C3C' },
  { name: 'Reembolso', color: '#2ECC71' }
];

const defaultAccounts = [
  { name: 'Banco Principal', type: 'bank', initial_balance: 0 },
  { name: 'Efectivo', type: 'cash', initial_balance: 0 }
];

export function seedUserData(userId) {
  const db = getDB();

  // Insert categories
  const insertCategory = db.prepare(`
    INSERT INTO categories (id, user_id, name, icon, color, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  defaultCategories.forEach((cat, index) => {
    insertCategory.run(uuidv4(), userId, cat.name, cat.icon, cat.color, index);
  });

  // Insert tags
  const insertTag = db.prepare(`
    INSERT INTO tags (id, user_id, name, color)
    VALUES (?, ?, ?, ?)
  `);

  defaultTags.forEach((tag) => {
    insertTag.run(uuidv4(), userId, tag.name, tag.color);
  });

  // Insert accounts
  const insertAccount = db.prepare(`
    INSERT INTO accounts (id, user_id, name, type, initial_balance)
    VALUES (?, ?, ?, ?, ?)
  `);

  defaultAccounts.forEach((acc) => {
    insertAccount.run(uuidv4(), userId, acc.name, acc.type, acc.initial_balance);
  });

  console.log(`Seeded data for user ${userId}`);
}
