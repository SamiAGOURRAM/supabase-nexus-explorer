-- =====================================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- =====================================================

-- 1. Désactiver la whitelist (déjà fait dans le code frontend)

-- 2. Corriger les triggers pour mettre NULL au lieu de valeurs par défaut
-- (déjà fait dans 20251231000002_fix_profile_confirmation.sql)

-- 3. Fixer l'utilisateur existant qui a les mauvaises valeurs
UPDATE public.profiles
SET 
    student_number = NULL,
    specialization = NULL,
    graduation_year = NULL
WHERE id = '4912432d-0716-490a-ba53-3f5b43af558b'
  AND student_number = 'PENDING';

-- 4. Vérifier
SELECT id, email, student_number, specialization, graduation_year
FROM public.profiles
WHERE id = '4912432d-0716-490a-ba53-3f5b43af558b';
