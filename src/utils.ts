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

import { LlamaParseReader } from '@llamaindex/cloud';

import {
  Document,
  VectorStoreIndex,
  JinaAIEmbedding,
  Settings,
} from 'llamaindex';

Settings.embedModel = new JinaAIEmbedding({
  apiKey: 'jina_7401a5b156434936ac8cf6ed81799e2ea7-Zgsgf5JBeqOP80eWOXybHIoNU', // In Node.js defaults to process.env.HUGGINGFACEHUB_API_KEY
  model: 'jina-embeddings-v3',
});


let vectorStore: VectorStoreIndex | null = null;

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

export async function fetchObsContext(): Promise<VectorStoreIndex> {
  if (vectorStore !== null) {
    return vectorStore;
  }

  try {
    const filePaths = await readDirectoryRecursive(directoryPath);

    const mdFilePaths = filePaths
      .filter((filePath) => path.extname(filePath) === '.md');

    const readPromises = mdFilePaths.map(async (filePath) => {
      const fileContent = await fs.promises.readFile(filePath, 'utf-8');
      return path.basename(filePath) + '\n' + fileContent + '\n\n';
    });

    const contents = await Promise.all(readPromises);
    const combinedText = contents.join('\n\n');
    // Create Document object with essay
    const document = new Document({ text: combinedText, id_: directoryPath });
    // Split text and create embeddings. Store them in a VectorStoreIndex
    vectorStore = await VectorStoreIndex.fromDocuments([document]);
    return vectorStore;
  } catch (error) {
    console.log(error);
    throw error;
  }
}
