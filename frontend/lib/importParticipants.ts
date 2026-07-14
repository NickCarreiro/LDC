import readXlsxFile, { parseExcelDate, readSheetNames } from "read-excel-file";

export type ImportParticipantRow = {
  firstName: string;
  lastName: string;
  gender: string;
  age: number;
  location: string;
  email: string;
  phone: string;
  interests: string;
  ageRange: string;
  desiredDates: number;
  vision: string;
  status?: string;
  fee?: string;
  sessions?: string[];
  previousDates?: string[];
  cannotDate?: string[];
  special?: boolean;
  feedback?: string;
  orientationDate?: string;
  welcomeEmailSent?: boolean;
};

export type ParsedImport = {
  headers: string[];
  rows: ImportParticipantRow[];
  rawRowCount: number;
  skippedRowCount: number;
};

type SourceRow = Record<string, string>;
type MatchRule = {
  include: string[];
  exclude?: string[];
  exact?: boolean;
};

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function stringifyCell(value: unknown) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function makeUniqueHeaders(headers: string[]) {
  const seen: Record<string, number> = {};
  return headers.map((header, index) => {
    const base = header.trim() || `Column ${index + 1}`;
    seen[base] = (seen[base] ?? 0) + 1;
    return seen[base] === 1 ? base : `${base} (${seen[base]})`;
  });
}

function rowsFromMatrix(matrix: unknown[][]): { headers: string[]; rows: SourceRow[] } {
  const headerIndex = matrix.findIndex((row) => row.filter((cell) => stringifyCell(cell)).length >= 3);
  if (headerIndex < 0) return { headers: [], rows: [] };

  const headers = makeUniqueHeaders(matrix[headerIndex].map(stringifyCell));
  const rows = matrix.slice(headerIndex + 1)
    .map((row) => {
      const record: SourceRow = {};
      headers.forEach((header, index) => {
        record[header] = stringifyCell(row[index]);
      });
      return record;
    })
    .filter((row) => Object.values(row).some(Boolean));

  return { headers, rows };
}

export function parseCsv(text: string): SourceRow[] {
  const matrix: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) matrix.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) matrix.push(row);
  return rowsFromMatrix(matrix).rows;
}

function pick(row: SourceRow, rules: MatchRule[]) {
  const entries = Object.entries(row).map(([key, value]) => [normalizeHeader(key), value] as const);

  for (const rule of rules) {
    const includes = rule.include.map(normalizeHeader);
    const excludes = (rule.exclude ?? []).map(normalizeHeader);
    const found = entries.find(([key, value]) => {
      if (!value.trim()) return false;
      if (excludes.some((term) => key.includes(term))) return false;
      if (rule.exact) return includes.some((term) => key === term);
      return includes.every((term) => key.includes(term));
    });
    if (found) return found[1].trim();
  }

  return "";
}

function splitList(value: string) {
  return value
    .split(/\s*(?:,|;|\n|\r|•|\u2022)\s*/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isBlankAnswer(value: string) {
  const normalized = value.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9]+/g, " ").trim();
  if (!normalized) return true;
  return [
    "n a",
    "na",
    "none",
    "no",
    "no one",
    "noone",
    "new",
    "new to club",
    "new to the club",
    "i am new",
    "i am new to the little dates club",
    "im new",
    "im new to the little dates club",
    "not applicable",
    "i dont know",
    "i dont know anyone",
    "i dont know of anyone",
    "i dont know who is in the club to be able to answer sorry",
  ].includes(normalized);
}

function splitPeopleList(value: string) {
  if (isBlankAnswer(value)) return [];
  return value
    .split(/\s*(?:,|;|\n|\r|•|\u2022|\/|\band\b)\s*/gi)
    .map((item) => item.trim().replace(/^[-–—]+/, "").trim())
    .filter((item) => item && !isBlankAnswer(item));
}

function parseInteger(value: string, fallback: number) {
  const match = value.match(/\d+/);
  const parsed = match ? parseInt(match[0], 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function formatPossibleExcelDate(value: string) {
  if (!value || isBlankAnswer(value)) return "";
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 20000 && numeric < 80000) {
    return (parseExcelDate(numeric) as unknown as Date).toISOString().slice(0, 10);
  }
  return value;
}

function parseAge(row: SourceRow) {
  const age = parseInteger(
    pick(row, [
      { include: ["your age"] },
      { include: ["current age"] },
      { include: ["age"], exclude: ["what ages", "age range", "preferred"] },
    ]),
    0,
  );
  if (age > 0) return age;

  const dob = pick(row, [
    { include: ["date of birth"] },
    { include: ["dob"], exact: true },
    { include: ["birthday"] },
  ]);
  const date = dob ? new Date(dob) : null;
  if (date && Number.isFinite(date.getTime())) {
    const now = new Date();
    let years = now.getFullYear() - date.getFullYear();
    const beforeBirthday =
      now.getMonth() < date.getMonth() ||
      (now.getMonth() === date.getMonth() && now.getDate() < date.getDate());
    if (beforeBirthday) years -= 1;
    return Math.max(years, 0);
  }
  return 0;
}

function parseBoolean(value: string) {
  if (!value) return undefined;
  if (/^(x|yes|true|1|sent|done|complete|completed|y)$/i.test(value.trim())) return true;
  if (/^(no|false|0|not sent|n)$/i.test(value.trim())) return false;
  return undefined;
}

function buildFeedback(row: SourceRow) {
  const parts = [
    ["Notes", pick(row, [
      { include: ["notes from texts"] },
      { include: ["notes for participants"] },
      { include: ["organizer notes"] },
      { include: ["feedback"], exact: true },
      { include: ["notes"], exact: true },
    ])],
    ["Heard about club", pick(row, [{ include: ["how did you hear"] }])],
    ["Resource email", pick(row, [{ include: ["resource email"] }])],
    ["Card", pick(row, [
      { include: ["has card"] },
      { include: ["card created"] },
      { include: ["card made"] },
      { include: ["card updated"] },
    ])],
    ["RSVP", pick(row, [{ include: ["rsvped"] }])],
    ["Picture", pick(row, [{ include: ["pic"], exact: true }])],
  ].filter(([, value]) => value);

  return parts.map(([label, value]) => `${label}: ${value}`).join("\n");
}

export function mapImportRows(rows: SourceRow[], fallbackSession: string): ImportParticipantRow[] {
  return rows.map((row) => {
    const fullName = pick(row, [
      { include: ["name first and last"] },
      { include: ["full name"] },
      { include: ["your name"] },
      { include: ["name"], exact: true },
    ]);
    const [firstFromFull, ...restName] = fullName.split(/\s+/).filter(Boolean);
    const firstName = pick(row, [
      { include: ["first name"] },
      { include: ["firstname"], exact: true },
    ]) || firstFromFull || "";
    const lastName = pick(row, [
      { include: ["last name"] },
      { include: ["lastname"], exact: true },
      { include: ["surname"] },
    ]) || restName.join(" ");

    const city = pick(row, [{ include: ["city"], exact: true }]);
    const state = pick(row, [{ include: ["state"], exact: true }]);
    const location = pick(row, [
      { include: ["city and state"] },
      { include: ["city state"] },
      { include: ["please tell us where you live"] },
      { include: ["city and state where you live"] },
      { include: ["where you live"] },
      { include: ["location"], exact: true },
    ]) || [city, state].filter(Boolean).join(", ");

    const session = pick(row, [
      { include: ["program session"] },
      { include: ["session"], exact: true },
      { include: ["sessions"], exact: true },
    ]) || fallbackSession;

    const welcomeEmail = parseBoolean(pick(row, [
      { include: ["sent welcome email"] },
      { include: ["welcome email"] },
    ]));

    return {
      firstName,
      lastName,
      gender: pick(row, [
        { include: ["you are"], exact: true },
        { include: ["male female"] },
        { include: ["malefemale"], exact: true },
        { include: ["gender"] },
        { include: ["sex"], exact: true },
      ]),
      age: parseAge(row),
      location,
      email: pick(row, [
        { include: ["email"], exclude: ["resource", "welcome"] },
        { include: ["email address"], exclude: ["resource", "welcome"] },
      ]),
      phone: pick(row, [
        { include: ["phone number"] },
        { include: ["phone"], exact: true },
        { include: ["mobile"] },
      ]),
      interests: pick(row, [
        { include: ["interests"] },
        { include: ["hobbies"] },
        { include: ["free time"] },
        { include: ["enjoy doing"] },
      ]),
      ageRange: pick(row, [
        { include: ["what ages", "interested", "dating"] },
        { include: ["preferred age range"] },
        { include: ["age range"] },
        { include: ["age preference"] },
      ]),
      desiredDates: parseInteger(pick(row, [
        { include: ["maximum number", "little dates"] },
        { include: ["desired dates"] },
        { include: ["number of dates"] },
        { include: ["max dates"] },
      ]), 3),
      vision: pick(row, [
        { include: ["vision", "relationships", "marriage"] },
        { include: ["briefly describe", "relationships", "marriage"] },
        { include: ["marriage vision"] },
      ]),
      status: welcomeEmail ? "Welcome email sent" : "Fee pending",
      fee: pick(row, [
        { include: ["payment status"] },
        { include: ["registration fee"] },
        { include: ["fee"], exact: true },
      ]) || "pending",
      sessions: session ? splitList(session) : [fallbackSession],
      previousDates: splitPeopleList(pick(row, [
        { include: ["participated", "previous sessions"] },
        { include: ["participated", "summer session"] },
        { include: ["people", "went on dates"] },
        { include: ["previous dates"] },
        { include: ["date history"] },
      ])),
      cannotDate: splitPeopleList(pick(row, [
        { include: ["unable to date"] },
        { include: ["cannot date"] },
        { include: ["family connection"] },
        { include: ["past dating history"] },
      ])),
      special: parseBoolean(pick(row, [
        { include: ["special needs"] },
        { include: ["review flag"] },
      ])) ?? false,
      feedback: buildFeedback(row),
      orientationDate: formatPossibleExcelDate(pick(row, [
        { include: ["orientation date"] },
        { include: ["orientations sign up"] },
      ])),
      welcomeEmailSent: welcomeEmail,
    };
  }).filter((row) => row.firstName || row.lastName || row.email);
}

export async function parseParticipantImportFile(file: File, fallbackSession: string): Promise<ParsedImport> {
  const lowerName = file.name.toLowerCase();
  let parsed: { headers: string[]; rows: SourceRow[] };

  if (lowerName.endsWith(".csv")) {
    const text = await file.text();
    const rows = parseCsv(text);
    parsed = { headers: Object.keys(rows[0] ?? {}), rows };
  } else if (lowerName.endsWith(".xlsx")) {
    const sheetNames = await readSheetNames(file);
    let bestParsed: { headers: string[]; rows: SourceRow[] } = { headers: [], rows: [] };
    for (const sheet of sheetNames) {
      const matrix = await readXlsxFile(file, { sheet });
      const sheetParsed = rowsFromMatrix(matrix);
      if (sheetParsed.rows.length > bestParsed.rows.length) {
        bestParsed = sheetParsed;
      }
      if (/form responses/i.test(sheet) && sheetParsed.rows.length > 0) {
        bestParsed = sheetParsed;
        break;
      }
    }
    parsed = bestParsed;
  } else {
    throw new Error("Import accepts CSV or XLSX files.");
  }

  const mappedRows = mapImportRows(parsed.rows, fallbackSession);
  return {
    headers: parsed.headers,
    rows: mappedRows,
    rawRowCount: parsed.rows.length,
    skippedRowCount: parsed.rows.length - mappedRows.length,
  };
}
