import argparse
from dataclasses import dataclass

from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.operations import (
    DateHistory,
    MatchDraft,
    Participant,
    ProgramSession,
    SessionRegistration,
    VisionStatementVersion,
)


SMALL_SEED_PARTICIPANTS = {
    ("Anna", "M."),
    ("Michael", "R."),
    ("Thomas", "K."),
}

SMALL_SEED_SESSIONS = {"May Discernment Dinner"}
SYNTHETIC_SESSIONS = {"Summer 2026", "Spring 2026", "Winter 2026"}


@dataclass(frozen=True)
class DummySelection:
    participant_ids: list
    session_ids: list


def _synthetic_participant_ids(db: Session) -> list:
    participants = db.scalars(select(Participant)).all()
    return [
        participant.id
        for participant in participants
        if (participant.flexible_fields or {}).get("generated_seed_batch")
        or (
            str(participant.email or "").endswith("@example.org")
            and str(participant.email or "").startswith("synthetic.")
        )
    ]


def _small_seed_participant_ids(db: Session) -> list:
    rows = db.scalars(
        select(Participant).where(
            or_(
                *[
                    (Participant.first_name == first_name) & (Participant.last_name == last_name)
                    for first_name, last_name in SMALL_SEED_PARTICIPANTS
                ]
            )
        )
    ).all()
    return [row.id for row in rows]


def _session_ids_by_name(db: Session, names: set[str]) -> list:
    rows = db.scalars(select(ProgramSession).where(ProgramSession.name.in_(names))).all()
    return [row.id for row in rows]


def select_dummy_data(db: Session, include_generated_sessions: bool) -> DummySelection:
    participant_ids = [*_synthetic_participant_ids(db), *_small_seed_participant_ids(db)]
    session_names = set(SMALL_SEED_SESSIONS)
    if include_generated_sessions:
        session_names.update(SYNTHETIC_SESSIONS)
    session_ids = _session_ids_by_name(db, session_names)

    return DummySelection(
        participant_ids=sorted(set(participant_ids), key=str),
        session_ids=sorted(set(session_ids), key=str),
    )


def _ids(db: Session, model, condition) -> set:
    return set(db.scalars(select(model.id).where(condition)).all())


def summarize(db: Session, selection: DummySelection) -> dict[str, int]:
    participant_ids = selection.participant_ids
    session_ids = selection.session_ids

    summary = {
        "participants": len(participant_ids),
        "program_sessions": len(session_ids),
        "vision_statement_versions": 0,
        "session_registrations": 0,
        "date_history": 0,
        "match_drafts": 0,
    }

    if participant_ids:
        participant_pair_filter = or_(
            DateHistory.participant_a_id.in_(participant_ids),
            DateHistory.participant_b_id.in_(participant_ids),
        )
        draft_pair_filter = or_(
            MatchDraft.participant_a_id.in_(participant_ids),
            MatchDraft.participant_b_id.in_(participant_ids),
        )
        summary["vision_statement_versions"] += len(
            _ids(
                db,
                VisionStatementVersion,
                VisionStatementVersion.participant_id.in_(participant_ids),
            )
        )
        registration_ids = _ids(
            db, SessionRegistration, SessionRegistration.participant_id.in_(participant_ids)
        )
        date_history_ids = _ids(db, DateHistory, participant_pair_filter)
        match_draft_ids = _ids(db, MatchDraft, draft_pair_filter)
    else:
        registration_ids = set()
        date_history_ids = set()
        match_draft_ids = set()

    if session_ids:
        registration_ids.update(
            _ids(db, SessionRegistration, SessionRegistration.session_id.in_(session_ids))
        )
        date_history_ids.update(_ids(db, DateHistory, DateHistory.session_id.in_(session_ids)))
        match_draft_ids.update(_ids(db, MatchDraft, MatchDraft.session_id.in_(session_ids)))

    summary["session_registrations"] = len(registration_ids)
    summary["date_history"] = len(date_history_ids)
    summary["match_drafts"] = len(match_draft_ids)

    return summary


def clear_dummy_data(db: Session, selection: DummySelection) -> None:
    participant_ids = selection.participant_ids
    session_ids = selection.session_ids

    if participant_ids:
        db.execute(
            delete(MatchDraft).where(
                or_(
                    MatchDraft.participant_a_id.in_(participant_ids),
                    MatchDraft.participant_b_id.in_(participant_ids),
                )
            )
        )
        db.execute(
            delete(DateHistory).where(
                or_(
                    DateHistory.participant_a_id.in_(participant_ids),
                    DateHistory.participant_b_id.in_(participant_ids),
                )
            )
        )
        db.execute(
            delete(SessionRegistration).where(
                SessionRegistration.participant_id.in_(participant_ids)
            )
        )
        db.execute(
            delete(VisionStatementVersion).where(
                VisionStatementVersion.participant_id.in_(participant_ids)
            )
        )

    if session_ids:
        db.execute(delete(MatchDraft).where(MatchDraft.session_id.in_(session_ids)))
        db.execute(delete(DateHistory).where(DateHistory.session_id.in_(session_ids)))
        db.execute(
            delete(SessionRegistration).where(SessionRegistration.session_id.in_(session_ids))
        )

    if participant_ids:
        db.execute(delete(Participant).where(Participant.id.in_(participant_ids)))

    if session_ids:
        db.execute(delete(ProgramSession).where(ProgramSession.id.in_(session_ids)))


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Remove local/demo data created by seed.py and generate_people.py."
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help=(
            "Actually delete the selected dummy records. Without this flag, the command "
            "is a dry run."
        ),
    )
    parser.add_argument(
        "--keep-generated-sessions",
        action="store_true",
        help=(
            "Keep Summer/Spring/Winter 2026 sessions. By default these generated test sessions are "
            "deleted along with synthetic participants."
        ),
    )
    args = parser.parse_args()

    with SessionLocal() as db:
        selection = select_dummy_data(
            db, include_generated_sessions=not args.keep_generated_sessions
        )
        summary = summarize(db, selection)

        print("Dummy data selected for cleanup:")
        for table, count in summary.items():
            print(f"  {table}: {count}")

        if not args.yes:
            print("\nDry run only. Re-run with --yes to delete these records.")
            return

        clear_dummy_data(db, selection)
        db.commit()
        print("\nDummy data cleanup complete.")


if __name__ == "__main__":
    main()
