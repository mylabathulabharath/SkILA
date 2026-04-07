-- Update handle_new_user function to auto-confirm trainers
-- This trigger will set email_confirmed_at for users with is_trainer=true in their metadata

CREATE OR REPLACE FUNCTION public.confirm_trainer_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = auth, public
AS $$
BEGIN
  -- Check if user metadata indicates trainer registration
  IF (NEW.raw_user_meta_data ->> 'is_trainer') = 'true' OR 
     (NEW.raw_user_meta_data -> 'is_trainer')::boolean = true THEN
    -- Auto-confirm the email
    NEW.email_confirmed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger on auth.users
-- This must be a BEFORE INSERT trigger to modify NEW before it's saved
DROP TRIGGER IF EXISTS tr_confirm_trainer ON auth.users;
CREATE TRIGGER tr_confirm_trainer
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.confirm_trainer_on_signup();
