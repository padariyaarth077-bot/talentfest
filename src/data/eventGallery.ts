export type GalleryCitySlug =
  | "vadodara"
  | "surat"
  | "rajkot"
  | "ahmedabad"
  | "somnath"
  | "kutch"
  | "bhavnagar"
  | "junagadh";

export type GalleryCategory =
  | "dance"
  | "singing"
  | "music"
  | "painting"
  | "acting"
  | "creative-writing"
  | "photography"
  | "highlights";

export interface GalleryCity {
  slug: GalleryCitySlug;
  name: string;
}

export interface GalleryItem {
  id: string;
  city: GalleryCitySlug;
  cityName: string;
  category: GalleryCategory;
  mediaType: "photo";
  title: string;
  description: string;
  image: string;
  alt: string;
  featured: boolean;
  winner: boolean;
  highlight: boolean;
  width: number;
  height: number;
}

export const galleryCities: GalleryCity[] = [
  { slug: "vadodara", name: "Vadodara" },
  { slug: "surat", name: "Surat" },
  { slug: "rajkot", name: "Rajkot" },
  { slug: "ahmedabad", name: "Ahmedabad" },
  { slug: "somnath", name: "Somnath" },
  { slug: "kutch", name: "Kutch" },
  { slug: "bhavnagar", name: "Bhavnagar" },
  { slug: "junagadh", name: "Junagadh" },
];

const categoryMeta: Array<{
  slug: GalleryCategory;
  file: string;
  title: string;
  description: string;
  alt: string;
  featured?: boolean;
  winner?: boolean;
  highlight?: boolean;
}> = [
  {
    slug: "dance",
    file: "dance",
    title: "Dance Performance",
    description: "A live Talent Fest dance performance captured on the city stage.",
    alt: "Indian participant performing a dance act at Talent Fest",
    featured: true,
  },
  {
    slug: "singing",
    file: "singing",
    title: "Singing Spotlight",
    description: "A vocalist performing with confidence under warm festival lighting.",
    alt: "Singer performing with a microphone at Talent Fest",
    featured: true,
  },
  {
    slug: "music",
    file: "music",
    title: "Instrumental Music",
    description: "A musician presenting a live instrumental performance for the audience.",
    alt: "Musician performing an instrumental act at Talent Fest",
  },
  {
    slug: "painting",
    file: "painting",
    title: "Painting and Arts",
    description: "An artist creating original work during the live arts competition.",
    alt: "Artist painting during a Talent Fest art competition",
  },
  {
    slug: "acting",
    file: "acting",
    title: "Acting and Theatre",
    description: "Theatre participants performing an expressive stage scene.",
    alt: "Theatre participants acting on stage at Talent Fest",
  },
  {
    slug: "creative-writing",
    file: "writing",
    title: "Creative Writing",
    description: "A writer shaping an original story during the creative writing round.",
    alt: "Creative writing participant working on a story at Talent Fest",
  },
  {
    slug: "photography",
    file: "photography",
    title: "Photography Moment",
    description: "A photographer documenting the atmosphere and action of the event.",
    alt: "Photographer capturing event moments at Talent Fest",
    featured: true,
  },
  {
    slug: "highlights",
    file: "award",
    title: "Awards and Highlights",
    description: "A proud award moment from the Talent Fest city celebration.",
    alt: "Winner receiving a trophy during a Talent Fest award ceremony",
    featured: true,
    winner: true,
    highlight: true,
  },
];

export const eventGallery: GalleryItem[] = galleryCities.flatMap((city) =>
  categoryMeta.map((category) => ({
    id: `${city.slug}-${category.file}-01`,
    city: city.slug,
    cityName: city.name,
    category: category.slug,
    mediaType: "photo" as const,
    title: `${city.name} ${category.title}`,
    description: category.description.replace("city", city.name),
    image: `/gallery/${city.slug}/${city.slug}-${category.file}-01.webp`,
    alt: `${category.alt} ${city.name}`,
    featured: Boolean(category.featured),
    winner: Boolean(category.winner),
    highlight: Boolean(category.highlight),
    width: 900,
    height: 1200,
  })),
);
