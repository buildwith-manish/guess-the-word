/**
 * brands.ts — the 46-question bank for "Guess the Brand: Pixelated".
 *
 * id      : 1..46, also the image file name -> public/pixel-brands/NN.jpg
 * name    : the answer shown at the reveal
 * hint    : small line under the answer (what to look for)
 * palette : 3 brand colours. Only used when the photo is missing, so the video
 *           still renders (a procedural colour-block stand-in gets pixelated).
 * query   : image-search phrase used by scripts/fetch-pixel-images.js
 */
export type PixelLevel = { name: string; accent: string; bg: string };

export const PIXEL_LEVELS: PixelLevel[] = [
  { name: 'BREAKFAST', accent: '#FBBF24', bg: '#2B1B04' },
  { name: 'LUNCH & PANTRY', accent: '#34D399', bg: '#05241B' },
  { name: 'SNACKS & CHIPS', accent: '#FB7185', bg: '#2A0712' },
  { name: 'DINNER & FAST FOOD', accent: '#38E1FF', bg: '#04202B' },
];

export type Brand = {
  id: number;
  name: string;
  level: number;
  hint: string;
  palette: [string, string, string];
  query: string;
};

const B = (
  id: number,
  name: string,
  level: number,
  hint: string,
  palette: [string, string, string],
  query = `${name} package`,
): Brand => ({ id, name, level, hint, palette, query });

export const BRANDS: Brand[] = [
  // Level 1 — Breakfast & Morning Staples (1–12)
  B(1, 'Pop-Tarts', 0, 'Frosted strawberry box', ['#1E5BC6', '#FFFFFF', '#E5334B']),
  B(2, 'Eggo Waffles', 0, 'Yellow box, red script', ['#F6C400', '#D6232A', '#FFE98A']),
  B(3, 'Cheerios', 0, 'Yellow box, cereal bowl', ['#F9D71C', '#E8A800', '#FFFFFF']),
  B(4, 'Froot Loops', 0, 'Toucan Sam’s rainbow beak', ['#D7262B', '#FFC400', '#2E9BEA']),
  B(5, 'Lucky Charms', 0, 'Leprechaun hat + marshmallows', ['#C8102E', '#2E8B3D', '#FFD34D']),
  B(6, 'Quaker Instant Oatmeal', 0, 'Quaker man portrait', ['#E22A2F', '#F2D6A0', '#1F4EA3']),
  B(7, 'Pillsbury Cinnamon Rolls', 0, 'Blue can + Doughboy', ['#2563B8', '#FFFFFF', '#C9A06B']),
  B(8, 'Tropicana Orange Juice', 0, 'Straw stuck in an orange', ['#F58220', '#FFFFFF', '#3E9B3A']),
  B(9, 'Jimmy Dean Breakfast Sandwiches', 0, 'Sunburst yellow + dark red', ['#F2B705', '#8E1B1B', '#FFF1B0']),
  B(10, 'Nutella', 0, 'Hazelnut spread jar', ['#FFFFFF', '#C8102E', '#5B3A29'], 'Nutella jar'),
  B(11, 'Smucker’s Jelly', 0, 'Gingham jar lid', ['#B3202A', '#FFFFFF', '#6B2D5C'], 'Smuckers jelly jar'),
  B(12, 'Jif Peanut Butter', 0, 'Blue, red & green stripes', ['#1F4EA3', '#D7262B', '#2E8B3D']),

  // Level 2 — Lunch & Pantry Staples (13–25)
  B(13, 'Kraft Mac & Cheese', 1, 'Royal blue box, noodle smile', ['#1F4EA3', '#F5A800', '#FFFFFF'], 'Kraft Macaroni and Cheese box'),
  B(14, 'Campbell’s Tomato Soup', 1, 'Red & white can', ['#D7262B', '#FFFFFF', '#C9A24D'], 'Campbells tomato soup can'),
  B(15, 'Heinz Ketchup', 1, 'Keystone label', ['#B71C1C', '#2E7D32', '#FFFFFF'], 'Heinz tomato ketchup bottle'),
  B(16, 'French’s Mustard', 1, 'Neon-yellow squeeze bottle', ['#FFD400', '#D7262B', '#FFFFFF'], 'Frenchs classic yellow mustard bottle'),
  B(17, 'Oscar Mayer', 1, 'Red & yellow logo pack', ['#D7262B', '#FFD400', '#FFFFFF'], 'Oscar Mayer hot dogs package'),
  B(18, 'Lunchables', 1, 'Yellow tray box', ['#FFD400', '#1F4EA3', '#D7262B']),
  B(19, 'Skippy Peanut Butter', 1, 'Teal label, red script', ['#2BA3B8', '#D7262B', '#FFFFFF'], 'Skippy peanut butter jar'),
  B(20, 'Hidden Valley Ranch', 1, 'Rolling green hills', ['#FFFFFF', '#3E9B3A', '#4FA3E0'], 'Hidden Valley Ranch dressing bottle'),
  B(21, 'Chef Boyardee', 1, 'Chef on a yellow label', ['#F2C200', '#2E8B3D', '#D7262B'], 'Chef Boyardee can'),
  B(22, 'Barilla Pasta', 1, 'Navy box, red oval', ['#1B3A7A', '#D7262B', '#FFFFFF'], 'Barilla pasta box'),
  B(23, 'Bumble Bee Tuna', 1, 'White can, bee logo', ['#FFFFFF', '#FFD400', '#1F4EA3'], 'Bumble Bee tuna can'),
  B(24, 'Velveeta', 1, 'Bright yellow cheese block box', ['#FFC81E', '#D7262B', '#FFFFFF'], 'Velveeta cheese box'),
  B(25, 'Hot Pockets', 1, 'Red box, golden crust', ['#D7262B', '#E0A458', '#FFD400']),

  // Level 3 — Afternoon Snacks & Chips (26–38)
  B(26, 'Goldfish Crackers', 2, 'Orange bag, smiling cracker', ['#F58220', '#FFD400', '#FFFFFF']),
  B(27, 'Cheez-It', 2, 'Red box, square crackers', ['#D7262B', '#F2B705', '#FFFFFF']),
  B(28, 'Doritos Nacho Cheese', 2, 'Red bag, triangle logo', ['#D7262B', '#FFD400', '#111111']),
  B(29, 'Doritos Cool Ranch', 2, 'Electric-blue bag', ['#1E6FE0', '#7BD1FF', '#FFFFFF']),
  B(30, 'Lay’s Classic', 2, 'Canary-yellow bag', ['#FFD400', '#D7262B', '#FFFFFF'], 'Lays classic potato chips bag'),
  B(31, 'Cheetos', 2, 'Orange bag, Chester Cheetah', ['#F58220', '#FFD400', '#111111']),
  B(32, 'Pringles', 2, 'Tall can, Mr. P’s mustache', ['#D7262B', '#FFFFFF', '#111111']),
  B(33, 'Tostitos', 2, 'Two people dipping a chip', ['#FFFFFF', '#D7262B', '#F2B705']),
  B(34, 'Ritz Crackers', 2, 'Red box, blue circle', ['#D7262B', '#1F4EA3', '#FFD400']),
  B(35, 'Keebler', 2, 'Tree-hollow graphic', ['#2E8B3D', '#8B5A2B', '#FFFFFF'], 'Keebler cookies package'),
  B(36, 'Oreo', 2, 'Blue wrapper, milk splash', ['#1F4EA3', '#111111', '#FFFFFF'], 'Oreo cookies package'),
  B(37, 'Chips Ahoy!', 2, 'Bright blue pack', ['#1F4EA3', '#8B5A2B', '#FFFFFF']),
  B(38, 'Slim Jim', 2, 'Yellow & red fiery snack stick', ['#FFD400', '#D7262B', '#111111']),

  // Level 4 — Dinner, Fast Food & Frozen Classics (39–46)
  B(39, 'Chick-fil-A', 3, 'Red “C” chicken logo', ['#E51636', '#FFFFFF', '#F2B705'], 'Chick-fil-A sandwich bag'),
  B(40, 'McDonald’s', 3, 'Golden Arches on red', ['#DA291C', '#FFC72C', '#FFFFFF'], 'McDonalds fries carton'),
  B(41, 'Taco Bell', 3, 'Purple bell logo', ['#702082', '#FFFFFF', '#F2B705'], 'Taco Bell crunchy taco'),
  B(42, 'Wendy’s', 3, 'Red square, pigtails girl', ['#E2203D', '#FFFFFF', '#F2B705'], 'Wendys burger wrapper'),
  B(43, 'Stouffer’s Lasagna', 3, 'Deep red frozen box', ['#B71C1C', '#1B2A5A', '#FFFFFF'], 'Stouffers lasagna box'),
  B(44, 'Totino’s Pizza Rolls', 3, 'Red bag, yellow burst', ['#D7262B', '#FFD400', '#8B5A2B'], 'Totinos pizza rolls bag'),
  B(45, 'DiGiorno Pizza', 3, 'Black box, Italian banner', ['#111111', '#2E8B3D', '#D7262B'], 'DiGiorno frozen pizza box'),
  B(46, 'Ben & Jerry’s', 3, 'Pastoral pint with cow', ['#4FA3E0', '#3E9B3A', '#FFFFFF'], 'Ben and Jerrys ice cream pint'),
];

export const imageFile = (id: number) => `pixel-brands/${String(id).padStart(2, '0')}.jpg`;
