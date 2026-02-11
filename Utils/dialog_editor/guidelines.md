# Dialogue Editor Tool - Complete Overview

## Project Summary

This is a **browser-based visual dialogue editor** for creating node-graph based branching dialogue systems. It provides an intuitive interface for creating, editing, and managing complex conversations with support for choices, conditions, actions, and state management.

---

## Architecture

The tool consists of:
- **Frontend**: TypeScript application with visual node graph editor
- **Backend**: Bun-based HTTP server with JSON API
- **Build System**: Bun bundler for TypeScript compilation

---

## File Structure

```
dialogue_editor/
├── server.ts           # Bun HTTP server (backend API)
├── build.ts            # Build script for frontend
├── src/
│   └── app.ts          # Main frontend application
└── public/
    ├── index.html      # Single-page application HTML
    ├── styles.css      # Complete styling
    ├── app.js          # Compiled JavaScript (generated)
    └── app.js.map      # Source map (generated)
```

---

## Backend (server.ts)

### Server Configuration
- **Port**: 5173
- **Runtime**: Bun (Node.js alternative)
- **Static files served from**: `dialogue_editor/public/`
- **Dialogue files stored in**: `content/dialogue/`
- **Index file**: `content/dialogue/index.json`

### API Endpoints

#### `GET /api/dialogues`
Returns list of all dialogue files.
```typescript
Response: { items: [{ id: string }] }
```

#### `GET /api/dialogue/:id`
Loads a specific dialogue graph.
```typescript
Response: { id: string, data: DialogueGraph }
```

#### `POST /api/dialogue/:id`
Saves a dialogue graph with validation.
```typescript
Request Body: DialogueGraph
Response: { ok: true, validation: { errors: [], warnings: [] } }
```

### Data Validation
The server validates dialogue graphs for:
- **Errors**: Missing nodes, invalid node objects
- **Warnings**: Orphaned start/chatStart nodes, missing next references, empty nodes

### File Operations
- Automatically adds new dialogues to `index.json`
- Sanitizes IDs (alphanumeric, underscore, dash only)
- Ensures `.json` extension

---

## Frontend (src/app.ts)

### Type Definitions

#### Core Types
```typescript
type GraphEdgeType = "next" | "choice";

type GraphEdge = {
  from: string;
  to: string;
  type: GraphEdgeType;
};

type DialogueNode = {
  text?: string;
  textBy?: Dict<string>;
  action?: string;
  next?: string;
  end?: boolean;
  chat?: boolean;
  chatMarker?: string;
  chatInstant?: boolean;
  choices?: DialogueChoice[];
  choicesBy?: DialogueChoiceGroup[];
  requires?: RequirementSet;
  effects?: Effect[];
  display?: Dict<unknown>;
};

type DialogueChoice = {
  label?: string;
  say?: string;
  next?: string;
  chatMarker?: string;
  hidden?: boolean;
  lockedLabel?: string;
  requires?: RequirementSet;
  effects?: Effect[];
};

type DialogueGraph = {
  start?: string;
  chatStart?: string;
  nodes: Dict<DialogueNode>;
  interactions?: DialogueInteraction[];
  display?: Dict<unknown>;
};
```

### State Management

```typescript
type State = {
  dialogues: DialogueItem[];           // List of all dialogues
  currentId: string | null;            // Currently open dialogue ID
  data: DialogueGraph | null;          // Current dialogue data
  nodeOrder: string[];                 // Ordered list of node IDs
  currentNodeId: string | null;        // Selected node for editing
  dirty: boolean;                      // Unsaved changes flag
  graphPositions: Dict<GraphPoint>;    // Node positions in graph
  linkDrag: LinkDrag | null;           // Active connection drag
  mouseGraph: GraphPoint;              // Mouse position in graph space
  camera: GraphPoint;                  // Camera offset for panning
};
```

### Graph Rendering System

#### Constants
```typescript
const GRAPH = {
  nodeW: 200,      // Node width
  nodeH: 84,       // Node height
  gapX: 240,       // Horizontal spacing
  gapY: 140,       // Vertical spacing
  pad: 56          // Padding
};
```

#### Auto-Layout Algorithm
- BFS traversal from start node to determine depth
- Nodes arranged in columns by depth
- Orphaned nodes placed in additional columns

#### Visual Features
- **Bezier curve connections** between nodes
- **Two edge types**: 
  - Solid orange (`var(--accent)`) for "next" links
  - Solid teal (`var(--accent-2)`) for "choice" links
- **Drag handles** on each node for creating connections
- **Pan and zoom** camera system

### Node Editor Features

#### Node Properties
- **Text**: Main dialogue text
- **Next**: Auto-advance target node
- **End**: Terminates dialogue
- **Action**: Trigger system action
- **Chat/Chat Marker/Chat Instant**: Chat mode settings
- **Requirements**: Conditions to show node
- **Effects**: State changes when node visited

#### Choice Editor
Each choice has:
- Label (button text)
- Say (player/participant spoken text)
- Next (target node)
- Chat Marker
- Hidden (visibility)
- Locked Label (when requirements not met)
- Requirements
- Effects

### Requirements System

The system supports various requirement types that can be customized based on your application needs:

```typescript
const REQ_TYPES = [
  { value: "varEq", label: "Variable Equals", kind: "kv" },
  { value: "varNe", label: "Variable Not Equals", kind: "kv" },
  { value: "varMin", label: "Variable ≥", kind: "kv" },
  { value: "varMax", label: "Variable ≤", kind: "kv" },
  { value: "flag", label: "Flag Set", kind: "text" },
  { value: "notFlag", label: "Flag Not Set", kind: "text" },
  { value: "state", label: "State Is", kind: "text" },
  { value: "stateNot", label: "State Not", kind: "text" },
  { value: "seen", label: "Node Seen", kind: "list" },
  { value: "notSeen", label: "Node Not Seen", kind: "list" },
  { value: "time", label: "Time Phase(s)", kind: "list" },
  // Add custom requirement types as needed
];
```

### Effects System

Effect types that modify dialogue state:

```typescript
const FX_TYPES = [
  { value: "setVar", label: "Set Variable", kind: "kv" },
  { value: "addVar", label: "Add Variable", kind: "kv" },
  { value: "setFlag", label: "Set Flag", kind: "text" },
  { value: "clearFlag", label: "Clear Flag", kind: "text" },
  { value: "setState", label: "Set State", kind: "text" },
  { value: "emotion", label: "Set Emotion", kind: "text" },
  // Add custom effect types as needed
];
```

### Interactions System

Define interaction triggers (e.g., "Talk" buttons):

```typescript
type DialogueInteraction = {
  key?: string;                    // Internal identifier
  label?: string;                  // Display text
  hotkey?: string;                 // Keyboard shortcut
  entry?: string;                  // Entry node
  action?: string;                 // Action to trigger
  lockedLabel?: string;            // Text when locked
  resume?: boolean;                // Resume previous dialogue
  hidden?: boolean;                // Hidden from UI
  entryByTime?: Dict<string>;      // Different entries by time phase
  requires?: RequirementSet;       // Conditions
};
```

### Graph Interactions

#### Mouse/Touch
- **Double-click canvas**: Create new node at position
- **Drag node**: Move node in graph
- **Drag handle**: Create connection to another node
- **Drag canvas**: Pan camera
- **Click node**: Select for editing

#### Keyboard Shortcuts
- `H`: Toggle UI visibility (focus mode)
- `Escape`: Close all modals

#### Connection Logic
1. Drag from handle to target node
2. If node has no `next` and no `choices`, sets `next` to target
3. If `next` already exists (and no choices), converts it to a choice list:
   - Original `next` target becomes `Option 1`
   - New target becomes `Option 2`
4. For subsequent links, prompts for choice label with default `Option N`

### Local Storage
- Node positions persisted to `localStorage`
- Key format: `dialogue_graph_{dialogueId}`

---

## Build System (build.ts)

Uses Bun's built-in bundler:

```typescript
await Bun.build({
  entrypoints: ["src/app.ts"],
  outdir: "public",
  target: "browser",
  minify: false,
  sourcemap: "external"
});
```

---

## Styling (styles.css)

### Design System

#### Color Palette
```css
:root {
  --bg: #0c0f14;           /* Deep background */
  --bg-2: #121720;         /* Secondary background */
  --ink: #e8edf2;          /* Primary text */
  --muted: #9aa5b4;        /* Secondary text */
  --panel: #151b24;        /* Panel background */
  --panel-2: #1b2330;      /* Elevated panels */
  --accent: #ff8b5a;       /* Orange accent */
  --accent-2: #4dd1c8;     /* Teal accent */
  --danger: #ff6b63;       /* Error/danger */
  --stroke: rgba(232, 237, 242, 0.12);  /* Borders */
}
```

#### Typography
- **Display**: Marcellus (serif) - titles and headers
- **Body**: Chivo - UI text and content
- **Mono**: JetBrains Mono - code and IDs

#### Visual Effects
- Radial gradient background
- SVG noise texture overlay (mix-blend-mode: screen)
- Subtle grid pattern on graph canvas
- Soft shadows and rounded corners (18-20px radius)
- Glass-morphism panels

#### Layout
- **Topbar**: Brand, status, actions
- **Sidebar**: Dialogue list, node list (modal overlay)
- **Main**: Graph canvas (center)
- **Drawers**: Graph settings, Node inspector (modal overlays)
- **Quick controls**: Floating toolbar (top-left)

#### Responsive
- Mobile breakpoint at 1080px
- Sidebar moves below content
- Drawers become static sections

---

## HTML Structure (index.html)

### Main Sections

```html
<div class="app">
  <!-- Quick floating controls -->
  <div class="quick-controls">...</div>
  
  <!-- Header -->
  <header class="topbar">...</header>
  
  <!-- Main content area -->
  <div class="content">
    <!-- Sidebar (hidden by default) -->
    <aside class="sidebar" id="sidebar">...</aside>
    
    <!-- Main workspace -->
    <main class="main">
      <!-- Graph canvas -->
      <section class="panel graph-canvas">
        <div id="graphView">
          <svg id="graphEdges"></svg>  <!-- Connections -->
          <div id="graphNodes"></div>   <!-- Node elements -->
        </div>
      </section>
      
      <!-- Hint panel -->
      <section class="panel hint-panel">...</section>
    </main>
  </div>
  
  <!-- Graph settings drawer -->
  <section id="graphSettingsPanel" class="drawer">...</section>
  
  <!-- Node inspector drawer -->
  <section id="inspectorPanel" class="drawer">...</section>
</div>
```

---

## Usage Workflow

### Starting the Editor
```bash
# Build the frontend
bun run build.ts

# Start the server
bun run server.ts

# Open browser to http://localhost:5173
```

### Creating a Dialogue
1. Click "New" button
2. Enter unique dialogue ID
3. Creates default "start" node with interaction entry point

### Editing Nodes
1. Double-click canvas to create node
2. Click node to select
3. Edit in inspector panel:
   - Add text
   - Set end flag
   - Add requirements
   - Add effects
4. Drag handle to connect to other nodes

### Adding Choices
1. Select source node
2. Drag handle to target node
3. If "next" exists, prompts for choice label
4. Configure choice in inspector (requirements, effects, etc.)

### Saving
- Click "Save" button
- Validates on server
- Shows warnings if any
- Updates `index.json` for new dialogues

### Focus Mode
- Press `H` to hide all UI
- See only the node graph
- Press `H` again to restore

---

## Data Format

### Example Dialogue Graph

```json
{
  "start": "greeting",
  "chatStart": "chat_greeting",
  "nodes": {
    "greeting": {
      "text": "Hello there! How can I help you?",
      "choices": [
        {
          "label": "I'd like to talk",
          "say": "Can we chat?",
          "next": "chat_menu",
          "requires": { "met": true },
          "effects": [{ "setVar": { "key": "affinity", "value": 5 } }]
        },
        {
          "label": "Goodbye",
          "next": "farewell"
        }
      ]
    },
    "chat_menu": {
      "text": "What would you like to discuss?",
      "chat": true,
      "choices": [...]
    },
    "farewell": {
      "text": "See you later!",
      "end": true
    }
  },
  "interactions": [
    {
      "key": "talk",
      "label": "Talk",
      "hotkey": "e",
      "entry": "greeting",
      "entryByTime": {
        "Morning": "greeting_morning",
        "Evening": "greeting_evening"
      }
    }
  ],
  "display": {
    "theme": "default"
  }
}
```

---

## Integration with Your Application

The dialogue editor produces JSON files that can be consumed by your dialogue runtime system:

- **Dialogue Loader**: Loads and validates dialogue graphs
- **Dialogue Runtime**: Executes the dialogue logic
- **Dialogue State**: Manages conversation state and persistence

Dialogue files stored in: `content/dialogue/*.json`
Index file: `content/dialogue/index.json`

---

## Technical Highlights

1. **Zero Dependencies**: Pure TypeScript/Bun, no npm packages
2. **SVG-based Graph**: Clean bezier curves, efficient rendering
3. **Type-safe**: Full TypeScript coverage
4. **Real-time Validation**: Server validates on save
5. **Persistent Layout**: Node positions saved to localStorage
6. **Modal UI**: Non-intrusive overlay panels
7. **Keyboard Shortcuts**: Efficient workflow
8. **Dirty State Tracking**: Prevents accidental data loss

---

## Extension Points

To add new features:

1. **New Requirement Types**: Add to `REQ_TYPES` array in app.ts
2. **New Effect Types**: Add to `FX_TYPES` array in app.ts
3. **New Node Properties**: Extend `DialogueNode` type and editor
4. **Export Formats**: Add new endpoints in server.ts
5. **Visual Themes**: Modify CSS variables in styles.css

---

*Universal Dialogue Editor Specification*
