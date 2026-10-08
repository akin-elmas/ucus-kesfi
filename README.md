# Uçuş Keşfi

İstanbul → Antalya uçuşlarını listeleyen, filtreleyip sıralayan ve favorileri kaydeden Expo + TypeScript uygulaması.

> Favoriler MMKV ile saklandığı için uygulama Expo Go'da açılmaz; development build gerekir (macOS + Xcode).

## 1. Kurulum

Gereken: Node 18+, Xcode (iOS platform bileşeni kurulu), CocoaPods.

```bash
# Mock servis
cd case-kit && node server.js

# Uygulama
npm install
npx expo run:ios                 # ilk derleme birkaç dakika sürer
npx expo start --dev-client      # sonraki çalıştırmalarda yalnız Metro
```

Android (release APK, fiziksel cihaz için Mac'in LAN IP'si):

```bash
npx expo prebuild --platform android
cd android && EXPO_PUBLIC_API_URL=http://<LAN-IP>:4000 ./gradlew assembleRelease
```

## 2. Platform

iOS Simulator, iPhone 16 Pro (iOS 18.6, Xcode 26.4). Android'de yalnız release APK derlendi.

Expo SDK 57.0.27 · React Native 0.86.3 · React 19.2.3 · TypeScript 6.0 · Node 24.2.0 · npm 11.3.0 · `package-lock.json`

## 3. Test

```bash
npm test
npm run validate   # typecheck + lint + format + test
```

- `flightQuery.test.ts`: filtre ve sıralama parametreleri, filtre başına ayrı sorgu anahtarı.
- `favoritesStore.test.ts`: favori ekle/çıkar, depodan geri yükleme, açılışta depoya yazılmaması.
- `FlightListScreen.test.tsx`: yükleniyor iskeleti, hata → "Tekrar dene" → liste, sonraki sayfa hatası, filtre değişince sayfa 1'e dönüş, boş sonuç → "Filtreleri temizle", sırasız yanıt, favori butonunun detayı açmaması.
- `FavoritesScreen.test.tsx`: kalkış saatine göre sıralama, detaya geçiş, son favori çıkınca boş durum.
- `format.test.ts`: fiyat, saat/tarih (Europe/Istanbul), bagaj metinleri.

## 4. Kararlar

- **TanStack Query** (`useInfiniteQuery`): sayfalama, yükleniyor/hata durumları ve istek iptali hazır geliyor. Sorgu anahtarı filtreyi içerdiği için filtre değişince sayfalama baştan başlıyor ve geç dönen eski yanıt yeni listenin üzerine yazamıyor.
- **Favoriler: zustand + MMKV.** Uçuşun tamamı saklanıyor; favoriler ekranı ağ isteği atmıyor. MMKV senkron okuduğu için store açılışta diskteki favorilerle başlıyor; boş state'in kayıtları ezebileceği bir an yok. Diske yalnız kullanıcı aksiyonunda yazılıyor.
- **Filtre state'i** liste ekranında; ekran stack'te açık kaldığı için detaydan dönünce korunuyor.
- **Saat ve tarih** cihazın saat diliminden bağımsız (İstanbul sabit UTC+3). Fiyat kuruş üzerinden tam sayıyla formatlanıyor.
- **Navigasyon:** React Navigation, iki tab ve her tab'da bir stack.
- FlashList, `getItemLayout` gibi optimizasyonlar 24 kayıt için gereksiz görüldü.

## 5. Harcanan süre

Yaklaşık 2,5 saat (okuma, kurulum, geliştirme, test ve README dahil).

## 6. P1

İkisi de yapıldı:

1. "Tekrar dene" ile başarılı listenin gelmesi ekran testiyle doğrulanıyor.
2. Sırasız yanıt: testte eski yanıt yeni yanıttan sonra döndürülüyor, ekranda yeni sonuç kalıyor. Simülatörde `/debug/mode?value=race` ile de denendi.

## 7. Bilinen eksikler

- Expo Go'da açılmaz, development build gerekir.
- Android fiziksel cihazda tam test edilmedi.
- Favoriler uçuşun kaydedildiği andaki halini gösterir; sunucuda fiyat değişirse güncellenmez.
- Uçtan uca (Detox/Maestro) test yok; ekran testleri `fetch`'i mock'luyor.

## AI kullanımı

Claude Code kullanıldı. Kod, case maddelerine ve `react-native-best-practices`, `react-navigation`, `expo-react-native-performance` skill'lerine göre AI ajanlarına review ettirildi. Çıktı testler, `npm run validate` ve simülatörde elle denenerek doğrulandı.
