import { Router } from 'express';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const router = Router();

// VI: API cho KANBAN Dashboard - đọc real-time từ task.md, implementation, workflows

// Get project root paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..', '..');
const BRAIN_ROOT = 'C:/Users/haitr/.gemini/antigravity/brain/1f98f3d2-1958-445f-a296-f34209a34179';

// Parse markdown checkboxes to extract tasks
function parseTasksFromMarkdown(content) {
  // Normalize line endings (Windows CRLF to LF)
  const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedContent.split('\n');
  const tasks = [];
  let currentPhase = '';
  let currentSection = '';
  
  for (const line of lines) {
    // Detect phase headers (e.g., "# ✅ PHASE 0: FOUNDATION SETUP")
    if (line.includes('PHASE') && line.startsWith('#')) {
      const phaseMatch = line.match(/PHASE\s*(\d+):\s*([^(]+)/i);
      if (phaseMatch) {
        currentPhase = `Phase ${phaseMatch[1]}: ${phaseMatch[2].replace(/[✅🟡⬜]/g, '').trim()}`;
      }
    }
    
    // Detect section headers (e.g., "## 0.1 UI Framework Selection")
    if (line.startsWith('## ')) {
      currentSection = line.replace(/^##\s*/, '').replace(/\s*[✅🟡⬜(@].*/g, '').trim();
    }
    
    // Parse task lines with different patterns
    // Pattern 1: - [x] **0.1.1** Task description
    let taskMatch = line.match(/^-\s*\[([ xX])\]\s*\*\*(\d+\.\d+\.\d+)\*\*\s*(.+)$/);
    
    if (taskMatch) {
      const isCompleted = taskMatch[1].toLowerCase() === 'x';
      const taskId = taskMatch[2];
      let title = taskMatch[3]
        .replace(/\s*✅\s*/g, '')
        .replace(/\s*→.*$/g, '')
        .trim();
      
      // Limit title length
      if (title.length > 80) {
        title = title.substring(0, 77) + '...';
      }
      
      tasks.push({
        id: taskId,
        title: title,
        phase: currentPhase || 'Unknown',
        section: currentSection || 'General',
        status: isCompleted ? 'done' : 'todo',
        priority: getPriority(currentPhase),
      });
    }
  }
  
  return tasks;
}

function getPriority(phase) {
  if (!phase) return 'medium';
  if (phase.includes('Phase 0') || phase.includes('Phase 1')) return 'high';
  if (phase.includes('Phase 2') || phase.includes('Phase 3') || phase.includes('Phase 4')) return 'medium';
  return 'low';
}

// Parse phase progress from task.md progress table
function parsePhaseProgress(content) {
  const phases = [];
  const normalizedContent = content.replace(/\r\n/g, '\n');
  
  // Look for progress tracking table
  const tableMatch = normalizedContent.match(/\|\s*Phase\s*\|\s*Tasks\s*\|[\s\S]*?\n([\s\S]*?)(?=\n---|\n#|$)/);
  if (tableMatch) {
    const tableContent = tableMatch[0];
    const rows = tableContent.split('\n').filter(l => l.includes('|') && !l.includes('---') && !l.includes('Phase | Tasks'));
    
    for (const row of rows) {
      const match = row.match(/\|\s*(\d+)\.\s*([^|]+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*([^|]+)\s*\|/);
      if (match) {
        const statusText = match[5].trim();
        let progress = 0;
        let status = 'todo';
        
        if (statusText.includes('✅') || statusText.includes('DONE')) {
          progress = 100;
          status = 'done';
        } else if (statusText.includes('🟡') || statusText.includes('Partial')) {
          progress = 50;
          status = 'inprogress';
        } else if (statusText.includes('⬜')) {
          progress = 0;
          status = 'todo';
        }
        
        phases.push({
          id: parseInt(match[1]),
          name: match[2].trim(),
          totalTasks: parseInt(match[3]),
          days: parseInt(match[4]),
          status: status,
          progress: progress,
        });
      }
    }
  }
  
  return phases;
}

// Get file modification time
function getFileModTime(filepath) {
  try {
    if (existsSync(filepath)) {
      return statSync(filepath).mtime.toISOString();
    }
  } catch (e) {}
  return null;
}

// Main API endpoint - GET /api/kanban
router.get('/', (req, res) => {
  try {
    // Read task.md
    const taskPath = join(BRAIN_ROOT, 'task.md');
    let taskContent = '';
    let taskModTime = null;
    
    if (existsSync(taskPath)) {
      taskContent = readFileSync(taskPath, 'utf-8');
      taskModTime = getFileModTime(taskPath);
    } else {
      console.log('Task file not found:', taskPath);
    }
    
    // Read implementation_plan.md
    const implPath = join(BRAIN_ROOT, 'implementation_plan.md');
    let implModTime = null;
    if (existsSync(implPath)) {
      implModTime = getFileModTime(implPath);
    }
    
    // Parse tasks
    const allTasks = parseTasksFromMarkdown(taskContent);
    
    // Categorize tasks
    const done = allTasks.filter(t => t.status === 'done');
    const todo = allTasks.filter(t => t.status === 'todo');
    
    // Mark certain tasks as "in progress"
    const inProgressSections = ['Template', 'Report', 'Canvas', 'Designer'];
    const inProgress = todo.filter(t => 
      inProgressSections.some(s => 
        t.section.toLowerCase().includes(s.toLowerCase()) || 
        t.id.startsWith('5.') || 
        t.id.startsWith('6.')
      )
    ).slice(0, 5);
    
    const remaining = todo.filter(t => !inProgress.includes(t));
    
    // Parse phases
    const phases = parsePhaseProgress(taskContent);
    
    // Calculate overall progress
    const totalTasks = allTasks.length;
    const completedTasks = done.length;
    const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    res.json({
      success: true,
      data: {
        summary: {
          total: totalTasks,
          completed: completedTasks,
          inProgress: inProgress.length,
          todo: remaining.length,
          bugs: 0,
          overallProgress: overallProgress,
        },
        phases: phases,
        tasks: {
          done: done.slice(-20).reverse(),
          inProgress: inProgress,
          todo: remaining.slice(0, 15),
        },
        bugs: [],
        meta: {
          taskFileModified: taskModTime,
          implFileModified: implModTime,
          generatedAt: new Date().toISOString(),
          taskCount: allTasks.length,
          fileFound: existsSync(taskPath),
        }
      }
    });
  } catch (error) {
    console.error('Kanban API error:', error);
    res.status(500).json({ 
      success: false, 
      error: { message: error.message } 
    });
  }
});

// DEBUG endpoint - test parsing
router.get('/debug', (req, res) => {
  try {
    const taskPath = join(BRAIN_ROOT, 'task.md');
    const exists = existsSync(taskPath);
    
    if (!exists) {
      return res.json({ 
        success: false, 
        error: 'File not found',
        path: taskPath 
      });
    }
    
    const content = readFileSync(taskPath, 'utf-8');
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    
    // Find task-like lines
    const taskLines = lines.slice(0, 100).filter(l => l.includes('[x]') || l.includes('[ ]'));
    
    // Test regex on first few task lines
    const testResults = taskLines.slice(0, 5).map(line => {
      const match = line.match(/^-\s*\[([ xX])\]\s*\*\*(\d+\.\d+\.\d+)\*\*\s*(.+)$/);
      return {
        line: line.substring(0, 80),
        matched: !!match,
        groups: match ? [match[1], match[2], match[3]?.substring(0, 30)] : null
      };
    });
    
    const allTasks = parseTasksFromMarkdown(content);
    
    res.json({
      success: true,
      data: {
        fileExists: exists,
        filePath: taskPath,
        totalLines: lines.length,
        taskLikeLines: taskLines.length,
        parsedTasks: allTasks.length,
        testResults: testResults,
        sampleTasks: allTasks.slice(0, 3),
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/kanban/phases
router.get('/phases', (req, res) => {
  try {
    const taskPath = join(BRAIN_ROOT, 'task.md');
    if (!existsSync(taskPath)) {
      return res.json({ success: true, data: { phases: [] } });
    }
    
    const content = readFileSync(taskPath, 'utf-8');
    const phases = parsePhaseProgress(content);
    
    res.json({ success: true, data: { phases } });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// GET /api/kanban/tasks/:status
router.get('/tasks/:status', (req, res) => {
  try {
    const { status } = req.params;
    const taskPath = join(BRAIN_ROOT, 'task.md');
    
    if (!existsSync(taskPath)) {
      return res.json({ success: true, data: { tasks: [] } });
    }
    
    const content = readFileSync(taskPath, 'utf-8');
    const allTasks = parseTasksFromMarkdown(content);
    
    let filtered = allTasks;
    if (status === 'done') {
      filtered = allTasks.filter(t => t.status === 'done');
    } else if (status === 'todo') {
      filtered = allTasks.filter(t => t.status === 'todo');
    }
    
    res.json({ success: true, data: { tasks: filtered } });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// GET /api/kanban/health
router.get('/health', (req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    files: {
      task: existsSync(join(BRAIN_ROOT, 'task.md')),
      implementation: existsSync(join(BRAIN_ROOT, 'implementation_plan.md')),
    }
  });
});

export default router;
