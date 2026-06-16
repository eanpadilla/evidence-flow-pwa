'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function login(state: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, error: 'Correo y contraseña son requeridos.' };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Ocurrió un error inesperado.' };
  }
}

export async function signup(state: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;
  const role = formData.get('role') as string; // 'admin' or 'user'

  if (!email || !password || !fullName || !role) {
    return { success: false, error: 'Todos los campos son requeridos.' };
  }

  try {
    const supabase = await createClient();
    console.log('Attempting signup for:', email, 'with role:', role);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        },
      },
    });

    if (error) {
      console.error('Supabase signup error occurred:', error);
      return { success: false, error: error.message || JSON.stringify(error) };
    }

    console.log('Supabase signup success. Data:', data);
    return { success: true, message: '¡Registro exitoso! Ya puedes iniciar sesión.' };
  } catch (error: any) {
    console.error('Unexpected signup exception caught:', error);
    return { success: false, error: error.message || 'Ocurrió un error inesperado.' };
  }
}

export async function logout() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false };
  }
}
