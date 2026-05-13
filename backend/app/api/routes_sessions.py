import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import audit, require_roles
from app.db.session import get_db
from app.models.operations import ProgramSession, SessionRegistration, StaffRole
from app.schemas.operations import (
    CurrentUser,
    ProgramSessionCreate,
    ProgramSessionRead,
    RegistrationCreate,
    RegistrationRead,
)

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("", response_model=list[ProgramSessionRead])
def list_sessions(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles(*list(StaffRole))),
):
    sessions = db.scalars(select(ProgramSession).order_by(ProgramSession.starts_on.desc().nullslast())).all()
    audit(db, user, "session.list", "ProgramSession", metadata={"count": len(sessions)})
    db.commit()
    return sessions


@router.post("", response_model=ProgramSessionRead)
def create_session(
    payload: ProgramSessionCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles(StaffRole.super_admin, StaffRole.organizer)),
):
    session = ProgramSession(**payload.model_dump())
    db.add(session)
    db.flush()
    audit(db, user, "session.create", "ProgramSession", str(session.id))
    db.commit()
    db.refresh(session)
    return session


@router.post("/{session_id}/registrations", response_model=RegistrationRead)
def register_participant(
    session_id: uuid.UUID,
    payload: RegistrationCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles(StaffRole.super_admin, StaffRole.organizer)),
):
    session = db.get(ProgramSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    registration = SessionRegistration(session_id=session_id, **payload.model_dump())
    db.add(registration)
    db.flush()
    audit(
        db,
        user,
        "session.registration.create",
        "SessionRegistration",
        str(registration.id),
        {"session_id": str(session_id), "participant_id": str(payload.participant_id)},
    )
    db.commit()
    db.refresh(registration)
    return registration
