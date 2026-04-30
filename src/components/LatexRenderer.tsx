import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

interface LatexRendererProps {
  text: string;
}

const LatexRenderer: React.FC<LatexRendererProps> = ({ text }) => {
  if (!text) return null;

  // Escape unescaped % signs to prevent KaTeX comment parsing errors
  const cleanMath = (math: string) => {
    return math.replace(/(^|[^\\])%/g, '$1\\%');
  };

  // Normalize \( ... \) and \[ ... \] to $ ... $ and $$ ... $$
  const normalizedText = text.replace(/\\\(/g, '$').replace(/\\\)/g, '$').replace(/\\\[/g, '$$').replace(/\\\]/g, '$$');

    // Regex that matches either $$ or $ (but not \$)
    // We'll use a placeholder replacement trick for simplicity and robustness
    const textWithPlaceholders = normalizedText.replace(/\\\$/g, '___ESC_DOLLAR___');
    
    // Split by $$ first (block math)
    const blockSplits = textWithPlaceholders.split(/\$\$/);
  
    return (
      <div className="space-y-2 w-full break-words">
        {blockSplits.map((blockPart, i) => {
          if (i % 2 === 1) {
            // This is a math block
            const cleanedBlock = blockPart.replace(/___ESC_DOLLAR___/g, '\\$');
            return (
              <div key={i} className="my-3 overflow-x-auto overflow-y-hidden py-2 scrollbar-hide text-center">
                 <BlockMath math={cleanMath(cleanedBlock)} />
              </div>
            );
          }
          
          // This is a normal text part, split by inline math $
          const inlineSplits = blockPart.split(/\$/);
          return (
            <span key={i} className="whitespace-pre-wrap">
              {inlineSplits.map((inlinePart, j) => {
                const restoredPart = inlinePart.replace(/___ESC_DOLLAR___/g, '$');
                if (j % 2 === 1) {
                  // Return inline math (restoredPart might still have escaped dollars if they were inside, but cleanMath handles %)
                  // For KaTeX, we need to make sure \$ is restored correctly if it was inside the math block
                  const mathContent = inlinePart.replace(/___ESC_DOLLAR___/g, '\\$');
                  return <InlineMath key={`${i}-${j}`} math={cleanMath(mathContent)} />;
                }
                return <React.Fragment key={`${i}-${j}`}>{restoredPart}</React.Fragment>;
              })}
            </span>
          );
        })}
      </div>
    );
};

export default LatexRenderer;
