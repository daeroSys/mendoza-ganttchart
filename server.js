import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

app.use(express.json());

// Enable CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'projects.json');

// Ensure data folder and file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

function loadProjects() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        // Deduplicate projects by ID
        const unique = [];
        const seen = new Set();
        for (const p of parsed) {
          if (p && p.id && !seen.has(p.id)) {
            seen.add(p.id);
            unique.push(p);
          }
        }
        if (unique.length !== parsed.length) {
          fs.writeFileSync(DATA_FILE, JSON.stringify(unique, null, 2), 'utf-8');
        }
        return unique;
      }
    }
  } catch (err) {
    console.error('Error loading projects database:', err);
  }
  return [];
}

function saveProjects(projects) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(projects, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving projects database:', err);
  }
}

// REST API Endpoints
app.get('/api/projects', (req, res) => {
  res.json(loadProjects());
});

app.get('/api/projects/:id', (req, res) => {
  const projects = loadProjects();
  const project = projects.find(p => p.id === req.params.id);
  if (project) {
    res.json(project);
  } else {
    res.status(404).json({ error: 'Project not found' });
  }
});

app.post('/api/projects', (req, res) => {
  const newProject = req.body;
  if (!newProject.id || !newProject.name) {
    return res.status(400).json({ error: 'Invalid project data' });
  }
  const projects = loadProjects();
  if (projects.some(p => p.id === newProject.id)) {
    return res.status(200).json(newProject); // already exists, bypass
  }
  projects.push(newProject);
  saveProjects(projects);
  res.status(201).json(newProject);
});

app.put('/api/projects/:id', (req, res) => {
  const projects = loadProjects();
  const index = projects.findIndex(p => p.id === req.params.id);
  if (index !== -1) {
    projects[index] = { ...projects[index], ...req.body };
    saveProjects(projects);
    res.json(projects[index]);
  } else {
    res.status(404).json({ error: 'Project not found' });
  }
});

app.delete('/api/projects/:id', (req, res) => {
  const projects = loadProjects();
  const filtered = projects.filter(p => p.id !== req.params.id);
  if (filtered.length !== projects.length) {
    saveProjects(filtered);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Project not found' });
  }
});

// Serve frontend build in production
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// WebSocket Rooms & Broadcast setup
const rooms = new Map(); // projectId -> Set of WebSocket clients

wss.on('connection', (ws, request) => {
  let currentRoom = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      if (data.type === 'join') {
        const { projectId } = data;
        currentRoom = projectId;
        if (!rooms.has(currentRoom)) {
          rooms.set(currentRoom, new Set());
        }
        rooms.get(currentRoom).add(ws);
      } else if (data.type === 'update') {
        const { projectId, project } = data;
        
        // Broadcast updates to all OTHER clients in the same project room
        const roomClients = rooms.get(projectId);
        if (roomClients) {
          const payload = JSON.stringify({ type: 'sync', project });
          for (const client of roomClients) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(payload);
            }
          }
        }
      }
    } catch (err) {
      console.error('WebSocket message handling error:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoom && rooms.has(currentRoom)) {
      const roomClients = rooms.get(currentRoom);
      roomClients.delete(ws);
      if (roomClients.size === 0) {
        rooms.delete(currentRoom);
      }
    }
  });
});

// Upgrade HTTP connection to WebSockets
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
