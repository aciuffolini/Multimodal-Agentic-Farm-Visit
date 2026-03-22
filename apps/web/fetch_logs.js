const https = require('https');

const options = {
  headers: { 'User-Agent': 'Node.js' }
};

https.get('https://api.github.com/repos/aciuffolini/Multimodal-Agentic-Farm-Visit/actions/runs?status=failure&per_page=1', options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const runs = JSON.parse(data).workflow_runs;
    if (!runs || runs.length === 0) return console.log('No failed runs found.');
    
    const runId = runs[0].id;
    console.log(`Failed Run ID: ${runId}`);
    
    // Fetch jobs
    https.get(runs[0].jobs_url, options, (res2) => {
      let data2 = '';
      res2.on('data', chunk => data2 += chunk);
      res2.on('end', () => {
        const jobs = JSON.parse(data2).jobs;
        const failedJob = jobs.find(j => j.conclusion === 'failure');
        if (!failedJob) return console.log('No failed jobs found in the run.');
        
        console.log(`Fetching logs for job ${failedJob.name} (${failedJob.id})...`);
        
        // Logs aren't publicly exposed via the API easily without a token for the raw text,
        // but wait, public repo logs ARE available!
        // The URL is https://api.github.com/repos/{owner}/{repo}/actions/jobs/{job_id}/logs
        https.get(`https://api.github.com/repos/aciuffolini/Multimodal-Agentic-Farm-Visit/actions/jobs/${failedJob.id}/logs`, options, (res3) => {
          if (res3.statusCode === 302) {
            const redirectUrl = res3.headers.location;
            https.get(redirectUrl, (res4) => {
              let logs = '';
              res4.on('data', chunk => logs += chunk);
              res4.on('end', () => {
                const lines = logs.split('\n');
                // Print the last 150 lines which usually contains the error
                console.log(lines.slice(-150).join('\n'));
              });
            });
          } else {
             let logs = '';
             res3.on('data', chunk => logs += chunk);
             res3.on('end', () => {
                const lines = logs.split('\n');
                console.log(lines.slice(-150).join('\n'));
             });
          }
        });
      });
    });
  });
}).on('error', err => {
  console.log('Error: ', err.message);
});
