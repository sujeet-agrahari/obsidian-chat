// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import * as vscode from 'vscode';
import { fetchObsContext } from './utils';
import { NodeWithScore, Settings } from 'llamaindex';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Register a chat participant
  vscode.chat.createChatParticipant(
    'obsidian-chat',
    async (
      request: vscode.ChatRequest,
      context: vscode.ChatContext,
      stream: vscode.ChatResponseStream,
      token: vscode.CancellationToken
    ) => {
      const userQuery = request.prompt;
      const chatModels = await vscode.lm.selectChatModels({ family: 'gpt-4' });
      const notesVectorStore = await fetchObsContext();

      // Query the index
      const notesRetriever = notesVectorStore.asRetriever({
        similarityTopK: 3,
      });
      const matches: NodeWithScore[] = await notesRetriever.retrieve({
        query: userQuery,
      });
      const contextNotes = matches.map((node) => node.node.toJSON().text);

      const BASE_PROMPT = `
      You must answer the user's query **ONLY** using the provided context:  
      ${contextNotes.join(' ')}  
🚨 **STRICT INSTRUCTIONS:**  
- If the answer is **not explicitly present** in the context, respond with:  
  👉 *"No relevant information was found in the provided context."*  
- **DO NOT** infer or add extra details.  
- **DO NOT** use external knowledge.  
- **DO NOT** assume missing details.  

If the provided context is ambiguous or incomplete, state clearly:  
*"The available context does not provide enough information to answer this query."* `;

      stream.progress('Thinking...');

      const messages = [vscode.LanguageModelChatMessage.User(BASE_PROMPT)];

      // get all the previous participant messages
      const previousMessages = context.history.filter(
        (h) => h instanceof vscode.ChatResponseTurn
      );

      //DEBUG: log the obsidian context
      let orange = vscode.window.createOutputChannel('obs');
      orange.show();
      orange.appendLine(contextNotes.join(''));

      // add the previous messages to the messages array
      previousMessages.forEach((m) => {
        let fullMessage = '';
        m.response.forEach((r) => {
          const mdPart = r as vscode.ChatResponseMarkdownPart;
          fullMessage += mdPart.value.value;
        });
        messages.push(vscode.LanguageModelChatMessage.Assistant(fullMessage));
      });

      // add user query
      messages.push(vscode.LanguageModelChatMessage.User(userQuery));

      // send the request
      const chatRequest = await chatModels[0].sendRequest(
        messages,
        undefined,
        token
      );

      // stream the response
      for await (const token of chatRequest.text) {
        stream.markdown(token);
      }
    }
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
