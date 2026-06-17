/**
 * Evidence Service — Pure business logic for evidence management.
 * 
 * Handles file uploads to Supabase Storage and evidence record creation.
 * Decoupled from Next.js Server Actions for reusability.
 * 
 * @module services/evidence
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface UploadEvidenceParams {
  taskId: string;
  userId: string;
  title?: string;
  description?: string;
  files: Array<{
    buffer: Buffer;
    name: string;
    type: string;
    size: number;
  }>;
}

export interface EvidenceWithUrl {
  id: string;
  task_id: string;
  user_id: string;
  file_path: string;
  file_name: string;
  title: string | null;
  description: string | null;
  admin_feedback: string | null;
  submitted_at: string;
  fileUrl: string | null;
  profile?: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
}

export interface ServiceResult<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Uploads evidence files and creates database records.
 * After successful upload, updates the task status to 'submitted'.
 * 
 * RLS enforces that only the assigned user can insert evidence
 * for their own tasks.
 */
export async function uploadEvidenceService(
  supabase: SupabaseClient,
  params: UploadEvidenceParams
): Promise<ServiceResult> {
  const { taskId, userId, title, description, files } = params;

  if (!taskId || files.length === 0) {
    return { success: false, error: 'El ID de la tarea y al menos un archivo válido son requeridos.' };
  }

  const timestamp = Date.now();
  let hasErrors = false;

  for (const file of files) {
    if (file.size === 0) continue;

    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${userId}/${taskId}_${timestamp}_${sanitizedFileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('evidence')
      .upload(filePath, file.buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      hasErrors = true;
      continue;
    }

    // Insert evidence record
    const { error: dbError } = await supabase
      .from('evidence')
      .insert({
        task_id: taskId,
        user_id: userId,
        file_path: filePath,
        file_name: file.name,
        title: title || null,
        description: description || null,
      });

    if (dbError) {
      console.error('Database insert error:', dbError);
      // Cleanup the uploaded file on DB insert failure
      await supabase.storage.from('evidence').remove([filePath]);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    return { success: false, error: 'Algunos archivos no se pudieron subir. Por favor intenta de nuevo.' };
  }

  // Move task to 'submitted' status
  const { error: statusError } = await supabase
    .from('tasks')
    .update({ status: 'submitted' })
    .eq('id', taskId);

  if (statusError) {
    console.error('Task status update error:', statusError);
    // Non-fatal: evidence was uploaded successfully
  }

  return { success: true };
}

/**
 * Retrieves all evidence for a task with signed URLs.
 * RLS automatically filters based on the user's role.
 */
export async function getEvidenceForTaskService(
  supabase: SupabaseClient,
  taskId: string
): Promise<ServiceResult<EvidenceWithUrl[]>> {
  const { data: evidenceList, error } = await supabase
    .from('evidence')
    .select(`
      *,
      profile:profiles(id, email, full_name)
    `)
    .eq('task_id', taskId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Generate secure signed URLs (1 hour expiry)
  const evidenceWithUrls: EvidenceWithUrl[] = await Promise.all(
    (evidenceList || []).map(async (ev: Record<string, unknown>) => {
      const { data: signedData, error: signError } = await supabase.storage
        .from('evidence')
        .createSignedUrl(ev.file_path as string, 60 * 60);

      return {
        ...ev,
        fileUrl: signError ? null : signedData?.signedUrl ?? null,
      } as EvidenceWithUrl;
    })
  );

  return { success: true, data: evidenceWithUrls };
}
