-- Migrate rent_roll.tenant_rating from numeric 0-5 to credit-rating
-- text enum per parce-data-dictionary.xlsx.
--
-- The old scale was perceived-quality (1-5 stars); the new scale is
-- credit-quality (AAA…B/NR/etc). These are different concepts, so all
-- existing non-null values are backfilled to 'Unrated / Private' rather
-- than fabricated into a credit grade.

begin;

-- Drop the old numeric range check.
alter table rent_roll
  drop constraint if exists rent_roll_tenant_rating_check;

-- Convert numeric → text. We cast nulls to nulls and any non-null
-- existing value to 'Unrated / Private' in one step.
alter table rent_roll
  alter column tenant_rating type text
  using (case
    when tenant_rating is null then null
    else 'Unrated / Private'
  end);

-- New constraint: must be one of the canonical credit-rating values.
alter table rent_roll
  add constraint rent_roll_tenant_rating_check
  check (
    tenant_rating is null or
    tenant_rating in (
      'AAA', 'AA', 'A', 'BBB', 'BB', 'B',
      'NR', 'Unrated / Private', 'Govt'
    )
  );

commit;
