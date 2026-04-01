// public/js/config.js
// Constantes compartidas del frontend. Fuente de verdad para UI.
// BARBEROS_FALLBACK se sobreescribe en runtime desde /api/barberos.

export const SLOT_DURATION = 30;
export const TIMEZONE = 'America/Argentina/Buenos_Aires';

export const DEFAULT_SCHEDULE = {
  1: { start: 9, end: 20 },
  2: { start: 9, end: 20 },
  3: { start: 9, end: 20 },
  4: { start: 9, end: 20 },
  5: { start: 9, end: 20 },
  6: { start: 9, end: 17 },
};

export const SERVICIOS = {
  'Corte':            { duracion: 30 },
  'Corte + Barba':    { duracion: 45 },
  'Barba':            { duracion: 15 },
  'Afeitado':         { duracion: 15 },
  'Niños 10-13 años': { duracion: 30 },
  'Niños 0-9 años':   { duracion: 30 },
};

export const BARBEROS_FALLBACK = [
  { id: 'gebyano',  nombre: 'Gebyano',  tel: '5493416021009', disponible: false, calendarId: null,                       schedule: DEFAULT_SCHEDULE },
  { id: 'lobo',     nombre: 'Lobo',     tel: '5493412754502', disponible: true,  calendarId: null,                       schedule: DEFAULT_SCHEDULE },
  { id: 'felipe',   nombre: 'Felipe',   tel: '5493416513207', disponible: true,  calendarId: 'felipevalor7@gmail.com',   schedule: DEFAULT_SCHEDULE },
  { id: 'lisandro', nombre: 'Lisandro', tel: '5493412751752', disponible: true,  calendarId: 'blascolisandro@gmail.com', schedule: DEFAULT_SCHEDULE },
  { id: 'ns',       nombre: 'NS',       tel: null,            disponible: false, calendarId: null,                       schedule: null },
  { id: 'bql',      nombre: 'BQL',      tel: null,            disponible: false, calendarId: null,                       schedule: null },
];

export const ESPECIALIDADES = {
  gebyano: 'Degradés y estilos',
  lobo:    'Clásicos y barba',
  felipe:  'Degradés y barba',
  ns:      'Próximamente',
  bql:     'Próximamente',
};

export const GEBYANO_TEL = '5493416021009';
