import { LanguageId } from "./models";

export interface Snippet {
  title: string;
  language: LanguageId;
  code: string;
}

export const SNIPPETS: Snippet[] = [
  {
    title: "Hello World",
    language: "javascript",
    code: `// Welcome to CodeLive!
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('CodeLive'));
`,
  },
  {
    title: "Array utilities",
    language: "javascript",
    code: `const nums = [5, 3, 8, 1, 9, 2];
const sorted = [...nums].sort((a, b) => a - b);
const sum = nums.reduce((a, b) => a + b, 0);
console.log('sorted:', sorted);
console.log('sum:', sum, 'avg:', (sum / nums.length).toFixed(2));
`,
  },
  {
    title: "Hello World",
    language: "python",
    code: `def greet(name: str) -> str:
    return f"Hello, {name}!"

print(greet("CodeLive"))
`,
  },
  {
    title: "Fibonacci",
    language: "python",
    code: `def fib(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

print(list(fib(15)))
`,
  },
  {
    title: "Hello World",
    language: "cpp",
    code: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, CodeLive!" << endl;
    return 0;
}
`,
  },
  {
    title: "Vector & sort",
    language: "cpp",
    code: `#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v{5, 3, 8, 1, 9, 2};
    std::sort(v.begin(), v.end());
    for (int x : v) std::cout << x << ' ';
    std::cout << '\\n';
    return 0;
}
`,
  },
];
