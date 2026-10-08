# Uçuş Keşfi — React Native case

İstanbul → Antalya uçuşlarını listeleyen, sunucu tarafında filtreleyip sıralayan, sayfa sayfa yükleyen
ve favorileri cihazda kalıcı tutan Expo + TypeScript uygulaması.

## 1. Kurulum ve çalıştırma

Gereken: Node 18+ (geliştirmede 24.2.0), Xcode + iOS Simulator, CocoaPods. Xcode'un iOS platform bileşeni
kurulu olmalı (Xcode > Settings > Components veya `xcodebuild -downloadPlatform iOS`); yoksa Xcode hiçbir
simülatörü hedef kabul etmez ve derleme "iOS xx is not installed" hatasıyla durur.

```bash
# 1) Mock servis (ayrı terminal) — bağımlılığı yok
cd case-kit
node server.js            # http://localhost:4000

# 2) Uygulama — development build
npm install
npx expo run:ios          # ilk çalıştırma: prebuild + pod install + Xcode derlemesi, simülatöre kurar, Metro'yu açar
```

Favoriler native bir modülle (MMKV) saklandığı için uygulama **Expo Go'da açılmaz**; `npx expo run:ios` yerel bir
debug build alır. `ios/` klasörü Continuous Native Generation ile üretilir ve `.gitignore`'dadır; yoksa ilk
çalıştırmada `npx expo prebuild` kendiliğinden çalışır. İlk derleme birkaç dakika sürer.

Uygulama simülatörde kuruluyken, yalnız JS/TS değişikliklerinde yeniden derlemek gerekmez:

```bash
npx expo start --dev-client   # sadece Metro; terminalde "i" kurulu uygulamayı açar
```

Projede `expo-dev-client` olmadığı için `npx expo start` tek başına Expo Go'yu hedefler; `--dev-client` bayrağı bu
yüzden gerekli. Native bağımlılık veya `app.json` değişirse `npx expo run:ios` yeniden çalıştırılır.

Servis adresi `src/api/client.ts` içinde: iOS'ta `http://localhost:4000`, Android emülatöründe `http://10.0.2.2:4000`.
Fiziksel cihaz için: `EXPO_PUBLIC_API_URL=http://<LAN-IP>:4000 npx expo run:ios --device` (denenmedi).

## 2. Doğrulanan platform

| | |
|---|---|
| Platform | iOS Simulator — iPhone 16 Pro, iOS 18.6 (Xcode 26.4) |
| Expo SDK | 57.0.27 — development build (`expo run:ios`, Debug) |
| React Native / React | 0.86.3 / 19.2.3 |
| TypeScript | 6.0 |
| react-native-mmkv / react-native-nitro-modules | 4.3.2 / 0.37.1 |
| CocoaPods | 1.16.2 |
| Node / npm | 24.2.0 / 11.3.0 — kilit dosyası: `package-lock.json` |

Android'de çalıştırılmadı.

## 3. Test

```bash
npm test            # jest (jest-expo preset)
npm run typecheck   # tsc --noEmit
```

| Dosya | Ne doğruluyor |
|---|---|
| `__tests__/flightQuery.test.ts` | **Zorunlu test 1.** Filtre/sıralama → `page`, `limit`, `sort`, `onlyDirect` parametreleri; filtre değişince sorgunun `page=1`'den başlaması. |
| `__tests__/favoritesStore.test.ts` | **Zorunlu test 2.** Favori ekle/çıkar → depolamaya yazma → "uygulamayı yeniden aç" (aynı depolamayla yeni store oluştur) → aynı favoriler senkron olarak geri geliyor. Ayrıca: store oluşturulurken depolamaya **hiç yazılmıyor**; bozuk JSON; yazma hatasında liste değişmiyor ve `lastWriteError` doluyor. Depolama, testte bellek içi bir `KeyValueStorage` ile enjekte ediliyor. |
| `__tests__/FlightListScreen.test.tsx` | **P1.** Ekran etkileşim testleri (gerçek ekran + TanStack Query, yalnız `fetch` mock'lu): 500 → "Tekrar dene" → başarılı liste; Switch ile filtre değişince yeni istek `page=1&onlyDirect=true` ve eski kartlar yok; sırasız yanıt (iki varyant: abort'a uyan ve uymayan fetch); favori butonu navigasyonu tetiklemiyor, kart tetikliyor. |
| `__tests__/format.test.ts` | Kuruş → `3.550,00 TL`, bagaj `0`/`null` ayrımı, Europe/Istanbul saat/tarih (FL024 ertesi gün), süre. |

Snapshot testi yok.

## 4. Mimari ve kararlar

```
src/
  api/          HTTP katmanı: client (fetch + ApiError), flights (sorgu üreticisi + uç fonksiyonları), queryClient
  domain/       Saf formatlayıcılar (fiyat, saat, tarih, süre, bagaj)
  state/        storage (tek MMKV örneği + KeyValueStorage arayüzü), favoritesStore — zustand
  hooks/        useFlightList (sayfalı liste), useFlight (detay)
  components/   FlightCard, FavoriteButton, StateViews, theme
  screens/      FlightList, FlightDetail, Favorites
  navigation/   Tab (Uçuşlar / Favoriler) + her tab'da native-stack
```

- **Sunucu state'i: TanStack Query (`useInfiniteQuery`).** Sayfalama, yükleniyor/hata durumları, iptal ve
  önbellek elle yazılsa yüzlerce satır ve kenar durumu demekti. Kararlar:
  - `queryKey = ['flights','list', filters]` — her filtre/sıralama ayrı sorgu. Filtre değişince sayfalama
    kendiliğinden başa döner, eski sayfalar yeni sonuca karışamaz, **geç dönen eski yanıt yalnız kendi
    anahtarına yazılır** (P1 race). Ayrıca `AbortSignal` fetch'e geçiriliyor.
  - `gcTime: 0` (yalnız liste) — terk edilen filtrenin sayfaları hemen atılır; aynı filtreye dönülünce sayfa 1'den başlar.
  - `loadMore` guard'ı: `hasNextPage && !isFetchingNextPage && !isFetching && !isError` + `fetchNextPage({ cancelRefetch: false })`.
    TanStack'in varsayılanı (`cancelRefetch: true`) süren isteği iptal edip aynı sayfayı yeniden ister; bu yüzden
    "aynı sayfa iki kez istenmemeli" kuralı için ikisi birden gerekli.
  - `retry: false` — hata hemen gösterilir; tekrar deneme kullanıcının "Tekrar dene"sinde. Sonraki sayfa
    hatasında yalnız o sayfa yeniden istenir, yüklenmiş sayfalar silinmez.
  - `staleTime: Infinity` — veri sabit; detaydan dönüşte yeniden çekme yok, yüklenmiş sayfalar ve kaydırma konumu korunur.
- **Filtre state'i ekranın `useState`'inde.** Liste ekranı stack'te mounted kaldığı için detaydan dönüşte korunur;
  kalıcılık istenmediği için global store gereksiz.
- **Favoriler: zustand store + MMKV, uçuşun tamamı (DTO) saklanıyor.** Veri seti sabit; böylece favoriler
  ekranı ağsız ve anında açılır, liste/detay/favoriler aynı kaynaktan okuduğu için işaretler anında tutarlıdır.
  (Alternatif `ids` ile tazelemeydi; fiyat değişebilen gerçek bir serviste onu seçerdim.)
  - **Neden MMKV:** okuma senkron. `createFavoritesStore(storage)` ilk state'i oluşturulurken diskten okur;
    hydrate penceresi olmadığı için "açılışta boş state'i diske yazma" sorunu yapısal olarak ortadan kalkar —
    bir zamanlama kuralına (ve onu koruyan `hydrated` bayrağı, devre dışı butonlar) gerek kalmaz. Oluşturmada
    hiç yazma yok; yazma yalnız kullanıcı aksiyonunda. Performans gerekçe değil: veri en fazla 24 kayıt.
  - **Bedeli:** MMKV native modül (Nitro) olduğu için Expo Go'da çalışmaz, development build gerekir
    (Xcode + CocoaPods, ilk derleme birkaç dakika). İlk sürüm AsyncStorage ile Expo Go'da çalışıyordu;
    kalıcılık kuralını yapı gereği garanti etmek bu bedele değer görüldü.
  - zustand'ın `persist` middleware'i yerine elle yazılmış kalıcılık: okuma/yazma ve hata davranışı
    açıkça kodda ve testte görünsün diye. Depolama `src/state/storage.ts`'teki küçük `KeyValueStorage`
    arayüzünün arkasında; testte bellek içi bir uygulama enjekte ediliyor.
  - Önce diske yazılır, sonra tek `set` ile yayınlanır. MMKV `set` hata fırlatırsa liste değişmez ve
    Favoriler ekranında tek satır uyarı gösterilir (`lastWriteError`).
- **Detay** `useQuery(['flights','detail',id])`, `initialData` önce liste önbelleğinden sonra favorilerden —
  çoğu durumda ek istek atılmaz; deep-link benzeri durumda ağdan çekilir.
- **Tarih/saat** Intl'e ve cihaz saat dilimine bağlı değil: Europe/Istanbul 2016'dan beri sabit UTC+3,
  epoch + 3 saat UTC getter'larıyla okunuyor. Fiyat `priceMinor` üzerinden tam sayı aritmetiğiyle formatlanıyor.
- **Navigasyon:** React Navigation (bottom-tabs + native-stack). Expo Router dosya tabanlı rotalar için
  fazla; iki tab ve tek detay ekranı için açık bir navigator tanımı daha okunur.
- **Erişilebilirlik:** Favori butonu `accessibilityState.selected` + şekil (★/☆) + metin ("Favoride");
  sıralama seçenekleri `radiogroup` içinde `radio` + `checked`, ayrıca ✓ ve kalın çerçeve; direkt filtresi satırın tamamı `role="switch"` + `checked`.
  iOS'ta erişilebilir kart iç butonu VoiceOver'dan gizlediği için kartın özet etiketi ve
  "Favorilere ekle/çıkar" özel aksiyonu var.
- **Best-practice kontrolü ve bilinçli olarak yapılmayanlar.** Kod, Callstack'in `react-native-best-practices` /
  `react-navigation` ve `expo-react-native-performance` kontrol listeleriyle gözden geçirildi. Uyanlar: kararlı
  `renderItem`/`keyExtractor` + `memo`'lu kart, boolean dönen store seçicileri, fetch iptali, önbellekten detay.
  Yapılmayanlar ölçülmemiş optimizasyon olacağı için: FlashList ve `getItemLayout` (en fazla 24 kayıt, kart
  yüksekliği değişken), odağa gelince yeniden çekme (§2.4 yüklenmiş sayfaların korunmasını istiyor), statik
  navigasyon API'si ve native bottom tabs (davranış kazancı yok).

## 5. Harcanan süre

_(Teslimden önce doldurulacak.)_

## 6. P1

Her iki P1 maddesi de yapıldı.

1. **Üçüncü test (Tekrar dene → başarılı liste):** `FlightListScreen.test.tsx`, ilk test. Ekran render edilip
   "Tekrar dene" butonuna basılıyor, kartlar ve "24 uçuş" görünüyor, hata kayboluyor.
2. **Sırasız yanıt dayanıklılığı:**
   - Otomatik: aynı dosyada, istekler elle bırakılan promise'lerle bekletiliyor; yeni sıralamanın yanıtı önce,
     eski yanıt sonra çözülüyor → ekranda yeni sonuç kalıyor. Abort'a uyan ve uymayan iki fetch varyantıyla.
     Kontrol: queryKey'den `filters` geçici olarak çıkarıldığında filtre testi ve iki race testi kırılıyor.
   - Manuel (simülatör): `curl localhost:4000/debug/mode?value=race`, ardından sıralama/direkt filtresi art arda
     9 kez değiştirildi; 4,5 sn sonra ekranda son seçimin sonucu (direkt + fiyat, 17 uçuş, ilk kayıt FL002)
     sunucunun doğrudan yanıtıyla birebir aynıydı.

### Simülatörde elle doğrulananlar

Açılış listesi FL004, FL009, FL006 sırasıyla ve "24 uçuş"; sona kaydırınca 24 kaydın tamamı tekrarsız yüklendi
ve "Tüm uçuşlar listelendi" göründü; karttaki favori dokunuşu navigasyonu tetiklemedi; detayda favori ekle →
geri dön → liste ve tab rozeti güncel; direkt + süre → 17 uçuş, sunucu sırasıyla aynı; `/debug/empty` ile
"Uçuş bulunamadı" + "Filtreleri temizle"; `/debug/fail-once` ile hata → "Tekrar dene" → liste;
uygulama tamamen sonlandırılıp açıldığında favoriler korundu; son favori çıkarılınca boş durum;
FL024 detayında varış tarihi 16 Ekim 2026, bagaj "Bagaj dahil değil" (FL009'da da).

Yukarıdakiler ilk sürümde (AsyncStorage, Expo Go) yapıldı. MMKV'ye geçişten sonra development build
(`expo run:ios`, iPhone 16 Pro / iOS 18.6) üzerinde yeniden doğrulananlar: açılış listesi aynı (24 uçuş,
FL004, FL009, FL006); iki favori ekle → uygulamayı `simctl terminate` ile öldür → aç → ikisi de işaretli,
rozet "2"; Favoriler ekranında ikisini çıkar → boş durum → öldür/aç → rozet "0". Liste ve filtre katmanı
bu geçişte değişmediği için diğer akışlar yeniden elle denenmedi; jest testleri tamamı geçiyor.

## 7. Bilinen eksikler

- Yalnız iOS Simulator'da doğrulandı; Android ve fiziksel cihazda denenmedi.
- Favoriler uçuşun o anki kopyasını tutar; sunucuda fiyat değişse favoriler ekranı eski değeri gösterir
  (sabit veri seti için bilinçli tercih, bkz. §4).
- Development build gerektiriyor; Expo Go'da açılmaz (bkz. §1, §4).
- MMKV verisi şifresiz saklanıyor (şifreleme anahtarı verilmedi). Favoriler hassas veri olmadığı için gerek görülmedi.
- Hata mesajları ayrıntı vermez: 404 dışındaki tüm servis hataları aynı metni gösterir.
- Liste için pull-to-refresh yok (istenmedi).
- Ekran testleri `fetch`'i mock'lar; mock servisle uçtan uca (Detox/Maestro) otomatik test yok.

## AI kullanımı

Claude Code (Anthropic) kullanıldı. Temel iskelet (API katmanı, formatlayıcılar, favori store'u, navigasyon)
ana oturumda yazıldı; liste ekranı + sayfalama hook'u, detay + favoriler ekranları ve testler alt ajanlara
paralel dağıtıldı, çıktıları ana oturumda okunup gözden geçirildi. Favorilerin AsyncStorage'dan MMKV'ye
geçişi de (store + testler, native build, README) alt ajanlarla paralel yapıldı. Doğrulama: `tsc` ve jest; race testinin
gerçekten hata yakaladığını görmek için kod bilerek bozulup testin kırıldığı kontrol edildi; tüm P0 akışları
iOS Simulator'da mock servise karşı tek tek denendi (yukarıdaki liste). Simülatörde Switch'in sentetik
dokunuşa tepki vermemesi bu sırada fark edildi ve satırın tamamı dokunulabilir yapıldı; VoiceOver'ın kart
içindeki favori butonunu gizlemesi de gözden geçirmede yakalanıp düzeltildi.
