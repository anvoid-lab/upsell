class ProductCreate(BaseModel):
    name: str
    sku: str
    price: float
    stock: int = 0


get_product = get_tool(
    ToolSpec(
        name="get_product",
        table="products",
        description=(
            "Retrieve a specific product by its ID. "
            "Use this tool when the product ID is already known."
        ),
        response=Product,
    )
)


search_products = search_tool(
    ToolSpec(
        name="search_products",
        table="products",
        description=(
            "Search products in the catalog. "
            "Use this tool when the user wants to find products, "
            "check availability or browse existing products."
        ),
        response=Product,
    )
)


update_product = update_tool(
    ToolSpec(
        name="update_product",
        table="products",
        description=(
            "Update an existing product. "
            "Use this tool when the user wants to change "
            "product information such as price, stock or name."
        ),
        request=ProductUpdate,
        response=Product,
    )
)
