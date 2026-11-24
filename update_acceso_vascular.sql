-- =========================================================================
-- QUERY UPDATE: tipo_general_materiales (tipo = 'ACCESO_VASCULAR')
-- Describir completos los nombres de acceso vascular
-- Fecha: 2026-11-23
-- =========================================================================

UPDATE `tipo_general_materiales`
SET `nombre` = CASE
    WHEN `nombre` = 'ARD' THEN 'ARD: Arteria Radial Derecha'
    WHEN `nombre` = 'ARI' THEN 'ARI: Arteria Radial Izquierda'
    WHEN `nombre` = 'AFD' THEN 'AFD: Arteria Femoral Derecha'
    WHEN `nombre` = 'AFI' THEN 'AFI: Arteria Femoral Izquierda'
    WHEN `nombre` IN ('YUG. IZQ', 'AYI') THEN 'AYI: Arteria Yugular Izquierda'
    WHEN `nombre` IN ('YUG. DER', 'AYD') THEN 'AYD: Arteria Yugular Derecha'
    ELSE `nombre`
END,
`fecha_actualizacion` = NOW()
WHERE `tipo` = 'ACCESO_VASCULAR'
  AND `nombre` IN ('ARD', 'ARI', 'AFD', 'AFI', 'YUG. IZQ', 'YUG. DER', 'AYI', 'AYD');
