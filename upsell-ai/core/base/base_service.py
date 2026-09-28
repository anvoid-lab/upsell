from typing import TypeVar

from core.context import RequestContext

ModelT = TypeVar("ModelT")


class BaseService[ModelT]:
    # def __init__(
    #     self, ctx: Annotated[RequestContext, Depends(RequestContext.get)]
    # ) -> None:
    #     self.ctx = ctx

    @property
    def ctx(self) -> RequestContext:
        return RequestContext.get()
