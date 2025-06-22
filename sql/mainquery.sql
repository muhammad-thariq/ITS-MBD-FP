-- main query
    -- PostgreSQL Schema and Dummy Data for Database Application
    -- Designed for Supabase (PostgreSQL) environment

-- Table Staff

CREATE TABLE IF NOT EXISTS staff (
    s_id CHAR(6) PRIMARY KEY,
    s_name VARCHAR(50) NOT NULL,
    s_phone VARCHAR(15),
    s_address VARCHAR(100),
    s_gender CHAR(1) -- 'M' for Male, 'F' for Female, 'O' for Other
);

-- Table Customer

CREATE TABLE IF NOT EXISTS customer (
    c_id CHAR(6) PRIMARY KEY,
    c_name VARCHAR(50) NOT NULL,
    c_phone VARCHAR(15)
);

-- Table Printer

CREATE TABLE IF NOT EXISTS printer (
    p_id CHAR(6) PRIMARY KEY,
    p_status BOOLEAN NOT NULL, -- TRUE for operational, FALSE for non-operational/in maintenance
    p_condition VARCHAR(100) -- e.g., 'Good', 'Minor wear', 'Needs repair'
);

-- Table Inventory

CREATE TABLE IF NOT EXISTS inventory (
    i_id CHAR(6) PRIMARY KEY,
    i_name VARCHAR(50) NOT NULL,
    i_stock INT NOT NULL CHECK (i_stock >= 0), -- Ensure stock cannot be negative
    i_price NUMERIC(10, 2) NOT NULL CHECK (i_price >= 0) -- Use NUMERIC for monetary values
);

-- Table Transaction

CREATE TABLE IF NOT EXISTS transaction (
    t_id CHAR(6) PRIMARY KEY,
    t_datetime TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    t_totalprice NUMERIC(10, 2) NOT NULL CHECK (t_totalprice >= 0),
    t_paymentmethod VARCHAR(10), -- e.g., 'Cash', 'Card', 'Online'
    customer_c_id CHAR(6) NOT NULL,
    FOREIGN KEY (customer_c_id) REFERENCES customer(c_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Table Staff_Printer (Many-to-Many between Staff and Printer)
-- Represents which staff members are assigned to or responsible for which printers.

CREATE TABLE IF NOT EXISTS staff_printer (
    staff_s_id CHAR(6) NOT NULL,
    printer_p_id CHAR(6) NOT NULL,
    PRIMARY KEY (staff_s_id, printer_p_id),
    FOREIGN KEY (staff_s_id) REFERENCES staff(s_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (printer_p_id) REFERENCES printer(p_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Table Maintenance

CREATE TABLE IF NOT EXISTS maintenance (
    ma_brand VARCHAR(10),
    ma_price NUMERIC(10, 2),
    ma_notes VARCHAR(100),
    ma_dateti TIMESTAMP WITH TIME ZONE NOT NULL,
    printer_p_id CHAR(6) NOT NULL,
    PRIMARY KEY (ma_dateti, printer_p_id), -- Composite PK as per PDM
    FOREIGN KEY (printer_p_id) REFERENCES printer(p_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Table Membership

CREATE TABLE IF NOT EXISTS membership (
    m_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- Auto-incrementing ID
    m_datecreated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    m_dateexpired DATE NOT NULL,
    customer_c_id CHAR(6) NOT NULL UNIQUE, -- A customer can only have one active membership
    m_points INT NOT NULL DEFAULT 0, -- New column for loyalty points
    FOREIGN KEY (customer_c_id) REFERENCES customer(c_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Table Staff_Transact (Many-to-Many between Staff and Transaction)
-- Represents which staff member handled which transaction.
-- Assuming one staff per transaction for simplicity, but the PDM allows multiple.
-- If multiple staff can be on one transaction, this acts as a junction.

CREATE TABLE IF NOT EXISTS staff_transact (
    st_s_id CHAR(6) NOT NULL,
    tr_t_id CHAR(6) NOT NULL,
    PRIMARY KEY (st_s_id, tr_t_id),
    FOREIGN KEY (st_s_id) REFERENCES staff(s_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (tr_t_id) REFERENCES transaction(t_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Table Printer_Transaction (Many-to-Many between Printer and Transaction)
-- Represents which printers were involved in a specific transaction (e.g., service for multiple printers).

CREATE TABLE IF NOT EXISTS printer_transaction (
    printer_p_id CHAR(6) NOT NULL,
    transaction_t_id CHAR(6) NOT NULL,
    PRIMARY KEY (printer_p_id, transaction_t_id),
    FOREIGN KEY (printer_p_id) REFERENCES printer(p_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (transaction_t_id) REFERENCES transaction(t_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Table Transaction_Inventory (Many-to-Many between Transaction and Inventory)
-- Represents which inventory items were part of a transaction, and their quantity.

CREATE TABLE IF NOT EXISTS transaction_inventory (
    transaction_t_id CHAR(6) NOT NULL,
    inventory_i_id CHAR(6) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0), -- Quantity of this item in the transaction
    PRIMARY KEY (transaction_t_id, inventory_i_id),
    FOREIGN KEY (transaction_t_id) REFERENCES transaction(t_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (inventory_i_id) REFERENCES inventory(i_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Dummy Data Insertion

-- Staff Data
INSERT INTO staff (s_id, s_name, s_phone, s_address, s_gender) VALUES
('S00001', 'Dzaky Indomie', '081234567890', 'Jl. Stasiun Lempuyangan No. 10, Jakarta', 'M'),
('S00002', 'Bima Rakagooning', '081298765432', 'Jl. Ngawi Utara No. 25, Bandung', 'M'),
('S00003', 'Reynard Saputra', '081211223344', 'Jl. Asia Afrika No. 5, Surabaya', 'M');

-- Customer Data
INSERT INTO customer (c_id, c_name, c_phone) VALUES
('C00001', 'Ahmad Suki', '081111111111'),
('C00002', 'Faiz Rungkut', '081222222222'),
('C00003', 'Chisato Nishikigi', '081333333333'),
('C00004', 'Mister Javascript', '081444444444'),
('C00005', 'Kurosawa Karbito', '081555555555');

-- Printer Data
INSERT INTO printer (p_id, p_status, p_condition) VALUES
('P00001', TRUE, 'Excellent'),
('P00002', TRUE, 'Good'),
('P00003', FALSE, 'Needs Ink Cartridge Replacement'),
('P00004', TRUE, 'Good');

-- Inventory Data
INSERT INTO inventory (i_id, i_name, i_stock, i_price) VALUES
('I00001', 'Black Ink Cartridge XL', 50, 150000.00),
('I00002', 'Color Ink Cartridge XL', 45, 180000.00),
('I00003', 'A4 Printer Paper (500 sheets)', 100, 50000.00),
('I00004', 'USB Printer Cable (2m)', 30, 25000.00),
('I00005', 'Printer Cleaning Kit', 20, 75000.00),
('I00006', 'Photo Paper (Glossy, 100 sheets)', 15, 60000.00);

-- Transaction Data
INSERT INTO transaction (t_id, t_datetime, t_totalprice, t_paymentmethod, customer_c_id) VALUES
('T00001', '2025-05-28 10:30:00+07', 350000.00, 'Card', 'C00001'), -- 2x I00001 + 1x I00003
('T00002', '2025-05-28 14:00:00+07', 180000.00, 'Cash', 'C00002'), -- 1x I00002
('T00003', '2025-05-29 09:15:00+07', 25000.00, 'QRIS', 'C00003'), -- 1x I00004
('T00004', '2025-05-29 16:45:00+07', 75000.00, 'Card', 'C00004'), -- 1x I00005
('T00005', '2025-05-30 11:00:00+07', 150000.00, 'Cash', 'C00001'), -- 1x I00001
('T00006', '2025-05-30 15:30:00+07', 120000.00, 'Card', 'C00005'); -- 2x I00006

-- Staff_Printer Data
INSERT INTO staff_printer (staff_s_id, printer_p_id) VALUES
('S00001', 'P00001'),
('S00001', 'P00003'), -- Alice also handles the printer needing ink
('S00002', 'P00002'),
('S00003', 'P00004');

-- Maintenance Data
INSERT INTO maintenance (ma_brand, ma_price, ma_notes, ma_dateti, printer_p_id) VALUES
('HP', 0.00, 'Routine check-up', '2025-04-10 09:00:00+07', 'P00001'),
('Epson', 120000.00, 'Replaced print head', '2025-05-15 11:30:00+07', 'P00002'),
('Canon', 0.00, 'Ordered new ink cartridge', '2025-05-29 10:00:00+07', 'P00003');

-- Membership Data
INSERT INTO membership (m_datecreated, m_dateexpired, customer_c_id, m_points) VALUES
('2024-12-01 00:00:00+07', '2025-12-01', 'C00001', 10000),
('2025-01-15 00:00:00+07', '2026-01-15', 'C00003', 5000),
('2025-03-20 00:00:00+07', '2026-03-20', 'C00005', 7500);

-- Staff_Transact Data
INSERT INTO staff_transact (st_s_id, tr_t_id) VALUES
('S00001', 'T00001'),
('S00002', 'T00002'),
('S00003', 'T00003'),
('S00001', 'T00004'),
('S00002', 'T00005'),
('S00003', 'T00006');

-- Printer_Transaction Data
INSERT INTO printer_transaction (printer_p_id, transaction_t_id) VALUES
('P00001', 'T00001'), -- Printer P00001 was part of transaction T00001 (e.g., service/checkup)
('P00002', 'T00002'),
('P00003', 'T00004'); -- Printer P00003 was part of T00004 (e.g., diagnostic service)

-- Transaction_Inventory Data
INSERT INTO transaction_inventory (transaction_t_id, inventory_i_id, quantity) VALUES
('T00001', 'I00001', 2), -- 2 Black Ink Cartridge XL
('T00001', 'I00003', 1), -- 1 A4 Printer Paper
('T00002', 'I00002', 1), -- 1 Color Ink Cartridge XL
('T00003', 'I00004', 1), -- 1 USB Printer Cable
('T00004', 'I00005', 1), -- 1 Printer Cleaning Kit
('T00005', 'I00001', 1), -- 1 Black Ink Cartridge XL
('T00006', 'I00006', 2); -- 2 Photo Paper

-- Optional: Update t_totalPrice based on actual inventory prices and quantities
-- This is a good practice to ensure consistency, especially if prices change.
-- For this dummy data, I've tried to match the prices manually, but this query
-- ensures it's correct.
UPDATE transaction t
SET t_totalprice = (
    SELECT COALESCE(SUM(ti.quantity * i.i_price), 0)
    FROM transaction_inventory ti
    JOIN inventory i ON ti.inventory_i_id = i.i_id
    WHERE ti.transaction_t_id = t.t_id
);

ALTER TABLE "public"."transaction"
ADD COLUMN t_paperscount INTEGER DEFAULT 0;

-- Function to reduce inventory stock after an item is part of a transaction
CREATE OR REPLACE FUNCTION trg_reduce_inventory_stock_after_purchase()
RETURNS TRIGGER AS $$
BEGIN
    -- Decrease stock for the purchased item
    UPDATE inventory
    SET i_stock = i_stock - NEW.quantity
    WHERE i_id = NEW.inventory_i_id;

    -- Optional: You could add more robust error handling here if the CHECK constraint
    -- on i_stock >= 0 isn't sufficient, e.g., to raise a more specific message
    -- if stock goes negative during an update. However, the CHECK constraint already prevents this.

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to activate the stock reduction function AFTER a new entry in transaction_inventory
CREATE TRIGGER trg_inventory_stock_reduction
AFTER INSERT ON transaction_inventory
FOR EACH ROW
EXECUTE FUNCTION trg_reduce_inventory_stock_after_purchase();