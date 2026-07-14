import { useQuery } from '@tanstack/react-query'
import type { User } from '@/lib/auth/types'

async function fetchUser(): Promise<User | null> {
  const res = await fetch('/auth/me')
  if (!res.ok) return null
  return res.json()
}

export function useUser() {
  const { data, isLoading } = useQuery<User | null>({
    queryKey: ['auth', 'user'],
    queryFn: fetchUser,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  return { user: data ?? null, isLoading }
}

export function useRequireUser() {
  const { user, isLoading } = useUser()
  return { user, isLoading, isAuthenticated: !!user }
}
