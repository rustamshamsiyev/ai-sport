import type { DatabaseColumn, DatabaseObject, DatabaseSchema, DatabaseSnapshot } from '../types/database.ts'

type ColumnSeed = [name: string, type: string, businessName: string, options?: Partial<DatabaseColumn>]

function object(schema: string, technicalName: string, businessName: string, description: string, seeds: ColumnSeed[], view = false): DatabaseObject {
  const id = `${schema}.${technicalName}`
  return {
    id, schema, technicalName, businessName, description,
    objectType: view ? 'VIEW' : 'TABLE',
    aiEnabled: !view,
    columns: seeds.map(([name, dataType, label, options]) => ({
      id: `${id}.${name}`,
      technicalName: name,
      dataType,
      businessName: label,
      description: `${label} haqidagi metadata.`,
      nullable: false,
      primaryKey: name === 'id' && !view,
      foreignKey: null,
      aiEnabled: true,
      ...options
    }))
  }
}

export function summarizeDatabase(objects: DatabaseObject[], schemas: DatabaseSchema[], lastScanAt: string | null): DatabaseSnapshot {
  return {
    source: {
      id: 'erp-sport-db', name: 'ERP SPORT DB', databaseType: 'PostgreSQL',
      connectionStatus: 'connected',
      schemaCount: schemas.length,
      tableCount: objects.filter(item => item.objectType === 'TABLE').length,
      viewCount: objects.filter(item => item.objectType === 'VIEW').length,
      columnCount: objects.reduce((sum, item) => sum + item.columns.length, 0),
      lastScanAt
    },
    schemas,
    objects
  }
}

// Entirely synthetic metadata. No credentials, endpoints or personal records.
export function createMockDatabase(): DatabaseSnapshot {
  const objects = [
    object('public', 'hl_person', 'Shaxslar', 'Sportchi va trener profillariga tegishli shaxslar ma’lumotnomasi.', [
      ['id', 'bigint', 'Identifikator'],
      ['first_name', 'varchar(100)', 'Ism'],
      ['last_name', 'varchar(100)', 'Familiya'],
      ['birth_date', 'date', 'Tug‘ilgan sana', { nullable: true }],
      ['gender_id', 'integer', 'Jins identifikatori'],
      ['organization_id', 'bigint', 'Tashkilot', { nullable: true, foreignKey: 'public.info_organization.id' }],
      ['phone_number', 'varchar(25)', 'Telefon raqami', { nullable: true, aiEnabled: false }],
      ['created_at', 'timestamp', 'Yaratilgan vaqt']
    ]),
    object('public', 'info_organization', 'Sport tashkilotlari', 'Sport ta’lim muassasalari va tashkilotlar ma’lumotnomasi.', [
      ['id', 'bigint', 'Identifikator'],
      ['name', 'varchar(250)', 'Tashkilot nomi'],
      ['short_name', 'varchar(100)', 'Qisqa nom', { nullable: true }],
      ['region_code', 'varchar(10)', 'Hudud kodi'],
      ['parent_id', 'bigint', 'Yuqori tashkilot', { nullable: true, foreignKey: 'public.info_organization.id' }],
      ['is_active', 'boolean', 'Faollik holati']
    ]),
    object('sport', 'doc_sportcompetition', 'Sport musobaqalari', 'Musobaqalarning nomi, muddati va tashkilotchilari haqidagi metadata.', [
      ['id', 'bigint', 'Identifikator'],
      ['name', 'varchar(250)', 'Musobaqa nomi'],
      ['organization_id', 'bigint', 'Tashkilotchi', { foreignKey: 'public.info_organization.id' }],
      ['start_date', 'date', 'Boshlanish sanasi'],
      ['end_date', 'date', 'Tugash sanasi', { nullable: true }],
      ['status', 'varchar(30)', 'Holat']
    ]),
    object('sport', 'doc_sportcompetitionathletelist', 'Musobaqa ishtirokchilari', 'Sportchilarning musobaqalarda ishtirok etishi haqidagi metadata.', [
      ['id', 'bigint', 'Identifikator'],
      ['competition_id', 'bigint', 'Musobaqa', { foreignKey: 'sport.doc_sportcompetition.id' }],
      ['person_id', 'bigint', 'Sportchi', { foreignKey: 'public.hl_person.id' }],
      ['organization_id', 'bigint', 'Tashkilot', { foreignKey: 'public.info_organization.id' }],
      ['weight_category', 'varchar(50)', 'Vazn toifasi', { nullable: true }],
      ['registered_at', 'timestamp', 'Ro‘yxatga olingan vaqt']
    ]),
    object('sport', 'doc_sportcompetitionresultlist', 'Musobaqa natijalari', 'Ishtirokchilarning musobaqadagi faktik natijalari metadata tavsifi.', [
      ['id', 'bigint', 'Identifikator'],
      ['athlete_entry_id', 'bigint', 'Ishtirokchi qaydi', { foreignKey: 'sport.doc_sportcompetitionathletelist.id' }],
      ['score', 'numeric(10,2)', 'Natija', { nullable: true }],
      ['place', 'integer', 'Egallangan o‘rin', { nullable: true }],
      ['medal', 'varchar(20)', 'Medal', { nullable: true }],
      ['recorded_at', 'timestamp', 'Qayd etilgan vaqt']
    ]),
    object('sport_helper', 'acc_sportstudentmanage', 'Sportchilar hisobi', 'Sportchi, sport tashkiloti va qabul davriga oid hisob metadata tavsifi.', [
      ['id', 'bigint', 'Identifikator'],
      ['person_id', 'bigint', 'Sportchi', { foreignKey: 'public.hl_person.id' }],
      ['organization_id', 'bigint', 'Tashkilot', { foreignKey: 'public.info_organization.id' }],
      ['enrolled_at', 'date', 'Qabul sanasi'],
      ['left_at', 'date', 'Chiqish sanasi', { nullable: true }],
      ['is_active', 'boolean', 'Faollik holati']
    ]),
    object('sport_helper', 'acc_sportcoachmanage', 'Trenerlar hisobi', 'Trenerlarning sport tashkilotlaridagi faoliyati metadata tavsifi.', [
      ['id', 'bigint', 'Identifikator'],
      ['person_id', 'bigint', 'Trener', { foreignKey: 'public.hl_person.id' }],
      ['organization_id', 'bigint', 'Tashkilot', { foreignKey: 'public.info_organization.id' }],
      ['qualification', 'varchar(100)', 'Malaka toifasi', { nullable: true }],
      ['started_at', 'date', 'Ish boshlagan sana'],
      ['is_active', 'boolean', 'Faollik holati']
    ]),
    object('sport', 'vw_competition_summary', 'Musobaqalar yig‘ma ko‘rinishi', 'Musobaqalar bo‘yicha umumlashtirilgan metadata ko‘rinishi.', [
      ['competition_id', 'bigint', 'Musobaqa identifikatori'],
      ['competition_name', 'varchar(250)', 'Musobaqa nomi'],
      ['athlete_count', 'bigint', 'Ishtirokchilar soni'],
      ['result_count', 'bigint', 'Natijalar soni']
    ], true),
    object('sport_helper', 'vw_active_coaches', 'Faol trenerlar ko‘rinishi', 'Faol trenerlarning tashkilot kesimidagi metadata ko‘rinishi.', [
      ['person_id', 'bigint', 'Trener identifikatori'],
      ['organization_name', 'varchar(250)', 'Tashkilot nomi'],
      ['qualification', 'varchar(100)', 'Malaka toifasi', { nullable: true }],
      ['started_at', 'date', 'Ish boshlagan sana']
    ], true)
  ]
  return summarizeDatabase(objects, ['public', 'sport', 'sport_helper'].map(name => ({ name })), '2026-09-17T04:30:00.000Z')
}
