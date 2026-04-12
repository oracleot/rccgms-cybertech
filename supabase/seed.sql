-- ===========================================
-- Seed Data: Fusion
-- ===========================================
-- Run this after migrations to populate initial data

-- Equipment Categories
INSERT INTO equipment_categories (id, name, icon) VALUES
  ('401fac70-8b78-4c8f-9f51-457acdbf3158', 'Cameras', 'camera'),
  ('0f58f1a4-3a3a-4360-87dd-5b8d7c7abd1f', 'Audio', 'volume-2'),
  ('7a516841-fcb0-4607-8ac7-b0630d4ae616', 'Computers', 'laptop'),
  ('3b4e0b47-e477-47da-a9b5-4868101acbc6', 'Streaming', 'wifi'),
  ('a97233ac-3c7c-4529-89ea-aac5479f78f4', 'Cables & Adapters', 'cable'),
  ('1f6b1dca-1d97-428c-bc43-95b839e76fe0', 'Lighting', 'lightbulb'),
  ('e8ac04d6-d3ae-4708-8994-58ac3c4ad495', 'Miscellaneous', 'box');

-- Departments
INSERT INTO departments (id, name, description, color) VALUES
  ('349301a8-8e6a-4e3d-85cf-ca8c466328fa', 'Sound', 'Audio equipment and mixing', '#3B82F6'),
  ('0920d4f9-70af-4ae0-bb27-3c90b9a59274', 'Cameras', 'Video recording and production', '#EF4444'),
  ('9148030c-9f02-4a9f-b08a-7c94cf1b9770', 'Projection', 'Slides and visual presentation', '#8B5CF6'),
  ('1c23a977-8c77-453f-8ab3-a830748992b4', 'Streaming', 'Live streaming and broadcast', '#10B981'),
  ('4241efeb-6bb4-48d0-acd8-d36626b10280', 'Time Management', 'Service timing and coordination', '#F59E0B');

-- Positions for each department
-- Sound Department
INSERT INTO positions (id, name, department_id, description, min_members, max_members) VALUES
  ('b13ff7c0-9114-4682-aeb2-94e98e39644a', 'Main Sound', '349301a8-8e6a-4e3d-85cf-ca8c466328fa', 'Primary audio mixer', 1, 1),
  ('6075c34a-09f0-458b-9b65-af8e070d9a4c', 'Sound Assistant', '349301a8-8e6a-4e3d-85cf-ca8c466328fa', 'Assists main sound operator', 0, 1),
  ('9fd464e2-dd7d-47c7-a251-745dd924102c', 'Monitors', '349301a8-8e6a-4e3d-85cf-ca8c466328fa', 'Stage monitors and in-ear mixes', 0, 1);

-- Cameras Department
INSERT INTO positions (id, name, department_id, description, min_members, max_members) VALUES
  ('d368d10a-d220-4da2-8edd-acf22d1ab380', 'Camera 1', '0920d4f9-70af-4ae0-bb27-3c90b9a59274', 'Main camera operator', 1, 1),
  ('d52f6bec-1370-4a4a-ad60-622a2b545a3d', 'Camera 2', '0920d4f9-70af-4ae0-bb27-3c90b9a59274', 'Secondary camera operator', 0, 1),
  ('2fee8752-a5a7-41e2-aec8-4ede5c469a8e', 'Camera 3', '0920d4f9-70af-4ae0-bb27-3c90b9a59274', 'Wide shot camera', 0, 1),
  ('63dc54c9-c133-4012-9efa-9187ec9c4a3d', 'PTZ Operator', '0920d4f9-70af-4ae0-bb27-3c90b9a59274', 'Remote camera control', 0, 1);

-- Projection Department
INSERT INTO positions (id, name, department_id, description, min_members, max_members) VALUES
  ('41a5daec-09dc-45f5-803c-e823dd7c3d70', 'Lyrics', '9148030c-9f02-4a9f-b08a-7c94cf1b9770', 'Song lyrics operator', 1, 1),
  ('661c2c4d-85f4-414a-a85a-f5763d3f4509', 'Slides', '9148030c-9f02-4a9f-b08a-7c94cf1b9770', 'Presentation slides', 0, 1);

-- Streaming Department
INSERT INTO positions (id, name, department_id, description, min_members, max_members) VALUES
  ('a02e3dc3-d557-47cf-9404-62d2f3b08459', 'Stream Producer', '1c23a977-8c77-453f-8ab3-a830748992b4', 'Live stream director', 1, 1),
  ('f726facb-8c7d-4988-b5a6-62d5c97a3952', 'Graphics', '1c23a977-8c77-453f-8ab3-a830748992b4', 'Lower thirds and graphics', 0, 1),
  ('fd9c75d8-68c1-4138-9cb5-22fbe5118cae', 'Chat Moderator', '1c23a977-8c77-453f-8ab3-a830748992b4', 'Monitors online chat', 0, 2);

-- Time Management Department
INSERT INTO positions (id, name, department_id, description, min_members, max_members) VALUES
  ('5daefed9-48b3-45a6-80fb-113d9170b354', 'Timer', '4241efeb-6bb4-48d0-acd8-d36626b10280', 'Service timing and cues', 1, 1);

-- Services
INSERT INTO services (id, name, day_of_week, start_time, end_time, is_recurring, location) VALUES
  ('8991f3e0-b353-45fb-9c67-031e9cdbf22a', 'Sunday Service', 0, '09:00', '12:00', true, 'Main Auditorium'),
  ('2aa9e12b-c22d-4197-99dd-5143c3bcedfd', 'Midweek Service', 3, '19:00', '21:00', true, 'Online (Zoom)'),
  ('3c237083-76d4-4bb1-8c1b-965c70730a94', 'Prayer Meeting', 5, '06:00', '07:00', true, 'Online (Zoom)');

-- Default Prompt Templates
INSERT INTO prompt_templates (id, name, platform, template, is_default) VALUES
  ('9581bb6c-857e-4efa-bc2d-1cfbe8aa631a', 'YouTube Service Description', 'youtube', 
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
  ('6370ee4d-157f-40bf-9034-d17d70024275', 'Facebook Service Description', 'facebook',
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
  ('7d133afa-2e3b-4891-aa3b-98a8fd7d9340', '349301a8-8e6a-4e3d-85cf-ca8c466328fa', 'Sound Team Basics', 'Introduction to audio equipment and mixing fundamentals', 4),
  ('80952e08-f359-4c59-bc6a-952cc1fb8e85', '0920d4f9-70af-4ae0-bb27-3c90b9a59274', 'Camera Operations', 'Learn camera setup, framing, and movement techniques', 3),
  ('0619708e-c12e-4535-9606-e78fb3ff02e0', '1c23a977-8c77-453f-8ab3-a830748992b4', 'Streaming Fundamentals', 'Master live streaming software and troubleshooting', 4);

-- Sample Training Steps for Sound Team Basics
INSERT INTO onboarding_steps (id, track_id, "order", title, description, type, required) VALUES
  ('be66e5ac-c70d-49e1-9d40-96bc366d6670', '7d133afa-2e3b-4891-aa3b-98a8fd7d9340', 1, 'Welcome & Overview', 'Introduction to the sound team and expectations', 'video', true),
  ('9dab676a-d2aa-40df-b44c-3a09722bd736', '7d133afa-2e3b-4891-aa3b-98a8fd7d9340', 2, 'Equipment Safety', 'Safety guidelines for handling audio equipment', 'document', true),
  ('f446244c-02e2-460e-a4d9-b9192ef50e95', '7d133afa-2e3b-4891-aa3b-98a8fd7d9340', 3, 'Mixer Basics', 'Understanding the mixing console layout and functions', 'video', true),
  ('fce06dbf-e78b-4ba6-abe3-b6a1f5a200c1', '7d133afa-2e3b-4891-aa3b-98a8fd7d9340', 4, 'Shadow Session 1', 'Observe an experienced operator during a service', 'shadowing', true),
  ('a0aff726-8cf6-4bfb-8c9c-495072fa68f4', '7d133afa-2e3b-4891-aa3b-98a8fd7d9340', 5, 'Practical: Setup', 'Set up microphones and check levels', 'practical', true),
  ('2ad6dd6b-704a-48d0-8701-eaff6849f422', '7d133afa-2e3b-4891-aa3b-98a8fd7d9340', 6, 'Knowledge Check', 'Quiz on audio fundamentals', 'quiz', true);

-- Note: Initial admin user will be created via Supabase Auth
-- After creating a user through auth, run:
-- UPDATE profiles SET role = 'admin' WHERE email = 'admin@yourchurch.com';
