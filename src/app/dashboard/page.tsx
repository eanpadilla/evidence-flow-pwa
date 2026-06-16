import { redirect } from 'next/navigation';
import { getCurrentUserProfile, fetchTasks, fetchProfiles } from '@/lib/supabase/queries';
import { Navbar } from '@/components/layout';
import DashboardClient from './DashboardClient';
import styles from './dashboard.module.css';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUserProfile();

  if (!user) {
    redirect('/login');
  }

  // Fetch tasks
  const tasks = await fetchTasks();

  // Fetch all profiles for task assignments (if user is admin)
  let profiles: any[] = [];
  if (user.role === 'admin') {
    profiles = await fetchProfiles();
  }

  return (
    <div className={styles.wrapper}>
      <Navbar userProfile={user} />
      <DashboardClient
        tasks={tasks as any}
        profiles={profiles}
        userProfile={user}
      />
    </div>
  );
}
