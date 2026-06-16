'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Check,
  X,
  MessageSquare,
  RefreshCw,
  Send
} from 'lucide-react';
import { Button, FileUpload } from '@/components/ui';
import { Pagination } from '@/components/ui/Pagination';
import { uploadEvidence } from '@/actions/evidence';
import { reviewTask } from '@/actions/tasks';
import styles from './task-detail.module.css';

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
  admin_feedback: string | null;
  due_date: string | null;
  created_at: string;
  assigned_profile?: Profile | null;
  creator_profile?: Profile | null;
}

interface Evidence {
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

interface TaskDetailClientProps {
  task: Task;
  evidenceList: Evidence[];
  userProfile: Profile;
}

/**
 * Formats a date string in a consistent way that avoids hydration mismatches.
 * Uses explicit locale and options to ensure server and client produce the same output.
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }) + ' ' + date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function TaskDetailClient({ task: initialTask, evidenceList: initialEvidence, userProfile }: TaskDetailClientProps) {
  const router = useRouter();
  const [task, setTask] = useState<Task>(initialTask);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>(initialEvidence);
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [adminFeedback, setAdminFeedback] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const isAdmin = userProfile.role === 'admin';
  const isAssigned = task.assigned_to === userProfile.id;

  // Auto scroll to top when messages appear
  React.useEffect(() => {
    if (error || successMsg) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [error, successMsg]);

  // Can the user upload evidence? Only when task is pending, rejected, or changes_requested
  const canUpload = !isAdmin && isAssigned && ['pending', 'rejected', 'changes_requested'].includes(task.status);

  const handleUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (files.length === 0) {
      setError('Por favor selecciona al menos un archivo.');
      return;
    }

    const formData = new FormData();
    formData.append('taskId', task.id);
    formData.append('title', title);
    formData.append('description', description);
    
    files.forEach(f => {
      formData.append('files', f);
    });

    startTransition(async () => {
      const res = await uploadEvidence(formData);
      if (res.success) {
        setFiles([]);
        setTitle('');
        setDescription('');
        setSuccessMsg('¡Evidencia subida con éxito! Tarea enviada a revisión.');
        setTask((prev) => ({ ...prev, status: 'submitted', admin_feedback: null }));
        router.refresh();
      } else {
        setError(res.error || 'Error al subir la evidencia.');
      }
    });
  };

  const handleReview = (decision: 'approved' | 'rejected' | 'changes_requested', evidenceIds?: string[]) => {
    setError(null);
    setSuccessMsg(null);

    if ((decision === 'rejected' || decision === 'changes_requested') && !adminFeedback.trim()) {
      setError('Por favor provee comentarios (feedback) explicando tu decisión.');
      return;
    }

    startTransition(async () => {
      const res = await reviewTask(task.id, decision, adminFeedback.trim() || undefined, evidenceIds);
      if (res.success) {
        setTask((prev) => ({
          ...prev,
          status: decision,
          admin_feedback: adminFeedback.trim() || null,
        }));
        setAdminFeedback('');
        const labels = { approved: 'aprobada', rejected: 'rechazada', changes_requested: 'devuelta para cambios' };
        setSuccessMsg(`La tarea ha sido ${labels[decision]}.`);
        router.refresh();
      } else {
        setError(res.error || 'Error al actualizar la tarea.');
      }
    });
  };

  const getStatusBadge = (status: Task['status']) => {
    switch (status) {
      case 'approved':
        return <span className={`${styles.badge} ${styles.badgeApproved}`}><CheckCircle2 size={12} /> Aprobada</span>;
      case 'rejected':
        return <span className={`${styles.badge} ${styles.badgeRejected}`}><X size={12} /> Rechazada</span>;
      case 'submitted':
        return <span className={`${styles.badge} ${styles.badgeSubmitted}`}><Clock size={12} /> En Revisión</span>;
      case 'changes_requested':
        return <span className={`${styles.badge} ${styles.badgeChanges}`}><RefreshCw size={12} /> Cambios Solicitados</span>;
      default:
        return <span className={`${styles.badge} ${styles.badgePending}`}><Clock size={12} /> Pendiente</span>;
    }
  };

  const isImageFile = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '');
  };

  // Group items by submission (within 1 minute)
  const groupedEvidence = React.useMemo(() => {
    const sorted = [...evidenceList].sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
    const groups: any[] = [];
    
    sorted.forEach((ev) => {
      const lastGroup = groups[groups.length - 1];
      const timeDiff = lastGroup ? Math.abs(new Date(ev.submitted_at).getTime() - new Date(lastGroup.submitted_at).getTime()) : Infinity;
      
      if (
        lastGroup &&
        lastGroup.title === ev.title &&
        lastGroup.description === ev.description &&
        lastGroup.user?.id === ev.profile?.id &&
        timeDiff < 60000 // within 1 minute
      ) {
        lastGroup.files.push(ev);
      } else {
        groups.push({
          id: ev.id,
          title: ev.title,
          description: ev.description,
          user: ev.profile,
          submitted_at: ev.submitted_at,
          files: [ev]
        });
      }
    });
    
    return groups;
  }, [evidenceList]);

  // Pagination calculations
  const totalPages = Math.ceil(groupedEvidence.length / itemsPerPage);
  const paginatedGroups = groupedEvidence.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Auto-scroll when page changes
  React.useEffect(() => {
    if (currentPage > 1) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

  return (
    <div className={styles.mainContent}>
      <div className="container animate-fade-in">
        {/* Back Link */}
        <Link href="/dashboard" className={styles.backLink}>
          <ArrowLeft size={16} />
          Volver al Panel
        </Link>

        {/* Messages */}
        {error && (
          <div className={styles.alertError}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}
        {successMsg && (
          <div className={styles.alertSuccess}>
            <CheckCircle2 size={16} />
            {successMsg}
          </div>
        )}

        <div className={styles.verticalFlow}>
          {/* Left Column: Task Details */}
          <div className={styles.taskCard}>
            <div className={styles.header}>
              <h1 className={styles.title}>{task.title}</h1>
              {getStatusBadge(task.status)}
            </div>

            <div className={styles.desc}>
              {task.description || 'Sin instrucciones adicionales.'}
            </div>

            <div className={styles.infoList}>
              <div className={styles.infoItem}>
                <Calendar size={18} className={styles.infoIcon} />
                <span className={styles.infoLabel}>Vencimiento:</span>
                <span>{task.due_date ? formatDate(task.due_date) : 'Sin límite'}</span>
              </div>
              <div className={styles.infoItem}>
                <User size={18} className={styles.infoIcon} />
                <span className={styles.infoLabel}>Asignado a:</span>
                <span>{task.assigned_profile?.full_name || 'Sin Asignar'} ({task.assigned_profile?.email || 'N/D'})</span>
              </div>
              <div className={styles.infoItem}>
                <User size={18} className={styles.infoIcon} />
                <span className={styles.infoLabel}>Creado por:</span>
                <span>{task.creator_profile?.full_name || 'Sistema'}</span>
              </div>
            </div>

            {/* Admin Feedback Display */}
            {task.admin_feedback && (
              <div className={styles.feedbackPanel}>
                <div className={styles.feedbackHeader}>
                  <MessageSquare size={16} />
                  <span>Comentarios del Admin</span>
                </div>
                <p className={styles.feedbackText}>{task.admin_feedback}</p>
              </div>
            )}
          </div>

          {/* Right Column: Evidence upload/review */}
          <div className={styles.evidenceCard}>
            <h2 className={styles.sectionTitle}>Evidencia</h2>

            {/* 1. Evidence Upload form for assigned users */}
            {canUpload && (
              <form className={styles.form} onSubmit={handleUpload}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Título de la Evidencia</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Ej. Capturas del Diseño Final"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isPending}
                    style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
                  />
                </div>

                <FileUpload
                  value={files}
                  onChange={setFiles}
                  label="Selecciona los archivos"
                  multiple={true}
                />
                
                <div className={styles.formGroup}>
                  <label className={styles.label}>Notas o Comentarios (Opcional)</label>
                  <textarea
                    className={styles.textarea}
                    placeholder="Detalles sobre tu entrega..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isPending}
                  />
                </div>

                <Button type="submit" fullWidth isLoading={isPending} icon={<Send size={16} />}>
                  Enviar a Revisión
                </Button>
              </form>
            )}

            {/* Status message when waiting for review */}
            {!isAdmin && isAssigned && task.status === 'submitted' && (
              <div className={styles.statusMessage}>
                <Clock size={24} />
                <p>Tu evidencia ha sido enviada y está en revisión.</p>
              </div>
            )}

            {/* Status message when approved */}
            {!isAdmin && isAssigned && task.status === 'approved' && (
              <div className={styles.statusMessageSuccess}>
                <CheckCircle2 size={24} />
                <p>¡Tu evidencia fue aprobada! Tarea completada.</p>
              </div>
            )}

            {/* 2. Show existing evidence */}
            {evidenceList.length > 0 ? (
              <>
                {/* Admin Review Panel attached to the latest evidence, displayed as a distinct card above the table */}
                {isAdmin && task.status === 'submitted' && groupedEvidence.length > 0 && (
                  <div className={styles.adminPanel} style={{ backgroundColor: 'var(--bg-tertiary)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
                    <h3 className={styles.adminTitle} style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--primary)' }}>
                      <MessageSquare size={20} /> Evaluar Última Entrega
                    </h3>
                    <div style={{ marginBottom: '24px', backgroundColor: 'var(--bg-secondary)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                      {/* Left Column: Context */}
                      <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ marginBottom: '16px' }}>
                          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Detalles de la Entrega</span>
                          {groupedEvidence[0].title ? (
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>{groupedEvidence[0].title}</h4>
                          ) : (
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '8px' }}>Sin título</h4>
                          )}
                          
                          {groupedEvidence[0].description ? (
                            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{groupedEvidence[0].description}</p>
                          ) : (
                            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin descripción adicional.</p>
                          )}
                        </div>
                        
                        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <User size={16} color="var(--text-muted)" />
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{groupedEvidence[0].user?.full_name || 'Usuario'}</span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>• {formatDateTime(groupedEvidence[0].submitted_at)}</span>
                        </div>
                      </div>

                      {/* Right Column: Files */}
                      <div style={{ flex: '2 1 400px', backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FileText size={16} /> Archivos Adjuntos ({groupedEvidence[0].files.length})
                        </h5>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
                          {groupedEvidence[0].files.map((ev: Evidence) => (
                            <div key={ev.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '8px', backgroundColor: 'var(--bg-secondary)', transition: 'transform var(--transition-fast)' }}>
                              {ev.fileUrl ? (
                                <a
                                  href={ev.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ display: 'flex', flexDirection: 'column', gap: '8px', textDecoration: 'none' }}
                                >
                                  {isImageFile(ev.file_name) && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={ev.fileUrl}
                                      alt="Evidencia adjunta"
                                      style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                                    />
                                  )}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 500, padding: '4px 0' }}>
                                    {isImageFile(ev.file_name) ? <ExternalLink size={14} /> : <Download size={14} />}
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ev.file_name}>
                                      {ev.file_name}
                                    </span>
                                  </div>
                                </a>
                              ) : (
                                <div style={{ color: 'var(--error)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', padding: '16px 0', justifyContent: 'center' }}>
                                  <AlertCircle size={16} /> Error al cargar
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <textarea
                      className={styles.textarea}
                      placeholder="Escribe tus comentarios (Obligatorio para rechazar o solicitar cambios)..."
                      value={adminFeedback}
                      onChange={(e) => setAdminFeedback(e.target.value)}
                      disabled={isPending}
                      style={{ minHeight: '80px', padding: '12px', fontSize: '0.95rem' }}
                    />
                    <div className={styles.adminButtons} style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                      <Button variant="outline" onClick={() => handleReview('rejected', groupedEvidence[0].files.map((f: Evidence) => f.id))} isLoading={isPending} icon={<X size={16} />} style={{ border: '1px solid var(--error-border)', color: 'var(--error)', backgroundColor: 'var(--error-bg)', flex: 1 }}>Rechazar</Button>
                      <Button variant="outline" onClick={() => handleReview('changes_requested', groupedEvidence[0].files.map((f: Evidence) => f.id))} isLoading={isPending} icon={<RefreshCw size={16} />} style={{ border: '1px solid var(--warning-border)', color: 'var(--warning)', backgroundColor: 'var(--warning-bg)', flex: 1 }}>Solicitar Cambios</Button>
                      <Button onClick={() => handleReview('approved', groupedEvidence[0].files.map((f: Evidence) => f.id))} isLoading={isPending} icon={<Check size={16} />} style={{ backgroundColor: 'var(--success)', border: '1px solid var(--success-border)', flex: 1 }}>Aprobar Entrega</Button>
                    </div>
                  </div>
                )}

                <div className={styles.tableContainer}>
                  <table className={styles.evidenceTable}>
                  <thead>
                    <tr>
                      <th>Fecha y Usuario</th>
                      <th>Detalles</th>
                      <th>Archivos</th>
                      <th>Comentarios del Admin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedGroups.map((group, index) => (
                      <tr key={group.id}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{group.user?.full_name || 'Usuario'}</span>
                            <span className={styles.evidenceDate}>{formatDateTime(group.submitted_at)}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '300px' }}>
                            {group.title && (
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{group.title}</span>
                            )}
                            {group.description && (
                              <span className={styles.evidenceDesc}>{group.description}</span>
                            )}
                            {!group.title && !group.description && <span className={styles.evidenceDesc}>Sin detalles</span>}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {group.files.map((ev: Evidence) => (
                              <div key={ev.id}>
                                {ev.fileUrl ? (
                                  <div>
                                    <a
                                      href={ev.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={styles.fileLink}
                                    >
                                      {isImageFile(ev.file_name) ? <ExternalLink size={16} /> : <Download size={16} />}
                                      <span style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ev.file_name}>
                                        {ev.file_name}
                                      </span>
                                    </a>
                                    {isImageFile(ev.file_name) && (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={ev.fileUrl}
                                        alt="Evidencia adjunta"
                                        className={styles.tableMediaPreview}
                                      />
                                    )}
                                  </div>
                                ) : (
                                  <div style={{ color: 'var(--error)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <AlertCircle size={14} /> Error
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td>
                          {group.files[0].admin_feedback ? (
                            <div style={{ backgroundColor: 'rgba(251, 146, 60, 0.08)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(251, 146, 60, 0.2)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fb923c', fontWeight: 600, marginBottom: '6px', fontSize: '0.85rem' }}>
                                <MessageSquare size={14} />
                                <span>Feedback</span>
                              </div>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{group.files[0].admin_feedback}</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>Sin revisión</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            ) : (
              <div className={styles.emptyEvidence}>
                <FileText size={40} />
                <p>Aún no se ha subido evidencia.</p>
              </div>
            )}
            {groupedEvidence.length > itemsPerPage && (
              <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
