export interface BookItem {
  id: string;
  title: string;
  author: string;
  price: number; // in INR
}

export const CATALOG: Record<string, BookItem> = {
  playing: {
    id: "playing",
    title: "Playing with Meditation",
    author: "Sw. Nirav Jayant",
    price: 500,
  },
  zenful: {
    id: "zenful",
    title: "Zenful Stories",
    author: "Sw. Nirav Jayant",
    price: 599,
  },
  breath: {
    id: "breath",
    title: "Playing with Breath",
    author: "Sw. Nirav Jayant",
    price: 500,
  },
  "meditation-365": {
    id: "meditation-365",
    title: "Meditation 365",
    author: "Sw. Nirav Jayant",
    price: 699,
  },
  "zenful-21": {
    id: "zenful-21",
    title: "Zenful 21 Days",
    author: "Sw. Nirav Jayant",
    price: 549,
  },
  "release-relax": {
    id: "release-relax",
    title: "Release and Relax",
    author: "Sw. Nirav Jayant",
    price: 599,
  },
  "unwinding-anxiety": {
    id: "unwinding-anxiety",
    title: "Unwinding Anxiety",
    author: "Sw. Nirav Jayant",
    price: 599,
  },
  somehow: {
    id: "somehow",
    title: "Somehow",
    author: "Dr. Sw. Nirav Jayant",
    price: 649,
  },
};
