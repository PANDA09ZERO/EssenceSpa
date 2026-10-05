INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('servicios', 'servicios', TRUE, 5242880)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS "Lectura pública de imágenes de servicios" ON storage.objects;
CREATE POLICY "Lectura pública de imágenes de servicios"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'servicios');

DROP POLICY IF EXISTS "Usuarios autenticados suben imágenes de servicios" ON storage.objects;
CREATE POLICY "Usuarios autenticados suben imágenes de servicios"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'servicios');