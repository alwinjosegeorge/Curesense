
-- 1. Add columns to profiles for ID-based login
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_number TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- 2. Ensure user_roles has a unique constraint on user_id for ON CONFLICT support
-- First, remove any potential duplicate roles for the same user if they exist
DELETE FROM public.user_roles a USING public.user_roles b WHERE a.id < b.id AND a.user_id = b.user_id;
-- Add the constraint
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_key') THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 3. Update trigger to include email and id_number in profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, full_name, role, email, id_number)
  VALUES (
    NEW.id, 
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'patient'::app_role),
    NEW.email,
    NEW.raw_user_meta_data->>'id_number'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id, 
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'patient'::app_role)
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create accounts for all existing doctors
DO $$
DECLARE
    doc_rec RECORD;
    new_user_id UUID;
    doc_id_str TEXT;
    doc_email TEXT;
    counter INTEGER := 1;
BEGIN
    FOR doc_rec IN SELECT * FROM public.doctors ORDER BY created_at ASC LOOP
        doc_id_str := 'DOC' || LPAD(counter::text, 3, '0');
        -- Generate a unique email based on name
        doc_email := lower(regexp_replace(doc_rec.name, '[^a-zA-Z0-0]', '', 'g')) || '@curesense.ai';
        
        -- Check if user already exists in auth.users
        SELECT id INTO new_user_id FROM auth.users WHERE email = doc_email;
        
        IF new_user_id IS NULL THEN
            new_user_id := gen_random_uuid();
            
            -- Insert into auth.users (Supabase Auth)
            INSERT INTO auth.users (
                id, email, encrypted_password, email_confirmed_at, 
                raw_app_meta_data, raw_user_meta_data, 
                created_at, updated_at, role, aud, confirmation_token
            )
            VALUES (
                new_user_id,
                doc_email,
                crypt('doctor@123', gen_salt('bf')),
                now(),
                '{"provider":"email","providers":["email"]}',
                jsonb_build_object('full_name', doc_rec.name, 'role', 'doctor', 'id_number', doc_id_str),
                now(),
                now(),
                'authenticated',
                'authenticated',
                ''
            );
            
            -- Wait a moment for trigger or just do it manually to be safe
            INSERT INTO public.profiles (id, user_id, full_name, role, email, id_number)
            VALUES (new_user_id, new_user_id, doc_rec.name, 'doctor', doc_email, doc_id_str)
            ON CONFLICT (user_id) DO UPDATE SET id_number = EXCLUDED.id_number;
            
            INSERT INTO public.user_roles (user_id, role)
            VALUES (new_user_id, 'doctor')
            ON CONFLICT (user_id) DO NOTHING;
        END IF;
        
        -- Link the doctor record to the generated user_id
        UPDATE public.doctors SET user_id = new_user_id WHERE id = doc_rec.id;
        
        counter := counter + 1;
    END LOOP;
END $$;
