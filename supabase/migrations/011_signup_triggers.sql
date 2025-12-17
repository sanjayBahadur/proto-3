-- =============================================================================
-- Signup Triggers: Handle new user creation
-- =============================================================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_email TEXT;
  v_org_id UUID;
  v_org_name TEXT;
  v_input_org_id TEXT;
  v_input_org_name TEXT;
BEGIN
  -- Extract values from metadata
  v_role := new.raw_user_meta_data->>'role';
  v_email := new.email;
  v_input_org_id := new.raw_user_meta_data->>'org_id';
  v_input_org_name := new.raw_user_meta_data->>'org_name';
  
  -- Security check: Force 'staff' if role is 'admin' or invalid
  IF v_role IS NULL OR v_role NOT IN ('manager', 'staff') THEN
    v_role := 'staff';
  END IF;

  -- Logic for 'manager'
  IF v_role = 'manager' THEN
    -- If org_id is provided, use it
    IF v_input_org_id IS NOT NULL AND v_input_org_id != '' THEN
       -- Validate UUID format roughly or let cast handle it (but better safe)
       v_org_id := v_input_org_id::UUID;
    -- Else if org_name is provided, create new org
    ELSIF v_input_org_name IS NOT NULL AND v_input_org_name != '' THEN
       INSERT INTO public.organizations (name)
       VALUES (v_input_org_name)
       RETURNING id INTO v_org_id;
    -- Fallback: Create default org name if nothing provided (edge case)
    ELSE
       v_org_name := COALESCE(v_email, 'New User') || '''s Org';
       INSERT INTO public.organizations (name)
       VALUES (v_org_name)
       RETURNING id INTO v_org_id;
    END IF;

    -- Create profile: Disabled (requires approval), Role=Manager, Org=Selected/Created
    INSERT INTO public.profiles (id, email, role, org_id, disabled)
    VALUES (new.id, v_email, 'manager', v_org_id, true);

  -- Logic for 'staff'
  ELSE
    -- Create profile: Disabled (requires approval), Role=Staff, Org=NULL
    -- Logic remains same: Staff don't choose org on signup, they get assigned/invited later 
    -- or maybe we want them to request an org? 
    -- For now following existing pattern: Staff org is NULL until assigned.
    INSERT INTO public.profiles (id, email, role, org_id, disabled)
    VALUES (new.id, v_email, 'staff', NULL, true);
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- Helper: Get Organizations for Signup
-- =============================================================================

-- Allow anon users (signup page) to see list of organizations to join
CREATE OR REPLACE FUNCTION public.get_organizations_for_signup()
RETURNS TABLE (
  id UUID,
  name TEXT
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, name FROM public.organizations ORDER BY name;
$$;

-- Grant execute to everyone (anon + authenticated)
GRANT EXECUTE ON FUNCTION public.get_organizations_for_signup() TO anon, authenticated, service_role;
