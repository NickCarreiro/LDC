export type IntakeField = {
  key: string;
  number: number;
  label: string;
  type: "short_text" | "long_text" | "email" | "phone" | "radio" | "dropdown" | "checkboxes" | "statement_checkbox";
  required: boolean;
  helpText?: string;
  options?: string[];
  private?: boolean;
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
      label: "Code of Conduct Statement",
      type: "statement_checkbox",
      required: true,
      options: ["Yes, I have read and agree with the Code of Conduct Statement"]
    },
    {
      key: "safety_ack",
      number: 14,
      label: "Safety Statement",
      type: "statement_checkbox",
      required: true,
      options: ["Yes, I have read and agree with the Safety Statement"]
    },
    {
      key: "liability_ack",
      number: 15,
      label: "Liability Statement",
      type: "statement_checkbox",
      required: true,
      options: ["Yes, I have read and agree with the Liability Statement"]
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
      label: "VISION",
      type: "long_text",
      required: false,
      private: true,
      helpText: "Organizer-only vision for relationships and marriage."
    }
  ] satisfies IntakeField[]
};
