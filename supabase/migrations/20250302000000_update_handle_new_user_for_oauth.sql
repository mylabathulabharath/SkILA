-- Update handle_new_user function to support OAuth provider metadata
-- OAuth providers (Google, GitHub, Facebook) use different field names for the user's name:
-- - full_name: email/password signup
-- - name: Google, Facebook
-- - user_name: Some GitHub configurations

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_role public.app_role := 'student';
  user_full_name TEXT;
BEGIN
  -- Check if user metadata indicates trainer registration
  IF NEW.raw_user_meta_data ? 'is_trainer' THEN
    IF (NEW.raw_user_meta_data ->> 'is_trainer') = 'true' OR 
       (NEW.raw_user_meta_data -> 'is_trainer')::boolean = true THEN
      user_role := 'trainer';
    END IF;
  END IF;

  -- Get full name from OAuth provider metadata (different providers use different keys)
  user_full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    NEW.raw_user_meta_data ->> 'user_name',
    NEW.email
  );

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    user_role
  );
  RETURN NEW;
END;
$$;
