// ========================================
// PAGE NAVIGATION & TABS
// ========================================

function switchPage(pageName) {
    try {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        const targetPage = document.getElementById(`${pageName}`);
        if (targetPage) {
            targetPage.classList.add('active');
        }
        
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        const navBtn = document.querySelector(`[data-page="${pageName}"]`);
        if (navBtn) {
            navBtn.classList.add('active');
        }
        console.log('Switched to page:', pageName);
    } catch (error) {
        console.error('Error switching page:', error);
        appendLog(`[Error] Failed to switch page: ${error.message}`, 'error');
    }
}

// Upload Tab Switching
function switchUploadTab(tabName) {
    try {
        // Clear all inputs when switching tabs to avoid conflicts
        const videoInput = document.getElementById('videoInput');
        const youtubeInput = document.getElementById('youtube_url');
        const fileInfo = document.getElementById('fileInfo');
        const youtubeInfo = document.getElementById('youtubeInfo');
        
        if (videoInput) {
            videoInput.value = '';
        }
        if (youtubeInput) {
            youtubeInput.value = '';
        }
        if (fileInfo) {
            fileInfo.innerHTML = '';
        }
        if (youtubeInfo) {
            youtubeInfo.innerHTML = '';
        }
        
        // Hide all tabs
        document.querySelectorAll('.upload-tab-content').forEach(tab => {
            tab.classList.remove('active');
            tab.style.display = 'none';
        });
        
        // Show selected tab
        const selectedTab = document.getElementById(tabName);
        if (selectedTab) {
            selectedTab.classList.add('active');
            selectedTab.style.display = 'block';
        }
        
        // Update button states
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.style.opacity = '0.7';
        });
        
        // Highlight active button
        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
            activeBtn.style.opacity = '1';
        }
        
        console.log('Switched to tab:', tabName);
    } catch (error) {
        console.error('Error switching tab:', error);
        appendLog(`[Error] Failed to switch tab: ${error.message}`, 'error');
    }
}

// YouTube URL Validation
function validateYoutubeUrl(url) {
    console.log('🔍 validateYoutubeUrl called with:', url);
    try {
        const input = document.getElementById('youtube_url');
        const infoDiv = document.getElementById('youtubeInfo');
        
        if (!input) {
            console.error('❌ youtube_url input element not found');
            return false;
        }
        
        const urlValue = url || input.value.trim();
        console.log('📝 URL value:', urlValue);
        
        // YouTube URL patterns
        const pattern = /^(https?:\/\/)?(www\.)?(youtube|youtu|youtube-nocookie)\.(com|be)\//;
        
        const isValid = pattern.test(urlValue);
        console.log('✅ URL valid:', isValid);
        
        if (infoDiv) {
            if (urlValue) {
                if (isValid) {
                    infoDiv.textContent = `✅ Valid YouTube URL`;
                    infoDiv.style.color = '#10b981';
                    console.log('✅ Showing valid indicator');
                } else {
                    infoDiv.textContent = `❌ Invalid YouTube URL format`;
                    infoDiv.style.color = '#ef4444';
                    console.log('❌ Showing invalid indicator');
                }
            } else {
                infoDiv.textContent = '';
                console.log('⚠️ URL field empty');
            }
        } else {
            console.warn('⚠️ youtubeInfo div not found');
        }
        
        return isValid;
    } catch (error) {
        console.error('❌ Error validating YouTube URL:', error);
        const infoDiv = document.getElementById('youtubeInfo');
        if (infoDiv) {
            infoDiv.textContent = `❌ Validation error: ${error.message}`;
            infoDiv.style.color = '#ef4444';
        }
        return false;
    }
}

// Initialize tab event listeners
function initializeTabListeners() {
    try {
        const tabButtons = document.querySelectorAll('.tab-btn');
        console.log(`📑 Found ${tabButtons.length} tab buttons`);
        
        if (tabButtons.length === 0) {
            console.warn('⚠️ No tab buttons found');
            return;
        }
        
        tabButtons.forEach(btn => {
            btn.removeEventListener('click', handleTabClick);
            btn.addEventListener('click', handleTabClick);
            console.log(`✅ Added listener to tab: ${btn.getAttribute('data-tab')}`);
        });
        
        console.log('✅ Tab listeners initialized');
    } catch (error) {
        console.error('❌ Error initializing tab listeners:', error);
    }
}

function handleTabClick(e) {
    try {
        e.preventDefault();
        const tabName = e.target.closest('.tab-btn')?.getAttribute('data-tab');
        console.log(`📑 Tab click detected: ${tabName}`);
        if (tabName) {
            switchUploadTab(tabName);
        }
    } catch (error) {
        console.error('❌ Error handling tab click:', error);
    }
}

// Initialize YouTube URL validation listener
function initializeYoutubeUrlListener() {
    try {
        const youtubeInput = document.getElementById('youtube_url');
        const validateBtn = document.getElementById('validateBtn');
        
        console.log(`🎥 YouTube input found: ${!!youtubeInput}`);
        console.log(`✅ Validate button found: ${!!validateBtn}`);
        
        if (youtubeInput) {
            youtubeInput.removeEventListener('input', validateYoutubeUrl);
            youtubeInput.addEventListener('input', validateYoutubeUrl);
            console.log('✅ YouTube URL input listener added (fires on every keystroke)');
        } else {
            console.warn('⚠️ YouTube URL input element not found (id="youtube_url")');
        }
        
        if (validateBtn) {
            // Remove any existing listeners
            validateBtn.onclick = null;
            validateBtn.removeEventListener('click', handleValidateClick);
            
            // Add new listener with proper function
            validateBtn.addEventListener('click', handleValidateClick);
            console.log('✅ Validate button click listener added');
            
            // Also keep the onclick attribute as backup
            validateBtn.setAttribute('onclick', 'validateYoutubeUrl()');
            console.log('✅ Validate button onclick attribute set as backup');
        } else {
            console.warn('⚠️ Validate button not found (id="validateBtn")');
        }
    } catch (error) {
        console.error('❌ Error initializing YouTube URL listener:', error);
    }
}

// Handle validate button click
function handleValidateClick(e) {
    console.log('🔘 Validate button clicked!');
    e.preventDefault();
    validateYoutubeUrl();
}

// FE-1/2: Frontend logic - Enhanced form submission with dual mode support
document.getElementById('uploadForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById('videoInput');
    const youtubeInput = document.getElementById('youtube_url');
    const submitBtn = document.getElementById('submitBtn');
    const terminal = document.getElementById('terminalLogs');
    const progressFill = document.getElementById('progressFill');
    const statusBadge = document.getElementById('statusBadge');

    // Check which upload mode is active
    const isFileMode = fileInput && fileInput.files && fileInput.files.length > 0;
    const isYoutubeMode = youtubeInput && youtubeInput.value.trim().length > 0;
    
    // Validation: Must select either file OR YouTube URL, not both
    if (isFileMode && isYoutubeMode) {
        if (terminal) {
            terminal.innerHTML = '<span class="log-error">[Error] ❌ Please select either a file OR a YouTube URL, not both</span>';
        }
        return;
    }
    
    if (!isFileMode && !isYoutubeMode) {
        if (terminal) {
            terminal.innerHTML = '<span class="log-error">[Error] ❌ Please select a video file or enter a YouTube URL</span>';
        }
        return;
    }

    // Validate file size if in file mode
    if (isFileMode) {
        const maxSize = 5 * 1024 * 1024 * 1024; // 5GB
        const fileSize = fileInput.files[0].size;
        if (fileSize > maxSize) {
            if (terminal) {
                terminal.innerHTML = `<span class="log-error">[Error] ❌ File too large (${(fileSize / (1024*1024*1024)).toFixed(1)}GB > 5GB limit)</span>`;
            }
            return;
        }
    }

    // Validate YouTube URL if in YouTube mode
    if (isYoutubeMode) {
        const urlValue = youtubeInput.value.trim();
        // YouTube URL pattern validation
        const pattern = /^(https?:\/\/)?(www\.)?(youtube|youtu|youtube-nocookie)\.(com|be)\//;
        if (!pattern.test(urlValue)) {
            if (terminal) {
                terminal.innerHTML = '<span class="log-error">[Error] ❌ Invalid YouTube URL format. Use: https://www.youtube.com/watch?v=... or youtu.be/...</span>';
            }
            return;
        }
    }

    // UI Reset for fresh job execution
    if (submitBtn) submitBtn.disabled = true;
    if (progressFill) progressFill.style.width = '5%';
    if (statusBadge) statusBadge.innerText = 'Uploading...';
    if (terminal) terminal.innerHTML = '<span class="log-info">[System] Initializing upload...</span>';

    const formData = new FormData(e.target);
    const whisperModel = document.getElementById('whisper_model')?.value || 'tiny';
    const numClips = document.getElementById('num_clips')?.value || '2';
    const minDur = document.getElementById('min_dur')?.value || '15';
    const maxDur = document.getElementById('max_dur')?.value || '45';
    const optimizeSpeed = document.getElementById('optimize_speed')?.checked ? 'on' : 'off';
    
    // Add form data
    formData.append('whisper_model', whisperModel);
    formData.append('num_clips', numClips);
    formData.append('min_dur', minDur);
    formData.append('max_dur', maxDur);
    formData.append('optimize_speed', optimizeSpeed);
    
    // Handle both file and YouTube modes
    if (isYoutubeMode) {
        // Remove video file if it exists in formData
        formData.delete('video');
        // Ensure youtube_url is set correctly
        formData.set('youtube_url', youtubeInput.value.trim());
        if (terminal) terminal.innerHTML += '<br><span class="log-info">[System] 📥 Preparing YouTube download...</span>';
    } else if (isFileMode) {
        // Remove youtube_url if it exists
        formData.delete('youtube_url');
        if (terminal) terminal.innerHTML += `<br><span class="log-info">[System] 📤 Uploading: ${fileInput.files[0].name}</span>`;
    }

    if (terminal) terminal.innerHTML += `<br><span class="log-info">[System] 🎛️ Settings: ${numClips} clips, ${minDur}-${maxDur}s, ${whisperModel} model</span>`;
    
    // Switch to pipeline page IMMEDIATELY
    switchPage('pipeline-page');
    const pipelineBtn = document.getElementById('pipelineBtn');
    if (pipelineBtn) pipelineBtn.disabled = false;
    
    // Initialize pipeline UI
    initializePipelineUI();
    
    // Send upload in background
    try {
        const res = await fetch('/upload', { method: 'POST', body: formData });
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            const errorMsg = errorData.error || `Upload failed (${res.status})`;
            appendLog(`[Error] ❌ ${errorMsg}`, 'error');
            if (submitBtn) submitBtn.disabled = false;
            if (statusBadge) statusBadge.innerText = 'Error';
            return;
        }
        
        const data = await res.json();
        const jobId = data.job_id;

        appendLog(`[System] ✅ Job created: ${jobId}`, 'success');
        appendLog(`[System] 🚀 Processing started...`, 'success');
        
        // Start live tracking loop
        trackPipelineStatus(jobId);

    } catch (err) {
        console.error('Upload error:', err);
        appendLog(`[Error] ❌ ${err.message}`, 'error');
        if (statusBadge) statusBadge.innerText = 'Error';
        if (submitBtn) submitBtn.disabled = false;
    }
});

// Initialize pipeline UI with all stages visible
function initializePipelineUI() {
    try {
        // Reset all pipeline steps to initial state
        const pipelineSteps = document.querySelectorAll('.pipeline-step');
        pipelineSteps.forEach((step, index) => {
            step.classList.remove('active', 'completed');
            if (index === 0) {
                step.classList.add('active'); // First step is active
            }
        });
        
        // Reset progress bar
        const progressFill = document.getElementById('progressFill');
        if (progressFill) progressFill.style.width = '5%';
        
        const progressText = document.getElementById('progressText');
        if (progressText) progressText.innerText = '5%';
        
        const statusBadge = document.getElementById('statusBadge');
        if (statusBadge) statusBadge.innerText = 'Uploading...';
        
        // Clear transcript panel for fresh transcript
        const transcriptPanel = document.getElementById('transcriptPanel');
        const transcriptBody = document.getElementById('transcriptBody');
        if (transcriptPanel) transcriptPanel.style.display = 'none';
        if (transcriptBody) transcriptBody.innerHTML = '';
        
        console.log('Pipeline UI initialized');
    } catch (error) {
        console.error('Error initializing pipeline UI:', error);
    }
}

// Real-time status tracker loop - Enhanced with better error handling
function trackPipelineStatus(jobId) {
    const statusBadge = document.getElementById('statusBadge');
    const progressFill = document.getElementById('progressFill');
    const submitBtn = document.getElementById('submitBtn');
    const terminal = document.getElementById('terminalLogs');
    const pipelineBtn = document.getElementById('pipelineBtn');
    const resultsBtn = document.getElementById('resultsBtn');
    
    let errorCount = 0;
    const maxErrors = 10; // Stop polling after 10 consecutive errors

    const interval = setInterval(async () => {
        try {
            const res = await fetch(`/status/${jobId}`);
            if (!res.ok) {
                errorCount++;
                if (errorCount >= maxErrors) {
                    clearInterval(interval);
                    appendLog(`[Error] ❌ Lost connection to server (${errorCount} errors)`, 'error');
                    statusBadge.innerText = 'Connection Lost';
                    submitBtn.disabled = false;
                }
                return;
            }
            
            errorCount = 0; // Reset error count on successful response
            const job = await res.json();
            
            // Map processing stages to artificial smooth weights for UI progress bar
            const stageProgress = {
                "queued": 10,
                "transcribing": 30,
                "scoring": 50,
                "selecting": 70,
                "rendering": 85,
                "effects": 95,
                "done": 100,
                "error": 100
            };

            statusBadge.innerText = job.stage.charAt(0).toUpperCase() + job.stage.slice(1);
            const currentProgress = stageProgress[job.stage] || 5;
            progressFill.style.width = `${currentProgress}%`;
            
            // Update progress percentage text
            const progressText = document.getElementById('progressText');
            if (progressText) {
                progressText.innerText = `${currentProgress}%`;
            }

            // Update pipeline steps visualization
            const stageOrder = ["queued", "transcribing", "scoring", "selecting", "rendering", "effects", "done"];
            const currentStageIndex = stageOrder.indexOf(job.stage);
            
            const pipelineSteps = document.querySelectorAll('.pipeline-step');
            pipelineSteps.forEach((step, index) => {
                const stepStage = step.getAttribute('data-stage');
                const stepIndex = stageOrder.indexOf(stepStage);
                
                // Remove all classes first
                step.classList.remove('active', 'completed');
                
                // Add appropriate class based on position
                if (stepIndex < currentStageIndex) {
                    // Past stages are completed
                    step.classList.add('completed');
                } else if (stepIndex === currentStageIndex) {
                    // Current stage is active
                    step.classList.add('active');
                }
                // Future stages have no class (default gray style)
            });

            // Clear and dump latest console logs stream
            terminal.innerHTML = '';
            if (job.log && job.log.length > 0) {
                job.log.forEach(msg => {
                    if (msg.includes('ERROR') || msg.includes('❌')) {
                        appendLog(msg, 'error');
                    } else if (msg.includes('complete') || msg.includes('✅') || msg.includes('🎉')) {
                        appendLog(msg, 'success');
                    } else {
                        appendLog(msg, 'info');
                    }
                });
            }

            // Display transcript when available
            if (job.transcript && job.stage !== 'queued') {
                displayTranscript(job.transcript);
            }

            // Termination conditions
            if (job.stage === "done") {
                clearInterval(interval);
                submitBtn.disabled = false;
                statusBadge.innerText = "Complete ✨";
                
                // Enable results page
                if (resultsBtn) {
                    resultsBtn.disabled = false;
                }
                
                appendLog('[System] ✅ Processing complete! Check Results page.', 'success');
                displayRenderedShorts(job.results, job.pipeline_duration);
                
            } else if (job.stage === "error") {
                clearInterval(interval);
                submitBtn.disabled = false;
                statusBadge.innerText = "Failed ❌";
                appendLog(`[Pipeline Error] ❌ ${job.error || 'Unknown error'}`, 'error');
                appendLog('[Info] Try adjusting settings (fewer clips, shorter duration, etc.)', 'info');
            }

        } catch (err) {
            console.error("Polling error:", err);
            errorCount++;
            if (errorCount >= maxErrors) {
                clearInterval(interval);
                appendLog(`[Error] ❌ Polling error: ${err.message}`, 'error');
                statusBadge.innerText = 'Error';
                submitBtn.disabled = false;
            }
        }
    }, 1500); // Poll server every 1.5 seconds
}

function appendLog(text, type) {
    try {
        const terminal = document.getElementById('terminalLogs');
        if (!terminal) return;
        
        const span = document.createElement('span');
        span.className = `log-${type}`;
        span.innerText = text;
        terminal.appendChild(span);
        terminal.scrollTop = terminal.scrollHeight; // Auto-scroll to bottom
    } catch (error) {
        console.error('Error appending log:', error);
    }
}

function displayRenderedShorts(results, processingTime) {
    const grid = document.getElementById('videoGrid');
    const statsDiv = document.getElementById('resultsStats');
    
    if (!grid) return;
    
    grid.innerHTML = '';

    if (!results || results.length === 0) {
        grid.innerHTML = '<p style="color: var(--text-muted); grid-column: 1/-1; text-align: center; padding: 40px;">Pipeline executed but no optimal candidate clips fell within constraints. Try adjusting your settings.</p>';
        return;
    }

    // Calculate and display stats
    let totalDuration = 0;
    results.forEach(short => {
        totalDuration += short.duration || 0;
    });
    
    // Show stats if available
    if (statsDiv) {
        const totalClipsDiv = document.getElementById('totalClips');
        const totalDurationDiv = document.getElementById('totalDuration');
        const processingTimeDiv = document.getElementById('processingTime');
        
        if (totalClipsDiv) totalClipsDiv.textContent = results.length;
        if (totalDurationDiv) totalDurationDiv.textContent = formatTime(totalDuration);
        if (processingTimeDiv) processingTimeDiv.textContent = processingTime || 'N/A';
        
        statsDiv.style.display = 'grid';
    }

    // Display video cards
    results.forEach((short, idx) => {
        const card = document.createElement('div');
        card.className = 'video-card';
        const duration = formatTime(short.duration);
        
        card.innerHTML = `
            <video src="/download/${short.filename}" controls style="width: 100%; border-radius: 6px; background: #000;"></video>
            <p style="font-weight: 600; margin: 8px 0 2px 0; text-align: center;">🎬 Clip #${idx + 1}</p>
            <p style="color: var(--text-muted); font-size: 0.8rem; margin-bottom: 10px; text-align: center;">
                ${duration} (${Math.round(short.start)}s - ${Math.round(short.end)}s)
            </p>
            <a href="/download/${short.filename}" class="btn-download" download>📥 Download MP4</a>
        `;
        grid.appendChild(card);
    });
    
    // Add to history
    const videoInput = document.getElementById('videoInput');
    const videoName = videoInput && videoInput.files && videoInput.files[0] ? videoInput.files[0].name : 'YouTube Video';
    
    addToHistory({
        videoName: videoName,
        numClips: results.length,
        duration: formatTime(totalDuration),
        status: 'completed',
        results: results,
        pipelineDuration: processingTime
    });
    
    // Switch to results page automatically
    setTimeout(() => {
        switchPage('results-page');
    }, 500);
}

// Input interactive visual response with file size display
document.getElementById('videoInput')?.addEventListener('change', (e) => {
    try {
        const file = e.target.files[0];
        if (file) {
            const filename = file.name;
            const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
            const sizeLimitGB = 5;
            const isValid = file.size <= (sizeLimitGB * 1024 * 1024 * 1024);
            
            document.querySelector('.drop-zone__prompt').innerText = `Target Video: ${filename}`;
            
            const fileInfoDiv = document.getElementById('fileInfo');
            if (isValid) {
                fileInfoDiv.innerHTML = `✅ ${filename} (${sizeInMB} MB)`;
                fileInfoDiv.style.color = '#10b981';
            } else {
                fileInfoDiv.innerHTML = `❌ File too large (${sizeInMB} MB > ${sizeLimitGB}GB limit)`;
                fileInfoDiv.style.color = '#ef4444';
            }
        }
    } catch (error) {
        console.error('Error handling file input:', error);
    }
});

// Display transcript with timestamps
function displayTranscript(transcript) {
    const transcriptPanel = document.getElementById('transcriptPanel');
    const transcriptBody = document.getElementById('transcriptBody');
    
    if (!transcript || !transcript.words || transcript.words.length === 0) {
        return;
    }
    
    transcriptPanel.style.display = 'block';
    transcriptBody.innerHTML = '';
    
    // Group words by sentence/context
    let currentLine = '';
    let currentTime = 0;
    const lines = [];
    
    transcript.words.forEach((word, idx) => {
        if (idx === 0) currentTime = word.start;
        
        currentLine += word.word + ' ';
        
        // Break line every 10 words or at punctuation
        if (currentLine.length > 60 || word.word.includes('.') || word.word.includes('?') || word.word.includes('!')) {
            lines.push({
                text: currentLine.trim(),
                start: currentTime,
                end: word.end
            });
            currentLine = '';
            if (idx < transcript.words.length - 1) {
                currentTime = transcript.words[idx + 1].start;
            }
        }
    });
    
    if (currentLine.trim()) {
        lines.push({
            text: currentLine.trim(),
            start: currentTime,
            end: transcript.words[transcript.words.length - 1].end
        });
    }
    
    lines.forEach(line => {
        const item = document.createElement('div');
        item.className = 'transcript-item';
        item.innerHTML = `
            <div class="transcript-timestamp">${formatTime(line.start)} → ${formatTime(line.end)}</div>
            <div class="transcript-text">${line.text}</div>
        `;
        transcriptBody.appendChild(item);
    });
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ========================================
// INITIALIZATION
// ========================================

// Initialize all event listeners when DOM is ready
function initializeApp() {
    try {
        console.log('🚀 Initializing application...');
        console.log('📋 DOM state:', document.readyState);
        
        // Initialize tab listeners
        initializeTabListeners();
        
        // Initialize YouTube URL validation
        initializeYoutubeUrlListener();
        
        // Ensure upload form has proper error handling
        const uploadForm = document.getElementById('uploadForm');
        if (uploadForm) {
            console.log('✅ Upload form found and ready');
        } else {
            console.error('❌ Upload form NOT found!');
        }
        
        console.log('✅ Application initialization complete');
    } catch (error) {
        console.error('❌ Error during app initialization:', error);
        appendLog(`[Critical Error] Initialization failed: ${error.message}`, 'error');
    }
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// ========================================
// HISTORY PAGE FUNCTIONS
// ========================================

function loadHistory() {
    try {
        const historyList = document.getElementById('historyList');
        const history = JSON.parse(localStorage.getItem('autoshorts_history')) || [];
        
        if (history.length === 0) {
            historyList.innerHTML = '<p class="empty-state">📭 No history yet. Start by uploading a video!</p>';
            return;
        }
        
        historyList.innerHTML = '';
        history.reverse().forEach((item, idx) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            
            const status = item.status === 'completed' ? '✅ Completed' : item.status === 'failed' ? '❌ Failed' : '⏳ Processing';
            const statusColor = item.status === 'completed' ? '#10b981' : item.status === 'failed' ? '#ef4444' : '#f59e0b';
            
            historyItem.innerHTML = `
                <div class="history-item-info">
                    <div class="history-item-name">📹 ${item.videoName || 'Unknown Video'}</div>
                    <div class="history-item-details">
                        <span>⏰ ${new Date(item.timestamp).toLocaleString()}</span>
                        <span>🎬 ${item.numClips} clips</span>
                        <span>⏱️ ${item.duration}</span>
                        <span class="history-item-badge" style="background-color: ${statusColor}22; color: ${statusColor};">${status}</span>
                    </div>
                </div>
                <div class="history-item-actions">
                    ${item.status === 'completed' ? `<button class="history-btn" onclick="viewHistoryDetails(${idx})">View</button>` : ''}
                    <button class="history-btn" onclick="removeHistoryItem(${idx})">Remove</button>
                </div>
            `;
            historyList.appendChild(historyItem);
        });
        
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

function addToHistory(jobData) {
    try {
        const history = JSON.parse(localStorage.getItem('autoshorts_history')) || [];
        
        const historyEntry = {
            timestamp: new Date().toISOString(),
            videoName: jobData.videoName || 'Unknown Video',
            numClips: jobData.numClips || 0,
            duration: jobData.duration || '0:00',
            status: jobData.status || 'processing',
            results: jobData.results || [],
            pipelineDuration: jobData.pipelineDuration || 'N/A'
        };
        
        history.push(historyEntry);
        
        // Keep only last 50 entries
        if (history.length > 50) {
            history.shift();
        }
        
        localStorage.setItem('autoshorts_history', JSON.stringify(history));
        console.log('Added to history:', historyEntry);
        
    } catch (error) {
        console.error('Error adding to history:', error);
    }
}

function removeHistoryItem(idx) {
    try {
        if (confirm('Remove this item from history?')) {
            const history = JSON.parse(localStorage.getItem('autoshorts_history')) || [];
            history.reverse();
            history.splice(idx, 1);
            history.reverse();
            
            localStorage.setItem('autoshorts_history', JSON.stringify(history));
            loadHistory();
            appendLog('[History] 🗑️ Item removed', 'success');
        }
    } catch (error) {
        console.error('Error removing history item:', error);
    }
}

function clearHistory() {
    try {
        if (confirm('Are you sure? This will delete all history entries.')) {
            localStorage.setItem('autoshorts_history', '[]');
            loadHistory();
            appendLog('[History] 🗑️ All history cleared', 'success');
        }
    } catch (error) {
        console.error('Error clearing history:', error);
    }
}

function viewHistoryDetails(idx) {
    const history = JSON.parse(localStorage.getItem('autoshorts_history')) || [];
    history.reverse();
    const item = history[idx];
    
    if (item && item.results) {
        displayRenderedShorts(item.results, item.pipelineDuration);
    }
}

// Load history when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
});