// Test TURN server connectivity
const fetch = require('node-fetch');

async function testTURN() {
    const turnServer = 'turn:openrelay.metered.ca:80';
    const username = 'openrelayproject';
    const password = 'openrelayproject';

    console.log('Testing TURN server:', turnServer);
    console.log('Username:', username);
    
    // Test if TURN server is reachable
    try {
        const response = await fetch('https://openrelay.metered.ca/api/v1/turn/credentials', {
            method: 'GET'
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ TURN server is reachable');
            console.log('Available servers:', data);
        } else {
            console.log('❌ TURN server returned error:', response.status);
        }
    } catch (error) {
        console.log('❌ Cannot reach TURN server:', error.message);
    }
}

testTURN();
