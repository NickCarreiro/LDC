from app.db.base import Base
from app.db.session import engine
from app.models import operations  # noqa: F401


def main() -> None:
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    main()
