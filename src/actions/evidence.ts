'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { uploadEvidenceService, getEvidenceForTaskService } from '@/lib/services';

/**
 * Server Action: Upload Evidence
 * Thin wrapper — handles FormData/File conversion, delegates to service.
 */
export async function uploadEvidence(formData: FormData) {
  const taskId = formData.get('taskId') as string;
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const rawFiles = formData.getAll('files') as File[];

  if (!taskId || !rawFiles || rawFiles.length === 0) {
    return { success: false, error: 'El ID de la tarea y al menos un archivo válido son requeridos.' };
  }

  try {
    const supabase = await createClient();

    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'No autorizado. Por favor inicia sesión nuevamente.' };
    }

    // Convert Web API Files to buffers for the service layer
    const files = await Promise.all(
      rawFiles
        .filter(f => f.size > 0)
        .map(async (f) => ({
          buffer: Buffer.from(await f.arrayBuffer()),
          name: f.name,
          type: f.type,
          size: f.size,
        }))
    );

    const result = await uploadEvidenceService(supabase, {
      taskId,
      userId: user.id,
      title,
      description,
      files,
    });

    if (result.success) {
      revalidatePath('/dashboard');
      revalidatePath(`/tasks/${taskId}`);
    }

    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
    return { success: false, error: message };
  }
}

/**
 * Server Action: Get Evidence for Task
 * Returns evidence list with signed URLs.
 */
export async function getEvidenceForTask(taskId: string) {
  try {
    const supabase = await createClient();
    const result = await getEvidenceForTaskService(supabase, taskId);

    return {
      success: result.success,
      error: result.error,
      evidence: result.data || [],
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Fallo al obtener la evidencia.';
    return { success: false, error: message, evidence: [] };
  }
}
