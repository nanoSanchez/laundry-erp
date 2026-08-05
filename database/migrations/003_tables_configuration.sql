-- ============================================================================
-- Laundry ERP
-- Migration : 003_tables_configuration.sql
-- Author    : Fernando Sanchez + ChatGPT
-- Description:
-- Configuración principal del sistema.
-- ============================================================================
--
-- Contiene:
--   • Schema principal
--   • Tabla de sucursales
--   • Secuencias de documentos
--
-- PostgreSQL 17
-- Supabase Compatible
-- ============================================================================

BEGIN;

-- ============================================================================
-- SCHEMA
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS laundry;

COMMENT ON SCHEMA laundry IS
'Esquema principal del sistema Laundry ERP.';

-- ============================================================================
-- TABLA: branches
-- ============================================================================

CREATE TABLE laundry.branches
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    code VARCHAR(5) NOT NULL,

    name TEXT NOT NULL,

    address TEXT,

    phone TEXT,

    email TEXT,

    timezone TEXT NOT NULL DEFAULT 'America/La_Paz',

    currency_code CHAR(3) NOT NULL DEFAULT 'BOB',

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- RESTRICCIONES
-- ============================================================================

ALTER TABLE laundry.branches
ADD CONSTRAINT uq_branches_code
UNIQUE(code);

ALTER TABLE laundry.branches
ADD CONSTRAINT chk_branch_code
CHECK (
    code = UPPER(code)
    AND length(code) BETWEEN 2 AND 5
);

ALTER TABLE laundry.branches
ADD CONSTRAINT chk_currency
CHECK (
    currency_code = UPPER(currency_code)
);

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON TABLE laundry.branches IS
'Sucursales de la empresa.';

COMMENT ON COLUMN laundry.branches.code IS
'Código único de sucursal. Ejemplo: LPA, SRZ, CBA';

COMMENT ON COLUMN laundry.branches.timezone IS
'Zona horaria IANA.';

COMMENT ON COLUMN laundry.branches.currency_code IS
'Código ISO 4217 de moneda.';

-- ============================================================================
-- TABLA: document_sequences
-- ============================================================================

CREATE TABLE laundry.document_sequences
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    branch_id UUID NOT NULL,

    document_type TEXT NOT NULL,

    prefix TEXT NOT NULL,

    padding SMALLINT NOT NULL DEFAULT 6,

    next_number INTEGER NOT NULL DEFAULT 1,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    deleted_at TIMESTAMPTZ,

    CONSTRAINT fk_document_sequence_branch
        FOREIGN KEY(branch_id)
        REFERENCES laundry.branches(id),

    CONSTRAINT uq_document_sequence
        UNIQUE(branch_id, document_type),

    CONSTRAINT chk_padding
        CHECK (padding BETWEEN 3 AND 10),

    CONSTRAINT chk_next_number
        CHECK (next_number > 0)
);

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON TABLE laundry.document_sequences IS
'Administra los correlativos por tipo de documento y sucursal.';

COMMENT ON COLUMN laundry.document_sequences.document_type IS
'Ejemplo: ORDER, INVOICE, RECEIPT';

COMMENT ON COLUMN laundry.document_sequences.prefix IS
'Prefijo utilizado para construir el número visible del documento.';

COMMENT ON COLUMN laundry.document_sequences.padding IS
'Cantidad de dígitos del correlativo.';

COMMENT ON COLUMN laundry.document_sequences.next_number IS
'Siguiente número disponible.';

COMMIT;