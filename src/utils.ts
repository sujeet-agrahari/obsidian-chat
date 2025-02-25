import * as fs from 'fs';
import * as path from 'path';

import * as os from 'os';

const directoryPath = path.join(
  os.homedir(),
  'Library',
  'Mobile Documents',
  'iCloud~md~obsidian',
  'Documents',
  'Notes'
);

let cachedCombinedText: string | null = null;

async function readDirectoryRecursive(dir: string): Promise<string[]> {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const fullPath = path.join(dir, entry.name);
      return entry.isDirectory() ? readDirectoryRecursive(fullPath) : fullPath;
    })
  );
  return Array.prototype.concat(...files);
}

export async function fetchObsContext(): Promise<string> {
  if (cachedCombinedText !== null) {
    return cachedCombinedText;
  }

  try {
    const filePaths = await readDirectoryRecursive(directoryPath);

    const mdFilePaths = filePaths.filter((filePath) => path.extname(filePath) === '.md').slice(0, 5);

    const readPromises = mdFilePaths.map(async (filePath) => {
      const fileContent = await fs.promises.readFile(filePath, 'utf-8');
      return path.basename(filePath) + '\n' + fileContent + '\n\n';
    });

    const contents = await Promise.all(readPromises);
    const combinedText = contents.join('');
    cachedCombinedText = combinedText;
    return combinedText;
  } catch (error) {
    throw error;
  }
}