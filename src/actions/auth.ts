'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { loginUser, signupUser, logoutUser } from '@/lib/services';

/**
 * Server Action: Login
 * Thin wrapper over auth.service — handles FormData extraction and cache revalidation.
 */
export async function login(_state: unknown, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, error: 'Correo y contraseña son requeridos.' };
  }

  try {
    const supabase = await createClient();
    const result = await loginUser(supabase, email, password);

    if (result.success) {
      revalidatePath('/', 'layout');
    }

    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
    return { success: false, error: message };
  }
}

/**
 * Server Action: Signup
 * Always registers as 'user' role. Admin promotion is manual only.
 */
export async function signup(_state: unknown, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;

  if (!email || !password || !fullName) {
    return { success: false, error: 'Todos los campos son requeridos.' };
  }

  try {
    const supabase = await createClient();
    return await signupUser(supabase, { email, password, fullName });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
    return { success: false, error: message };
  }
}

/**
 * Server Action: Logout
 */
export async function logout() {
  try {
    const supabase = await createClient();
    const result = await logoutUser(supabase);

    if (result.success) {
      revalidatePath('/', 'layout');
    }

    return result;
  } catch {
    return { success: false };
  }
}
