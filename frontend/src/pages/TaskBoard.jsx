// 📁 File: src/components/TaskBoard.jsx

import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';

const socket = io(`${process.env.REACT_APP_BACKEND_URL}`); // Backend URL

function TaskBoard() {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [users, setUsers] = useState([]);
  const [assignedTo, setAssignedTo] = useState('');
  const [editingTaskId, setEditingTaskId] = useState(null);

  const statuses = ['Todo', 'In Progress', 'Done'];

  useEffect(() => {
    if (!user) return;

    const fetchTasks = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/tasks`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setTasks(res.data);
      } catch (err) {
        console.error('Error fetching tasks:', err);
      }
    };

    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/all`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setUsers(res.data);
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };

    fetchTasks();
    fetchUsers();

    // Socket.IO event listeners
    socket.on('taskCreated', (newTask) => {
      setTasks((prev) => [newTask, ...prev]);
    });

    socket.on('taskUpdated', (updatedTask) => {
      setTasks((prev) =>
        prev.map((t) => (t._id === updatedTask._id ? updatedTask : t))
      );
    });

    socket.on('taskDeleted', (deletedTaskId) => {
      setTasks((prev) => prev.filter((t) => t._id !== deletedTaskId));
    });

    return () => {
      socket.off('taskCreated');
      socket.off('taskUpdated');
      socket.off('taskDeleted');
    };
  }, [user]);

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;

    const updatedStatus = destination.droppableId;
    const taskId = draggableId;

    try {
      await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/tasks/${taskId}`,
        { status: updatedStatus },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        }
      );
    } catch (err) {
      console.error('Status update failed', err);
    }
  };

 const handleCreateOrUpdateTask = async (e) => {
  e.preventDefault();
  if (!title.trim()) return;

  const taskData = {
    title,
    description,
    priority,
    dueDate,
    status: 'Todo',
  };

  // Only include assignedTo if selected
  if (assignedTo && assignedTo !== '') {
    taskData.assignedTo = assignedTo;
  }

  try {
    if (editingTaskId) {
      await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/tasks/${editingTaskId}`, taskData, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setEditingTaskId(null);
    } else {
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/tasks`, taskData, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
    }

    // Reset form after create/update
    setTitle('');
    setDescription('');
    setPriority('');
    setDueDate('');
    setAssignedTo('');
  } catch (err) {
    console.error('❌ Task action failed:', err);
    alert(`Failed to create/update task: ${err.response?.data?.error || 'Unknown error'}`);
  }
};


  const handleEdit = (task) => {
    setEditingTaskId(task._id);
    setTitle(task.title);
    setDescription(task.description);
    setPriority(task.priority);
    setDueDate(task.dueDate?.split('T')[0] || '');
    setAssignedTo(setAssignedTo(task.assignedTo?._id || ''));

  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      await axios.delete(`${process.env.REACT_APP_BACKEND_URL}/api/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
    } catch (err) {
      console.error('❌ Failed to delete task:', err);
      alert('Error deleting task.');
    }
  };

  if (!user) {
    return <p style={{ textAlign: 'center', marginTop: '20px' }}>Please login to access your dashboard.</p>;
  }

  return (
    <div className="board">
      <h2 style={{ textAlign: 'center' }}>Task Board</h2>

      {/* Task Form */}
      <form onSubmit={handleCreateOrUpdateTask} style={{ textAlign: 'center', marginBottom: '20px' }}>
        <input type="text" placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} style={{ padding: '8px', width: '15%' }} />
        <input type="text" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} style={{ padding: '8px', width: '20%', marginLeft: '10px' }} />
        <input type="text" placeholder="Priority (High/Med/Low)" value={priority} onChange={(e) => setPriority(e.target.value)} style={{ padding: '8px', width: '10%', marginLeft: '10px' }} />
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ padding: '8px', width: '15%', marginLeft: '10px' }} />
        <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} style={{ padding: '8px', width: '15%', marginLeft: '10px' }}>
          <option value="">Assign to...</option>
          {users.map((u) => (
            <option key={u._id} value={u._id}>{u.name}</option>
          ))}
        </select>
        <button type="submit" style={{ padding: '8px 16px', marginLeft: '10px' }}>{editingTaskId ? 'Update Task' : 'Add Task'}</button>
      </form>

      {/* Task Columns */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="columns" style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px' }}>
          {statuses.map((status) => (
            <Droppable key={status} droppableId={status}>
              {(provided) => (
                <div
                  className="column"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    width: '30%',
                    background: '#f7f7f7',
                    padding: '10px',
                    borderRadius: '8px',
                    minHeight: '400px',
                    boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                  }}
                >
                  <h3>{status}</h3>
                  {tasks
                    .filter((t) => t.status === status)
                    .map((task, index) => (
                      <Draggable key={task._id} draggableId={task._id} index={index}>
                        {(provided) => (
                          <div
                            className
                            ="task"
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              background: 'white',
                              padding: '10px',
                              marginBottom: '10px',
                              borderRadius: '6px',
                              boxShadow: '0 0 5px rgba(0,0,0,0.1)',
                              cursor: 'grab',
                              ...provided.draggableProps.style,
                            }}
                          >
                           <h3 className="font-semibold">{task.title}</h3>
      <p>{task.description}</p>
      <small>Priority: {task.priority}</small><br />
      <small>Due: {task.dueDate?.split('T')[0]}</small><br />
      <small>Assigned to: {task.assignedTo?.name || 'Unassigned'}</small><br />
      <small>Created by: {task.createdBy?.name || 'Unknown'}</small><br />
      <small>Last edited by: {task.lastEditedBy?.name || '—'}</small>
                            <div style={{ marginTop: '10px' }}>
                              <button onClick={() => handleEdit(task)} style={{ marginRight: '5px' }}>Edit</button>
                              <button onClick={() => handleDelete(task._id)} style={{ color: 'red' }}>Delete</button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}

export default TaskBoard;
