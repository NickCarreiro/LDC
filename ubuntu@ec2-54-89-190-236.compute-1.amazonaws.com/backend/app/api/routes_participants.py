import uuid
from csv import DictWriter
from io import StringIO

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import audit, require_roles
from app.db.session import get_db
from app.models.operations import Participant, StaffRole, VisionStatementVersion
from app.schemas.operations import CurrentUser, ParticipantCreate, ParticipantRead, ParticipantUpdate

router = APIRouter(prefix="/participants", tags=["participants"])


@router.get("", response_model=list[ParticipantRead])
def list_participants(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles(*list(StaffRole))),
):
    participants = db.scalars(select(Participant).order_by(Participant.last_name, Participant.first_name)).all()
    audit(db, user, "participant.list", "Participant", metadata={"count": len(participants)})
    db.commit()
    return participants


@router.get("/export.csv")
def export_participants_csv(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles(StaffRole.super_admin, StaffRole.organizer, StaffRole.matcher)),
):
    participants = db.scalars(select(Participant).order_by(Participant.last_name, Participant.first_name)).all()
    buffer = StringIO()
    fieldnames = [
        "id",
        "first_name",
        "last_name",
        "gender",
        "date_of_birth",
        "city",
        "state",
        "email",
        "phone",
        "interests",
        "vision_tags",
        "age_range_min",
        "age_range_max",
        "desired_dates_per_session",
        "registration_fee_status",
        "special_needs_flag",
    ]
    writer = DictWriter(buffer, fieldnames=fieldnames)
    writer.writeheader()
    for participant in participants:
        writer.writerow(
            {
                "id": participant.id,
                "first_name": participant.first_name,
                "last_name": participant.last_name,
                "gender": participant.gender,
                "date_of_birth": participant.date_of_birth,
                "city": participant.city,
                "state": participant.state,
                "email": participant.email,
                "phone": participant.phone,
                "interests": ";".join(participant.interests or []),
                "vision_tags": participant.vision_tags,
                "age_range_min": participant.age_range_min,
                "age_range_max": participant.age_range_max,
                "desired_dates_per_session": participant.desired_dates_per_session,
                "registration_fee_status": participant.registration_fee_status,
                "special_needs_flag": participant.special_needs_flag,
            }
        )
    audit(db, user, "participant.export_csv", "Participant", metadata={"count": len(participants)})
    db.commit()
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="participants.csv"'},
    )


@router.post("", response_model=ParticipantRead)
def create_participant(
    payload: ParticipantCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles(StaffRole.super_admin, StaffRole.organizer, StaffRole.matcher)),
):
    participant = Participant(**payload.model_dump())
    db.add(participant)
    db.flush()
    if payload.vision_statement:
        db.add(
            VisionStatementVersion(
                participant_id=participant.id,
                statement=payload.vision_statement,
                tags=payload.vision_tags,
                created_by=str(user.email),
            )
        )
    audit(db, user, "participant.create", "Participant", str(participant.id))
    db.commit()
    db.refresh(participant)
    return participant


@router.get("/{participant_id}", response_model=ParticipantRead)
def get_participant(
    participant_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles(*list(StaffRole))),
):
    participant = db.get(Participant, participant_id)
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    audit(db, user, "participant.view", "Participant", str(participant.id))
    db.commit()
    return participant


@router.patch("/{participant_id}", response_model=ParticipantRead)
def update_participant(
    participant_id: uuid.UUID,
    payload: ParticipantUpdate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles(StaffRole.super_admin, StaffRole.organizer, StaffRole.matcher)),
):
    participant = db.get(Participant, participant_id)
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")

    updates = payload.model_dump(exclude_unset=True)
    vision_changed = "vision_statement" in updates and updates["vision_statement"] != participant.vision_statement
    for key, value in updates.items():
        setattr(participant, key, value)
    if vision_changed and participant.vision_statement:
        db.add(
            VisionStatementVersion(
                participant_id=participant.id,
                statement=participant.vision_statement,
                tags=participant.vision_tags,
                created_by=str(user.email),
            )
        )
    audit(db, user, "participant.update", "Participant", str(participant.id), {"fields": list(updates)})
    db.commit()
    db.refresh(participant)
    return participant
