'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, User, CheckCircle2, AlertCircle, Clock, ArrowRight, RefreshCw, Loader2 } from 'lucide-react';
import { Button, Card, Input, Modal } from '@/components/ui';
import { createTask } from '@/actions/tasks';
import styles from './dashboard.module.css';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'user';
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  created_by: string | null;
  status: 'pending' | 'submitted' | 'approved' | 'rejected' | 'changes_requested';
  due_date: string | null;
  created_at: string;
  assigned_profile?: Profile | null;
  creator_profile?: Profile | null;
}

interface DashboardClientProps {
  tasks: Task[];
  profiles: Profile[];
  userProfile: Profile;
}

export default function DashboardClient({ tasks: initialTasks, profiles, userProfile }: DashboardClientProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);

  const isAdmin = userProfile.role === 'admin';

  // Stats calculation
  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const submittedTasks = tasks.filter(t => t.status === 'submitted').length;
  const approvedTasks = tasks.filter(t => t.status === 'approved').length;
  const changesTasks = tasks.filter(t => t.status === 'changes_requested').length;
  const rejectedTasks = tasks.filter(t => t.status === 'rejected').length;

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (filterStatus === 'all') return true;
    return task.status === filterStatus;
  });

  const handleCreateTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await createTask(formData);
      if (res.success && res.task) {
        // Find assigned profile details to append to state
        const assignedId = formData.get('assignedTo') as string;
        const assignedProfile = profiles.find(p => p.id === assignedId) || null;
        
        const newTask: Task = {
          ...(res.task as unknown as Task),
          assigned_profile: assignedProfile,
          creator_profile: userProfile,
        };

        setTasks([newTask, ...tasks]);
        setIsModalOpen(false);
      } else {
        setFormError(res.error || 'Error al crear la tarea.');
      }
    });
  };

  const getStatusBadge = (status: Task['status']) => {
    switch (status) {
      case 'approved':
        return <span className={`${styles.badge} ${styles.badgeApproved}`}><CheckCircle2 size={12} /> Aprobado</span>;
      case 'rejected':
        return <span className={`${styles.badge} ${styles.badgeRejected}`}><AlertCircle size={12} /> Rechazado</span>;
      case 'submitted':
        return <span className={`${styles.badge} ${styles.badgeSubmitted}`}><Clock size={12} /> En Revisión</span>;
      case 'changes_requested':
        return <span className={`${styles.badge} ${styles.badgeChanges}`}><RefreshCw size={12} /> Cambios</span>;
      default:
        return <span className={`${styles.badge} ${styles.badgePending}`}><Clock size={12} /> Pendiente</span>;
    }
  };

  const handleTaskClick = (e: React.MouseEvent, taskId: string) => {
    e.preventDefault();
    setLoadingTaskId(taskId);
    router.push(`/tasks/${taskId}`);
  };

  return (
    <div className={styles.mainContent}>
      <div className="container animate-fade-in">
        {/* Header */}
        <div className={styles.headerSection}>
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>Panel de Trabajo</h1>
            <p className={styles.subtitle}>
              {isAdmin 
                ? 'Administra las tareas y revisa las evidencias subidas.' 
                : 'Mira las tareas asignadas y sube la evidencia de finalización.'}
            </p>
          </div>

          {isAdmin && (
            <Button onClick={() => setIsModalOpen(true)} icon={<Plus size={18} />}>
              Nueva Tarea
            </Button>
          )}
        </div>

        {/* Stats Row */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Tareas Totales</span>
            <span className={styles.statValue}>{totalTasks}</span>
          </div>
          {pendingTasks > 0 && (
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Pendientes</span>
              <span className={styles.statValue}>{pendingTasks}</span>
            </div>
          )}
          {submittedTasks > 0 && (
            <div className={styles.statCard}>
              <span className={styles.statLabel}>En Revisión</span>
              <span className={styles.statValue}>{submittedTasks}</span>
            </div>
          )}
          {changesTasks > 0 && (
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Cambios Solicitados</span>
              <span className={styles.statValue}>{changesTasks}</span>
            </div>
          )}
          {approvedTasks > 0 && (
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Aprobadas</span>
              <span className={styles.statValue}>{approvedTasks}</span>
            </div>
          )}
          {rejectedTasks > 0 && (
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Rechazadas</span>
              <span className={styles.statValue}>{rejectedTasks}</span>
            </div>
          )}
        </div>

        {/* Tabs / Filters */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px' }}>
          {['all', 'pending', 'submitted', 'changes_requested', 'approved', 'rejected'].map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? 'primary' : 'secondary'}
              onClick={() => setFilterStatus(status)}
              style={{ textTransform: 'capitalize', padding: '6px 16px', fontSize: '0.85rem' }}
            >
              {status === 'all' ? 'Todas' : status === 'pending' ? 'Pendientes' : status === 'submitted' ? 'En Revisión' : status === 'changes_requested' ? 'Cambios' : status === 'approved' ? 'Aprobadas' : 'Rechazadas'}
            </Button>
          ))}
        </div>

        {/* Tasks List */}
        <div className={styles.tasksGrid}>
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <a 
                href={`/tasks/${task.id}`} 
                key={task.id} 
                style={{ textDecoration: 'none' }}
                onClick={(e) => handleTaskClick(e, task.id)}
              >
                <Card
                  hoverable
                  title={task.title}
                  headerAction={getStatusBadge(task.status)}
                  footer={
                    <div className={styles.cardMetadata}>
                      {isAdmin && (
                        <div className={styles.metaItem}>
                          <User size={14} />
                          <span className={styles.metaLabel}>Asignado a:</span>
                          <span>{task.assigned_profile?.full_name || 'Sin Asignar'}</span>
                        </div>
                      )}
                      <div className={styles.metaItem}>
                        <Calendar size={14} />
                        <span className={styles.metaLabel}>Vencimiento:</span>
                        <span>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Sin fecha'}</span>
                      </div>
                    </div>
                  }
                  style={{ height: '100%', minHeight: '200px', position: 'relative' }}
                >
                  <p className={styles.taskDesc}>{task.description || 'Sin descripción.'}</p>
                  
                  {/* Loading Overlay */}
                  {loadingTaskId === task.id && (
                    <div style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: 'rgba(9, 9, 11, 0.7)',
                      backdropFilter: 'blur(4px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10,
                      borderRadius: 'var(--radius-lg)'
                    }}>
                      <Loader2 className="animate-spin" size={32} color="var(--primary)" />
                    </div>
                  )}
                </Card>
              </a>
            ))
          ) : (
            <div className={styles.noTasks}>
              <CheckCircle2 size={48} style={{ color: 'var(--text-muted)' }} />
              <h3>No hay tareas</h3>
              <p>No se encontraron tareas con el estado seleccionado.</p>
            </div>
          )}
        </div>
      </div>

      {/* Admin Task Creation Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Nueva Tarea">
        {formError && <div style={{ color: 'var(--error)', backgroundColor: 'var(--error-bg)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', border: '1px solid var(--error-border)' }}>{formError}</div>}
        
        <form className={styles.form} onSubmit={handleCreateTask}>
          <Input
            label="Título de Tarea"
            name="title"
            placeholder="Implementar base de datos..."
            required
            disabled={isPending}
          />

          <div className={styles.formGroup}>
            <label className={styles.label}>Descripción</label>
            <textarea
              name="description"
              className={styles.textarea}
              placeholder="Escribe las instrucciones de la tarea..."
              disabled={isPending}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Asignar A</label>
            <select name="assignedTo" className={styles.select} disabled={isPending}>
              <option value="">-- Sin Asignar --</option>
              {profiles
                .filter((p) => p.role === 'user')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.email})
                  </option>
                ))}
            </select>
          </div>

          <Input
            label="Fecha de Vencimiento"
            type="date"
            name="dueDate"
            disabled={isPending}
          />

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} style={{ flex: 1 }} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" style={{ flex: 1 }} isLoading={isPending}>
              Crear Tarea
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
