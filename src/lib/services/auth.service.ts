/**
 * Auth Service — Pure business logic for authentication.
 * 
 * This service contains the core auth logic, decoupled from Next.js
 * Server Actions. This makes it reusable for:
 * - Server Actions (current PWA)
 * - Future REST API Route Handlers
 * - Future native app backend
 * 
 * @module services/auth
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface SignupParams {
  email: string;
  password: string;
  fullName: string;
}

export interface ServiceResult<T = void> {
  success: boolean;
  error?: string;
  data?: T;
  message?: string;
}

/**
 * Authenticates a user with email and password.
 */
export async function loginUser(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<ServiceResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Registers a new user. Role is ALWAYS set to 'user'.
 * Admin accounts must be promoted manually via SQL.
 */
export async function signupUser(
  supabase: SupabaseClient,
  params: SignupParams
): Promise<ServiceResult> {
  const { error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        full_name: params.fullName,
        role: 'user', // HARDCODED — never trust client input for role
      },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, message: '¡Registro exitoso! Ya puedes iniciar sesión.' };
}

/**
 * Signs out the current user.
 */
export async function logoutUser(
  supabase: SupabaseClient
): Promise<ServiceResult> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
