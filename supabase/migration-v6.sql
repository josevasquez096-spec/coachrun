-- MyCoachRuns v6
-- Caminata y trail como tipos de entrenamiento, y fuerza con músculos.
--
-- Se ejecuta a mano en Supabase → SQL Editor.
-- IMPORTANTE: va en DOS PASOS. Postgres no deja usar un valor nuevo de una
-- lista en la misma transacción en la que se crea, así que hay que lanzar el
-- paso 1, esperar el "Success", y luego el paso 2.

-- ============================================================ PASO 1
-- Ampliar la lista de tipos de entrenamiento.
-- `IF NOT EXISTS` lo hace repetible: si ya está, no se queja.

ALTER TYPE workout_type ADD VALUE IF NOT EXISTS 'walk';
ALTER TYPE workout_type ADD VALUE IF NOT EXISTS 'trail';


-- ============================================================ PASO 2
-- (lanzar esto DESPUÉS de que el paso 1 diga Success)

-- Qué fue de verdad la actividad grabada. Hasta ahora todo se daba por
-- supuesto que era correr. Va como texto y no como lista cerrada porque las
-- actividades también llegan de Strava, que tiene sus propios nombres de
-- deporte y no queremos pelearnos con la lista cada vez que añadan uno.
alter table activities add column if not exists type text;

-- Lo ya guardado es carrera: es lo único que la app sabía grabar.
update activities set type = 'run' where type is null;

-- Músculos trabajados en un entrenamiento de fuerza.
-- Los elige el coach al asignar…
alter table workouts   add column if not exists muscles text[];
-- …y quedan también en la actividad, que es lo que de verdad se hizo y lo que
-- se convierte en la imagen para compartir.
alter table activities add column if not exists muscles text[];

-- Comprobación: debe devolver las tres columnas nuevas.
select table_name, column_name, data_type
from information_schema.columns
where (table_name = 'activities' and column_name in ('type','muscles'))
   or (table_name = 'workouts'   and column_name = 'muscles')
order by table_name, column_name;
