const vscode = require('vscode');
const FPGAFormatter = require('./src/formatter');

let outputChannel = vscode.window.createOutputChannel('FPGA File Support');

function activate(context) {

    // 使其随处可用
    globalThis.outputChannel = outputChannel;

    // 为每种语言注册格式化提供程序
    const languages = ['sdc', 'xdc', 'ucf', 'cst'];
    const formatter = new FPGAFormatter();

    languages.forEach(language => {
        const provider = vscode.languages.registerDocumentFormattingEditProvider(language, {
            provideDocumentFormattingEdits(document, options, token) {
                return formatter.provideDocumentFormattingEdits(document, options, token);
            }
        });
        context.subscriptions.push(provider);
    });
}

function deactivate() { }

module.exports = {
    activate,
    deactivate,
    outputChannel
};