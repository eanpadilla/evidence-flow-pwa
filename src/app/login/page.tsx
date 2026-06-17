'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckSquare } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { login, signup } from '@/actions/auth';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      if (mode === 'login') {
        const res = await login(null, formData);
        console.log("Login response:", res);
        if (res && res.success) {
          router.push('/dashboard');
          router.refresh();
        } else {
          const errMsg = res && res.error
            ? (typeof res.error === 'object' ? JSON.stringify(res.error) : String(res.error))
            : 'Error al iniciar sesión.';
          setError(errMsg);
        }
      } else {
        const res = await signup(null, formData);
        console.log("Signup response:", res);
        if (res && res.success) {
          setSuccess(res.message || '¡Registro exitoso!');
          setMode('login');
        } else {
          const errMsg = res && res.error
            ? (typeof res.error === 'object' ? JSON.stringify(res.error) : String(res.error))
            : 'Error en el registro.';
          setError(errMsg);
        }
      }
    });
  };

  return (
    <main className={styles.container}>
      <div className={styles.splitLayout}>
        {/* Left Visual Panel */}
        <div className={styles.visualPanel}>
          <div className={styles.brand}>
            <CheckSquare size={32} style={{ color: 'var(--text-primary)' }} />
            <span>EvidenceFlow</span>
          </div>

          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>Trabaja sin<br />fricciones.</h1>
            <p className={styles.heroSubtitle}>
              Optimiza tu flujo de trabajo con un proceso moderno y transparente para verificar y aprobar evidencias de tareas.
            </p>
          </div>

          <div className={styles.testimonial}>
            "Disminuimos nuestros tiempos de resolución en un 40% usando los ciclos de aprobación de EvidenceFlow."
          </div>
        </div>

        {/* Right Form Panel */}
        <div className={styles.formPanel}>
          <div className={`${styles.formWrapper} animate-fade-in`}>
            
            <div className={styles.mobileHeader}>
              <CheckSquare size={28} style={{ color: 'var(--text-primary)' }} />
              <span>EvidenceFlow</span>
            </div>

            <div className={styles.formHeader}>
              <h2 className={styles.formTitle}>Bienvenido de vuelta</h2>
              <p className={styles.formSubtitle}>Por favor ingresa tus datos para continuar.</p>
            </div>

            <div className={styles.tabs}>
              <button
                type="button"
                className={`${styles.tab} ${mode === 'login' ? styles.activeTab : ''}`}
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccess(null);
                }}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                className={`${styles.tab} ${mode === 'signup' ? styles.activeTab : ''}`}
                onClick={() => {
                  setMode('signup');
                  setError(null);
                  setSuccess(null);
                }}
              >
                Crear Cuenta
              </button>
            </div>

            {error && <div className={`${styles.message} ${styles.error}`}>{error}</div>}
            {success && <div className={`${styles.message} ${styles.success}`}>{success}</div>}

            <form className={styles.form} onSubmit={handleSubmit}>
              {mode === 'signup' && (
                <Input
                  label="Nombre Completo"
                  name="fullName"
                  placeholder="Juan Pérez"
                  required
                  disabled={isPending}
                />
              )}

              <Input
                label="Correo Electrónico"
                type="email"
                name="email"
                placeholder="nombre@ejemplo.com"
                required
                disabled={isPending}
              />

              <Input
                label="Contraseña"
                type="password"
                name="password"
                placeholder="••••••••"
                required
                disabled={isPending}
              />



              <Button type="submit" fullWidth isLoading={isPending} style={{ marginTop: '8px' }}>
                {mode === 'login' ? 'Iniciar Sesión' : 'Registrarse'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
