# Over The Hill
Inspired by [37signals](https://37signals.com/) Hill Chart

[37signals](https://37signals.com/) Hill Charts are a great way to visually communicate
progress and incoming work.

Read [Shape Up: Show Porgress (Chapt. 13)](https://basecamp.com/shapeup/3.4-chapter-13) to discover the technique.

*Automatically synced with your [v0.dev](https://v0.dev) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/gregoirefaurobert-3371s-projects/v0-hill-chart-generator-website)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/QlICJdqcWMK)

## Overview

This repository will stay in sync with your deployed chats on [v0.dev](https://v0.dev).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.dev](https://v0.dev).

## What is  Over The Hill?

Over The Hill is a web application designed to visualize project progress using a "Hill Chart." A Hill Chart is a simple yet powerful tool for tracking the status of tasks or features, categorizing them into two main phases: "Up the Hill" (discovery/problem-solving) and "Down the Hill" (execution/implementation).

![](image_readme.png)

This app allows you to:

*   **Create and manage "dots"**: Each dot represents a task, feature, or item you want to track.
*   **Position dots on the hill**: Drag and drop dots to indicate their progress. Dots on the left side are "Up the Hill" (still figuring things out), and dots on the right side are "Down the Hill" (known work, being executed).
*   **Customize dots**: Assign names, colors (blue, green, red, orange, purple), and sizes (1-5) to each dot for better categorization and visual distinction.
*   **Organize with collections**: Group related dots into collections to manage multiple projects or different aspects of a single project.
*   **Export your chart**: Copy the generated hill chart as a PNG image or an SVG file to your clipboard, or download it as a PNG file, for easy sharing and documentation.
*   **Theme support**: Switch between light, dark, or system-preferred themes for a comfortable viewing experience.

## How to Use

1.  **Add Dots**: Click the "Add Dot" button to create a new task or item.
2.  **Name and Customize**: In the dot editing panel, give your dot a name, and select its color and size using the dropdowns.
3.  **Position on the Hill**: Drag the dot on the hill chart to reflect its current status.
    *   **Up the Hill (Left Side)**: For tasks where you're still exploring, researching, or solving problems.
    *   **Down the Hill (Right Side)**: For tasks where the path is clear, and you're actively implementing.
4.  **Manage Collections**: Use the "Collections" dropdown to create new collections, switch between them, or manage existing ones.
5.  **Export/Share**:
    *   Click the ellipsis menu (`...`) in the top right corner.
    *   Under "Export Clipboard Format," choose "Copy as PNG" or "Copy as SVG" to set the clipboard format.
    *   Click the "Copy" button in the chart header to copy the chart to your clipboard in the selected format.
    *   Click the "Download PNG" button to save the chart as a PNG file to your system.
6.  **Theme Switching**: Use the ellipsis menu (`...`) to toggle between "Light," "Dark," or "Follow Browser" themes.

## Demo

Try it out live at:

**[https://over-the-hill.vercel.app/](https://over-the-hill.vercel.app/)**

## Desktop App

This project also includes an Electron-based desktop application.

### Building the Desktop App

```bash
# Install dependencies
pnpm install

# Build the web app and create desktop distributables
pnpm run dist

# Build for all platforms (Windows, macOS, Linux)
pnpm run dist-all
```

### Running the Desktop App

#### Linux (AppImage)
```bash
# Method 1: Use the helper script (recommended)
./run-app.sh

# Method 2: Run directly (may show GTK warnings)
./dist/Over\ The\ Hill-1.0.0.AppImage

# Method 3: Maximum isolation (if Method 1 fails)
./run-app-safe.sh

# Method 4: Extract and run (if AppImage has issues)
./run-app-extracted.sh

# Method 5: Maximum isolation (Flatpak-style)
./run-app-flatpak-style.sh
```

#### Troubleshooting Linux GTK Errors

**Note**: This app uses Electron 28.3.3 for better GTK compatibility on mixed GTK2/3/4 systems. The app uses software rendering to avoid GPU conflicts on Linux systems.

If you see GTK-related errors or crashes like:
```
(process:XXXXX): Gtk-ERROR **: GTK 2/3 symbols detected. Using GTK 2/3 and GTK 4 in the same process is not supported
Trace/breakpoint trap (core dumped)
```

Try these solutions in order:

1. **Use the enhanced helper script**: `./run-app.sh`
   - Includes comprehensive GTK isolation
   - Disables hardware acceleration
   - Sets proper environment variables

2. **Use maximum isolation**: `./run-app-safe.sh`
   - Completely isolates the environment
   - Unsets conflicting GTK variables
   - Uses minimal environment setup

3. **Extract and run**: `./run-app-extracted.sh`
   - Extracts the AppImage contents
   - Runs the binary directly
   - Avoids AppImage runtime conflicts

4. **Maximum isolation**: `./run-app-flatpak-style.sh`
   - Creates completely isolated XDG environment
   - Unsets all conflicting environment variables
   - Uses temporary directories for all data

5. **Use the web version**: `./run-app-web.sh`
   - Serves the app via HTTP on localhost
   - Opens in your default browser
   - Bypasses Electron completely (recommended if above methods fail)
   - Provides identical functionality to the desktop app

6. **Install missing libraries** (if needed):
   ```bash
   # Ubuntu/Debian
   sudo apt install libgtk-3-dev libgconf-2-4 libnss3-dev libxss1
   
   # Arch/Manjaro
   sudo pacman -S gtk3 nss libxss
   
   # Fedora
   sudo dnf install gtk3-devel nss libXScrnSaver
   ```

7. **Manual environment setup**:
   ```bash
   export NO_AT_BRIDGE=1
   export GTK_A11Y=none
   export ELECTRON_DISABLE_GPU=1
   export LIBGL_ALWAYS_SOFTWARE=1
   ./dist/Over\ The\ Hill-1.0.0.AppImage
   ```

The desktop app includes the same features as the web version with additional benefits:
- **Secure local storage**: Data is stored securely using Electron's built-in storage
- **Native file operations**: Direct file save/load without browser limitations
- **Offline functionality**: Works completely offline
- **Native clipboard integration**: Better clipboard support for copying charts
