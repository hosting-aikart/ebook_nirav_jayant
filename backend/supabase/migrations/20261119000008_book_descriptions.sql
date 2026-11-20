-- Real book descriptions (from the author) replace the placeholder copy.
alter table public.books
  add column if not exists about jsonb not null default '[]'::jsonb,
  add column if not exists highlights jsonb not null default '[]'::jsonb;

update public.books set
  eyebrow = 'MEDITATION · FOR KIDS',
  subtitle = '59 playful meditations for kids of all ages',
  description = 'Teach your loving kid meditation at an early age. 59 easy-to-do techniques that help kids learn meditation joyfully and playfully.',
  quote = '“Meditation should not begin as discipline. It should begin as delight.”',
  about = '["There are 59 easy-to-do techniques that a child enjoys doing. They are designed so that, in a very playful way, they teach a child profound meditation—bringing calm to their busy little mind, stillness to their body, and joy to their heart.", "Through laughter, stories, games, movement, breathing, sound, silence and imagination, your child will slowly learn how to sit with themselves, listen inside, feel their feelings, and return to peace—without ever feeling like it is a lesson.", "These techniques help a child become more focused, more confident, more loving and more aware. They learn to handle anger, fear, restlessness and overthinking with softness. They learn to sleep better, study better, and live better—not by force, but by play.", "And when a child falls in love with stillness early, that stillness stays with them for life. Welcome to Playing With Meditation—where meditation becomes a game, and the game becomes a gift."]'::jsonb,
  highlights = '[]'::jsonb
where id = 'playing';

update public.books set
  eyebrow = 'BREATHWORK · FOR KIDS',
  subtitle = '64 fun breathing techniques for kids',
  description = '64 fun-to-do breathing techniques for kids to make them healthy, focused and joyful. No boring instructions—just playful breaths, giggles, games, sounds and imagination.',
  quote = '“When a child learns to play with breath, breath becomes their best friend for life.”',
  about = '["All the techniques are fun-oriented, which children love to do. No sitting still for hours—just playful breaths that teach a child the power of their own breath.", "This book helps a child keep calm and centered. When a child learns to breathe well, they learn to handle anger, fear, restlessness, exam stress and overthinking with ease. They sleep better, concentrate better, and feel happier—naturally.", "With every breath, your child learns to come back to themselves. To slow down. To feel safe inside. To find their own stillness, even in a noisy world.", "Because breath is the first meditation a child ever knows. Welcome to Playing With Breath—where every breath becomes play, and every play becomes peace."]'::jsonb,
  highlights = '["64 colourful, thick pages", "High-quality prints for beautiful graphics", "Spiral binding—made to be opened, played with, carried around, and loved by little hands", "Written and designed by the most famous Osho meditation facilitator, Dr. Swami Nirav Jayant."]'::jsonb
where id = 'breath';

update public.books set
  eyebrow = 'KIDS · CONSCIOUS, CREATIVE, INTUITIVE',
  subtitle = '48 brain-building games for super-sensory abilities',
  description = '48 brain-building games and exercises for activating super-sensory abilities—to create a conscious, creative and intuitive kid.',
  quote = '“Every child is born with super senses. They just need the right play to remember them.”',
  about = '["Not just games. Not just exercises. These are playful keys to open the hidden powers already inside your child.", "Through seeing, hearing, touching, smelling, feeling, imagining, and sensing beyond the five senses, your child will slowly awaken a sharper brain, a deeper intuition, and a more alive awareness. They will learn to focus without force, remember without stress, imagine without limits, and feel the world more deeply.", "Conscious—aware of their body, their breath, their thoughts and their feelings. Creative—full of new ideas, stories, colours and possibilities. Intuitive—able to listen to that quiet inner voice that always knows.", "All 48 games are designed to be fun, easy and joyful. Children don''t feel they are learning; they feel they are playing. And in that play, the brain builds itself—stronger, faster, calmer and more sensitive."]'::jsonb,
  highlights = '["62 colourful, thick pages", "High-quality prints for beautiful graphics", "Spiral binding—opens flat, play anywhere, loved by little hands", "Written and designed by the most famous Osho meditation facilitator, Dr. Swami Nirav Jayant."]'::jsonb
where id = 'the-super-kid';

update public.books set
  title = 'Release & Relax',
  eyebrow = 'SOMATIC · ANGER & ANXIETY',
  author = 'Dr. Sw. Nirav Jayant',
  subtitle = '59 somatic practices to transform anger and anxiety',
  description = '59 somatic practices to transform anger and anxiety. Not to control them. Not to suppress them. To release them.',
  quote = '“Anger becomes energy, anxiety becomes awareness, and your body becomes your healer.”',
  about = '["Simple, easy-to-do 5 to 10-minute body resets—deeply transformative, advanced techniques that absorb and transform anger and anxiety and bring you to a state of relaxation.", "Anger and anxiety are not in your mind alone. They live in your body—in tight shoulders, a clenched jaw, a racing heart, shallow breath, restless hands. When you release them from the body, the mind becomes quiet on its own.", "These 59 practices help you shake it out, breathe it out, move it out, sound it out, and let it go—gently, safely and playfully. In just 5 to 10 minutes you can come back to yourself. Calmer. Lighter. Clearer. More alive.", "This is not a book to just read. It is a book to do. To breathe with. To move with. To relax with."]'::jsonb,
  highlights = '["59 somatic practices, 5–10 minutes each", "Pictorial guidance and beautiful illustrations—easy to follow, easy to do anywhere"]'::jsonb
where id = 'unwinding-anxiety';

update public.books set
  eyebrow = 'ABUNDANCE · ADVANCED PRACTICES',
  subtitle = 'Beyond everything you are taught about money',
  description = 'What if everything you have been taught about money is limiting you? Advanced tools and practices to release old money conditioning and open to unlimited wealth.',
  quote = '“I release and transform all energies, beliefs and limitations that block me from receiving money.”',
  about = '["Since childhood we have been taught that earning too much money corrupts the mind, that great wealth is not in our destiny, and that we should only stretch our legs according to the length of our blanket. Countless such ideas were planted into our unconscious by society, parents, teachers and relatives.", "We could not resist them then—we did not have the maturity or the awareness. Repeated again and again, they sank so deep that we don''t even notice them. This book helps you see these blockages and let them go.", "Through powerful clearing statements and “Dear Universe” questions—like “What would it take for me to receive money in multiple currencies?”—you begin to release what blocks you from receiving money, creating money and experiencing unlimited wealth."]'::jsonb,
  highlights = '["Clearing statements to release limiting money beliefs", "“Dear Universe” questions to open new possibilities", "Beautifully illustrated pages"]'::jsonb
where id = 'moneytuition';

update public.books set
  eyebrow = 'HINDI · हर सप्ताह एक ध्यान',
  subtitle = 'एक वर्ष ध्यान की यात्रा का',
  description = 'एक वर्ष ध्यान की यात्रा का—हर सप्ताह जीने के लिए एक नया सूत्र, एक नया ध्यान।',
  quote = '“प्रचुरता बाहर नहीं, आपके भीतर ही बह रही है।”',
  about = '["जागरण के सूत्र पूरे वर्ष की एक ध्यान-यात्रा है। हर सप्ताह एक नया सूत्र—प्रचुरता, मैत्री, शरीर, अकेला हो जाना—जिसे पूरे सप्ताह जीना है, केवल पढ़ना नहीं।", "हर सूत्र के साथ एक सरल ध्यान या भाव-प्रयोग है: थोड़ा रुककर देखना, आँखें बंद करके अनुभव करना, स्वयं को गले लगाना, अपनी साँसों की कोमल गति को महसूस करना।", "सुंदर चित्रों से सजे पन्ने, जो हर सप्ताह आपको याद दिलाते हैं कि आनंद, प्रेम और शांति बाहर नहीं, आपके भीतर ही हैं।"]'::jsonb,
  highlights = '["हर सप्ताह एक सूत्र और एक ध्यान-प्रयोग", "सुंदर रंगीन चित्रों के साथ"]'::jsonb
where id = 'jagran-ke-sutra';
