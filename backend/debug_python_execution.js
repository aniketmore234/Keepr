import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function debugPythonExecution() {
  console.log('🧪 Testing Python execution exactly as Node.js server does...');
  console.log('📁 Current directory:', __dirname);
  
  const pythonScript = path.join(__dirname, 'instagram_processor.py');
  console.log('📄 Python script path:', pythonScript);
  console.log('📄 Script exists:', fs.existsSync(pythonScript));
  
  // Check virtual environment paths
  const venvPythonWin = path.join(__dirname, 'venv', 'Scripts', 'python.exe');
  const venvPythonUnix = path.join(__dirname, 'venv', 'bin', 'python');
  
  console.log('🐍 Windows venv path:', venvPythonWin);
  console.log('🐍 Windows venv exists:', fs.existsSync(venvPythonWin));
  console.log('🐍 Unix venv path:', venvPythonUnix);
  console.log('🐍 Unix venv exists:', fs.existsSync(venvPythonUnix));
  
  // Determine Python executable (same logic as server)
  let pythonExecutable = 'python';
  if (fs.existsSync(venvPythonWin)) {
    pythonExecutable = venvPythonWin;
    console.log('✅ Using Windows virtual environment');
  } else if (fs.existsSync(venvPythonUnix)) {
    pythonExecutable = venvPythonUnix;
    console.log('✅ Using Unix virtual environment');
  } else {
    console.log('⚠️ Using system Python');
  }
  
  console.log('🐍 Final Python executable:', pythonExecutable);
  
  // Test with the same URL as our successful manual test
  const testUrl = 'https://www.instagram.com/reel/DKRIjpmspIN/';
  console.log('🔗 Testing URL:', testUrl);
  
  return new Promise((resolve) => {
    const pythonProcess = spawn(pythonExecutable, [pythonScript, testUrl]);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      console.log('🏁 Python process completed with code:', code);
      console.log('📤 STDOUT:');
      console.log(stdout);
      console.log('📤 STDERR:');
      console.log(stderr);
      
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          console.log('✅ Successfully parsed result:');
          console.log('   Title:', result.title);
          console.log('   Success:', result.success);
          console.log('   Username:', result.username);
        } catch (parseError) {
          console.error('❌ Failed to parse JSON:', parseError.message);
        }
      } else {
        console.error('❌ Python script failed with exit code:', code);
      }
      
      resolve();
    });
    
    pythonProcess.on('error', (error) => {
      console.error('❌ Error spawning Python process:', error);
      resolve();
    });
  });
}

debugPythonExecution(); 