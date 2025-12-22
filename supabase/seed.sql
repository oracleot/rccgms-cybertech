-- ===========================================
-- Seed Data: Cyber Tech
-- ===========================================
-- Run this after migrations to populate initial data

-- Equipment Categories
INSERT INTO equipment_categories (id, name, icon) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Cameras', 'camera'),
  ('11111111-1111-1111-1111-111111111102', 'Audio', 'volume-2'),
  ('11111111-1111-1111-1111-111111111103', 'Computers', 'laptop'),
  ('11111111-1111-1111-1111-111111111104', 'Streaming', 'wifi'),
  ('11111111-1111-1111-1111-111111111105', 'Cables & Adapters', 'cable'),
  ('11111111-1111-1111-1111-111111111106', 'Lighting', 'lightbulb'),
  ('11111111-1111-1111-1111-111111111107', 'Miscellaneous', 'box');

-- Departments
INSERT INTO departments (id, name, description, color) VALUES
  ('22222222-2222-2222-2222-222222222201', 'Sound', 'Audio equipment and mixing', '#3B82F6'),
  ('22222222-2222-2222-2222-222222222202', 'Cameras', 'Video recording and production', '#EF4444'),
  ('22222222-2222-2222-2222-222222222203', 'Projection', 'Slides and visual presentation', '#8B5CF6'),
  ('22222222-2222-2222-2222-222222222204', 'Streaming', 'Live streaming and broadcast', '#10B981'),
  ('22222222-2222-2222-2222-222222222205', 'Time Management', 'Service timing and coordination', '#F59E0B');

-- Positions for each department
-- Sound Department
INSERT INTO positions (id, name, department_id, description, min_volunteers, max_volunteers) VALUES
  ('33333333-3333-3333-3333-333333333301', 'Main Sound', '22222222-2222-2222-2222-222222222201', 'Primary audio mixer', 1, 1),
  ('33333333-3333-3333-3333-333333333302', 'Sound Assistant', '22222222-2222-2222-2222-222222222201', 'Assists main sound operator', 0, 1),
  ('33333333-3333-3333-3333-333333333303', 'Monitors', '22222222-2222-2222-2222-222222222201', 'Stage monitors and in-ear mixes', 0, 1);

-- Cameras Department
INSERT INTO positions (id, name, department_id, description, min_volunteers, max_volunteers) VALUES
  ('33333333-3333-3333-3333-333333333304', 'Camera 1', '22222222-2222-2222-2222-222222222202', 'Main camera operator', 1, 1),
  ('33333333-3333-3333-3333-333333333305', 'Camera 2', '22222222-2222-2222-2222-222222222202', 'Secondary camera operator', 0, 1),
  ('33333333-3333-3333-3333-333333333306', 'Camera 3', '22222222-2222-2222-2222-222222222202', 'Wide shot camera', 0, 1),
  ('33333333-3333-3333-3333-333333333307', 'PTZ Operator', '22222222-2222-2222-2222-222222222202', 'Remote camera control', 0, 1);

-- Projection Department
INSERT INTO positions (id, name, department_id, description, min_volunteers, max_volunteers) VALUES
  ('33333333-3333-3333-3333-333333333308', 'Lyrics', '22222222-2222-2222-2222-222222222203', 'Song lyrics operator', 1, 1),
  ('33333333-3333-3333-3333-333333333309', 'Slides', '22222222-2222-2222-2222-222222222203', 'Presentation slides', 0, 1);

-- Streaming Department
INSERT INTO positions (id, name, department_id, description, min_volunteers, max_volunteers) VALUES
  ('33333333-3333-3333-3333-333333333310', 'Stream Producer', '22222222-2222-2222-2222-222222222204', 'Live stream director', 1, 1),
  ('33333333-3333-3333-3333-333333333311', 'Graphics', '22222222-2222-2222-2222-222222222204', 'Lower thirds and graphics', 0, 1),
  ('33333333-3333-3333-3333-333333333312', 'Chat Moderator', '22222222-2222-2222-2222-222222222204', 'Monitors online chat', 0, 2);

-- Time Management Department
INSERT INTO positions (id, name, department_id, description, min_volunteers, max_volunteers) VALUES
  ('33333333-3333-3333-3333-333333333313', 'Timer', '22222222-2222-2222-2222-222222222205', 'Service timing and cues', 1, 1);

-- Services
INSERT INTO services (id, name, day_of_week, start_time, end_time, is_recurring, location) VALUES
  ('44444444-4444-4444-4444-444444444401', 'Sunday Service', 0, '09:00', '12:00', true, 'Main Auditorium'),
  ('44444444-4444-4444-4444-444444444402', 'Midweek Service', 3, '19:00', '21:00', true, 'Main Auditorium'),
  ('44444444-4444-4444-4444-444444444403', 'Prayer Meeting', 5, '06:00', '07:00', true, 'Chapel');

-- Default Prompt Templates
INSERT INTO prompt_templates (id, name, platform, template, is_default) VALUES
  ('55555555-5555-5555-5555-555555555501', 'YouTube Service Description', 'youtube', 
   'Create an engaging YouTube description for a church service with the following details:
- Service: {{title}}
- Date: {{date}}
- Speaker: {{speaker}}
- Scripture: {{scripture}}

Include:
1. A welcoming opening paragraph
2. Key themes and takeaways
3. Timestamps section (if applicable)
4. Call to action to subscribe and share
5. Church contact info and social links
6. Relevant hashtags

Keep the tone warm, inviting, and spiritually uplifting.',
   true),
  ('55555555-5555-5555-5555-555555555502', 'Facebook Service Description', 'facebook',
   'Create a Facebook post for a church service:
- Service: {{title}}
- Date: {{date}}
- Speaker: {{speaker}}
- Scripture: {{scripture}}

The post should be:
1. Shorter than YouTube (ideal for social media)
2. Include an engaging hook
3. Highlight key message points
4. Include a call to action
5. Use appropriate emojis sparingly
6. Include 3-5 relevant hashtags',
   true);

-- Sample Training Tracks
INSERT INTO onboarding_tracks (id, department_id, name, description, estimated_weeks) VALUES
  ('66666666-6666-6666-6666-666666666601', '22222222-2222-2222-2222-222222222201', 'Sound Team Basics', 'Introduction to audio equipment and mixing fundamentals', 4),
  ('66666666-6666-6666-6666-666666666602', '22222222-2222-2222-2222-222222222202', 'Camera Operations', 'Learn camera setup, framing, and movement techniques', 3),
  ('66666666-6666-6666-6666-666666666603', '22222222-2222-2222-2222-222222222204', 'Streaming Fundamentals', 'Master live streaming software and troubleshooting', 4);

-- Sample Training Steps for Sound Team Basics
INSERT INTO onboarding_steps (id, track_id, "order", title, description, type, required) VALUES
  ('77777777-7777-7777-7777-777777777701', '66666666-6666-6666-6666-666666666601', 1, 'Welcome & Overview', 'Introduction to the sound team and expectations', 'video', true),
  ('77777777-7777-7777-7777-777777777702', '66666666-6666-6666-6666-666666666601', 2, 'Equipment Safety', 'Safety guidelines for handling audio equipment', 'document', true),
  ('77777777-7777-7777-7777-777777777703', '66666666-6666-6666-6666-666666666601', 3, 'Mixer Basics', 'Understanding the mixing console layout and functions', 'video', true),
  ('77777777-7777-7777-7777-777777777704', '66666666-6666-6666-6666-666666666601', 4, 'Shadow Session 1', 'Observe an experienced operator during a service', 'shadowing', true),
  ('77777777-7777-7777-7777-777777777705', '66666666-6666-6666-6666-666666666601', 5, 'Practical: Setup', 'Set up microphones and check levels', 'practical', true),
  ('77777777-7777-7777-7777-777777777706', '66666666-6666-6666-6666-666666666601', 6, 'Knowledge Check', 'Quiz on audio fundamentals', 'quiz', true);

-- Note: Initial admin user will be created via Supabase Auth
-- After creating a user through auth, run:
-- UPDATE profiles SET role = 'admin' WHERE email = 'admin@yourchurch.com';
