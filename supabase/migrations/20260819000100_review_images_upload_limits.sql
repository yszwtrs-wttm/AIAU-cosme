-- 口コミ写真のアップロード制限。クライアント側の検証と同じ上限をバケットにも入れる。
-- 12MB / JPEG・PNG・WebP・HEIC のみ。
update storage.buckets
set
  file_size_limit = 12582912,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
where id = 'review-images';
