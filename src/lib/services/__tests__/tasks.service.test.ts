import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reviewTaskService } from '../tasks.service';
import { SupabaseClient } from '@supabase/supabase-js';

// Mocks the chainable Supabase query builder
const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();

const mockFrom = vi.fn(() => ({
  update: mockUpdate,
  insert: mockInsert,
}));

const mockSupabase = {
  from: mockFrom
} as unknown as SupabaseClient;

describe('Tasks Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default chain behavior
    mockUpdate.mockReturnValue({ eq: mockEq, in: mockIn });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockSingle.mockResolvedValue({ data: { id: 'new-task' }, error: null });
    
    mockEq.mockResolvedValue({ error: null });
    mockIn.mockResolvedValue({ error: null });
  });

  describe('reviewTaskService', () => {
    it('debe rechazar decisiones inválidas inmediatamente sin llamar a BD', async () => {
      // @ts-ignore - Forzamos un tipo inválido como lo haría un hacker en JS
      const result = await reviewTaskService(mockSupabase, {
        taskId: '123',
        decision: 'hacked_status'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Decisión de revisión inválida.');
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('debe rechazar si falta el ID de tarea', async () => {
      const result = await reviewTaskService(mockSupabase, {
        taskId: '',
        decision: 'approved'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('ID de tarea requerido.');
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('debe actualizar el estado y el feedback correctamente', async () => {
      const result = await reviewTaskService(mockSupabase, {
        taskId: 'task-123',
        decision: 'rejected',
        feedback: 'No cumple los requisitos'
      });

      // Assert Supabase calls
      expect(mockFrom).toHaveBeenCalledWith('tasks');
      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'rejected',
        admin_feedback: 'No cumple los requisitos'
      });
      expect(mockEq).toHaveBeenCalledWith('id', 'task-123');
      
      expect(result.success).toBe(true);
    });

    it('debe actualizar el feedback de las evidencias si se proveen IDs', async () => {
      const result = await reviewTaskService(mockSupabase, {
        taskId: 'task-123',
        decision: 'changes_requested',
        feedback: 'Corregir esta imagen',
        evidenceIds: ['ev-1', 'ev-2']
      });

      // Se debe haber llamado a "from" dos veces (una para tasks, otra para evidence)
      expect(mockFrom).toHaveBeenCalledTimes(2);
      expect(mockFrom).toHaveBeenNthCalledWith(2, 'evidence');
      
      // La llamada a evidence.update
      expect(mockUpdate).toHaveBeenCalledWith({
        admin_feedback: 'Corregir esta imagen'
      });
      
      expect(result.success).toBe(true);
    });
  describe('createTaskService', () => {
    it('debe crear una tarea con prioridad medium por defecto', async () => {
      const { createTaskService } = await import('../tasks.service');
      const result = await createTaskService(mockSupabase, {
        title: 'Nueva Tarea',
        assignedTo: 'user-2',
        dueDate: new Date().toISOString().split('T')[0], // valid date
        createdBy: 'user-1'
      });

      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Nueva Tarea',
        priority: 'medium'
      }));
    });

    it('debe rechazar prioridades inválidas', async () => {
      const { createTaskService } = await import('../tasks.service');
      const result = await createTaskService(mockSupabase, {
        title: 'Nueva Tarea',
        assignedTo: 'user-2',
        createdBy: 'user-1',
        dueDate: new Date().toISOString().split('T')[0], // valid date
        // @ts-ignore
        priority: 'ultra-high'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Prioridad inválida.');
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('debe rechazar fechas de vencimiento en el pasado', async () => {
      const { createTaskService } = await import('../tasks.service');
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const result = await createTaskService(mockSupabase, {
        title: 'Nueva Tarea',
        assignedTo: 'user-2',
        createdBy: 'user-1',
        dueDate: yesterday.toISOString().split('T')[0] // Formato YYYY-MM-DD
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('La fecha de vencimiento no puede estar en el pasado.');
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('debe rechazar si falta la fecha de vencimiento', async () => {
      const { createTaskService } = await import('../tasks.service');
      
      const result = await createTaskService(mockSupabase, {
        title: 'Nueva Tarea',
        assignedTo: 'user-2',
        createdBy: 'user-1',
        // @ts-ignore (provocamos el error de falta de fecha)
        dueDate: undefined
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('La fecha de vencimiento es requerida.');
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('debe rechazar si falta la asignación de usuario', async () => {
      const { createTaskService } = await import('../tasks.service');
      
      const result = await createTaskService(mockSupabase, {
        title: 'Nueva Tarea',
        // @ts-ignore
        assignedTo: undefined,
        createdBy: 'user-1',
        dueDate: new Date().toISOString().split('T')[0]
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Debe asignar la tarea a un usuario.');
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });
});
