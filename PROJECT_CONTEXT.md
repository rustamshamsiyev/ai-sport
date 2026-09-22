# ERP SPORT AI — FRONTEND MODULLARI

ERP Sport AI tizimining frontend qismida quyidagi
13 ta asosiy modul ALBATTA mavjud bo'lishi kerak.

Ularning nomi va tartibi saqlansin.

## ASOSIY MODULLAR

1. Ma'lumotlarni yig'ish
2. Ma'lumotlarni standartlashtirish
3. Sportchi tahlili profili
4. Trener tahlili profili
5. Samaradorlik
6. O'zgarishlar tahlili
7. Taqqoslash
8. Bashorat
9. Tavsiyalar
10. Riskni aniqlash
11. Vizual tahlil
12. Izohlash SI
13. Raqamli nazorat


# SIDEBAR

Frontend Sidebar quyidagi mantiqda qurilsin:

Dashboard

Quyi tizimlar
  01. Ma'lumotlarni yig'ish
  02. Ma'lumotlarni standartlashtirish
  03. Sportchi tahlili profili
  04. Trener tahlili profili
  05. Samaradorlik
  06. O'zgarishlar tahlili
  07. Taqqoslash
  08. Bashorat
  09. Tavsiyalar
  10. Riskni aniqlash
  11. Vizual tahlil
  12. Izohlash SI
  13. Raqamli nazorat

Boshqaruv
  - Ma'lumotlar bazasi
  - Semantik model
  - Biznes obyektlar
  - Bog'lanishlar
  - Biznes qoidalar
  - Datasetlar

Tizim
  - Foydalanuvchilar
  - Audit
  - Sozlamalar


# ROUTES

/pages
  /index.vue

  /data-collection
    /index.vue

  /data-standardization
    /index.vue

  /athlete-analysis
    /index.vue
    /[id].vue

  /coach-analysis
    /index.vue
    /[id].vue

  /efficiency
    /index.vue

  /changes-analysis
    /index.vue

  /comparison
    /index.vue

  /prediction
    /index.vue

  /recommendations
    /index.vue

  /risk-detection
    /index.vue

  /visual-analysis
    /index.vue

  /ai-explanation
    /index.vue

  /digital-control
    /index.vue

  /admin
    /database.vue
    /semantic-model.vue
    /business-objects.vue
    /relations.vue
    /business-rules.vue
    /datasets.vue

  /settings
    /index.vue


# MUHIM ARXITEKTURA QOIDASI

13 ta modul tizimning asosiy biznes modullari hisoblanadi.

Admin/Metadata/Semantic bo'limlari ushbu modullardan
alohida yordamchi boshqaruv qismi hisoblanadi.

13 ta modulni Admin Panel ichiga joylashtirma.

Har bir modul mustaqil route va mustaqil page sifatida
ishlasin.

Kelajakda har bir modul alohida backend API bilan
ishlashi mumkin bo'lgan arxitekturada qurilsin.


# MODULLAR VAZIFASI

## 01. Ma'lumotlarni yig'ish

ERP Sport ma'lumotlar bazasidan SI uchun kerakli
ma'lumotlarni aniqlash va yig'ishni boshqaradi.

Frontendda:
- Data source
- Schema
- Tables
- Views
- Columns
- Scan
- Sync
- Tanlangan jadvallar
- Yig'ish holati
- Oxirgi sinxronizatsiya

ko'rsatilishi kerak.


## 02. Ma'lumotlarni standartlashtirish

Yig'ilgan ma'lumotlarning sifati va yagona formatini
boshqaradi.

Frontendda:
- Data Quality
- Missing values
- Duplicate data
- Format problems
- Mapping
- Normalization
- Validation
- Standardization status


## 03. Sportchi tahlili profili

Sportchi bo'yicha yagona analitik profil.

Frontendda:
- Shaxsiy ma'lumotlar
- Sport turi
- Tashkilot
- Trener
- Musobaqalar
- Natijalar
- Medallar
- Dinamika
- Ko'rsatkichlar
- Risklar
- Bashoratlar


## 04. Trener tahlili profili

Trener bo'yicha yagona analitik profil.

Frontendda:
- Trener ma'lumotlari
- Sport turi
- Tashkilot
- Sportchilar
- Natijalar
- Samaradorlik
- Dinamika
- Ko'rsatkichlar


## 05. Samaradorlik

Sportchi, trener, tashkilot va boshqa obyektlar
samaradorligini tahlil qiladi.

Frontend:
- KPI cards
- Charts
- Filters
- Rankings emas, faktik ko'rsatkichlar
- Davr bo'yicha natijalar


## 06. O'zgarishlar tahlili

Ko'rsatkichlarning vaqt davomida o'zgarishini ko'rsatadi.

Frontend:
- Trend charts
- Period comparison
- Growth / decrease
- Historical dynamics


## 07. Taqqoslash

Bir nechta obyektlarni ko'rsatkichlari bo'yicha
taqqoslash imkonini beradi.

Masalan:
- Sportchi vs Sportchi
- Trener vs Trener
- Tashkilot vs Tashkilot
- Hudud vs Hudud


## 08. Bashorat

ML modellar natijalarini foydalanuvchiga ko'rsatadi.

Frontend:
- Prediction result
- Probability / confidence
- Model information
- Asos bo'lgan ko'rsatkichlar
- Prediction history


## 09. Tavsiyalar

SI tomonidan shakllantirilgan tavsiyalarni ko'rsatadi.

Frontend:
- Tavsiya
- Obyekt
- Sabab
- Muhimlik
- Status
- Sana
- Izoh


## 10. Riskni aniqlash

Aniqlangan risk va anomaliyalarni ko'rsatadi.

Frontend:
- Risk turi
- Risk darajasi
- Obyekt
- Sabab
- Aniqlangan vaqt
- Status
- Tafsilot


## 11. Vizual tahlil

Ma'lumotlarni interaktiv grafik va diagrammalar
orqali tahlil qilish.

Frontend:
- Charts
- Maps
- Dynamics
- Filters
- Drill-down
- Interactive dashboard


## 12. Izohlash SI

SI va ML chiqargan natijalarni foydalanuvchiga
tushunarli shaklda izohlaydi.

Frontend:
- Natija
- SI izohi
- Asosiy faktorlar
- Ishlatilgan ma'lumotlar
- Confidence
- Source/context


## 13. Raqamli nazorat

ERP Sport bo'yicha nazorat talab qiladigan
jarayon va ko'rsatkichlarni kuzatadi.

Frontend:
- Monitoring
- Alerts
- Nazorat obyektlari
- Muammolar
- Status
- Muddat
- Mas'ul
- Nazorat tarixi