/**
 * Uçuş Keşfi Case — Mock HTTP Servisi
 *
 * Bağımlılığı yoktur. Node 18+ ile: node server.js
 * Veri sabittir (flights.json). Aynı istek her zaman aynı yanıtı döner.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 4000);
const FLIGHTS = JSON.parse(fs.readFileSync(path.join(__dirname, 'flights.json'), 'utf8'));

/* ------------------------------------------------------------------ */
/* Çalışma modu — /debug/mode ile değiştirilir, sunucu yeniden başlamaz */
/* ------------------------------------------------------------------ */

const MODES = {
  normal: () => 350 + Math.floor(Math.random() * 250), // 350-600 ms
  slow: () => 3000,
  race: () => 300 + Math.floor(Math.random() * 2700), // 300-3000 ms, sırasız yanıt üretir
};

let mode = 'normal';
let failOnceArmed = false;
let forceEmpty = false;

/* ------------------------------------------------------------------ */
/* Sıralama ve filtreleme                                              */
/* ------------------------------------------------------------------ */

// Eşitlikte önce departureAt, sonra id artan. Sözleşmenin parçasıdır.
function sortFlights(rows, sort) {
  const key = sort === 'duration' ? 'durationMinutes' : 'priceMinor';
  return [...rows].sort(
    (a, b) =>
      a[key] - b[key] ||
      a.departureAt.localeCompare(b.departureAt) ||
      a.id.localeCompare(b.id),
  );
}

function filterFlights(rows, onlyDirect) {
  return onlyDirect ? rows.filter(f => f.stops === 0) : rows;
}

/* ------------------------------------------------------------------ */
/* HTTP yardımcıları                                                   */
/* ------------------------------------------------------------------ */

function send(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

function fail(res, status, code, message) {
  send(res, status, { error: { code, message } });
}

/* ------------------------------------------------------------------ */
/* Sunucu                                                              */
/* ------------------------------------------------------------------ */

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const q = url.searchParams;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' });
    return res.end();
  }

  /* --- Servis durumu (gecikmesiz) --- */

  if (url.pathname === '/health') {
    return send(res, 200, { status: 'ok', mode, failOnceArmed, forceEmpty, flightCount: FLIGHTS.length });
  }

  // Gecikme modunu değiştir: /debug/mode?value=normal|slow|race
  if (url.pathname === '/debug/mode') {
    const value = q.get('value');
    if (value) {
      if (!MODES[value]) {
        return fail(res, 400, 'INVALID_MODE', `Geçersiz mod. Seçenekler: ${Object.keys(MODES).join(', ')}`);
      }
      mode = value;
    }
    return send(res, 200, { mode, options: Object.keys(MODES) });
  }

  // Tek seferlik hata kur: /debug/fail-once
  // Sonraki /flights isteği 500 döner, ondan sonrakiler normale döner.
  if (url.pathname === '/debug/fail-once') {
    failOnceArmed = true;
    return send(res, 200, { failOnceArmed, hint: 'Sonraki /flights isteği 500 dönecek.' });
  }

  // Bos sonuc anahtari: /debug/empty?value=on|off
  // Acikken /flights her zaman bos liste doner. Filtre acikken bos sonuc
  // davranisini uygulamanin kendi arayuzunden dogrulamak icin.
  if (url.pathname === '/debug/empty') {
    const value = url.searchParams.get('value');
    if (value) {
      if (value !== 'on' && value !== 'off') {
        return fail(res, 400, 'INVALID_VALUE', "value yalnizca 'on' veya 'off' olabilir.");
      }
      forceEmpty = value === 'on';
    }
    return send(res, 200, { forceEmpty });
  }

  if (url.pathname === '/debug/reset') {
    mode = 'normal';
    failOnceArmed = false;
    forceEmpty = false;
    return send(res, 200, { mode, failOnceArmed, forceEmpty });
  }

  /* --- Veri uçları (gecikmeli) --- */

  const simulate = q.get('simulate');
  const delay = simulate === 'slow' ? MODES.slow() : MODES[mode]();

  setTimeout(() => {
    if (simulate === 'error') {
      return fail(res, 500, 'FLIGHTS_UNAVAILABLE', 'Uçuşlar yüklenemedi. Lütfen tekrar deneyin.');
    }
    if (failOnceArmed && url.pathname.startsWith('/flights')) {
      failOnceArmed = false;
      return fail(res, 500, 'FLIGHTS_UNAVAILABLE', 'Uçuşlar yüklenemedi. Lütfen tekrar deneyin.');
    }

    // GET /flights/:id
    const detail = url.pathname.match(/^\/flights\/(.+)$/);
    if (req.method === 'GET' && detail) {
      const id = decodeURIComponent(detail[1]);
      const found = FLIGHTS.find(f => f.id === id);
      if (!found) return fail(res, 404, 'FLIGHT_NOT_FOUND', `Uçuş bulunamadı: ${id}`);
      return send(res, 200, { item: found });
    }

    // GET /flights
    if (req.method === 'GET' && url.pathname === '/flights') {
      const sort = q.get('sort') || 'price';
      if (sort !== 'price' && sort !== 'duration') {
        return fail(res, 400, 'INVALID_SORT', "sort yalnızca 'price' veya 'duration' olabilir.");
      }

      const onlyDirect = q.get('onlyDirect') === 'true';
      const page = Math.max(1, Number(q.get('page') || 1));
      const limit = Math.min(50, Math.max(1, Number(q.get('limit') || 8)));

      // ids verilirse yalnizca o kayitlar doner; onlyDirect uygulanmaz.
      // Favoriler ekranini tek istekte doldurmak icin kullanilabilir.
      const idsParam = q.get('ids');
      const ids = idsParam
        ? idsParam.split(',').map(v => v.trim()).filter(Boolean)
        : null;
      if (ids && ids.length > 50) {
        return fail(res, 400, 'TOO_MANY_IDS', 'ids en fazla 50 kimlik icerebilir.');
      }

      const empty = simulate === 'empty' || forceEmpty;
      let source = empty ? [] : FLIGHTS;
      if (ids) {
        const wanted = new Set(ids);
        source = source.filter(f => wanted.has(f.id));
      }

      const rows = sortFlights(ids ? source : filterFlights(source, onlyDirect), sort);

      const start = (page - 1) * limit;
      const items = rows.slice(start, start + limit);

      return send(res, 200, {
        items,
        meta: {
          page,
          limit,
          total: rows.length,
          totalPages: Math.max(1, Math.ceil(rows.length / limit)),
          hasMore: start + limit < rows.length,
          sort,
          onlyDirect: ids ? false : onlyDirect,
        },
      });
    }

    fail(res, 404, 'NOT_FOUND', `Bilinmeyen uç: ${url.pathname}`);
  }, delay);
});

server.listen(PORT, () => {
  /* eslint-disable no-console */
  console.log(`\n  Uçuş Keşfi — Mock HTTP Servisi`);
  console.log(`  http://localhost:${PORT}          (iOS Simulator)`);
  console.log(`  http://10.0.2.2:${PORT}           (Android Emulator)\n`);
  console.log(`  GET /flights?page=1&limit=8&sort=price&onlyDirect=false`);
  console.log(`  GET /flights?ids=FL001,FL007        (favoriler icin toplu getirme)`);
  console.log(`  GET /flights/:id`);
  console.log(`  GET /health\n`);
  console.log(`  Senaryolar:`);
  console.log(`    ?simulate=error        bu istek 500 döner`);
  console.log(`    ?simulate=empty        bu istek boş liste döner`);
  console.log(`    ?simulate=slow         bu istek 3 sn gecikir`);
  console.log(`    /debug/fail-once       sonraki istek 1 kez 500 döner`);
  console.log(`    /debug/mode?value=race yanıtlar sırasız döner (300-3000 ms)`);
  console.log(`    /debug/empty?value=on  tüm sonuçlar boş döner`);
  console.log(`    /debug/reset           varsayılana dön\n`);
});
