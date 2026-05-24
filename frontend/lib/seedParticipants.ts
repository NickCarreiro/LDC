import type { Participant } from "./operationsData";

// ── Name pools ──────────────────────────────────────────────────────────────
const W = [
  "Mary","Catherine","Elizabeth","Anne","Margaret","Clare","Teresa","Rose","Grace",
  "Faith","Joan","Agnes","Cecilia","Monica","Therese","Bridget","Colette","Elena",
  "Frances","Gemma","Helena","Julia","Katherine","Laura","Maria","Natalie","Olivia",
  "Rachel","Sarah","Sophia","Tara","Veronica","Alexandra","Beatrice","Caitlin",
  "Deirdre","Emily","Fiona","Gabrielle","Hannah","Isabel","Jacqueline","Leah",
  "Miriam","Nora","Orla","Regina","Siobhan","Tricia","Victoria","Abigail",
  "Bernadette","Christine","Diana","Edith","Felicity","Gwendolyn","Helen","Irene",
  "Janet","Kristina","Loretta","Maureen","Nicole","Patricia","Rosamund","Stephanie",
  "Tamara","Vivian","Alice","Brianna","Carolyn","Deanna","Evelyn","Florence",
  "Georgina","Harriet","Isabella","Joanna","Kathryn","Lillian","Miranda","Noelle",
  "Penelope","Rebecca","Samantha","Theresa","Valerie","Whitney","Anna","Bethany",
  "Clara","Dorothy","Elaine","Gloria","Hazel","Ingrid","Jennifer","Kara","Lydia",
  "Marie","Nancy","Priscilla","Ruth","Sienna","Tessa","Ursula","Wendy","Yvonne",
  "Zoe","Adele","Brigid","Cara","Delia","Eileen","Flannery","Grainne","Honora",
  "Ita","Jocelyn","Keelin","Liadan","Muirne","Niamh","Oonagh","Sorcha"
];

const M = [
  "Michael","John","Thomas","Patrick","James","Joseph","Robert","William","Richard",
  "David","George","Charles","Francis","Anthony","Edward","Christopher","Andrew",
  "Matthew","Peter","Paul","Mark","Luke","Brendan","Colin","Daniel","Eric","Frank",
  "Gregory","Henry","Ian","Jack","Kevin","Lawrence","Martin","Nicholas","Oliver",
  "Philip","Quentin","Raymond","Stephen","Timothy","Victor","Walter","Xavier",
  "Zachary","Aaron","Brian","Caleb","Dennis","Ethan","Felix","Gabriel","Harold",
  "Ivan","Jonathan","Kenneth","Liam","Maxwell","Nathan","Owen","Preston","Ryan",
  "Sean","Trevor","Ulysses","Vincent","Warren","Alexander","Benjamin","Cameron",
  "Douglas","Elliot","Frederick","Garrett","Hugh","Ignatius","Jeremy","Kyle",
  "Logan","Mitchell","Neil","Oscar","Pierce","Quincy","Randall","Simon","Terrence",
  "Virgil","Wesley","Adrian","Blake","Craig","Derek","Evan","Flynn","Gerard",
  "Hector","Isaac","Jerome","Kieran","Leonard","Marcus","Nolan","Orlando","Rory",
  "Sebastian","Theodore","Ulrich","Vaughan","Blaise","Cormac","Desmond","Eamon",
  "Feargal","Gearoid","Hamish","Jarlath","Killian","Lorcan","Malachy","Niall",
  "Odhran","Phelan","Ronan","Tadhg"
];

// Two separate surname pools — women and men never share last names with each other
const LAST_W = [
  "Murphy","Walsh","Sullivan","Gallagher","Griffin","Donnelly","Shannon","Reynolds",
  "Farrell","Hennessy","McGrath","Sheridan","Healy","Hayes","Nolan","Slattery",
  "Devlin","Thornton","Kenny","Harrington","Mahoney","Whelan","Finn","Mooney",
  "Buckley","Manning","Tully","Dunne","Sheehan","McGowan","Cahill","Corcoran",
  "Delaney","Burke","Lynch","Kennedy","Quinn","OSullivan","OMalley","ORegan",
  "Feely","Egan","Costello","Kearney","Noonan","Tobin","Twomey","Donoghue",
  "Hickey","Quigley","Rafferty","Talbot","Whitmore","Ahern","Barry","Coughlan",
  "Driscoll","Enright","Fanning","Gorman","Halpin","Ivory","Jennings","Kinsella",
  "Malone","Nagle","Ormsby","Quill","Rooney","Sweeney","Tierney","Yeates",
  "Broderick","Carolan","Dowling","Foran","Geraghty","Harte","Irwin","Jordan",
  "Kearns","Lawless","Maguire","Norris","Ormond","Redmond","Sherlock","Treacy",
  "Verdon","Wynne","Callahan","Deegan","Eustace","Geraghty","Kerrigan","Lenihan",
  "Minogue","Riordan","Staunton","Toomey","Varley","Weston","Blaney","Clifford",
  "Drennan","Eddery","Freyne","Gilbride","Ivers","Jackman","Lehane","Merrigan"
];

const LAST_M = [
  "Smith","Kelly","McCarthy","Connor","Ryan","Brennan","Collins","Flynn","Brady",
  "Moore","Connelly","Ward","Casey","Reilly","Dempsey","Fitzgerald","Moran","Boyle",
  "Power","Reid","Foley","Martin","Murray","Hogan","Holmes","Keogh","Daly","Duffy",
  "Cronin","Joyce","Cleary","Stapleton","Regan","Coffey","Curran","Chambers","Purcell",
  "Fox","Lyons","Gleeson","Hanlon","Cullen","Carroll","Doyle","Higgins","Byrne",
  "OBrien","ONeill","OLeary","Larkin","Fahy","Dillon","Coyne","Fitzpatrick",
  "Quigley","Rafferty","Talbot","Underwood","Yorke","Aldrich","Benson","Gorman",
  "Halpin","Jennings","Malone","Nagle","Ormsby","Rooney","Tierney","Acheson",
  "Carolan","Dowling","Foran","Harte","Irwin","Jordan","Kearns","Lawless","Norris",
  "Redmond","Sherlock","Treacy","Wynne","Deegan","Eustace","Kerrigan","Staunton",
  "Toomey","Blaney","Clifford","Drennan","Freyne","Ivers","Jackman","Lehane",
  "Naughton","Patton","Rafter","Scallan","Trant","Vickers","Waldron","Aldrich",
  "Broderick","Coughlan","Driscoll","Enright","Fanning","Geraghty","Halpin","Ivory",
  "Kinsella","Lenihan","Minogue","Ormond","Quill","Sweeney","Upton","Varley"
];

const LOCS = [
  "Washington, DC","Georgetown, DC","Capitol Hill, DC","Adams Morgan, DC",
  "Dupont Circle, DC","Petworth, DC","Navy Yard, DC","Brookland, DC",
  "Tenleytown, DC","Woodley Park, DC","Cleveland Park, DC","Shaw, DC",
  "Columbia Heights, DC","Takoma, DC","NoMa, DC","Foggy Bottom, DC",
  "Arlington, VA","Clarendon, VA","Ballston, VA","Crystal City, VA",
  "Alexandria, VA","Old Town Alexandria, VA","Falls Church, VA","McLean, VA",
  "Reston, VA","Herndon, VA","Fairfax, VA","Vienna, VA","Annandale, VA",
  "Springfield, VA","Burke, VA","Centreville, VA","Chantilly, VA","Sterling, VA",
  "Ashburn, VA","Leesburg, VA","Manassas, VA",
  "Bethesda, MD","Silver Spring, MD","Rockville, MD","Chevy Chase, MD",
  "College Park, MD","Gaithersburg, MD","Germantown, MD","Potomac, MD",
  "Takoma Park, MD","Hyattsville, MD","Laurel, MD","Greenbelt, MD",
  "Bowie, MD","Upper Marlboro, MD","Frederick, MD","Waldorf, MD","Kensington, MD"
];

const INTERESTS = [
  "Outdoor/Adventure","Sports","Cooking/Baking","Intellectual Pursuits","Travel",
  "Reading","Art","Dancing","Movies/TV","Volunteering/Service","Fitness",
  "Nature/Gardening","Creative Pursuits","Games","Music",
  "Latin Mass","Adoration","Choir","Theology","Running","Hiking","Hospitality",
  "Photography","Classical Music","Writing","Sailing","Rock Climbing"
];

const VTAGS = [
  "sacramental marriage","large family","parish life","homeschooling",
  "service","community","simple living","open to children",
  "traditional family","domestic church"
];

const VISIONS = [
  "I hope to build a faithful Catholic family rooted in parish life, hospitality, and shared prayer.",
  "Marriage is a vocation of mutual sanctification and raising children in the faith.",
  "I want a simple home marked by prayer, honest work, and openness to children.",
  "I hope for a life of faith and stability, with deep roots in parish community.",
  "Seeking a spouse committed to the sacraments and raising children in authentic Catholic faith.",
  "I believe marriage should be a school of holiness — two people helping each other get to heaven.",
  "I want to build a home that is open to life, grounded in the sacraments, and oriented toward service.",
  "My vision is a family that prays together, serves together, and grows in virtue together.",
  "Looking for someone who takes faith seriously and wants to build a domestic church.",
  "I hope to marry someone who leads with charity and wants to raise faithful children.",
  "I want a marriage that reflects the covenant between Christ and the Church.",
  "Looking for a partner in discernment — someone serious about their vocation.",
  "I envision a family life centered on the Eucharist, confession, and the rosary.",
  "I want to raise children who know the faith, love the Church, and serve others.",
  "My goal is a marriage that grows in holiness year over year.",
  "I hope to build a family with deep roots in Catholic intellectual tradition.",
  "Seeking someone with a heart for service — marriage as mission.",
  "I want a home where faith is the first language and children are welcomed as gifts.",
  "I believe in marriage as a permanent vow and I am ready for family life.",
  "I hope to find someone who loves the Mass and is ready to build a life together."
];

const AC = ["202","301","703","571","240","410"];

// ── Generator ────────────────────────────────────────────────────────────────
function gen(i: number, gender: "Man" | "Woman", ov: Partial<Participant> = {}): Participant {
  const prefix = gender === "Woman" ? "w" : "m";
  const firstPool = gender === "Woman" ? W : M;
  const lastPool  = gender === "Woman" ? LAST_W : LAST_M;
  const fn = firstPool[i % firstPool.length];
  const ln = lastPool[i % lastPool.length]; // gender-specific pool — no cross-gender last name collision
  const age = 22 + ((i * 3 + (i % 7)) % 17);
  const dates = 3 + ((i * 7 + 2) % 9);
  const isFee = (i * 11 + 3) % 7 === 0;
  const isRepeat = (i * 3) % 5 === 0;
  const isVet = (i * 7) % 15 === 0;

  const rawInterests = Array.from({ length: 2 + ((i * 3 + 1) % 4) }, (_, k) =>
    INTERESTS[(i * (k + 1) * 7 + k * 3) % INTERESTS.length]
  );
  const interests = [...new Set(rawInterests)];
  if (interests.length < 2) interests.push(INTERESTS[(i + 5) % INTERESTS.length]);

  const rawTags = Array.from({ length: 1 + ((i * 5 + 2) % 3) }, (_, k) =>
    VTAGS[(i * (k + 3) * 11 + k) % VTAGS.length]
  );
  const visionTags = [...new Set(rawTags)];

  const otherFirstPool = gender === "Woman" ? M : W;
  const otherLastPool  = gender === "Woman" ? LAST_M : LAST_W;
  const prevFn = otherFirstPool[(i * 13 + 7) % otherFirstPool.length];
  const prevLn = otherLastPool[(i * 5 + 11) % otherLastPool.length];
  const prevName = `${prevFn} ${prevLn}`;

  const ageMin = Math.max(22, age - 2 - (i % 4));
  const ageMax = Math.min(42, age + 3 + (i % 6));

  return {
    id: `${prefix}${i}`,
    name: `${fn} ${ln}`,
    initials: `${fn.charAt(0)}${ln.charAt(0)}`,
    age,
    gender,
    location: LOCS[(i * 11 + 5) % LOCS.length],
    phone: `(${AC[(i * 3 + 1) % AC.length]}) ${String(100 + (i * 37) % 900)}-${String(1000 + (i * 73) % 9000)}`,
    email: `${fn.toLowerCase()}${i}@example.org`,
    interests,
    visionTags,
    vision: VISIONS[(i * 11 + 7) % VISIONS.length],
    sessions: isVet
      ? ["Winter 2026","Spring 2026","Summer 2026"]
      : isRepeat
      ? ["Spring 2026","Summer 2026"]
      : ["Summer 2026"],
    previousDates: (isVet || isRepeat) ? [prevName] : ["new to the club"],
    desiredDates: dates,
    ageRange: `${ageMin}-${ageMax}`,
    fee: isFee ? "pending" : "paid",
    status: isFee ? "Fee pending" : "Accepted",
    special: (i * 17 + 5) % 30 === 0,
    cannotDate: [],
    feedback: isRepeat ? "Positive prior feedback." : "",
    predictedMatches: [],
    ...ov,
  };
}

// ── Explicit edge cases ───────────────────────────────────────────────────────

// Sibling pairs — full last names, in each other's cannotDate
const SIBLINGS: Participant[] = [
  { ...gen(0,"Woman"), id:"ec-w01", name:"Siobhan Walsh",    initials:"SW", gender:"Woman", location:"Georgetown, DC",      cannotDate:["Brendan Walsh"],    feedback:"Sibling in program — Brendan Walsh" },
  { ...gen(0,"Man"),   id:"ec-m01", name:"Brendan Walsh",    initials:"BW", gender:"Man",   location:"Georgetown, DC",      cannotDate:["Siobhan Walsh"],    feedback:"Sibling in program — Siobhan Walsh" },
  { ...gen(1,"Woman"), id:"ec-w02", name:"Nora OBrien",      initials:"NO", gender:"Woman", location:"Arlington, VA",       cannotDate:["Patrick OBrien"],   feedback:"Sibling in program — Patrick OBrien" },
  { ...gen(1,"Man"),   id:"ec-m02", name:"Patrick OBrien",   initials:"PO", gender:"Man",   location:"Arlington, VA",       cannotDate:["Nora OBrien"],      feedback:"Sibling in program — Nora OBrien" },
  { ...gen(2,"Woman"), id:"ec-w03", name:"Catherine Sullivan",initials:"CS", gender:"Woman", location:"Bethesda, MD",       cannotDate:["Michael Sullivan"], feedback:"Sibling in program." },
  { ...gen(2,"Man"),   id:"ec-m03", name:"Michael Sullivan",  initials:"MS", gender:"Man",   location:"Bethesda, MD",       cannotDate:["Catherine Sullivan"],feedback:"Sibling in program." },
  { ...gen(3,"Woman"), id:"ec-w04", name:"Mary Kelly",        initials:"MK", gender:"Woman", location:"Silver Spring, MD",  cannotDate:["Thomas Kelly"],     feedback:"Sibling in program." },
  { ...gen(3,"Man"),   id:"ec-m04", name:"Thomas Kelly",      initials:"TK", gender:"Man",   location:"Silver Spring, MD",  cannotDate:["Mary Kelly"],       feedback:"Sibling in program." },
  { ...gen(4,"Woman"), id:"ec-w05", name:"Clare Connelly",    initials:"CC", gender:"Woman", location:"Falls Church, VA",   cannotDate:["James Connelly"],   feedback:"Sibling in program." },
  { ...gen(4,"Man"),   id:"ec-m05", name:"James Connelly",    initials:"JC", gender:"Man",   location:"Falls Church, VA",   cannotDate:["Clare Connelly"],   feedback:"Sibling in program." },
];

// Prior date pairs — full names so string matching works
const PRIOR_OK: Participant[] = [
  { ...gen(10,"Woman"), id:"ec-w10", name:"Rachel Murphy",     initials:"RM", gender:"Woman", location:"Capitol Hill, DC",        previousDates:["David Flynn"],         cannotDate:[] },
  { ...gen(10,"Man"),   id:"ec-m10", name:"David Flynn",        initials:"DF", gender:"Man",   location:"Capitol Hill, DC",        previousDates:["Rachel Murphy"],        cannotDate:[] },
  { ...gen(11,"Woman"), id:"ec-w11", name:"Grace Kelly",        initials:"GK", gender:"Woman", location:"Dupont Circle, DC",       previousDates:["Christopher Moore"],    cannotDate:[] },
  { ...gen(11,"Man"),   id:"ec-m11", name:"Christopher Moore",  initials:"CM", gender:"Man",   location:"Dupont Circle, DC",       previousDates:["Grace Kelly"],          cannotDate:[] },
  { ...gen(12,"Woman"), id:"ec-w12", name:"Elizabeth Ryan",     initials:"ER", gender:"Woman", location:"Old Town Alexandria, VA", previousDates:["Andrew Carroll"],       cannotDate:[] },
  { ...gen(12,"Man"),   id:"ec-m12", name:"Andrew Carroll",     initials:"AC", gender:"Man",   location:"Old Town Alexandria, VA", previousDates:["Elizabeth Ryan"],       cannotDate:[] },
  { ...gen(13,"Woman"), id:"ec-w13", name:"Sarah Walsh",        initials:"SW", gender:"Woman", location:"McLean, VA",              previousDates:["Matthew Brady"],        cannotDate:[] },
  { ...gen(13,"Man"),   id:"ec-m13", name:"Matthew Brady",      initials:"MB", gender:"Man",   location:"McLean, VA",              previousDates:["Sarah Walsh"],          cannotDate:[] },
  { ...gen(14,"Woman"), id:"ec-w14", name:"Fiona Collins",      initials:"FC", gender:"Woman", location:"Bethesda, MD",            previousDates:["Sean Gallagher"],       cannotDate:[] },
  { ...gen(14,"Man"),   id:"ec-m14", name:"Sean Gallagher",     initials:"SG", gender:"Man",   location:"Bethesda, MD",            previousDates:["Fiona Collins"],        cannotDate:[] },
  { ...gen(15,"Woman"), id:"ec-w15", name:"Therese Healy",      initials:"TH", gender:"Woman", location:"Rockville, MD",           previousDates:["Kevin Daly"],           cannotDate:[] },
  { ...gen(15,"Man"),   id:"ec-m15", name:"Kevin Daly",         initials:"KD", gender:"Man",   location:"Rockville, MD",           previousDates:["Therese Healy"],        cannotDate:[] },
];

// Prior date + cannot date — dated, won't again
const PRIOR_BLOCKED: Participant[] = [
  { ...gen(20,"Woman"), id:"ec-w20", name:"Laura Lynch",   initials:"LL", gender:"Woman", location:"Adams Morgan, DC", previousDates:["Brian Doyle"],  cannotDate:["Brian Doyle"],  feedback:"Prior date — did not work out." },
  { ...gen(20,"Man"),   id:"ec-m20", name:"Brian Doyle",   initials:"BD", gender:"Man",   location:"Adams Morgan, DC", previousDates:["Laura Lynch"],  cannotDate:["Laura Lynch"],  feedback:"Prior date — did not work out." },
  { ...gen(21,"Woman"), id:"ec-w21", name:"Anna Casey",    initials:"AC", gender:"Woman", location:"Reston, VA",       previousDates:["Kevin Higgins"],cannotDate:["Kevin Higgins"],feedback:"Prior date — did not work out." },
  { ...gen(21,"Man"),   id:"ec-m21", name:"Kevin Higgins", initials:"KH", gender:"Man",   location:"Reston, VA",       previousDates:["Anna Casey"],   cannotDate:["Anna Casey"],   feedback:"Prior date — did not work out." },
  { ...gen(22,"Woman"), id:"ec-w22", name:"Monica Brennan",initials:"MB", gender:"Woman", location:"Fairfax, VA",      previousDates:["Daniel Reilly"],cannotDate:["Daniel Reilly"],feedback:"Prior date — complicated, do not rematch." },
  { ...gen(22,"Man"),   id:"ec-m22", name:"Daniel Reilly", initials:"DR", gender:"Man",   location:"Fairfax, VA",      previousDates:["Monica Brennan"],cannotDate:["Monica Brennan"],feedback:"Prior date — complicated, do not rematch." },
];

// ── Bulk generated participants ───────────────────────────────────────────────
// 112 women + 112 men = 224 generated, + 26 explicit = 250 total
const GEN_W: Participant[] = Array.from({ length: 112 }, (_, i) => gen(i + 30, "Woman"));
const GEN_M: Participant[] = Array.from({ length: 112 }, (_, i) => gen(i + 30, "Man"));

// ── Alumni — past sessions only, did not return ───────────────────────────────
// Winter 2026 alumni: ~26 women + ~26 men who completed but didn't re-enroll
const ALUMNI_WINTER_W: Participant[] = Array.from({ length: 26 }, (_, i) => ({
  ...gen(i + 200, "Woman"),
  sessions: ["Winter 2026"],
  fee: "paid",
  status: "Accepted",
  feedback: i % 4 === 0 ? "Positive experience; did not re-enroll." : "",
}));
const ALUMNI_WINTER_M: Participant[] = Array.from({ length: 26 }, (_, i) => ({
  ...gen(i + 200, "Man"),
  sessions: ["Winter 2026"],
  fee: "paid",
  status: "Accepted",
  feedback: i % 5 === 0 ? "Positive experience; did not re-enroll." : "",
}));

// Spring 2026 alumni: ~15 women + ~12 men who completed but didn't continue to Summer
const ALUMNI_SPRING_W: Participant[] = Array.from({ length: 15 }, (_, i) => ({
  ...gen(i + 230, "Woman"),
  sessions: ["Spring 2026"],
  fee: "paid",
  status: "Accepted",
  feedback: "",
}));
const ALUMNI_SPRING_M: Participant[] = Array.from({ length: 12 }, (_, i) => ({
  ...gen(i + 230, "Man"),
  sessions: ["Spring 2026"],
  fee: "paid",
  status: "Accepted",
  feedback: "",
}));

export const seedParticipants: Participant[] = [
  ...SIBLINGS,
  ...PRIOR_OK,
  ...PRIOR_BLOCKED,
  ...GEN_W,
  ...GEN_M,
  ...ALUMNI_WINTER_W,
  ...ALUMNI_WINTER_M,
  ...ALUMNI_SPRING_W,
  ...ALUMNI_SPRING_M,
];
