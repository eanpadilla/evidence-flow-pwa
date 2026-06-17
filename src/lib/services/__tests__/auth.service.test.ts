import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loginUser, signupUser, logoutUser } from '../auth.service';
import { SupabaseClient } from '@supabase/supabase-js';

// Mock del cliente de Supabase
const mockSupabase = {
  auth: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }
} as unknown as SupabaseClient;

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loginUser', () => {
    it('debe retornar éxito cuando las credenciales son correctas', async () => {
      // Setup mock
      (mockSupabase.auth.signInWithPassword as any).mockResolvedValue({ error: null });

      // Action
      const result = await loginUser(mockSupabase, 'prueba@prueba.com', 'prueba123');

      // Assert
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'prueba@prueba.com',
        password: 'prueba123'
      });
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('debe retornar error cuando las credenciales son incorrectas', async () => {
      // Setup mock
      (mockSupabase.auth.signInWithPassword as any).mockResolvedValue({
        error: { message: 'Invalid login credentials' }
      });

      // Action
      const result = await loginUser(mockSupabase, 'prueba@prueba.com', 'prueba123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid login credentials');
    });
  });

  describe('signupUser', () => {
    it('debe registrar un usuario y FORZAR el role="user"', async () => {
      // Setup mock
      (mockSupabase.auth.signUp as any).mockResolvedValue({ error: null });

      // Action
      const result = await signupUser(mockSupabase, {
        email: 'new@test.com',
        password: 'password123',
        fullName: 'New User'
      });

      // Assert
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new@test.com',
        password: 'password123',
        options: {
          data: {
            full_name: 'New User',
            role: 'user' // CRÍTICO: Aseguramos que siempre sea user
          }
        }
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe('¡Registro exitoso! Ya puedes iniciar sesión.');
    });

    it('debe retornar error si el registro falla', async () => {
      // Setup mock
      (mockSupabase.auth.signUp as any).mockResolvedValue({
        error: { message: 'User already exists' }
      });

      // Action
      const result = await signupUser(mockSupabase, {
        email: 'existing@test.com',
        password: '123',
        fullName: 'User'
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('User already exists');
    });
  });

  describe('logoutUser', () => {
    it('debe cerrar sesión correctamente', async () => {
      (mockSupabase.auth.signOut as any).mockResolvedValue({ error: null });
      const result = await logoutUser(mockSupabase);
      expect(result.success).toBe(true);
    });
  });
});
