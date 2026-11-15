
const pool = require("../config/pool");

// ASSIGN STAFF TO A FLIGHT / DUTY SHIFT
exports.assignStaff = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const {
            staffId,
            scheduleId,
            dutyLocation,
            shiftStart,
            shiftEnd
        } = req.body;

        if (!staffId || !dutyLocation || !shiftStart || !shiftEnd) {
            return res.status(400).json({
                message: "Required fields are missing"
            });
        }

        if (new Date(shiftEnd) <= new Date(shiftStart)) {
            return res.status(400).json({
                message: "Shift end must be after shift start"
            });
        }

        await connection.beginTransaction();

        // Lock staff record
        const [staff] = await connection.query(
            `SELECT staff_id, staff_status
             FROM Staff
             WHERE staff_id = ?
             FOR UPDATE`,
            [staffId]
        );

        if (staff.length === 0) {
            throw new Error("Staff member not found");
        }

        if (staff[0].staff_status !== "Active") {
            throw new Error("Staff member is not active");
        }

        // Check overlapping shifts
        const [conflicts] = await connection.query(
            `SELECT 1
             FROM Staff_Assignment
             WHERE staff_id = ?
             AND assignment_status IN ('Assigned', 'In Progress')
             AND shift_start < ?
             AND shift_end > ?
             LIMIT 1`,
            [staffId, shiftEnd, shiftStart]
        );

        if (conflicts.length > 0) {
            throw new Error("Staff member already has an overlapping shift");
        }

        // Insert staff assignment
        const [result] = await connection.query(
            `INSERT INTO Staff_Assignment
             (staff_id, schedule_id, duty_location,
              shift_start, shift_end, assignment_status)
             VALUES (?, ?, ?, ?, ?, 'Assigned')`,
            [
                staffId,
                scheduleId || null,
                dutyLocation,
                shiftStart,
                shiftEnd
            ]
        );

        await connection.commit();

        res.status(201).json({
            message: "Staff assigned successfully",
            assignmentId: result.insertId,
            staffId,
            status: "Assigned"
        });

    } catch (error) {
        await connection.rollback();
        console.error(error);

        res.status(400).json({
            message: error.message
        });

    } finally {
        connection.release();
    }
};



// GET ALL ASSIGNMENTS OF A STAFF MEMBER
exports.getStaffAssignments = async (req, res) => {
    try {
        const { staffId } = req.params;

        const [rows] = await pool.query(
            `SELECT
                sa.staff_assignment_id,
                sa.staff_id,
                s.full_name,
                s.job_role,
                sa.schedule_id,
                sa.duty_location,
                sa.shift_start,
                sa.shift_end,
                sa.assignment_status
             FROM Staff_Assignment sa
             JOIN Staff s ON sa.staff_id = s.staff_id
             WHERE sa.staff_id = ?
             ORDER BY sa.shift_start`,
            [staffId]
        );

        res.status(200).json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: error.message
        });
    }
};



// UPDATE STAFF ASSIGNMENT STATUS
exports.updateAssignmentStatus = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { assignmentId } = req.params;
        const { status } = req.body;

        const allowedTransitions = {
            "Assigned": ["In Progress", "Cancelled"],
            "In Progress": ["Completed", "Cancelled"],
            "Completed": [],
            "Cancelled": []
        };

        await connection.beginTransaction();

        const [rows] = await connection.query(
            `SELECT assignment_status
             FROM Staff_Assignment
             WHERE staff_assignment_id = ?
             FOR UPDATE`,
            [assignmentId]
        );

        if (rows.length === 0) {
            throw new Error("Assignment not found");
        }

        const currentStatus = rows[0].assignment_status;

        if (!allowedTransitions[currentStatus]?.includes(status)) {
            throw new Error("Invalid status transition");
        }

        await connection.query(
            `UPDATE Staff_Assignment
             SET assignment_status = ?
             WHERE staff_assignment_id = ?`,
            [status, assignmentId]
        );

        await connection.commit();

        res.status(200).json({
            message: "Assignment status updated successfully",
            assignmentId,
            status
        });

    } catch (error) {
        await connection.rollback();

        res.status(400).json({
            message: error.message
        });

    } finally {
        connection.release();
    }
};


// GET ALL STAFF WITH CURRENT AVAILABILITY
exports.getAllStaff = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT
                s.staff_id,
                s.full_name,
                s.job_role,
                s.airport_id,
                s.staff_status,
                CASE
                    WHEN s.staff_status = 'On Leave'
                        THEN 'On Leave'
                    WHEN s.staff_status != 'Active'
                        THEN 'Inactive'
                    WHEN EXISTS (
                        SELECT 1
                        FROM Staff_Assignment sa
                        WHERE sa.staff_id = s.staff_id
                        AND sa.assignment_status IN ('Assigned', 'In Progress')
                        AND NOW() >= sa.shift_start
                        AND NOW() < sa.shift_end
                    )
                        THEN 'Busy'
                    ELSE 'Available'
                END AS availability
             FROM Staff s
             ORDER BY s.staff_id`
        );

        res.status(200).json(rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: error.message
        });
    }
};



 // GET STAFF BY AIRPORT
exports.getStaffByAirport = async (req, res) => {
    try {
        const { airportId } = req.params;

        const [rows] = await pool.query(
            `SELECT
                s.staff_id,
                s.full_name,
                s.job_role,
                s.airport_id,
                s.staff_status
             FROM Staff s
             WHERE s.airport_id = ?
             ORDER BY s.staff_id`,
            [airportId]
        );

        res.status(200).json(rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: error.message
        });
    }
};
