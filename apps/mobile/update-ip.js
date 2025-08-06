#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

function getCurrentIP() {
  try {
    // Get the current IP address
    const output = execSync('ifconfig | grep "inet " | grep -v 127.0.0.1 | awk \'{print $2}\'', { encoding: 'utf8' });
    const ips = output.trim().split('\n').filter(ip => ip && !ip.startsWith('169.254')); // Filter out link-local
    return ips[0] || '127.0.0.1';
  } catch (error) {
    console.error('Error getting IP:', error.message);
    return '127.0.0.1';
  }
}

function updateEnvFile(newIP) {
  const envPath = path.join(__dirname, '.env');
  
  try {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Replace the API URL line
    const urlPattern = /EXPO_PUBLIC_API_URL=http:\/\/[0-9.]+:3006/;
    const newUrl = `EXPO_PUBLIC_API_URL=http://${newIP}:3006`;
    
    if (urlPattern.test(envContent)) {
      envContent = envContent.replace(urlPattern, newUrl);
    } else {
      // If pattern not found, add it
      envContent += `\nEXPO_PUBLIC_API_URL=${newUrl}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log(`✅ Updated .env with IP: ${newIP}`);
    return true;
  } catch (error) {
    console.error('Error updating .env file:', error.message);
    return false;
  }
}

function updateApiFile(newIP) {
  const apiPath = path.join(__dirname, 'src/services/api.ts');
  
  try {
    let apiContent = fs.readFileSync(apiPath, 'utf8');
    
    // Replace the fallback IP in api.ts
    const fallbackPattern = /\|\| 'http:\/\/[0-9.]+:3006'/;
    const newFallback = `|| 'http://${newIP}:3006'`;
    
    if (fallbackPattern.test(apiContent)) {
      apiContent = apiContent.replace(fallbackPattern, newFallback);
      fs.writeFileSync(apiPath, apiContent);
      console.log(`✅ Updated api.ts fallback with IP: ${newIP}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error updating api.ts file:', error.message);
    return false;
  }
}

// Main execution
const currentIP = getCurrentIP();
console.log(`🔍 Current IP detected: ${currentIP}`);

const envUpdated = updateEnvFile(currentIP);
const apiUpdated = updateApiFile(currentIP);

if (envUpdated && apiUpdated) {
  console.log(`🎉 Successfully updated configuration for IP: ${currentIP}`);
  console.log('📱 Reload your Expo app to apply changes');
} else {
  console.log('❌ Some updates failed. Check the errors above.');
}