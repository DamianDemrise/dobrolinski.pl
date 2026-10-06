-- Anonimowy licznik formularzy strony (oferta, ebook): zapisuje offer-worker, czyta pulpit CMS.
-- Bez adresu e-mail, bez IP: tylko rodzaj i czas.
CREATE TABLE IF NOT EXISTS form_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  form TEXT NOT NULL CHECK (form IN ('offer', 'ebook')),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS form_events_form_created ON form_events (form, created_at);
