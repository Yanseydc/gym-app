# GymOS

Scaffold inicial para un MVP de plataforma de gimnasio sobre Next.js y Supabase.

## Stack

- Next.js
- Supabase
- TypeScript
- Estructura modular por features

## Estructura

- `src/app`: rutas y layouts
- `src/components`: UI compartida
- `src/config`: rutas y navegación
- `src/lib`: utilidades base, auth y Supabase
- `src/modules`: features por dominio
- `src/types`: contratos compartidos
- `supabase/migrations`: SQL inicial para perfiles y roles

## Variables de entorno

Usa `.env.example` como base.

## Siguiente paso sugerido

1. Instalar dependencias.
2. Crear proyecto en Supabase.
3. Aplicar la migración inicial.
4. Implementar seeds de perfiles y primeras pantallas CRUD.
