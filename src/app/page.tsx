import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/queries';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getCurrentUserProfile();

  if (user) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
