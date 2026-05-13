import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import audit, require_roles
from app.db.session import get_db
from app.models.operations import MatchDraft, MatchSource, Participant, SessionRegistration, StaffRole
from app.schemas.operations import CurrentUser, DryRunRequest, MatchDraftCreate, MatchDraftRead, MatchScore
from app.services.email_drafts import build_match_email
from app.services.matching import score_pair, validate_special_needs_distribution

router = APIRouter(prefix="/matches", tags=["matches"])


@router.post("/dry-run", response_model=MatchScore)
def dry_run_match(
    payload: DryRunRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles(StaffRole.super_admin, StaffRole.organizer, StaffRole.matcher)),
):
    participant_a = db.get(Participant, payload.participant_a_id)
    participant_b = db.get(Participant, payload.participant_b_id)
    if not participant_a or not participant_b:
        raise HTTPException(status_code=404, detail="Participant not found")
    result = score_pair(db, participant_a, participant_b)
    audit(
        db,
        user,
        "match.dry_run",
        "ParticipantPair",
        metadata={"participant_a_id": str(participant_a.id), "participant_b_id": str(participant_b.id)},
    )
    db.commit()
    return result


@router.post("/drafts", response_model=MatchDraftRead)
def create_match_draft(
    payload: MatchDraftCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles(StaffRole.super_admin, StaffRole.organizer, StaffRole.matcher)),
):
    participant_a = db.get(Participant, payload.participant_a_id)
    participant_b = db.get(Participant, payload.participant_b_id)
    if not participant_a or not participant_b:
        raise HTTPException(status_code=404, detail="Participant not found")

    result = score_pair(db, participant_a, participant_b)
    distribution_warnings = validate_special_needs_distribution(
        db, payload.session_id, participant_a, participant_b
    )
    draft = MatchDraft(
        **payload.model_dump(),
        score=result.score,
        score_breakdown={**result.breakdown, "warnings": result.warnings + distribution_warnings},
    )
    db.add(draft)
    db.flush()
    audit(db, user, "match.draft.create", "MatchDraft", str(draft.id))
    db.commit()
    db.refresh(draft)
    return draft


@router.post("/sessions/{session_id}/recommendations", response_model=list[MatchDraftRead])
def recommend_session_matches(
    session_id: uuid.UUID,
    limit: int = 25,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles(StaffRole.super_admin, StaffRole.organizer, StaffRole.matcher)),
):
    registrations = db.scalars(
        select(SessionRegistration).where(SessionRegistration.session_id == session_id)
    ).all()
    participants = [db.get(Participant, registration.participant_id) for registration in registrations]
    participants = [participant for participant in participants if participant]

    scored_pairs: list[tuple[float, Participant, Participant, MatchScore]] = []
    for index, participant_a in enumerate(participants):
        for participant_b in participants[index + 1 :]:
            if participant_a.gender == participant_b.gender:
                continue
            score = score_pair(db, participant_a, participant_b)
            scored_pairs.append((score.score, participant_a, participant_b, score))

    scored_pairs.sort(key=lambda item: item[0], reverse=True)
    drafts: list[MatchDraft] = []
    for _, participant_a, participant_b, score in scored_pairs[:limit]:
        draft = MatchDraft(
            session_id=session_id,
            participant_a_id=participant_a.id,
            participant_b_id=participant_b.id,
            source=MatchSource.algorithm,
            score=score.score,
            score_breakdown=score.breakdown | {"warnings": score.warnings},
        )
        db.add(draft)
        drafts.append(draft)

    audit(db, user, "match.recommendations.create", "ProgramSession", str(session_id), {"count": len(drafts)})
    db.commit()
    for draft in drafts:
        db.refresh(draft)
    return drafts


@router.post("/drafts/{draft_id}/email")
def prepare_email_draft(
    draft_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles(StaffRole.super_admin, StaffRole.organizer, StaffRole.matcher)),
):
    draft = db.get(MatchDraft, draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    participant_a = db.get(Participant, draft.participant_a_id)
    participant_b = db.get(Participant, draft.participant_b_id)
    if not participant_a or not participant_b:
        raise HTTPException(status_code=404, detail="Participant not found")

    subject, body = build_match_email(draft, participant_a, participant_b)
    draft.email_subject = subject
    draft.email_body = body
    audit(db, user, "match.email_draft.prepare", "MatchDraft", str(draft.id))
    db.commit()
    return {"subject": subject, "body": body}
