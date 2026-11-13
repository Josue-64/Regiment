const { query, getPool, sql } = require('../lib/db');
const { endpoint, fail } = require('../lib/http');

const exercisesOf = (workoutId) => query(
  `SELECT e.id, e.name, e.muscle, e.machine, e.grip
   FROM WorkoutExercises we JOIN Exercises e ON e.id = we.exerciseId
   WHERE we.workoutId=@w ORDER BY we.position`, { w: workoutId });

async function ownWorkout(id, userId) {
  const [w] = await query('SELECT id, name, createdAt FROM Workouts WHERE id=@id AND userId=@u', { id: Number(id), u: userId });
  if (!w) fail(404, 'Workout not found');
  return w;
}

endpoint('listWorkouts', { methods: ['GET'], route: 'workouts' }, ({ user }) =>
  query('SELECT id, name, createdAt FROM Workouts WHERE userId=@u ORDER BY createdAt DESC', { u: user.id }));

endpoint('getWorkout', { methods: ['GET'], route: 'workouts/{id}' }, async ({ user, params }) => {
  const w = await ownWorkout(params.id, user.id);
  return { ...w, exercises: await exercisesOf(w.id) };
});

// Save from the builder: { name, exerciseIds: [3, 7, 12] }
endpoint('createWorkout', { methods: ['POST'], route: 'workouts' }, async ({ user, body }) => {
  const ids = body.exerciseIds;
  if (!body.name?.trim() || !Array.isArray(ids) || !ids.length) fail(400, 'Name and at least one exercise required');

  const tx = new sql.Transaction(await getPool());
  await tx.begin();
  try {
    const { recordset: [w] } = await new sql.Request(tx)
      .input('u', user.id).input('n', body.name.trim().slice(0, 100))
      .query('INSERT INTO Workouts (userId, name) OUTPUT INSERTED.id VALUES (@u, @n)');
    for (const [i, exId] of ids.entries()) {
      await new sql.Request(tx).input('w', w.id).input('e', Number(exId)).input('p', i)
        .query('INSERT INTO WorkoutExercises (workoutId, exerciseId, position) VALUES (@w, @e, @p)');
    }
    await tx.commit();
    return { id: w.id };
  } catch (e) { await tx.rollback(); throw e; }
});

endpoint('deleteWorkout', { methods: ['DELETE'], route: 'workouts/{id}' }, async ({ user, params }) => {
  const w = await ownWorkout(params.id, user.id);
  await query('DELETE FROM LogEntries WHERE logId IN (SELECT id FROM WorkoutLogs WHERE workoutId=@id)', { id: w.id });
  await query('DELETE FROM WorkoutLogs WHERE workoutId=@id', { id: w.id });
  await query('DELETE FROM Workouts WHERE id=@id', { id: w.id });
});

// "Your last session right there to beat"
endpoint('lastSession', { methods: ['GET'], route: 'workouts/{id}/last' }, async ({ user, params }) => {
  const w = await ownWorkout(params.id, user.id);
  return query(
    `SELECT le.exerciseId, le.weight, le.sets, le.reps
     FROM LogEntries le
     WHERE le.logId = (SELECT TOP 1 id FROM WorkoutLogs WHERE workoutId=@w AND userId=@u ORDER BY loggedAt DESC)`,
    { w: w.id, u: user.id });
});
