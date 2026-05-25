-- Optional seed data. Run after all migrations in this folder.
--
-- Requirements for a full 10-question match:
--   3 grammar + 3 vocabulary + 3 fill-in-the-blank + 1 idioms
-- per (language, level) pair.
--
-- Your profile must use:
--   target_language = 'Italian'
--   proficiency_level = 'A1-A2'   (must match exactly)

insert into public.questions_active (
  language,
  level,
  category,
  question_text,
  option_a,
  option_b,
  option_c,
  option_d,
  correct_answer
) values
  -- Grammar (add at least 3; more = more variety between matches)
  ('Italian', 'A1-A2', 'grammar', 'Io ___ italiano.', 'parlo', 'parla', 'parli', 'parlano', 'A'),
  ('Italian', 'A1-A2', 'grammar', 'Loro ___ a Roma.', 'vive', 'vivono', 'vivi', 'vivo', 'B'),
  ('Italian', 'A1-A2', 'grammar', 'Maria ___ una mela.', 'mangia', 'mangio', 'mangiamo', 'mangiate', 'A'),
  ('Italian', 'A1-A2', 'grammar', 'Noi ___ studenti.', 'sono', 'sei', 'è', 'siete', 'A'),
  ('Italian', 'A1-A2', 'grammar', 'Tu ___ molto bene.', 'canta', 'canti', 'cantiamo', 'cantate', 'B'),

  -- Vocabulary
  ('Italian', 'A1-A2', 'vocabulary', 'What does "cane" mean?', 'cat', 'dog', 'bird', 'fish', 'B'),
  ('Italian', 'A1-A2', 'vocabulary', 'What is "libro" in English?', 'pen', 'book', 'door', 'chair', 'B'),
  ('Italian', 'A1-A2', 'vocabulary', 'What does "acqua" mean?', 'water', 'fire', 'bread', 'milk', 'A'),
  ('Italian', 'A1-A2', 'vocabulary', 'What is "casa" in English?', 'car', 'house', 'school', 'street', 'B'),
  ('Italian', 'A1-A2', 'vocabulary', 'What does "treno" mean?', 'bus', 'plane', 'train', 'bike', 'C'),

  -- Fill-in-the-blank
  ('Italian', 'A1-A2', 'fill-in-the-blank', 'Buongiorno, come ___?', 'stai', 'stare', 'sto', 'sta', 'A'),
  ('Italian', 'A1-A2', 'fill-in-the-blank', 'Mi ___ Marco.', 'chiamo', 'chiama', 'chiami', 'chiamano', 'A'),
  ('Italian', 'A1-A2', 'fill-in-the-blank', 'Dove ___ la stazione?', 'è', 'sono', 'sei', 'siamo', 'A'),
  ('Italian', 'A1-A2', 'fill-in-the-blank', 'A domani, ___!', 'ciao', 'grazie', 'prego', 'scusa', 'A'),
  ('Italian', 'A1-A2', 'fill-in-the-blank', 'Quanto ___?', 'costa', 'costo', 'costi', 'costano', 'A'),

  -- Idioms (need at least 1 per match)
  ('Italian', 'A1-A2', 'idioms', 'What does "in bocca al lupo" mean?', 'Break a leg', 'Good luck', 'See you soon', 'Bon appetit', 'B'),
  ('Italian', 'A1-A2', 'idioms', 'What does "avere sonno" mean?', 'To be hungry', 'To be sleepy', 'To be angry', 'To be cold', 'B');

-- Verify counts for your level:
-- select category, count(*) from public.questions_active
-- where language = 'Italian' and level = 'A1-A2'
-- group by category;

-- Reset seen questions for testing (so every match feels fresh):
-- update public.player_stats
-- set seen_questions = '{}'::uuid[]
-- where user_id = (select id from auth.users where email = 'you@example.com');
