import { createClient } from '@/lib/supabase/server';

/**
 * Fetches the current authenticated user's profile.
 * Use this in Server Components for data fetching.
 * For mutations from the client, use server actions in @/actions/auth.
 */
export async function getCurrentUserProfile() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    const { data: profile, error: dbError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (dbError) {
      console.error('Error fetching profile:', dbError);
      return null;
    }

    return profile;
  } catch (error) {
    console.error('getCurrentUserProfile error:', error);
    return null;
  }
}

/**
 * Fetches all tasks visible to the current user.
 * RLS policies in Supabase handle the filtering.
 */
export async function fetchTasks() {
  try {
    const supabase = await createClient();

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned_profile:profiles!tasks_assigned_to_fkey (id, email, full_name, role),
        creator_profile:profiles!tasks_created_by_fkey (id, email, full_name, role)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting tasks:', error);
      return [];
    }

    return tasks || [];
  } catch (error) {
    console.error('fetchTasks error:', error);
    return [];
  }
}

/**
 * Fetches all profiles (for admin task assignment).
 */
export async function fetchProfiles() {
  try {
    const supabase = await createClient();
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Error fetching profiles:', error);
      return [];
    }

    return profiles || [];
  } catch (error) {
    console.error('fetchProfiles error:', error);
    return [];
  }
}

/**
 * Fetches a single task with evidence for the detail page.
 */
export async function fetchTaskWithEvidence(taskId: string) {
  try {
    const supabase = await createClient();

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned_profile:profiles!tasks_assigned_to_fkey (id, email, full_name, role),
        creator_profile:profiles!tasks_created_by_fkey (id, email, full_name, role)
      `)
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return { task: null, evidence: [] };
    }

    const { data: evidenceList, error: evidenceError } = await supabase
      .from('evidence')
      .select(`
        *,
        profile:profiles(id, email, full_name)
      `)
      .eq('task_id', taskId);

    let evidence: any[] = [];
    if (!evidenceError && evidenceList) {
      evidence = await Promise.all(
        evidenceList.map(async (ev: any) => {
          const { data: signedData, error: signError } = await supabase.storage
            .from('evidence')
            .createSignedUrl(ev.file_path, 60 * 60);

          return {
            ...ev,
            fileUrl: signError ? null : signedData?.signedUrl,
          };
        })
      );
    }

    return { task, evidence };
  } catch (error) {
    console.error('fetchTaskWithEvidence error:', error);
    return { task: null, evidence: [] };
  }
}
