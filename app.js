//  PASTE YOUR FIREBASE CONFIG HERE
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

//  YOUR USER ID - change this to your email
const USER_ID = "your-email@gmail.com";

// State
let todos = [];
let currentFilter = 'all';
let isOnline = navigator.onLine;

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.log('ServiceWorker registration failed:', err);
    });
  });
}

// Online/offline monitoring
window.addEventListener('online', () => {
  isOnline = true;
  const badge = document.getElementById('offlineBadge');
  if (badge) badge.style.display = 'none';
});

window.addEventListener('offline', () => {
  isOnline = false;
  const badge = document.getElementById('offlineBadge');
  if (badge) badge.style.display = 'block';
});

// Real-time listener
const q = db.collection('todos')
  .where('userId', '==', USER_ID)
  .orderBy('createdAt', 'desc');

q.onSnapshot((snapshot) => {
  todos = [];
  snapshot.forEach(doc => {
    todos.push({
      id: doc.id,
      ...doc.data()
    });
  });
  renderTodos();
}, (error) => {
  console.log('Snapshot error:', error);
});

// Render todos
function renderTodos() {
  const todoList = document.getElementById('todoList');
  const stats = document.getElementById('stats');
  
  if (!todoList || !stats) return;
  
  const filteredTodos = todos.filter(todo => {
    if (currentFilter === 'active') return !todo.completed;
    if (currentFilter === 'completed') return todo.completed;
    return true;
  });
  
  const completedCount = todos.filter(t => t.completed).length;
  
  if (filteredTodos.length === 0) {
    todoList.innerHTML = '<div style="text-align: center; padding: 40px; color: #888;">No todos yet. Add one above! </div>';
  } else {
    todoList.innerHTML = filteredTodos.map(todo => `
      <div class="todo-item" data-id="${todo.id}">
        <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
        <span class="todo-text ${todo.completed ? 'completed' : ''}">${escapeHtml(todo.text)}</span>
        <button class="delete-btn"></button>
      </div>
    `).join('');
  }
  
  stats.innerHTML = `Total: ${todos.length} | Completed: ${completedCount}`;
  
  // Add event listeners
  document.querySelectorAll('.todo-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', toggleTodo);
  });
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', deleteTodo);
  });
}

// Helper to escape HTML
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Add todo
function addTodo() {
  const input = document.getElementById('todoInput');
  if (!input) return;
  
  const text = input.value.trim();
  if (!text) return;
  
  db.collection('todos').add({
    text: text,
    completed: false,
    createdAt: new Date(),
    userId: USER_ID
  }).then(() => {
    input.value = '';
  }).catch((error) => {
    console.error('Error adding todo:', error);
    alert('Error adding todo. Check console.');
  });
}

// Toggle todo
function toggleTodo(e) {
  const todoItem = e.target.closest('.todo-item');
  if (!todoItem) return;
  
  const todoId = todoItem.dataset.id;
  const todo = todos.find(t => t.id === todoId);
  if (!todo) return;
  
  db.collection('todos').doc(todoId).update({
    completed: !todo.completed
  }).catch((error) => {
    console.error('Error updating todo:', error);
  });
}

// Delete todo
function deleteTodo(e) {
  const todoItem = e.target.closest('.todo-item');
  if (!todoItem) return;
  
  const todoId = todoItem.dataset.id;
  
  if (confirm('Delete this todo?')) {
    db.collection('todos').doc(todoId).delete().catch((error) => {
      console.error('Error deleting todo:', error);
    });
  }
}

// Set up event listeners when page loads
document.addEventListener('DOMContentLoaded', () => {
  const addBtn = document.getElementById('addBtn');
  const todoInput = document.getElementById('todoInput');
  const filterBtns = document.querySelectorAll('.filter-btn');
  
  if (addBtn) {
    addBtn.addEventListener('click', addTodo);
  }
  
  if (todoInput) {
    todoInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addTodo();
    });
  }
  
  // Filter buttons
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderTodos();
    });
  });
});

// Check online status on load
if (!navigator.onLine) {
  const badge = document.getElementById('offlineBadge');
  if (badge) badge.style.display = 'block';
}
