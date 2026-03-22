/**
 * Quick Test Script for Export System
 * 
 * Run this in browser console after app loads:
 * 
 * 1. Open http://localhost:5173
 * 2. Open DevTools Console (F12)
 * 3. Copy and paste this entire file content
 * 4. Press Enter
 */

(async function testExportSystem() {
  console.log('🧪 Testing Export System...\n');
  
  try {
    // 1. Check if modules are available
    console.log('1️⃣ Checking modules...');
    const { visitDB } = await import('./src/lib/db.ts');
    const { ExportService, getAIProcessingQueue } = await import('./src/lib/export/index.ts');
    console.log('   ✅ Modules loaded\n');
    
    // 2. Check records
    console.log('2️⃣ Checking records...');
    const records = await visitDB.list(10);
    console.log(`   ✅ Found ${records.length} records`);
    if (records.length === 0) {
      console.log('   ⚠️  No records found. Create a visit first!\n');
      return;
    }
    console.log(`   📊 Records with photos: ${records.filter(r => r.photo_present).length}`);
    console.log(`   📊 Records with audio: ${records.filter(r => r.audio_data).length}\n`);
    
    // 3. Check AI queue
    console.log('3️⃣ Checking AI processing queue...');
    const queue = getAIProcessingQueue();
    const status = queue.getStatus();
    console.log(`   ✅ Queue status:`, status);
    console.log(`   📋 Queued tasks: ${status.queued}\n`);
    
    // 4. Test JSON export
    console.log('4️⃣ Testing JSON export...');
    const apiKey = localStorage.getItem('user_api_key') || '';
    if (!apiKey) {
      console.log('   ⚠️  No API key found. Export will work but AI index won\'t be generated.\n');
    }
    
    const service = new ExportService(apiKey);
    const result = await service.export(records, {
      format: 'json',
      includeMedia: false, // Faster for testing
      mediaFormat: 'referenced',
      generateIndex: false, // Skip AI processing for speed
      apiKey: apiKey || undefined,
    });
    
    console.log(`   ✅ Export successful!`);
    console.log(`   📄 File: ${result.filename}`);
    console.log(`   📦 Size: ${(result.sizeBytes / 1024).toFixed(2)} KB`);
    console.log(`   📊 Records: ${result.totalRecords}`);
    console.log(`   📊 By task:`, result.recordsByTask);
    console.log(`   📷 Photos: ${result.recordsWithPhotos}`);
    console.log(`   🎤 Audio: ${result.recordsWithAudio}\n`);
    
    // 5. Offer to download
    console.log('5️⃣ Download test file?');
    console.log('   Run: downloadTestExport()');
    
    // Store result globally for download
    window.testExportResult = result;
    window.downloadTestExport = function() {
      const blob = new Blob([result.data], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      console.log('✅ File downloaded!');
    };
    
    console.log('\n✅ All tests passed!');
    console.log('💡 Tip: Run downloadTestExport() to download the JSON file');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
})();


