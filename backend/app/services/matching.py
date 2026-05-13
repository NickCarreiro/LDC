from datetime import date
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.operations import DateHistory, MatchDraft, MatchStatus, Participant
from app.schemas.operations import MatchScore


def _age(born: date | None) -> int | None:
    if not born:
        return None
    today = date.today()
    return today.year - born.year - ((today.month, today.day) < (born.month, born.day))


def _tag_set(value: dict) -> set[str]:
    tags = value.get("tags", value) if isinstance(value, dict) else {}
    if isinstance(tags, list):
        return {str(tag).strip().lower() for tag in tags if str(tag).strip()}
    if isinstance(tags, dict):
        return {str(k).strip().lower() for k, enabled in tags.items() if enabled}
    return set()


def score_pair(db: Session, participant_a: Participant, participant_b: Participant) -> MatchScore:
    warnings: list[str] = []
    blocked_ids_a = {str(item) for item in (participant_a.cannot_date_participant_ids or [])}
    blocked_ids_b = {str(item) for item in (participant_b.cannot_date_participant_ids or [])}

    if str(participant_b.id) in blocked_ids_a or str(participant_a.id) in blocked_ids_b:
        warnings.append("One participant is listed in the other's cannot-date constraints.")

    previous_date = db.scalar(
        select(DateHistory.id).where(
            or_(
                (DateHistory.participant_a_id == participant_a.id)
                & (DateHistory.participant_b_id == participant_b.id),
                (DateHistory.participant_a_id == participant_b.id)
                & (DateHistory.participant_b_id == participant_a.id),
            )
        )
    )
    if previous_date:
        warnings.append("These participants have prior date history.")

    interests_a = {str(item).strip().lower() for item in participant_a.interests or []}
    interests_b = {str(item).strip().lower() for item in participant_b.interests or []}
    shared_interests = sorted(interests_a & interests_b)

    tags_a = _tag_set(participant_a.vision_tags or {})
    tags_b = _tag_set(participant_b.vision_tags or {})
    shared_vision_tags = sorted(tags_a & tags_b)

    age_a = _age(participant_a.date_of_birth)
    age_b = _age(participant_b.date_of_birth)
    age_fit = True
    if age_a is not None and participant_b.age_range_min is not None:
        age_fit = age_fit and age_a >= participant_b.age_range_min
    if age_a is not None and participant_b.age_range_max is not None:
        age_fit = age_fit and age_a <= participant_b.age_range_max
    if age_b is not None and participant_a.age_range_min is not None:
        age_fit = age_fit and age_b >= participant_a.age_range_min
    if age_b is not None and participant_a.age_range_max is not None:
        age_fit = age_fit and age_b <= participant_a.age_range_max

    if not age_fit:
        warnings.append("One or both participants fall outside stated age preferences.")

    interest_score = min(len(shared_interests) * 8, 32)
    vision_score = min(len(shared_vision_tags) * 12, 36)
    age_score = 18 if age_fit else 0
    history_score = 0 if previous_date else 14
    penalty = 35 if warnings and "cannot-date" in " ".join(warnings).lower() else 0
    score = max(0, min(100, interest_score + vision_score + age_score + history_score - penalty))

    return MatchScore(
        score=round(float(score), 2),
        breakdown={
            "shared_interests": shared_interests,
            "shared_vision_tags": shared_vision_tags,
            "age_fit": age_fit,
            "previous_date": bool(previous_date),
            "components": {
                "interests": interest_score,
                "vision": vision_score,
                "age": age_score,
                "history": history_score,
                "penalty": penalty,
            },
        },
        warnings=warnings,
    )


def validate_special_needs_distribution(
    db: Session,
    session_id: UUID,
    participant_a: Participant,
    participant_b: Participant,
) -> list[str]:
    warnings: list[str] = []
    pair = [participant_a, participant_b]
    marked = [participant for participant in pair if participant.special_needs_flag]
    unmarked_women = [
        participant
        for participant in pair
        if participant.gender.lower() in {"woman", "female"} and not participant.special_needs_flag
    ]
    if not marked or not unmarked_women:
        return warnings

    for woman in unmarked_women:
        drafts = db.scalars(
            select(MatchDraft).where(
                MatchDraft.session_id == session_id,
                MatchDraft.status != MatchStatus.cancelled,
                or_(
                    MatchDraft.participant_a_id == woman.id,
                    MatchDraft.participant_b_id == woman.id,
                ),
            )
        ).all()
        for draft in drafts:
            other_id = (
                draft.participant_b_id if draft.participant_a_id == woman.id else draft.participant_a_id
            )
            other = db.get(Participant, other_id)
            if other and other.special_needs_flag:
                warnings.append(
                    "This woman already has a curated date with a special-needs-marked participant."
                )
                break
    return warnings
