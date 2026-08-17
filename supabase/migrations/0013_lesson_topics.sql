-- Categorías de lecciones + ruta inicial ("Empezá por acá").
--
-- Por qué NO son niveles principiante/intermedio/avanzado: el lector no se
-- autodiagnostica ("¿soy intermedio?"), la etiqueta "principiante" incomoda
-- justo al público al que le escribimos (dueños +35 que ya se sienten
-- incómodos con la tecnología), y toda la serie está escrita para ser fácil:
-- no hay un "avanzado" real que llenar. La dificultad se expresa como RUTA
-- —un orden sugerido de arranque— que ordena sin etiquetar a nadie.
--
-- El dato que motivó el cambio: de 8 lecciones publicadas, las lecturas se
-- concentran en lo que acaba de llegar por mail y tres lecciones del medio
-- nunca fueron abiertas por nadie. El catálogo viejo estaba muerto.

alter table public.lessons add column if not exists topic text;
alter table public.lessons add column if not exists starter_order smallint;

comment on column public.lessons.topic is
  'Categoría por resultado. Valores válidos en lib/lessonTopics.ts (primeros-pasos | papeles-datos | criterio | comunicacion). Null = "Otras". Se valida en la API, no con un check: sumar una categoría no debería necesitar una migración.';
comment on column public.lessons.starter_order is
  'Posición dentro de "Empezá por acá". Null = fuera de la ruta.';

-- Backfill de las 8 publicadas. Por fragmento de título (no por id) para que
-- la migración se pueda correr en cualquier entorno.
update public.lessons set topic = 'primeros-pasos', starter_order = 1 where title ilike '%empezar con ChatGPT%';
update public.lessons set topic = 'primeros-pasos', starter_order = 2 where title ilike '%pedirle las cosas%';
update public.lessons set topic = 'criterio',       starter_order = 3 where title ilike '%NO conviene darle%';
update public.lessons set topic = 'criterio'        where title ilike '%3 preguntas%';
update public.lessons set topic = 'papeles-datos'   where title ilike '%documentos largos%';
update public.lessons set topic = 'papeles-datos'   where title ilike '%planilla de ventas%';
update public.lessons set topic = 'papeles-datos'   where title ilike '%papel a la planilla%';
update public.lessons set topic = 'comunicacion'    where title ilike '%flyer%';
