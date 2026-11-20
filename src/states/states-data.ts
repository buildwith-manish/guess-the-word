/**
 * Video 4 state facts. Single source for names, order, levels, hints and facts.
 * Geometry lives in states-geo.json (matched by `name`).
 * Every `fact` still needs a human check (factVerify = true, manual step M1).
 */

export type Region = 'West' | 'Midwest' | 'South' | 'Northeast';
export type Level = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
export type CropSide = 'left' | 'right' | 'top' | 'bottom';
export type HintEmoji = readonly [string, string, string];

export interface StateInfo {
  /** 1-50, video order. */
  readonly id: number;
  /** Two-letter abbreviation. */
  readonly key: string;
  readonly name: string;
  readonly region: Region;
  readonly capital: string;
  readonly nickname: string;
  readonly level: Level;
  readonly hintEmoji: HintEmoji;
  /** Degrees, HARD only. Never within 25 degrees of 0, 90, 180 or 270. */
  readonly rotation?: number;
  /** MEDIUM only. */
  readonly cropSide?: CropSide;
  /** 8 words or fewer; empty string = no fact. */
  readonly fact: string;
  /** True on every fact until it has been checked by hand. */
  readonly factVerify: true;
}

type Row = Omit<StateInfo, 'id' | 'factVerify'>;

const ROWS: readonly Row[] = [
  // ---- EASY (14) ----
  { key: 'TX', name: 'Texas', region: 'South', capital: 'Austin', nickname: 'Lone Star State', level: 'EASY', hintEmoji: ['🤠', '🛢️', '🌵'], fact: 'Was an independent republic before statehood.' },
  { key: 'FL', name: 'Florida', region: 'South', capital: 'Tallahassee', nickname: 'Sunshine State', level: 'EASY', hintEmoji: ['🌴', '🐊', '🍊'], fact: 'Home to Kennedy Space Center.' },
  { key: 'CA', name: 'California', region: 'West', capital: 'Sacramento', nickname: 'Golden State', level: 'EASY', hintEmoji: ['🌉', '☀️', '🎬'], fact: 'Gold Rush began here in 1848.' },
  { key: 'AK', name: 'Alaska', region: 'West', capital: 'Juneau', nickname: 'The Last Frontier', level: 'EASY', hintEmoji: ['🐻', '🏔️', '❄️'], fact: 'Bought from Russia in 1867.' },
  { key: 'HI', name: 'Hawaii', region: 'West', capital: 'Honolulu', nickname: 'Aloha State', level: 'EASY', hintEmoji: ['🌺', '🌋', '🏄'], fact: 'Made up of volcanic islands.' },
  { key: 'MI', name: 'Michigan', region: 'Midwest', capital: 'Lansing', nickname: 'Great Lakes State', level: 'EASY', hintEmoji: ['🚗', '❄️', '🌊'], fact: 'Borders four of the five Great Lakes.' },
  { key: 'LA', name: 'Louisiana', region: 'South', capital: 'Baton Rouge', nickname: 'Pelican State', level: 'EASY', hintEmoji: ['🎷', '🦞', '🎭'], fact: 'Has parishes instead of counties.' },
  { key: 'OK', name: 'Oklahoma', region: 'South', capital: 'Oklahoma City', nickname: 'Sooner State', level: 'EASY', hintEmoji: ['🐂', '🌪️', '🛢️'], fact: 'Famous for its 1889 Land Run.' },
  { key: 'ID', name: 'Idaho', region: 'West', capital: 'Boise', nickname: 'Gem State', level: 'EASY', hintEmoji: ['🥔', '🏔️', '🌲'], fact: 'Famous for its potatoes.' },
  { key: 'NV', name: 'Nevada', region: 'West', capital: 'Carson City', nickname: 'Silver State', level: 'EASY', hintEmoji: ['🎰', '🌵', '🏜️'], fact: 'Legalized casino gambling in 1931.' },
  { key: 'ME', name: 'Maine', region: 'Northeast', capital: 'Augusta', nickname: 'Pine Tree State', level: 'EASY', hintEmoji: ['🦞', '🌲', '⚓'], fact: 'Easternmost state in the country.' },
  { key: 'MA', name: 'Massachusetts', region: 'Northeast', capital: 'Boston', nickname: 'Bay State', level: 'EASY', hintEmoji: ['🍵', '⚓', '🎓'], fact: 'Site of the Boston Tea Party.' },
  { key: 'NY', name: 'New York', region: 'Northeast', capital: 'Albany', nickname: 'Empire State', level: 'EASY', hintEmoji: ['🗽', '🍎', '🚕'], fact: 'Erie Canal connected the Hudson to Lake Erie.' },
  { key: 'WA', name: 'Washington', region: 'West', capital: 'Olympia', nickname: 'Evergreen State', level: 'EASY', hintEmoji: ['🌲', '☕', '🍎'], fact: 'Only state named after a president.' },

  // ---- MEDIUM (14), cropSide fixed per state ----
  { key: 'CO', name: 'Colorado', region: 'West', capital: 'Denver', nickname: 'Centennial State', level: 'MEDIUM', hintEmoji: ['⛷️', '🏔️', '🌄'], cropSide: 'left', fact: 'Its capital is nicknamed the Mile High City.' },
  { key: 'WY', name: 'Wyoming', region: 'West', capital: 'Cheyenne', nickname: 'Equality State', level: 'MEDIUM', hintEmoji: ['🐴', '🦬', '♨️'], cropSide: 'top', fact: 'Home to Yellowstone, the first national park.' },
  { key: 'UT', name: 'Utah', region: 'West', capital: 'Salt Lake City', nickname: 'Beehive State', level: 'MEDIUM', hintEmoji: ['🏜️', '🧂', '⛷️'], cropSide: 'right', fact: 'Home to the Great Salt Lake.' },
  { key: 'NM', name: 'New Mexico', region: 'West', capital: 'Santa Fe', nickname: 'Land of Enchantment', level: 'MEDIUM', hintEmoji: ['🌶️', '🏜️', '🎈'], cropSide: 'bottom', fact: 'Home to Carlsbad Caverns.' },
  { key: 'AZ', name: 'Arizona', region: 'West', capital: 'Phoenix', nickname: 'Grand Canyon State', level: 'MEDIUM', hintEmoji: ['🌵', '☀️', '🏜️'], cropSide: 'left', fact: 'Home to the Grand Canyon.' },
  { key: 'MT', name: 'Montana', region: 'West', capital: 'Helena', nickname: 'Treasure State', level: 'MEDIUM', hintEmoji: ['🦬', '🐻', '🏔️'], cropSide: 'bottom', fact: 'Home to Glacier National Park.' },
  { key: 'OR', name: 'Oregon', region: 'West', capital: 'Salem', nickname: 'Beaver State', level: 'MEDIUM', hintEmoji: ['🌲', '🌧️', '🦫'], cropSide: 'right', fact: 'Home to Crater Lake.' },
  { key: 'MN', name: 'Minnesota', region: 'Midwest', capital: 'Saint Paul', nickname: 'North Star State', level: 'MEDIUM', hintEmoji: ['❄️', '🏒', '🌊'], cropSide: 'top', fact: 'Source of the Mississippi River.' },
  { key: 'WI', name: 'Wisconsin', region: 'Midwest', capital: 'Madison', nickname: 'Badger State', level: 'MEDIUM', hintEmoji: ['🧀', '🐄', '🏈'], cropSide: 'left', fact: 'Famous for cheese and dairy farming.' },
  { key: 'IL', name: 'Illinois', region: 'Midwest', capital: 'Springfield', nickname: 'Prairie State', level: 'MEDIUM', hintEmoji: ['🌽', '🏙️', '🍕'], cropSide: 'bottom', fact: 'Chicago sits on Lake Michigan.' },
  { key: 'OH', name: 'Ohio', region: 'Midwest', capital: 'Columbus', nickname: 'Buckeye State', level: 'MEDIUM', hintEmoji: ['✈️', '🌰', '🏈'], cropSide: 'right', fact: 'Birthplace of the Wright brothers.' },
  { key: 'PA', name: 'Pennsylvania', region: 'Northeast', capital: 'Harrisburg', nickname: 'Keystone State', level: 'MEDIUM', hintEmoji: ['🔔', '🥨', '🏛️'], cropSide: 'top', fact: 'Independence Hall is in Philadelphia.' },
  { key: 'GA', name: 'Georgia', region: 'South', capital: 'Atlanta', nickname: 'Peach State', level: 'MEDIUM', hintEmoji: ['🍑', '🥜', '🥤'], cropSide: 'left', fact: 'Home to the Coca-Cola headquarters.' },
  { key: 'NC', name: 'North Carolina', region: 'South', capital: 'Raleigh', nickname: 'Tar Heel State', level: 'MEDIUM', hintEmoji: ['✈️', '🌊', '🏔️'], cropSide: 'bottom', fact: "Site of the Wright brothers' first flight." },

  // ---- HARD (12), rotation fixed per state ----
  { key: 'VA', name: 'Virginia', region: 'South', capital: 'Richmond', nickname: 'Old Dominion', level: 'HARD', hintEmoji: ['🏛️', '🍂', '⚓'], rotation: 40, fact: 'Jamestown was the first permanent English settlement.' },
  { key: 'WV', name: 'West Virginia', region: 'South', capital: 'Charleston', nickname: 'Mountain State', level: 'HARD', hintEmoji: ['⛏️', '⛰️', '🎸'], rotation: 130, fact: 'Split from Virginia during the Civil War.' },
  { key: 'KY', name: 'Kentucky', region: 'South', capital: 'Frankfort', nickname: 'Bluegrass State', level: 'HARD', hintEmoji: ['🐎', '🥃', '🍗'], rotation: 215, fact: 'Hosts the Kentucky Derby in Louisville.' },
  { key: 'TN', name: 'Tennessee', region: 'South', capital: 'Nashville', nickname: 'Volunteer State', level: 'HARD', hintEmoji: ['🎸', '🎵', '🥃'], rotation: 320, fact: 'Nashville is known as Music City.' },
  { key: 'SC', name: 'South Carolina', region: 'South', capital: 'Columbia', nickname: 'Palmetto State', level: 'HARD', hintEmoji: ['🌴', '🏖️', '🍑'], rotation: 55, fact: 'First state to secede from the Union.' },
  { key: 'AL', name: 'Alabama', region: 'South', capital: 'Montgomery', nickname: 'Yellowhammer State', level: 'HARD', hintEmoji: ['🚀', '🏈', '🌸'], rotation: 150, fact: 'Site of the Selma to Montgomery marches.' },
  { key: 'MS', name: 'Mississippi', region: 'South', capital: 'Jackson', nickname: 'Magnolia State', level: 'HARD', hintEmoji: ['🎸', '🛶', '🌊'], rotation: 235, fact: 'Named after the Mississippi River.' },
  { key: 'MO', name: 'Missouri', region: 'Midwest', capital: 'Jefferson City', nickname: 'Show-Me State', level: 'HARD', hintEmoji: ['🎷', '🍖', '🌽'], rotation: 305, fact: 'Home to the Gateway Arch.' },
  { key: 'AR', name: 'Arkansas', region: 'South', capital: 'Little Rock', nickname: 'Natural State', level: 'HARD', hintEmoji: ['💎', '🌲', '🏞️'], rotation: 120, fact: 'Home to Hot Springs National Park.' },
  { key: 'IN', name: 'Indiana', region: 'Midwest', capital: 'Indianapolis', nickname: 'Hoosier State', level: 'HARD', hintEmoji: ['🏎️', '🏀', '🌽'], rotation: 35, fact: 'Hosts the Indianapolis 500 race.' },
  { key: 'MD', name: 'Maryland', region: 'South', capital: 'Annapolis', nickname: 'Old Line State', level: 'HARD', hintEmoji: ['🦀', '⚓', '🏛️'], rotation: 210, fact: 'Home to the US Naval Academy.' },
  { key: 'NJ', name: 'New Jersey', region: 'Northeast', capital: 'Trenton', nickname: 'Garden State', level: 'HARD', hintEmoji: ['🏖️', '🍅', '🎡'], rotation: 330, fact: 'Site of the first college football game.' },

  // ---- EXPERT (10) ----
  { key: 'IA', name: 'Iowa', region: 'Midwest', capital: 'Des Moines', nickname: 'Hawkeye State', level: 'EXPERT', hintEmoji: ['🌽', '🐷', '🚜'], fact: 'A major corn-growing state.' },
  { key: 'KS', name: 'Kansas', region: 'Midwest', capital: 'Topeka', nickname: 'Sunflower State', level: 'EXPERT', hintEmoji: ['🌻', '🌾', '🌪️'], fact: 'Brown v. Board case began in Topeka.' },
  { key: 'NE', name: 'Nebraska', region: 'Midwest', capital: 'Lincoln', nickname: 'Cornhusker State', level: 'EXPERT', hintEmoji: ['🌽', '🐄', '🌾'], fact: 'Only state with a unicameral legislature.' },
  { key: 'ND', name: 'North Dakota', region: 'Midwest', capital: 'Bismarck', nickname: 'Peace Garden State', level: 'EXPERT', hintEmoji: ['🛢️', '🌾', '❄️'], fact: 'Home to Theodore Roosevelt National Park.' },
  { key: 'SD', name: 'South Dakota', region: 'Midwest', capital: 'Pierre', nickname: 'Mount Rushmore State', level: 'EXPERT', hintEmoji: ['🗿', '🦬', '🏔️'], fact: 'Home to Mount Rushmore.' },
  { key: 'CT', name: 'Connecticut', region: 'Northeast', capital: 'Hartford', nickname: 'Constitution State', level: 'EXPERT', hintEmoji: ['🎓', '🍎', '⚓'], fact: 'Home to Yale University.' },
  { key: 'DE', name: 'Delaware', region: 'South', capital: 'Dover', nickname: 'First State', level: 'EXPERT', hintEmoji: ['🏖️', '🐔', '🥇'], fact: 'First state to ratify the Constitution.' },
  { key: 'NH', name: 'New Hampshire', region: 'Northeast', capital: 'Concord', nickname: 'Granite State', level: 'EXPERT', hintEmoji: ['🍁', '🏔️', '🗳️'], fact: 'Hosts the first presidential primary.' },
  { key: 'VT', name: 'Vermont', region: 'Northeast', capital: 'Montpelier', nickname: 'Green Mountain State', level: 'EXPERT', hintEmoji: ['🍁', '🧀', '🏔️'], fact: 'Famous for maple syrup.' },
  { key: 'RI', name: 'Rhode Island', region: 'Northeast', capital: 'Providence', nickname: 'Ocean State', level: 'EXPERT', hintEmoji: ['⛵', '🏰', '🦞'], fact: "Home to Newport's Gilded Age mansions." },
];

export const STATES: readonly StateInfo[] = ROWS.map((r, i) => ({
  ...r,
  id: i + 1,
  factVerify: true as const,
}));

const BY_KEY: ReadonlyMap<string, StateInfo> = new Map(STATES.map((s) => [s.key, s]));

/** Look up by two-letter key (case-insensitive) or by full name. Throws if unknown. */
export function getState(key: string): StateInfo {
  const k = key.trim();
  const hit = BY_KEY.get(k.toUpperCase()) ?? STATES.find((s) => s.name.toLowerCase() === k.toLowerCase());
  if (!hit) throw new Error(`Unknown state: ${key}`);
  return hit;
}
