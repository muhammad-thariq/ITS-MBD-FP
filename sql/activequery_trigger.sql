-- active querry (trigger)

-- *** Step 2: Create Function for Membership Points Benefits (BEFORE INSERT on transaction) ***
-- This function will modify transaction total price and membership points.
CREATE OR REPLACE FUNCTION trg_process_membership_benefits()
RETURNS TRIGGER AS $$
DECLARE
    v_membership_points INT;
    v_membership_id INT;
    v_points_to_use INT;
    v_points_earned INT;
BEGIN
    RAISE NOTICE '--- Trigger trg_process_membership_benefits STARTED ---';
    RAISE NOTICE 'Processing transaction % for customer % with initial total price %', NEW.t_id, NEW.customer_c_id, NEW.t_totalprice;

    -- Check if the customer has an active membership and retrieve their current points
    SELECT
        m.m_id,
        m.m_points
    INTO
        v_membership_id,
        v_membership_points
    FROM
        membership m
    WHERE
        m.customer_c_id = NEW.customer_c_id
        AND m.m_dateexpired >= CURRENT_DATE; -- Ensure the membership is active

    IF FOUND THEN -- FOUND is true if the last SELECT INTO returned a row
        RAISE NOTICE 'Active membership FOUND for customer %. Membership ID: %, Current Points: %.', NEW.customer_c_id, v_membership_id, v_membership_points;

        IF v_membership_points > 0 THEN
            -- Scenario 1: Customer has membership points > 0
            RAISE NOTICE 'Customer has % points. Attempting to use points.', v_membership_points;

            -- Determine how many points to use: either all available points or enough to reduce total price to 0
            -- Use LEAST to ensure points used don't exceed available points or transaction total
            v_points_to_use := LEAST(v_membership_points, NEW.t_totalprice::INT);

            -- Reduce the transaction's total price by the used points
            NEW.t_totalprice := NEW.t_totalprice - v_points_to_use;

            -- Deduct the used points from the customer's membership
            UPDATE membership
            SET m_points = m_points - v_points_to_use
            WHERE m_id = v_membership_id;

            RAISE NOTICE 'Used % points. New transaction total price: %. Remaining membership points for %: %.',
                          v_points_to_use, NEW.t_totalprice, NEW.customer_c_id, (v_membership_points - v_points_to_use);

        ELSE -- v_membership_points = 0, but customer has an active membership
            -- Scenario 2: Customer has 0 points but an active membership
            RAISE NOTICE 'Customer has 0 points. Calculating points to earn.';
            -- Calculate points to add: total transaction / 10 (rounded down)
            v_points_earned := FLOOR(NEW.t_totalprice / 10);

            IF v_points_earned > 0 THEN
                -- Add points to the customer's membership
                UPDATE membership
                SET m_points = m_points + v_points_earned
                WHERE m_id = v_membership_id;

                -- Fetch updated points for logging purposes (after the UPDATE)
                SELECT m_points INTO v_membership_points FROM membership WHERE m_id = v_membership_id;

                RAISE NOTICE 'Earned % points. New membership points for %: %.',
                              v_points_earned, NEW.customer_c_id, v_membership_points;
            ELSE
                RAISE NOTICE 'No points earned as transaction total price is too low (less than 10 for total price %)', NEW.t_totalprice;
            END IF;
        END IF;
    ELSE
        RAISE NOTICE 'No active membership FOUND for customer %. Transaction proceeds without point benefits.', NEW.customer_c_id;
    END IF;

    RAISE NOTICE '--- Trigger trg_process_membership_benefits FINISHED. Returning NEW total price: % ---', NEW.t_totalprice;
    RETURN NEW; -- Important for BEFORE triggers, returns the (potentially modified) new row
END;
$$ LANGUAGE plpgsql;


-- *** Step 3: Create the Trigger for Membership Points Benefits ***
-- This trigger runs BEFORE a new transaction is inserted.
CREATE TRIGGER trg_membership_points_benefits
BEFORE INSERT ON transaction
FOR EACH ROW
EXECUTE FUNCTION trg_process_membership_benefits();


-- *** Step 4: Create Function for Inventory Stock Reduction (AFTER INSERT on transaction_inventory) ***
-- This function will decrease inventory stock.
CREATE OR REPLACE FUNCTION trg_reduce_inventory_stock_after_purchase()
RETURNS TRIGGER AS $$
BEGIN
    RAISE NOTICE '--- Trigger trg_inventory_stock_reduction STARTED for inventory item % (quantity: %) ---', NEW.inventory_i_id, NEW.quantity;

    -- Decrease stock for the purchased item
    UPDATE inventory
    SET i_stock = i_stock - NEW.quantity
    WHERE i_id = NEW.inventory_i_id;

    RAISE NOTICE 'Reduced stock for item %. New stock: %.', NEW.inventory_i_id, (SELECT i_stock FROM inventory WHERE i_id = NEW.inventory_i_id);

    RETURN NEW; -- For AFTER triggers, returning NEW is standard but not strictly required to modify the row
END;
$$ LANGUAGE plpgsql;


-- *** Step 5: Create the Trigger for Inventory Stock Reduction ***
-- This trigger runs AFTER a new item is linked to a transaction.
CREATE TRIGGER trg_inventory_stock_reduction
AFTER INSERT ON transaction_inventory
FOR EACH ROW
EXECUTE FUNCTION trg_reduce_inventory_stock_after_purchase();
