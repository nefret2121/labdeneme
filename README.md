# DuctusLab — 3D Oskültasyon ve Hemodinami Simülatörü

Tarayıcıda çalışan, kayıt değil **parametrik ses sentezi** kullanan klinik semiyoloji simülatörü (DuctusMed).

- Kalp, akciğer ve abdomen oskültasyon odakları; ön / arka yüz
- Gerçek zamanlı Web Audio sentezi: S1, S2, S3, S4, klik, açılma sesi, üfürüm zarfları, raller, sürtünme sesi
- Hemodinamik konsol: önyük, ardyük, hastalık evresi, kalp ve solunum hızı
- Fizyolojik provokasyon testleri (Valsalva, çömelme, ayağa kalkma, el sıkma, inspiryum)
- Canlı Wiggers basınç eğrileri ve fonokardiyogram
- Ayırıcı tanı düellosu, Günün Vakası, OSCE sınav modu, 9:16 stüdyo düzeni

Canlı site: https://nefret2121.github.io/labdeneme/

Tek dosya: `index.html`. Ses için sayfada "Ses Kapalı" düğmesine basın.

Klavye kısayolları: `1–6` provokasyon · `S` ses · `D` / `B` diyafram / çan · `R` stüdyo.

> Sesler ve hemodinamik değerler eğitim amaçlı sentetik yaklaşımlardır; klinik karar aracı değildir.

## DuctusLab Klinik Simülasyon Paketi

Tüm modüller tek dosyada: `ductuslab-suite.html` → https://nefret2121.github.io/labdeneme/ductuslab-suite.html

| Modül | Bağımsız sayfa | İçerik |
|---|---|---|
| Oskültasyon & Wiggers | `/` | Three.js 3D toraks (BodyParts3D: ghost gövde, iskelet, Wiggers fazıyla atan kalp, solunumla genişleyen akciğerler, damarlar, karın organları), 3D stetoskop (diyafram/çan çevirme, temas basısı, üfürüm yayılım halkaları), ön/arka yüz kamera geçişi, sürükle-bırak odak seçimi; parametrik ses sentezi, hemodinamik konsol, provokasyon testleri |
| Mekanik Ventilasyon & Kan Gazı | `/ventilator/` | VC-CMV fizik motoru, oto-PEEP, hold manevraları, ABG |
| 3D EKG Simülatörü | `/ekg/` | Dower 3B vektör motoru, 12 vaka, elektrot laboratuvarı, pacemaker |
| 🚑 Acil Yatak Başı Klinik Konsol | `/acil/` | Deterministik kan gazı çözücü (Henderson-Hasselbalch tutarlılık, Winter, albümin düzeltmeli AG, delta-delta, P/F, A-a), Devine PBW + ARDSNet ventilatör reçetesi → **Ventilasyon simülatörüne tek tıkla aktarım**; EKG kriter sihirbazı (Brugada, anstabilite) + ampul/infüzyon dozları → **3B EKG simülatöründe ritmi aç**; HEART ve Wells + yaş düzeltmeli D-dimer |
| 3D Ekokardiyografi & POCUS | `/eko/` | Three.js 3D toraks: gerçek anatomi mesh'leri (BodyParts3D — deri, kostalar/sternum, kalp, büyük damarlar, karaciğer, diyafram), doğrudan sürüklenen prob ve kesit yelpazesi; mesh'e kalibre tek analitik anatomik modelden (göğüs duvarı, kostalar, akciğer, karaciğer, 4 odacık, kapaklar, perikart) gerçek zamanlı prosedürel B-Mod (benek, odak bağımlı PSF, TGC, kosta/akciğer gölgesi); 9 standart pencere (PLAX, 3×PSAX, A4C/A5C/A3C, SubX, IVC); M-Mod, CW spektral ve renkli Doppler (BART, Nyquist); 6 patoloji; akıllı prob/ölçüm jürisi |

Oskültasyon modülünün 3D gövdesi (`assets/osk.bin|json`, dış dosya) ve Eko modülündeki 3D anatomi, [BodyParts3D 4.0](https://lifesciencedb.jp/bp3d/) (© The Database Center for Life Science, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)) verisinden türetilmiş, sadeleştirilip tek dosyaya gömülmüş 69 parçadır.

**Gerçek klip katmanı (`eko/clips/`):** `manifest.json` pencere kimliğini (`a4c`, `ivc`, `plax`, …) bir WebP sprite sheet'e ve sektör geometrisine (apeks, yarıçap, yarı açı, px/cm, döngü tipi `cardiac`/`resp`) bağlar. Jüri pencereyi tanıdığında (poz toleransta, normal vaka, Doppler kapalı) gerçek klip prosedürel görüntünün üstüne yumuşakça biner; prob düzlemden çıkınca prosedürele geri döner. Yeni klip eklemek için sprite sheet + manifest satırı yeterlidir. Mevcut klipler Wikimedia Commons'tan alınmıştır (GE; `manifest.json` içindeki `credit` alanı — lisans satırı Commons sayfasından doğrulanıp güncellenmelidir).

**Nöroşirürji (bağımsız, ES modül):** `ductuslab-neurosurgery.html` — IC-PC anevrizma bilişsel mikrocerrahi simülatörü, 1. aşama: Three.js 0.160 (importmap), ACES + RoomEnvironment PMREM, 18° telefoto mikroskop + koaksiyel spot, kısıtlı OrbitControls (MAG x2.5–x8); ridged-noise giruslu frontal/temporal loblar (vertex AO, prosedürel pial damar map+bump), sfenoid kanat/dura, tentoryum, araknoid trabeküller; MarchingCubes ile ICA–M1–A1–PCom ve organik boyunlu kese + bleb (kırılganlık özniteliği), AChA ve talamoperforanlar, CN II/kiyazma ve kubbeye temas eden CN III; `getCardiacPulse(t)` hem görsel nabzı hem `window.NeuroSDF` kapsül/elipsoid SDF'lerini besler; ICG dalgası (vertex varış zamanı), etiketler, pre-op pupil kartı, kontrol listesi, monitör, 1–6 alet barı. **2. aşama:** 3B aletler + 120 Hz fizik döngüsü, Shift+tekerlek derinlik, Boşluk ile mikroskop, sağ-tık çift el (sabit aspiratör); `D(t)` rüptür hasar modeli (bleb>kubbe>boyun>ICA kırılganlığı, histerezis), hacim korunumlu kanama (`Q=k·MAP·alan`, geçici klips→%15 retrograd), GPU kan jeti + saha gölü + görüş bulanıklığı; klips çene SDF denetimi (boyun kapanışı / dog-ear / ICA stenozu / sıkışan AChA·PCom·CN III) ve ICG patensi yeniden yönlenmesi. **3. aşama:** gerçekçi Yaşargil klipsleri (helezon yay gövdesi + 8–10 mm paralel çeneler + sıkışma izi) ve yarı-şeffaf hayalet önizleme (Q/E/R ile canlı açı, sıkışmada kırmızı uyarı); 4 vaka varyantı (`?case=1–4`: standart / fetal PCom / boyna bitişik AChA / ince bleb+CN III); saf WebAudio ses (nabız, kana göre gurultulu aspiratör, bipolar cızırtı, klips tık); "Operatif Kapanış Beyanı" → gözlenen-kanıt testi (ICG line-of-sight görünürlük izleme; görmeden "doğrulandı" denince `CLAIM_EXCEEDS_VISIBLE_EVIDENCE`); 4 ağırlıklı kategorili jüri karnesi + kritik güvenlik kilidi (AChA oklüzyon / fetal PCom kapanması / CN III hasarı / aktif rüptür / geçici klips çıkarılmaması), DOĞRULANDI/ANORMAL/DEĞERLENDİRİLEMEDİ/KONTROL EDİLMEDİ etiketleri, rüptürde `T_yanıt`/`T_kontrol`; şeffaf X-Ray incelemesi (damar %70 cam, renkli klips-dal ilişkisi, olay zaman çizelgesi); post-op 1. Gün / 3. Ay klinik takip; "Aynı Vakada Klipsi Düzelt" + "Yeni Vaka Başlat". Durumlar `window.NeuroSimState` / `window.NeuroEventLog`'da. Portalda yeni sekmede açılır.

Paket içindeki "Jüri" çekmecesi tamamen çevrimdışı, kural tabanlı çalışır; Eko modülünde prob tutuşu (kosta gölgesi, foreshortening), derinlik/gain ve Doppler açısı ihlallerini canlı izler, Doppler açı ve foreshortening deneylerini kayda geçer.

Modüller arası aktarım: `DuctusSuite.sendTo(modül, eylem, veri)` hedef modülü açar ve modülün `window.DuctusBridge.apply(eylem, veri)` köprüsü hazır olunca veriyi verir (Acil Konsol → Ventilasyon: VT/RR/PEEP/FiO₂/İ:E + profil; Acil Konsol → EKG: senaryo + HR/K⁺). Bağımsız sayfalarda aynı aktarım `#bridge=` URL hash'iyle yapılır.

Paket üst barı tektir: modüller `DuctusSuite.setModuleBar(id, {tabs, actions})` ile alt sekmelerini ve eylemlerini bu çubuğa yansıtır; tıklamalar `window.DuctusModuleBar.onAction(id)` ile modüle döner (Oskültasyon: Kalp/Akciğer/Abdomen, Ses, Stüdyo).

Modül kaynakları `MODULE_SRC` içine gömülüdür; bir modülün bağımsız dosyası değiştiğinde paket aynı dönüşümle (`JSON.stringify` + `<\script` kaçışı) yeniden üretilmelidir.
