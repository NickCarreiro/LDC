from app.models.operations import MatchDraft, Participant
from app.services.email_drafts import build_match_email


def test_match_email_includes_counterpart_phone() -> None:
    participant = Participant(first_name="Anna", last_name="Smith", gender="Woman")
    counterpart = Participant(
        first_name="Michael",
        last_name="Jones",
        gender="Man",
        phone=" 555-0102 ",
    )

    subject, body = build_match_email(MatchDraft(), participant, counterpart)

    assert subject == "Your curated date information"
    assert "Date: Michael Jones" in body
    assert "Phone: 555-0102" in body


def test_match_email_marks_missing_counterpart_phone() -> None:
    participant = Participant(first_name="Anna", last_name="Smith", gender="Woman")
    counterpart = Participant(first_name="Thomas", last_name="Brown", gender="Man", phone=" ")

    _, body = build_match_email(MatchDraft(), participant, counterpart)

    assert "Phone: phone not listed" in body
