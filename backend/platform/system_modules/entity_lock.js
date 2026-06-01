// Entity Lock System Module
// General-purpose database-based entity locking mechanism.
// Uses stored procedures for atomic lock acquisition, safe across multiple server instances.
// Table: entity_lock | Procedures: prc_entity_lock_acquire, prc_entity_lock_release

module.exports =
{
    __initialize()
    {
    },

    // -------------------------------------------------------------------------
    // acquire(table, recordId, userId, ttlSeconds)
    // Attempts to acquire a lock on the given table+record for the given user.
    // If the lock is already held by the same user, it refreshes (extends) it.
    // If expired, it takes over. If held by another user, returns locked info.
    //
    // Returns:
    //   { rc: 0, acquired: true, locked_by: userId, locked_on: datetime }
    //   { rc: 0, acquired: false, locked_by: otherUserId, locked_on: datetime }
    // -------------------------------------------------------------------------
    acquire(table, recordId, userId, ttlSeconds)
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        if (!ttlSeconds)
        {
            ttlSeconds = $Const.ENTITY_LOCK_DEFAULT_TTL_SECONDS;
        }

        $Db.executeQuery("CALL prc_entity_lock_acquire(?, ?, ?, ?)", [table, String(recordId), userId, ttlSeconds]);

        // Check who holds the lock now
        let lockRow = $Db.executeQuery(
            `SELECT ENL_USR_ID, ENL_LOCKED_ON, ENL_EXPIRES_ON
            FROM \`entity_lock\`
            WHERE ENL_TABLE = ? AND ENL_RECORD_ID = ?`,
            [table, String(recordId)]);

        if (lockRow.length === 0)
        {
            // Should not happen, but handle gracefully
            vals.acquired = false;
            vals.locked_by = null;
            vals.locked_on = null;
            return {...rc, ...vals};
        }

        let lock = lockRow[0];
        vals.locked_by = lock.ENL_USR_ID;
        vals.locked_on = lock.ENL_LOCKED_ON;
        vals.expires_on = lock.ENL_EXPIRES_ON;
        vals.acquired = (lock.ENL_USR_ID === userId);

        return {...rc, ...vals};
    },

    // -------------------------------------------------------------------------
    // release(table, recordId, userId)
    // Releases the lock only if it is owned by the given user.
    //
    // Returns:
    //   { rc: 0, released: true }   — lock was removed
    //   { rc: 0, released: false }  — lock not owned by this user (or not found)
    // -------------------------------------------------------------------------
    release(table, recordId, userId)
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        $Db.executeQuery("CALL prc_entity_lock_release(?, ?, ?)", [table, String(recordId), userId]);

        // Check if lock still exists (if it does, the user didn't own it)
        let lockRow = $Db.executeQuery(
            `SELECT ENL_USR_ID
            FROM \`entity_lock\`
            WHERE ENL_TABLE = ? AND ENL_RECORD_ID = ?`,
            [table, String(recordId)]);

        vals.released = (lockRow.length === 0);

        return {...rc, ...vals};
    },

    // -------------------------------------------------------------------------
    // check(table, recordId)
    // Checks the current lock status without modifying anything.
    //
    // Returns:
    //   { rc: 0, is_locked: false }
    //   { rc: 0, is_locked: true, locked_by: userId, locked_on: datetime, expires_on: datetime }
    // -------------------------------------------------------------------------
    check(table, recordId)
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        let lockRow = $Db.executeQuery(
            `SELECT ENL_USR_ID, ENL_LOCKED_ON, ENL_EXPIRES_ON
            FROM \`entity_lock\`
            WHERE ENL_TABLE = ? AND ENL_RECORD_ID = ? AND ENL_EXPIRES_ON >= NOW()`,
            [table, String(recordId)]);

        if (lockRow.length === 0)
        {
            vals.is_locked = false;
            vals.locked_by = null;
            vals.locked_on = null;
            vals.expires_on = null;
        }
        else
        {
            vals.is_locked = true;
            vals.locked_by = lockRow[0].ENL_USR_ID;
            vals.locked_on = lockRow[0].ENL_LOCKED_ON;
            vals.expires_on = lockRow[0].ENL_EXPIRES_ON;
        }

        return {...rc, ...vals};
    },

    // -------------------------------------------------------------------------
    // forceRelease(table, recordId)
    // Admin override: removes the lock regardless of owner.
    // -------------------------------------------------------------------------
    forceRelease(table, recordId)
    {
        $Db.executeQuery(
            `DELETE FROM \`entity_lock\` WHERE ENL_TABLE = ? AND ENL_RECORD_ID = ?`,
            [table, String(recordId)]);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_DELETE_ERROR", $Db.lastErrorMsg());
        }

        return $ERRS.ERR_SUCCESS;
    },

    // -------------------------------------------------------------------------
    // cleanup()
    // Removes all expired locks from the table. Intended to be called
    // periodically (e.g., from a cron job) to keep the table clean.
    // -------------------------------------------------------------------------
    cleanup()
    {
        $Db.executeQuery(`DELETE FROM \`entity_lock\` WHERE ENL_EXPIRES_ON < NOW()`);
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_DELETE_ERROR", $Db.lastErrorMsg());
        }

        return $ERRS.ERR_SUCCESS;
    },
};
