'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function uploadEvidence(formData: FormData) {
  const taskId = formData.get('taskId') as string;
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const files = formData.getAll('files') as File[];

  if (!taskId || !files || files.length === 0) {
    return { success: false, error: 'El ID de la tarea y al menos un archivo válido son requeridos.' };
  }

  try {
    const supabase = await createClient();

    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'No autorizado. Por favor inicia sesión nuevamente.' };
    }

    const timestamp = Date.now();
    let hasErrors = false;
    const uploadedRecords = [];

    // Process all files
    for (const file of files) {
      if (file.size === 0) continue;

      // Convert file to buffer for upload
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Sanitize file name to avoid path issues
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      // Storage path format: user_id/task_id_timestamp_filename
      const filePath = `${user.id}/${taskId}_${timestamp}_${sanitizedFileName}`;

      // 1. Upload to Supabase Storage (private bucket)
      const { error: uploadError } = await supabase.storage
        .from('evidence')
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        hasErrors = true;
        continue;
      }

      // 2. Insert record in Evidence table
      const { error: dbError } = await supabase
        .from('evidence')
        .insert({
          task_id: taskId,
          user_id: user.id,
          file_path: filePath,
          file_name: file.name,
          title: title || null,
          description: description || null,
        });

      if (dbError) {
        console.error('Database insert error:', dbError);
        // Clean up uploaded file on DB insert failure
        await supabase.storage.from('evidence').remove([filePath]);
        hasErrors = true;
      }
    }

    if (hasErrors) {
      return { success: false, error: 'Algunos archivos no se pudieron subir. Por favor intenta de nuevo.' };
    }

    // 3. Update task status to 'submitted'
    const { error: statusError } = await supabase
      .from('tasks')
      .update({ status: 'submitted' })
      .eq('id', taskId);

    if (statusError) {
      console.error('Task status update error:', statusError);
    }

    revalidatePath('/dashboard');
    revalidatePath(`/tasks/${taskId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Unexpected evidence upload error:', error);
    return { success: false, error: error.message || 'Ocurrió un error inesperado.' };
  }
}

export async function getEvidenceForTask(taskId: string) {
  try {
    const supabase = await createClient();

    const { data: evidenceList, error } = await supabase
      .from('evidence')
      .select(`
        *,
        profile:profiles(id, email, full_name)
      `)
      .eq('task_id', taskId);

    if (error) {
      console.error('Error fetching evidence list:', error);
      return { success: false, error: error.message };
    }

    // Generate secure signed URLs for each evidence file
    const evidenceWithUrls = await Promise.all(
      evidenceList.map(async (ev) => {
        const { data: signedData, error: signError } = await supabase.storage
          .from('evidence')
          .createSignedUrl(ev.file_path, 60 * 60); // 1 hour expiry

        return {
          ...ev,
          fileUrl: signError ? null : signedData?.signedUrl,
        };
      })
    );

    return { success: true, evidence: evidenceWithUrls };
  } catch (error: any) {
    return { success: false, error: error.message || 'Fallo al obtener la evidencia.' };
  }
}
