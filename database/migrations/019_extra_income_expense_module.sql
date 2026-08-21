BEGIN;
SET LOCAL ROLE postgres;

INSERT INTO laundry.modules (code, name, description, sort_order)
VALUES ('extra_income_expenses', 'Ingresos y egresos extra', 'Registro de ingresos y egresos adicionales de caja.', 55)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

NOTIFY pgrst, 'reload schema';
COMMIT;
