// FE-1/2: Frontend logic
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById('videoInput');
    if (!fileInput.files.length) return;

    const submitBtn = document.getElementById('submitBtn');
    const terminal = document.getElementById('terminalLogs');
    const progressFill = document.getElementById('progressFill');
    const statusBadge = document.getElementById('statusBadge');
    const resultsPanel = document.getElementById('resultsPanel');

    // UI Reset for fresh job execution
    submitBtn.disabled = true;
    resultsPanel.style.display = 'none';
    progressFill.style.width = '5%';
    statusBadge.innerText = 'Uploading...';
    terminal.innerHTML = '<span class="log-info">[System] Sending video binary to server...</span>';

    const formData = new FormData(e.target);

    try {
        // Hit Muzahir's upload endpoint
        const res = await fetch('/upload', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Upload initialization failed.');
        
        const data = await res.json();
        const jobId = data.job_id;

        appendLog(`[System] Job created with ID: ${jobId}`, 'info');
        
        // Start live tracking loop
        trackPipelineStatus(jobId);

    } catch (err) {
        appendLog(`[Error] ${err.message}`, 'error');
        statusBadge.innerText = 'Error';
        submitBtn.disabled = false;
    }
});

// Real-time status tracker loop
function trackPipelineStatus(jobId) {
    const statusBadge = document.getElementById('statusBadge');
    const progressFill = document.getElementById('progressFill');
    const submitBtn = document.getElementById('submitBtn');
    const terminal = document.getElementById('terminalLogs');

    const interval = setInterval(async () => {
        try {
            const res = await fetch(`/status/${jobId}`);
            if (!res.ok) return;

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

            statusBadge.innerText = job.stage;
            progressFill.style.width = `${stageProgress[job.stage] || 5}%`;

            // Clear and dump latest console logs stream
            terminal.innerHTML = '';
            job.log.forEach(msg => {
                if (msg.includes('ERROR')) appendLog(msg, 'error');
                else if (msg.includes('complete')) appendLog(msg, 'success');
                else appendLog(msg, 'info');
            });

            // Termination conditions
            if (job.stage === "done") {
                clearInterval(interval);
                submitBtn.disabled = false;
                statusBadge.innerText = "Complete ✨";
                displayRenderedShorts(job.results);
            } else if (job.stage === "error") {
                clearInterval(interval);
                submitBtn.disabled = false;
                statusBadge.innerText = "Failed ❌";
                appendLog(`[Pipeline Crash] ${job.error}`, 'error');
            }

        } catch (err) {
            console.error("Polling error:", err);
        }
    }, 1500); // Poll server every 1.5 seconds
}

function appendLog(text, type) {
    const terminal = document.getElementById('terminalLogs');
    const span = document.createElement('span');
    span.className = `log-${type}`;
    span.innerText = text;
    terminal.appendChild(span);
    terminal.scrollTop = terminal.scrollHeight; // Auto-scroll to bottom
}

function displayRenderedShorts(results) {
    const panel = document.getElementById('resultsPanel');
    const grid = document.getElementById('videoGrid');
    grid.innerHTML = '';

    if (!results || results.length === 0) {
        grid.innerHTML = '<p style="color: var(--text-muted);">Pipeline executed but no optimal candidate clips fell within constraints.</p>';
        panel.style.display = 'block';
        return;
    }

    results.forEach(short => {
        const card = document.createElement('div');
        card.className = 'video-card';
        card.innerHTML = `
            <video src="/download/${short.filename}" controls></video>
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

// Input interactive visual response
document.getElementById('videoInput').addEventListener('change', (e) => {
    const filename = e.target.files[0]?.name;
    if (filename) {
        document.querySelector('.drop-zone__prompt').innerText = `Target Video: ${filename}`;
    }
});