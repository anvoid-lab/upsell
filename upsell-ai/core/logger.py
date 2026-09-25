import logging
import sys

_logger = logging.getLogger("nexosuppor-ai")
_logger.setLevel(logging.INFO)

if not _logger.handlers:
    _handler = logging.StreamHandler(sys.stdout)
    _handler.setLevel(logging.INFO)
    _formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    # _handler.setFormatter(_formatter)
    _logger.addHandler(_handler)


def info(message: str) -> None:
    _logger.info(message)


def warning(message: str) -> None:
    _logger.warning(message)


def error(message: str) -> None:
    _logger.error(message)
