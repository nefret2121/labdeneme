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
| Oskültasyon & Wiggers | `/` | Parametrik ses sentezi, hemodinamik konsol, provokasyon testleri |
| Mekanik Ventilasyon & Kan Gazı | `/ventilator/` | VC-CMV fizik motoru, oto-PEEP, hold manevraları, ABG |
| 3D EKG Simülatörü | `/ekg/` | Dower 3B vektör motoru, 12 vaka, elektrot laboratuvarı, pacemaker |
| 3D Ekokardiyografi & POCUS | `/eko/` | Three.js 3D toraks + deride kayan prob; tek analitik anatomik modelden (göğüs duvarı, kostalar, akciğer, karaciğer, 4 odacık, kapaklar, perikart) gerçek zamanlı prosedürel B-Mod (benek, odak bağımlı PSF, TGC, kosta/akciğer gölgesi); 9 standart pencere (PLAX, 3×PSAX, A4C/A5C/A3C, SubX, IVC); M-Mod, CW spektral ve renkli Doppler (BART, Nyquist); 6 patoloji; akıllı prob/ölçüm jürisi |

Paket içindeki "Jüri" çekmecesi tamamen çevrimdışı, kural tabanlı çalışır; Eko modülünde prob tutuşu (kosta gölgesi, foreshortening), derinlik/gain ve Doppler açısı ihlallerini canlı izler, Doppler açı ve foreshortening deneylerini kayda geçer.

Modül kaynakları `MODULE_SRC` içine gömülüdür; bir modülün bağımsız dosyası değiştiğinde paket aynı dönüşümle (`JSON.stringify` + `<\script` kaçışı) yeniden üretilmelidir.
