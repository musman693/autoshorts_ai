// Page Navigation
function switchPage(pageName) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(`${pageName}-page`)?.classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`[data-page="${pageName}"]`)?.classList.add('active');
}

// Upload Tab Switching
function switchUploadTab(tabName) {
    document.querySelectorAll('.upload-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
    
    document.getElementById('file-upload-form').style.display = tabName === 'file' ? 'flex' : 'none';
    document.getElementById('youtube-url-form').style.display = tabName === 'youtube' ? 'flex' : 'none';
}

// YouTube URL Validation
function validateYoutubeUrl(url) {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube|youtu|youtube-nocookie)\.(com|be)\//;
    return pattern.test(url);
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
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Append Log Message
function appendLog(text, type = 'info') {
    const logs = document.getElementById('terminal-logs');
    if (!logs) return;
    
    const line = document.createElement('div');
    line.className = `log-line log-${type}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
    logs.appendChild(line);
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
    const fill = document.getElementById('progress-fill');
    const text = document.getElementById('progress-text');
    if (fill) fill.style.width = percentage + '%';
    if (text) text.textContent = Math.round(percentage) + '%';
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
    const panel = document.getElementById('transcript-panel');
    if (!panel) return;
    
    try {
        const data = typeof transcript === 'string' ? JSON.parse(transcript) : transcript;
        const content = document.getElementById('transcript-content');
        if (!content) return;
        
        content.innerHTML = '';
        if (data.sentences) {
            data.sentences.forEach(sent => {
                const p = document.createElement('p');
                p.innerHTML = `<span class="timestamp">${formatTime(sent.start_time)}</span> ${sent.text}`;
                content.appendChild(p);
            });
        } else {
            content.textContent = 'No transcript available';
        }
    } catch (e) {
        console.error('Error parsing transcript:', e);
    }
}

// Display Rendered Shorts
function displayRenderedShorts(results) {
    const panel = document.getElementById('resultsPanel');
    if (!panel) return;
    
    const grid = document.getElementById('shorts-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    if (results && results.length > 0) {
        results.forEach((clip, idx) => {
            const card = document.createElement('div');
            card.className = 'video-card';
            card.innerHTML = `
                <div class="video-placeholder">
                    <span>Clip #${idx + 1}</span>
                    <small>${clip.duration ? formatTime(clip.duration) : 'N/A'}</small>
                </div>
                <button class="download-btn" data-file="${clip.output_path}">
                    📥 Download
                </button>
            `;
            grid.appendChild(card);
        });
        
        // Download button handlers
        document.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const file = btn.getAttribute('data-file');
                window.location.href = `/download/${file}`;
            });
        });
    }
    panel.style.display = 'block';
}

// Track Pipeline Status
let statusInterval = null;
function trackPipelineStatus(jobId) {
    if (statusInterval) clearInterval(statusInterval);
    
    appendLog(`Tracking job: ${jobId}`);
    switchPage('pipeline');
    
    statusInterval = setInterval(async () => {
        try {
            const response = await fetch(`/status/${jobId}`);
            const data = await response.json();
            
            updatePipelineVisualization(data.stage);
            
            const totalStages = 7;
            const stageMap = { 'queued': 1, 'transcribing': 2, 'scoring': 3, 'selecting': 4, 'rendering': 5, 'effects': 6, 'done': 7 };
            const stageNum = stageMap[data.stage] || 0;
            updateProgressBar((stageNum / totalStages) * 100);
            
            if (data.results) updateClipsProgress(data.results);
            if (data.transcript) displayTranscript(data.transcript);
            
            if (data.log) {
                data.log.forEach(msg => appendLog(msg));
            }
            
            appendLog(`Stage: ${formatStageName(data.stage)}`);
            
            if (data.stage === 'done' || data.error) {
                clearInterval(statusInterval);
                updateProgressBar(100);
                
                if (data.error) {
                    appendLog(`Error: ${data.error}`, 'error');
                } else {
                    appendLog('Pipeline complete!', 'success');
                    if (data.results) displayRenderedShorts(data.results);
                }
            }
        } catch (e) {
            appendLog(`Status check error: ${e.message}`, 'error');
        }
    }, 1500);
}

// Form Submission
async function submitUploadForm(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('file-input');
    const youtubeInput = document.getElementById('youtube-url');
    const fileTab = document.querySelector('[data-tab="file"]');
    
    const isFileMode = fileTab && fileTab.classList.contains('active');
    
    if (isFileMode && !fileInput.files.length) {
        alert('Please select a file');
        return;
    }
    
    if (!isFileMode && !youtubeInput.value.trim()) {
        alert('Please enter a YouTube URL');
        return;
    }
    
    if (!isFileMode && !validateYoutubeUrl(youtubeInput.value)) {
        alert('Invalid YouTube URL');
        return;
    }
    
    const formData = new FormData();
    formData.append('num_clips', document.getElementById('num-clips')?.value || '2');
    formData.append('min_dur', document.getElementById('min-duration')?.value || '15');
    formData.append('max_dur', document.getElementById('max-duration')?.value || '45');
    formData.append('whisper_model', document.getElementById('whisper-model')?.value || 'base');
    
    if (isFileMode) {
        formData.append('file', fileInput.files[0]);
    } else {
        formData.append('youtube_url', youtubeInput.value);
    }
    
    try {
        const response = await fetch('/upload', { method: 'POST', body: formData });
        const data = await response.json();
        
        if (data.job_id) {
            trackPipelineStatus(data.job_id);
        } else {
            alert('Upload failed: ' + (data.error || 'Unknown error'));
        }
    } catch (e) {
        alert('Upload error: ' + e.message);
    }
}

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    switchPage('upload');
    
    // Nav item click handlers
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const pageName = item.getAttribute('data-page');
            if (pageName) switchPage(pageName);
        });
    });
    
    // Upload tab handlers
    document.querySelectorAll('.upload-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            if (tabName) switchUploadTab(tabName);
        });
    });
    
    // Form submission
    const form = document.getElementById('upload-form');
    if (form) form.addEventListener('submit', submitUploadForm);
    
    // File input file name display
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const display = document.getElementById('file-info');
            if (display && e.target.files.length) {
                const file = e.target.files[0];
                const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
                display.textContent = `${file.name} (${sizeMB} MB)`;
            }
        });
    }
    
    // YouTube URL display
    const youtubeInput = document.getElementById('youtube-url');
    if (youtubeInput) {
        youtubeInput.addEventListener('input', (e) => {
            const display = document.getElementById('youtube-info');
            if (display) {
                display.textContent = e.target.value ? `URL: ${e.target.value}` : '';
            }
        });
    }
    
    // Transcript toggle
    const transcriptToggle = document.getElementById('transcript-toggle');
    if (transcriptToggle) {
        transcriptToggle.addEventListener('click', () => {
            const content = document.getElementById('transcript-content');
            if (content) {
                content.style.display = content.style.display === 'none' ? 'block' : 'none';
            }
        });
    }
    
    appendLog('Application ready', 'success');
});
