-- Image preview pages for the flip-book reader (shown two per spread instead of text pages).
alter table public.books add column preview_images jsonb not null default '[]'::jsonb;

update public.books
set preview_images = '[
  "/books/previews/playing-with-meditation/1-pillow-beating.jpg",
  "/books/previews/playing-with-meditation/2-magic-bubble.jpg",
  "/books/previews/playing-with-meditation/3-mountain-stillness.jpg",
  "/books/previews/playing-with-meditation/4-scent-detective.jpg"
]'::jsonb
where id = 'playing';
