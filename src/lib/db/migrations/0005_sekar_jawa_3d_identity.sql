-- Legacy identity migration. One atomic, repeatable update; invitation content
-- stays untouched. Old section variants and asset URLs resolve via aliases.
DO $$
BEGIN
  LOCK TABLE templates, invitations IN SHARE ROW EXCLUSIVE MODE;

  INSERT INTO templates
  SELECT (jsonb_populate_record(NULL::templates, to_jsonb(t) || jsonb_build_object(
    'id', 'sekar-jawa-3d',
    'name', 'Sekar Jawa 3D',
    'thumbnail', '/templates/sekar-jawa-3d/card'
  ))).*
  FROM templates t WHERE id = 'enchanted-garden'
  ON CONFLICT (id) DO UPDATE SET
    usage_count = templates.usage_count + EXCLUDED.usage_count;

  UPDATE templates SET
    name = 'Sekar Jawa 3D',
    thumbnail = '/templates/sekar-jawa-3d/card',
    composition = replace(composition::text, 'enchanted-garden', 'sekar-jawa-3d')::jsonb,
    preview_images = ARRAY(SELECT replace(image, 'enchanted-garden', 'sekar-jawa-3d') FROM unnest(preview_images) AS image),
    meta_title = replace(meta_title, 'Enchanted Garden', 'Sekar Jawa 3D'),
    meta_description = replace(meta_description, 'Enchanted Garden', 'Sekar Jawa 3D')
  WHERE id = 'sekar-jawa-3d';

  UPDATE invitations SET source_template = 'sekar-jawa-3d'
  WHERE source_template = 'enchanted-garden';

  DELETE FROM templates WHERE id = 'enchanted-garden';
END $$;
