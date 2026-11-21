-- The Super Kid: image preview pages, and it swaps places with Zenful Stories
-- (Super Kid -> home page 2nd slot; Zenful Stories -> Bookshelf page only).

update public.books
set preview_images = '[
  "/books/previews/the-super-kid/1-random-word-story.jpg",
  "/books/previews/the-super-kid/2-slow-motion-walk.jpg",
  "/books/previews/the-super-kid/3-guess-the-number.jpg"
]'::jsonb,
    featured = true
where id = 'the-super-kid';

update public.books set featured = false where id = 'zenful';

update public.books as b set sort_order = v.pos
from (values
  ('playing', 1),
  ('the-super-kid', 2),
  ('moneytuition', 3),
  ('jagran-ke-sutra', 4),
  ('breath', 5),
  ('meditation-365', 6),
  ('zenful-21', 7),
  ('release-relax', 8),
  ('unwinding-anxiety', 9),
  ('somehow', 10),
  ('zenful', 11)
) as v(id, pos)
where b.id = v.id;
