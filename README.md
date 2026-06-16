# EvidenceFlow (PWA)

EvidenceFlow es una aplicación web progresiva (PWA) construida con Next.js que permite a los usuarios gestionar tareas y subir evidencias (capturas, PDFs, etc.) sobre su realización, mientras que los administradores pueden revisar, aprobar, rechazar o solicitar cambios sobre dichas evidencias.

## Tecnologías Utilizadas

- **Framework**: [Next.js 15+ (App Router)](https://nextjs.org/)
- **Base de Datos & Auth**: [Supabase](https://supabase.com/)
- **Almacenamiento**: Supabase Storage
- **Seguridad**: RLS (Row Level Security) configurado nativamente en la base de datos para restringir acceso según el rol (`admin` o `user`).
- **Lógica de Servidor**: Server Actions de Next.js (sin exponer la BD en el cliente).
- **Estilos**: CSS Puro (Vanilla CSS Modules) con un diseño Premium y minimalista (Bento-box, Glassmorphism).
- **Iconos**: [Lucide React](https://lucide.dev/)
- **PWA**: Soporte progresivo mediante Manifest y Service Workers generados automáticamente.

## Funcionalidades Principales

1. **Autenticación Basada en Roles**: Los usuarios pueden registrarse como `admin` o `user`.
2. **Panel de Control (Dashboard)**:
   - Los **Administradores** pueden crear tareas, asignarlas a usuarios específicos, ver estadísticas generales y revisar evidencias enviadas.
   - Los **Usuarios** pueden ver las tareas que tienen asignadas y enviar múltiples archivos de evidencia por tarea.
3. **Flujo de Revisión**:
   - `Pendiente` ➔ `En Revisión` (Cuando el usuario sube evidencia).
   - El admin puede: `Aprobar`, `Rechazar` o `Solicitar Cambios` (requiere adjuntar comentarios de feedback).
4. **Almacenamiento Seguro**: Las imágenes y documentos subidos se guardan en Supabase Storage, y se generan URLs firmadas de manera segura.
5. **Responsivo**: El diseño se adapta perfectamente tanto a pantallas de escritorio como a dispositivos móviles.

## Requisitos Previos

- Node.js 18.x o superior.
- Una cuenta y un proyecto configurado en [Supabase](https://supabase.com/).

## Configuración del Entorno (Supabase)

1. **Crear las tablas**: En el panel de SQL de Supabase, ejecuta el contenido del archivo `supabase_schema.sql` que se encuentra en la raíz del proyecto. Este script creará:
   - La tabla `profiles` (se enlaza automáticamente con la auth de Supabase vía Triggers).
   - La tabla `tasks`.
   - La tabla `evidence`.
   - Las políticas de seguridad (RLS) para todas las tablas.
   - El bucket de almacenamiento `evidence` y sus políticas RLS.

2. **Variables de Entorno**: Crea un archivo `.env.local` en la raíz del proyecto e ingresa tus credenciales de Supabase:
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

La aplicación está lista para ser desplegada en Vercel. 
1. Sube este repositorio a GitHub.
2. Importa el proyecto en Vercel.
3. Asegúrate de añadir `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en la configuración de **Environment Variables** en Vercel antes de compilar.
4. Vercel detectará automáticamente que es un proyecto Next.js y realizará el build (`npm run build`).

## Licencia
MIT
