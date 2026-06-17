'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, User, CheckCircle2, AlertCircle, Clock, ArrowRight, RefreshCw, Loader2 } from 'lucide-react';
import { Button, Card, Input, Modal, Pagination } from '@/components/ui';
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
  priority: 'low' | 'medium' | 'high';
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
  const [filterUser, setFilterUser] = useState<string>('all');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

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
    if (filterStatus !== 'all' && task.status !== filterStatus) return false;
    if (filterUser !== 'all' && task.assigned_to !== filterUser) return false;
    return true;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const paginatedTasks = filteredTasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
        setCurrentPage(1); // Go back to first page to see the new task
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

  const getPriorityBadge = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return <span className={styles.badge} style={{ backgroundColor: 'var(--error-bg)', color: 'var(--error)', borderColor: 'var(--error-border)' }}>Alta</span>;
      case 'low':
        return <span className={styles.badge} style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)', borderColor: 'var(--success-border)' }}>Baja</span>;
      case 'medium':
      default:
        return <span className={styles.badge} style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)', borderColor: 'var(--warning-border)' }}>Media</span>;
    }
  };

  const getTimeRemaining = (dueDateStr: string | null) => {
    if (!dueDateStr) return null;
    
    // Parse YYYY-MM-DD directly as local time to avoid UTC-offset shifting it to yesterday
    const [year, month, day] = dueDateStr.split('T')[0].split('-').map(Number);
    const due = new Date(year, month - 1, day);
    const today = new Date();
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return <span style={{ color: 'var(--error)', fontWeight: 600 }}>Vencida hace {Math.abs(diffDays)} {Math.abs(diffDays) === 1 ? 'día' : 'días'}</span>;
    } else if (diffDays === 0) {
      return <span style={{ color: 'var(--warning)', fontWeight: 600 }}>Vence hoy</span>;
    } else if (diffDays === 1) {
      return <span style={{ color: 'var(--warning)', fontWeight: 600 }}>Vence mañana</span>;
    } else {
      return <span style={{ color: 'var(--success)', fontWeight: 500 }}>Faltan {diffDays} días</span>;
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
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', paddingBottom: '8px', alignItems: 'center' }}>
          {isAdmin && (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <Button
                variant={filterUser === 'all' ? 'secondary' : 'primary'}
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                style={{ textTransform: 'none', padding: '6px 16px', fontSize: '0.85rem', borderRadius: '9999px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={14} />
                  {filterUser === 'all' ? 'Todos los Usuarios' : profiles.find(p => p.id === filterUser)?.email || 'Usuario'}
                </div>
              </Button>

              {isUserDropdownOpen && (
                <>
                  {/* Invisible overlay to close dropdown when clicking outside */}
                  <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}
                    onClick={() => setIsUserDropdownOpen(false)}
                  />
                  
                  {/* Dropdown Menu styled like a task card */}
                  <div 
                    className={styles.taskCard} 
                    style={{ 
                      position: 'absolute', 
                      top: 'calc(100% + 8px)', 
                      left: 0, 
                      zIndex: 50, 
                      width: 'max-content',
                      padding: '8px',
                      backgroundColor: 'var(--bg-secondary)',
                      boxShadow: 'var(--shadow-lg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)'
                    }}
                  >
                    <div 
                      onClick={() => { setFilterUser('all'); setCurrentPage(1); setIsUserDropdownOpen(false); }}
                      style={{ 
                        padding: '10px 16px', 
                        cursor: 'pointer', 
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: filterUser === 'all' ? 'var(--bg-tertiary)' : 'transparent',
                        color: filterUser === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontSize: '0.85rem',
                        fontWeight: filterUser === 'all' ? 600 : 400,
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = filterUser === 'all' ? 'var(--bg-tertiary)' : 'transparent'}
                    >
                      Todos los Usuarios
                    </div>
                    {profiles
                      .filter((p) => p.role === 'user')
                      .map((p) => (
                        <div
                          key={p.id}
                          onClick={() => { setFilterUser(p.id); setCurrentPage(1); setIsUserDropdownOpen(false); }}
                          style={{ 
                            padding: '10px 16px', 
                            cursor: 'pointer', 
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: filterUser === p.id ? 'var(--bg-tertiary)' : 'transparent',
                            color: filterUser === p.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontSize: '0.85rem',
                            fontWeight: filterUser === p.id ? 600 : 400,
                            transition: 'background-color 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = filterUser === p.id ? 'var(--bg-tertiary)' : 'transparent'}
                        >
                          {p.email}
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          )}
          
          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)', margin: '0 4px', flexShrink: 0 }}></div>

          {['all', 'pending', 'submitted', 'changes_requested', 'approved', 'rejected'].map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? 'primary' : 'secondary'}
              onClick={() => {
                setFilterStatus(status);
                setCurrentPage(1);
              }}
              style={{ textTransform: 'capitalize', padding: '6px 16px', fontSize: '0.85rem', flexShrink: 0 }}
            >
              {status === 'all' ? 'Todas' : status === 'pending' ? 'Pendientes' : status === 'submitted' ? 'En Revisión' : status === 'changes_requested' ? 'Cambios' : status === 'approved' ? 'Aprobadas' : 'Rechazadas'}
            </Button>
          ))}
        </div>

        {/* Tasks List */}
        <div className={styles.tasksGrid}>
          {paginatedTasks.length > 0 ? (
            paginatedTasks.map((task) => (
              <a 
                href={`/tasks/${task.id}`} 
                key={task.id} 
                style={{ textDecoration: 'none' }}
                onClick={(e) => handleTaskClick(e, task.id)}
              >
                <Card
                  hoverable
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {task.title}
                      {getPriorityBadge(task.priority)}
                    </div>
                  }
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
                      {task.due_date && task.status !== 'approved' && (
                        <div className={styles.metaItem} style={{ marginTop: '4px' }}>
                          <Clock size={14} color="var(--text-muted)" />
                          {getTimeRemaining(task.due_date)}
                        </div>
                      )}
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

        {/* Pagination */}
        {filteredTasks.length > itemsPerPage && (
          <div style={{ marginTop: '32px' }}>
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => {
                setCurrentPage(page);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}
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
            <select name="assignedTo" className={styles.select} disabled={isPending} required defaultValue="">
              <option value="" disabled>-- Selecciona un Usuario --</option>
              {profiles
                .filter((p) => p.role === 'user')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.email}
                  </option>
                ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Prioridad</label>
            <select name="priority" className={styles.select} disabled={isPending} defaultValue="medium">
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>

          <Input
            label="Fecha de Vencimiento"
            type="date"
            name="dueDate"
            min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}
            required
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
