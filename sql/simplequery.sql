-- simple query
-- Function to get all inventory details
CREATE OR REPLACE FUNCTION get_all_inventory_details()
RETURNS TABLE (
    i_id CHAR(6),
    i_name VARCHAR(50),
    i_stock INT,
    i_price NUMERIC(10, 2)
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        inv.i_id,
        inv.i_name,
        inv.i_stock,
        inv.i_price
    FROM
        inventory inv
    ORDER BY
        inv.i_name; -- Order by name for consistency
END;
$$;

SELECT * FROM get_all_inventory_details();