import logging
import re
import sys
from typing import Any


class _Logger:
    DEFAULT_ALLOWED_FIELDS = {  # noqa: RUF012
        "request_id",
        "run_id",
        "tenant_id",
        "trace_id",
        "code",
    }
    SECRET_PATTERN = re.compile(
        r"(?i)(api[_-]?key|secret|token|password|authorization)\s*[:=]\s*\S+"
    )

    def __init__(
        self,
        name: str = "upsell-ai",
        level: int = logging.INFO,
        allowed_fields: set[str] | None = None,
    ) -> None:
        self.logger = logging.getLogger(name)
        self.logger.setLevel(level)
        self.allowed_fields = (
            allowed_fields
            if allowed_fields is not None
            else self.DEFAULT_ALLOWED_FIELDS
        )

        self._setup_handler()

    def _setup_handler(self) -> None:
        """Configures the stdout stream handler if not already present."""
        if not self.logger.handlers:
            handler = logging.StreamHandler(sys.stdout)
            handler.setFormatter(
                logging.Formatter(
                    fmt="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
                    datefmt="%Y-%m-%d %H:%M:%S",
                )
            )
            self.logger.addHandler(handler)

    def _safe(self, message: str) -> str:
        """Redacts sensitive tokens and secrets from the message."""
        return self.SECRET_PATTERN.sub(r"\1=[redacted]", message)

    def _format(self, message: str, fields: dict[str, Any]) -> str:
        """Filters allowed context fields and formats the final log string."""
        allowed = {
            key: value for key, value in fields.items() if key in self.allowed_fields
        }
        suffix = " ".join(f"{key}={value}" for key, value in allowed.items())
        text = f"{message} {suffix}".strip()
        return self._safe(text)

    def info(self, message: str, **fields: Any) -> None:
        self.logger.info(self._format(message, fields))

    def warning(self, message: str, **fields: Any) -> None:
        self.logger.warning(self._format(message, fields))

    def error(self, message: str, **fields: Any) -> None:
        self.logger.error(self._format(message, fields))

    def debug(self, message: str, **fields: Any) -> None:
        self.logger.debug(self._format(message, fields))


logger = _Logger()
