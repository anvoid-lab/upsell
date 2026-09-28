from pydantic import BaseModel, ConfigDict


class ContractModel(BaseModel):
    """A shape this application defines. Unknown fields are rejected."""

    model_config = ConfigDict(extra="forbid")


class RecordModel(BaseModel):
    """A row shape read from trusted persistence.

    Unknown columns are ignored, so a later additive migration cannot break a read.
    """

    model_config = ConfigDict(extra="ignore")
