  let currentData = [];
        let currentSection = 'dashboard';
        let timerInterval = null;
        let timerSeconds = 0;
        let timerDuration = 25 * 60;
        let isTimerRunning = false;
        let currentMonth = new Date().getMonth();
        let currentYear = new Date().getFullYear();
        let libraryAccess = false;
        let quizQuestions = [];
        let currentQuestionIndex = 0;
        let userAnswers = [];
        let quizActive = false;
        let currentFilter = 'all';
        let currentSort = 'created';
        let sortAscending = false;

        // ===== CONFIGURATION =====
        const defaultConfig = {
            app_title: "Study Planner",
            welcome_message: "Welcome to your study planner"
        };

        // ===== LOCAL STORAGE FUNCTIONS =====
        function saveLocalData() {
            localStorage.setItem('studyPlannerData', JSON.stringify(currentData));
        }

        function loadLocalData() {
            const saved = localStorage.getItem('studyPlannerData');
            if (saved) {
                currentData = JSON.parse(saved);
            } else {
                currentData = [];
            }
            updateDashboard();
            renderTasks();
            renderCalendar();
            renderResources();
            renderQuestions();
        }

        // ===== DATA HANDLER =====
        const dataHandler = {
            onDataChanged(data) {
                currentData = data;
                updateDashboard();
                renderTasks();
                renderCalendar();
                renderResources();
                renderQuestions();
            }
        };

        // ===== ELEMENT SDK CONFIGURATION =====
        const elementConfig = {
            defaultConfig: defaultConfig,
            onConfigChange: async (config) => {
                const appTitle = document.getElementById('app-title');
                const welcomeMessage = document.getElementById('welcome-message');
                
                if (appTitle) {
                    appTitle.textContent = config.app_title || defaultConfig.app_title;
                }
                if (welcomeMessage) {
                    welcomeMessage.textContent = config.welcome_message || defaultConfig.welcome_message;
                }
            },
            mapToCapabilities: (config) => ({
                recolorables: [],
                borderables: [],
                fontEditable: undefined,
                fontSizeable: undefined
            }),
            mapToEditPanelValues: (config) => new Map([
                ["app_title", config.app_title || defaultConfig.app_title],
                ["welcome_message", config.welcome_message || defaultConfig.welcome_message]
            ])
        };

        // ===== INITIALIZATION =====
        async function initializeApp() {
            try {
                // Initialize Element SDK if available
                if (window.elementSdk) {
                    await window.elementSdk.init(elementConfig);
                }
                
                // Initialize Data SDK if available
                if (window.dataSdk) {
                    const initResult = await window.dataSdk.init(dataHandler);
                    if (!initResult.isOk) {
                        console.error("Failed to initialize data SDK:", initResult.error);
                        // Fallback to local storage
                        loadLocalData();
                    }
                } else {
                    // Fallback to local storage when SDK not available
                    loadLocalData();
                }
                
                renderCalendar();
                showSection('dashboard');
                updateTimerDisplay();
                console.log("App initialized successfully");
            } catch (error) {
                console.error("Failed to initialize app:", error);
                // Fallback to local storage on any error
                loadLocalData();
            }
        }

        // ===== NAVIGATION FUNCTIONS =====
        function showSection(section) {
            // Hide all sections
            document.querySelectorAll('.section-content').forEach(el => {
                el.classList.add('hidden');
            });
            
            // Show selected section
            const targetSection = document.getElementById(`${section}-section`);
            if (targetSection) {
                targetSection.classList.remove('hidden');
                targetSection.classList.add('fade-in');
            }
            
            currentSection = section;
            
            // Update navigation buttons
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('nav-active');
            });
            
            // Find and activate the clicked button
            const clickedBtn = event ? event.target : document.querySelector(`[onclick="showSection('${section}')"]`);
            if (clickedBtn) {
                clickedBtn.classList.add('nav-active');
            }
        }

        // ===== DASHBOARD FUNCTIONS =====
        function updateDashboard() {
            const tasks = currentData.filter(item => item.type === 'task');
            const completedTasks = tasks.filter(task => task.completed);
            const totalStudyTime = tasks.reduce((total, task) => total + (task.timeSpent || 0), 0);
            
            // Update stats
            document.getElementById('total-tasks').textContent = tasks.length;
            document.getElementById('completed-tasks').textContent = completedTasks.length;
            document.getElementById('total-study-time').textContent = Math.floor(totalStudyTime / 60) + 'h';
            
            // Update recent tasks
            updateRecentTasks(tasks);
            
            // Update upcoming deadlines
            updateUpcomingDeadlines(tasks);
        }

        function updateRecentTasks(tasks) {
            const recentTasksContainer = document.getElementById('recent-tasks');
            const recentTasks = tasks.slice(-5).reverse();
            
            if (recentTasks.length === 0) {
                recentTasksContainer.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <div class="text-4xl mb-2">📝</div>
                        <p>No tasks yet. Create your first task!</p>
                    </div>
                `;
            } else {
                recentTasksContainer.innerHTML = recentTasks.map(task => `
                    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div class="flex items-center space-x-3">
                            <div class="w-3 h-3 rounded-full ${task.completed ? 'bg-green-500' : 'bg-yellow-500'}"></div>
                            <div>
                                <h4 class="font-medium text-gray-800 ${task.completed ? 'line-through' : ''}">${task.title}</h4>
                                <p class="text-sm text-gray-600">${getPriorityText(task.priority)} priority</p>
                            </div>
                        </div>
                        <span class="px-3 py-1 text-xs rounded-full font-medium ${task.completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                            ${task.completed ? '✅ Done' : '⏳ Pending'}
                        </span>
                    </div>
                `).join('');
            }
        }

        function updateUpcomingDeadlines(tasks) {
            const upcomingContainer = document.getElementById('upcoming-deadlines');
            const upcomingTasks = tasks
                .filter(task => !task.completed && task.dueDate)
                .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                .slice(0, 5);
            
            if (upcomingTasks.length === 0) {
                upcomingContainer.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <div class="text-4xl mb-2">📅</div>
                        <p>No upcoming deadlines</p>
                    </div>
                `;
            } else {
                upcomingContainer.innerHTML = upcomingTasks.map(task => {
                    const dueDate = new Date(task.dueDate);
                    const today = new Date();
                    const diffTime = dueDate - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    return `
                        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div>
                                <h4 class="font-medium text-gray-800">${task.title}</h4>
                                <p class="text-sm text-gray-600">📅 ${dueDate.toLocaleDateString()}</p>
                            </div>
                            <span class="px-3 py-1 text-xs rounded-full font-medium ${
                                diffDays <= 1 ? 'bg-red-100 text-red-800' : 
                                diffDays <= 3 ? 'bg-orange-100 text-orange-800' : 
                                'bg-blue-100 text-blue-800'
                            }">
                                ${diffDays <= 0 ? '🚨 Overdue' : diffDays === 1 ? '⚡ Tomorrow' : `📆 ${diffDays} days`}
                            </span>
                        </div>
                    `;
                }).join('');
            }
        }

        // ===== TASK FUNCTIONS =====
        function showAddTaskModal() {
            document.getElementById('add-task-modal').classList.remove('hidden');
            document.getElementById('add-task-modal').classList.add('flex');
            document.getElementById('task-title').focus();
        }

        function hideAddTaskModal() {
            document.getElementById('add-task-modal').classList.add('hidden');
            document.getElementById('add-task-modal').classList.remove('flex');
            document.getElementById('add-task-form').reset();
        }

        async function addTask(event) {
            event.preventDefault();
            
            // Check data limit
            if (currentData.length >= 999) {
                showToast("Maximum limit of 999 items reached. Please delete some items first.", "error");
                return;
            }

            // Get form values
            const title = document.getElementById('task-title').value.trim();
            const description = document.getElementById('task-description').value.trim();
            const dueDate = document.getElementById('task-due-date').value;
            const priority = document.getElementById('task-priority').value;
            const timerDuration = parseInt(document.getElementById('task-timer').value) || 25;

            // Validate required fields
            if (!title) {
                showToast("Please enter a task title.", "error");
                return;
            }

            // Create task object
            const task = {
                id: Date.now().toString(),
                type: 'task',
                title,
                description,
                dueDate,
                priority,
                completed: false,
                timerDuration: timerDuration * 60,
                timeSpent: 0,
                createdAt: new Date().toISOString()
            };

            // Show loading state
            showLoadingState('add-task-form');
            
            try {
                if (window.dataSdk) {
                    // Use Data SDK
                    const result = await window.dataSdk.create(task);
                    if (result.isOk) {
                        hideLoadingState('add-task-form');
                        hideAddTaskModal();
                        showToast("✅ Task added successfully!", "success");
                    } else {
                        hideLoadingState('add-task-form');
                        showToast("❌ Error creating task. Please try again.", "error");
                        console.error("Task creation error:", result.error);
                    }
                } else {
                    // Fallback to local storage
                    task.__backendId = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    currentData.push(task);
                    saveLocalData();
                    updateDashboard();
                    renderTasks();
                    renderCalendar();
                    hideLoadingState('add-task-form');
                    hideAddTaskModal();
                    showToast("✅ Task added successfully!", "success");
                }
            } catch (error) {
                hideLoadingState('add-task-form');
                showToast("❌ Error creating task. Please try again.", "error");
                console.error("Task creation error:", error);
            }
        }

        function renderTasks() {
            // Use the filter and sort system
            applyFilterAndSort();
        }

        function getPriorityText(priority) {
            return priority.charAt(0).toUpperCase() + priority.slice(1);
        }

        function getPriorityBorderColor(priority) {
            switch (priority) {
                case 'high': return 'border-red-500';
                case 'medium': return 'border-yellow-500';
                case 'low': return 'border-green-500';
                default: return 'border-gray-500';
            }
        }

        function getPriorityBadgeColor(priority) {
            switch (priority) {
                case 'high': return 'bg-red-100 text-red-800';
                case 'medium': return 'bg-yellow-100 text-yellow-800';
                case 'low': return 'bg-green-100 text-green-800';
                default: return 'bg-gray-100 text-gray-800';
            }
        }

        function getPriorityIcon(priority) {
            switch (priority) {
                case 'high': return '🔴';
                case 'medium': return '🟡';
                case 'low': return '🟢';
                default: return '⚪';
            }
        }

        async function toggleTaskComplete(taskId) {
            const task = currentData.find(item => item.__backendId === taskId);
            if (task) {
                task.completed = !task.completed;
                saveLocalData();
                updateDashboard();
                renderTasks();
                showToast(task.completed ? "✅ Task completed!" : "📝 Task marked as pending", "success");
            }
        }

        async function deleteTask(taskId) {
            const taskIndex = currentData.findIndex(item => item.__backendId === taskId);
            if (taskIndex !== -1) {
                currentData.splice(taskIndex, 1);
                saveLocalData();
                updateDashboard();
                renderTasks();
                renderCalendar();
                showToast("🗑️ Task deleted successfully!", "success");
            }
        }

        function filterTasks(filter) {
            currentFilter = filter;
            
            // Update filter buttons
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('bg-indigo-600', 'text-white');
                btn.classList.add('bg-gray-200');
            });
            event.target.classList.remove('bg-gray-200');
            event.target.classList.add('bg-indigo-600', 'text-white');
            
            // Apply both filter and sort
            applyFilterAndSort();
        }

        function sortTasks() {
            currentSort = document.getElementById('task-sort').value;
            applyFilterAndSort();
        }

        function toggleSortOrder() {
            sortAscending = !sortAscending;
            const sortBtn = document.getElementById('sort-order-btn');
            sortBtn.textContent = sortAscending ? '⬆️' : '⬇️';
            sortBtn.title = sortAscending ? 'Sort descending' : 'Sort ascending';
            applyFilterAndSort();
        }

        function applyFilterAndSort() {
            const tasks = currentData.filter(item => item.type === 'task');
            let filteredTasks = tasks;
            
            // Apply filter
            if (currentFilter === 'pending') {
                filteredTasks = tasks.filter(task => !task.completed);
            } else if (currentFilter === 'completed') {
                filteredTasks = tasks.filter(task => task.completed);
            }
            
            // Apply sort
            filteredTasks = sortTasksArray(filteredTasks, currentSort, sortAscending);
            
            // Render filtered and sorted tasks
            renderFilteredTasks(filteredTasks, currentFilter);
        }

        function sortTasksArray(tasks, sortBy, ascending) {
            const sortedTasks = [...tasks].sort((a, b) => {
                let aValue, bValue;
                
                switch (sortBy) {
                    case 'priority':
                        // Priority order: high = 3, medium = 2, low = 1
                        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
                        aValue = priorityOrder[a.priority] || 0;
                        bValue = priorityOrder[b.priority] || 0;
                        break;
                    case 'dueDate':
                        aValue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                        bValue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                        break;
                    case 'title':
                        aValue = a.title.toLowerCase();
                        bValue = b.title.toLowerCase();
                        break;
                    case 'created':
                    default:
                        aValue = new Date(a.createdAt).getTime();
                        bValue = new Date(b.createdAt).getTime();
                        break;
                }
                
                if (aValue < bValue) return ascending ? -1 : 1;
                if (aValue > bValue) return ascending ? 1 : -1;
                return 0;
            });
            
            return sortedTasks;
        }

        function renderFilteredTasks(filteredTasks, filter) {
            const tasksContainer = document.getElementById('tasks-list');
            
            if (filteredTasks.length === 0) {
                const emptyMessage = filter === 'all' ? 'No tasks yet' : 
                                   filter === 'pending' ? 'No pending tasks' : 'No completed tasks';
                tasksContainer.innerHTML = `
                    <div class="text-center py-12 text-gray-500">
                        <div class="text-6xl mb-4">📝</div>
                        <h3 class="text-xl font-semibold mb-2">${emptyMessage}</h3>
                        <p>${filter === 'all' ? 'Create your first task!' : `All tasks are ${filter === 'pending' ? 'completed' : 'pending'}.`}</p>
                    </div>
                `;
                return;
            }
            
            tasksContainer.innerHTML = filteredTasks.map(task => `
                <div class="task-item bg-white rounded-lg p-6 border-l-4 ${getPriorityBorderColor(task.priority)} shadow-md hover:shadow-lg transition-all duration-200">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="flex items-center space-x-3 mb-3">
                                <input type="checkbox" ${task.completed ? 'checked' : ''} 
                                       onchange="toggleTaskComplete('${task.__backendId}')"
                                       class="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer">
                                <h3 class="font-semibold text-lg text-gray-800 ${task.completed ? 'line-through text-gray-500' : ''}">${task.title}</h3>
                                <span class="px-2 py-1 text-xs rounded-full font-medium ${getPriorityBadgeColor(task.priority)}">
                                    ${getPriorityIcon(task.priority)} ${task.priority.toUpperCase()}
                                </span>
                            </div>
                            ${task.description ? `<p class="text-gray-600 mb-3 ml-8">${task.description}</p>` : ''}
                            <div class="flex items-center space-x-4 text-sm text-gray-500 ml-8">
                                ${task.dueDate ? `<span class="flex items-center"><span class="mr-1">📅</span> ${new Date(task.dueDate).toLocaleDateString()}</span>` : ''}
                                <span class="flex items-center"><span class="mr-1">⏱️</span> ${Math.floor((task.timeSpent || 0) / 60)}m studied</span>
                                <span class="flex items-center"><span class="mr-1">🎯</span> ${Math.floor(task.timerDuration / 60)}m target</span>
                            </div>
                        </div>
                        <div class="flex space-x-2 ml-4">
                            <button onclick="startTaskTimer('${task.__backendId}')" 
                                    class="btn-animate bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors font-medium">
                                ▶️ Timer
                            </button>
                            <button onclick="deleteTask('${task.__backendId}')" 
                                    class="btn-animate bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors font-medium">
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // ===== TIMER FUNCTIONS =====
        function startTaskTimer(taskId) {
            const task = currentData.find(item => item.__backendId === taskId);
            if (task) {
                timerDuration = task.timerDuration;
                document.getElementById('timer-duration').value = Math.floor(timerDuration / 60);
                resetTimer();
                showSection('tasks');
                showToast(`⏱️ Timer set for "${task.title}" (${Math.floor(timerDuration / 60)} minutes)`, "success");
            }
        }

        function toggleTimer() {
            if (isTimerRunning) {
                pauseTimer();
            } else {
                startTimer();
            }
        }

        function startTimer() {
            if (!isTimerRunning) {
                const inputDuration = parseInt(document.getElementById('timer-duration').value);
                if (timerSeconds === 0 || timerSeconds === timerDuration) {
                    timerDuration = inputDuration * 60;
                    timerSeconds = timerDuration;
                }
                
                isTimerRunning = true;
                const timerBtn = document.getElementById('timer-btn');
                timerBtn.textContent = '⏸️ Pause Timer';
                timerBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
                timerBtn.classList.add('bg-yellow-600', 'hover:bg-yellow-700');
                
                timerInterval = setInterval(() => {
                    timerSeconds--;
                    updateTimerDisplay();
                    
                    if (timerSeconds <= 0) {
                        completeTimer();
                    }
                }, 1000);
                
                showToast("⏱️ Timer started!", "success");
            }
        }

        function pauseTimer() {
            isTimerRunning = false;
            clearInterval(timerInterval);
            const timerBtn = document.getElementById('timer-btn');
            timerBtn.textContent = '▶️ Resume Timer';
            timerBtn.classList.remove('bg-yellow-600', 'hover:bg-yellow-700');
            timerBtn.classList.add('bg-green-600', 'hover:bg-green-700');
            showToast("⏸️ Timer paused", "info");
        }

        function resetTimer() {
            isTimerRunning = false;
            clearInterval(timerInterval);
            const inputDuration = parseInt(document.getElementById('timer-duration').value);
            timerDuration = inputDuration * 60;
            timerSeconds = timerDuration;
            updateTimerDisplay();
            
            const timerBtn = document.getElementById('timer-btn');
            timerBtn.textContent = '▶️ Start Timer';
            timerBtn.classList.remove('bg-yellow-600', 'hover:bg-yellow-700');
            timerBtn.classList.add('bg-green-600', 'hover:bg-green-700');
        }

        function completeTimer() {
            isTimerRunning = false;
            clearInterval(timerInterval);
            const timerBtn = document.getElementById('timer-btn');
            timerBtn.textContent = '▶️ Start Timer';
            timerBtn.classList.remove('bg-yellow-600', 'hover:bg-yellow-700');
            timerBtn.classList.add('bg-green-600', 'hover:bg-green-700');
            
            showToast("🎉 Timer completed! Great job studying!", "success");
            
            // Reset timer
            timerSeconds = 0;
            updateTimerDisplay();
        }

        function updateTimerDisplay() {
            const minutes = Math.floor(timerSeconds / 60);
            const seconds = timerSeconds % 60;
            document.getElementById('timer-display').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            // Update progress circle (circumference = 2 * π * r = 2 * π * 70 ≈ 440)
            const circumference = 440;
            const progress = timerDuration > 0 ? ((timerDuration - timerSeconds) / timerDuration) * circumference : 0;
            document.getElementById('timer-progress').style.strokeDashoffset = circumference - progress;
        }

        // ===== CALENDAR FUNCTIONS =====
        function renderCalendar() {
            const monthNames = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];
            
            document.getElementById('calendar-month').textContent = `${monthNames[currentMonth]} ${currentYear}`;
            
            const firstDay = new Date(currentYear, currentMonth, 1).getDay();
            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            
            const calendarGrid = document.getElementById('calendar-grid');
            calendarGrid.innerHTML = '';
            
            // Add empty cells for days before the first day of the month
            for (let i = 0; i < firstDay; i++) {
                const emptyDay = document.createElement('div');
                emptyDay.className = 'h-32 bg-gray-50 rounded-lg border border-gray-200';
                calendarGrid.appendChild(emptyDay);
            }
            
            // Add days of the month
            for (let day = 1; day <= daysInMonth; day++) {
                const dayElement = document.createElement('div');
                dayElement.className = 'h-32 bg-white border border-gray-200 rounded-lg p-2 calendar-day cursor-pointer';
                
                const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                const tasksForDay = currentData.filter(item => item.type === 'task' && item.dueDate === dateStr);
                
                const isToday = new Date().toDateString() === new Date(currentYear, currentMonth, day).toDateString();
                
                dayElement.innerHTML = `
                    <div class="font-bold text-gray-800 mb-1 ${isToday ? 'text-indigo-600' : ''}">${day}</div>
                    <div class="space-y-1">
                        ${tasksForDay.slice(0, 3).map(task => `
                            <div class="text-xs p-1 rounded truncate ${
                                task.completed ? 'bg-green-100 text-green-800' : 
                                task.priority === 'high' ? 'bg-red-100 text-red-800' :
                                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                            }" title="${task.title}">
                                ${task.completed ? '✅' : '📝'} ${task.title}
                            </div>
                        `).join('')}
                        ${tasksForDay.length > 3 ? `<div class="text-xs text-gray-500">+${tasksForDay.length - 3} more</div>` : ''}
                    </div>
                `;
                
                if (isToday) {
                    dayElement.classList.add('ring-2', 'ring-indigo-500');
                }
                
                calendarGrid.appendChild(dayElement);
            }
        }

        function previousMonth() {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            renderCalendar();
        }

        function nextMonth() {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            renderCalendar();
        }

        // ===== LIBRARY FUNCTIONS =====
        function showResourceAuthModal() {
            document.getElementById('resource-auth-modal').classList.remove('hidden');
            document.getElementById('resource-auth-modal').classList.add('flex');
            document.getElementById('resource-auth-password').focus();
        }

        function hideResourceAuthModal() {
            document.getElementById('resource-auth-modal').classList.add('hidden');
            document.getElementById('resource-auth-modal').classList.remove('flex');
            document.getElementById('resource-auth-password').value = '';
            document.getElementById('resource-auth-error').classList.add('hidden');
        }

        function authenticateResourceAuthor() {
            const password = document.getElementById('resource-auth-password').value;
            const errorDiv = document.getElementById('resource-auth-error');
            
            if (password === 'abhishek') {
                libraryAccess = true;
                hideResourceAuthModal();
                showAddResourceModal();
                renderResources(); // Re-render to show delete buttons
                showToast("🔓 Author access granted! You can now upload and delete resources.", "success");
            } else {
                errorDiv.classList.remove('hidden');
                document.getElementById('resource-auth-password').value = '';
                showToast("❌ Incorrect author password", "error");
            }
        }

        function showDeleteResourceConfirm(resourceId, resourceTitle) {
            const confirmDelete = document.createElement('div');
            confirmDelete.className = 'fixed inset-0 bg-black bg-opacity-50 modal-backdrop flex items-center justify-center z-50';
            confirmDelete.innerHTML = `
                <div class="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 fade-in">
                    <div class="text-center">
                        <div class="text-6xl mb-4">⚠️</div>
                        <h3 class="text-2xl font-semibold text-gray-800 mb-2">Delete Resource</h3>
                        <p class="text-gray-600 mb-6">Are you sure you want to delete "<strong>${resourceTitle}</strong>"? This action cannot be undone.</p>
                        
                        <div class="flex space-x-4">
                            <button onclick="this.closest('.modal-backdrop').remove()" 
                                    class="btn-animate flex-1 bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 transition-colors font-semibold">
                                Cancel
                            </button>
                            <button onclick="deleteResource('${resourceId}'); this.closest('.modal-backdrop').remove()" 
                                    class="btn-animate flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-semibold">
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(confirmDelete);
        }

        async function deleteResource(resourceId) {
            const resourceIndex = currentData.findIndex(item => item.__backendId === resourceId);
            if (resourceIndex !== -1) {
                const resourceTitle = currentData[resourceIndex].title;
                currentData.splice(resourceIndex, 1);
                saveLocalData();
                renderResources();
                showToast(`🗑️ "${resourceTitle}" deleted successfully!`, "success");
            }
        }

        function showAddResourceModal() {
            document.getElementById('add-resource-modal').classList.remove('hidden');
            document.getElementById('add-resource-modal').classList.add('flex');
            document.getElementById('resource-title').focus();
        }

        function hideAddResourceModal() {
            document.getElementById('add-resource-modal').classList.add('hidden');
            document.getElementById('add-resource-modal').classList.remove('flex');
            document.getElementById('add-resource-form').reset();
        }

        async function addResource(event) {
            event.preventDefault();
            
            if (currentData.length >= 999) {
                showToast("Maximum limit of 999 items reached. Please delete some items first.", "error");
                return;
            }

            const title = document.getElementById('resource-title').value.trim();
            const category = document.getElementById('resource-category').value.trim();
            const resourceType = document.getElementById('resource-type').value;

            if (!title) {
                showToast("Please enter a resource title.", "error");
                return;
            }

            // Show loading state immediately
            showLoadingState('add-resource-form');

            let resource = {
                id: Date.now().toString(),
                type: 'resource',
                title,
                category: category || 'General',
                resourceType,
                createdAt: new Date().toISOString()
            };

            try {
                if (resourceType === 'text') {
                    const content = document.getElementById('resource-content').value.trim();
                    if (!content) {
                        hideLoadingState('add-resource-form');
                        showToast("Please enter text content.", "error");
                        return;
                    }
                    resource.content = content;
                } else if (resourceType === 'file') {
                    const fileInput = document.getElementById('resource-file');
                    if (!fileInput.files || fileInput.files.length === 0) {
                        hideLoadingState('add-resource-form');
                        showToast("Please select a file to upload.", "error");
                        return;
                    }

                    const file = fileInput.files[0];
                    
                    // Enhanced logging for debugging
                    console.log('File selected:', {
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        lastModified: file.lastModified
                    });
                    
                    // Validate file size (200MB limit)
                    if (file.size > 200 * 1024 * 1024) {
                        hideLoadingState('add-resource-form');
                        showToast("File size must be less than 200MB.", "error");
                        return;
                    }

                    // Enhanced file type validation - Check extension first for PDFs
                    const fileExtension = file.name.split('.').pop().toLowerCase();
                    const allowedExtensions = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif', 'ppt', 'pptx', 'xls', 'xlsx'];
                    
                    const allowedTypes = [
                        'application/pdf',
                        'application/msword',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        'text/plain',
                        'image/jpeg',
                        'image/jpg',
                        'image/png',
                        'image/gif',
                        'application/vnd.ms-powerpoint',
                        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                        'application/vnd.ms-excel',
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        'application/octet-stream' // Common fallback for PDFs
                    ];

                    // For PDFs, prioritize file extension over MIME type (more reliable)
                    let isValidType = false;
                    if (fileExtension === 'pdf') {
                        isValidType = true; // Always accept .pdf files regardless of MIME type
                        console.log('PDF file detected by extension - validation passed');
                    } else {
                        // For other files, check both MIME type and extension
                        isValidType = allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);
                    }
                    
                    if (!isValidType) {
                        hideLoadingState('add-resource-form');
                        showToast(`File type not supported. Selected: ${file.type || 'unknown'} (.${fileExtension}). Please upload PDF, DOC, DOCX, TXT, JPG, PNG, PPT, or XLS files.`, "error");
                        console.log('File validation failed:', { name: file.name, type: file.type, extension: fileExtension });
                        return;
                    }
                    
                    console.log('File validation passed:', { name: file.name, type: file.type, extension: fileExtension });

                    console.log('File validation passed');

                    // Show progress message for large files
                    if (file.size > 10 * 1024 * 1024) { // Files larger than 10MB
                        showToast("Processing large file... Please wait.", "info");
                    }

                    try {
                        console.log('Converting file to base64...');
                        // Convert file to base64 for storage
                        const base64Data = await fileToBase64(file);
                        console.log('File converted successfully, data length:', base64Data.length);
                        
                        resource.fileName = file.name;
                        resource.fileSize = file.size;
                        resource.fileType = file.type || 'application/octet-stream'; // Fallback MIME type
                        resource.fileData = base64Data;
                    } catch (fileError) {
                        console.error('File processing error:', fileError);
                        hideLoadingState('add-resource-form');
                        showToast("❌ Error processing file. Please try again.", "error");
                        return;
                    }
                }

                console.log('Adding resource to storage...');
                // Add to data storage
                if (window.dataSdk) {
                    const result = await window.dataSdk.create(resource);
                    if (result.isOk) {
                        console.log('Resource saved to Data SDK successfully');
                        hideLoadingState('add-resource-form');
                        hideAddResourceModal();
                        showToast("📚 Resource added successfully!", "success");
                    } else {
                        console.error('Data SDK creation error:', result.error);
                        hideLoadingState('add-resource-form');
                        showToast("❌ Error saving resource. Please try again.", "error");
                    }
                } else {
                    // Fallback to local storage
                    resource.__backendId = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    currentData.push(resource);
                    saveLocalData();
                    renderResources();
                    console.log('Resource saved to local storage successfully');
                    hideLoadingState('add-resource-form');
                    hideAddResourceModal();
                    showToast("📚 Resource added successfully!", "success");
                }
            } catch (error) {
                console.error('General resource creation error:', error);
                hideLoadingState('add-resource-form');
                showToast("❌ Error processing resource. Please try again.", "error");
            }
        }

        function renderResources() {
            const resources = currentData.filter(item => item.type === 'resource');
            const resourcesContainer = document.getElementById('resources-list');
            
            if (resources.length === 0) {
                resourcesContainer.innerHTML = `
                    <div class="col-span-full text-center py-12 text-gray-500">
                        <div class="text-6xl mb-4">📚</div>
                        <h3 class="text-xl font-semibold mb-2">No resources yet</h3>
                        <p>Add your first study resource!</p>
                    </div>
                `;
                return;
            }

            resourcesContainer.innerHTML = resources.map(resource => {
                const isFile = resource.resourceType === 'file';
                const fileIcon = isFile ? getFileIcon(resource.fileType, resource.fileName) : '📝';
                
                return `
                    <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200 card-hover">
                        <div class="mb-4">
                            <div class="flex items-center justify-between">
                                <div class="flex-1">
                                    <div class="flex items-center space-x-2 mb-2">
                                        <span class="text-2xl">${fileIcon}</span>
                                        <h3 class="font-bold text-lg text-gray-800">${resource.title}</h3>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        ${resource.category ? `<span class="inline-block px-3 py-1 text-xs bg-indigo-100 text-indigo-800 rounded-full font-medium">${resource.category}</span>` : ''}
                                        <span class="inline-block px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full font-medium">
                                            ${isFile ? 'File' : 'Text'}
                                        </span>
                                    </div>
                                </div>
                                ${libraryAccess ? `
                                    <button onclick="showDeleteResourceConfirm('${resource.__backendId}', '${resource.title}')" 
                                            class="btn-animate bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors ml-4">
                                        🗑️ Delete
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                        
                        ${isFile ? `
                            <!-- File Resource -->
                            <div class="bg-white rounded-lg p-4 mb-4 border border-gray-200">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center space-x-3">
                                        <div class="text-3xl">${getFileIcon(resource.fileType, resource.fileName)}</div>
                                        <div>
                                            <p class="font-medium text-gray-800">${resource.fileName}</p>
                                            <p class="text-sm text-gray-600">${formatFileSize(resource.fileSize)}</p>
                                        </div>
                                    </div>
                                    <div class="flex space-x-2">
                                        ${resource.fileType.startsWith('image/') ? `
                                            <button onclick="viewImage('${resource.fileData}', '${resource.fileName}')" 
                                                    class="btn-animate bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
                                                👁️ View
                                            </button>
                                        ` : ''}
                                        <button onclick="downloadFile('${resource.fileName}', '${resource.fileData}', '${resource.fileType}')" 
                                                class="btn-animate bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors">
                                            📥 Download
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ` : `
                            <!-- Text Resource -->
                            <div class="bg-white rounded-lg p-4 mb-4 border border-gray-200">
                                <p class="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">${resource.content}</p>
                            </div>
                        `}
                        
                        <p class="text-xs text-gray-500 flex items-center">
                            <span class="mr-1">📅</span> Added: ${new Date(resource.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                `;
            }).join('');
        }

        // ===== QUIZ FUNCTIONS =====
        function showQuestionAuthModal() {
            document.getElementById('question-auth-modal').classList.remove('hidden');
            document.getElementById('question-auth-modal').classList.add('flex');
            document.getElementById('question-auth-password').focus();
        }

        function hideQuestionAuthModal() {
            document.getElementById('question-auth-modal').classList.add('hidden');
            document.getElementById('question-auth-modal').classList.remove('flex');
            document.getElementById('question-auth-password').value = '';
            document.getElementById('question-auth-error').classList.add('hidden');
        }

        function authenticateQuestionAuthor() {
            const password = document.getElementById('question-auth-password').value;
            const errorDiv = document.getElementById('question-auth-error');
            
            if (password === 'abhishek') {
                hideQuestionAuthModal();
                showAddQuestionModal();
                showToast("🔓 Author access granted! You can now create questions.", "success");
            } else {
                errorDiv.classList.remove('hidden');
                document.getElementById('question-auth-password').value = '';
                showToast("❌ Incorrect author password", "error");
            }
        }

        function showAddQuestionModal() {
            document.getElementById('add-question-modal').classList.remove('hidden');
            document.getElementById('add-question-modal').classList.add('flex');
            document.getElementById('question-text').focus();
        }

        function hideAddQuestionModal() {
            document.getElementById('add-question-modal').classList.add('hidden');
            document.getElementById('add-question-modal').classList.remove('flex');
            document.getElementById('add-question-form').reset();
        }

        async function addQuestion(event) {
            event.preventDefault();
            
            if (currentData.length >= 999) {
                showToast("Maximum limit of 999 items reached. Please delete some items first.", "error");
                return;
            }

            const question = document.getElementById('question-text').value.trim();
            const options = document.getElementById('question-options').value.trim();
            const correctAnswer = document.getElementById('correct-answer').value.trim();

            if (!question || !options || !correctAnswer) {
                showToast("Please fill in all fields.", "error");
                return;
            }

            const optionsList = options.split('\n').filter(opt => opt.trim());
            if (optionsList.length < 2) {
                showToast("Please provide at least 2 answer options.", "error");
                return;
            }

            if (!optionsList.includes(correctAnswer)) {
                showToast("Correct answer must match one of the options exactly.", "error");
                return;
            }

            const questionData = {
                id: Date.now().toString(),
                type: 'question',
                question,
                options,
                correctAnswer,
                createdAt: new Date().toISOString()
            };

            questionData.__backendId = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            currentData.push(questionData);
            saveLocalData();
            renderQuestions();
            
            showLoadingState('add-question-form');
            setTimeout(() => {
                hideLoadingState('add-question-form');
                hideAddQuestionModal();
                showToast("❓ Question added successfully!", "success");
            }, 500);
        }

        function renderQuestions() {
            const questions = currentData.filter(item => item.type === 'question');
            const questionsContainer = document.getElementById('questions-list');
            
            if (questions.length === 0) {
                questionsContainer.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <div class="text-4xl mb-2">❓</div>
                        <p>No questions yet. Add some questions!</p>
                    </div>
                `;
                return;
            }

            questionsContainer.innerHTML = questions.map((question, index) => `
                <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 card-hover">
                    <div class="flex justify-between items-start mb-2">
                        <h4 class="font-semibold text-gray-800 text-sm">Q${index + 1}</h4>
                        
                    </div>
                    <p class="text-sm text-gray-700 mb-2 font-medium">${question.question}</p>
                    <div class="text-xs text-gray-600 mb-2">
                        <strong>Options:</strong> ${question.options.split('\n').join(', ')}
                    </div>
                    <p class="text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                        <strong>✅ Answer:</strong> ${question.correctAnswer}
                    </p>
                </div>
            `).join('');
        }

        async function deleteQuestion(questionId) {
            const questionIndex = currentData.findIndex(item => item.__backendId === questionId);
            if (questionIndex !== -1) {
                currentData.splice(questionIndex, 1);
                saveLocalData();
                renderQuestions();
                showToast("🗑️ Question deleted successfully!", "success");
            }
        }

        function startQuiz() {
            quizQuestions = currentData.filter(item => item.type === 'question');
            if (quizQuestions.length === 0) {
                showToast("❌ No questions available. Add some questions first!", "error");
                return;
            }
            
            // Shuffle questions for variety
            quizQuestions = quizQuestions.sort(() => Math.random() - 0.5);
            
            currentQuestionIndex = 0;
            userAnswers = [];
            quizActive = true;
            
            document.getElementById('quiz-start').classList.add('hidden');
            document.getElementById('quiz-content').classList.remove('hidden');
            document.getElementById('quiz-results').classList.add('hidden');
            
            showQuestion();
            showToast("🚀 Quiz started! Good luck!", "success");
        }

        function showQuestion() {
            if (currentQuestionIndex >= quizQuestions.length) {
                showQuizResults();
                return;
            }
            
            const question = quizQuestions[currentQuestionIndex];
            const options = question.options.split('\n').filter(opt => opt.trim());
            
            document.getElementById('current-question').textContent = question.question;
            document.getElementById('quiz-progress').textContent = `${currentQuestionIndex + 1} / ${quizQuestions.length}`;
            document.getElementById('quiz-progress-bar').style.width = `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%`;
            
            const optionsContainer = document.getElementById('answer-options');
            optionsContainer.innerHTML = options.map((option, index) => `
                <button onclick="selectAnswer('${option.replace(/'/g, "&#39;")}')" 
                        class="answer-option quiz-option w-full text-left p-4 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium">
                    <span class="inline-block w-6 h-6 bg-gray-200 text-gray-600 rounded-full text-center text-sm font-bold mr-3">${String.fromCharCode(65 + index)}</span>
                    ${option}
                </button>
            `).join('');
            
            // Restore previous answer if exists
            if (userAnswers[currentQuestionIndex]) {
                const selectedOption = optionsContainer.querySelector(`[onclick*="${userAnswers[currentQuestionIndex].replace(/'/g, "&#39;")}"]`);
                if (selectedOption) {
                    selectedOption.classList.add('selected');
                }
            }
            
            // Update navigation buttons
            document.getElementById('prev-question').disabled = currentQuestionIndex === 0;
            document.getElementById('next-question').textContent = currentQuestionIndex === quizQuestions.length - 1 ? '🏁 Finish' : 'Next →';
        }

        function selectAnswer(answer) {
            userAnswers[currentQuestionIndex] = answer;
            
            // Update button styles
            document.querySelectorAll('.answer-option').forEach(btn => {
                btn.classList.remove('selected');
            });
            
            const selectedBtn = event.target.closest('.answer-option');
            if (selectedBtn) {
                selectedBtn.classList.add('selected');
            }
        }

        function previousQuestion() {
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
                showQuestion();
            }
        }

        function nextQuestion() {
            if (currentQuestionIndex < quizQuestions.length - 1) {
                currentQuestionIndex++;
                showQuestion();
            } else {
                showQuizResults();
            }
        }

        function showQuizResults() {
            let correctAnswers = 0;
            
            quizQuestions.forEach((question, index) => {
                if (userAnswers[index] === question.correctAnswer) {
                    correctAnswers++;
                }
            });
            
            const percentage = Math.round((correctAnswers / quizQuestions.length) * 100);
            
            document.getElementById('quiz-content').classList.add('hidden');
            document.getElementById('quiz-results').classList.remove('hidden');
            document.getElementById('final-score').textContent = `${percentage}%`;
            document.getElementById('quiz-score').textContent = `${percentage}%`;
            
            let message = '';
            let emoji = '';
            if (percentage >= 90) {
                message = 'Outstanding! You\'re a quiz master!';
                emoji = '🏆';
            } else if (percentage >= 80) {
                message = 'Excellent work! Keep it up!';
                emoji = '🌟';
            } else if (percentage >= 70) {
                message = 'Good job! You\'re on the right track!';
                emoji = '👍';
            } else if (percentage >= 60) {
                message = 'Not bad! A bit more study will help!';
                emoji = '📚';
            } else {
                message = 'Keep studying! You\'ll improve!';
                emoji = '💪';
            }
            
            document.getElementById('score-message').textContent = `${correctAnswers}/${quizQuestions.length} correct. ${message}`;
            
            quizActive = false;
            showToast(`🎯 Quiz completed! You scored ${percentage}%`, "success");
        }

        function restartQuiz() {
            document.getElementById('quiz-results').classList.add('hidden');
            document.getElementById('quiz-start').classList.remove('hidden');
        }

        // ===== FILE HANDLING FUNCTIONS =====
        function toggleResourceInput() {
            const resourceType = document.getElementById('resource-type').value;
            const textInput = document.getElementById('text-content-input');
            const fileInput = document.getElementById('file-upload-input');
            
            if (resourceType === 'text') {
                textInput.classList.remove('hidden');
                fileInput.classList.add('hidden');
                document.getElementById('resource-content').required = true;
                document.getElementById('resource-file').required = false;
            } else {
                textInput.classList.add('hidden');
                fileInput.classList.remove('hidden');
                document.getElementById('resource-content').required = false;
                document.getElementById('resource-file').required = true;
            }
            
            // Clear previous selections
            document.getElementById('resource-content').value = '';
            clearFileSelection();
        }

        function handleFileSelect(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            // Validate file size
            if (file.size > 200 * 1024 * 1024) {
                showToast("File size must be less than 200MB.", "error");
                clearFileSelection();
                return;
            }
            
            // Show file preview
            const preview = document.getElementById('file-preview');
            const dropZone = document.getElementById('file-drop-zone');
            const fileName = document.getElementById('file-name');
            const fileSize = document.getElementById('file-size');
            const fileIcon = document.getElementById('file-icon');
            
            fileName.textContent = file.name;
            fileSize.textContent = formatFileSize(file.size);
            fileIcon.textContent = getFileIcon(file.type, file.name);
            
            dropZone.classList.add('hidden');
            preview.classList.remove('hidden');
        }

        function clearFileSelection() {
            const fileInput = document.getElementById('resource-file');
            const preview = document.getElementById('file-preview');
            const dropZone = document.getElementById('file-drop-zone');
            
            fileInput.value = '';
            preview.classList.add('hidden');
            dropZone.classList.remove('hidden');
        }

        function getFileIcon(fileType, fileName) {
            const extension = fileName.split('.').pop().toLowerCase();
            
            if (fileType.startsWith('image/')) return '🖼️';
            if (fileType === 'application/pdf') return '📄';
            if (fileType.includes('word') || extension === 'doc' || extension === 'docx') return '📝';
            if (fileType.includes('powerpoint') || extension === 'ppt' || extension === 'pptx') return '📊';
            if (fileType.includes('excel') || extension === 'xls' || extension === 'xlsx') return '📈';
            if (fileType === 'text/plain' || extension === 'txt') return '📄';
            
            return '📎';
        }

        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        function fileToBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
            });
        }

        function downloadFile(fileName, fileData, fileType) {
            try {
                // Create blob from base64 data
                const byteCharacters = atob(fileData.split(',')[1]);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: fileType });
                
                // Create download link
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                
                showToast("📥 File downloaded successfully!", "success");
            } catch (error) {
                showToast("❌ Error downloading file.", "error");
                console.error("Download error:", error);
            }
        }

        function viewImage(fileData, fileName) {
            const modal = document.getElementById('image-viewer-modal');
            const img = document.getElementById('image-viewer-img');
            const title = document.getElementById('image-viewer-title');
            
            img.src = fileData;
            title.textContent = fileName;
            
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        function hideImageViewer() {
            const modal = document.getElementById('image-viewer-modal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }

        // ===== UTILITY FUNCTIONS =====
        function showToast(message, type = 'info') {
            const toast = document.createElement('div');
            toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white z-50 toast shadow-lg font-medium ${
                type === 'success' ? 'bg-green-600' : 
                type === 'error' ? 'bg-red-600' : 
                type === 'info' ? 'bg-blue-600' : 'bg-gray-600'
            }`;
            toast.textContent = message;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.style.animation = 'slideIn 0.3s ease reverse';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        function showLoadingState(formId) {
            const form = document.getElementById(formId);
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<div class="spinner inline-block mr-2"></div>Loading...';
            }
        }

        function hideLoadingState(formId) {
            const form = document.getElementById(formId);
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                if (formId === 'add-task-form') {
                    submitBtn.textContent = 'Add Task';
                } else if (formId === 'add-resource-form') {
                    submitBtn.textContent = 'Add Resource';
                } else if (formId === 'add-question-form') {
                    submitBtn.textContent = 'Add Question';
                }
            }
        }

        // ===== EVENT LISTENERS =====
        document.getElementById('add-task-form').addEventListener('submit', addTask);
        document.getElementById('add-resource-form').addEventListener('submit', addResource);
        document.getElementById('add-question-form').addEventListener('submit', addQuestion);

        // Close modals when clicking outside
        document.addEventListener('click', function(event) {
            const modals = ['add-task-modal', 'add-resource-modal', 'add-question-modal', 'question-auth-modal', 'resource-auth-modal', 'image-viewer-modal'];
            modals.forEach(modalId => {
                const modal = document.getElementById(modalId);
                if (event.target === modal) {
                    modal.classList.add('hidden');
                    modal.classList.remove('flex');
                }
            });
        });

        // Drag and drop support for file upload
        document.addEventListener('DOMContentLoaded', function() {
            const fileDropZone = document.getElementById('file-drop-zone');
            
            if (fileDropZone) {
                ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                    fileDropZone.addEventListener(eventName, preventDefaults, false);
                });

                function preventDefaults(e) {
                    e.preventDefault();
                    e.stopPropagation();
                }

                ['dragenter', 'dragover'].forEach(eventName => {
                    fileDropZone.addEventListener(eventName, highlight, false);
                });

                ['dragleave', 'drop'].forEach(eventName => {
                    fileDropZone.addEventListener(eventName, unhighlight, false);
                });

                function highlight(e) {
                    fileDropZone.classList.add('border-indigo-500', 'bg-indigo-50');
                }

                function unhighlight(e) {
                    fileDropZone.classList.remove('border-indigo-500', 'bg-indigo-50');
                }

                fileDropZone.addEventListener('drop', handleDrop, false);

                function handleDrop(e) {
                    const dt = e.dataTransfer;
                    const files = dt.files;
                    
                    if (files.length > 0) {
                        const fileInput = document.getElementById('resource-file');
                        fileInput.files = files;
                        handleFileSelect({ target: fileInput });
                    }
                }
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', function(event) {
            // Escape key to close modals
            if (event.key === 'Escape') {
                const modals = ['add-task-modal', 'add-resource-modal', 'add-question-modal', 'question-auth-modal', 'resource-auth-modal'];
                modals.forEach(modalId => {
                    const modal = document.getElementById(modalId);
                    if (!modal.classList.contains('hidden')) {
                        modal.classList.add('hidden');
                        modal.classList.remove('flex');
                    }
                });
            }
            

            
            // Enter key in resource author password field
            if (event.key === 'Enter' && event.target.id === 'resource-auth-password') {
                authenticateResourceAuthor();
            }
            
            // Enter key in question author password field
            if (event.key === 'Enter' && event.target.id === 'question-auth-password') {
                authenticateQuestionAuthor();
            }
        });

        // ===== INITIALIZE APP =====
        document.addEventListener('DOMContentLoaded', initializeApp);