export type DateEmailPartner = {
  name: string;
  phone?: string | null;
};

export function formatDraftPhone(phone?: string | null) {
  const trimmed = phone?.trim();
  return trimmed || "phone not listed";
}

export function buildParticipantDateEmail(firstName: string, partners: DateEmailPartner[]) {
  const dateList = partners
    .map((partner, i) => `${i + 1}. ${partner.name} - ${formatDraftPhone(partner.phone)}`)
    .join("\n");

  return {
    subject: "Your curated dates — Summer 2026",
    body: [
      `Hello ${firstName},`,
      "",
      "The organizing team has finalized your date assignments for the Summer 2026 session.",
      "",
      `Your date${partners.length > 1 ? "s" : ""}:`,
      dateList,
      "",
      "Please follow the event instructions from the organizers for each date and reach out with any questions before meeting.",
      "",
      "With care,",
      "The Little Dates Club Organizing Team",
    ].join("\n"),
  };
}
