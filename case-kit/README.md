# Servis sözleşmesi

Bu klasör case'in hazır veri girdisidir. Bağımlılığı yoktur, `npm install` gerekmez.

```bash
cd case-kit
node server.js
```

| Ortam | Base URL |
|---|---|
| iOS Simulator | `http://localhost:4000` |
| Android Emulator | `http://10.0.2.2:4000` |
| Fiziksel cihaz | `http://<bilgisayarının-LAN-IP'si>:4000` |

Port: `PORT=5000 node server.js`

> Android'de düz `http` trafiği için `android:usesCleartextTraffic="true"` gerekir.
> Expo dev-client'ta debug build'de zaten açıktır.

`flight.types.ts` dosyasındaki tipler wire formatı tanımlar; olduğu gibi projene alabilirsin.

---

## `GET /flights`

Sayfalı uçuş listesi. **Filtreleme ve sıralama sunucuda yapılır** — sen parametre gönderirsin.

| Parametre | Değer | Varsayılan |
|---|---|---|
| `page` | 1'den başlar | `1` |
| `limit` | 1–50 | `8` |
| `sort` | `price` \| `duration` | `price` |
| `onlyDirect` | `true` \| `false` | `false` |
| `ids` | virgülle ayrılmış kimlik listesi, en fazla 50 | — |

```
GET /flights?page=1&limit=8&sort=price&onlyDirect=false
```

```jsonc
{
  "items": [ /* FlightDto[] */ ],
  "meta": {
    "page": 1, "limit": 8,
    "total": 24,          // filtre uygulandıktan SONRAKİ toplam
    "totalPages": 3,
    "hasMore": true,
    "sort": "price", "onlyDirect": false
  }
}
```

**Sıralama kuralı:** `sort=price` → `priceMinor` artan. `sort=duration` → `durationMinutes` artan.
Eşitlikte önce `departureAt`, sonra `id` artan. Sunucu bu sırayı garanti eder; testlerinde
aynı kuralı varsayabilirsin.

### `ids` ile toplu getirme

Belirli uçuşları tek istekte almak için kullanılır; favoriler ekranını doldurmak için
işine yarayabilir.

```
GET /flights?ids=FL001,FL007,FL013     ->  yalnızca o kayıtlar, fiyat sırasında
```

`ids` verildiğinde `onlyDirect` uygulanmaz; `sort` ve sayfalama uygulanır. Bilinmeyen
kimlikler sessizce atlanır. 50'den fazla kimlik `400 TOO_MANY_IDS` döner.

Favorileri nasıl saklayacağın sana ait: yalnızca kimlik saklayıp bu uçtan tazeleyebilir
ya da uçuşun tamamını yerelde tutabilirsin. **İkisi de kabul edilir**; tercihini
README'nde gerekçelendir.

## `GET /flights/:id`

```
GET /flights/FL013     ->  { "item": { ...FlightDto } }
```

Bilinmeyen id → `404` + `{ error: { code: "FLIGHT_NOT_FOUND", message } }`

## Hata biçimi

Tüm hatalar aynı gövdeyi döner: `{ "error": { "code": ..., "message": ... } }`

| Kod | Durum | Ne zaman |
|---|---|---|
| `FLIGHTS_UNAVAILABLE` | 500 | `simulate=error` veya `/debug/fail-once` |
| `FLIGHT_NOT_FOUND` | 404 | Bilinmeyen uçuş kimliği |
| `INVALID_SORT` | 400 | `sort` `price`/`duration` dışında |
| `TOO_MANY_IDS` | 400 | `ids` 50'den fazla kimlik içeriyor |

## `GET /health`

`{ "status": "ok", "mode": "normal", "failOnceArmed": false, "forceEmpty": false, "flightCount": 24 }`

---

## Senaryolar

Hiçbiri için kod düzenlemen veya sunucuyu yeniden başlatman gerekmez.

**İstek başına** (query parametresi):

| | Sonuç |
|---|---|
| `?simulate=error` | `500` + `{ error: { code: "FLIGHTS_UNAVAILABLE", message } }` |
| `?simulate=empty` | `200` + `items: []`, `total: 0` |
| `?simulate=slow` | 3 sn gecikme |

**Sunucu geneli** (tarayıcıdan veya curl ile bir kez çağır):

| Uç | Etki |
|---|---|
| `GET /debug/fail-once` | **Sonraki** `/flights` isteği 1 kez `500` döner, sonrakiler normal. Retry akışını gerçek uygulamada denemek için. |
| `GET /debug/mode?value=race` | Yanıtlar 300–3000 ms arası rastgele gecikir; **sırasız döner**. |
| `GET /debug/mode?value=slow` | Tüm yanıtlar 3 sn gecikir. |
| `GET /debug/empty?value=on` | `/flights` her zaman boş liste döner. Filtre açıkken boş sonuç davranışını kendi arayüzünden denemek için. `value=off` ile kapanır. |
| `GET /debug/reset` | Varsayılana döner. |

Varsayılan gecikme her istekte 350–600 ms'dir. Rastgele hata üretilmez.

---

## Veri kuralları

24 kayıt sabittir; hepsi kurgusaldır ve gerçek tarifeyi temsil etmez.

- Rota: İstanbul (`IST` veya `SAW`) → Antalya (`AYT`). Kalkış günü **15 Ekim 2026**.
  Cihazın bugünkü tarihine göre eleme yapma.
- `departureAt` / `arrivalAt` ISO 8601 ve `+03:00` ofsetlidir. Saatleri
  **Europe/Istanbul** olarak göster — cihazın saat dilimine kaydırma.
  `FL024` ertesi gün varır; detayda tarihi buna göre göster.
- `priceMinor` TRY **kuruş** değeridir: `355000` = `3.550,00 TL`.
  Sıralamada formatlanmış metni değil sayıyı kullan.
- `durationMinutes` toplam yolculuk süresidir. `stops`: `0` direkt, `1` aktarmalı.
  Aktarma segmenti ayrıntısı istenmiyor.
- `baggageKg`: `0` bagajın **dahil olmadığını**, `null` **bilginin bulunmadığını** belirtir.
  İkisi farklı gösterilmeli.
- Uçuş kimlikleri (`FL001`…`FL024`) sabittir; favorileri bu kimliklerle ilişkilendirebilirsin.

---

## Hızlı doğrulama

```bash
curl "http://localhost:4000/flights?page=1&limit=8&sort=price"
```

İlk üç kayıt `FL004`, `FL009`, `FL006` gelmelidir. Gelmiyorsa yanlış bir şey var.
