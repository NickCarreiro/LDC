export type IntakeField = {
  key: string;
  number: number;
  label: string;
  type: "short_text" | "long_text" | "email" | "phone" | "radio" | "dropdown" | "checkboxes" | "statement_checkbox";
  required: boolean;
  helpText?: string;
  options?: string[];
  private?: boolean;
  agreementText?: string;
};

const ages = Array.from({ length: 18 }, (_, index) => String(index + 18));
const maxDates = Array.from({ length: 10 }, (_, index) => String(index + 3));

export const summer2026Form = {
  title: "Little Dates Club Summer 2026 Sign-Up",
  deadline: "Friday, May 22",
  sessionWindow: "June 3 through August 14",
  donation: {
    suggestedAmount: "$25",
    zelle: "littledatesclub@gmail.com",
    venmo: "@littledatesclub"
  },
  notices: [
    "Spots for men are full at the moment; new male sign-ups should be waitlisted.",
    "Open spots remain for ladies."
  ],
  orientations: [
    "Girls: Sunday, May 17, 2-4 pm",
    "Girls: Saturday, May 23, 10 am-12 pm",
    "Guys: Sunday, May 17, 7-9 pm",
    "Guys: Saturday, May 23, 2-4 pm"
  ],
  requirements: [
    "Not already in an exclusive relationship.",
    "Willing to go on assigned dates up to the selected maximum.",
    "Assigned dates completed within the Summer session window.",
    "New participants attend mandatory in-person orientation."
  ],
  fields: [
    { key: "first_name", number: 1, label: "FIRST Name", type: "short_text", required: true },
    { key: "last_name", number: 2, label: "LAST Name", type: "short_text", required: true },
    { key: "phone", number: 3, label: "PHONE Number", type: "phone", required: true },
    {
      key: "email",
      number: 4,
      label: "EMAIL",
      type: "email",
      required: true,
      helpText: "Use the email checked most often for LDC correspondence."
    },
    {
      key: "gender",
      number: 5,
      label: "MALE/FEMALE",
      type: "radio",
      required: true,
      options: ["Male", "Female"]
    },
    {
      key: "age",
      number: 6,
      label: "AGE",
      type: "dropdown",
      required: true,
      helpText: "Your age.",
      options: ages
    },
    {
      key: "age_range",
      number: 7,
      label: "RANGE",
      type: "checkboxes",
      required: true,
      helpText: "Ages the participant is interested in dating.",
      options: ages
    },
    {
      key: "max_dates",
      number: 8,
      label: "MAX DATES",
      type: "radio",
      required: true,
      helpText: "Maximum number of little dates for the ten-week session.",
      options: maxDates
    },
    {
      key: "city_state",
      number: 9,
      label: "CITY AND STATE",
      type: "long_text",
      required: true,
      helpText: "Home city/state and any second location available for date planning."
    },
    {
      key: "interests",
      number: 10,
      label: "INTERESTS",
      type: "checkboxes",
      required: false,
      helpText: "Interests and hobbies outside work or school.",
      options: [
        "Outdoor/Adventure",
        "Sports",
        "Cooking/Baking",
        "Intellectual Pursuits",
        "Travel",
        "Reading",
        "Art",
        "Dancing",
        "Movies/TV",
        "Volunteering/Service",
        "Fitness",
        "Nature/Gardening",
        "Creative Pursuits",
        "Games",
        "Music"
      ]
    },
    {
      key: "referral_source",
      number: 11,
      label: "How did you hear about this club?",
      type: "short_text",
      required: true
    },
    {
      key: "date_commitment_ack",
      number: 12,
      label: "Commitment to assigned dates and new-participant orientation",
      type: "radio",
      required: true,
      options: ["Yes"]
    },
    {
      key: "code_of_conduct_ack",
      number: 13,
      label: "Code of Conduct",
      type: "statement_checkbox",
      required: true,
      options: ["I have read and agree to the Code of Conduct"],
      agreementText: `Little Dates Club Code of Conduct

As a participant in Little Dates Club, I commit to treating every person I interact with — fellow participants, organizers, and volunteers — with respect, dignity, and kindness.

I will:
• Honor my date commitments. Once a date is assigned, I will make a good-faith effort to follow through. If I need to cancel, I will notify the organizing team promptly.
• Communicate honestly and courteously with the organizing team and with my dates.
• Attend the mandatory orientation if I am a new participant.

I will not:
• Harass, pressure, belittle, or speak disparagingly about any participant or organizer, whether in person or online.
• Share another participant's personal information (name, contact details, photo) outside the context of the club.
• Pursue romantic contact with someone who has indicated they are not interested.

I understand that violations of this Code of Conduct may result in removal from the current session and future sessions at the sole discretion of the organizing team.`
    },
    {
      key: "safety_ack",
      number: 14,
      label: "Safety Statement",
      type: "statement_checkbox",
      required: true,
      options: ["I have read and agree to the Safety Statement"],
      agreementText: `Little Dates Club Safety Statement

Little Dates Club is a volunteer-run social coordination service. We do not conduct background checks, criminal-history screenings, or identity verification on any participant. You are responsible for your own personal safety.

By participating, I acknowledge and agree to the following:

• I will meet my assigned date for the first time in a public place (e.g., a coffee shop, restaurant, or park).
• Before meeting someone new, I will inform a trusted friend or family member of where I am going, who I am meeting, and when I expect to return.
• I will trust my instincts. If I feel unsafe at any point, I will remove myself from the situation.
• I will report any safety concerns — including threatening messages or inappropriate behavior — to the organizing team as soon as possible.

I understand that Little Dates Club cannot guarantee the character or conduct of other participants, and I take personal responsibility for decisions I make while participating in the program.`
    },
    {
      key: "liability_ack",
      number: 15,
      label: "Liability Waiver",
      type: "statement_checkbox",
      required: true,
      options: ["I have read and agree to the Liability Waiver"],
      agreementText: `Little Dates Club Liability Waiver

By signing up for Little Dates Club, I voluntarily agree to the following:

Release of Liability: I release and forever discharge Little Dates Club, its organizing team, volunteers, and affiliates from any and all claims, demands, damages, losses, costs, or liabilities of any kind — whether known or unknown — arising from or in connection with my participation in the club, including but not limited to: interactions with other participants, dates arranged through the club, attendance at club events or orientations, and the use of any personal information I provide.

Assumption of Risk: I understand that meeting new people carries inherent social and personal risks, and I voluntarily assume those risks.

Indemnification: I agree to indemnify and hold harmless Little Dates Club and its organizing team from any claim brought by a third party arising from my conduct as a participant.

This waiver does not limit my ability to report safety concerns to the organizing team or to appropriate authorities.`
    },
    {
      key: "previous_dates",
      number: 16,
      label: "Previous LDC dates",
      type: "long_text",
      required: true,
      helpText: 'Names of previous dates, or "new to the club."'
    },
    {
      key: "cannot_date",
      number: 17,
      label: "Unable to date",
      type: "long_text",
      required: false,
      helpText: "Family connections, past dating history, or other reasons not already listed."
    },
    {
      key: "vision_statement",
      number: 18,
      label: "Your Vision",
      type: "long_text",
      required: false,
      private: true,
      helpText: "Describe the kind of relationship and marriage you're hoping for. What qualities of character matter most to you in a future spouse? This response is seen by the organizing team only and helps us curate thoughtful matches for you."
    }
  ] satisfies IntakeField[]
};
