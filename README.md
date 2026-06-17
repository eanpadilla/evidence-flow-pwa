# EvidenceFlow (PWA)

EvidenceFlow es una aplicación web progresiva (PWA) construida con Next.js que permite a los usuarios gestionar tareas y subir evidencias (capturas, PDFs, etc.) sobre su realización, mientras que los administradores pueden revisar, aprobar, rechazar o solicitar cambios sobre dichas evidencias.

## Tecnologías Utilizadas

- **Framework**: [Next.js 15+ (App Router)](https://nextjs.org/)
- **Base de Datos & Auth**: [Supabase](https://supabase.com/)
- **Almacenamiento**: Supabase Storage (bucket privado con URLs firmadas)
- **Seguridad**: RLS (Row Level Security) + defensa en profundidad en cada capa
- **Arquitectura**: Capa de servicios desacoplada, preparada para extracción de APIs REST
- **Estilos**: CSS Puro (Vanilla CSS Modules) con diseño Premium y minimalista
- **Iconos**: [Lucide React](https://lucide.dev/)
- **PWA**: Soporte progresivo mediante Manifest y Service Workers

## Funcionalidades Principales

1. **Autenticación Basada en Roles**: Los usuarios se registran siempre como `user`. Los administradores se promueven manualmente desde el panel SQL de Supabase (ver [Seguridad](#seguridad)).
2. **Panel de Control (Dashboard)**:
   - Los **Administradores** pueden crear tareas, asignarlas a usuarios, ver estadísticas y revisar evidencias con un panel de revisión dividido (Split View).
   - Los **Usuarios** pueden ver sus tareas asignadas y subir múltiples archivos de evidencia.
3. **Flujo de Revisión**:
   - `Pendiente` → `En Revisión` (usuario sube evidencia)
   - Admin puede: `Aprobar`, `Rechazar` o `Solicitar Cambios` (requiere feedback)
4. **Almacenamiento Seguro**: Archivos en Supabase Storage con URLs firmadas (1h de expiración).
5. **Responsivo**: Adaptado a escritorio y dispositivos móviles.

## Seguridad

> ⚠️ **Admin Signup está CERRADO**. No existe opción pública para registrarse como administrador.

La seguridad sigue un modelo de **defensa en profundidad** con 5 capas:

1. **UI**: No muestra selector de rol admin en el formulario.
2. **Server Action**: Ignora cualquier rol enviado desde el cliente.
3. **Servicio**: Hardcodea `role='user'` en la lógica de registro.
4. **DB Trigger**: El trigger `handle_new_user` siempre inserta `role='user'`.
5. **RLS Policies**: Bloquean operaciones no autorizadas a nivel de base de datos.

### Promover un usuario a Admin

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'correo@ejemplo.com';
```

Para más detalles sobre la arquitectura de seguridad, consulta [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Requisitos Previos

- Node.js 18.x o superior.
- Una cuenta y un proyecto configurado en [Supabase](https://supabase.com/).

## Configuración del Entorno (Supabase)

1. **Ejecutar las migraciones SQL**: En el editor SQL de Supabase, ejecuta los archivos de `supabase/migrations/` **en orden numérico**:
   ```
   001_initial_schema.sql    → Tablas, tipos y trigger
   002_rls_policies.sql      → Políticas de seguridad RLS
   003_storage_setup.sql     → Bucket de almacenamiento
   004_harden_security.sql   → Endurecimiento de seguridad
   ```
   > Si ya tienes la base de datos del esquema anterior, solo ejecuta `004_harden_security.sql`.

2. **Variables de Entorno**: Crea un archivo `.env.local` en la raíz del proyecto:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
   ```

## Instalación y Ejecución

```bash
# 1. Instalar dependencias
npm install

# 2. Levantar el servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación.

## Despliegue en Vercel

1. Sube este repositorio a GitHub.
2. Importa el proyecto en Vercel.
3. Configura las **Environment Variables**: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Vercel detectará automáticamente que es un proyecto Next.js y realizará el build.

## Documentación Adicional

- [Arquitectura del Sistema](docs/ARCHITECTURE.md) — Capas, reglas de negocio, migraciones, y preparación para APIs.
