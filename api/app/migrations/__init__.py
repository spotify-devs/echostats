"""Database migration runner.

Tracks applied migrations in a `_migrations` collection and runs
new ones in order on startup. Each migration is a Python module
in this package with an `async def up(db)` function.
"""

from typing import Any

import structlog

logger = structlog.get_logger()


async def run_migrations(db: Any) -> int:
    """Run pending migrations against the raw database.

    Must be called BEFORE init_beanie (migrations use raw motor ops).
    Returns the number of migrations applied.
    """
    import importlib
    import pkgutil

    import app.migrations as migrations_pkg

    coll = db["_migrations"]
    applied: set[str] = set()

    cursor = await coll.find({}, {"name": 1}).to_list()
    for doc in cursor:
        applied.add(doc["name"])

    # Discover migration modules sorted by name (001_, 002_, ...)
    modules = sorted(
        (name for _, name, _ in pkgutil.iter_modules(migrations_pkg.__path__) if not name.startswith("_")),
    )

    count = 0
    for name in modules:
        if name in applied:
            continue

        logger.info("Running migration", name=name)
        try:
            mod = importlib.import_module(f"app.migrations.{name}")
            await mod.up(db)
            await coll.insert_one({"name": name})
            count += 1
            logger.info("Migration complete", name=name)
        except Exception:
            logger.exception("Migration failed", name=name)
            raise

    return count
