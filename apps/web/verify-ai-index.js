/**
 * Quick Verification Script
 * Run this in console to verify AI index was saved
 */

(async function verifyAIIndex() {
  console.log('🔍 Verifying AI Index...\n');
  
  const { visitDB } = await import('./src/lib/db.ts');
  const record = await visitDB.get('b1e90914-6960-4072-a6ea-501f9787f973');
  
  if (!record) {
    console.log('❌ Record not found');
    return;
  }
  
  console.log('📄 Record Details:\n');
  console.log(`   ID: ${record.id}`);
  console.log(`   Field: ${record.field_id || '-'}`);
  console.log(`   Date: ${new Date(record.ts).toLocaleString()}`);
  console.log(`   Photo Present: ${record.photo_present ? '✅' : '❌'}`);
  console.log(`   Audio Present: ${record.audio_data ? '✅' : '❌'}`);
  console.log(`   AI Indexed: ${record.ai_indexed ? '✅' : '❌'}`);
  console.log('');
  
  if (record.photo_caption) {
    console.log('📷 Photo Caption:');
    console.log(`   "${record.photo_caption}"`);
    console.log('');
  } else {
    console.log('📷 Photo Caption: ❌ Not generated');
    console.log('');
  }
  
  if (record.audio_transcript) {
    console.log('🎤 Audio Transcript:');
    console.log(`   "${record.audio_transcript.substring(0, 200)}${record.audio_transcript.length > 200 ? '...' : ''}"`);
    console.log('');
  } else {
    console.log('🎤 Audio Transcript: ❌ Not generated');
    console.log('');
  }
  
  if (record.audio_summary) {
    console.log('📝 Audio Summary:');
    console.log(`   "${record.audio_summary}"`);
    console.log('');
  }
  
  // Check if in queue (should be empty now)
  const { getAIProcessingQueue } = await import('./src/lib/export/index.ts');
  const queue = getAIProcessingQueue();
  const tasks = queue.list();
  const queuedTask = tasks.find(t => t.recordId === record.id);
  
  if (queuedTask) {
    console.log('⏳ Still in queue:', queuedTask);
  } else {
    console.log('✅ Not in queue (processing complete)');
  }
  
  console.log('\n✅ Verification complete!');
})();


