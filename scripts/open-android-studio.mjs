import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const projectPath = path.resolve('android');
const candidates = [process.env.CAPACITOR_ANDROID_STUDIO_PATH];

if (process.platform === 'win32') {
  candidates.push(
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Android', 'Android Studio', 'bin', 'studio64.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Android Studio', 'bin', 'studio64.exe'),
    'C:\\Program Files (x86)\\Android\\Android Studio\\bin\\studio64.exe',
  );
} else if (process.platform === 'darwin') {
  candidates.push('/Applications/Android Studio.app');
} else {
  candidates.push('/usr/local/android-studio/bin/studio.sh', '/opt/android-studio/bin/studio.sh');
}

const studioPath = candidates.find((candidate) => candidate && existsSync(candidate));

if (!studioPath) {
  console.error(
    'No encontré Android Studio. Instálalo o define CAPACITOR_ANDROID_STUDIO_PATH con la ruta de su ejecutable.',
  );
  process.exitCode = 1;
} else {
  const launch =
    process.platform === 'darwin'
      ? spawn('open', ['-a', studioPath, projectPath], { detached: true, stdio: 'ignore' })
      : spawn(studioPath, [projectPath], { detached: true, stdio: 'ignore', windowsHide: false });

  launch.once('error', (error) => {
    console.error(`No se pudo abrir Android Studio: ${error.message}`);
    process.exitCode = 1;
  });
  launch.unref();
  console.log(`Abriendo Android Studio con el proyecto ${projectPath}`);
}
