-- Re-grant SELECT on academic fields (they are user-facing profile info, not admin-only)
GRANT SELECT (roll_number, branch, course, semester, year) ON public.profiles TO authenticated;
-- Keep disabled_*, is_disabled, role revoked from authenticated (admin-only via has_role + RLS)