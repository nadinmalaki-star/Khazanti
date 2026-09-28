-- MVP audit fixes — account_type separation (فرد/مشروع) + bidirectional
-- debt<->transaction linkage + partial-payment support.
--
-- Backfill note: production data was checked directly before writing this
-- migration. The ENTIRE transactions table currently has exactly 3 rows
-- (ids 139, 140, 141) and debts is empty. Only ids 140 and 141 are known
-- test purchases created during business-account testing (product
-- purchases "عباية شتوي" and "اختبار تدقيق MVP") — backfilled explicitly by
-- id, not by heuristic. Everything else defaults to 'فرد'.

alter table public.transactions add column account_type text default 'فرد';
alter table public.debts add column account_type text default 'فرد';
alter table public.products add column account_type text default 'مشروع';

-- Bidirectional debt <-> transaction linkage.
-- transactions.linked_debt_id: on the transaction that CREATED a debt
-- (credit sale/purchase), this points at that debt. On a settlement/
-- collection transaction, this points at the debt it pays toward.
-- debts.source_transaction_id: the original transaction that created this
-- debt (null for manually-added debts, e.g. opening balances).
alter table public.debts add column source_transaction_id integer references public.transactions(id) on delete set null;
alter table public.transactions add column linked_debt_id integer references public.debts(id) on delete set null;

-- Partial payments: paid_amount tracks how much of a debt has been
-- collected/paid so far. `paid` (existing numeric 0/1 flag) stays in sync
-- via application code (set to 1 once paid_amount >= amount).
alter table public.debts add column paid_amount numeric default 0;

update public.transactions set account_type = 'مشروع' where id in (140, 141);
