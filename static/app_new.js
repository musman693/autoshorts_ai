// ==================== PAGE NAVIGATION ====================
function switchPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Deactivate all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected page
    document.getElementById(pageName).classList.add('active');
    
    // Activate nav item
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');
}

function goBackToUpload() {
    document.getElementById('resultsPanel').style.display = 'none';
    switchPage('upload-page');
    document.getElementById('uploadForm').reset();
    document.getElementById('fileInfo').innerHTML = '';
    document.getElementById('youtubeInfo').innerHTML = '';
}

// ==================== UPLOAD TAB SWITCHING ====================
function switchUploadTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.upload-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Deactivate all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Clear file inputs
    if (tabName === 'youtube-url') {
        document.getElementById('videoInput').value = '';
        document.getElementById('fileInfo').innerHTML = '';
    } else {
        document.getElementById('youtubeUrl').value = '';
        document.getElementById('youtubeInfo').innerHTML = '';
    }
}

// ==================== FILE UPLOAD ====================
document.getElementById('videoInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const filename = file.name;
        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        document.querySelector('.drop-zone__prompt').innerText = `Target Video: ${filename}`;
        
        const fileInfoDiv = document.getElementById('fileInfo');
        fileInfoDiv.innerHTML = `✓ ${filename} (${sizeInMB} MB)`;
    }
});

// Drag & drop functionality
const dropZone = document.getElementById('dropZone');
if (dropZone) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.style.background = 'rgba(124, 58, 237, 0.2)';
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.style.background = '';
        });
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        document.getElementById('videoInput').files = files;
        document.getElementById('videoInput').dispatchEvent(new Event('change', { bubbles: true }));
    });
}

// ==================== YOUTUBE URL VALIDATION ====================
function validateYoutubeUrl() {
    const url = document.getElementById('youtubeUrl').value.trim();
    const youtubeInfo = document.getElementById('youtubeInfo');
    
    if (!url) {
        youtubeInfo.innerHTML = '<span style="color: #f87171;">❌ Please enter a URL</span>';
        return;
    }
    
    // Basic YouTube URL validation
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube|youtu|youtube-nocookie)\.(com|be)\//;
    
    if (youtubeRegex.test(url)) {
        youtubeInfo.innerHTML = '<span style="color: #10b981;">✓ YouTube URL is valid</span>';
    } else {
        youtubeInfo.innerHTML = '<span style="color: #f87171;">❌ Invalid YouTube URL. Please enter a valid YouTube link.</span>';
    }
}

// ==================== FORM SUBMISSION ====================
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const fileInput = document.getElementById('videoInput');
    const youtubeUrl = document.getElementById('youtubeUrl').value.trim();
    
    // Validate input
    if (!fileInput.files.length && !youtubeUrl) {
        alert('Please either upload a video or provide a YouTube URL');
        return;
    }
    
    if (youtubeUrl && !youtubeUrl.includes('youtube')) {
        alert('Invalid YouTube URL');
        return;
    }

    // Prepare form data
    const formData = new FormData();
    const whisperModel = document.getElementById('whisper_model').value;
    const numClips = document.getElementById('num_clips').value;
    const minDur = document.getElementById('min_dur').value;
    const maxDur = document.getElementById('max_dur').value;
    
    formData.append('whisper_model', whisperModel);
    formData.append('num_clips', numClips);
    formData.append('min_dur', minDur);
    formData.append('max_dur', maxDur);
    
    if (youtubeUrl) {
        formData.append('youtube_url', youtubeUrl);
    } else if (fileInput.files.length) {
        formData.append('video', fileInput.files[0]);
    }

    submitBtn.disabled = true;
    
    try {
        // Upload and start pipeline
        const res = await fetch('/upload', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Upload initialization failed.');
        
        const data = await res.json();
        const jobId = data.job_id;

        // Switch to pipeline page
        switchPage('pipeline-page');
        document.getElementById('pipelineBtn').disabled = false;
        
        // Clear logs and reset UI
        document.getElementById('terminalLogs').innerHTML = '';
        appendLog(`[System] Job created with ID: ${jobId}`, 'info');
        appendLog(`[System] Source: ${youtubeUrl ? '🎥 YouTube' : '📁 Local File'}`, 'info');
        appendLog(`[System] Using Whisper model: ${whisperModel}`, 'info');
        appendLog(`[System] Configuration: ${numClips} clips, ${minDur}-${maxDur}s duration`, 'info');
        
        // Start live tracking
        trackPipelineStatus(jobId);

    } catch (err) {
        appendLog(`[Error] ${err.message}`, 'error');
        submitBtn.disabled = false;
    }
});

// ==================== PIPELINE TRACKING ====================
function trackPipelineStatus(jobId) {
    const statusBadge = document.getElementById('statusBadge');
    const submitBtn = document.getElementById('submitBtn');
    const terminal = document.getElementById('terminalLogs');
    const resultsPanel = document.getElementById('resultsPanel');
    
    let clipsData = {};

    const interval = setInterval(async () => {
        try {
            const res = await fetch(`/status/${jobId}`);
            if (!res.ok) return;

            const job = await res.json();
            
            // Update pipeline visualization
            updatePipelineVisualization(job.stage, job.results);
            
            // Update overall progress
            const stageProgress = {
                "queued": 5,
                "transcribing": 25,
                "scoring": 40,
                "selecting": 55,
                "rendering": 80,
                "effects": 95,
                "done": 100,
                "error": 100
            };

            const progress = stageProgress[job.stage] || 5;
            updateProgressBar(progress);
            statusBadge.innerText = formatStageName(job.stage);

            // Update logs
            terminal.innerHTML = '';
            job.log.forEach(msg => {
                if (msg.includes('ERROR')) appendLog(msg, 'error');
                else if (msg.includes('complete') || msg.includes('complete')) appendLog(msg, 'success');
                else appendLog(msg, 'info');
            });

            // Display transcript
            if (job.transcript && job.stage !== 'queued') {
                displayTranscript(job.transcript);
            }

            // Update clips progress
            if (job.results && job.results.length > 0) {
                updateClipsProgress(job.results);
            }

            // Termination conditions
            if (job.stage === "done") {
                clearInterval(interval);
                statusBadge.innerText = "Complete ✨";
                displayRenderedShorts(job.results);
                submitBtn.disabled = false;
            } else if (job.stage === "error") {
                clearInterval(interval);
                statusBadge.innerText = "Failed ❌";
                appendLog(`[Pipeline Error] ${job.error}`, 'error');
                submitBtn.disabled = false;
            }

        } catch (err) {
            console.error("Polling error:", err);
        }
    }, 1500);
}

function updatePipelineVisualization(currentStage, results) {
    const stages = ['queued', 'transcribing', 'scoring', 'selecting', 'rendering', 'effects', 'done'];
    
    stages.forEach(stage => {
        const element = document.querySelector(`[data-stage="${stage}"]`);
        if (!element) return;
        
        element.classList.remove('active', 'completed');
        
        if (stage === currentStage) {
            element.classList.add('active');
        } else if (stages.indexOf(stage) < stages.indexOf(currentStage)) {
            element.classList.add('completed');
        }
    });
}

function updateProgressBar(percentage) {
    const fill = document.getElementById('progressFill');
    const text = document.getElementById('progressText');
    fill.style.width = percentage + '%';
    text.innerText = percentage + '%';
}

function updateClipsProgress(results) {
    const clipsContainer = document.getElementById('clipsProgress');
    
    if (results.length === 0) return;
    
    clipsContainer.innerHTML = '<h3 style="margin-bottom: 10px; color: var(--text-main);">📹 Clips Processing</h3>';
    
    results.forEach(clip => {
        const clipItem = document.createElement('div');
        clipItem.className = 'clip-progress-item';
        
        const statusIcon = '✓';
        const statusColor = 'color: var(--success)';
        
        clipItem.innerHTML = `
            <span class="clip-status-icon" style="${statusColor}">${statusIcon}</span>
            <div class="clip-info">
                <div class="clip-name">Clip #${clip.clip_id}</div>
                <div class="clip-meta">Duration: ${clip.duration}s (${Math.round(clip.start)}s - ${Math.round(clip.end)}s)</div>
            </div>
        `;
        clipsContainer.appendChild(clipItem);
    });
}

function formatStageName(stage) {
    const names = {
        'queued': '⏳ Queued',
        'transcribing': '🗣️ Transcribing',
        'scoring': '⭐ Scoring',
        'selecting': '✂️ Selecting',
        'rendering': '🎬 Rendering',
        'effects': '✨ Adding Effects',
        'done': '🎉 Done',
        'error': '❌ Error'
    };
    return names[stage] || stage;
}

// ==================== TRANSCRIPT DISPLAY ====================
function displayTranscript(transcript) {
    const transcriptPanel = document.getElementById('transcriptPanel');
    const transcriptBody = document.getElementById('transcriptBody');
    
    if (!transcript || !transcript.words || transcript.words.length === 0) {
        return;
    }
    
    transcriptPanel.style.display = 'block';
    transcriptBody.innerHTML = '';
    
    let currentLine = '';
    let currentTime = 0;
    const lines = [];
    
    transcript.words.forEach((word, idx) => {
        if (idx === 0) currentTime = word.start;
        
        currentLine += word.word + ' ';
        
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

// ==================== RESULTS DISPLAY ====================
function displayRenderedShorts(results) {
    const panel = document.getElementById('resultsPanel');
    const grid = document.getElementById('videoGrid');
    grid.innerHTML = '';

    if (!results || results.length === 0) {
        grid.innerHTML = '<p style="color: var(--text-muted);">No shorts generated. Try adjusting your settings.</p>';
        panel.style.display = 'block';
        return;
    }

    results.forEach(short => {
        const card = document.createElement('div');
        card.className = 'video-card';
        card.innerHTML = `
            <video src="/download/${short.filename}" controls style="width: 100%; aspect-ratio: 9/16; background: #000; border-radius: 6px; margin-bottom: 10px;"></video>
            <p style="font-weight: 600; margin: 5px 0 2px 0;">Clip #${short.clip_id}</p>
            <p style="color: var(--text-muted); font-size: 0.8rem; margin-bottom: 10px;">
                Duration: ${short.duration}s (${Math.round(short.start)}s - ${Math.round(short.end)}s)
            </p>
            <a href="/download/${short.filename}" class="btn-download">Download MP4</a>
        `;
        grid.appendChild(card);
    });

    panel.style.display = 'block';
}

// ==================== UTILITY FUNCTIONS ====================
function appendLog(text, type) {
    const terminal = document.getElementById('terminalLogs');
    const span = document.createElement('span');
    span.className = `log-${type}`;
    span.innerText = text;
    terminal.appendChild(span);
    terminal.scrollTop = terminal.scrollHeight;
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Set default page to upload
    switchPage('upload-page');
});
