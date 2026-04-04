-- Script de creación de tablas para Supabase

-- Crear tabla de estudiantes
CREATE TABLE IF NOT EXISTS public.estudiantes (
    id UUID PRIMARY KEY,
    nombre TEXT NOT NULL,
    grado TEXT NOT NULL,
    edad TEXT,
    diagnostico JSONB,
    detalle_diagnostico TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Crear tabla de piars
CREATE TABLE IF NOT EXISTS public.piars (
    id UUID PRIMARY KEY,
    estudiante_id UUID REFERENCES public.estudiantes(id) ON DELETE CASCADE,
    docente TEXT NOT NULL,
    asignatura TEXT NOT NULL,
    barreras JSONB,
    ajuste_razonable TEXT,
    flexibilizacion BOOLEAN,
    tipo_flexibilizacion JSONB,
    evaluacion JSONB,
    apoyo JSONB,
    meta TEXT,
    seguimiento JSONB,
    frecuencia TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
