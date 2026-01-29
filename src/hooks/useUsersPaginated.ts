import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UserWithRole } from '@/components/admin/users/UserCard';

interface UseUsersPaginatedParams {
  search: string;
  roleFilter: string;
  page: number;
  pageSize?: number;
}

interface PaginatedUsersResult {
  users: UserWithRole[];
  totalCount: number;
  totalPages: number;
}

export function useUsersPaginated({
  search,
  roleFilter,
  page,
  pageSize = 20,
}: UseUsersPaginatedParams) {
  return useQuery({
    queryKey: ['admin-users-paginated', search, roleFilter, page, pageSize],
    queryFn: async (): Promise<PaginatedUsersResult> => {
      const { data, error } = await supabase.rpc('search_users_paginated', {
        p_search: search,
        p_role_filter: roleFilter,
        p_page: page,
        p_page_size: pageSize,
      });

      if (error) throw error;

      const totalCount = data?.[0]?.total_count || 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      const users: UserWithRole[] = (data || []).map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        full_name: row.full_name,
        avatar_url: row.avatar_url,
        created_at: row.created_at,
        role: row.role as UserWithRole['role'],
        bio: row.bio,
        course: row.course,
        branch: row.branch,
        roll_number: row.roll_number,
        year: row.year,
        semester: row.semester,
        father_name: row.father_name,
        date_of_birth: row.date_of_birth,
        is_disabled: row.is_disabled,
      }));

      return { users, totalCount, totalPages };
    },
    staleTime: 1000 * 30,
    placeholderData: (prev) => prev,
  });
}
