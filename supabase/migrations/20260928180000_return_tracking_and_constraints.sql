-- Round 2 of MVP fixes:
--  - return_of_transaction_id: links a customer-return transaction back to
--    the exact original sale transaction it reverses, so the app can cap
--    a return at "quantity originally sold minus quantity already returned"
--    instead of just the original sale's raw quantity.
--  - NOT NULL + CHECK constraints on account_type: every insert path in the
--    app already always sets account_type to exactly 'فرد' or 'مشروع', and
--    every pre-existing row got the column DEFAULT applied when the column
--    was added (20260928170000), so no row currently has a NULL or invalid
--    value — safe to enforce going forward.

alter table public.transactions add column return_of_transaction_id integer references public.transactions(id) on delete set null;

alter table public.transactions alter column account_type set not null;
alter table public.debts alter column account_type set not null;
alter table public.products alter column account_type set not null;

alter table public.transactions add constraint transactions_account_type_check check (account_type in ('فرد', 'مشروع'));
alter table public.debts add constraint debts_account_type_check check (account_type in ('فرد', 'مشروع'));
alter table public.products add constraint products_account_type_check check (account_type in ('فرد', 'مشروع'));
