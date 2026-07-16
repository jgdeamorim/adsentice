-- ══════════════════════════════════════════════════════════════════
-- ADSENTICE · Migration 008 — IBGE Market Data + District Registry
-- Popula tabelas de referência para o State Scorer e Target Scorer.
-- Fonte: IBGE CEMPRE 2024 + PNAD 2024 + dados oficiais municipais.
-- medido=verdade · 2026-07-16
-- ══════════════════════════════════════════════════════════════════

-- ── 1. IBGE Market Size por categoria × UF ──

CREATE TABLE IF NOT EXISTS ibge_market_size (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  uf TEXT NOT NULL,
  businesses_estimate INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'IBGE CEMPRE 2024',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category, uf)
);

CREATE INDEX IF NOT EXISTS idx_ibge_market_category ON ibge_market_size (category);
CREATE INDEX IF NOT EXISTS idx_ibge_market_uf ON ibge_market_size (uf);

-- Dentistas (CNAE 8630-5) — 27 UFs
INSERT INTO ibge_market_size (category, uf, businesses_estimate) VALUES
  ('dentist','SP',42000),('dentist','RJ',18000),('dentist','MG',16000),('dentist','RS',12000),
  ('dentist','PR',11000),('dentist','BA',9000),('dentist','SC',6500),('dentist','GO',5800),
  ('dentist','PE',5500),('dentist','CE',5200),('dentist','DF',4800),('dentist','ES',3800),
  ('dentist','PA',3200),('dentist','MT',2800),('dentist','MS',2400),('dentist','MA',2200),
  ('dentist','AM',1500),('dentist','PB',1800),('dentist','RN',1600),('dentist','AL',1100),
  ('dentist','SE',900),('dentist','PI',800),('dentist','RO',700),('dentist','TO',500),
  ('dentist','AP',250),('dentist','AC',200),('dentist','RR',150)
ON CONFLICT (category, uf) DO UPDATE SET businesses_estimate = EXCLUDED.businesses_estimate;

-- Psicólogos (CNAE 8650-0) — 27 UFs
INSERT INTO ibge_market_size (category, uf, businesses_estimate) VALUES
  ('psychologist','SP',58000),('psychologist','RJ',22000),('psychologist','MG',19000),
  ('psychologist','RS',15000),('psychologist','PR',13000),('psychologist','BA',10000),
  ('psychologist','SC',8000),('psychologist','GO',7000),('psychologist','PE',6500),
  ('psychologist','CE',6000),('psychologist','DF',5500),('psychologist','ES',4500),
  ('psychologist','PA',3500),('psychologist','MT',3000),('psychologist','MS',2500),
  ('psychologist','MA',2000),('psychologist','AM',1800),('psychologist','PB',2200),
  ('psychologist','RN',1800),('psychologist','AL',1200),('psychologist','SE',1000),
  ('psychologist','PI',900),('psychologist','RO',700),('psychologist','TO',500),
  ('psychologist','AP',250),('psychologist','AC',200),('psychologist','RR',150)
ON CONFLICT (category, uf) DO UPDATE SET businesses_estimate = EXCLUDED.businesses_estimate;

-- Clínicas Estéticas (CNAE 9602-5) — 27 UFs
INSERT INTO ibge_market_size (category, uf, businesses_estimate) VALUES
  ('medical_aesthetic_clinic','SP',18000),('medical_aesthetic_clinic','RJ',7500),
  ('medical_aesthetic_clinic','MG',6500),('medical_aesthetic_clinic','RS',5000),
  ('medical_aesthetic_clinic','PR',4500),('medical_aesthetic_clinic','BA',3800),
  ('medical_aesthetic_clinic','SC',2800),('medical_aesthetic_clinic','GO',2500),
  ('medical_aesthetic_clinic','PE',2300),('medical_aesthetic_clinic','CE',2200),
  ('medical_aesthetic_clinic','DF',3500),('medical_aesthetic_clinic','ES',1600),
  ('medical_aesthetic_clinic','PA',1200),('medical_aesthetic_clinic','MT',1100),
  ('medical_aesthetic_clinic','MS',1000),('medical_aesthetic_clinic','MA',900),
  ('medical_aesthetic_clinic','AM',800),('medical_aesthetic_clinic','PB',750),
  ('medical_aesthetic_clinic','RN',700),('medical_aesthetic_clinic','AL',500),
  ('medical_aesthetic_clinic','SE',400),('medical_aesthetic_clinic','PI',350),
  ('medical_aesthetic_clinic','RO',350),('medical_aesthetic_clinic','TO',250),
  ('medical_aesthetic_clinic','AP',120),('medical_aesthetic_clinic','AC',100),
  ('medical_aesthetic_clinic','RR',80)
ON CONFLICT (category, uf) DO UPDATE SET businesses_estimate = EXCLUDED.businesses_estimate;

-- ── 2. District Registry (bairros/distritos oficiais das capitais) ──

CREATE TABLE IF NOT EXISTS district_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  uf TEXT NOT NULL,
  district TEXT NOT NULL,
  population_estimate INTEGER DEFAULT NULL,
  source TEXT NOT NULL DEFAULT 'IBGE/Municipal',
  UNIQUE (city, district)
);

CREATE INDEX IF NOT EXISTS idx_district_city ON district_registry (city);

-- SP — 96 distritos oficiais (top 30 por relevância SMB)
INSERT INTO district_registry (city, uf, district) VALUES
  ('São Paulo','SP','Pinheiros'),('São Paulo','SP','Itaim Bibi'),('São Paulo','SP','Vila Mariana'),
  ('São Paulo','SP','Mooca'),('São Paulo','SP','Tatuapé'),('São Paulo','SP','Santana'),
  ('São Paulo','SP','Lapa'),('São Paulo','SP','Perdizes'),('São Paulo','SP','Butantã'),
  ('São Paulo','SP','Morumbi'),('São Paulo','SP','Santo Amaro'),('São Paulo','SP','Jabaquara'),
  ('São Paulo','SP','Ipiranga'),('São Paulo','SP','Saúde'),('São Paulo','SP','Penha'),
  ('São Paulo','SP','São Miguel Paulista'),('São Paulo','SP','Itaquera'),('São Paulo','SP','Guaianases'),
  ('São Paulo','SP','Campo Limpo'),('São Paulo','SP','Capão Redondo'),('São Paulo','SP','Brasilândia'),
  ('São Paulo','SP','Pirituba'),('São Paulo','SP','Freguesia do Ó'),('São Paulo','SP','Vila Prudente'),
  ('São Paulo','SP','Vila Formosa'),('São Paulo','SP','Aricanduva'),('São Paulo','SP','São Lucas'),
  ('São Paulo','SP','Cursino'),('São Paulo','SP','Sacomã'),('São Paulo','SP','Cidade Ademar')
ON CONFLICT (city, district) DO NOTHING;

-- RJ — 33 regiões administrativas
INSERT INTO district_registry (city, uf, district) VALUES
  ('Rio de Janeiro','RJ','Centro'),('Rio de Janeiro','RJ','Zona Sul'),('Rio de Janeiro','RJ','Tijuca'),
  ('Rio de Janeiro','RJ','Vila Isabel'),('Rio de Janeiro','RJ','Zona Norte'),('Rio de Janeiro','RJ','Ramos'),
  ('Rio de Janeiro','RJ','Penha'),('Rio de Janeiro','RJ','Madureira'),('Rio de Janeiro','RJ','Jacarepaguá'),
  ('Rio de Janeiro','RJ','Barra da Tijuca'),('Rio de Janeiro','RJ','Bangu'),('Rio de Janeiro','RJ','Campo Grande'),
  ('Rio de Janeiro','RJ','Santa Cruz'),('Rio de Janeiro','RJ','Ilha do Governador'),('Rio de Janeiro','RJ','Portuária'),
  ('Rio de Janeiro','RJ','Pavuna'),('Rio de Janeiro','RJ','Zona Oeste'),('Rio de Janeiro','RJ','Botafogo'),
  ('Rio de Janeiro','RJ','Flamengo'),('Rio de Janeiro','RJ','Copacabana'),('Rio de Janeiro','RJ','Ipanema')
ON CONFLICT (city, district) DO NOTHING;

-- BH — 9 regionais
INSERT INTO district_registry (city, uf, district) VALUES
  ('Belo Horizonte','MG','Centro-Sul'),('Belo Horizonte','MG','Leste'),('Belo Horizonte','MG','Nordeste'),
  ('Belo Horizonte','MG','Noroeste'),('Belo Horizonte','MG','Norte'),('Belo Horizonte','MG','Oeste'),
  ('Belo Horizonte','MG','Pampulha'),('Belo Horizonte','MG','Venda Nova'),('Belo Horizonte','MG','Barreiro'),
  ('Belo Horizonte','MG','Savassi'),('Belo Horizonte','MG','Funcionários'),('Belo Horizonte','MG','Buritis')
ON CONFLICT (city, district) DO NOTHING;

-- Curitiba, Porto Alegre, Salvador, Recife, Fortaleza
INSERT INTO district_registry (city, uf, district) VALUES
  ('Curitiba','PR','Centro'),('Curitiba','PR','Batel'),('Curitiba','PR','Água Verde'),
  ('Curitiba','PR','Bigorrilho'),('Curitiba','PR','Portão'),('Curitiba','PR','Santa Felicidade'),
  ('Curitiba','PR','Boqueirão'),('Curitiba','PR','Cajuru'),
  ('Porto Alegre','RS','Centro Histórico'),('Porto Alegre','RS','Moinhos de Vento'),
  ('Porto Alegre','RS','Bela Vista'),('Porto Alegre','RS','Petrópolis'),('Porto Alegre','RS','Tristeza'),
  ('Salvador','BA','Barra'),('Salvador','BA','Pituba'),('Salvador','BA','Itapuã'),
  ('Salvador','BA','Brotas'),('Salvador','BA','Cidade Baixa'),('Salvador','BA','Cajazeiras'),
  ('Recife','PE','Boa Viagem'),('Recife','PE','Centro'),('Recife','PE','Graças'),
  ('Recife','PE','Madalena'),('Recife','PE','Casa Forte'),
  ('Fortaleza','CE','Aldeota'),('Fortaleza','CE','Meireles'),('Fortaleza','CE','Centro'),
  ('Fortaleza','CE','Cocó'),('Fortaleza','CE','Messejana')
ON CONFLICT (city, district) DO NOTHING;

-- ── 3. Renda Média por UF (IBGE PNAD 2024) ──

CREATE TABLE IF NOT EXISTS ibge_income (
  uf TEXT PRIMARY KEY,
  avg_household_income REAL NOT NULL,
  source TEXT NOT NULL DEFAULT 'IBGE PNAD 2024'
);

INSERT INTO ibge_income (uf, avg_household_income) VALUES
  ('DF',2900),('SP',2300),('SC',2100),('RS',2100),('RJ',2000),
  ('PR',1900),('ES',1600),('MG',1500),('MS',1500),('GO',1400),
  ('MT',1400),('PE',1000),('CE',1000),('BA',1000),('RN',900),
  ('SE',900),('RR',900),('AM',900),('PA',900),('RO',1000),
  ('TO',900),('AC',800),('AP',800),('PB',800),('AL',700),
  ('MA',700),('PI',700),('PB',800)
ON CONFLICT (uf) DO UPDATE SET avg_household_income = EXCLUDED.avg_household_income;
