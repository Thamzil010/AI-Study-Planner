const fs = require('fs');
const file = 'c:/Users/Admin/OneDrive/Documents/AI Study Planner/frontend/src/pages/TodaysPlan.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// We will find start and end indices of blocks to remove

// 1. Remove states
let newLines = [];
let skip = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('// Section 4: Quiz')) {
    skip = true;
  }
  if (skip && lines[i].includes('const [quizGenerating')) {
    skip = false;
    continue;
  }
  if (!skip) newLines.push(lines[i]);
}
lines = newLines;

// 2. Remove fetchQuiz
newLines = [];
skip = false;
let braceCount = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const fetchQuiz = useCallback(')) {
    skip = true;
    braceCount = 0;
  }
  if (skip) {
    braceCount += (lines[i].match(/\{/g) || []).length;
    braceCount -= (lines[i].match(/\}/g) || []).length;
    if (braceCount === 0 && lines[i].includes('}, [')) {
      skip = false;
      continue;
    }
  }
  if (!skip) newLines.push(lines[i]);
}
lines = newLines;

// 3. Remove useEffect for fetchQuiz
newLines = [];
skip = false;
braceCount = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('useEffect(() => {') && lines[i+1] && lines[i+1].includes('if (activeQuizId) {')) {
    skip = true;
    braceCount = 0;
  }
  if (skip) {
    braceCount += (lines[i].match(/\{/g) || []).length;
    braceCount -= (lines[i].match(/\}/g) || []).length;
    if (braceCount === 0) {
      skip = false;
      continue;
    }
  }
  if (!skip) newLines.push(lines[i]);
}
lines = newLines;

// 4. Remove handleGenerateQuiz
newLines = [];
skip = false;
braceCount = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const handleGenerateQuiz = async')) {
    skip = true;
    braceCount = 0;
  }
  if (skip) {
    braceCount += (lines[i].match(/\{/g) || []).length;
    braceCount -= (lines[i].match(/\}/g) || []).length;
    if (braceCount === 0) {
      skip = false;
      continue;
    }
  }
  if (!skip) newLines.push(lines[i]);
}
lines = newLines;

// 5. Remove submitQuiz
newLines = [];
skip = false;
braceCount = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const submitQuiz = async')) {
    skip = true;
    braceCount = 0;
  }
  if (skip) {
    braceCount += (lines[i].match(/\{/g) || []).length;
    braceCount -= (lines[i].match(/\}/g) || []).length;
    if (braceCount === 0) {
      skip = false;
      continue;
    }
  }
  if (!skip) newLines.push(lines[i]);
}
lines = newLines;

// 6. Remove Section 4 Quiz block
newLines = [];
skip = false;
braceCount = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('{/* SECTION 4 - Quiz */}')) {
    skip = true;
    braceCount = 0;
  }
  if (skip) {
    if (lines[i].includes('{quizData && (')) {
       // block
    }
    braceCount += (lines[i].match(/<div/g) || []).length;
    braceCount -= (lines[i].match(/<\/div>/g) || []).length;
    if (braceCount === 0 && lines[i].trim() === ')}' && lines[i-1].includes('</div>')) {
      skip = false;
      continue; // skip the ')}'
    }
  }
  if (!skip) newLines.push(lines[i]);
}
lines = newLines;

// 7. Remove handleGenerateQuiz(subjectId)
newLines = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('if (subjectId) {') && lines[i+1] && lines[i+1].includes('handleGenerateQuiz(subjectId);')) {
    i += 2; // skip if, inner, and closing brace
    continue;
  }
  newLines.push(lines[i]);
}
lines = newLines;

// 8. Remove quizGenerating UI block
newLines = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('{quizGenerating && isCompleted && !isBreak')) {
    skip = true;
  }
  if (skip && lines[i].includes('Generating Quiz...')) {
    skip = false;
    i += 2;
    continue;
  }
  if (!skip) newLines.push(lines[i]);
}
lines = newLines;


// Write back
fs.writeFileSync(file, lines.join('\n'));
console.log('Removed quiz blocks');
