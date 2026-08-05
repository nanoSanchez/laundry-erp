-- ============================================================
-- Laundry ERP
-- Archivo: 002_enums.sql
-- ============================================================

CREATE TYPE user_role AS ENUM (
    'ADMIN',
    'OPERATOR'
);

CREATE TYPE order_status AS ENUM (
    'RECEIVED',
    'PENDING',
    'READY',
    'DELIVERED',
    'REQUIRES_REWORK',
    'CANCELLED'
);

CREATE TYPE payment_method AS ENUM (
    'CASH',
    'QR',
    'TRANSFER',
    'CARD',
    'OTHER'
);

CREATE TYPE cash_movement_type AS ENUM (
    'INCOME',
    'EXPENSE'
);

CREATE TYPE audit_action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT'
);