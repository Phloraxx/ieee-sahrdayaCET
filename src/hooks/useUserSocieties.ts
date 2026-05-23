import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useUserSocieties(allSocieties: { slug: string; $id: string }[] | null) {
  const { userTeams } = useAuth();

  return useMemo(() => {
    if (!userTeams || !allSocieties) return null;

    const isGlobalAdmin = userTeams.some(team =>
      team.$id === 'admins' || (team.name && team.name.toLowerCase() === 'admins')
    );
    if (isGlobalAdmin) return null;

    const userSlugs = userTeams
      .filter(team => team.name && team.name.startsWith('society_'))
      .map(team => (team.name as string).replace('society_', ''));

    return allSocieties.filter(s => userSlugs.includes(s.slug)).map(s => s.$id);
  }, [userTeams, allSocieties]);
}
