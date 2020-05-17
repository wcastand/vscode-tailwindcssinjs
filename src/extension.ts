import * as vscode from "vscode";
import {
  getTailwindcssinjsTagsFromDocument,
  getTailwindcssinjsTagFromPosition,
} from "./getTailwindcssinjsTag";

const TYPESCRIPT_EXTENSION_ID = "vscode.typescript-language-features";
const PLUGIN_ID = "@tailwindcssinjs/typescript-plugin";
const SELECTORS = [
  { language: "javascript", scheme: "file" },
  { language: "javascript", scheme: "untitled" },
  { language: "javascriptreact", scheme: "file" },
  { language: "javascriptreact", scheme: "untitled" },
  { language: "typescript", scheme: "file" },
  { language: "typescript", scheme: "untitled" },
  { language: "typescriptreact", scheme: "file" },
  { language: "typescriptreact", scheme: "untitled" },
];

const disposables: vscode.Disposable[] = [];

export async function activate(context: vscode.ExtensionContext) {
  const typescriptLanguageFeaturesExtension = vscode.extensions.getExtension(
    TYPESCRIPT_EXTENSION_ID
  );
  if (!typescriptLanguageFeaturesExtension) {
    throw Error(
      "Extension vscode.typescript-language-features could not be found"
    );
  }

  const typescriptLanguageFeaturesExtensionExport = await typescriptLanguageFeaturesExtension.activate();
  const typescriptLanguageServerPluginApi = typescriptLanguageFeaturesExtensionExport.getAPI(
    0
  );
  if (!typescriptLanguageServerPluginApi) {
    throw Error("Typescript language server plugin api missing");
  }

  const tailwindConfigfiles = await vscode.workspace.findFiles(
    "**/tailwind.config.js"
  );

  typescriptLanguageServerPluginApi.configurePlugin(PLUGIN_ID, {
    config: tailwindConfigfiles[0]?.path,
    configs: tailwindConfigfiles,
  });

  const configWatcher = vscode.workspace.createFileSystemWatcher(
    "**/tailwind.config.js"
  );

  configWatcher.onDidChange((e: vscode.Uri) => {
    console.log("Config changed", e.path);
    typescriptLanguageServerPluginApi.configurePlugin(PLUGIN_ID, {
      config: e.path,
    });
  });
  configWatcher.onDidCreate((e: vscode.Uri) => {
    console.log("Config created", e.path);
    typescriptLanguageServerPluginApi.configurePlugin(PLUGIN_ID, {
      config: e.path,
    });
  });
  configWatcher.onDidDelete((e: vscode.Uri) => {
    console.log("Config deleted", e.path);
    typescriptLanguageServerPluginApi.configurePlugin(PLUGIN_ID, {
      config: undefined,
    });
  });

  //TODO: get tailwind config separator
  disposables.push(
    vscode.languages.registerCompletionItemProvider(
      SELECTORS,
      tailwindcssinjsCompletionProvider,
      "`",
      " ",
      "[",
      ":"
    )
  );
}

export function deactivate(): Thenable<void> | void | undefined {
  for (const disposable of disposables) {
    disposable.dispose();
  }
}

const tailwindcssinjsCompletionProvider = {
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
    //@ts-expect-error
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
    //check if triggered by trigger character
    if (context.triggerKind === 1) {
      //get tailwindcssinjs template tags in file
      const tags = getTailwindcssinjsTagsFromDocument(document);
      //get tag if current position is inside a tailwindcssinjs tag
      const tag = getTailwindcssinjsTagFromPosition(position, tags);

      //if position is inside tag execute completion item provider and return results
      if (tag) {
        const completionItems = await vscode.commands.executeCommand<
          vscode.CompletionItem[] | vscode.CompletionList
        >("vscode.executeCompletionItemProvider", document.uri, position);
        return completionItems;
      }
    }
  },
};