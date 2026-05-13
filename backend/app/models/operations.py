import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import EncryptedText


class StaffRole(str, enum.Enum):
    super_admin = "super_admin"
    organizer = "organizer"
    matcher = "matcher"
    reviewer = "reviewer"
    readonly = "readonly"


class RegistrationStatus(str, enum.Enum):
    received = "received"
    fee_pending = "fee_pending"
    accepted = "accepted"
    waitlisted = "waitlisted"
    declined = "declined"
    withdrawn = "withdrawn"


class MatchSource(str, enum.Enum):
    manual = "manual"
    algorithm = "algorithm"


class MatchStatus(str, enum.Enum):
    draft = "draft"
    approved = "approved"
    sent = "sent"
    cancelled = "cancelled"


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class StaffUser(Base, TimestampMixin):
    __tablename__ = "staff_users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(160))
    role: Mapped[StaffRole] = mapped_column(Enum(StaffRole), default=StaffRole.readonly)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Participant(Base, TimestampMixin):
    __tablename__ = "participants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    first_name: Mapped[str] = mapped_column(String(120), index=True)
    last_name: Mapped[str] = mapped_column(String(120), index=True)
    gender: Mapped[str] = mapped_column(String(40), index=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    state: Mapped[str | None] = mapped_column(String(80), nullable=True)
    email: Mapped[str | None] = mapped_column(EncryptedText, nullable=True)
    phone: Mapped[str | None] = mapped_column(EncryptedText, nullable=True)
    profile_photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    vision_statement: Mapped[str | None] = mapped_column(EncryptedText, nullable=True)
    vision_tags: Mapped[dict] = mapped_column(JSONB, default=dict)
    interests: Mapped[list] = mapped_column(JSONB, default=list)
    age_range_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    age_range_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    desired_dates_per_session: Mapped[int] = mapped_column(Integer, default=3)
    cannot_date_participant_ids: Mapped[list] = mapped_column(JSONB, default=list)
    special_needs_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    special_needs_notes: Mapped[str | None] = mapped_column(EncryptedText, nullable=True)
    registration_fee_status: Mapped[str] = mapped_column(String(40), default="unpaid")
    flexible_fields: Mapped[dict] = mapped_column(JSONB, default=dict)

    registrations: Mapped[list["SessionRegistration"]] = relationship(back_populates="participant")


class VisionStatementVersion(Base):
    __tablename__ = "vision_statement_versions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    participant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("participants.id"), index=True)
    statement: Mapped[str] = mapped_column(EncryptedText)
    tags: Mapped[dict] = mapped_column(JSONB, default=dict)
    reviewer_notes: Mapped[str | None] = mapped_column(EncryptedText, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(320), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ProgramSession(Base, TimestampMixin):
    __tablename__ = "program_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(180), index=True)
    starts_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    location_label: Mapped[str | None] = mapped_column(String(180), nullable=True)
    registration_open: Mapped[bool] = mapped_column(Boolean, default=False)
    intake_form_config: Mapped[dict] = mapped_column(JSONB, default=dict)
    matching_rules: Mapped[dict] = mapped_column(JSONB, default=dict)

    registrations: Mapped[list["SessionRegistration"]] = relationship(back_populates="session")


class SessionRegistration(Base, TimestampMixin):
    __tablename__ = "session_registrations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("program_sessions.id"), index=True)
    participant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("participants.id"), index=True)
    status: Mapped[RegistrationStatus] = mapped_column(
        Enum(RegistrationStatus), default=RegistrationStatus.received
    )
    payment_reference: Mapped[str | None] = mapped_column(EncryptedText, nullable=True)
    signed_liability_statement: Mapped[bool] = mapped_column(Boolean, default=False)
    signed_safety_statement: Mapped[bool] = mapped_column(Boolean, default=False)
    feedback_summary: Mapped[str | None] = mapped_column(EncryptedText, nullable=True)
    negative_feedback_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    organizer_notes: Mapped[str | None] = mapped_column(EncryptedText, nullable=True)

    session: Mapped[ProgramSession] = relationship(back_populates="registrations")
    participant: Mapped[Participant] = relationship(back_populates="registrations")


class DateHistory(Base, TimestampMixin):
    __tablename__ = "date_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("program_sessions.id"), nullable=True)
    participant_a_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("participants.id"), index=True)
    participant_b_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("participants.id"), index=True)
    outcome: Mapped[str | None] = mapped_column(String(120), nullable=True)
    feedback: Mapped[str | None] = mapped_column(EncryptedText, nullable=True)
    organizer_notes: Mapped[str | None] = mapped_column(EncryptedText, nullable=True)


class MatchDraft(Base, TimestampMixin):
    __tablename__ = "match_drafts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("program_sessions.id"), index=True)
    participant_a_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("participants.id"), index=True)
    participant_b_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("participants.id"), index=True)
    source: Mapped[MatchSource] = mapped_column(Enum(MatchSource), default=MatchSource.manual)
    status: Mapped[MatchStatus] = mapped_column(Enum(MatchStatus), default=MatchStatus.draft)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    score_breakdown: Mapped[dict] = mapped_column(JSONB, default=dict)
    curator_notes: Mapped[str | None] = mapped_column(EncryptedText, nullable=True)
    email_subject: Mapped[str | None] = mapped_column(String(240), nullable=True)
    email_body: Mapped[str | None] = mapped_column(EncryptedText, nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_email: Mapped[str] = mapped_column(String(320), index=True)
    action: Mapped[str] = mapped_column(String(120), index=True)
    entity_type: Mapped[str] = mapped_column(String(120), index=True)
    entity_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
