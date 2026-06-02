-- ============================================================
-- ACTIVITY COUNTER FIXES
-- ============================================================

-- Drop and recreate increment_activity to handle both +1 and -1
-- and use proper upsert that always succeeds
create or replace function increment_activity(
  p_rep_id    uuid,
  p_agency_id uuid,
  p_field     text,
  p_delta     int default 1,          -- pass -1 to decrement
  p_date      date default current_date
)
returns daily_activities as $$
declare
  result daily_activities;
begin
  -- Ensure the row exists for today
  insert into daily_activities (rep_id, agency_id, date)
  values (p_rep_id, p_agency_id, p_date)
  on conflict (rep_id, date) do nothing;

  -- Increment or decrement, clamped at 0 (can't go negative)
  execute format(
    'update daily_activities
     set %I = greatest(0, coalesce(%I, 0) + $1), updated_at = now()
     where rep_id = $2 and date = $3
     returning *',
    p_field, p_field
  ) into result using p_delta, p_rep_id, p_date;

  return result;
end;
$$ language plpgsql security definer;

-- Also add a "set_activity" function for bulk saves (e.g. manual edit)
create or replace function set_activity(
  p_rep_id    uuid,
  p_agency_id uuid,
  p_field     text,
  p_value     int,
  p_date      date default current_date
)
returns daily_activities as $$
declare
  result daily_activities;
begin
  insert into daily_activities (rep_id, agency_id, date)
  values (p_rep_id, p_agency_id, p_date)
  on conflict (rep_id, date) do nothing;

  execute format(
    'update daily_activities
     set %I = greatest(0, $1), updated_at = now()
     where rep_id = $2 and date = $3
     returning *',
    p_field
  ) into result using p_value, p_rep_id, p_date;

  return result;
end;
$$ language plpgsql security definer;

-- Enable Supabase Realtime on daily_activities (run once)
-- This is needed for live workbench updates
alter publication supabase_realtime add table daily_activities;
alter publication supabase_realtime add table leads;
alter publication supabase_realtime add table texts;
