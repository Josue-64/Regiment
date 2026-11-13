-- Run against your Azure SQL Database (Query editor in the portal, or sqlcmd)
CREATE TABLE Users (
  id INT IDENTITY PRIMARY KEY,
  username NVARCHAR(50) NOT NULL UNIQUE,
  passwordHash NVARCHAR(100) NOT NULL,
  displayName NVARCHAR(80) NOT NULL,
  bio NVARCHAR(300) NULL,
  createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE TABLE Exercises (               -- createdBy NULL = built-in catalog
  id INT IDENTITY PRIMARY KEY,
  name NVARCHAR(100) NOT NULL,
  muscle NVARCHAR(20) NOT NULL,
  machine NVARCHAR(50) NULL,
  grip NVARCHAR(50) NULL,
  createdBy INT NULL REFERENCES Users(id)
);
CREATE TABLE Workouts (
  id INT IDENTITY PRIMARY KEY,
  userId INT NOT NULL REFERENCES Users(id),
  name NVARCHAR(100) NOT NULL,
  createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE TABLE WorkoutExercises (
  workoutId INT NOT NULL REFERENCES Workouts(id) ON DELETE CASCADE,
  exerciseId INT NOT NULL REFERENCES Exercises(id),
  position INT NOT NULL,
  PRIMARY KEY (workoutId, position)
);
CREATE TABLE WorkoutLogs (
  id INT IDENTITY PRIMARY KEY,
  userId INT NOT NULL REFERENCES Users(id),
  workoutId INT NOT NULL REFERENCES Workouts(id),
  loggedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE TABLE LogEntries (
  id INT IDENTITY PRIMARY KEY,
  logId INT NOT NULL REFERENCES WorkoutLogs(id) ON DELETE CASCADE,
  exerciseId INT NOT NULL REFERENCES Exercises(id),
  weight DECIMAL(7,2) NOT NULL,
  sets INT NOT NULL,
  reps INT NOT NULL
);
CREATE TABLE Posts (
  id INT IDENTITY PRIMARY KEY,
  userId INT NOT NULL REFERENCES Users(id),
  title NVARCHAR(100) NOT NULL,
  exercises NVARCHAR(MAX) NOT NULL,    -- JSON array of exercise names
  note NVARCHAR(300) NULL,
  createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE TABLE PostLikes (
  postId INT NOT NULL REFERENCES Posts(id) ON DELETE CASCADE,
  userId INT NOT NULL REFERENCES Users(id),
  PRIMARY KEY (postId, userId)
);
CREATE TABLE Photos (                  -- the image itself lives in Blob Storage
  id INT IDENTITY PRIMARY KEY,
  userId INT NOT NULL REFERENCES Users(id),
  blobName NVARCHAR(200) NOT NULL,
  createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

INSERT INTO Exercises (name, muscle, machine, grip) VALUES
('Barbell Bench Press','Chest','Barbell','Medium grip'),
('Incline Dumbbell Press','Chest','Dumbbell',NULL),
('Chest Fly Machine','Chest','Machine',NULL),
('Pull Up','Back','Bodyweight','Wide grip'),
('Lat Pulldown','Back','Cable','Wide bar'),
('Seated Cable Row','Back','Cable','V-handle'),
('Overhead Press','Shoulders','Barbell',NULL),
('Cable Lateral Raise','Shoulders','Cable','Single handle'),
('Dumbbell Lateral Raise','Shoulders','Dumbbell',NULL),
('Barbell Curl','Biceps','Barbell','Supinated'),
('Hammer Curl','Biceps','Dumbbell','Neutral grip'),
('Rope Pushdown','Triceps','Cable','Rope'),
('Skull Crusher','Triceps','Barbell','EZ bar'),
('Back Squat','Legs','Barbell',NULL),
('Romanian Deadlift','Legs','Barbell',NULL),
('Leg Press','Legs','Machine',NULL),
('Leg Curl','Legs','Machine',NULL),
('Cable Crunch','Core','Cable','Rope'),
('Hanging Leg Raise','Core','Bodyweight',NULL);
