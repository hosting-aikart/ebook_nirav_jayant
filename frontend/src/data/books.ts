export type Category = "kids" | "meditation" | "abundance";

export type Book = {
  id: string;
  title: string;
  eyebrow: string;
  author: string;
  price: number;
  /** Short intro shown under the title. */
  description: string;
  /** Longer "About this book" paragraphs, shown when the reader taps "Read more". */
  about?: string[];
  /** "Inside the book" bullet points (pages, print, binding…). */
  highlights?: string[];
  quote: string;
  cover?: string;
  coverClass: string;
  subtitle: string;
  category: Category;
  pages: [string, string][];
  /** Preview page images. When set, the reader shows these (two per spread) instead of text pages. */
  previewImages?: string[];
  /** Shown on the home page. Every active book appears on the /bookshelf page. */
  featured: boolean;
  language: Language;
};

export type Language = "English" | "Hindi";
export const languages: Language[] = ["English", "Hindi"];

export const categories: { id: "all" | Category; label: string }[] = [
  { id: "all", label: "All" },
  { id: "kids", label: "Books for Kids" },
  { id: "meditation", label: "Books for Meditation" },
  { id: "abundance", label: "Books for Money & Abundance" },
];

/**
 * Fallback catalogue — used when the store's server can't be reached.
 * The live catalogue is managed from the admin panel (/admin).
 */
export const fallbackBooks: Book[] = [
  {
    id: "playing",
    title: "Playing with Meditation",
    eyebrow: "MEDITATION · FOR KIDS",
    author: "Sw. Nirav Jayant",
    price: 500,
    description:
      "Teach your loving kid meditation at an early age. 59 easy-to-do techniques that help kids learn meditation joyfully and playfully.",
    about: [
      "There are 59 easy-to-do techniques that a child enjoys doing. They are designed so that, in a very playful way, they teach a child profound meditation—bringing calm to their busy little mind, stillness to their body, and joy to their heart.",
      "Through laughter, stories, games, movement, breathing, sound, silence and imagination, your child will slowly learn how to sit with themselves, listen inside, feel their feelings, and return to peace—without ever feeling like it is a lesson.",
      "These techniques help a child become more focused, more confident, more loving and more aware. They learn to handle anger, fear, restlessness and overthinking with softness. They learn to sleep better, study better, and live better—not by force, but by play.",
      "And when a child falls in love with stillness early, that stillness stays with them for life. Welcome to Playing With Meditation—where meditation becomes a game, and the game becomes a gift.",
    ],
    quote: "“Meditation should not begin as discipline. It should begin as delight.”",
    cover: "/books/playing-with-meditation.png",
    previewImages: [
      "/books/previews/playing-with-meditation/1-pillow-beating.jpg",
      "/books/previews/playing-with-meditation/2-magic-bubble.jpg",
      "/books/previews/playing-with-meditation/3-mountain-stillness.jpg",
      "/books/previews/playing-with-meditation/4-scent-detective.jpg",
    ],
    coverClass: "cover-playing",
    subtitle: "59 playful meditations for kids of all ages",
    category: "kids",
    featured: true,
    language: "English",
    pages: [
      [
        "A small pause",
        "Sit comfortably. Notice three sounds nearby, then three sounds far away. There is nothing to fix—only something new to hear.",
      ],
      [
        "The sun breath",
        "Stretch your arms out wide as you breathe in. Bring your hands to your heart as you breathe out. Repeat slowly, like sunrise.",
      ],
      [
        "A pocket of calm",
        "Imagine carrying a quiet garden in your pocket. What grows there? Visit it whenever the day feels too loud.",
      ],
    ],
  },
  {
    id: "the-super-kid",
    title: "The Super Kid",
    eyebrow: "KIDS · CONSCIOUS, CREATIVE, INTUITIVE",
    author: "Dr. Sw. Nirav Jayant",
    price: 599,
    description:
      "48 brain-building games and exercises for activating super-sensory abilities—to create a conscious, creative and intuitive kid.",
    about: [
      "Not just games. Not just exercises. These are playful keys to open the hidden powers already inside your child.",
      "Through seeing, hearing, touching, smelling, feeling, imagining, and sensing beyond the five senses, your child will slowly awaken a sharper brain, a deeper intuition, and a more alive awareness. They will learn to focus without force, remember without stress, imagine without limits, and feel the world more deeply.",
      "Conscious—aware of their body, their breath, their thoughts and their feelings. Creative—full of new ideas, stories, colours and possibilities. Intuitive—able to listen to that quiet inner voice that always knows.",
      "All 48 games are designed to be fun, easy and joyful. Children don't feel they are learning; they feel they are playing. And in that play, the brain builds itself—stronger, faster, calmer and more sensitive.",
    ],
    highlights: [
      "62 colourful, thick pages",
      "High-quality prints for beautiful graphics",
      "Spiral binding—opens flat, play anywhere, loved by little hands",
      "Written and designed by the most famous Osho meditation facilitator, Dr. Swami Nirav Jayant.",
    ],
    quote: "“Every child is born with super senses. They just need the right play to remember them.”",
    cover: "/books/the-super-kid.jpg",
    previewImages: [
      "/books/previews/the-super-kid/1-random-word-story.jpg",
      "/books/previews/the-super-kid/2-slow-motion-walk.jpg",
      "/books/previews/the-super-kid/3-guess-the-number.jpg",
    ],
    coverClass: "",
    subtitle: "48 brain-building games for super-sensory abilities",
    category: "kids",
    featured: true,
    language: "English",
    pages: [
      [
        "48 games & exercises",
        "Playful brain-building games that help children activate their super-sensory abilities.",
      ],
    ],
  },
  {
    id: "moneytuition",
    title: "Moneytuition",
    eyebrow: "ABUNDANCE · ADVANCED PRACTICES",
    author: "Dr. Sw. Nirav Jayant",
    price: 599,
    description:
      "What if everything you have been taught about money is limiting you? Advanced tools and practices to release old money conditioning and open to unlimited wealth.",
    about: [
      "Since childhood we have been taught that earning too much money corrupts the mind, that great wealth is not in our destiny, and that we should only stretch our legs according to the length of our blanket. Countless such ideas were planted into our unconscious by society, parents, teachers and relatives.",
      "We could not resist them then—we did not have the maturity or the awareness. Repeated again and again, they sank so deep that we don't even notice them. This book helps you see these blockages and let them go.",
      "Through powerful clearing statements and “Dear Universe” questions—like “What would it take for me to receive money in multiple currencies?”—you begin to release what blocks you from receiving money, creating money and experiencing unlimited wealth.",
    ],
    highlights: [
      "Clearing statements to release limiting money beliefs",
      "“Dear Universe” questions to open new possibilities",
      "Beautifully illustrated pages",
    ],
    quote: "“I release and transform all energies, beliefs and limitations that block me from receiving money.”",
    cover: "/books/moneytuition.jpg",
    previewImages: [
      "/books/previews/moneytuition/1-introduction.jpg",
      "/books/previews/moneytuition/2-release-and-transform.jpg",
      "/books/previews/moneytuition/3-dear-universe-currencies.jpg",
      "/books/previews/moneytuition/4-dear-universe-celebrate.jpg",
    ],
    coverClass: "",
    subtitle: "Beyond everything you are taught about money",
    category: "abundance",
    featured: true,
    language: "English",
    pages: [
      [
        "Advance tools & practices",
        "This book goes beyond budgets and rules. It invites you to look at money through awareness and intuition.",
      ],
    ],
  },
  {
    id: "jagran-ke-sutra",
    title: "जागरण के सूत्र",
    eyebrow: "HINDI · हर सप्ताह एक ध्यान",
    author: "डॉ. स्वामी नीरव जयंत",
    price: 599,
    description:
      "एक वर्ष ध्यान की यात्रा का—हर सप्ताह जीने के लिए एक नया सूत्र, एक नया ध्यान।",
    about: [
      "जागरण के सूत्र पूरे वर्ष की एक ध्यान-यात्रा है। हर सप्ताह एक नया सूत्र—प्रचुरता, मैत्री, शरीर, अकेला हो जाना—जिसे पूरे सप्ताह जीना है, केवल पढ़ना नहीं।",
      "हर सूत्र के साथ एक सरल ध्यान या भाव-प्रयोग है: थोड़ा रुककर देखना, आँखें बंद करके अनुभव करना, स्वयं को गले लगाना, अपनी साँसों की कोमल गति को महसूस करना।",
      "सुंदर चित्रों से सजे पन्ने, जो हर सप्ताह आपको याद दिलाते हैं कि आनंद, प्रेम और शांति बाहर नहीं, आपके भीतर ही हैं।",
    ],
    highlights: [
      "हर सप्ताह एक सूत्र और एक ध्यान-प्रयोग",
      "सुंदर रंगीन चित्रों के साथ",
    ],
    quote: "“प्रचुरता बाहर नहीं, आपके भीतर ही बह रही है।”",
    cover: "/books/jagran-ke-sutra.jpg",
    previewImages: [
      "/books/previews/jagran-ke-sutra/1-week-01-prachurta.jpg",
      "/books/previews/jagran-ke-sutra/2-week-05-maitri.jpg",
      "/books/previews/jagran-ke-sutra/3-week-11-shareer.jpg",
      "/books/previews/jagran-ke-sutra/4-week-22-akela-ho-jana.jpg",
    ],
    coverClass: "",
    subtitle: "एक वर्ष ध्यान की यात्रा का",
    category: "meditation",
    featured: true,
    language: "Hindi",
    pages: [["जागरण के सूत्र", "एक वर्ष ध्यान की यात्रा का।"]],
  },
  {
    id: "breath",
    title: "Playing with Breath",
    eyebrow: "BREATHWORK · FOR KIDS",
    author: "Sw. Nirav Jayant",
    price: 500,
    description:
      "64 fun-to-do breathing techniques for kids to make them healthy, focused and joyful. No boring instructions—just playful breaths, giggles, games, sounds and imagination.",
    about: [
      "All the techniques are fun-oriented, which children love to do. No sitting still for hours—just playful breaths that teach a child the power of their own breath.",
      "This book helps a child keep calm and centered. When a child learns to breathe well, they learn to handle anger, fear, restlessness, exam stress and overthinking with ease. They sleep better, concentrate better, and feel happier—naturally.",
      "With every breath, your child learns to come back to themselves. To slow down. To feel safe inside. To find their own stillness, even in a noisy world.",
      "Because breath is the first meditation a child ever knows. Welcome to Playing With Breath—where every breath becomes play, and every play becomes peace.",
    ],
    highlights: [
      "64 colourful, thick pages",
      "High-quality prints for beautiful graphics",
      "Spiral binding—made to be opened, played with, carried around, and loved by little hands",
      "Written and designed by the most famous Osho meditation facilitator, Dr. Swami Nirav Jayant.",
    ],
    quote: "“When a child learns to play with breath, breath becomes their best friend for life.”",
    cover: "/books/playing-with-breath.jpg",
    coverClass: "cover-breath",
    subtitle: "64 fun breathing techniques for kids",
    category: "kids",
    featured: true,
    language: "English",
    pages: [
      [
        "Dandelion wish",
        "Hold an imaginary dandelion. Breathe in slowly through your nose, then blow out gently and watch the seeds float away.",
      ],
      [
        "Balloon belly",
        "Place your hands on your tummy. Breathe in and let it grow round like a balloon. Breathe out and let it softly shrink.",
      ],
      [
        "Bumblebee hum",
        "Close your eyes and breathe in. As you breathe out, hum like a bee. Feel the tiny buzz in your face and chest.",
      ],
    ],
  },
  {
    id: "meditation-365",
    title: "Meditation 365",
    eyebrow: "DAILY PRACTICE · YEAR-ROUND",
    author: "Sw. Nirav Jayant",
    price: 699,
    description:
      "Simple, easy-to-do daily meditations designed to fit into your everyday life—one for every day of the year.",
    quote: "“A single quiet minute, repeated, becomes a different life.”",
    cover: "/books/meditation-365.jpg",
    coverClass: "cover-365",
    subtitle: "365 simple daily meditations for everyday life",
    category: "meditation",
    featured: false,
    language: "English",
    pages: [
      [
        "Day 1 · Arrive",
        "Sit where you are. Feel the weight of your body resting down. Let this moment be the whole of your practice today.",
      ],
      [
        "Day 2 · Count ten",
        "Count ten slow breaths. If you lose count, smile and begin again at one. Beginning again is the practice.",
      ],
      [
        "Day 3 · Morning light",
        "Before reaching for your phone, look toward the light for three breaths. Let the day find you first.",
      ],
    ],
  },
  {
    id: "zenful-21",
    title: "Zenful 21 Days",
    eyebrow: "ZEN · 21-DAY JOURNEY",
    author: "Sw. Nirav Jayant",
    price: 549,
    description:
      "Small Zen meditation techniques for your daily life—a gentle 21-day journey into stillness, presence, and ease.",
    quote: "“This very body the Buddha; this very earth the lotus paradise.”",
    cover: "/books/zenful-21-days.png",
    coverClass: "cover-zenful-21",
    subtitle: "Small Zen meditation techniques for daily life",
    category: "meditation",
    featured: true,
    language: "English",
    pages: [
      [
        "Day 1 · Just sitting",
        "Sit with nothing to achieve. When thoughts come, let them pass like clouds. You are the sky, not the weather.",
      ],
      [
        "Day 2 · Walking slowly",
        "Walk ten steps as slowly as you can. Feel the heel, the arch, the toes. Arrive fully with every step.",
      ],
      [
        "Day 3 · One thing",
        "Wash one cup with total attention. The warmth of water, the curve of the cup. This is meditation too.",
      ],
    ],
  },
  {
    id: "release-relax",
    title: "Release and Relax",
    eyebrow: "SOMATIC · EMOTIONAL RELEASE",
    author: "Sw. Nirav Jayant",
    price: 599,
    description:
      "30 simple yet powerful somatic ways to release anger—safely letting emotion move through the body so calm can return.",
    quote: "“What we allow to move, moves on.”",
    cover: "/books/release-and-relax.png",
    coverClass: "cover-release",
    subtitle: "30 somatic ways to release anger",
    category: "meditation",
    featured: true,
    language: "English",
    pages: [
      [
        "Shake it out",
        "Stand and shake your hands, then your arms, then your whole body for one minute. Let the energy leave through your fingertips.",
      ],
      [
        "The long exhale",
        "Breathe in for four counts, out for eight. A longer exhale tells the body it is safe to soften.",
      ],
      [
        "Press and release",
        "Press your palms together hard for five breaths. Then let go completely and notice the warmth that follows.",
      ],
    ],
  },
  {
    id: "unwinding-anxiety",
    title: "Release & Relax",
    eyebrow: "SOMATIC · ANGER & ANXIETY",
    author: "Dr. Sw. Nirav Jayant",
    price: 599,
    description:
      "59 somatic practices to transform anger and anxiety. Not to control them. Not to suppress them. To release them.",
    about: [
      "Simple, easy-to-do 5 to 10-minute body resets—deeply transformative, advanced techniques that absorb and transform anger and anxiety and bring you to a state of relaxation.",
      "Anger and anxiety are not in your mind alone. They live in your body—in tight shoulders, a clenched jaw, a racing heart, shallow breath, restless hands. When you release them from the body, the mind becomes quiet on its own.",
      "These 59 practices help you shake it out, breathe it out, move it out, sound it out, and let it go—gently, safely and playfully. In just 5 to 10 minutes you can come back to yourself. Calmer. Lighter. Clearer. More alive.",
      "This is not a book to just read. It is a book to do. To breathe with. To move with. To relax with.",
    ],
    highlights: [
      "59 somatic practices, 5–10 minutes each",
      "Pictorial guidance and beautiful illustrations—easy to follow, easy to do anywhere",
    ],
    quote: "“Anger becomes energy, anxiety becomes awareness, and your body becomes your healer.”",
    cover: "/books/unwinding-anxiety.jpg",
    coverClass: "cover-anxiety",
    subtitle: "59 somatic practices to transform anger and anxiety",
    category: "meditation",
    featured: true,
    language: "English",
    pages: [
      [
        "Hand on heart",
        "Place one hand on your heart and one on your belly. Feel the warmth. Breathe as if breathing into your hands.",
      ],
      [
        "Five things",
        "Name five things you can see, four you can touch, three you can hear. Let your senses bring you back.",
      ],
      [
        "Butterfly hug",
        "Cross your arms over your chest and tap your shoulders slowly, left then right. Let the rhythm settle you.",
      ],
    ],
  },
  {
    id: "somehow",
    title: "Somehow",
    eyebrow: "ABUNDANCE · POSSIBILITY",
    author: "Dr. Sw. Nirav Jayant",
    price: 649,
    description:
      "The art of living in the world of possibilities—opening to abundance, trusting the unknown, and finding a way, somehow.",
    quote: "“When you stop insisting on how, life begins to show you somehow.”",
    cover: "/books/somehow.jpg",
    coverClass: "cover-somehow",
    subtitle: "Art of living in the world of possibilities",
    category: "abundance",
    featured: false,
    language: "English",
    pages: [
      [
        "Open hands",
        "Notice where you are gripping—your jaw, your plans, your expectations. Open your hands and let something new arrive.",
      ],
      [
        "Already enough",
        "Write down three things you already have that you once wished for. Abundance begins with noticing.",
      ],
      [
        "The next small step",
        "You do not need to see the whole road. Ask only: what is one small step I can take today?",
      ],
    ],
  },
  {
    id: "zenful",
    title: "Zenful Stories",
    eyebrow: "WISDOM · ABUNDANCE",
    author: "Sw. Nirav Jayant",
    price: 599,
    description:
      "Everyday wisdom from ancient Zen masters. A thoughtful companion for building a quieter, more conscious everyday practice.",
    quote: "“A gentle invitation to pause, soften, and meet this moment exactly as it is.”",
    cover: "/books/zenful-stories.png",
    coverClass: "cover-zenful",
    subtitle: "Everyday wisdom from ancient Zen masters",
    category: "meditation",
    featured: false,
    language: "English",
    pages: [
      [
        "The empty cup",
        "A scholar came to learn about Zen. The master poured tea until the cup overflowed. “Like this cup,” he said, “you are full of ideas.”",
      ],
      [
        "Just this step",
        "The path is not waiting at the end of the journey. It is beneath your feet, whole and complete, in this single step.",
      ],
      [
        "The sound of rain",
        "When rain comes, listen without naming it. For one quiet minute, let the world arrive before your thoughts do.",
      ],
    ],
  },
];
