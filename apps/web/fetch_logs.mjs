import https from 'node:https';

const options = {
  headers: { 'User-Agent': 'Node.js' }
};

https.get('https://api.github.com/repos/aciuffolini/Multimodal-Agentic-Farm-Visit/actions/runs?status=failure&per_page=1', options, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    const json = JSON.parse(data);
    const runs = json.workflow_runs;
    if (!runs || runs.length === 0) return console.log('No failed runs found.');
    
    console.log(`Failed Run ID: ${runs[0].id}`);
    
    https.get(runs[0].jobs_url, options, (res2) => {
      let data2 = '';
      res2.on('data', chunk => { data2 += chunk; });
      res2.on('end', () => {
        const jobs = JSON.parse(data2).jobs;
        const failedJob = jobs.find(j => j.conclusion === 'failure');
        if (!failedJob) return console.log('No failed jobs found in the run.');
        
        console.log(`Fetching logs for job ${failedJob.name} (${failedJob.id})...`);
        
        const logsUrl = `https://api.github.com/repos/aciuffolini/Multimodal-Agentic-Farm-Visit/actions/jobs/${failedJob.id}/logs`;
        https.get(logsUrl, options, (res3) => {
          if (res3.statusCode === 302) {
            https.get(res3.headers.location, (res4) => {
              let logs = '';
              res4.on('data', chunk => { logs += chunk; });
              res4.on('end', () => {
                const lines = logs.split('\n');
                console.log(lines.slice(-150).join('\n'));
              });
            });
          } else {
             let logs = '';
             res3.on('data', chunk => { logs += chunk; });
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
