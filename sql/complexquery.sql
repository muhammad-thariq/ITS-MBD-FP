-- complex query
CREATE OR REPLACE FUNCTION get_printer_details_with_maintenance()
RETURNS TABLE (
    p_id CHAR(6),
    p_status BOOLEAN,
    p_condition VARCHAR(100),
    assigned_staff_names TEXT, -- STRING_AGG returns TEXT by default
    latest_maintenance_date TIMESTAMP WITH TIME ZONE,
    latest_maintenance_brand VARCHAR(10),
    latest_maintenance_price NUMERIC(10, 2),
    latest_maintenance_notes VARCHAR(100)
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.p_id,
        p.p_status,
        p.p_condition,
        STRING_AGG(s.s_name, ', ') AS assigned_staff_names,
        lm.ma_dateti AS latest_maintenance_date,
        lm.ma_brand AS latest_maintenance_brand,
        lm.ma_price AS latest_maintenance_price,
        lm.ma_notes AS latest_maintenance_notes
    FROM
        printer p
    LEFT JOIN
        staff_printer sp ON p.p_id = sp.printer_p_id
    LEFT JOIN
        staff s ON sp.staff_s_id = s.s_id
    LEFT JOIN LATERAL (
        SELECT
            ma_dateti,
            ma_brand,
            ma_price,
            ma_notes
        FROM
            maintenance m
        WHERE
            m.printer_p_id = p.p_id
        ORDER BY
            ma_dateti DESC
        LIMIT 1
    ) AS lm ON TRUE
    GROUP BY
        p.p_id, p.p_status, p.p_condition,
        lm.ma_dateti, lm.ma_brand, lm.ma_price, lm.ma_notes
    ORDER BY
        p.p_id;
END;
$$;

SELECT * FROM get_printer_details_with_maintenance();
