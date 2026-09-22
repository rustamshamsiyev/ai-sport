export interface NavigationItem { title: string, to: string, icon: string, number?: string }

export const dashboardModules = [
  {
    slug: 'data-collection',
    title: 'Ma\'lumotlarni yig\'ish',
    number: '01',
    icon: 'i-lucide-database',
    description: 'ERP Sport ma\'lumotlar bazasidan SI uchun kerakli ma\'lumotlarni aniqlash va yig\'ishni boshqaradi.',
    features: [
      'Data source',
      'Schema',
      'Tables',
      'Views',
      'Columns',
      'Scan',
      'Sync',
      'Tanlangan jadvallar',
      'Yig\'ish holati',
      'Oxirgi sinxronizatsiya'
    ]
  },
  {
    slug: 'data-standardization',
    title: 'Ma\'lumotlarni standartlashtirish',
    number: '02',
    icon: 'i-lucide-list-filter',
    description: 'Yig\'ilgan ma\'lumotlarning sifati va yagona formatini boshqaradi.',
    features: [
      'Data Quality',
      'Missing values',
      'Duplicate data',
      'Format problems',
      'Mapping',
      'Normalization',
      'Validation',
      'Standardization status'
    ]
  },
  {
    slug: 'athlete-analysis',
    title: 'Sportchi tahlili profili',
    number: '03',
    icon: 'i-lucide-user-round',
    description: 'Sportchi bo\'yicha yagona analitik profil.',
    features: [
      'Shaxsiy ma\'lumotlar',
      'Sport turi',
      'Tashkilot',
      'Trener',
      'Musobaqalar',
      'Natijalar',
      'Medallar',
      'Dinamika',
      'Ko\'rsatkichlar',
      'Risklar',
      'Bashoratlar'
    ]
  },
  {
    slug: 'coach-analysis',
    title: 'Trener tahlili profili',
    number: '04',
    icon: 'i-lucide-contact-round',
    description: 'Trener bo\'yicha yagona analitik profil.',
    features: [
      'Trener ma\'lumotlari',
      'Sport turi',
      'Tashkilot',
      'Sportchilar',
      'Natijalar',
      'Samaradorlik',
      'Dinamika',
      'Ko\'rsatkichlar'
    ]
  },
  {
    slug: 'efficiency',
    title: 'Samaradorlik',
    number: '05',
    icon: 'i-lucide-gauge',
    description: 'Sportchi, trener, tashkilot va boshqa obyektlar samaradorligini tahlil qiladi.',
    features: [
      'KPI cards',
      'Charts',
      'Filters',
      'Rankings emas, faktik ko\'rsatkichlar',
      'Davr bo\'yicha natijalar'
    ]
  },
  {
    slug: 'changes-analysis',
    title: 'O\'zgarishlar tahlili',
    number: '06',
    icon: 'i-lucide-chart-no-axes-combined',
    description: 'Ko\'rsatkichlarning vaqt davomida o\'zgarishini ko\'rsatadi.',
    features: [
      'Trend charts',
      'Period comparison',
      'Growth / decrease',
      'Historical dynamics'
    ]
  },
  {
    slug: 'comparison',
    title: 'Taqqoslash',
    number: '07',
    icon: 'i-lucide-git-compare-arrows',
    description: 'Bir nechta obyektlarni ko\'rsatkichlari bo\'yicha taqqoslash imkonini beradi.',
    features: [
      'Sportchi vs Sportchi',
      'Trener vs Trener',
      'Tashkilot vs Tashkilot',
      'Hudud vs Hudud'
    ]
  },
  {
    slug: 'prediction',
    title: 'Bashorat',
    number: '08',
    icon: 'i-lucide-trending-up',
    description: 'ML modellar natijalarini foydalanuvchiga ko\'rsatadi.',
    features: [
      'Prediction result',
      'Probability / confidence',
      'Model information',
      'Asos bo\'lgan ko\'rsatkichlar',
      'Prediction history'
    ]
  },
  {
    slug: 'recommendations',
    title: 'Tavsiyalar',
    number: '09',
    icon: 'i-lucide-lightbulb',
    description: 'SI tomonidan shakllantirilgan tavsiyalarni ko\'rsatadi.',
    features: [
      'Tavsiya',
      'Obyekt',
      'Sabab',
      'Muhimlik',
      'Status',
      'Sana',
      'Izoh'
    ]
  },
  {
    slug: 'risk-detection',
    title: 'Riskni aniqlash',
    number: '10',
    icon: 'i-lucide-shield-alert',
    description: 'Aniqlangan risk va anomaliyalarni ko\'rsatadi.',
    features: [
      'Risk turi',
      'Risk darajasi',
      'Obyekt',
      'Sabab',
      'Aniqlangan vaqt',
      'Status',
      'Tafsilot'
    ]
  },
  {
    slug: 'visual-analysis',
    title: 'Vizual tahlil',
    number: '11',
    icon: 'i-lucide-chart-pie',
    description: 'Ma\'lumotlarni interaktiv grafik va diagrammalar orqali tahlil qilish.',
    features: [
      'Charts',
      'Maps',
      'Dynamics',
      'Filters',
      'Drill-down',
      'Interactive dashboard'
    ]
  },
  {
    slug: 'ai-explanation',
    title: 'Izohlash SI',
    number: '12',
    icon: 'i-lucide-message-square-text',
    description: 'SI va ML chiqargan natijalarni foydalanuvchiga tushunarli shaklda izohlaydi.',
    features: [
      'Natija',
      'SI izohi',
      'Asosiy faktorlar',
      'Ishlatilgan ma\'lumotlar',
      'Confidence',
      'Source/context'
    ]
  },
  {
    slug: 'digital-control',
    title: 'Raqamli nazorat',
    number: '13',
    icon: 'i-lucide-monitor-check',
    description: 'ERP Sport bo\'yicha nazorat talab qiladigan jarayon va ko\'rsatkichlarni kuzatadi.',
    features: [
      'Monitoring',
      'Alerts',
      'Nazorat obyektlari',
      'Muammolar',
      'Status',
      'Muddat',
      'Mas\'ul',
      'Nazorat tarixi'
    ]
  }
] as const

export const managementNavigation: NavigationItem[] = [
  {
    title: 'Ma\'lumotlar bazasi',
    to: '/admin/database',
    icon: 'i-lucide-database'
  },
  {
    title: 'Semantik model',
    to: '/admin/semantic-model',
    icon: 'i-lucide-network'
  },
  {
    title: 'Biznes obyektlar',
    to: '/admin/business-objects',
    icon: 'i-lucide-boxes'
  },
  {
    title: 'Bog\'lanishlar',
    to: '/admin/relations',
    icon: 'i-lucide-git-branch'
  },
  {
    title: 'Biznes qoidalar',
    to: '/admin/business-rules',
    icon: 'i-lucide-list-checks'
  },
  {
    title: 'Datasetlar',
    to: '/admin/datasets',
    icon: 'i-lucide-table-2'
  }
]

export const systemNavigation: NavigationItem[] = [
  {
    title: 'Foydalanuvchilar',
    to: '/admin/users',
    icon: 'i-lucide-users'
  },
  {
    title: 'Audit',
    to: '/admin/audit',
    icon: 'i-lucide-history'
  },
  {
    title: 'Sozlamalar',
    to: '/settings',
    icon: 'i-lucide-settings'
  }
]
