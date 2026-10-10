import JSZip from "jszip";

interface ExportZipOptions {
  code: string;
  language?: string;
  projectName?: string;
}

export async function downloadProjectZip({
  code,
  language = "html",
  projectName = "website-project",
}: ExportZipOptions): Promise<void> {
  const zip = new JSZip();
  const safeName = projectName.toLowerCase().replace(/[^a-z0-9_-]/g, "-") || "project";
  const lang = (language || "").toLowerCase();

  const isReact =
    lang === "jsx" ||
    lang === "tsx" ||
    lang === "react" ||
    code.includes("import React") ||
    code.includes("export default") ||
    (code.includes("function App") && !code.includes("<!DOCTYPE html>"));

  if (isReact) {
    // React / Vite Project Structure
    zip.file(
      "package.json",
      JSON.stringify(
        {
          name: safeName,
          private: true,
          version: "0.1.0",
          type: "module",
          scripts: {
            dev: "vite",
            build: "vite build",
            preview: "vite preview",
          },
          dependencies: {
            react: "^18.3.1",
            "react-dom": "^18.3.1",
            "lucide-react": "^0.395.0",
          },
          devDependencies: {
            "@types/react": "^18.3.3",
            "@types/react-dom": "^18.3.0",
            "@vitejs/plugin-react": "^4.3.0",
            autoprefixer: "^10.4.19",
            postcss: "^8.4.38",
            tailwindcss: "^3.4.4",
            vite: "^5.3.0",
          },
        },
        null,
        2
      )
    );

    zip.file(
      "vite.config.js",
      `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});`
    );

    zip.file(
      "tailwind.config.js",
      `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};`
    );

    zip.file(
      "index.html",
      `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`
    );

    const src = zip.folder("src");
    if (src) {
      src.file(
        "main.jsx",
        `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`
      );

      src.file(
        "index.css",
        `@tailwind base;
@tailwind components;
@tailwind utilities;`
      );

      // Clean App.jsx
      let appCode = code;
      if (!appCode.includes("export default")) {
        appCode += "\n\nexport default App;";
      }
      src.file("App.jsx", appCode);
    }

    zip.file(
      "README.md",
      `# ${projectName}

Built with React, Vite, and Tailwind CSS.

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Run development server:
   \`\`\`bash
   npm run dev
   \`\`\`

3. Build for production:
   \`\`\`bash
   npm run build
   \`\`\`
`
    );
  } else {
    // Pure HTML / CSS / JS Project Structure
    let htmlContent = code;
    if (!htmlContent.includes("<!DOCTYPE") && !htmlContent.includes("<html")) {
      htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  ${code}
</body>
</html>`;
    }

    zip.file("index.html", htmlContent);
    zip.file(
      "README.md",
      `# ${projectName}

Standalone web project.

## How to use
Simply double-click \`index.html\` or open it in any modern browser.
`
    );
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeName}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
