from app.models.operations import MatchDraft, Participant


def build_match_email(match: MatchDraft, participant: Participant, counterpart: Participant) -> tuple[str, str]:
    subject = "Your curated date information"
    counterpart_phone = (counterpart.phone or "").strip() or "phone not listed"
    body = (
        f"Hello {participant.first_name},\n\n"
        "The organizing team has prepared your date information for the upcoming session.\n\n"
        f"Date: {counterpart.first_name} {counterpart.last_name}\n"
        f"Phone: {counterpart_phone}\n\n"
        "Please follow the event instructions from the organizers and reach out to the team "
        "with any safety, scheduling, or discernment concerns.\n\n"
        "In Christ,\n"
        "The organizing team"
    )
    return subject, body
