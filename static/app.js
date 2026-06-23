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
    try {
        const input = document.getElementById('youtubeUrl');
        const infoDiv = document.getElementById('youtubeInfo');
        
        if (!input) {
            console.error('youtubeUrl input element not found');
            return false;
        }
        
        const urlValue = url || input.value.trim();
        const pattern = /^(https?:\/\/)?(www\.)?(youtube|youtu|youtube-nocookie)\.(com|be)\//;
        
        const isValid = pattern.test(urlValue);
        
        if (infoDiv) {
            if (urlValue) {
                infoDiv.textContent = isValid ? `✅ Valid YouTube URL` : `❌ Invalid YouTube URL`;
                infoDiv.style.color = isValid ? '#10b981' : '#ef4444';
            } else {
                infoDiv.textContent = '';
            }
        }
        
        return isValid;
    } catch (error) {
        console.error('Error validating YouTube URL:', error);
        appendLog(`[Error] YouTube validation failed: ${error.message}`, 'error');
        return false;
    }
}

// Initialize tab event listeners
function initializeTabListeners() {
    try {
        const tabButtons = document.querySelectorAll('.tab-btn');
        if (tabButtons.length === 0) {
            console.warn('No tab buttons found');
            return;
        }
        
        tabButtons.forEach(btn => {
            btn.removeEventListener('click', handleTabClick);
            btn.addEventListener('click', handleTabClick);
        });
        
        console.log('Tab listeners initialized');
    } catch (error) {
        console.error('Error initializing tab listeners:', error);
    }
}

function handleTabClick(e) {
    try {
        e.preventDefault();
        const tabName = e.target.closest('.tab-btn')?.getAttribute('data-tab');
        if (tabName) {
            switchUploadTab(tabName);
        }
    } catch (error) {
        console.error('Error handling tab click:', error);
    }
}

// Initialize YouTube URL validation listener
function initializeYoutubeUrlListener() {
    try {
        const youtubeInput = document.getElementById('youtubeUrl');
        if (youtubeInput) {
            youtubeInput.removeEventListener('input', validateYoutubeUrl);
            youtubeInput.addEventListener('input', validateYoutubeUrl);
            console.log('YouTube URL listener initialized');
        }
    } catch (error) {
        console.error('Error initializing YouTube URL listener:', error);
    }
}

// FE-1/2: Frontend logic - Enhanced form submission with dual mode support
document.getElementById('uploadForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById('videoInput');
    const youtubeInput = document.getElementById('youtubeUrl');
    const submitBtn = document.getElementById('submitBtn');
    const terminal = document.getElementById('terminalLogs');
    const progressFill = document.getElementById('progressFill');
    const statusBadge = document.getElementById('statusBadge');

    // CRITICAL FIX: Check which upload mode is active
    const isFileMode = fileInput && fileInput.files && fileInput.files.length > 0;
    const isYoutubeMode = youtubeInput && youtubeInput.value.trim().length > 0;
    
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
        const pattern = /^(https?:\/\/)?(www\.)?(youtube|youtu|youtube-nocookie)\.(com|be)\//;
        if (!pattern.test(urlValue)) {
            if (terminal) {
                terminal.innerHTML = '<span class="log-error">[Error] ❌ Invalid YouTube URL format</span>';
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
    
    // CRITICAL FIX: Handle both file and YouTube modes
    if (isYoutubeMode) {
        formData.delete('video');
        formData.append('youtube_url', youtubeInput.value.trim());
        if (terminal) terminal.innerHTML += '<br><span class="log-info">[System] 📥 Downloading from YouTube...</span>';
    } else if (isFileMode) {
        formData.delete('youtubeUrl');
        if (terminal) terminal.innerHTML += `<br><span class="log-info">[System] 📤 Uploading: ${fileInput.files[0].name}</span>`;
    }

    try {
        if (terminal) terminal.innerHTML += `<br><span class="log-info">[System] 🎛️ Settings: ${numClips} clips, ${minDur}-${maxDur}s, ${whisperModel} model</span>`;
        
        // Send to upload endpoint
        const res = await fetch('/upload', { method: 'POST', body: formData });
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            const errorMsg = errorData.error || `Upload failed (${res.status})`;
            if (terminal) terminal.innerHTML += `<br><span class="log-error">[Error] ❌ ${errorMsg}</span>`;
            if (submitBtn) submitBtn.disabled = false;
            if (statusBadge) statusBadge.innerText = 'Error';
            return;
        }
        
        const data = await res.json();
        const jobId = data.job_id;

        if (terminal) {
            terminal.innerHTML += `<br><span class="log-success">[System] ✅ Job created: ${jobId}</span>`;
            terminal.innerHTML += `<br><span class="log-success">[System] 🚀 Processing started...</span>`;
        }
        
        // CRITICAL FIX: Switch to pipeline page automatically
        switchPage('pipeline-page');
        const pipelineBtn = document.getElementById('pipelineBtn');
        if (pipelineBtn) pipelineBtn.disabled = false;
        
        // Start live tracking loop
        trackPipelineStatus(jobId);

    } catch (err) {
        console.error('Upload error:', err);
        if (terminal) terminal.innerHTML += `<br><span class="log-error">[Error] ❌ ${err.message}</span>`;
        if (statusBadge) statusBadge.innerText = 'Error';
        if (submitBtn) submitBtn.disabled = false;
    }
});

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
        console.log('Initializing application...');
        
        // Initialize tab listeners
        initializeTabListeners();
        
        // Initialize YouTube URL validation
        initializeYoutubeUrlListener();
        
        // Ensure upload form has proper error handling
        const uploadForm = document.getElementById('uploadForm');
        if (uploadForm) {
            console.log('Upload form found and ready');
        }
        
        // Add validation for YouTube button click
        const validateBtn = document.getElementById('validateBtn');
        if (validateBtn) {
            validateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                validateYoutubeUrl();
            });
            console.log('Validate button listener added');
        }
        
        console.log('Application initialization complete');
    } catch (error) {
        console.error('Error during app initialization:', error);
        appendLog(`[Critical Error] Initialization failed: ${error.message}`, 'error');
    }
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}