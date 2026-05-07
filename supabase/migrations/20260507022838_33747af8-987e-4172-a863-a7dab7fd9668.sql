
-- Enums
CREATE TYPE public.app_role AS ENUM ('super_admin','admin','ustadz','student');
CREATE TYPE public.approval_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.permission_status AS ENUM ('pending','approved','rejected','late','returned');
CREATE TYPE public.admin_request_status AS ENUM ('pending','accepted','rejected');

-- Dormitories
CREATE TABLE public.dormitories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL,
  phone text,
  parent_name text,
  parent_phone text,
  room text,
  dormitory_id uuid REFERENCES public.dormitories(id) ON DELETE SET NULL,
  qr_token uuid NOT NULL DEFAULT gen_random_uuid(),
  approval_status public.approval_status NOT NULL DEFAULT 'approved',
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- User roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Ustadz <-> dormitories
CREATE TABLE public.ustadz_dormitories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ustadz_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dormitory_id uuid NOT NULL REFERENCES public.dormitories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ustadz_id, dormitory_id)
);

-- Admin requests
CREATE TABLE public.admin_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.admin_request_status NOT NULL DEFAULT 'pending',
  notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Permissions
CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  destination text NOT NULL,
  exit_date timestamptz NOT NULL,
  return_date timestamptz NOT NULL,
  guardian_phone text,
  status public.permission_status NOT NULL DEFAULT 'pending',
  approved_by uuid REFERENCES auth.users(id),
  notes text,
  checked_in_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Activity logs
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  activity text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- has_role helper
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin','admin','ustadz')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin','admin')
  );
$$;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_dorm_updated BEFORE UPDATE ON public.dormitories FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_profile_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_admin_req_updated BEFORE UPDATE ON public.admin_requests FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_permissions_updated BEFORE UPDATE ON public.permissions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create profile and assign role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role public.app_role;
  v_full_name text;
  v_approval public.approval_status;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1));
  -- Determine role from metadata; default 'student'
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'student');

  -- Force super admin for the seed email
  IF NEW.email = 'muhammadafifhikam@gmail.com' THEN
    v_role := 'super_admin';
  END IF;

  -- Ustadz needs approval; others auto-approved
  v_approval := CASE WHEN v_role = 'ustadz' THEN 'pending'::public.approval_status
                     ELSE 'approved'::public.approval_status END;

  INSERT INTO public.profiles (id, full_name, email, approval_status)
  VALUES (NEW.id, v_full_name, NEW.email, v_approval);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.dormitories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ustadz_dormitories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Dormitories policies
CREATE POLICY "dorm_read_all_auth" ON public.dormitories FOR SELECT TO authenticated USING (true);
CREATE POLICY "dorm_admin_modify" ON public.dormitories FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Profiles policies
CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "profiles_admin_insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "profiles_admin_delete" ON public.profiles FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- user_roles policies
CREATE POLICY "roles_self_read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "roles_admin_modify" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ustadz_dormitories policies
CREATE POLICY "ud_read" ON public.ustadz_dormitories FOR SELECT TO authenticated
  USING (ustadz_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "ud_self_insert" ON public.ustadz_dormitories FOR INSERT TO authenticated
  WITH CHECK (ustadz_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "ud_admin_modify" ON public.ustadz_dormitories FOR DELETE TO authenticated
  USING (ustadz_id = auth.uid() OR public.is_admin(auth.uid()));

-- admin_requests policies
CREATE POLICY "areq_self_read" ON public.admin_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "areq_self_insert" ON public.admin_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "areq_self_cancel" ON public.admin_requests FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "areq_admin_update" ON public.admin_requests FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- permissions policies
CREATE POLICY "perm_read" ON public.permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "perm_student_insert" ON public.permissions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "perm_student_update_own" ON public.permissions FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "perm_admin_delete" ON public.permissions FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- activity_logs policies
CREATE POLICY "log_admin_read" ON public.activity_logs FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "log_self_insert" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_staff(auth.uid()));

-- Realtime
ALTER TABLE public.permissions REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.admin_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.permissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_requests;

-- Seed dormitories
INSERT INTO public.dormitories (name, description) VALUES
  ('Abu Bakar Dormitory','Default dormitory'),
  ('Umar Dormitory','Default dormitory'),
  ('Utsman Dormitory','Default dormitory'),
  ('Ali Dormitory','Default dormitory'),
  ('Khalid Dormitory','Default dormitory')
ON CONFLICT (name) DO NOTHING;
