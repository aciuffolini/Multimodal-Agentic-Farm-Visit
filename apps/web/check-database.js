/**
 * Database Inspection Helper
 * 
 * Run this in browser console (F12) to check database contents
 * 
 * Usage:
 *   1. Open http://localhost:5173
 *   2. Open DevTools Console (F12)
 *   3. Copy and paste this entire file
 *   4. Press Enter
 *   5. Use the helper functions below
 */

(async function initDatabaseHelpers() {
  console.log('🔍 Loading database helpers...\n');
  
  // Import modules
  const { visitDB } = await import('./src/lib/db.ts');
  const { getAIProcessingQueue } = await import('./src/lib/export/index.ts');
  
  // Helper functions
  window.checkDB = {
    /**
     * List all records
     */
    async list(limit = 20) {
      const records = await visitDB.list(limit);
      console.log(`\n📊 Found ${records.length} records:\n`);
      records.forEach((r, i) => {
        console.log(`${i + 1}. ${new Date(r.ts).toLocaleString()}`);
        console.log(`   ID: ${r.id}`);
        console.log(`   Field: ${r.field_id || '-'} | Crop: ${r.crop || '-'}`);
        console.log(`   Issue: ${r.issue || '-'} | Severity: ${r.severity || '-'}`);
        console.log(`   Photo: ${r.photo_present ? '✅' : '❌'} | Audio: ${r.audio_data ? '✅' : '❌'}`);
        console.log(`   AI Indexed: ${r.ai_indexed ? '✅' : '❌'}`);
        if (r.photo_caption) console.log(`   Photo Caption: "${r.photo_caption.substring(0, 50)}..."`);
        if (r.audio_transcript) console.log(`   Audio Transcript: "${r.audio_transcript.substring(0, 50)}..."`);
        console.log(`   Synced: ${r.synced ? '✅' : '⏳'}`);
        console.log('');
      });
      return records;
    },
    
    /**
     * Get a specific record by ID
     */
    async get(id) {
      const record = await visitDB.get(id);
      if (!record) {
        console.log(`❌ Record ${id} not found`);
        return null;
      }
      console.log('\n📄 Record Details:\n');
      console.log(JSON.stringify(record, null, 2));
      return record;
    },
    
    /**
     * Check AI processing queue
     */
    async checkQueue() {
      const queue = getAIProcessingQueue();
      const tasks = queue.list();
      const status = queue.getStatus();
      
      console.log(`\n🔄 AI Processing Queue:\n`);
      console.log(`   Status: ${status.queued} queued, processing: ${status.processing}`);
      console.log(`   Tasks: ${tasks.length}\n`);
      
      if (tasks.length > 0) {
        tasks.forEach((task, i) => {
          console.log(`   ${i + 1}. Task ${task.id}`);
          console.log(`      Record: ${task.recordId}`);
          console.log(`      Type: ${task.taskType}`);
          console.log(`      Retries: ${task.retries}/3`);
          console.log(`      Created: ${new Date(task.createdAt).toLocaleString()}`);
          console.log('');
        });
      }
      
      return { tasks, status };
    },
    
    /**
     * Check localStorage queues
     */
    checkLocalStorage() {
      console.log('\n💾 LocalStorage Queues:\n');
      
      // AI Queue
      const aiQueue = localStorage.getItem('farm_visit_ai_queue_v1');
      if (aiQueue) {
        const tasks = JSON.parse(aiQueue);
        console.log(`   AI Queue: ${tasks.length} tasks`);
        tasks.forEach((t, i) => {
          console.log(`      ${i + 1}. ${t.recordId} (${t.taskType}) - ${t.retries} retries`);
        });
      } else {
        console.log('   AI Queue: Empty');
      }
      
      // Outbox
      const outbox = localStorage.getItem('farm_visit_outbox_v1');
      if (outbox) {
        const items = JSON.parse(outbox);
        console.log(`   Outbox: ${items.length} items`);
        items.forEach((item, i) => {
          console.log(`      ${i + 1}. ${item.endpoint} (${item.method}) - ${item.retries} retries`);
        });
      } else {
        console.log('   Outbox: Empty');
      }
      
      console.log('');
    },
    
    /**
     * Get statistics
     */
    async stats() {
      const records = await visitDB.list(1000);
      const stats = {
        total: records.length,
        withPhotos: records.filter(r => r.photo_present).length,
        withAudio: records.filter(r => r.audio_data).length,
        aiIndexed: records.filter(r => r.ai_indexed).length,
        synced: records.filter(r => r.synced).length,
        withPhotoCaption: records.filter(r => r.photo_caption).length,
        withAudioTranscript: records.filter(r => r.audio_transcript).length,
      };
      
      console.log('\n📈 Database Statistics:\n');
      console.log(`   Total Records: ${stats.total}`);
      console.log(`   With Photos: ${stats.withPhotos}`);
      console.log(`   With Audio: ${stats.withAudio}`);
      console.log(`   AI Indexed: ${stats.aiIndexed}`);
      console.log(`   Synced: ${stats.synced}`);
      console.log(`   With Photo Captions: ${stats.withPhotoCaption}`);
      console.log(`   With Audio Transcripts: ${stats.withAudioTranscript}`);
      console.log('');
      
      return stats;
    },
    
    /**
     * Check a specific record's AI processing status
     */
    async checkRecordAI(recordId) {
      const record = await visitDB.get(recordId);
      if (!record) {
        console.log(`❌ Record ${recordId} not found`);
        return;
      }
      
      console.log(`\n🤖 AI Processing Status for ${recordId}:\n`);
      console.log(`   Photo Present: ${record.photo_present ? '✅' : '❌'}`);
      console.log(`   Audio Present: ${record.audio_data ? '✅' : '❌'}`);
      console.log(`   AI Indexed: ${record.ai_indexed ? '✅' : '❌'}`);
      console.log(`   Photo Caption: ${record.photo_caption ? '✅' : '❌'}`);
      if (record.photo_caption) {
        console.log(`      "${record.photo_caption}"`);
      }
      console.log(`   Audio Transcript: ${record.audio_transcript ? '✅' : '❌'}`);
      if (record.audio_transcript) {
        console.log(`      "${record.audio_transcript.substring(0, 100)}..."`);
      }
      
      // Check if in queue
      const queue = getAIProcessingQueue();
      const tasks = queue.list();
      const queuedTask = tasks.find(t => t.recordId === recordId);
      if (queuedTask) {
        console.log(`   ⏳ In Queue: Yes (${queuedTask.taskType}, ${queuedTask.retries} retries)`);
      } else {
        console.log(`   ⏳ In Queue: No`);
      }
      
      console.log('');
    },
    
    /**
     * Clear all data (use with caution!)
     */
    async clear() {
      if (confirm('⚠️ Are you sure you want to clear ALL records?')) {
        await visitDB.clear();
        console.log('✅ Database cleared');
      }
    },
  };
  
  console.log('✅ Database helpers loaded!\n');
  console.log('Available commands:');
  console.log('  checkDB.list()           - List all records');
  console.log('  checkDB.get(id)         - Get specific record');
  console.log('  checkDB.checkQueue()     - Check AI processing queue');
  console.log('  checkDB.checkLocalStorage() - Check localStorage queues');
  console.log('  checkDB.stats()          - Get statistics');
  console.log('  checkDB.checkRecordAI(id) - Check AI status for a record');
  console.log('  checkDB.clear()          - Clear all records (careful!)\n');
  console.log('Example: checkDB.list(10)');
  
})();

