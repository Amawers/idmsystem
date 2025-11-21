/**
 * @file testDashboardOffline.js
 * @description Quick test script to verify dashboard offline functionality
 * 
 * Run this in browser console to test offline caching:
 * 
 * 1. Open Case Management > Dashboard while online
 * 2. Open browser DevTools console
 * 3. Paste and run the test functions below
 * 4. Test offline by switching DevTools → Network → Offline
 */

// Test 1: Check if dashboard cache exists
async function testCacheExists() {
    const db = await window.indexedDB.databases();
    const hasCache = db.some(d => d.name === 'idms_case_management');
    console.log('✓ IndexedDB exists:', hasCache);
    
    if (hasCache) {
        const offlineDb = await import('../db/offlineCaseDb.js').then(m => m.default);
        const cacheCount = await offlineDb.dashboard_cache.count();
        const rawDataCount = await offlineDb.dashboard_raw_data.count();
        console.log('✓ Dashboard cache entries:', cacheCount);
        console.log('✓ Raw data cache entries:', rawDataCount);
    }
}

// Test 2: Manually cache dashboard data
async function testCacheDashboardData() {
    const { fetchAndCacheDashboardData } = await import('../services/dashboardOfflineService.js');
    
    try {
        console.log('Fetching and caching dashboard data...');
        const result = await fetchAndCacheDashboardData('case', {});
        console.log('✓ Successfully cached dashboard data:', result);
        return result;
    } catch (err) {
        console.error('✗ Error caching data:', err);
        throw err;
    }
}

// Test 3: Load cached data
async function testLoadFromCache() {
    const { loadDashboardFromCache } = await import('../services/dashboardOfflineService.js');
    
    try {
        console.log('Loading from cache...');
        const cached = await loadDashboardFromCache('case');
        if (cached) {
            console.log('✓ Successfully loaded from cache:', cached);
        } else {
            console.log('✗ No cached data found');
        }
        return cached;
    } catch (err) {
        console.error('✗ Error loading from cache:', err);
        throw err;
    }
}

// Test 4: Test offline mode
async function testOfflineMode() {
    const { getDashboardData } = await import('../services/dashboardOfflineService.js');
    
    // Simulate offline
    const originalOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
    });
    
    try {
        console.log('Testing offline mode (navigator.onLine = false)...');
        const result = await getDashboardData('case', {}, false);
        console.log('✓ Successfully got data in offline mode:', result);
        console.log('  - From cache:', result.fromCache);
        console.log('  - Recomputed:', result.recomputed);
        return result;
    } catch (err) {
        console.error('✗ Error in offline mode:', err);
        throw err;
    } finally {
        // Restore online status
        Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: originalOnLine
        });
    }
}

// Test 5: Test filter recomputation
async function testFilterRecomputation() {
    const { getDashboardData } = await import('../services/dashboardOfflineService.js');
    
    try {
        console.log('Testing filter recomputation...');
        
        // Load without filters
        const unfiltered = await getDashboardData('case', {}, false);
        console.log('Unfiltered stats:', unfiltered.data.stats);
        
        // Load with status filter
        const filtered = await getDashboardData('case', { status: 'open' }, false);
        console.log('Filtered (status=open) stats:', filtered.data.stats);
        
        console.log('✓ Filter recomputation successful');
        return { unfiltered, filtered };
    } catch (err) {
        console.error('✗ Error testing filters:', err);
        throw err;
    }
}

// Run all tests
async function runAllTests() {
    console.log('=== Starting Dashboard Offline Tests ===\n');
    
    try {
        console.log('Test 1: Check cache exists');
        await testCacheExists();
        console.log('');
        
        console.log('Test 2: Cache dashboard data');
        await testCacheDashboardData();
        console.log('');
        
        console.log('Test 3: Load from cache');
        await testLoadFromCache();
        console.log('');
        
        console.log('Test 4: Test offline mode');
        await testOfflineMode();
        console.log('');
        
        console.log('Test 5: Test filter recomputation');
        await testFilterRecomputation();
        console.log('');
        
        console.log('=== All Tests Passed! ===');
    } catch (err) {
        console.error('=== Test Failed ===');
        console.error(err);
    }
}

// Export for console usage
window.dashboardOfflineTests = {
    testCacheExists,
    testCacheDashboardData,
    testLoadFromCache,
    testOfflineMode,
    testFilterRecomputation,
    runAllTests
};

console.log('Dashboard offline tests loaded. Run: dashboardOfflineTests.runAllTests()');
