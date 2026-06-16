'use client';

import React, { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui';
import { logout } from '@/actions/auth';
import styles from './Navbar.module.css';

interface NavbarProps {
  userProfile?: {
    full_name: string | null;
    role: 'admin' | 'user';
    email: string;
  } | null;
}

export const Navbar: React.FC<NavbarProps> = ({ userProfile }) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      const res = await logout();
      if (res.success) {
        router.push('/login');
        router.refresh();
      }
    });
  };

  return (
    <div className={styles.headerWrapper}>
      <header className={styles.header}>
        <div className={`container ${styles.nav}`}>
          <Link href="/" className={styles.logo}>
            <CheckSquare size={24} style={{ color: 'var(--text-primary)' }} />
            <span>EvidenceFlow</span>
          </Link>

          {userProfile && (
            <div className={styles.userInfo}>
              <div className={styles.userProfile}>
                <span className={styles.userName}>{userProfile.full_name || 'Usuario'}</span>
                <span className={styles.userRole}>{userProfile.role === 'admin' ? 'Administrador' : 'Usuario'}</span>
              </div>
              <Button
                variant="outline"
                disabled={isPending}
                isLoading={isPending}
                onClick={handleLogout}
                icon={<LogOut size={16} />}
                style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '9999px', backgroundColor: 'var(--bg-tertiary)', border: 'none' }}
              >
                <span className={styles.logoutText}>Cerrar Sesión</span>
              </Button>
            </div>
          )}
        </div>
      </header>
    </div>
  );
};
