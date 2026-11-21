-- Jagran ke Sutra: image preview pages, and a place in the home page's first row
-- (4th slot). Meditation 365 moves to the Bookshelf page only.

update public.books
set preview_images = '[
  "/books/previews/jagran-ke-sutra/1-week-01-prachurta.jpg",
  "/books/previews/jagran-ke-sutra/2-week-05-maitri.jpg",
  "/books/previews/jagran-ke-sutra/3-week-11-shareer.jpg",
  "/books/previews/jagran-ke-sutra/4-week-22-akela-ho-jana.jpg"
]'::jsonb,
    featured = true
where id = 'jagran-ke-sutra';

update public.books set featured = false where id = 'meditation-365';

update public.books as b set sort_order = v.pos
from (values
  ('playing', 1),
  ('zenful', 2),
  ('breath', 3),
  ('jagran-ke-sutra', 4),
  ('meditation-365', 5),
  ('zenful-21', 6),
  ('release-relax', 7),
  ('unwinding-anxiety', 8),
  ('somehow', 9),
  ('moneytuition', 10),
  ('the-super-kid', 11)
) as v(id, pos)
where b.id = v.id;
