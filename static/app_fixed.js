// ========================================
// PAGE NAVIGATION & TABS
// ========================================

function switchPage(pageName) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(`${pageName}`)?.classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`[data-page="${pageName}"]`)?.classList.add('active');
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
    }
}

// YouTube URL Validation
function validateYoutubeUrl(url) {
    const input = document.getElementById('youtubeUrl');
    const infoDiv = document.getElementById('youtubeInfo');
    
    if (!input) return false;
    
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
}

function goBackToUpload() {
    document.getElementById('uploadForm').reset();
    document.getElementById('videoInput').value = '';
    document.getElementById('youtubeUrl').value = '';
    document.getElementById('fileInfo').textContent = '';
    document.getElementById('youtubeInfo').textContent = '';
    document.getElementById('resultsStats').style.display = 'none';
    document.getElementById('videoGrid').innerHTML = '';
    document.getElementById('downloadAllBtn').style.display = 'none';
    document.getElementById('pipelineBtn').disabled = true;
    document.getElementById('resultsBtn').disabled = true;
    document.getElementById('progressFill').style.width = '0%';
    document.getElementById('progressText').textContent = '0%';
    document.getElementById('terminalLogs').innerHTML = '<span class="log-info">[System] Ready for new upload</span>';
    switchPage('upload-page');
}

function downloadAllClips() {
    const grid = document.getElementById('videoGrid');
    const links = grid.querySelectorAll('a.btn-download');
    
    if (links.length === 0) return;
    
    appendLog(`📥 Starting bulk download of ${links.length} clips...`, 'info');
    
    // Download each clip with delay to prevent browser blocking
    links.forEach((link, idx) => {
        setTimeout(() => {
            link.click();
            appendLog(`Downloaded clip ${idx + 1}/${links.length}`, 'success');
        }, idx * 500);
    });
}

// Format Stage Names with Emojis
function formatStageName(stage) {
    const stages = {
        'queued': '⏳ Queued',
        'transcribing': '🗣️ Transcribing',
        'scoring': '⭐ Scoring',
        'selecting': '✂️ Selecting',
        'rendering': '🎬 Rendering',
        'effects': '✨ Adding Effects',
        'done': '🎉 Done'
    };
    return stages[stage] || stage;
}

// Format Time to MM:SS
function formatTime(seconds) {
    if (!seconds && seconds !== 0) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Append Log Message
function appendLog(text, type = 'info') {
    const logs = document.getElementById('terminalLogs');
    if (!logs) return;
    
    const span = document.createElement('span');
    span.className = `log-${type}`;
    span.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
    logs.appendChild(span);
    logs.scrollTop = logs.scrollHeight;
}

// Update Pipeline Visualization
function updatePipelineVisualization(currentStage) {
    const stages = ['queued', 'transcribing', 'scoring', 'selecting', 'rendering', 'effects', 'done'];
    const stageIndex = stages.indexOf(currentStage);
    
    document.querySelectorAll('[data-stage]').forEach((el, idx) => {
        el.classList.remove('active', 'completed');
        if (idx < stageIndex) {
            el.classList.add('completed');
        } else if (idx === stageIndex) {
            el.classList.add('active');
        }
    });
}

// Update Progress Bar
function updateProgressBar(percentage) {
    const fill = document.getElementById('progressFill');
    const text = document.getElementById('progressText');
    if (fill) fill.style.width = percentage + '%';
    if (text) text.textContent = Math.round(percentage) + '%';
}

// ========================================
// CLIPS SEQUENCE VISUALIZATION
// ========================================

function updateClipsSequenceVisualization(results, currentStage) {
    const container = document.getElementById('clipsSequenceContainer');
    const sequence = document.getElementById('clipsSequence');
    const clipsCount = document.getElementById('clipsCount');
    
    if (!container || !sequence || !results) return;
    
    if (results.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    clipsCount.textContent = `${results.length} Clip${results.length > 1 ? 's' : ''}`;
    
    sequence.innerHTML = '';
    
    results.forEach((clip, idx) => {
        // Determine status
        let status = 'pending';
        let statusIcon = '⏳';
        
        if (currentStage === 'effects' || currentStage === 'done') {
            status = 'completed';
            statusIcon = '✅';
        } else if (currentStage === 'rendering' && idx === 0) {
            status = 'processing';
            statusIcon = '🎬';
        } else if (currentStage === 'rendering') {
            status = 'processing';
            statusIcon = '⏳';
        }
        
        const item = document.createElement('div');
        item.className = `clip-sequence-item ${status}`;
        item.innerHTML = `
            <div class="clip-seq-number">Clip ${idx + 1}</div>
            <div class="clip-seq-label">
                <span class="clip-seq-status">${statusIcon}</span>
            </div>
            <div class="clip-seq-duration">${formatTime(clip.duration)}</div>
            <div class="clip-seq-label">${clip.start?.toFixed(1) || '?'}s - ${clip.end?.toFixed(1) || '?'}s</div>
        `;
        sequence.appendChild(item);
        
        if (idx < results.length - 1) {
            const arrow = document.createElement('div');
            arrow.className = 'clip-arrow';
            arrow.textContent = '→';
            sequence.appendChild(arrow);
        }
    });
}

// Update Clips Progress
function updateClipsProgress(results) {
    const container = document.getElementById('clips-progress');
    if (!container) return;
    
    container.innerHTML = '';
    if (results && results.length > 0) {
        results.forEach((clip, idx) => {
            const duration = clip.duration ? formatTime(clip.duration) : 'N/A';
            const item = document.createElement('div');
            item.className = 'clip-progress-item';
            item.innerHTML = `<strong>Clip #${idx + 1}</strong><br><small>${duration}</small>`;
            container.appendChild(item);
        });
    }
}

// Display Transcript
function displayTranscript(transcript) {
    const panel = document.getElementById('transcriptPanel');
    const body = document.getElementById('transcriptBody');
    
    if (!panel || !body || !transcript) return;
    
    panel.style.display = 'block';
    body.innerHTML = '';
    
    const words = transcript.words || [];
    if (!words.length) return;
    
    let currentLine = '';
    let currentTime = 0;
    
    words.forEach((word, idx) => {
        if (idx === 0) currentTime = word.start;
        currentLine += (currentLine ? ' ' : '') + word.word;
        
        // Break every 10-15 words or at punctuation
        const shouldBreak = currentLine.split(' ').length > 12 || 
                           word.word.match(/[.!?]$/);
        
        if (shouldBreak) {
            const item = document.createElement('div');
            item.className = 'transcript-item';
            item.innerHTML = `
                <div class="transcript-timestamp">${formatTime(currentTime)} → ${formatTime(word.end)}</div>
                <div class="transcript-text">${currentLine}</div>
            `;
            body.appendChild(item);
            currentLine = '';
            currentTime = idx < words.length - 1 ? words[idx + 1].start : word.end;
        }
    });
    
    if (currentLine) {
        const item = document.createElement('div');
        item.className = 'transcript-item';
        item.innerHTML = `
            <div class="transcript-timestamp">${formatTime(currentTime)} → ${formatTime(words[words.length - 1].end)}</div>
            <div class="transcript-text">${currentLine}</div>
        `;
        body.appendChild(item);
    }
}

// Display Rendered Shorts
function displayRenderedShorts(results, processingTime) {
    const grid = document.getElementById('videoGrid');
    const statsDiv = document.getElementById('resultsStats');
    const totalClipsDiv = document.getElementById('totalClips');
    const totalDurationDiv = document.getElementById('totalDuration');
    const processingTimeDiv = document.getElementById('processingTime');
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (!results || results.length === 0) {
        grid.innerHTML = '<p style="color: var(--text-muted); grid-column: 1/-1; text-align: center; padding: 40px;">No clips generated. Try adjusting your parameters.</p>';
        return;
    }
    
    // Calculate stats
    let totalDuration = 0;
    results.forEach(short => {
        totalDuration += short.duration || 0;
    });
    
    // Update stats
    if (statsDiv && totalClipsDiv && totalDurationDiv && processingTimeDiv) {
        totalClipsDiv.textContent = results.length;
        totalDurationDiv.textContent = formatTime(totalDuration);
        processingTimeDiv.textContent = processingTime || 'N/A';
        statsDiv.style.display = 'grid';
    }
    
    // Render video cards
    results.forEach((short, idx) => {
        const card = document.createElement('div');
        card.className = 'video-card';
        const duration = formatTime(short.duration);
        
        card.innerHTML = `
            <video src="/download/${short.filename}" controls style="width: 100%; border-radius: 6px;"></video>
            <p style="font-weight: 600; margin: 8px 0 2px 0; text-align: center;">🎬 Clip #${idx + 1}</p>
            <p style="color: var(--text-muted); font-size: 0.8rem; margin-bottom: 10px; text-align: center;">
                ${duration} (${Math.round(short.start)}s - ${Math.round(short.end)}s)
            </p>
            <a href="/download/${short.filename}" class="btn-download" download>📥 Download MP4</a>
        `;
        grid.appendChild(card);
    });
    
    // Show download all button
    if (downloadAllBtn) {
        downloadAllBtn.style.display = 'inline-block';
    }
}

// Track Pipeline Status
let statusInterval = null;
let lastLogCount = 0;

function trackPipelineStatus(jobId) {
    if (statusInterval) clearInterval(statusInterval);
    
    appendLog(`Tracking job: ${jobId}`, 'success');
    switchPage('pipeline-page');
    lastLogCount = 0;
    
    statusInterval = setInterval(async () => {
        try {
            const response = await fetch(`/status/${jobId}`);
            const data = await response.json();
            
            updatePipelineVisualization(data.stage);
            
            // Update progress bar
            const totalStages = 7;
            const stageMap = { 'queued': 1, 'transcribing': 2, 'scoring': 3, 'selecting': 4, 'rendering': 5, 'effects': 6, 'done': 7 };
            const stageNum = stageMap[data.stage] || 0;
            updateProgressBar((stageNum / totalStages) * 100);
            
            // Update status badge
            const badgeMap = {
                'queued': '⏳ Uploading',
                'transcribing': '🗣️ Transcribing',
                'scoring': '⭐ Scoring',
                'selecting': '✂️ Selecting',
                'rendering': '🎬 Rendering',
                'effects': '✨ Effects',
                'done': '✅ Complete'
            };
            const statusBadge = document.getElementById('statusBadge');
            if (statusBadge) statusBadge.textContent = badgeMap[data.stage] || data.stage;
            
            // Update clips visualization
            if (data.results) {
                updateClipsProgress(data.results);
                updateClipsSequenceVisualization(data.results, data.stage);
            }
            
            if (data.transcript) displayTranscript(data.transcript);
            
            // Log new messages
            if (data.log && data.log.length > lastLogCount) {
                for (let i = lastLogCount; i < data.log.length; i++) {
                    appendLog(data.log[i], 'info');
                }
                lastLogCount = data.log.length;
            }
            
            if (data.stage === 'done') {
                clearInterval(statusInterval);
                updateProgressBar(100);
                appendLog('🎉 Pipeline complete!', 'success');
                
                // Calculate processing time
                const processingTime = data.pipeline_duration || 'N/A';
                appendLog(`⏱️ Total time: ${processingTime}`, 'success');
                
                // Show results on 3rd page
                document.getElementById('resultsBtn').disabled = false;
                displayRenderedShorts(data.results, processingTime);
                setTimeout(() => switchPage('results-page'), 1000);
            } else if (data.stage === 'error' || data.error) {
        } catch (e) {
            appendLog(`Status check error: ${e.message}`, 'error');
        }
    }, 1500);
}

// Form Submission
async function submitUploadForm(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('videoInput');
    const youtubeInput = document.getElementById('youtubeUrl');
    
    // Determine which tab is active
    const fileUploadTab = document.getElementById('file-upload');
    const isFileMode = fileUploadTab && fileUploadTab.classList.contains('active');
    
    const submitBtn = document.getElementById('submitBtn');
    const pipelineBtn = document.getElementById('pipelineBtn');
    
    // Validation
    if (isFileMode) {
        if (!fileInput || !fileInput.files.length) {
            appendLog('❌ Please select a video file', 'error');
            return;
        }
    } else {
        if (!youtubeInput || !youtubeInput.value.trim()) {
            appendLog('❌ Please enter a YouTube URL', 'error');
            return;
        }
        
        if (!validateYoutubeUrl(youtubeInput.value)) {
            appendLog('❌ Invalid YouTube URL format', 'error');
            return;
        }
    }
    
    // Prepare form data
    const formData = new FormData();
    formData.append('num_clips', document.getElementById('num_clips')?.value || '2');
    formData.append('min_dur', document.getElementById('min_dur')?.value || '15');
    formData.append('max_dur', document.getElementById('max_dur')?.value || '45');
    formData.append('whisper_model', document.getElementById('whisper_model')?.value || 'base');
    
    if (isFileMode && fileInput && fileInput.files.length) {
        formData.append('video', fileInput.files[0]);
        appendLog(`📁 Uploading: ${fileInput.files[0].name}`, 'info');
    } else if (youtubeInput) {
        formData.append('youtube_url', youtubeInput.value);
        appendLog(`🎥 Downloading: ${youtubeInput.value}`, 'info');
    }
    
    // Submit
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/upload', { method: 'POST', body: formData });
        const data = await response.json();
        
        if (data.job_id) {
            appendLog(`✅ Job created: ${data.job_id}`, 'success');
            pipelineBtn.disabled = false;
            trackPipelineStatus(data.job_id);
        } else {
            appendLog(`❌ Upload failed: ${data.error || 'Unknown error'}`, 'error');
            submitBtn.disabled = false;
        }
    } catch (e) {
        appendLog(`❌ Upload error: ${e.message}`, 'error');
        submitBtn.disabled = false;
    }
}

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Page loaded - initializing...');
    
    // Set initial page
    switchPage('upload-page');
    
    // ===== TAB BUTTON HANDLERS =====
    const fileTabBtn = document.getElementById('fileTabBtn');
    const youtubeTabBtn = document.getElementById('youtubeTabBtn');
    
    if (fileTabBtn) {
        fileTabBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('📁 File tab clicked');
            switchUploadTab('file-upload');
        });
    }
    
    if (youtubeTabBtn) {
        youtubeTabBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🎥 YouTube tab clicked');
            switchUploadTab('youtube-url');
        });
    }
    
    // ===== NAV BUTTON HANDLERS =====
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const pageName = item.getAttribute('data-page');
            if (pageName) switchPage(pageName);
        });
    });
    
    // ===== FORM SUBMISSION =====
    const form = document.getElementById('uploadForm');
    if (form) form.addEventListener('submit', submitUploadForm);
    
    // ===== FILE INPUT DISPLAY =====
    const fileInput = document.getElementById('videoInput');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const display = document.getElementById('fileInfo');
            if (display && e.target.files.length) {
                const file = e.target.files[0];
                const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
                display.textContent = `✅ ${file.name} (${sizeMB} MB)`;
                display.style.color = '#10b981';
            }
        });
    }
    
    // YouTube URL validation on input
    const youtubeInput = document.getElementById('youtubeUrl');
    if (youtubeInput) {
        youtubeInput.addEventListener('input', (e) => {
            validateYoutubeUrl(e.target.value);
        });
    }
    
    // Transcript toggle
    const transcriptToggle = document.getElementById('transcript-toggle');
    if (transcriptToggle) {
        transcriptToggle.addEventListener('click', (e) => {
            e.preventDefault();
            const content = document.getElementById('transcript-content');
            if (content) {
                content.style.display = content.style.display === 'none' ? 'block' : 'none';
                transcriptToggle.textContent = content.style.display === 'none' ? '📖 Show Transcript' : '📖 Hide Transcript';
            }
        });
    }
    
    // Drag and drop file upload
    const dropZone = document.getElementById('dropZone');
    if (dropZone && fileInput) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#7C3AED';
            dropZone.style.backgroundColor = 'rgba(124, 58, 237, 0.1)';
        });
        
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#444';
            dropZone.style.backgroundColor = 'transparent';
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#444';
            dropZone.style.backgroundColor = 'transparent';
            
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                const event = new Event('change', { bubbles: true });
                fileInput.dispatchEvent(event);
            }
        });
        
        dropZone.addEventListener('click', () => fileInput.click());
    }
    
    appendLog('Application initialized', 'success');
});
