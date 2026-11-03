# Regiment
 
> **Demo only.** This is a demo of the app, not the final version. The pages, posts, profiles, and numbers are fake, nothing is saved, and there is no cloud connection. Refreshing a page resets everything. The final app will be built later.
  
## Description
Regiment is a free, cloud-based workout tracker that lets people log their training without a paywall and without having to rely on a notes app or a paper notebook. The app is meant to work on both a phone and a laptop.
 
Users can build workouts from a catalog of exercises or create their own custom exercises. They can log their weight, sets, and reps, and see what they did last session. The app also offers the ability to log progress photos. An AI assistant is planned to suggest alternative exercises when a machine is busy, warn about overusing a muscle, and suggest a better exercise order.

## Features

### Workout Customization
- Create personalized workout splits and routines.
- Select exercises from an existing exercise catalog.
- Create custom exercises not included in the catalog.
- Record exercise details such as equipment, machine type, grip, attachment, stance, and primary muscle group.

### Workout Tracking
- Log weight, sets, and repetitions.
- Save completed workout sessions.
- Review previous performance for individual exercises.
- Track strength progression over time.

### AI Workout Assistant
- Recommend alternative exercises when equipment is unavailable.
- Suggest exercises based on targeted muscle groups.
- Identify potential muscle group imbalances.
- Recommend exercise order based on intensity and muscle fatigue.

### Progress Tracking and Community
- Upload progress photos to private cloud storage.

## Technology Stack

| Technology | Purpose |
|---|---|
| Microsoft Azure | Cloud infrastructure |
| Azure Web Apps | Frontend hosting |
| Azure Functions | Backend processing and API operations |
| Azure SQL Database | Structured application data |
| Azure Blob Storage | Progress photo storage |
| Azure OpenAI Service | AI-powered workout recommendations |

## Cloud Architecture

The application uses a cloud-based architecture that separates the frontend, backend, database, and file storage.

1. **Frontend:** Users interact with the application through a web browser.
2. **Backend:** Azure Functions processes requests and handles application logic.
3. **Database:** Azure SQL Database stores user information, exercises, workout routines, and workout history.
4. **File Storage:** Azure Blob Storage stores uploaded progress photos separately from structured database records.
5. **AI Integration:** Azure OpenAI processes exercise information and returns workout recommendations.

The frontend communicates with the backend through API requests. Azure Functions then communicate with the appropriate cloud services depending on the user's request
