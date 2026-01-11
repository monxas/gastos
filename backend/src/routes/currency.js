import { getDB } from '../db/init.js';
import { v4 as uuidv4 } from 'uuid';

// Common currencies with symbols
const CURRENCIES = {
  EUR: { symbol: '€', name: 'Euro' },
  USD: { symbol: '$', name: 'Dolar estadounidense' },
  GBP: { symbol: '£', name: 'Libra esterlina' },
  JPY: { symbol: '¥', name: 'Yen japones' },
  CHF: { symbol: 'CHF', name: 'Franco suizo' },
  CAD: { symbol: 'C$', name: 'Dolar canadiense' },
  AUD: { symbol: 'A$', name: 'Dolar australiano' },
  MXN: { symbol: 'MX$', name: 'Peso mexicano' },
  BRL: { symbol: 'R$', name: 'Real brasileno' },
  ARS: { symbol: 'AR$', name: 'Peso argentino' },
  COP: { symbol: 'CO$', name: 'Peso colombiano' },
  CLP: { symbol: 'CL$', name: 'Peso chileno' },
  PEN: { symbol: 'S/', name: 'Sol peruano' },
  CNY: { symbol: '¥', name: 'Yuan chino' },
  KRW: { symbol: '₩', name: 'Won surcoreano' },
  INR: { symbol: '₹', name: 'Rupia india' },
  THB: { symbol: '฿', name: 'Baht tailandes' },
  SEK: { symbol: 'kr', name: 'Corona sueca' },
  NOK: { symbol: 'kr', name: 'Corona noruega' },
  DKK: { symbol: 'kr', name: 'Corona danesa' },
  PLN: { symbol: 'zł', name: 'Zloty polaco' },
  CZK: { symbol: 'Kč', name: 'Corona checa' },
  HUF: { symbol: 'Ft', name: 'Forint hungaro' },
  RON: { symbol: 'lei', name: 'Leu rumano' },
  BGN: { symbol: 'лв', name: 'Lev bulgaro' },
  HRK: { symbol: 'kn', name: 'Kuna croata' },
  TRY: { symbol: '₺', name: 'Lira turca' },
  RUB: { symbol: '₽', name: 'Rublo ruso' },
  ZAR: { symbol: 'R', name: 'Rand sudafricano' },
  NZD: { symbol: 'NZ$', name: 'Dolar neozelandes' },
  SGD: { symbol: 'S$', name: 'Dolar singapurense' },
  HKD: { symbol: 'HK$', name: 'Dolar de Hong Kong' },
  TWD: { symbol: 'NT$', name: 'Nuevo dolar taiwanes' },
  ILS: { symbol: '₪', name: 'Shekel israeli' },
  AED: { symbol: 'د.إ', name: 'Dirham de EAU' },
  SAR: { symbol: '﷼', name: 'Riyal saudi' }
};

export default async function currencyRoutes(fastify, options) {
  // Get available currencies
  fastify.get('/list', async (request, reply) => {
    return {
      currencies: Object.entries(CURRENCIES).map(([code, info]) => ({
        code,
        ...info
      }))
    };
  });

  // Get exchange rate
  fastify.get('/rate', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { from, to, date } = request.query;
    const db = getDB();

    if (!from || !to) {
      return reply.status(400).send({ error: 'Se requiere from y to' });
    }

    // If same currency, return 1
    if (from === to) {
      return { from, to, rate: 1, date: date || new Date().toISOString().split('T')[0] };
    }

    // Try to get from database first
    const rateDate = date || new Date().toISOString().split('T')[0];
    let rate = db.prepare(`
      SELECT rate FROM exchange_rates
      WHERE from_currency = ? AND to_currency = ? AND date = ?
    `).get(from, to, rateDate);

    if (rate) {
      return { from, to, rate: rate.rate, date: rateDate, source: 'cached' };
    }

    // Try reverse
    rate = db.prepare(`
      SELECT rate FROM exchange_rates
      WHERE from_currency = ? AND to_currency = ? AND date = ?
    `).get(to, from, rateDate);

    if (rate) {
      return { from, to, rate: 1 / rate.rate, date: rateDate, source: 'cached_reverse' };
    }

    // Fetch from API (using exchangerate.host - free, no API key needed)
    try {
      const response = await fetch(`https://api.exchangerate.host/convert?from=${from}&to=${to}&date=${rateDate}`);
      const data = await response.json();

      if (data.success && data.result) {
        // Cache the rate
        const id = uuidv4();
        db.prepare(`
          INSERT OR REPLACE INTO exchange_rates (id, from_currency, to_currency, rate, date)
          VALUES (?, ?, ?, ?, ?)
        `).run(id, from, to, data.result, rateDate);

        return { from, to, rate: data.result, date: rateDate, source: 'api' };
      }
    } catch (err) {
      console.error('Error fetching exchange rate:', err);
    }

    // Fallback to approximate rates (EUR base)
    const fallbackRates = {
      EUR: 1,
      USD: 1.08,
      GBP: 0.85,
      JPY: 162,
      CHF: 0.95,
      CAD: 1.47,
      AUD: 1.65,
      MXN: 18.5,
      BRL: 5.4,
      ARS: 900,
      COP: 4200,
      CLP: 980,
      PEN: 4.0,
      CNY: 7.8,
      KRW: 1420
    };

    if (fallbackRates[from] && fallbackRates[to]) {
      const rateValue = fallbackRates[to] / fallbackRates[from];
      return { from, to, rate: rateValue, date: rateDate, source: 'fallback' };
    }

    return reply.status(404).send({ error: 'No se pudo obtener el tipo de cambio' });
  });

  // Convert amount
  fastify.post('/convert', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { amount, from, to, date } = request.body;

    if (!amount || !from || !to) {
      return reply.status(400).send({ error: 'Se requiere amount, from y to' });
    }

    // Get rate
    const rateResponse = await fastify.inject({
      method: 'GET',
      url: `/api/currency/rate?from=${from}&to=${to}&date=${date || ''}`,
      headers: request.headers
    });

    const rateData = JSON.parse(rateResponse.body);
    if (rateData.error) {
      return reply.status(400).send(rateData);
    }

    const converted = amount * rateData.rate;

    return {
      original: { amount, currency: from },
      converted: { amount: converted, currency: to },
      rate: rateData.rate,
      date: rateData.date
    };
  });

  // Get user's frequently used currencies
  fastify.get('/frequent', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const db = getDB();

    const currencies = db.prepare(`
      SELECT currency_original as currency, COUNT(*) as count
      FROM expenses
      WHERE user_id = ? AND deleted_at IS NULL
      GROUP BY currency_original
      ORDER BY count DESC
      LIMIT 5
    `).all(request.user.userId);

    return {
      currencies: currencies.map(c => ({
        code: c.currency,
        count: c.count,
        ...CURRENCIES[c.currency]
      }))
    };
  });
}
