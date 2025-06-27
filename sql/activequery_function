CREATE OR REPLACE FUNCTION get_inventory_stock_sorted()
RETURNS TABLE (
    inventory_name VARCHAR(50),
    inventory_stock INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i_name,
        i_stock
    FROM
        inventory
    ORDER BY
        i_stock DESC;
END;
$$ LANGUAGE plpgsql;
