-- Moneytuition: image preview pages, and a place in the home page's first row (3rd slot).
-- Playing with Breath moves to row 2; Somehow moves to the Bookshelf page only.

update public.books
set preview_images = '[
  "/books/previews/moneytuition/1-introduction.jpg",
  "/books/previews/moneytuition/2-release-and-transform.jpg",
  "/books/previews/moneytuition/3-dear-universe-currencies.jpg",
  "/books/previews/moneytuition/4-dear-universe-celebrate.jpg"
]'::jsonb,
    featured = true
where id = 'moneytuition';

update public.books set featured = false where id = 'somehow';

update public.books as b set sort_order = v.pos
from (values
  ('playing', 1),
  ('zenful', 2),
  ('moneytuition', 3),
  ('jagran-ke-sutra', 4),
  ('breath', 5),
  ('meditation-365', 6),
  ('zenful-21', 7),
  ('release-relax', 8),
  ('unwinding-anxiety', 9),
  ('somehow', 10),
  ('the-super-kid', 11)
) as v(id, pos)
where b.id = v.id;
