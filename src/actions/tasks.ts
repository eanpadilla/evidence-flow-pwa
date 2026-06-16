'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createTask(formData: FormData) {
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const assignedTo = formData.get('assignedTo') as string; // UUID of profile
  const dueDateStr = formData.get('dueDate') as string;

  if (!title) {
    return { success: false, error: 'El título de la tarea es requerido.' };
  }

  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'No autorizado. Por favor inicia sesión nuevamente.' };
    }

    const dueDate = dueDateStr ? new Date(dueDateStr).toISOString() : null;

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title,
        description,
        assigned_to: assignedTo || null,
        created_by: user.id,
        status: 'pending',
        due_date: dueDate,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard');
    return { success: true, task: data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error al crear la tarea.' };
  }
}

/**
 * Admin reviews a task: approve, reject, or request changes.
 * Business logic: only admins can call this (RLS enforces it).
 * The admin_feedback field stores the admin's comment.
 */
export async function reviewTask(
  taskId: string,
  decision: 'approved' | 'rejected' | 'changes_requested',
  feedback?: string,
  evidenceIds?: string[]
) {
  try {
    const supabase = await createClient();

    const updateData: Record<string, any> = {
      status: decision,
      admin_feedback: feedback || null,
    };

    const { error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId);

    if (error) {
      return { success: false, error: error.message };
    }

    if (evidenceIds && evidenceIds.length > 0) {
      const { error: evidenceError } = await supabase
        .from('evidence')
        .update({ admin_feedback: feedback || null })
        .in('id', evidenceIds);
        
      if (evidenceError) {
        console.error('Error updating evidence feedback:', evidenceError);
      }
    }

    revalidatePath('/dashboard');
    revalidatePath(`/tasks/${taskId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * User submits evidence -> task status moves to 'submitted'.
 * This is called indirectly from the evidence upload action.
 */
export async function updateTaskStatus(taskId: string, status: 'pending' | 'submitted' | 'approved' | 'rejected' | 'changes_requested') {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('tasks')
      .update({ status })
      .eq('id', taskId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard');
    revalidatePath(`/tasks/${taskId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
