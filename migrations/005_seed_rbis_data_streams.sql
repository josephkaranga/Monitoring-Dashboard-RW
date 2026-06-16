-- ============================================================
-- SEED RBIS DATA STREAMS
-- Inserts 8 predefined RBIS data streams mapped to NBSAP targets
-- ============================================================

-- Insert the 8 predefined RBIS data streams
INSERT INTO public.rbis_data_streams (
  id, 
  name, 
  description, 
  target_numbers, 
  occurrence_count,
  status, 
  icon, 
  color,
  last_update
) VALUES
  (
    'protected-areas',
    'Protected Areas Coverage',
    'Monitoring of protected area extent and management effectiveness',
    ARRAY[1, 2, 3],
    0,
    'active',
    'fa-shield-halved',
    '#059669',
    NOW()
  ),
  (
    'threatened-species',
    'Threatened Species Monitoring',
    'Population trends and conservation status of threatened species',
    ARRAY[4, 5],
    0,
    'active',
    'fa-paw',
    '#dc2626',
    NOW()
  ),
  (
    'forest-cover',
    'Forest Cover Change',
    'Forest extent and deforestation monitoring via remote sensing',
    ARRAY[1, 2],
    0,
    'active',
    'fa-tree',
    '#10b981',
    NOW()
  ),
  (
    'wetland-extent',
    'Wetland Extent',
    'Wetland area and restoration progress tracking',
    ARRAY[2, 3],
    0,
    'active',
    'fa-water',
    '#0891b2',
    NOW()
  ),
  (
    'species-distribution',
    'Species Distribution',
    'Biodiversity occurrence records and distribution patterns',
    ARRAY[4, 5, 6],
    0,
    'active',
    'fa-map-location-dot',
    '#7c3aed',
    NOW()
  ),
  (
    'invasive-species',
    'Invasive Species Tracking',
    'Detection and spread monitoring of invasive alien species',
    ARRAY[6],
    0,
    'active',
    'fa-bug',
    '#f59e0b',
    NOW()
  ),
  (
    'ecosystem-restoration',
    'Ecosystem Restoration',
    'Restoration project monitoring and success metrics',
    ARRAY[2, 3],
    0,
    'active',
    'fa-seedling',
    '#16a34a',
    NOW()
  ),
  (
    'sustainable-use',
    'Sustainable Use Indicators',
    'Sustainable harvesting and use of biodiversity resources',
    ARRAY[9, 10],
    0,
    'active',
    'fa-leaf',
    '#0284c7',
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  target_numbers = EXCLUDED.target_numbers,
  status = EXCLUDED.status,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  last_update = EXCLUDED.last_update,
  updated_at = NOW();

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Verify all 8 data streams were inserted
DO $$
DECLARE
  stream_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO stream_count FROM public.rbis_data_streams;
  
  IF stream_count < 8 THEN
    RAISE WARNING 'Expected 8 data streams, but found %', stream_count;
  ELSE
    RAISE NOTICE 'Successfully seeded % RBIS data streams', stream_count;
  END IF;
END $$;

-- Display the seeded data streams
SELECT 
  id,
  name,
  target_numbers,
  status,
  icon,
  color
FROM public.rbis_data_streams
ORDER BY id;
