-- Home page vs. bookshelf, book language, and 3 new bookshelf-only books.

-- featured = shown on the home page. Every active book is listed on /bookshelf.
alter table public.books add column featured boolean not null default true;
alter table public.books add column language text not null default 'English';

insert into public.books
  (id, title, subtitle, eyebrow, author, price, description, quote, cover, cover_class, category, pages, featured, language, sort_order)
values
  ('moneytuition', 'Moneytuition', 'Beyond everything you are taught about money', 'ABUNDANCE · ADVANCED PRACTICES', 'Dr. Sw. Nirav Jayant', 599, 'Beyond everything you are taught about money—advanced tools and practices for using your intuition to build a new relationship with money and abundance.', '“Beyond everything you are taught about money.”', '/books/moneytuition.jpg', '', 'abundance', '[["Advance tools & practices","This book goes beyond budgets and rules. It invites you to look at money through awareness and intuition."]]'::jsonb, false, 'English', 9),
  ('the-super-kid', 'The Super Kid', '48 brain-building games for super-sensory abilities', 'KIDS · CONSCIOUS, CREATIVE, INTUITIVE', 'Dr. Sw. Nirav Jayant', 599, '48 brain-building games and exercises for activating super-sensory abilities—helping children grow conscious, creative and intuitive through play.', '“Conscious, creative, intuitive.”', '/books/the-super-kid.jpg', '', 'kids', '[["48 games & exercises","Playful brain-building games that help children activate their super-sensory abilities."]]'::jsonb, false, 'English', 10),
  ('jagran-ke-sutra', 'जागरण के सूत्र', 'एक वर्ष ध्यान की यात्रा का', 'HINDI · ध्यान', 'डॉ. स्वामी नीरव जयंत', 599, 'एक वर्ष ध्यान की यात्रा का—जागरण के सूत्र, हर दिन के ध्यान के लिए।', '“एक वर्ष ध्यान की यात्रा का।”', '/books/jagran-ke-sutra.jpg', '', 'meditation', '[["जागरण के सूत्र","एक वर्ष ध्यान की यात्रा का।"]]'::jsonb, false, 'Hindi', 11)
on conflict (id) do nothing;
