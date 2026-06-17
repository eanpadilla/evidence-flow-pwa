'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { createTaskService, reviewTaskService } from '@/lib/services';

/**
 * Server Action: Create Task
 * Thin wrapper — extracts FormData, delegates to service, revalidates cache.
 */
export async function createTask(formData: FormData) {
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const assignedTo = formData.get('assignedTo') as string;
  const dueDateStr = formData.get('dueDate') as string;
  const priority = formData.get('priority') as 'low' | 'medium' | 'high' | undefined;

  if (!title) {
    return { success: false, error: 'El título de la tarea es requerido.' };
  }

  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'No autorizado. Por favor inicia sesión nuevamente.' };
    }

    const result = await createTaskService(supabase, {
      title,
      description,
      assignedTo,
      dueDate: dueDateStr,
      priority,
      createdBy: user.id,
    });

    if (result.success) {
      revalidatePath('/dashboard');
    }

    return { success: result.success, error: result.error, task: result.data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al crear la tarea.';
    return { success: false, error: message };
  }
}

/**
 * Server Action: Review Task (Admin only)
 * Validates decision, delegates to service, revalidates affected paths.
 */
export async function reviewTask(
  taskId: string,
  decision: 'approved' | 'rejected' | 'changes_requested',
  feedback?: string,
  evidenceIds?: string[]
) {
  try {
    const supabase = await createClient();
    const result = await reviewTaskService(supabase, {
      taskId,
      decision,
      feedback,
      evidenceIds,
    });

    if (result.success) {
      revalidatePath('/dashboard');
      revalidatePath(`/tasks/${taskId}`);
    }

    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al actualizar la tarea.';
    return { success: false, error: message };
  }
}
