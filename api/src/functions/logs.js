const { getPool, query, sql } = require('../lib/db');
const { endpoint, fail } = require('../lib/http');

// { workoutId, entries: [{ exerciseId, weight, sets, reps }] }
endpoint('createLog', { methods: ['POST'], route: 'logs' }, async ({ user, body }) => {
  const { workoutId, entries } = body;
  const [w] = await query('SELECT id FROM Workouts WHERE id=@id AND userId=@u', { id: Number(workoutId), u: user.id });
  if (!w) fail(404, 'Workout not found');
  if (!Array.isArray(entries) || !entries.length) fail(400, 'No entries');
  for (const e of entries) {
    if (![e.weight, e.sets, e.reps].every((n) => Number.isFinite(Number(n)) && Number(n) >= 0)) fail(400, 'Weight, sets and reps must be numbers');
  }

  const tx = new sql.Transaction(await getPool());
  await tx.begin();
  try {
    const { recordset: [log] } = await new sql.Request(tx).input('w', w.id).input('u', user.id)
      .query('INSERT INTO WorkoutLogs (userId, workoutId) OUTPUT INSERTED.id VALUES (@u, @w)');
    for (const e of entries) {
      await new sql.Request(tx)
        .input('l', log.id).input('e', Number(e.exerciseId))
        .input('wt', sql.Decimal(7, 2), Number(e.weight)).input('s', Number(e.sets)).input('r', Number(e.reps))
        .query('INSERT INTO LogEntries (logId, exerciseId, weight, sets, reps) VALUES (@l, @e, @wt, @s, @r)');
    }
    await tx.commit();
    return { id: log.id };
  } catch (err) { await tx.rollback(); throw err; }
});

// Past workouts list (newest first), entries grouped under each log
endpoint('listLogs', { methods: ['GET'], route: 'logs' }, async ({ user }) => {
  const rows = await query(
    `SELECT TOP 200 l.id AS logId, l.loggedAt, w.name AS workoutName,
            e.name AS exerciseName, le.weight, le.sets, le.reps
     FROM WorkoutLogs l
     JOIN Workouts w ON w.id = l.workoutId
     JOIN LogEntries le ON le.logId = l.id
     JOIN Exercises e ON e.id = le.exerciseId
     WHERE l.userId=@u ORDER BY l.loggedAt DESC, le.id`, { u: user.id });
  const logs = new Map();
  for (const r of rows) {
    if (!logs.has(r.logId)) logs.set(r.logId, { id: r.logId, loggedAt: r.loggedAt, workoutName: r.workoutName, entries: [] });
    logs.get(r.logId).entries.push({ exercise: r.exerciseName, weight: r.weight, sets: r.sets, reps: r.reps });
  }
  return [...logs.values()];
});
