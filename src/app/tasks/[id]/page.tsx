import { notFound, redirect } from 'next/navigation';
import { getCurrentUserProfile, fetchTaskWithEvidence } from '@/lib/supabase/queries';
import { Navbar } from '@/components/layout';
import TaskDetailClient from './TaskDetailClient';
import styles from './task-detail.module.css';

export const dynamic = 'force-dynamic';

interface TaskDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { id } = await params;
  const user = await getCurrentUserProfile();

  if (!user) {
    redirect('/login');
  }

  const { task, evidence } = await fetchTaskWithEvidence(id);

  if (!task) {
    notFound();
  }

  // Authorize: Only admins or the assigned user can access the task details
  const isAdmin = user.role === 'admin';
  const isAssigned = task.assigned_to === user.id;

  if (!isAdmin && !isAssigned) {
    redirect('/dashboard');
  }

  return (
    <div className={styles.wrapper}>
      <Navbar userProfile={user} />
      <TaskDetailClient
        task={task as any}
        evidenceList={evidence as any}
        userProfile={user}
      />
    </div>
  );
}
