# from dataclasses import dataclass

# from agents import Agent, function_tool
# from pydantic import BaseModel


# @dataclass
# class ToolSpec:
#     name: str
#     table: str
#     description: str
#     request: type[BaseModel] | None = None
#     response: type[BaseModel] | None = None


# def insert_tool(spec: ToolSpec):
#     request_model = spec.request

#     if request_model is None:
#         raise ValueError("request model is required")

#     @function_tool(
#         name_override=spec.name,
#         description_override=spec.description,
#     )
#     async def insert(data: request_model):
#         result = supabase.table(spec.table).insert(data.model_dump()).execute()

#         return result.data

#     return insert


# def get_tool(spec: ToolSpec):

#     @function_tool(
#         name_override=spec.name,
#         description_override=spec.description,
#     )
#     async def get(id: int):
#         result = supabase.table(spec.table).select("*").eq("id", id).single().execute()

#         return result.data

#     return get


# def search_tool(spec: ToolSpec):

#     @function_tool(
#         name_override=spec.name,
#         description_override=spec.description,
#     )
#     async def search(
#         query: str | None = None,
#         limit: int = 20,
#     ):
#         request = supabase.table(spec.table).select("*")

#         if query:
#             request = request.ilike("name", f"%{query}%")

#         result = request.limit(limit).execute()

#         return result.data

#     return search


# def update_tool(spec: ToolSpec):
#     request_model = spec.request

#     if request_model is None:
#         raise ValueError("request model is required")

#     @function_tool(
#         name_override=spec.name,
#         description_override=spec.description,
#     )
#     async def update(
#         id: int,
#         data: request_model,
#     ):
#         result = (
#             supabase.table(spec.table)
#             .update(data.model_dump(exclude_none=True))
#             .eq("id", id)
#             .execute()
#         )

#         return result.data

#     return update
