create table if not exists services (

    id uuid primary key default gen_random_uuid(),

    code varchar(20) unique not null,

    name varchar(100) not null,

    description text,

    price numeric(10,2) not null default 0,

    active boolean not null default true,

    created_at timestamptz default now(),

    updated_at timestamptz default now()

);