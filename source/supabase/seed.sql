INSERT INTO public.tag (name, category) VALUES
  ('Year 1', 'year'),
  ('Year 2', 'year'),
  ('Year 3', 'year'),
  ('Year 4', 'year'),
  ('Everyone', 'activity'),
  ('CS101', 'course'),
  ('Meeting', 'activity');


-- Sample schedule events for local development (`supabase db reset`).
-- Dates are relative to the day the seed runs, so the calendar always has
-- something around "today". creator_id is left NULL: there is no signed-in
-- user while seeding.
INSERT INTO public.schedule (title, event_date, start_time, end_time, location, description, creator_id) VALUES
  ('Department seminar',         CURRENT_DATE - 7,  '13:00', '15:00', 'Room 204',          'Guest talk on cloud-native systems.',        NULL),
  ('Software Process lecture',   CURRENT_DATE - 2,  '09:00', '12:00', 'Room 301',          NULL,                                         NULL),
  ('Web Programming lab',        CURRENT_DATE,      '09:00', '12:00', 'Lab 2',             'Bring your laptop.',                         NULL),
  ('ISP sprint review',          CURRENT_DATE,      '13:30', '15:00', 'Lab 1',             'Each team demos the current iteration.',     NULL),
  ('Lecturer office hours',      CURRENT_DATE + 1,  '10:00', '11:30', 'Room 105',          'Drop in with questions about the project.',  NULL),
  ('Project proposal deadline',  CURRENT_DATE + 2,  '23:00', '23:59', 'Online submission', 'Submit the proposal PDF before midnight.',   NULL),
  ('Data Structures midterm',    CURRENT_DATE + 3,  '09:00', '12:00', 'Exam Hall A',       'Bring your student ID card.',                NULL),
  ('Hackathon kick-off',         CURRENT_DATE + 5,  '10:00', '17:00', 'Lab 1',             NULL,                                         NULL),
  ('Career talk',                CURRENT_DATE + 8,  '15:00', '16:30', 'Room 204',          'Alumni share their internship experience.',  NULL),
  ('Course registration opens',  CURRENT_DATE + 14, '08:00', '17:00', 'Registrar website', NULL,                                         NULL);

-- Tag links for the sample events, matched by title and tag name
INSERT INTO public.schedule_tag (schedule_id, tag_id)
SELECT s.id, t.id
FROM (VALUES
  ('Department seminar',        'Everyone'),
  ('Web Programming lab',       'Year 2'),
  ('ISP sprint review',         'Year 2'),
  ('Lecturer office hours',     'Meeting'),
  ('Project proposal deadline', 'Year 2'),
  ('Data Structures midterm',   'Year 2'),
  ('Data Structures midterm',   'CS101'),
  ('Career talk',               'Everyone'),
  ('Course registration opens', 'Everyone')
) AS link (schedule_title, tag_name)
JOIN public.schedule s ON s.title = link.schedule_title
JOIN public.tag t ON t.name = link.tag_name;
