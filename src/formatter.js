const vscode = require('vscode');

// 使用extension.js中传递的outputChannel
const OutputChannel = require('../extension').outputChannel;

class FPGAFormatter {
    constructor() {
        this.tabSize = 4;
    }

    provideDocumentFormattingEdits(document, options, token) {
        const edits = [];
        const text = document.getText();
        const lines = text.split('\n');

        // vscode.window.showInformationMessage(`Line ${lineNumber + 1}: ${codePart}`);
        // 分别查看引号是否都成对
        // todo 还需检查"'"'结构
        // 数"是否为基数
        if (text.match(/"/g)?.length % 2 === 1) {
            // 报错退出
            vscode.window.showErrorMessage(`File has unmatched quotes.`);
            return;
        }

        // 数'是否为基数
        if (text.match(/'/g)?.length % 2 === 1) {
            // 报错退出
            vscode.window.showErrorMessage(`File has unmatched quotes.`);
            return;
        }


        // 获取配置
        const config = vscode.workspace.getConfiguration('fpgaFileSupport.format');
        this.tabSize = config.get('tabSize') || 4;

        let currentBlock = [];
        const blocks = [];

        // 按空行和只有注释的行分组
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === '' || line.match(/^(\/\/.*|#.*|\/\*.*\*\/)$/)) {
                if (currentBlock.length > 0) {
                    blocks.push(currentBlock);
                    currentBlock = [];
                }
                blocks.push([]); // 空行
            } else {
                currentBlock.push({
                    original: lines[i],
                    processed: this.processLine(lines[i], i),
                    lineNumber: i
                });
            }
        }

        if (currentBlock.length > 0) {
            blocks.push(currentBlock);
        }

        // 处理每个块的对齐
        for (const block of blocks) {
            if (block.length === 0) {
                continue;
            }

            const alignedLines = this.alignBlock(block);
            for (let i = 0; i < block.length; i++) {
                const originalLine = block[i].original;
                const formattedLine = alignedLines[i];

                if (originalLine !== formattedLine) {
                    const lineRange = new vscode.Range(
                        new vscode.Position(block[i].lineNumber, 0),
                        new vscode.Position(block[i].lineNumber, originalLine.length)
                    );
                    edits.push(vscode.TextEdit.replace(lineRange, formattedLine));
                }
            }
        }

        return edits;
    }

    processLine(line, lineNumber) {
        // 分离注释和代码
        const commentMatch = line.match(/(.*?)(\/\/.*|#.*|\/\*.*\*\/)?$/);
        let codePart = commentMatch[1] || '';
        const commentPart = commentMatch[2] || '';



        // 替换制表符为空格
        codePart = codePart.replace(/\t/g, ' '.repeat(this.tabSize));

        // 去除首尾空格
        codePart = codePart.trim();

        // 处理括号和引号内侧空格
        codePart = codePart
            .replace(/([({[])\s*/g, '$1')   // 去除左侧括号右侧空格
            .replace(/\s*([)\]}])/g, '$1')  // 去除右侧括号左侧空格
        // .replace(/(['"])\s*(.*?)\s*\1/g, '$1$2$1'); // 处理引号内侧空格


        // 去除等号两侧多余空格
        codePart = codePart.replace(/(\s*=\s*)/g, '=');

        // 处理;左侧的空格
        codePart = codePart.replace(/\s*;/g, ';');

        // // 处理，
        // codePart = codePart.replace(/\s*,\s*/g, ', ');

        // 确保 = 两侧有空格
        // codePart = codePart.replace(/([^=])=([^=])/g, '$1 = $2');
        // codePart = codePart.replace(/([^=])==([^=])/g, '$1 == $2');

        // 重新组合代码和注释
        let result = codePart;
        if (commentPart) {
            result = codePart ? `${codePart} ${commentPart}` : commentPart;
        }

        return result;
    }

    alignBlock(block) {
        // if (block.length <= 1) {
        //     return block.map(item => item.processed);
        // }

        const tokensList = block.map(item => {
            // 定义临时字符（使用Unicode非字符 U+FFFF）
            const TEMP_CHAR = '\uFFFF';

            const line = item.processed;
            const commentMatch = line.match(/(.*?)(\/\/.*|#.*|\/\*.*\*\/)?$/);
            let codePart = commentMatch[1] || '';
            const commentPart = commentMatch[2] || '';

            /* 
            // 步骤1：将双引号内的空格替换为临时标记
            codePart = codePart.replace(/"(?:\\.|[^"\\])*?"/g, (match) => {
                return match.replace(/\s/g, TEMP_CHAR); // 将空格替换为临时标记
            });

            // outputChannel.appendLine(`Line ${item.lineNumber + 1}: ${codePart}`);

            // 步骤2：将单引号内的空格也替换为临时标记
            codePart = codePart.replace(/'(?:\\.|[^'\\])*?'/g, (match) => {
                return match.replace(/\s/g, TEMP_CHAR);
            });

            // outputChannel.appendLine(`Line ${item.lineNumber + 1}: ${codePart}`);

            // 步骤3：按空格分词
            const tokens = codePart.split(/\s+/).filter(token => token.length > 0);

            // outputChannel.appendLine(`Line ${item.lineNumber + 1} Tokens: ${tokens.join('|')}`);

            // 步骤4：将token中的临时标记恢复为空格
            const processedTokens = tokens.map(token => {
                return token.replace(new RegExp(TEMP_CHAR, 'g'), ' ');
            });
            */

            // 将双引号内的空格去除
            codePart = codePart.replace(/"(?:\\.|[^"\\])*?"/g, (match) => {
                return match.replace(/\s/g, ""); // 将空格去除
            });

            // 将单引号内的空格去除
            codePart = codePart.replace(/'(?:\\.|[^'\\])*?'/g, (match) => {
                return match.replace(/\s/g, ""); // 将空格去除
            })

            const processedTokens = codePart.split(/\s+/).filter(token => token.length > 0);

            return {
                tokens: processedTokens,
                comment: commentPart,
                original: line
            };
        });

        // 找出每列的最大宽度
        const maxColumns = Math.max(...tokensList.map(item => item.tokens.length));
        const columnWidths = new Array(maxColumns).fill(0);

        for (const item of tokensList) {
            for (let i = 0; i < item.tokens.length; i++) {
                if (item.tokens[i].length > columnWidths[i]) {
                    columnWidths[i] = item.tokens[i].length;
                }
            }
        }

        // 对齐每行
        return tokensList.map(item => {
            const alignedTokens = item.tokens.map((token, index) => {
                // 将连续的)]}移到最右侧（在)]}的左侧填充）
                // return token.padEnd(columnWidths[index], ' ');
                // 将其分成两个部分，在中间填充空格
                // 右侧为末尾的连续的)]}
                const match = token.match(/^(.*?)([\)\]\};'"]*)$/);
                var leftPart = match ? match[1] : token;
                var rightPart = match ? match[2] : '';

                // 使得index靠右对齐
                // 如果rightPart的第一个是]
                if (rightPart[0] === ']') {
                    // 匹配数字
                    const match = leftPart.match(/^(.*?)(\d+)$/);
                    if (match) {
                        leftPart = match[1];
                        rightPart = match[2] + rightPart;
                    }
                }

                outputChannel.appendLine(`left:##${leftPart}##right:##${rightPart}##`);

                return leftPart + ' '.repeat(columnWidths[index] - token.length) + rightPart;
            });

            let result = alignedTokens.join(' ');
            if (item.comment) {
                result = result ? `${result} ${item.comment}` : item.comment;
            }

            // 将每行结尾的空格去除
            result = result.trimRight();

            return result;
        });
    }
}

module.exports = FPGAFormatter;