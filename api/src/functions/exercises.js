const { query } = require('../lib/db');
const { endpoint, fail } = require('../lib/http');

const MUSCLES = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Core'];

// Catalog = built-ins + the caller's own custom exercises
endpoint('listExercises', { methods: ['GET'], route: 'exercises', auth: 'optional' }, ({ user, query: q }) =>
  query(
    `SELECT id, name, muscle, machine, grip, CASE WHEN createdBy IS NULL THEN 0 ELSE 1 END AS isCustom
     FROM Exercises
     WHERE (createdBy IS NULL OR createdBy = @uid)
       AND (@muscle IS NULL OR muscle = @muscle)
       AND (@q IS NULL OR name LIKE '%' + @q + '%')
     ORDER BY name`,
    { uid: user?.id ?? -1, muscle: q.muscle && q.muscle !== 'All' ? q.muscle : null, q: q.q || null }));

endpoint('createExercise', { methods: ['POST'], route: 'exercises' }, async ({ user, body }) => {
  if (!body.name?.trim()) fail(400, 'Exercise name required');
  if (!MUSCLES.includes(body.muscle)) fail(400, 'Invalid muscle group');
  const [row] = await query(
    `INSERT INTO Exercises (name, muscle, machine, grip, createdBy)
     OUTPUT INSERTED.id, INSERTED.name, INSERTED.muscle, INSERTED.machine, INSERTED.grip
     VALUES (@name, @muscle, @machine, @grip, @uid)`,
    { name: body.name.trim(), muscle: body.muscle, machine: body.machine || null, grip: body.grip || null, uid: user.id });
  return row;
});

// "Machine busy?" -> other exercises hitting the same muscle on different equipment
endpoint('alternatives', { methods: ['GET'], route: 'exercises/{id}/alternatives', auth: 'optional' }, async ({ user, params }) => {
  const [ex] = await query('SELECT id, muscle, machine FROM Exercises WHERE id=@id', { id: Number(params.id) });
  if (!ex) fail(404, 'Exercise not found');
  return query(
    `SELECT TOP 5 id, name, muscle, machine, grip FROM Exercises
     WHERE muscle=@muscle AND id<>@id AND (createdBy IS NULL OR createdBy=@uid)
     ORDER BY CASE WHEN ISNULL(machine,'') = ISNULL(@machine,'') THEN 1 ELSE 0 END, name`,
    { muscle: ex.muscle, id: ex.id, machine: ex.machine, uid: user?.id ?? -1 });
});
