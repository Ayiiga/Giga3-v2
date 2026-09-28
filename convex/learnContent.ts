/**
 * Expanded concrete Learn library. Existing quizzes, rhymes, and lessons stay
 * in the GigaLearn client catalog; this file only adds grouped object lists.
 */

export type LearnItem = {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
};

export const LEARN_PAGE_SIZE = 6;

export const LEARN_FRUITS: LearnItem[] = [
  { id: "apple", emoji: "🍎", title: "Apple", subtitle: "Count 1–5 fruits" },
  { id: "banana", emoji: "🍌", title: "Banana", subtitle: "Count 1–5 fruits" },
  { id: "orange", emoji: "🍊", title: "Orange", subtitle: "Count 1–5 fruits" },
  { id: "mango", emoji: "🥭", title: "Mango", subtitle: "Count 1–5 fruits" },
  { id: "pawpaw", emoji: "🍈", title: "Pawpaw", subtitle: "Count 1–5 fruits" },
  { id: "pineapple", emoji: "🍍", title: "Pineapple", subtitle: "Count 1–5 fruits" },
  { id: "watermelon", emoji: "🍉", title: "Watermelon", subtitle: "Count 1–5 fruits" },
  { id: "grapes", emoji: "🍇", title: "Grapes", subtitle: "Count 1–5 fruits" },
  { id: "strawberry", emoji: "🍓", title: "Strawberry", subtitle: "Count 1–5 fruits" },
  { id: "coconut", emoji: "🥥", title: "Coconut", subtitle: "Count 1–5 fruits" },
  { id: "pear", emoji: "🍐", title: "Pear", subtitle: "Count 1–5 fruits" },
  { id: "lemon", emoji: "🍋", title: "Lemon", subtitle: "Count 1–5 fruits" },
  { id: "avocado", emoji: "🥑", title: "Avocado", subtitle: "Count 1–5 fruits" },
  { id: "guava", emoji: "🍈", title: "Guava", subtitle: "Count 1–5 fruits" },
  { id: "plantain", emoji: "🍌", title: "Plantain", subtitle: "Count 1–5 fruits" },
];

export const LEARN_VEGETABLES: LearnItem[] = [
  { id: "carrot", emoji: "🥕", title: "Carrot", subtitle: "See & touch veggies" },
  { id: "potato", emoji: "🥔", title: "Potato", subtitle: "See & touch veggies" },
  { id: "tomato", emoji: "🍅", title: "Tomato", subtitle: "See & touch veggies" },
  { id: "onion", emoji: "🧅", title: "Onion", subtitle: "See & touch veggies" },
  { id: "pepper", emoji: "🌶️", title: "Pepper", subtitle: "See & touch veggies" },
  { id: "cabbage", emoji: "🥬", title: "Cabbage", subtitle: "See & touch veggies" },
  { id: "okra", emoji: "🫛", title: "Okra", subtitle: "See & touch veggies" },
  { id: "garden-egg", emoji: "🍆", title: "Garden egg", subtitle: "See & touch veggies" },
  { id: "beans", emoji: "🫘", title: "Beans", subtitle: "See & touch veggies" },
  { id: "cucumber", emoji: "🥒", title: "Cucumber", subtitle: "See & touch veggies" },
  { id: "corn", emoji: "🌽", title: "Corn", subtitle: "See & touch veggies" },
  { id: "ginger", emoji: "🫚", title: "Ginger", subtitle: "See & touch veggies" },
];

export const LEARN_ANIMALS: LearnItem[] = [
  { id: "dog", emoji: "🐶", title: "Dog", subtitle: "Animals around us" },
  { id: "cat", emoji: "🐱", title: "Cat", subtitle: "Animals around us" },
  { id: "chicken", emoji: "🐔", title: "Chicken", subtitle: "Animals around us" },
  { id: "goat", emoji: "🐐", title: "Goat", subtitle: "Animals around us" },
  { id: "sheep", emoji: "🐑", title: "Sheep", subtitle: "Animals around us" },
  { id: "cow", emoji: "🐄", title: "Cow", subtitle: "Animals around us" },
  { id: "pig", emoji: "🐷", title: "Pig", subtitle: "Animals around us" },
  { id: "duck", emoji: "🦆", title: "Duck", subtitle: "Animals around us" },
  { id: "rabbit", emoji: "🐰", title: "Rabbit", subtitle: "Animals around us" },
  { id: "fish", emoji: "🐟", title: "Fish", subtitle: "Animals around us" },
  { id: "bird", emoji: "🐦", title: "Bird", subtitle: "Animals around us" },
  { id: "monkey", emoji: "🐵", title: "Monkey", subtitle: "Animals around us" },
  { id: "elephant", emoji: "🐘", title: "Elephant", subtitle: "Animals around us" },
  { id: "lion", emoji: "🦁", title: "Lion", subtitle: "Animals around us" },
  { id: "turtle", emoji: "🐢", title: "Turtle", subtitle: "Animals around us" },
  { id: "snake", emoji: "🐍", title: "Snake", subtitle: "Animals around us" },
  { id: "frog", emoji: "🐸", title: "Frog", subtitle: "Animals around us" },
  { id: "horse", emoji: "🐴", title: "Horse", subtitle: "Animals around us" },
  { id: "donkey", emoji: "🐴", title: "Donkey", subtitle: "Animals around us" },
  { id: "parrot", emoji: "🦜", title: "Parrot", subtitle: "Animals around us" },
];

export const LEARN_BODY: LearnItem[] = [
  { id: "hands", emoji: "🙌", title: "Hands", subtitle: "Touch & see body" },
  { id: "eyes", emoji: "👀", title: "Eyes", subtitle: "Touch & see body" },
  { id: "nose", emoji: "👃", title: "Nose", subtitle: "Touch & see body" },
  { id: "mouth", emoji: "👄", title: "Mouth", subtitle: "Touch & see body" },
  { id: "ears", emoji: "👂", title: "Ears", subtitle: "Touch & see body" },
  { id: "head", emoji: "🗣️", title: "Head", subtitle: "Touch & see body" },
  { id: "legs", emoji: "🦵", title: "Legs", subtitle: "Touch & see body" },
  { id: "feet", emoji: "🦶", title: "Feet", subtitle: "Touch & see body" },
  { id: "teeth", emoji: "😁", title: "Teeth", subtitle: "Touch & see body" },
  { id: "hair", emoji: "💇", title: "Hair", subtitle: "Touch & see body" },
  { id: "fingers", emoji: "👆", title: "Fingers", subtitle: "Touch & see body" },
  { id: "stomach", emoji: "🤰", title: "Stomach", subtitle: "Touch & see body" },
];

export function pageOf<T>(items: readonly T[], page: number, pageSize = LEARN_PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, page), pages);
  const start = (current - 1) * pageSize;
  return {
    page: current,
    pages,
    items: items.slice(start, start + pageSize),
  };
}
