-- active query (view)
CREATE OR REPLACE VIEW customers_with_active_membership AS
SELECT
    c.c_id,
    c.c_name,
    c.c_phone,
    m.m_id AS membership_id,
    m.m_datecreated AS membership_created_date,
    m.m_dateexpired AS membership_expiry_date,
    m.m_points AS membership_points
FROM
    customer c
JOIN
    membership m ON c.c_id = m.customer_c_id
WHERE
    m.m_dateexpired >= CURRENT_DATE
ORDER BY
    c.c_id;