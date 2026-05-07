import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useSession } from '../auth';

// RLS limita el SELECT al restaurante del user actual via membership.
async function fetchCurrentRestaurant() {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, owner_user_id, setup_completed, created_at')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function useCurrentRestaurant() {
  const { isAuthenticated, user } = useSession();
  return useQuery({
    queryKey: ['current-restaurant', user?.id || null],
    queryFn: fetchCurrentRestaurant,
    enabled: !!isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });
}

// Marca setup_completed=true. La RLS update_own permite al user del restaurante.
export async function markSetupCompleted(restaurantId) {
  const { error } = await supabase
    .from('restaurants')
    .update({ setup_completed: true })
    .eq('id', restaurantId);
  if (error) throw error;
}
