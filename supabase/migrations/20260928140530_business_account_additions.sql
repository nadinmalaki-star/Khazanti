-- Additive schema for the "business account" (مشروع) feature set.
-- Every statement here is purely additive: new nullable columns with no
-- default (except `currency`, which defaults to 'ILS' so existing rows
-- keep working exactly as before) and one brand-new table. Nothing here
-- touches, renames, or drops any existing column, table, or policy.
--
-- account_type (فرد/مشروع) itself is NOT stored here — it lives in
-- Supabase Auth's user_metadata (set via supabase.auth.updateUser), so
-- it needs no schema change and no RLS surface at all.

-- ---------------------------------------------------------------------
-- public.transactions — new optional columns
-- ---------------------------------------------------------------------

alter table public.transactions
  add column note text,               -- بيان (individual accounts)
  add column cost_price numeric,      -- إجمالي تكلفة العملية (لحساب الربح على المبيعات)
  add column quantity numeric,        -- الكمية (بيع قطعة قطعة)
  add column expense_type text,       -- 'ثابت' | 'متغير' لمصاريف المشروع
  add column product_name text,       -- اسم المنتج/الخدمة (اختياري)
  add column counterparty_name text,  -- اسم العميل/المورّد (اختياري)
  add column invoice_number text,     -- رقم فاتورة/مرجع (اختياري، وبيستخدم لتجميع "ربح حسب الطلبية")
  add column currency text default 'ILS'; -- عملة العملية؛ الافتراضي ILS يحافظ على سلوك كل السجلات القديمة

-- ---------------------------------------------------------------------
-- public.products — new table for optional inventory tracking
-- ---------------------------------------------------------------------

create table public.products (
  id serial primary key,
  user_id uuid,
  name text,
  quantity numeric default 0,
  cost numeric
);

alter table public.products enable row level security;

create policy "Users can view their own products"
  on public.products for select
  to public
  using (auth.uid() = user_id);

create policy "Users can insert their own products"
  on public.products for insert
  to public
  with check (auth.uid() = user_id);

create policy "Users can update their own products"
  on public.products for update
  to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own products"
  on public.products for delete
  to public
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Notes on how the rest of the feature set uses this, without further
-- schema changes:
--
-- - Cash/bank balances are still computed by summing `transactions`
--   client-side (no stored balance table), same as today — just now
--   grouped by (account, currency) instead of by account alone.
-- - Internal transfers reuse the existing `type` column with a new
--   value "تحويل", recorded as two linked rows (one negative on the
--   source account/currency, one positive on the destination) that
--   reports explicitly exclude from income/expense totals.
-- - Credit sales/purchases reuse the existing `debts` table exactly as
--   it already works (دين له / دين عليه) — no new columns needed there.
-- - The daily USD/JOD → ILS exchange rate is fetched and cached
--   client-side (not stored in the database), since it's a display/
--   reporting concern only and never affects a wallet's real balance.
-- ---------------------------------------------------------------------
