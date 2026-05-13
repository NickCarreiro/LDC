import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.operations import MatchSource, MatchStatus, RegistrationStatus, StaffRole


class CurrentUser(BaseModel):
    email: EmailStr
    display_name: str = "Local Organizer"
    role: StaffRole = StaffRole.super_admin


class ParticipantBase(BaseModel):
    first_name: str
    last_name: str
    gender: str
    date_of_birth: date | None = None
    city: str | None = None
    state: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    profile_photo_url: str | None = None
    vision_statement: str | None = None
    vision_tags: dict = Field(default_factory=dict)
    interests: list[str] = Field(default_factory=list)
    age_range_min: int | None = None
    age_range_max: int | None = None
    desired_dates_per_session: int = 3
    cannot_date_participant_ids: list[str] = Field(default_factory=list)
    special_needs_flag: bool = False
    special_needs_notes: str | None = None
    registration_fee_status: str = "unpaid"
    flexible_fields: dict = Field(default_factory=dict)


class ParticipantCreate(ParticipantBase):
    pass


class ParticipantUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    gender: str | None = None
    date_of_birth: date | None = None
    city: str | None = None
    state: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    profile_photo_url: str | None = None
    vision_statement: str | None = None
    vision_tags: dict | None = None
    interests: list[str] | None = None
    age_range_min: int | None = None
    age_range_max: int | None = None
    desired_dates_per_session: int | None = None
    cannot_date_participant_ids: list[str] | None = None
    special_needs_flag: bool | None = None
    special_needs_notes: str | None = None
    registration_fee_status: str | None = None
    flexible_fields: dict | None = None


class ParticipantRead(ParticipantBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class ProgramSessionCreate(BaseModel):
    name: str
    starts_on: date | None = None
    location_label: str | None = None
    registration_open: bool = False
    intake_form_config: dict = Field(default_factory=dict)
    matching_rules: dict = Field(default_factory=dict)


class ProgramSessionRead(ProgramSessionCreate):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class RegistrationCreate(BaseModel):
    participant_id: uuid.UUID
    status: RegistrationStatus = RegistrationStatus.received
    payment_reference: str | None = None
    signed_liability_statement: bool = False
    signed_safety_statement: bool = False
    organizer_notes: str | None = None


class RegistrationRead(RegistrationCreate):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class DryRunRequest(BaseModel):
    participant_a_id: uuid.UUID
    participant_b_id: uuid.UUID


class MatchScore(BaseModel):
    score: float
    breakdown: dict
    warnings: list[str] = Field(default_factory=list)


class MatchDraftCreate(BaseModel):
    session_id: uuid.UUID
    participant_a_id: uuid.UUID
    participant_b_id: uuid.UUID
    source: MatchSource = MatchSource.manual
    curator_notes: str | None = None


class MatchDraftRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    participant_a_id: uuid.UUID
    participant_b_id: uuid.UUID
    source: MatchSource
    status: MatchStatus
    score: float | None
    score_breakdown: dict
    curator_notes: str | None
    email_subject: str | None
    email_body: str | None
    created_at: datetime
    updated_at: datetime
