---
title: "Over The Hill - Release Notes v.0.0.1"
date: 2025-06-21
draft: false
description: ""
tags: ["release notes"]
---

**Release Date:** 20JUN2025  
**Platforms:** Linux (AppImage)

---

## 🎉 What's New

Over The Hill is a powerful Hill Chart Generator inspired by 37signals' project management methodology. This release brings you a complete solution for visualizing project progress with both web and desktop applications.

### ✨ Key Features

#### 🎯 **Hill Chart Visualization**
- **Interactive Hill Chart**: Visualize project progress using the proven 37signals methodology
- **Two-Phase Tracking**: 
  - **Up the Hill** (Left Side): Discovery, research, and problem-solving phase
  - **Down the Hill** (Right Side): Clear path, active implementation phase
- **Drag & Drop Interface**: Intuitive positioning of tasks on the hill

#### 📊 **Task Management**
- **Customizable Dots**: Each dot represents a task, feature, or project item
- **Rich Customization**:
  - **Colors**: Blue, green, red, orange, purple
  - **Sizes**: 5 different size options (1-5) for visual hierarchy
  - **Labels**: Custom names for each task
- **Real-time Updates**: Instant visual feedback as you move tasks

#### 📁 **Collection Management**
- **Multiple Collections**: Organize tasks into different projects or categories
- **Collection Switching**: Seamlessly switch between different project contexts
- **Collection Naming**: Custom names for better organization
- **Collection Visibility**: Option to hide collection names in exports

#### 📸 **Snapshot System**
- **Daily Snapshots**: Save the state of your hill chart for any date
- **Calendar Interface**: Visual calendar showing days with saved snapshots
- **Snapshot Recovery**: Load any previous snapshot to see historical progress
- **Progress Tracking**: Monitor how your projects evolve over time

#### 🎨 **Export & Sharing**
- **Multiple Export Formats**:
  - **PNG Export**: High-quality raster images for presentations
  - **SVG Export**: Scalable vector graphics for documents
- **Clipboard Integration**: Copy charts directly to clipboard in PNG or SVG format
- **Download Options**: Save charts as files with timestamped filenames
- **Export Settings**: Choose between PNG and SVG for clipboard operations

#### 🌙 **Theme Support**
- **Light Theme**: Clean, bright interface for daytime use
- **Dark Theme**: Easy on the eyes for evening work
- **System Theme**: Automatically follows your operating system preference
- **Theme Persistence**: Remembers your theme preference

#### 💾 **Data Management**
- **Import/Export**: Full data portability with JSON format
- **Backup & Restore**: Export all collections and snapshots
- **Legacy Support**: Import data from previous versions
- **Data Validation**: Robust error handling for corrupted files

---

## 🖥️ Desktop Application Features

### **Cross-Platform Support**
- **Windows**: Native Windows application with installer
- **macOS**: Universal binary supporting Intel and Apple Silicon
- **Linux**: AppImage format for easy distribution

### **Enhanced Desktop Capabilities**
- **Secure Local Storage**: Data stored securely using Electron's built-in storage
- **Native File Operations**: Direct file save/load without browser limitations
- **Offline Functionality**: Works completely offline
- **Native Clipboard Integration**: Superior clipboard support for copying charts
- **System Integration**: Install as a native application (Linux)

### **Linux-Specific Features**
- **AppImage Distribution**: Portable, self-contained application
- **System Installation**: One-click installation to system menu
- **GTK Compatibility**: Optimized for mixed GTK2/3/4 environments
- **Multiple Launch Methods**: 5 different ways to run the application
- **Comprehensive Troubleshooting**: Detailed solutions for common Linux issues

---

## 🚀 Getting Started

### **Web Version**
Visit [https://over-the-hill.vercel.app/](https://over-the-hill.vercel.app/) to start using the web version immediately.

### **Desktop Installation**

#### **Building from Source**
```bash
# Install dependencies
pnpm install

# Build for your platform
pnpm run dist

# Build for all platforms
pnpm run dist-all
```

#### **Linux AppImage**
Download the AppImage and Install on your system from there


#### **System Installation (Linux)**
The desktop app includes a built-in installer that:
- Copies the AppImage to `~/.local/bin/over-the-hill/`
- Creates a desktop entry in `~/.local/share/applications/`
- Makes the app available in your system menu

---

## 🔧 Technical Details

### **Technology Stack**
- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Components**: Radix UI, Tailwind CSS
- **Desktop**: Electron 32.2.7
- **Build System**: Electron Builder
- **Deployment**: Vercel (Web)

### **Storage**
- **Web**: LocalStorage for data persistence
- **Desktop**: Electron's secure storage system
- **Cross-Platform**: Automatic data migration between platforms

### **Performance**
- **Optimized Rendering**: High-quality exports with 3x scaling
- **Memory Efficient**: Minimal resource usage
- **Fast Loading**: Instant startup and data loading

---

## 🐛 Known Issues & Solutions

### **Installation Issues**
- Ensure you have write permissions to `~/.local/bin/`
- Some distributions may require additional GTK libraries
- AppImage may need to be marked as executable: `chmod +x Over-The-Hill-1.0.0.AppImage`

---

## 🙏 Acknowledgments

- **37signals**: For the original Hill Chart methodology
- **Vercel**: For the excellent deployment platform
- **v0.dev**: For the initial project structure
- **Electron Team**: For the robust desktop framework
- **Open Source Community**: For the amazing tools and libraries

---

## 📞 Support

- **Web Demo**: [https://over-the-hill.vercel.app/](https://over-the-hill.vercel.app/)
- **Documentation**: See README.md for detailed usage instructions
- **Issues**: Report bugs and feature requests through the project repository

---

**Made with ❤️ by Gregoire Faurobert**

*Inspired by 37signals' Shape Up methodology* 