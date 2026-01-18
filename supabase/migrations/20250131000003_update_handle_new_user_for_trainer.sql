-- Update handle_new_user function to support trainer role assignment
-- This allows the trigger to set role='trainer' if the user metadata contains is_trainer=true

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_role public.app_role := 'student';
BEGIN
  -- Check if user metadata indicates trainer registration
  -- Metadata is stored as JSONB, check if is_trainer is true
  IF NEW.raw_user_meta_data ? 'is_trainer' THEN
    IF (NEW.raw_user_meta_data ->> 'is_trainer') = 'true' OR 
       (NEW.raw_user_meta_data -> 'is_trainer')::boolean = true THEN
      user_role := 'trainer';
    END IF;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    user_role
  );
  RETURN NEW;
END;
$$;

