insert into event_categories (name, display_order, icon_name, is_cruise_only) values
  ('Transport', 1, 'airplane', false),
  ('Accommodation', 2, 'bed', false),
  ('Activity', 3, 'ticket', false),
  ('Meal', 4, 'fork.knife', false),
  ('Rest', 5, 'moon', false),
  ('Health', 6, 'cross', false),
  ('Free Time', 7, 'sun.max', false),
  ('Shore Excursion', 8, 'figure.sailing', true);

insert into event_subcategories (category_id, name, display_order)
select id, sub, ord from event_categories,
(values ('Air', 1), ('Road', 2), ('Rail', 3), ('Water', 4)) as s(sub, ord)
where name = 'Transport';

insert into event_subcategories (category_id, name, display_order)
select id, sub, ord from event_categories,
(values ('Car hire', 5), ('Taxi', 6), ('Shuttle', 7), ('Bus', 8), ('Self-drive', 9)) as s(sub, ord)
where name = 'Transport';

insert into event_subcategories (category_id, name, display_order)
select id, sub, ord from event_categories,
(values ('Hotel', 1), ('Airbnb', 2), ('Resort', 3), ('Hostel', 4), ('Other', 5)) as s(sub, ord)
where name = 'Accommodation';

insert into event_subcategories (category_id, name, display_order)
select id, sub, ord from event_categories,
(values ('Theme park', 1), ('Show', 2), ('Sightseeing', 3), ('Sporting event', 4), ('Exhibition', 5), ('Tour', 6), ('Other', 7)) as s(sub, ord)
where name = 'Activity';

insert into event_subcategories (category_id, name, display_order)
select id, sub, ord from event_categories,
(values ('Restaurant', 1), ('Cafe', 2), ('Food tour', 3)) as s(sub, ord)
where name = 'Meal';

insert into event_subcategories (category_id, name, display_order)
select id, sub, ord from event_categories,
(values ('Appointment', 1), ('Pharmacy', 2), ('Medical', 3)) as s(sub, ord)
where name = 'Health';

insert into event_subcategories (category_id, name, display_order)
select id, sub, ord from event_categories,
(values ('Ferry', 10), ('Cruise leg', 11), ('Water taxi', 12)) as s(sub, ord)
where name = 'Transport';

insert into feature_flags (key, enabled, description) values
  ('treasure_map_enabled', true, 'Toggle Treasure Map feature globally'),
  ('ai_url_extraction_enabled', true, 'Toggle YouTube/TikTok URL extraction'),
  ('memories_puzzle_style_enabled', true, 'Toggle Puzzle display style for memories'),
  ('stats_healthkit_enabled', true, 'Toggle Apple Health integration');
