-- ============================================================
-- SEED: Default text sequences for every new agency
-- These are inserted as templates (agency_id = NULL)
-- and cloned when a new agency is created
-- ============================================================

-- ── SEQUENCE 1: New Lead — Life Insurance ──────────────────
insert into text_sequences (id, name, description, trigger, active)
values (
  'seq-life-new-lead',
  'New Lead — Life Insurance',
  'Fires the moment a life insurance lead is created. 7 steps over 14 days.',
  'new_lead',
  true
);

insert into text_sequence_steps (sequence_id, step_number, delay_minutes, message_template, ai_personalize)
values
  ('seq-life-new-lead', 1, 0,
   'Hi {{first_name}}! I noticed you were looking into life insurance. My name is {{agent_name}} and I''d love to help protect your family. Quick question — is coverage for just yourself or do you have a spouse/kids to protect too? 😊',
   true),
  ('seq-life-new-lead', 2, 120,
   'Hey {{first_name}}, just wanted to make sure my first message didn''t get buried! We have some amazing options starting under $30/month. Would a quick 10-min call work for you?',
   true),
  ('seq-life-new-lead', 3, 1440,
   '{{first_name}}, I work with a lot of families in {{state}} getting covered — most are surprised how affordable it is. What''s a good time to connect today?',
   true),
  ('seq-life-new-lead', 4, 4320,
   'Still thinking about coverage, {{first_name}}? No pressure — just want to make sure you have the info you need to make the best decision for your family 🙏',
   true),
  ('seq-life-new-lead', 5, 7200,
   'Hey {{first_name}}! Rates went up last quarter for most carriers. If you''re still interested in locking in a rate, now''s actually a great time. Want me to pull a quick quote?',
   true),
  ('seq-life-new-lead', 6, 10080,
   'Last follow-up from me, {{first_name}}. If life insurance isn''t a priority right now, totally understand — just reply STOP and I won''t bother you again. If you are still interested, I''m here!',
   true),
  ('seq-life-new-lead', 7, 14400,
   'Hi {{first_name}}! {{agent_name}} here one more time. I have a 15-min opening tomorrow if you ever want to just chat through your options — zero obligation. Just reply YES if you''re open to it!',
   true);


-- ── SEQUENCE 2: Appointment Reminder ──────────────────────
insert into text_sequences (id, name, description, trigger, active)
values (
  'seq-appt-reminder',
  'Appointment Reminder — 24h + 1h',
  'Automatically reminds leads about their upcoming appointment to reduce no-shows.',
  'appointment_scheduled',
  true
);

insert into text_sequence_steps (sequence_id, step_number, delay_minutes, message_template, ai_personalize)
values
  ('seq-appt-reminder', 1, 0,
   'Hey {{first_name}}! Just confirmed your appointment with {{agent_name}} for tomorrow. We''ll go over your coverage options — should take about 15 minutes. See you then! 👍',
   false),
  ('seq-appt-reminder', 2, 1380,  -- 23h later (1h before appt)
   '{{first_name}}, just a reminder — your call with {{agent_name}} is in about 1 hour! Here''s the number to call: {{agent_phone}}. Looking forward to it!',
   false);


-- ── SEQUENCE 3: No Contact 72h Re-engagement ──────────────
insert into text_sequences (id, name, description, trigger, active)
values (
  'seq-no-contact-72h',
  'No Contact 72h — Re-engagement',
  'Fires when a lead hasn''t been contacted in 3 days. Warms them back up.',
  'no_contact_72h',
  true
);

insert into text_sequence_steps (sequence_id, step_number, delay_minutes, message_template, ai_personalize)
values
  ('seq-no-contact-72h', 1, 0,
   'Hey {{first_name}}! {{agent_name}} here — wanted to check in since we haven''t connected yet. Still interested in exploring your insurance options? Takes just 10 minutes 🙂',
   true),
  ('seq-no-contact-72h', 2, 1440,
   '{{first_name}}, I''ll be brief — I have a really affordable option I think would be a great fit for you. Can I send you some quick info?',
   true),
  ('seq-no-contact-72h', 3, 2880,
   'Last one from me, {{first_name}}! If timing isn''t right, no worries at all. Just reply whenever you''re ready and I''ll be here. 👋',
   true);


-- ── SEQUENCE 4: New Recruit ────────────────────────────────
insert into text_sequences (id, name, description, trigger, active)
values (
  'seq-new-recruit',
  'New Recruit — Outreach Sequence',
  'Fires when a new recruiting prospect is added. Sells the opportunity.',
  'new_recruit',
  true
);

insert into text_sequence_steps (sequence_id, step_number, delay_minutes, message_template, ai_personalize)
values
  ('seq-new-recruit', 1, 0,
   'Hi {{first_name}}! I came across your profile and thought you might be a great fit for what our team is doing. We''re an insurance agency that''s helping people earn $5-15k/month working from home. Have 5 minutes to hear more?',
   true),
  ('seq-new-recruit', 2, 480,
   '{{first_name}}, just wanted to follow up on my last message! We''re actively looking to grow our team this month. No license required to start — we help you get it. Worth a quick call?',
   true),
  ('seq-new-recruit', 3, 1440,
   'Hey {{first_name}}! One of our new agents just hit $8,400 in their first month. If you''re open to learning more about how we do it, I''d love to chat. What''s your schedule like this week?',
   true),
  ('seq-new-recruit', 4, 2880,
   'Hi {{first_name}}, last message from me on this. If the timing isn''t right or you''re happy where you are, totally get it! But if you ever want to explore a change, we''re here. 🙌',
   true);


-- ── SEQUENCE 5: Post-Close Check-in ───────────────────────
insert into text_sequences (id, name, description, trigger, active)
values (
  'seq-post-close',
  'Post-Close — Client Check-in',
  'Nurtures issued clients for referrals and policy reviews.',
  'lead_stage_changed',
  true
);

insert into text_sequence_steps (sequence_id, step_number, delay_minutes, message_template, ai_personalize)
values
  ('seq-post-close', 1, 0,
   'Congratulations {{first_name}}! Your policy is now active 🎉 If you ever have questions or want to review your coverage, I''m just a text away. And if you know anyone who might benefit from coverage, I''d love an intro!',
   false),
  ('seq-post-close', 2, 43200,  -- 30 days
   'Hey {{first_name}}! It''s been about a month since your policy activated. Everything going smoothly? Also — do you have any friends or family who might benefit from what we set you up with? Happy to help them too!',
   true);
