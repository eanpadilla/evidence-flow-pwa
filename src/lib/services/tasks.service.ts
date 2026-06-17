/**
 * Tasks Service — Pure business logic for task management.
 * 
 * Decoupled from Next.js Server Actions for reusability.
 * RLS policies in the database enforce authorization;
 * this layer handles orchestration and validation.
 * 
 * @module services/tasks
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface CreateTaskParams {
  title: string;
  description?: string;
  assignedTo?: string;
  dueDate?: string;
  createdBy: string;
}

export interface ReviewTaskParams {
  taskId: string;
  decision: 'approved' | 'rejected' | 'changes_requested';
  feedback?: string;
  evidenceIds?: string[];
}

export interface ServiceResult<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}

const VALID_DECISIONS = ['approved', 'rejected', 'changes_requested'] as const;

/**
 * Creates a new task. Authorization is enforced by RLS (admin only).
 */
export async function createTaskService(
  supabase: SupabaseClient,
  params: CreateTaskParams
): Promise<ServiceResult<Record<string, unknown>>> {
  if (!params.title?.trim()) {
    return { success: false, error: 'El título de la tarea es requerido.' };
  }

  const dueDate = params.dueDate ? new Date(params.dueDate).toISOString() : null;

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: params.title,
      description: params.description || null,
      assigned_to: params.assignedTo || null,
      created_by: params.createdBy,
      status: 'pending',
      due_date: dueDate,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Admin reviews a task: approve, reject, or request changes.
 * 
 * Security layers:
 * 1. Runtime validation of decision value (defense in depth).
 * 2. RLS ensures only admins can update to non-submitted states.
 * 3. Feedback is persisted on both task and individual evidence records.
 */
export async function reviewTaskService(
  supabase: SupabaseClient,
  params: ReviewTaskParams
): Promise<ServiceResult> {
  // Runtime validation — defense in depth beyond TypeScript
  if (!VALID_DECISIONS.includes(params.decision)) {
    return { success: false, error: 'Decisión de revisión inválida.' };
  }

  if (!params.taskId) {
    return { success: false, error: 'ID de tarea requerido.' };
  }

  // Update task status and feedback
  const { error } = await supabase
    .from('tasks')
    .update({
      status: params.decision,
      admin_feedback: params.feedback || null,
    })
    .eq('id', params.taskId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Store feedback on individual evidence records for historical tracking
  if (params.evidenceIds && params.evidenceIds.length > 0) {
    const { error: evidenceError } = await supabase
      .from('evidence')
      .update({ admin_feedback: params.feedback || null })
      .in('id', params.evidenceIds);

    if (evidenceError) {
      console.error('Error updating evidence feedback:', evidenceError);
      // Non-fatal: task status was updated successfully
    }
  }

  return { success: true };
}
